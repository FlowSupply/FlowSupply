using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using MimeKit;

namespace SupplyChain.API.Services;

public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendInviteEmailAsync(string toEmail, string inviteLink, string chainName, bool hasAccount)
    {
        var clientId     = _config["Gmail:ClientId"]!;
        var clientSecret = _config["Gmail:ClientSecret"]!;
        var refreshToken = _config["Gmail:RefreshToken"]!;
        var senderEmail  = _config["Gmail:SenderEmail"]!;

        var credential = new UserCredential(
            new GoogleAuthorizationCodeFlow(
                new GoogleAuthorizationCodeFlow.Initializer
                {
                    ClientSecrets = new ClientSecrets
                    {
                        ClientId     = clientId,
                        ClientSecret = clientSecret
                    },
                    Scopes = new[] { GmailService.Scope.GmailSend }
                }),
            "user",
            new TokenResponse { RefreshToken = refreshToken }
        );

        var gmailService = new GmailService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName       = "FlowSupply"
        });

        var action = hasAccount ? "влезете" : "се регистрирате и влезете";

        var html = $@"
<!DOCTYPE html>
<html lang='bg'>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f3f0ff;font-family:Arial,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f3f0ff;padding:40px 0;'>
    <tr>
      <td align='center'>
        <table width='520' cellpadding='0' cellspacing='0'
               style='background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(109,40,217,0.10);'>

          <!-- Header -->
          <tr>
            <td style='background:linear-gradient(135deg,#6d28d9,#7c3aed);
                       padding:32px 40px;text-align:center;'>
              <p style='margin:0;color:#e9d5ff;font-size:12px;
                        letter-spacing:0.12em;text-transform:uppercase;'>FlowSupply</p>
              <h1 style='margin:10px 0 0;color:#ffffff;font-size:26px;font-weight:700;'>
                Покана за присъединяване
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style='padding:36px 40px;'>
              <p style='margin:0 0 12px;font-size:16px;color:#374151;line-height:1.6;'>
                Здравейте,
              </p>
              <p style='margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;'>
                Поканени сте да се присъедините към supply chain
                <strong style='color:#6d28d9;'>{chainName}</strong>
                в платформата FlowSupply.
              </p>

              <!-- Chain name badge -->
              <table cellpadding='0' cellspacing='0' width='100%'
                     style='background:#f5f3ff;border-radius:12px;
                            border:1px solid #ede9fe;margin-bottom:28px;'>
                <tr>
                  <td style='padding:16px 20px;'>
                    <p style='margin:0;font-size:11px;color:#9ca3af;
                              text-transform:uppercase;letter-spacing:0.08em;'>Supply Chain</p>
                    <p style='margin:4px 0 0;font-size:18px;font-weight:700;color:#4c1d95;'>
                      {chainName}
                    </p>
                  </td>
                </tr>
              </table>

              <p style='margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;'>
                Кликнете на бутона по-долу, за да {action} в системата.
              </p>

              <!-- CTA Button -->
              <table cellpadding='0' cellspacing='0' width='100%'>
                <tr>
                  <td align='center'>
                    <a href='{inviteLink}'
                       style='display:inline-block;padding:14px 36px;
                              background:linear-gradient(135deg,#6d28d9,#7c3aed);
                              color:#ffffff;font-size:15px;font-weight:600;
                              text-decoration:none;border-radius:10px;
                              letter-spacing:0.02em;'>
                      Приеми поканата &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style='padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center;'>
              <p style='margin:0;font-size:12px;color:#9ca3af;line-height:1.6;'>
                Линкът е валиден 7 дни.<br>
                Ако не сте очаквали тази покана, просто игнорирайте имейла.
              </p>
              <p style='margin:12px 0 0;font-size:11px;color:#c4b5d0;'>
                &copy; 2026 FlowSupply. Всички права запазени.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        // Използваме MimeKit за правилен UTF-8 encoding
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("FlowSupply", senderEmail));
        message.To.Add(new MailboxAddress("", toEmail));
        message.Subject = $"Покана към {chainName} — FlowSupply";

        var bodyBuilder = new BodyBuilder { HtmlBody = html };
        message.Body = bodyBuilder.ToMessageBody();

        // Конвертираме MimeMessage към base64 за Gmail API
        using var stream = new MemoryStream();
        await message.WriteToAsync(stream);
        var encoded = Convert.ToBase64String(stream.ToArray())
                        .Replace('+', '-')
                        .Replace('/', '_')
                        .Replace("=", "");

        await gmailService.Users.Messages
            .Send(new Message { Raw = encoded }, "me")
            .ExecuteAsync();
    }
}