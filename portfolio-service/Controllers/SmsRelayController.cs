using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using portfolio_service.DTOs;
using portfolio_service.Services;

namespace portfolio_service.Controllers;

// Yalnızca Kratos çağırır (Docker ağı içinden). nginx /internal'ı dışarı açmaz; ayrıca API anahtarı ister.
[ApiController]
[Route("internal/sms")]
public class SmsRelayController(
    SmsUsageCounter counter,
    ISmsSender sender,
    IOptions<SmsOptions> options,
    ILogger<SmsRelayController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SmsRelayRequest req, CancellationToken ct)
    {
        var expected = Encoding.UTF8.GetBytes(options.Value.RelayApiKey);
        var given = Encoding.UTF8.GetBytes(Request.Headers["X-Api-Key"].ToString());
        if (expected.Length == 0 || !CryptographicOperations.FixedTimeEquals(expected, given))
            return Unauthorized();

        // SMS_ENABLED=false ya da SMS_URL boş: sayaç artırılmadan reddedilir.
        if (!options.Value.IsAvailable)
        {
            logger.LogWarning("SMS kanalı kapalı, istek reddedildi {TemplateType}", req.Type);
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        var count = await counter.IncrementAsync(ct);
        if (count > options.Value.DailyLimit)
        {
            logger.LogWarning("Günlük SMS tavanı doldu {Limit}", options.Value.DailyLimit);
            return StatusCode(StatusCodes.Status429TooManyRequests);
        }

        try
        {
            await sender.SendAsync(req.To, req.Message, ct);
        }
        catch (Exception ex)
        {
            await counter.DecrementAsync(ct);
            logger.LogError(ex, "SMS sağlayıcısı hata döndü {TemplateType}", req.Type);
            return StatusCode(StatusCodes.Status502BadGateway);
        }

        logger.LogInformation("SMS gönderildi {TemplateType}", req.Type);
        return Ok();
    }
}
