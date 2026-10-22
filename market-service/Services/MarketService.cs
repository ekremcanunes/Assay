using market_service.Models;

namespace market_service.Services;

public class MarketService : IMarketService
{
    private static readonly HashSet<string> CurrencySymbols = new(StringComparer.OrdinalIgnoreCase) { "USD", "EUR", "GBP" };
    private const string GoldSymbol = "XAU";
    private const decimal GramsPerOunce = 31.1034768m;

    private readonly CacheStore _cache;
    private readonly IFrankfurterClient _frankfurterClient;
    private readonly IYahooFinanceClient _yahooClient;
    private readonly ILogger<MarketService> _logger;

    public MarketService(CacheStore cache, IFrankfurterClient frankfurterClient,
        IYahooFinanceClient yahooClient, ILogger<MarketService> logger)
    {
        _cache = cache;
        _frankfurterClient = frankfurterClient;
        _yahooClient = yahooClient;
        _logger = logger;
    }

    // Anlık fiyatın tek kaynağı: portföy, piyasa özeti ve "bugün" fiyatı hep buradan, aynı anahtardan okur.
    public async Task<MarketPrice?> GetPriceAsync(string market, string symbol)
    {
        market = YahooSymbol.NormalizeMarket(market);
        symbol = YahooSymbol.Normalize(symbol);
        var assetType = ResolveAssetType(symbol);

        return await _cache.GetOrSetAsync(CacheKeys.Price(assetType, market, symbol),
            () => assetType switch
            {
                "Currency" => FetchCurrencyAsync(symbol),
                "Gold" => FetchGoldAsync(symbol),
                _ => FetchStockAsync(market, symbol)
            },
            _ => CacheTtl.Live);
    }

    // TL çevirilerinin hepsi aynı cache'li USD/TRY kurunu kullanır.
    private async Task<decimal?> UsdTryRateAsync() =>
        (await GetPriceAsync(string.Empty, "USD"))?.PriceInTry;

    // Bir sembolün sorunu diğerlerini düşürmez: geçersiz olan ve fiyatı bulunamayan atlanır,
    // sebep tek özet satırla loglanır (LOGGING.md §4: döngüde log yok, sembol listesi yok).
    public async Task<List<MarketPrice>> GetPricesAsync(IEnumerable<string> entries)
    {
        var valid = new List<(string Market, string Symbol)>();
        var invalidCount = 0;
        foreach (var entry in entries)
        {
            var (market, symbol) = ParseEntry(entry);
            if (YahooSymbol.IsValidMarketFor(ResolveAssetType(symbol), market)) valid.Add((market, symbol));
            else invalidCount++;
        }

        var results = await Task.WhenAll(valid.Select(v => GetPriceAsync(v.Market, v.Symbol)));
        var prices = results.Where(r => r != null).Select(r => r!).ToList();

        var missingCount = valid.Count - prices.Count;
        if (invalidCount > 0 || missingCount > 0)
            _logger.LogWarning("{InvalidCount} sembol geçersiz market nedeniyle, {MissingCount} sembol fiyat bulunamadığı için atlandı",
                invalidCount, missingCount);

        return prices;
    }

    // "BIST:THYAO" → (BIST, THYAO); "XAU" → ("", XAU)
    private static (string Market, string Symbol) ParseEntry(string entry)
    {
        var parts = entry.Split(':', 2);
        return parts.Length == 2
            ? (YahooSymbol.NormalizeMarket(parts[0]), YahooSymbol.Normalize(parts[1]))
            : (string.Empty, YahooSymbol.Normalize(entry));
    }

    public static string ResolveAssetType(string symbol)
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

        var usdTryRate = await UsdTryRateAsync();
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

    private async Task<MarketPrice?> FetchStockAsync(string market, string symbol)
    {
        var quote = await _yahooClient.GetQuoteAsync(YahooSymbol.ToYahoo(market, symbol));
        if (quote == null) return null;

        var usdTryRate = await UsdTryRateAsync();
        if (usdTryRate == null) return null;

        // Fiyat native para biriminde gelir (BIST=TRY, US=USD) — TRY ve USD karşılıklarını üret
        var (priceInUsd, priceInTry) = await ConvertPriceAsync(quote.Price, quote.Currency, usdTryRate.Value);
        if (priceInTry == null) return null;

        return new MarketPrice
        {
            Symbol = symbol,
            Market = market,
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
            Exchange = market == "BIST" ? "BIST" : quote.Exchange,
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
