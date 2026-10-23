using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace market_service.Caching;

// "Cache'e bak, yoksa çek, yaz" akışının tek uygulaması. Kayıt bitiş anıyla birlikte saklanır,
// çünkü IDistributedCache bir kaydın kalan süresini veremez.
public class CacheStore(IDistributedCache cache, CacheLifetime lifetime)
{
    private record Entry<T>(T Value, DateTimeOffset ExpiresAt);

    // fetch null dönerse cache'e yazılmaz (bir sonraki istek yeniden dener).
    // ttl değere göre seçilebilir (ör. başarılı kapanış Permanent, başarısız Failure).
    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T?>> fetch, Func<T, TimeSpan> ttl) where T : class
    {
        var cached = await cache.GetStringAsync(key);
        if (cached != null)
        {
            // Eski biçimdeki (zarfsız) kayıtta Value null gelir → yeniden çekilip üzerine yazılır.
            var entry = JsonSerializer.Deserialize<Entry<T>>(cached);
            if (entry?.Value != null)
            {
                lifetime.Report(entry.ExpiresAt);
                return entry.Value;
            }
        }

        var value = await fetch();
        if (value == null) return null;

        var expiresAt = DateTimeOffset.UtcNow + ttl(value);
        await cache.SetStringAsync(key, JsonSerializer.Serialize(new Entry<T>(value, expiresAt)),
            new DistributedCacheEntryOptions { AbsoluteExpiration = expiresAt });
        lifetime.Report(expiresAt);
        return value;
    }
}
