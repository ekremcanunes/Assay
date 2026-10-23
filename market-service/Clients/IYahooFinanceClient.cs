using market_service.Models;

namespace market_service.Clients;

public interface IYahooFinanceClient
{
    Task<YahooQuote?> GetQuoteAsync(string yahooSymbol);

    // Kapanış serisi (sparkline). Quote ile aynı endpoint, yalnızca range farklı.
    Task<List<decimal>> GetCloseSeriesAsync(string yahooSymbol, string range);

    // OHLC + hacim serisi (grafik). Aynı endpoint; interval aralığa göre seçilir.
    Task<(List<Candle> Candles, string Currency)> GetCandlesAsync(string yahooSymbol, string range, string interval);

    // Belirli bir tarih penceresindeki günlük kapanışlar. GetCloseSeriesAsync'in
    // tarihli/pencereli kuzeni; range= bugüne göreli olduğu için eski tarihler
    // için period1/period2 kullanılır.
    Task<(List<DailyClose> Closes, string Currency)> GetDailyClosesAsync(
        string yahooSymbol, DateOnly from, DateOnly to);
}
