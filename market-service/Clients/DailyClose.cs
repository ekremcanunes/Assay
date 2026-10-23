namespace market_service.Clients;

// Tarihli günlük kapanış. Bilerek Candle DEĞİL: Candle bugün yalnızca grafik
// zincirinde kullanılıyor (GetCandlesAsync → PriceHistoryService → PriceChart).
public record DailyClose(DateOnly Date, decimal Close);
