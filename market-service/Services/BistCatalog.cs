using market_service.Models;

namespace market_service.Services;

public interface IBistCatalog
{
    Task<List<SymbolSearchResult>> GetAllAsync();
}

// BIST hisse evrenini Twelve Data /stocks'tan çekip Redis'te tutar (CacheTtl.Catalog).
// Arama ve piyasa özeti (hisse isimleri) bunu kullanır. Fiyatlama kullanmaz; market artık istekle gelir.
public class BistCatalog : IBistCatalog
{
    private const string CacheKey = "bist:stocks";

    private readonly ITwelveDataClient _twelveDataClient;
    private readonly CacheStore _cache;

    public BistCatalog(ITwelveDataClient twelveDataClient, CacheStore cache)
    {
        _twelveDataClient = twelveDataClient;
        _cache = cache;
    }

    // Boş liste cache'e yazılmaz (Twelve Data hatası boş döner); bir sonraki istek yeniden dener.
    public async Task<List<SymbolSearchResult>> GetAllAsync() =>
        await _cache.GetOrSetAsync(CacheKey, async () =>
        {
            var stocks = await _twelveDataClient.GetBistStocksAsync();
            return stocks.Count > 0 ? stocks : null;
        }, _ => CacheTtl.Catalog) ?? [];
}
