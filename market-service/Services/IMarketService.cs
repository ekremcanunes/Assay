using market_service.Models;

namespace market_service.Services;

public interface IMarketService
{
    Task<MarketPrice?> GetPriceAsync(string market, string symbol);
    // Girdi: hisse için "MARKET:SYMBOL" (BIST:THYAO), altın/döviz için düz sembol (XAU, USD)
    Task<List<MarketPrice>> GetPricesAsync(IEnumerable<string> entries);
}
