using market_service.Models;

namespace market_service.Clients;

public interface ITwelveDataClient
{
    // BIST borsasındaki tüm hisseleri döndürür (sembol + isim)
    Task<List<SymbolSearchResult>> GetBistStocksAsync();

    // Twelve Data global sembol araması (US/diğer borsalar için)
    Task<List<SymbolSearchResult>> SearchSymbolsAsync(string query);

    // Bir borsanın tam listesi. kind: "stocks" veya "etfs". Hata ya da boş cevapta boş liste döner.
    Task<List<TwelveDataListing>> GetListingsAsync(string kind, string exchange, CancellationToken ct);
}
