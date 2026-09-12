namespace portfolio_service.Services;

public interface IMarketServiceClient
{
    Task<List<MarketPriceResponse>> GetPricesAsync(IEnumerable<string> symbols);
    Task<List<SymbolSearchResponse>> SearchAsync(string query);
    Task<MarketOverviewResponse> GetOverviewAsync();
    Task<PriceHistoryResponse> GetHistoryAsync(string symbol, string assetType, string range);
    Task<PriceOnDateResponse> GetPriceOnAsync(string symbol, string assetType, string date);
}

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
}

public class CandleResponse
{
    public long Time { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long? Volume { get; set; }
}

public class PriceHistoryResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string Range { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public List<CandleResponse> Candles { get; set; } = new();
}

public class MarketOverviewResponse
{
    public List<MarketQuoteResponse> Indices { get; set; } = new();
    public List<MarketQuoteResponse> Strip { get; set; } = new();
    public List<MarketQuoteResponse> Stocks { get; set; } = new();
}

public class SymbolSearchResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Exchange { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
}

public class MarketPriceResponse
{
    public string Symbol { get; set; } = string.Empty;
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

public class PriceOnDateResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public DateOnly RequestedDate { get; set; }
    public DateOnly? EffectiveDate { get; set; }
    public bool Available { get; set; }
    public string PriceKind { get; set; } = "close";
    public decimal? PriceInNative { get; set; }
    public decimal? PriceInUsd { get; set; }
    public decimal? PriceInTry { get; set; }
    public string NativeCurrency { get; set; } = string.Empty;
}
