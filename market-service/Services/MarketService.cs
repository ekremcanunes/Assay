using System.Text.Json;
using market_service.Models;
using Microsoft.Extensions.Caching.Distributed;

namespace market_service.Services;

public class MarketService : IMarketService
{
    private static readonly HashSet<string> CurrencySymbols = new(StringComparer.OrdinalIgnoreCase) { "USD", "EUR", "GBP" };
    private const string GoldSymbol = "XAU";
    private const decimal GramsPerOunce = 31.1034768m;

    private readonly IDistributedCache _cache;
    private readonly IFrankfurterClient _frankfurterClient;
    private readonly IYahooFinanceClient _yahooClient;
    private readonly IBistCatalog _bistCatalog;
    private readonly ILogger<MarketService> _logger;
    private readonly int _ttlMinutes;

    public MarketService(IDistributedCache cache, IFrankfurterClient frankfurterClient,
        IYahooFinanceClient yahooClient, IBistCatalog bistCatalog, IConfiguration configuration,
        ILogger<MarketService> logger)
    {
        _cache = cache;
        _frankfurterClient = frankfurterClient;
        _yahooClient = yahooClient;
        _bistCatalog = bistCatalog;
        _logger = logger;
        _ttlMinutes = configuration.GetValue<int>("Cache:TtlMinutes", 5);
    }

    public async Task<MarketPrice?> GetPriceAsync(string symbol)
    {
        symbol = symbol.ToUpperInvariant();
        var assetType = ResolveAssetType(symbol);

        var cacheKey = $"{assetType.ToLower()}:{symbol}";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<MarketPrice>(cached);

        var marketPrice = assetType switch
        {
            "Currency" => await FetchCurrencyAsync(symbol),
            "Gold" => await FetchGoldAsync(symbol),
            _ => await FetchStockAsync(symbol)
        };
        if (marketPrice == null) return null;

        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_ttlMinutes)
        };
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(marketPrice), options);

        return marketPrice;
    }

    public async Task<List<MarketPrice>> GetPricesAsync(IEnumerable<string> symbols)
    {
        var tasks = symbols.Select(GetPriceAsync);
        var results = await Task.WhenAll(tasks);
        return results.Where(r => r != null).Select(r => r!).ToList();
    }

    private static string ResolveAssetType(string symbol)
    {
        // XAU = altın; fiat para birimleri Frankfurter; geri kalan her sembol hisse (Yahoo)
        if (symbol.Equals(GoldSymbol, StringComparison.OrdinalIgnoreCase)) return "Gold";
        return CurrencySymbols.Contains(symbol) ? "Currency" : "Stock";
    }

    // Altın: Yahoo GC=F (USD/ons) → gram başına TL. Miktar gram cinsinden tutulur.
    private async Task<MarketPrice?> FetchGoldAsync(string symbol)
    {
        var quote = await _yahooClient.GetQuoteAsync("GC=F");
        if (quote == null) return null;

        var usdTryRate = await _frankfurterClient.GetExchangeRateAsync("USD");
        if (usdTryRate == null) return null;

        var usdPerGram = quote.Price / GramsPerOunce;
        var tryPerGram = usdPerGram * usdTryRate.Value;

        return new MarketPrice
        {
            Symbol = symbol,
            AssetType = "Gold",
            PriceInUsd = usdPerGram,
            PriceInTry = tryPerGram,
            NativeCurrency = "TRY",
            PreviousClose = quote.PreviousClose.HasValue
                ? quote.PreviousClose.Value / GramsPerOunce * usdTryRate.Value
                : null,
            Exchange = "GOLD",
            UpdatedAt = DateTime.UtcNow
        };
    }

    private async Task<MarketPrice?> FetchCurrencyAsync(string symbol)
    {
        var tryRate = await _frankfurterClient.GetExchangeRateAsync(symbol);
        if (tryRate == null) return null;

        return new MarketPrice
        {
            Symbol = symbol,
            AssetType = "Currency",
            PriceInTry = tryRate.Value,
            NativeCurrency = "TRY",
            UpdatedAt = DateTime.UtcNow
        };
    }

    private async Task<MarketPrice?> FetchStockAsync(string symbol)
    {
        var isBist = await _bistCatalog.IsBistAsync(symbol);
        var yahooSymbol = isBist ? $"{symbol}.IS" : symbol;

        var quote = await _yahooClient.GetQuoteAsync(yahooSymbol);
        if (quote == null) return null;

        var usdTryRate = await _frankfurterClient.GetExchangeRateAsync("USD");
        if (usdTryRate == null) return null;

        // Fiyat native para biriminde gelir (BIST=TRY, US=USD) — TRY ve USD karşılıklarını üret
        var (priceInUsd, priceInTry) = await ConvertPriceAsync(quote.Price, quote.Currency, usdTryRate.Value);
        if (priceInTry == null) return null;

        return new MarketPrice
        {
            Symbol = symbol,
            AssetType = "Stock",
            PriceInUsd = priceInUsd,
            PriceInTry = priceInTry.Value,
            NativeCurrency = quote.Currency,
            PreviousClose = quote.PreviousClose,
            DayHigh = quote.DayHigh,
            DayLow = quote.DayLow,
            Week52High = quote.Week52High,
            Week52Low = quote.Week52Low,
            Volume = quote.Volume,
            Exchange = isBist ? "BIST" : quote.Exchange,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private async Task<(decimal? usd, decimal? tryPrice)> ConvertPriceAsync(decimal price, string currency, decimal usdTryRate)
    {
        if (currency.Equals("TRY", StringComparison.OrdinalIgnoreCase))
            return (price / usdTryRate, price);

        if (currency.Equals("USD", StringComparison.OrdinalIgnoreCase))
            return (price, price * usdTryRate);

        // Diğer para birimleri (EUR, GBP...) → önce TRY'ye, oradan USD'ye
        var currencyTryRate = await _frankfurterClient.GetExchangeRateAsync(currency);
        if (currencyTryRate == null) return (null, null);
        var priceInTry = price * currencyTryRate.Value;
        return (priceInTry / usdTryRate, priceInTry);
    }
}
