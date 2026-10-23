namespace market_service.Caching;

// İstek boyunca okunan/yazılan cache kayıtlarının en erken bitişini tutar (scoped).
// CacheLifetimeMiddleware bunu X-Cache-Expires-In header'ına yazar.
// Kilit gerekli: /prices ve /overview kayıtları paralel okur.
public class CacheLifetime
{
    private readonly object _lock = new();
    private DateTimeOffset? _earliest;

    public void Report(DateTimeOffset expiresAt)
    {
        lock (_lock)
        {
            if (_earliest is null || expiresAt < _earliest) _earliest = expiresAt;
        }
    }

    // Saat farkı sorununu önlemek için mutlak zaman değil, kalan saniye verilir.
    public int? SecondsLeft()
    {
        lock (_lock)
        {
            return _earliest is { } e ? Math.Max(0, (int)(e - DateTimeOffset.UtcNow).TotalSeconds) : null;
        }
    }
}
