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
public MembersController(AppDbContext db, EmailService email)
    {
        _db    = db;
        _email = email;
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

        var members = await _db.UserSupplyChains
            .Include(u => u.User)
            .Where(u => u.SupplyChainId == chainId)
            .Select(u => new {
                u.User!.Id,
                u.User.FullName,
                u.User.Email,
                u.Role,
                status = "active"
            })
            .ToListAsync();

        return Ok(members);
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

        var baseUrl    = "http://localhost:4200";
        var inviteLink = hasAccount
            ? $"{baseUrl}/join?token={invite.Id}"
            : $"{baseUrl}/signup?token={invite.Id}&email={Uri.EscapeDataString(dto.Email)}";

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

        var allowed = new[] { "Employee", "Admin", "SuperAdmin" };
        if (!allowed.Contains(role)) return BadRequest("Invalid role.");

        var membership = await _db.UserSupplyChains
            .FirstOrDefaultAsync(u => u.UserId == userId && u.SupplyChainId == chainId);
        if (membership == null) return NotFound();

        membership.Role = role;

        // Обнови и User.Role
        var user = await _db.Users.FindAsync(userId);
        if (user != null) user.Role = role;

        await _db.SaveChangesAsync();
        return Ok(new { userId, role });
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