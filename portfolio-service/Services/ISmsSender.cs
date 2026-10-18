namespace portfolio_service.Services;

// Gönderim başarısızsa exception fırlatır; relay sayacı geri alıp 502 döner.
public interface ISmsSender
{
    Task SendAsync(string to, string message, CancellationToken ct);
}
