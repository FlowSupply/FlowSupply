using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using SupplyChain.API.Services;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/chains")]
public class ChainsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ChainSeedService _chainSeedService;
    private readonly EmailService _email;
    private readonly IConfiguration _configuration;

    public ChainsController(AppDbContext db, ChainSeedService chainSeedService, EmailService email, IConfiguration configuration)
    {
        _db = db;
        _chainSeedService = chainSeedService;
        _email = email;
        _configuration = configuration;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChainDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Name is required.");

        var userId = GetUserId();
        if (await HasAnyMembership(userId))
            return Conflict(new { code = "AlreadyInChain", message = "You are already in a chain." });

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
        await _chainSeedService.SeedForChainAsync(chain.Id, userId);

        return Ok(new { chain.Id, chain.Name, chain.InviteCode, role = "SuperAdmin" });
    }

    [HttpPost("join")]
public async Task<IActionResult> Join([FromBody] JoinChainDto dto)
{
    var userId = GetUserId();

    // Ако имаме token → намери поканата
    if (!string.IsNullOrWhiteSpace(dto.Token))
    {
        if (!Guid.TryParse(dto.Token, out var tokenGuid))
            return BadRequest("Invalid token.");

        var invite = await _db.ChainInvites
            .Include(i => i.Chain)
            .FirstOrDefaultAsync(i => i.Id == tokenGuid && !i.IsUsed);

        if (invite == null || invite.ExpiresAt < DateTime.UtcNow)
            return BadRequest("Invite expired or invalid.");

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();
        if (!string.Equals(invite.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        return await JoinChain(userId, invite.ChainId, invite.Role, invite);
    }

    // Иначе — с код
    var code = dto.Code;
    if (string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(dto.Link))
    {
        var parts = dto.Link.TrimEnd('/').Split('/');
        code = parts.Last();
    }
    if (string.IsNullOrWhiteSpace(code)) return BadRequest("Code or link is required.");

    var chain = await _db.Chains
        .FirstOrDefaultAsync(c => c.InviteCode == code.ToUpper());
    if (chain == null) return NotFound("Invalid invite code.");

    return await JoinChain(userId, chain.Id, "Employee", null);
}

private async Task<IActionResult> JoinChain(int userId, Guid chainId, string role, ChainInvite? invite)
{
    var existing = await _db.UserSupplyChains
        .AnyAsync(u => u.UserId == userId && u.SupplyChainId == chainId);
    if (existing) return BadRequest("Already a member.");

    var user = await _db.Users.FindAsync(userId);
    if (user?.SupplyChainId == chainId) return BadRequest("Already a member.");

    var currentMembership = await _db.UserSupplyChains
        .Include(u => u.SupplyChain)
        .FirstOrDefaultAsync(u => u.UserId == userId);
    if (currentMembership != null || user?.SupplyChainId != null)
    {
        var targetChain = await _db.Chains.FindAsync(chainId);
        var currentChain = currentMembership?.SupplyChain
            ?? (user?.SupplyChainId == null ? null : await _db.Chains.FindAsync(user.SupplyChainId.Value));
        return Conflict(new
        {
            code = "ChainTransferRequired",
            message = "You are already in a chain. Confirm if you want to switch chains.",
            currentChainId = currentMembership?.SupplyChainId ?? user!.SupplyChainId,
            currentChainName = currentChain?.Name,
            targetChainId = chainId,
            targetChainName = targetChain?.Name,
            role
        });
    }

    _db.UserSupplyChains.Add(new UserSupplyChain
    {
        UserId = userId, SupplyChainId = chainId, Role = role
    });

    if (user != null) { user.SupplyChainId = chainId; user.Role = role; }

    if (invite != null) invite.IsUsed = true;

    await _db.SaveChangesAsync();

    var chain = await _db.Chains.FindAsync(chainId);
    return Ok(new { chainId, chain?.Name, role });
}

    [HttpPost("join/transfer-request")]
    public async Task<IActionResult> RequestTransfer([FromBody] JoinChainDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(dto.Token) || !Guid.TryParse(dto.Token, out var inviteId))
            return BadRequest("Invalid token.");

        var invite = await _db.ChainInvites
            .Include(i => i.Chain)
            .FirstOrDefaultAsync(i => i.Id == inviteId && !i.IsUsed);
        if (invite == null || invite.ExpiresAt < DateTime.UtcNow)
            return BadRequest("Invite expired or invalid.");

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        var normalizedEmail = user.Email.ToLower().Trim();
        if (!string.Equals(invite.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var currentMembership = await _db.UserSupplyChains
            .Include(u => u.SupplyChain)
            .FirstOrDefaultAsync(u => u.UserId == userId);
        if (currentMembership == null && user.SupplyChainId == null)
            return await JoinChain(userId, invite.ChainId, invite.Role, invite);
        if (currentMembership?.SupplyChainId == invite.ChainId || user.SupplyChainId == invite.ChainId)
            return BadRequest("Already a member.");

        var transferToken = CreateTransferToken(invite.Id, userId, DateTime.UtcNow.AddHours(2));
        var baseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
        var transferLink = $"{baseUrl.TrimEnd('/')}/join?transferToken={Uri.EscapeDataString(transferToken)}";
        var currentChain = currentMembership?.SupplyChain
            ?? (user.SupplyChainId == null ? null : await _db.Chains.FindAsync(user.SupplyChainId.Value));

        await _email.SendChainTransferConfirmationEmailAsync(
            user.Email,
            user.FullName,
            currentChain?.Name ?? "your current chain",
            invite.Chain?.Name ?? "the new chain",
            transferLink);

        return Ok(new { message = "Confirmation email sent." });
    }

    [HttpPost("join/confirm-transfer")]
    public async Task<IActionResult> ConfirmTransfer([FromBody] ConfirmTransferDto dto)
    {
        var userId = GetUserId();
        var parsed = ValidateTransferToken(dto.TransferToken);
        if (parsed == null || parsed.Value.UserId != userId)
            return BadRequest("Invalid or expired transfer confirmation.");

        var invite = await _db.ChainInvites
            .Include(i => i.Chain)
            .FirstOrDefaultAsync(i => i.Id == parsed.Value.InviteId && !i.IsUsed);
        if (invite == null || invite.ExpiresAt < DateTime.UtcNow)
            return BadRequest("Invite expired or invalid.");

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();
        if (!string.Equals(invite.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var memberships = await _db.UserSupplyChains
            .Where(u => u.UserId == userId)
            .ToListAsync();

        var sameChainMembership = memberships.FirstOrDefault(u => u.SupplyChainId == invite.ChainId);
        if (sameChainMembership != null)
            return BadRequest("Already a member.");

        _db.UserSupplyChains.RemoveRange(memberships);
        _db.UserSupplyChains.Add(new UserSupplyChain
        {
            UserId = userId,
            SupplyChainId = invite.ChainId,
            Role = invite.Role
        });

        user.SupplyChainId = invite.ChainId;
        user.Role = invite.Role;
        invite.IsUsed = true;

        await _db.SaveChangesAsync();

        return Ok(new { chainId = invite.ChainId, invite.Chain?.Name, role = invite.Role });
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

    private async Task<bool> HasAnyMembership(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user?.SupplyChainId != null) return true;

        return await _db.UserSupplyChains.AnyAsync(u => u.UserId == userId);
    }

    private string CreateTransferToken(Guid inviteId, int userId, DateTime expiresAt)
    {
        var expiresTicks = expiresAt.ToUniversalTime().Ticks;
        var payload = $"{inviteId:N}.{userId}.{expiresTicks}";
        var signature = Sign(payload);
        return $"{Base64UrlEncode(payload)}.{signature}";
    }

    private (Guid InviteId, int UserId)? ValidateTransferToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        var payload = Base64UrlDecode(parts[0]);
        var expectedSignature = Encoding.UTF8.GetBytes(Sign(payload ?? ""));
        var providedSignature = Encoding.UTF8.GetBytes(parts[1]);
        if (payload == null ||
            expectedSignature.Length != providedSignature.Length ||
            !CryptographicOperations.FixedTimeEquals(expectedSignature, providedSignature))
        {
            return null;
        }

        var values = payload.Split('.');
        if (values.Length != 3 ||
            !Guid.TryParseExact(values[0], "N", out var inviteId) ||
            !int.TryParse(values[1], out var userId) ||
            !long.TryParse(values[2], out var expiresTicks))
        {
            return null;
        }

        if (new DateTime(expiresTicks, DateTimeKind.Utc) < DateTime.UtcNow)
            return null;

        return (inviteId, userId);
    }

    private string Sign(string value)
    {
        var key = _configuration["Jwt:Key"] ?? _configuration["Jwt:Secret"] ?? "FlowSupply-development-transfer-key";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }

    private static string Base64UrlEncode(string value) => Base64UrlEncode(Encoding.UTF8.GetBytes(value));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string? Base64UrlDecode(string value)
    {
        try
        {
            var base64 = value.Replace('-', '+').Replace('_', '/');
            switch (base64.Length % 4)
            {
                case 2: base64 += "=="; break;
                case 3: base64 += "="; break;
            }
            return Encoding.UTF8.GetString(Convert.FromBase64String(base64));
        }
        catch
        {
            return null;
        }
    }
}

public record CreateChainDto(string Name, string? Industry, string? Description, string? Visibility);
public record JoinChainDto(string? Code, string? Link, string? Token);
public record ConfirmTransferDto(string? TransferToken);
