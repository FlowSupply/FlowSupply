using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;

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

        var action  = hasAccount ? "влезете" : "се регистрирате и влезете";
        var subject = $"Покана към {chainName} — FlowSupply";
        var body    = $@"
<div style='font-family:sans-serif;max-width:480px;margin:0 auto;'>
  <h2 style='color:#7c3aed;'>Поканени сте в {chainName}</h2>
  <p>Кликнете на бутона по-долу, за да {action} в supply chain системата.</p>
  <a href='{inviteLink}'
     style='display:inline-block;padding:12px 28px;
            background:linear-gradient(135deg,#6d28d9,#7c3aed);
            color:white;border-radius:10px;text-decoration:none;
            font-weight:600;margin:16px 0;'>
    Приеми поканата
  </a>
  <p style='color:#9ca3af;font-size:13px;'>
    Линкът е валиден 7 дни. Ако не сте очаквали тази покана, игнорирайте имейла.
  </p>
</div>";

        var raw = $"From: {senderEmail}\r\n" +
                  $"To: {toEmail}\r\n" +
                  $"Subject: {subject}\r\n" +
                  "MIME-Version: 1.0\r\n" +
                  "Content-Type: text/html; charset=utf-8\r\n\r\n" +
                  body;

        var encoded = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(raw))
                        .Replace('+', '-')
                        .Replace('/', '_')
                        .Replace("=", "");

        await gmailService.Users.Messages
            .Send(new Message { Raw = encoded }, "me")
            .ExecuteAsync();
    }
}