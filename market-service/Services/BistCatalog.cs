using System.Text.Json;
using market_service.Models;
using Microsoft.Extensions.Caching.Distributed;

namespace market_service.Services;

public interface IBistCatalog
{
    Task<List<SymbolSearchResult>> GetAllAsync();
    Task<bool> IsBistAsync(string symbol);
}

// BIST hisse evrenini Twelve Data /stocks'tan çekip Redis'te 24 saat tutar.
// Hem arama (isim listesi) hem fiyatlama (bir sembol BIST mi?) bunu kullanır.
public class BistCatalog : IBistCatalog
{
    private const string CacheKey = "bist:stocks";

    private readonly ITwelveDataClient _twelveDataClient;
    private readonly IDistributedCache _cache;

    public BistCatalog(ITwelveDataClient twelveDataClient, IDistributedCache cache)
    {
        _twelveDataClient = twelveDataClient;
        _cache = cache;
    }

    public async Task<List<SymbolSearchResult>> GetAllAsync()
    {
        var cached = await _cache.GetStringAsync(CacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<List<SymbolSearchResult>>(cached) ?? [];

        var stocks = await _twelveDataClient.GetBistStocksAsync();
        if (stocks.Count > 0)
        {
            await _cache.SetStringAsync(CacheKey, JsonSerializer.Serialize(stocks),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) });
        }
        return stocks;
    }

    public async Task<bool> IsBistAsync(string symbol)
    {
        var all = await GetAllAsync();
        return all.Any(s => s.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase));
    }
}
