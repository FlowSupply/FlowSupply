using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using SupplyChain.API.Services;

namespace SupplyChain.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;
    private readonly EmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        TokenService tokenService,
        EmailService emailService,
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _emailService = emailService;
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("All fields are required.");
        }

        var email = request.Email.Trim().ToLower();

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existingUser != null)
        {
            return BadRequest("User with this email already exists.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = "Employee",
            EmailConfirmed = false,
            EmailVerificationToken = CreateSecureToken(),
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
        var verificationLink = $"{frontendBaseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(user.EmailVerificationToken)}";
        try
        {
            await _emailService.SendEmailVerificationAsync(user.Email, user.FullName, verificationLink);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
            return Ok(new
            {
                message = "Registration successful, but the verification email could not be sent. Contact an administrator.",
                emailWarning = true
            });
        }

        return Ok(new { message = "Registration successful. Please verify your email before signing in." });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLower();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var isValidPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isValidPassword)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (!user.EmailConfirmed)
        {
            return Unauthorized(new { message = "Please verify your email before signing in." });
        }

        var loginIp = GetClientIpAddress();
        var loginUserAgent = GetUserAgent();
        var loginAt = DateTime.UtcNow;
        var shouldNotifyNewLogin = HasPreviousLogin(user);

        user.LastLoginAt = loginAt;
        user.LastLoginIp = loginIp;
        user.LastLoginUserAgent = loginUserAgent;
        await _context.SaveChangesAsync();

        if (shouldNotifyNewLogin)
        {
            SendNewLoginAlertInBackground(user.Email, user.FullName, loginIp, loginUserAgent, loginAt);
        }

        var token = _tokenService.CreateToken(user);

        return Ok(new AuthResponse
        {
            Token = token,
            Email = user.Email,
            Role = user.Role,
            FullName = user.FullName,
            SupplyChainId = user.SupplyChainId?.ToString()
        });
    }

    [HttpPost("verify-email")]
    public async Task<ActionResult> VerifyEmail(VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest("Verification token is required.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == request.Token);
        if (user == null)
        {
            return BadRequest("Invalid verification token.");
        }

        if (user.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
        {
            return BadRequest("Verification token has expired.");
        }

        user.EmailConfirmed = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresAt = null;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Email verified successfully. You can now sign in." });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult> ChangePassword(ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest("All fields are required.");
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest("New password must be at least 6 characters.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(int.Parse(userId));
        if (user == null)
        {
            return Unauthorized();
        }

        var isValidPassword = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash);
        if (!isValidPassword)
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "New password must be different from the current password." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        SendPasswordChangedNotificationInBackground(user.Email, user.FullName);

        return Ok(new { message = "Password changed successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult> GetMe()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var fullName = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var user = await _context.Users.FindAsync(int.Parse(userId!));

        return Ok(new AuthResponse
        {
            Token    = "",
            Email    = email!,
            Role     = role!,
            FullName = fullName!,
            SupplyChainId = user?.SupplyChainId?.ToString()
        });
    }

    private static string CreateSecureToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    private static bool HasPreviousLogin(User user) =>
        user.LastLoginAt.HasValue
        && (!string.IsNullOrWhiteSpace(user.LastLoginIp)
            || !string.IsNullOrWhiteSpace(user.LastLoginUserAgent));

    private string GetClientIpAddress()
    {
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private string GetUserAgent()
    {
        var userAgent = Request.Headers.UserAgent.FirstOrDefault();
        return string.IsNullOrWhiteSpace(userAgent) ? "unknown" : userAgent;
    }

    private void SendPasswordChangedNotificationInBackground(string email, string fullName)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
                await emailService.SendPasswordChangedEmailAsync(email, fullName);
            }
            catch
            {
                // Password changes should not be blocked by notification email delivery.
            }
        });
    }

    private void SendNewLoginAlertInBackground(string email, string fullName, string ipAddress, string userAgent, DateTime loginAt)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
                await emailService.SendNewLoginAlertAsync(email, fullName, ipAddress, userAgent, loginAt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send new login alert to {Email}", email);
            }
        });
    }
}
