using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using SupplyChain.API.Services;
using System.Security.Claims;
using System.Security.Cryptography;
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

        var chain = new Chain
        {
            Name = dto.Name,
            Industry = dto.Industry ?? "",
            Description = dto.Description ?? "",
            Visibility = dto.Visibility ?? "private",
            InviteCode = GenerateCode(),
            OwnerId = userId
        };

        _db.Chains.Add(chain);
        _db.UserSupplyChains.Add(new UserSupplyChain
        {
            UserId = userId,
            SupplyChainId = chain.Id,
            Role = "SuperAdmin"
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
        var target = await ResolveJoinTarget(dto);
        if (target.Result != null) return target.Result;

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        if (target.Invite != null && !string.Equals(target.Invite.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = "InviteEmailMismatch", message = "This invite is for another email address. Please sign in with the correct account." });

        return await JoinChain(userId, target.ChainId, target.Role, target.Invite, dto.CurrentChainId);
    }

    private async Task<IActionResult> JoinChain(int userId, Guid chainId, string role, ChainInvite? invite, Guid? currentChainHint)
    {
        var memberships = await _db.UserSupplyChains
            .Include(u => u.SupplyChain)
            .Where(u => u.UserId == userId)
            .ToListAsync();
        var existing = memberships.Any(u => u.SupplyChainId == chainId);
        var hintedCurrentChainId = currentChainHint != chainId ? currentChainHint : null;

        var user = await _db.Users.FindAsync(userId);
        if (existing && memberships.All(u => u.SupplyChainId == chainId) && user?.SupplyChainId == chainId && hintedCurrentChainId == null)
            return BadRequest("Already a member.");

        var currentMembership = memberships.FirstOrDefault(u => u.SupplyChainId != chainId);
        if (existing && currentMembership == null && hintedCurrentChainId == null)
            return BadRequest("Already a member.");

        if (currentMembership != null || (user?.SupplyChainId != null && user.SupplyChainId != chainId) || hintedCurrentChainId != null)
        {
            var targetChain = await _db.Chains.FindAsync(chainId);
            return Conflict(await BuildTransferRequiredResponse(
                userId,
                currentMembership,
                user,
                hintedCurrentChainId,
                chainId,
                targetChain?.Name,
                role));
        }

        _db.UserSupplyChains.Add(new UserSupplyChain
        {
            UserId = userId,
            SupplyChainId = chainId,
            Role = role
        });

        if (user != null)
        {
            user.SupplyChainId = chainId;
            user.Role = role;
        }

        if (invite != null) invite.IsUsed = true;

        await _db.SaveChangesAsync();

        var chain = await _db.Chains.FindAsync(chainId);
        return Ok(new { chainId, chain?.Name, role });
    }

    [HttpPost("join/transfer-request")]
    public async Task<IActionResult> RequestTransfer([FromBody] JoinChainDto dto)
    {
        var userId = GetUserId();
        var target = await ResolveJoinTarget(dto);
        if (target.Result != null) return target.Result;

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();
        if (target.Invite != null && !string.Equals(target.Invite.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = "InviteEmailMismatch", message = "This invite is for another email address. Please sign in with the correct account." });

        var currentMembership = await _db.UserSupplyChains
            .Include(u => u.SupplyChain)
            .FirstOrDefaultAsync(u => u.UserId == userId && u.SupplyChainId != target.ChainId);
        var currentChainHint = dto.CurrentChainId == target.ChainId ? null : dto.CurrentChainId;
        if (currentMembership == null && user.SupplyChainId == null && currentChainHint == null)
            return await JoinChain(userId, target.ChainId, target.Role, target.Invite, dto.CurrentChainId);
        if (currentMembership?.SupplyChainId == target.ChainId && user.SupplyChainId == target.ChainId)
            return BadRequest("Already a member.");

        var currentChainId = currentMembership?.SupplyChainId ?? user.SupplyChainId ?? currentChainHint;
        if (currentChainId != null && await IsLeavingSuperAdminAsync(userId, currentChainId.Value, currentMembership))
        {
            if (dto.NewSuperAdminUserId == null)
                return BadRequest(new { code = "SuperAdminTransferRequired", message = "Choose an admin to become SuperAdmin before leaving this chain." });

            var newSuperAdmin = await _db.UserSupplyChains
                .FirstOrDefaultAsync(u =>
                    u.UserId == dto.NewSuperAdminUserId.Value &&
                    u.SupplyChainId == currentChainId.Value &&
                    u.Role == "Admin");
            if (newSuperAdmin == null)
                return BadRequest(new { code = "InvalidSuperAdminCandidate", message = "The selected user must be an admin in your current chain." });
        }

        var baseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
        var transferToken = CreateTransferToken(
            target.Invite?.Id,
            target.ChainId,
            target.Role,
            userId,
            dto.NewSuperAdminUserId,
            DateTime.UtcNow.AddHours(2));
        var confirmationLink = $"{baseUrl.TrimEnd('/')}/join?transferToken={Uri.EscapeDataString(transferToken)}";
        var currentChain = currentMembership?.SupplyChain
            ?? (user.SupplyChainId == null ? null : await _db.Chains.FindAsync(user.SupplyChainId.Value));

        await _email.SendChainTransferConfirmationEmailAsync(
            user.Email,
            user.FullName,
            currentChain?.Name ?? "current chain",
            target.ChainName ?? "new chain",
            confirmationLink);

        return Ok(new { message = "Confirmation email sent." });
    }

    [HttpPost("join/confirm-transfer")]
    public async Task<IActionResult> ConfirmTransfer([FromBody] ConfirmTransferDto dto)
    {
        var userId = GetUserId();
        var parsed = ValidateTransferToken(dto.TransferToken);
        if (parsed == null || parsed.Value.UserId != userId)
            return BadRequest("Invalid or expired transfer confirmation.");

        ChainInvite? invite = null;
        if (parsed.Value.InviteId != null)
        {
            invite = await _db.ChainInvites
                .Include(i => i.Chain)
                .FirstOrDefaultAsync(i => i.Id == parsed.Value.InviteId.Value && !i.IsUsed);
            if (invite == null || invite.ExpiresAt < DateTime.UtcNow)
                return BadRequest("Invite expired or invalid.");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();
        if (invite != null && !string.Equals(invite.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { code = "InviteEmailMismatch", message = "This invite is for another email address. Please sign in with the correct account." });

        var memberships = await _db.UserSupplyChains
            .Where(u => u.UserId == userId)
            .ToListAsync();

        foreach (var membership in memberships.Where(u => u.SupplyChainId != parsed.Value.TargetChainId))
        {
            if (!await IsLeavingSuperAdminAsync(userId, membership.SupplyChainId, membership))
                continue;

            if (parsed.Value.NewSuperAdminUserId == null)
                return BadRequest("SuperAdmin transfer is required.");

            var newSuperAdmin = await _db.UserSupplyChains
                .FirstOrDefaultAsync(u =>
                    u.UserId == parsed.Value.NewSuperAdminUserId.Value &&
                    u.SupplyChainId == membership.SupplyChainId &&
                    u.Role == "Admin");
            if (newSuperAdmin == null)
                return BadRequest("The selected user must be an admin in your current chain.");

            newSuperAdmin.Role = "SuperAdmin";
            var oldChain = await _db.Chains.FindAsync(membership.SupplyChainId);
            if (oldChain?.OwnerId == userId)
                oldChain.OwnerId = newSuperAdmin.UserId;

            var promotedUser = await _db.Users.FindAsync(newSuperAdmin.UserId);
            if (promotedUser?.SupplyChainId == membership.SupplyChainId)
                promotedUser.Role = "SuperAdmin";
        }

        _db.UserSupplyChains.RemoveRange(memberships);
        _db.UserSupplyChains.Add(new UserSupplyChain
        {
            UserId = userId,
            SupplyChainId = parsed.Value.TargetChainId,
            Role = parsed.Value.Role
        });

        user.SupplyChainId = parsed.Value.TargetChainId;
        user.Role = parsed.Value.Role;
        if (invite != null) invite.IsUsed = true;

        await _db.SaveChangesAsync();

        var chain = invite?.Chain ?? await _db.Chains.FindAsync(parsed.Value.TargetChainId);
        return Ok(new { chainId = parsed.Value.TargetChainId, chain?.Name, role = parsed.Value.Role });
    }

    [HttpGet("invite-link")]
    public async Task<IActionResult> GetInviteLink()
    {
        var userId = GetUserId();
        var membership = await _db.UserSupplyChains
            .Include(u => u.SupplyChain)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (membership == null) return NotFound();

        var baseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
        var link = $"{baseUrl.TrimEnd('/')}/join?code={Uri.EscapeDataString(membership.SupplyChain!.InviteCode)}";
        return Ok(new { link, code = membership.SupplyChain.InviteCode });
    }

    private async Task<object> BuildTransferRequiredResponse(
        int userId,
        UserSupplyChain? currentMembership,
        User? user,
        Guid? currentChainHint,
        Guid targetChainId,
        string? targetChainName,
        string role)
    {
        var currentChainId = currentMembership?.SupplyChainId ?? user?.SupplyChainId ?? currentChainHint!.Value;
        var currentChain = currentMembership?.SupplyChain ?? await _db.Chains.FindAsync(currentChainId);
        var requiresSuperAdminTransfer = await IsLeavingSuperAdminAsync(userId, currentChainId, currentMembership);
        var adminCandidates = await _db.UserSupplyChains
            .Include(u => u.User)
            .Where(u => requiresSuperAdminTransfer &&
                u.SupplyChainId == currentChainId &&
                u.UserId != userId &&
                u.Role == "Admin")
            .Select(u => new { userId = u.UserId, fullName = u.User!.FullName, email = u.User.Email })
            .ToListAsync();

        return new
        {
            code = "ChainTransferRequired",
            message = "You are already in a chain. Confirm if you want to move to the new chain.",
            currentChainId,
            currentChainName = currentChain?.Name,
            targetChainId,
            targetChainName,
            role,
            requiresSuperAdminTransfer,
            adminCandidates
        };
    }

    private async Task<bool> IsLeavingSuperAdminAsync(int userId, Guid chainId, UserSupplyChain? membership)
    {
        var chain = await _db.Chains.FindAsync(chainId);
        var role = membership?.Role
            ?? (await _db.UserSupplyChains.FirstOrDefaultAsync(u => u.UserId == userId && u.SupplyChainId == chainId))?.Role;

        return chain?.OwnerId == userId || role == "SuperAdmin";
    }

    private async Task<(IActionResult? Result, Guid ChainId, string? ChainName, string Role, ChainInvite? Invite)> ResolveJoinTarget(JoinChainDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.Token))
        {
            if (!Guid.TryParse(dto.Token, out var inviteId))
                return (BadRequest("Invalid token."), Guid.Empty, null, "Employee", null);

            var invite = await _db.ChainInvites
                .Include(i => i.Chain)
                .FirstOrDefaultAsync(i => i.Id == inviteId && !i.IsUsed);
            if (invite == null || invite.ExpiresAt < DateTime.UtcNow)
                return (BadRequest("Invite expired or invalid."), Guid.Empty, null, "Employee", null);

            return (null, invite.ChainId, invite.Chain?.Name, invite.Role, invite);
        }

        var code = dto.Code;
        if (string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(dto.Link))
        {
            var parts = dto.Link.TrimEnd('/').Split('/');
            code = parts.Last();
        }

        if (string.IsNullOrWhiteSpace(code))
            return (BadRequest("Code or link is required."), Guid.Empty, null, "Employee", null);

        var chain = await _db.Chains.FirstOrDefaultAsync(c => c.InviteCode == code.ToUpper());
        if (chain == null)
            return (NotFound("Invalid invite code."), Guid.Empty, null, "Employee", null);

        return (null, chain.Id, chain.Name, "Employee", null);
    }

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = new Random();
        var part = () => new string(Enumerable.Range(0, 3)
            .Select(_ => chars[rng.Next(chars.Length)]).ToArray());
        return $"{part()}-{part()}-{part()}";
    }

    private string CreateTransferToken(Guid? inviteId, Guid targetChainId, string role, int userId, int? newSuperAdminUserId, DateTime expiresAt)
    {
        var expiresTicks = expiresAt.ToUniversalTime().Ticks;
        var invitePart = inviteId?.ToString("N") ?? "-";
        var newSuperAdminPart = newSuperAdminUserId?.ToString() ?? "-";
        var payload = $"{invitePart}.{targetChainId:N}.{Base64UrlEncode(role)}.{userId}.{newSuperAdminPart}.{expiresTicks}";
        return $"{Base64UrlEncode(payload)}.{Sign(payload)}";
    }

    private (Guid? InviteId, Guid TargetChainId, string Role, int UserId, int? NewSuperAdminUserId)? ValidateTransferToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        var payload = Base64UrlDecode(parts[0]);
        if (payload == null) return null;

        var expectedSignature = Encoding.UTF8.GetBytes(Sign(payload));
        var providedSignature = Encoding.UTF8.GetBytes(parts[1]);
        if (expectedSignature.Length != providedSignature.Length ||
            !CryptographicOperations.FixedTimeEquals(expectedSignature, providedSignature))
        {
            return null;
        }

        var values = payload.Split('.');
        if (values.Length != 6 ||
            !Guid.TryParseExact(values[1], "N", out var targetChainId) ||
            !int.TryParse(values[3], out var tokenUserId) ||
            !long.TryParse(values[5], out var expiresTicks))
        {
            return null;
        }

        if (values[0] != "-" && !Guid.TryParseExact(values[0], "N", out _))
            return null;

        if (values[4] != "-" && !int.TryParse(values[4], out _))
            return null;

        if (new DateTime(expiresTicks, DateTimeKind.Utc) < DateTime.UtcNow)
            return null;

        var role = Base64UrlDecode(values[2]);
        if (string.IsNullOrWhiteSpace(role)) return null;

        var inviteId = values[0] == "-" ? (Guid?)null : Guid.ParseExact(values[0], "N");
        var newSuperAdminUserId = values[4] == "-" ? (int?)null : int.Parse(values[4]);
        return (inviteId, targetChainId, role, tokenUserId, newSuperAdminUserId);
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
public record JoinChainDto(string? Code, string? Link, string? Token, int? NewSuperAdminUserId, Guid? CurrentChainId);
public record ConfirmTransferDto(string? TransferToken);
