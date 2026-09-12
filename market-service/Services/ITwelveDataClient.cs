using market_service.Models;

namespace market_service.Services;

public interface ITwelveDataClient
{
    // BIST borsasındaki tüm hisseleri döndürür (sembol + isim)
    Task<List<SymbolSearchResult>> GetBistStocksAsync();

    // Twelve Data global sembol araması (US/diğer borsalar için)
    Task<List<SymbolSearchResult>> SearchSymbolsAsync(string query);
}
