namespace portfolio_service.Clients;

public class MarketPriceResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string Market { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public decimal? PriceInUsd { get; set; }
    public decimal PriceInTry { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Detay kartı için native (işlem para birimi) veriler
    public string NativeCurrency { get; set; } = string.Empty;
    public decimal? PreviousClose { get; set; }
    public decimal? DayHigh { get; set; }
    public decimal? DayLow { get; set; }
    public decimal? Week52High { get; set; }
    public decimal? Week52Low { get; set; }
    public long? Volume { get; set; }
    public string Exchange { get; set; } = string.Empty;
}
