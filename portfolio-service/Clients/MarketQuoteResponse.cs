namespace portfolio_service.Clients;

public class MarketQuoteResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? PreviousClose { get; set; }
    public decimal? ChangePercent { get; set; }

    // market-service.MarketQuote ile birebir kalmalı — eksik alan sessizce düşer.
    public decimal? DayHigh { get; set; }
    public decimal? DayLow { get; set; }
    public decimal? Week52High { get; set; }
    public decimal? Week52Low { get; set; }
    public long? Volume { get; set; }
    public List<decimal> Spark { get; set; } = new();

    // Yalnız endekslerde dolu: son işlem zamanı ve seans sınırları (açık/kapalı tarayıcıda hesaplanır)
    public DateTimeOffset? AsOf { get; set; }
    public DateTimeOffset? SessionStart { get; set; }
    public DateTimeOffset? SessionEnd { get; set; }
}
