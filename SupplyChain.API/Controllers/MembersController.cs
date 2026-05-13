using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using SupplyChain.API.Services;
using System.Security.Claims;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/members")]
public class MembersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly EmailService _email;
    private readonly IConfiguration _configuration;

    public MembersController(AppDbContext db, EmailService email, IConfiguration configuration)
    {
        _db    = db;
        _email = email;
        _configuration = configuration;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<Guid?> GetChainId()
    {
        var user = await _db.Users.FindAsync(GetUserId());
        return user?.SupplyChainId;
    }

    // GET api/members — всички членове на chain-а
    [HttpGet]
public async Task<IActionResult> GetAll()
{
    var chainId = await GetChainId();
    if (chainId == null) return BadRequest("No chain.");

    var requesterId = GetUserId();

    // Вземи OwnerId на chain-а
    var chain = await _db.Chains.FindAsync(chainId);
    var ownerId = chain?.OwnerId;

    var members = await _db.UserSupplyChains
        .Include(u => u.User)
        .Where(u => u.SupplyChainId == chainId)
        .Select(u => new {
            u.User!.Id,
            u.User.FullName,
            u.User.Email,
            u.Role,
            status = "active",
            isOwner = u.User.Id == ownerId   // <--ново
        })
        .ToListAsync();

    // Върни и текущата роля на логнатия
    var myRole = (await _db.UserSupplyChains
        .FirstOrDefaultAsync(u => u.UserId == requesterId && u.SupplyChainId == chainId))?.Role;

    return Ok(new { members, myRole, ownerId });
}

    // POST api/members/invite — изпраща покана
    [HttpPost("invite")]
    public async Task<IActionResult> Invite([FromBody] InviteDto dto)
    {
        var chainId = await GetChainId();
        if (chainId == null) return BadRequest("No chain.");

        var chain = await _db.Chains.FindAsync(chainId);
        if (chain == null) return NotFound();

        // Изтрий стари неизползвани покани за същия имейл
        var old = await _db.ChainInvites
            .Where(i => i.Email == dto.Email && i.ChainId == chainId && !i.IsUsed)
            .ToListAsync();
        _db.ChainInvites.RemoveRange(old);

        var invite = new ChainInvite
        {
            Email   = dto.Email.ToLower().Trim(),
            ChainId = chainId.Value,
            Role    = dto.Role ?? "Employee"
        };
        _db.ChainInvites.Add(invite);
        await _db.SaveChangesAsync();

        // Провери дали има акаунт
        var hasAccount = await _db.Users
            .AnyAsync(u => u.Email == dto.Email.ToLower().Trim());

        var baseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
        var inviteLink = hasAccount
            ? $"{baseUrl.TrimEnd('/')}/join?token={invite.Id}"
            : $"{baseUrl.TrimEnd('/')}/signup?token={invite.Id}&email={Uri.EscapeDataString(dto.Email)}";

        await _email.SendInviteEmailAsync(dto.Email, inviteLink, chain.Name, hasAccount);

        // Върни и кода за ръчно споделяне (първите 8 символа)
        var shortCode = invite.Id.ToString().Replace("-", "").Substring(0, 8).ToUpper();

        return Ok(new { inviteId = invite.Id, shortCode, inviteLink });
    }

    // PATCH api/members/{userId}/role — смяна на роля
[HttpPatch("{userId}/role")]
public async Task<IActionResult> ChangeRole(int userId, [FromBody] string role)
{

    var chainId = await GetChainId();
    if (chainId == null) return BadRequest();

    // Owner-ът не може да бъде сменен от никой
    var chain = await _db.Chains.FindAsync(chainId);
    if (chain?.OwnerId == userId)
        return Forbid();

    var requesterId    = GetUserId();
    var requesterRole  = (await _db.UserSupplyChains
        .FirstOrDefaultAsync(u => u.UserId == requesterId && u.SupplyChainId == chainId))?.Role;

    var membership = await _db.UserSupplyChains
        .FirstOrDefaultAsync(u => u.UserId == userId && u.SupplyChainId == chainId);
    if (membership == null) return NotFound();

    // Правила:
    // - SuperAdmin може всичко
    // - Admin не може да промени SuperAdmin
    if (requesterRole != "SuperAdmin" && membership.Role == "SuperAdmin")
        return Forbid();

    var allowed = new[] { "Employee", "Admin", "SuperAdmin" };
    if (!allowed.Contains(role)) return BadRequest("Invalid role.");

    // Admin не може да присвоява SuperAdmin роля
    if (requesterRole == "Admin" && role == "SuperAdmin")
        return Forbid();

    var oldRole = membership.Role;
    membership.Role = role;

    var user = await _db.Users.FindAsync(userId);
    if (user != null) user.Role = role;

    // Записваме в историята
    _db.RoleChangeLogs.Add(new RoleChangeLog
    {
        ChangedByUserId = requesterId,
        TargetUserId    = userId,
        OldRole         = oldRole,
        NewRole         = role,
        ChainId         = chainId.Value
    });

    await _db.SaveChangesAsync();
    return Ok(new { userId, role });
}

// GET api/members/role-history
    [HttpGet("role-history")]
    public async Task<IActionResult> GetRoleHistory()
    {
        var chainId = await GetChainId();
        if (chainId == null) return BadRequest();

        var history = await _db.RoleChangeLogs
            .Include(r => r.ChangedByUser)
            .Include(r => r.TargetUser)
            .Where(r => r.ChainId == chainId)
            .OrderByDescending(r => r.ChangedAt)
            .Take(50)
            .Select(r => new {
                r.Id,
                changedBy   = r.ChangedByUser!.FullName,
                target      = r.TargetUser!.FullName,
                r.OldRole,
                r.NewRole,
                r.ChangedAt
            })
            .ToListAsync();

        return Ok(history);
    }

    // DELETE api/members/{userId} — премахване на член
    [HttpDelete("{userId}")]
    public async Task<IActionResult> Remove(int userId)
    {
        var chainId = await GetChainId();
        if (chainId == null) return BadRequest();

        var membership = await _db.UserSupplyChains
            .FirstOrDefaultAsync(u => u.UserId == userId && u.SupplyChainId == chainId);
        if (membership == null) return NotFound();

        _db.UserSupplyChains.Remove(membership);

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.SupplyChainId = null;
            user.Role = "Employee";
        }

        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record InviteDto(string Email, string? Role);
