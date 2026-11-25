using market_service.Models;

namespace market_service.Services;

public interface IMarketOverviewService
{
    Task<MarketOverview> GetOverviewAsync();

    // Bir endeksin (IndexConstituent.Bist30 / Bist100) hisseleri, fiyatlarıyla.
    Task<List<MarketQuote>> GetIndexStocksAsync(string indexCode);
}
