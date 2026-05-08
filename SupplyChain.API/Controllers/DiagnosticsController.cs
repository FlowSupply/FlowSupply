using Microsoft.AspNetCore.Mvc;
using SupplyChain.API.Services;

namespace SupplyChain.API.Controllers;

[ApiController]
[Route("api/diagnostics")]
public class DiagnosticsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly EmailService _emailService;

    public DiagnosticsController(IConfiguration configuration, EmailService emailService)
    {
        _configuration = configuration;
        _emailService = emailService;
    }

    [HttpGet("email-config")]
    public IActionResult GetEmailConfig()
    {
        return Ok(new
        {
            senderEmail = _configuration["Gmail:SenderEmail"],
            hasClientId = !string.IsNullOrWhiteSpace(_configuration["Gmail:ClientId"]),
            hasClientSecret = !string.IsNullOrWhiteSpace(_configuration["Gmail:ClientSecret"]),
            hasRefreshToken = !string.IsNullOrWhiteSpace(_configuration["Gmail:RefreshToken"]),
            frontendBaseUrl = _configuration["Frontend:BaseUrl"]
        });
    }

    [HttpPost("send-test-email")]
    public async Task<IActionResult> SendTestEmail([FromBody] SendTestEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        try
        {
            await _emailService.SendEmailVerificationAsync(
                request.Email.Trim(),
                "FlowSupply Test",
                "https://flowsupply.onrender.com/verify-email?token=test");

            return Ok(new { message = "Test email sent." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Test email failed.",
                error = ex.Message,
                type = ex.GetType().FullName,
                innerError = ex.InnerException?.Message
            });
        }
    }
}

public record SendTestEmailRequest(string Email);

