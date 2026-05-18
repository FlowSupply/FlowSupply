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
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user?.SupplyChainId != null) return user.SupplyChainId;

        return await _db.UserSupplyChains
            .Where(m => m.UserId == userId)
            .Select(m => (Guid?)m.SupplyChainId)
            .FirstOrDefaultAsync();
    }

    // GET api/members — всички членове на chain-а
    [HttpGet]
public async Task<IActionResult> GetAll()
{
    var chainId = await GetChainId();
    if (chainId == null) return BadRequest("No chain.");

    var requesterId = GetUserId();

    var chain = await _db.Chains.FindAsync(chainId);
    var ownerId = chain?.OwnerId;

    var activeRows = await _db.UserSupplyChains
        .Include(u => u.User)
        .Where(u => u.SupplyChainId == chainId)
        .Select(u => new
        {
            u.User!.Id,
            u.User.FullName,
            u.User.Email,
            u.Role,
            IsOwner = u.User.Id == ownerId
        })
        .ToListAsync();

    var pendingRows = await _db.ChainInvites
        .Where(i => i.ChainId == chainId && !i.IsUsed)
        .OrderByDescending(i => i.CreatedAt)
        .Select(i => new
        {
            i.Id,
            i.Email,
            i.Role
        })
        .ToListAsync();

    var activeMembers = activeRows.Select(u => new MemberRow(
        u.Id.ToString(),
        u.FullName,
        u.Email,
        u.Role,
        "active",
        u.IsOwner
    ));

    var pendingMembers = pendingRows.Select(i => new MemberRow(
        i.Id.ToString(),
        "Pending invite",
        i.Email,
        i.Role,
        "pending",
        false
    ));

    var members = activeMembers
        .Concat(pendingMembers)
        .OrderBy(m => m.Status == "pending" ? 0 : 1)
        .ThenBy(m => m.FullName)
        .ToList();

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
        var normalizedEmail = dto.Email.ToLower().Trim();
        var old = await _db.ChainInvites
            .Where(i => i.Email == normalizedEmail && i.ChainId == chainId && !i.IsUsed)
            .ToListAsync();
        _db.ChainInvites.RemoveRange(old);

        var invite = new ChainInvite
        {
            Email   = normalizedEmail,
            ChainId = chainId.Value,
            Role    = dto.Role ?? "Employee"
        };
        _db.ChainInvites.Add(invite);
        await _db.SaveChangesAsync();

        // Провери дали има акаунт
        var hasAccount = await _db.Users
            .AnyAsync(u => u.Email == normalizedEmail);

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
    [HttpDelete("invites/{inviteId:guid}")]
    public async Task<IActionResult> CancelInvite(Guid inviteId)
    {
        var chainId = await GetChainId();
        if (chainId == null) return BadRequest();

        var requesterId = GetUserId();
        var requesterRole = (await _db.UserSupplyChains
            .FirstOrDefaultAsync(u => u.UserId == requesterId && u.SupplyChainId == chainId))?.Role;

        if (requesterRole != "Admin" && requesterRole != "SuperAdmin")
        {
            return Forbid();
        }

        var invite = await _db.ChainInvites
            .FirstOrDefaultAsync(i => i.Id == inviteId && i.ChainId == chainId && !i.IsUsed);
        if (invite == null) return NotFound();

        _db.ChainInvites.Remove(invite);
        await _db.SaveChangesAsync();

        return Ok();
    }

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
public record MemberRow(string Id, string FullName, string Email, string Role, string Status, bool IsOwner);
