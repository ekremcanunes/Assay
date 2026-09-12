namespace market_service.Services;

// Log satırına yazılan her kullanıcı girdisi (sembol, arama sorgusu vb.) buradan
// geçmeli. Temizlenmeden loglanan girdi CR/LF içerirse saldırgan sahte log
// satırı enjekte edebilir (CWE-117 — log injection); ör. sembol alanına
// "THYAO\n[ADMIN] ..." göndererek log dosyasında uydurma bir olay yaratabilir.
public static class LogSanitizer
{
    public static string ForLog(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        return value.Replace("\r", string.Empty).Replace("\n", string.Empty);
    }
}
