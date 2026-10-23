using market_service.Models;

namespace market_service.Services;

public interface IPriceHistoryService
{
    Task<PriceHistory> GetHistoryAsync(string market, string symbol, string assetType, string range);
}
