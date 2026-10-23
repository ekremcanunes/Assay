using market_service.Models;

namespace market_service.Services;

public interface IMarketOverviewService
{
    Task<MarketOverview> GetOverviewAsync();
}
