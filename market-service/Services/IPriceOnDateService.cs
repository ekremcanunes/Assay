using market_service.Models;

namespace market_service.Services;

public interface IPriceOnDateService
{
    Task<PriceOnDate> GetPriceOnAsync(string market, string symbol, string assetType, DateOnly date);
}
