namespace portfolio_service.Services;

// İstek boyunca market-service'ten gelen verinin en erken bitecek cache ömrünü tutar (scoped).
// market-service'teki aynı adlı sınıfın karşılığı; CacheLifetimeMiddleware bunu tarayıcıya iletir.
public class CacheLifetime
{
    private readonly object _lock = new();
    private DateTimeOffset? _earliest;

    public void Report(int secondsLeft)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddSeconds(secondsLeft);
        lock (_lock)
        {
            if (_earliest is null || expiresAt < _earliest) _earliest = expiresAt;
        }
    }

    public int? SecondsLeft()
    {
        lock (_lock)
        {
            return _earliest is { } e ? Math.Max(0, (int)(e - DateTimeOffset.UtcNow).TotalSeconds) : null;
        }
    }
}
