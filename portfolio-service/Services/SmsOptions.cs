namespace portfolio_service.Services;

public class SmsOptions
{
    public string Mode { get; set; } = "Mailpit";   // Mailpit (dev) | VatanSms (prod)
    public int DailyLimit { get; set; } = 16;
    public string RelayApiKey { get; set; } = "";
    public string MailpitSmtp { get; set; } = "mailpit:1025";
}
