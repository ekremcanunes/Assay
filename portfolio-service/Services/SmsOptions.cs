namespace portfolio_service.Services;

// Sağlayıcıdan bağımsız SMS ayarları. Değerler .env'den gelir (SMS_*); bkz. docs/20-modules/SMS-RELAY.md.
public class SmsOptions
{
    public bool Enabled { get; set; } = true;
    public int DailyLimit { get; set; } = 16;
    public string RelayApiKey { get; set; } = "";
    public string Url { get; set; } = "";
    public string Sender { get; set; } = "";
    public string AuthHeader { get; set; } = "";
    public string AuthValue { get; set; } = "";
    public string BodyTemplate { get; set; } = "";

    // SMS kanalı kullanılabilir mi: açık ve gönderim adresi tanımlı. Relay ve /api/auth/options aynı kuralı kullanır.
    public bool IsAvailable => Enabled && !string.IsNullOrWhiteSpace(Url);
}
