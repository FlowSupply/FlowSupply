using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using System.Security.Claims;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/chains")]
public class ChainsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ChainsController(AppDbContext db) => _db = db;

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChainDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Name is required.");

        var userId = GetUserId();

        var chain = new Chain
        {
            Name        = dto.Name,
            Industry    = dto.Industry ?? "",
            Description = dto.Description ?? "",
            Visibility  = dto.Visibility ?? "private",
            InviteCode  = GenerateCode(),
            OwnerId     = userId
        };

        _db.Chains.Add(chain);  // FIX 1: _db.Chain → _db.Chains

        _db.UserSupplyChains.Add(new UserSupplyChain
        {
            UserId        = userId,
            SupplyChainId = chain.Id,
            Role          = "SuperAdmin"
        });

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.SupplyChainId = chain.Id;
            user.Role = "SuperAdmin";
        }

        await _db.SaveChangesAsync();

        return Ok(new { chain.Id, chain.Name, chain.InviteCode, role = "SuperAdmin" });
    }

    [HttpPost("join")]
    public async Task<IActionResult> Join([FromBody] JoinChainDto dto)
    {
        var userId = GetUserId();

        var code = dto.Code;
        if (string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(dto.Link))
        {
            var parts = dto.Link.TrimEnd('/').Split('/');
            code = parts.Last();
        }

        if (string.IsNullOrWhiteSpace(code))
            return BadRequest("Code or link is required.");

        var chain = await _db.Chains  // FIX 2: _db.Chain → _db.Chains
            .FirstOrDefaultAsync(c => c.InviteCode == code.ToUpper());

        if (chain == null)
            return NotFound("Invalid invite code.");

        var existing = await _db.UserSupplyChains
            .AnyAsync(u => u.UserId == userId && u.SupplyChainId == chain.Id);
        if (existing)
            return BadRequest("You are already a member of this chain.");

        _db.UserSupplyChains.Add(new UserSupplyChain
        {
            UserId        = userId,
            SupplyChainId = chain.Id,
            Role          = "Employee"
        });

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.SupplyChainId = chain.Id;
            user.Role = "Employee";
        }

        await _db.SaveChangesAsync();

        return Ok(new { chain.Id, chain.Name, chain.InviteCode, role = "Employee" });
    }

    [HttpGet("invite-link")]
    public async Task<IActionResult> GetInviteLink()
    {
        var userId = GetUserId();
        var membership = await _db.UserSupplyChains
            .Include(u => u.SupplyChain)  // FIX 3: .Include(u => u.Chain) → .Include(u => u.SupplyChain)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (membership == null) return NotFound();

        var link = $"https://flowsupply.com/join/{membership.SupplyChain!.InviteCode}";
        return Ok(new { link, code = membership.SupplyChain.InviteCode });
    }

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = new Random();
        var part = () => new string(Enumerable.Range(0, 3)
            .Select(_ => chars[rng.Next(chars.Length)]).ToArray());
        return $"{part()}-{part()}-{part()}";
    }
}

public record CreateChainDto(string Name, string? Industry, string? Description, string? Visibility);
public record JoinChainDto(string? Code, string? Link);