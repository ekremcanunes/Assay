using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace portfolio_service.Services;

// Dev: SMS'i gerçekten göndermez, Mailpit'e e-posta olarak düşürür (localhost:8025).
public class MailpitSmsSender(IOptions<SmsOptions> options) : ISmsSender
{
    public async Task SendAsync(string to, string message, CancellationToken ct)
    {
        var parts = options.Value.MailpitSmtp.Split(':');
        using var client = new SmtpClient(parts[0], int.Parse(parts[1]));
        using var mail = new MailMessage("sms-relay@assay.local", "sms@assay.local", $"SMS → {to}", message);
        await client.SendMailAsync(mail, ct);
    }
}
