namespace portfolio_service.Services;

// 2FA ayarları. RequiredAal, Kratos'a verilen AUTH_REQUIRED_AAL ile aynı değerdir; zorunluluğu KratosMiddleware uygular,
// burada yalnızca frontend'e hangi seçeneklerin gösterileceğini söylemek için okunur.
public class AuthOptions
{
    public const string MisconfiguredMessage =
        "2FA zorunlu ama SMS ve e-posta kanallarinin ikisi de kapali. " +
        "SMS_ENABLED veya EMAIL_OTP_ENABLED degerini acin ya da AUTH_REQUIRED_AAL=aal1 yapin.";

    public string RequiredAal { get; set; } = "highest_available";
    public bool EmailOtpEnabled { get; set; } = true;

    public bool MfaRequired => RequiredAal != "aal1";

    // 2FA zorunluyken hiçbir kanal açık değilse kimse giriş yapamaz.
    public bool IsMisconfigured(SmsOptions sms) => MfaRequired && !sms.IsAvailable && !EmailOtpEnabled;
}
