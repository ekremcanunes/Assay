using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using portfolio_service.Services;

namespace portfolio_service.Controllers;

// Frontend, şifre adımından sonra 2. adımda hangi seçenekleri göstereceğini buradan öğrenir.
// Oturum gerektirmez (kullanıcı bu noktada AAL1'dir); KratosMiddleware bu yolu atlar. Dönen bilgi hassas değildir.
[ApiController]
[Route("api/auth/options")]
public class AuthOptionsController(IOptions<SmsOptions> sms, IOptions<AuthOptions> auth) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var a = auth.Value;
        var s = sms.Value;

        if (a.IsMisconfigured(s))
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { error = "auth_misconfigured", message = AuthOptions.MisconfiguredMessage });

        return Ok(new
        {
            mfaRequired = a.MfaRequired,
            channels = new { sms = s.IsAvailable, email = a.EmailOtpEnabled },
        });
    }
}
