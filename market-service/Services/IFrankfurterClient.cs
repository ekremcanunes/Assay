namespace market_service.Services;

public interface IFrankfurterClient
{
    Task<decimal?> GetExchangeRateAsync(string baseCurrency);

    // Son N günün TRY kuru, kronolojik sırada. Sparkline ve önceki kapanış için.
    Task<List<decimal>> GetSeriesAsync(string baseCurrency, int days);

    // Tarih→kur eşlemesi. GetSeriesAsync tarihleri atıyor; tarih gerektiren
    // işler (tarihe göre fiyat, altın grafiği) bunu kullanır.
    Task<SortedDictionary<DateOnly, decimal>> GetRateSeriesAsync(
        string baseCurrency, DateOnly from, DateOnly to);
}
