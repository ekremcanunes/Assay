namespace market_service.Clients;

public interface ITwelveDataClient
{
    // Bir borsanın tam listesi. kind: "stocks" veya "etfs". Hata ya da boş cevapta boş liste döner.
    Task<List<TwelveDataListing>> GetListingsAsync(string kind, string exchange, CancellationToken ct);
}
