using market_service.Models;

namespace market_service.Services;

public interface IMarketOverviewService
{
    Task<MarketOverview> GetOverviewAsync();
}

// Piyasa özeti kendi fiyat kopyasını tutmaz. Hisse, altın ve döviz fiyatları MarketService'ten,
// portföyle aynı anahtarlardan okunur → iki ekran aynı fiyatı gösterir.
// Yalnızca başka ekranda kullanılmayan parçaların (endeks, sparkline) kendi anahtarı vardır.
public class MarketOverviewService : IMarketOverviewService
{
    private const decimal GramsPerOunce = 31.1034768m;
    private const string SparkRange = "1mo";   // Yahoo range parametresi
    private const int SparkDays = 30;          // Frankfurter gün sayısı

    // BIST 30 bileşenleri — endeks üyeliğini API vermediği için elle tutulur.
    // Periyodik olarak (BIST 30 üç ayda bir gözden geçirilir) güncellenmeli.
    private static readonly string[] Bist30 =
    [
        "AKBNK", "ARCLK", "ASELS", "ASTOR", "BIMAS", "BRSAN", "EKGYO", "ENKAI", "EREGL", "FROTO",
        "GARAN", "GUBRF", "HEKTS", "ISCTR", "KCHOL", "KONTR", "AEFES", "KRDMD", "OYAKC", "PETKM",
        "PGSUS", "SAHOL", "SASA", "SISE", "TCELL", "THYAO", "TOASO", "TTKOM", "TUPRS", "YKBNK"
    ];

    private readonly IYahooFinanceClient _yahoo;
    private readonly IFrankfurterClient _frankfurter;
    private readonly IBistCatalog _bistCatalog;
    private readonly IMarketService _marketService;
    private readonly CacheStore _cache;
    private readonly ILogger<MarketOverviewService> _logger;

    public MarketOverviewService(IYahooFinanceClient yahoo, IFrankfurterClient frankfurter,
        IBistCatalog bistCatalog, IMarketService marketService, CacheStore cache,
        ILogger<MarketOverviewService> logger)
    {
        _yahoo = yahoo;
        _frankfurter = frankfurter;
        _bistCatalog = bistCatalog;
        _marketService = marketService;
        _cache = cache;
        _logger = logger;
    }

    public async Task<MarketOverview> GetOverviewAsync()
    {
        var nameMap = (await _bistCatalog.GetAllAsync())
            .GroupBy(s => s.Symbol, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Name, StringComparer.OrdinalIgnoreCase);

        // Endeksler — sparkline'lı (yalnızca 2 sembol, ek maliyet önemsiz)
        var indexTasks = new[]
        {
            IndexQuoteAsync("XU100.IS", "BIST 100"),
            IndexQuoteAsync("XU030.IS", "BIST 30"),
        };

        // BIST 30 hisseleri — portföyle aynı stock:BIST:{symbol} anahtarı
        var stockTasks = Bist30.Select(t => StockQuoteAsync(t, nameMap.GetValueOrDefault(t, t)));

        var strip = await BuildStripAsync();
        var indices = (await Task.WhenAll(indexTasks)).Where(q => q != null).Select(q => q!).ToList();
        var stocks = (await Task.WhenAll(stockTasks)).Where(q => q != null).Select(q => q!).ToList();

        return new MarketOverview { Indices = indices, Strip = strip, Stocks = stocks };
    }

    private async Task<MarketQuote?> StockQuoteAsync(string symbol, string name)
    {
        var p = await _marketService.GetPriceAsync("BIST", symbol);
        if (p == null) return null;

        // BIST'te native para birimi TL: PriceInTry ve PreviousClose aynı birimde
        return new MarketQuote
        {
            Symbol = symbol,
            Name = name,
            Price = p.PriceInTry,
            PreviousClose = p.PreviousClose,
            ChangePercent = ChangePct(p.PriceInTry, p.PreviousClose),
            DayHigh = p.DayHigh,
            DayLow = p.DayLow,
            Week52High = p.Week52High,
            Week52Low = p.Week52Low,
            Volume = p.Volume,
        };
    }

    // Endeks yalnızca bu ekranda gösterilir; kendi anahtarı (index:...) canlı sınıfta tutulur.
    private async Task<MarketQuote?> IndexQuoteAsync(string yahooSymbol, string name)
    {
        var quote = await _cache.GetOrSetAsync(CacheKeys.Price("Index", string.Empty, yahooSymbol), async () =>
        {
            var q = await _yahoo.GetQuoteAsync(yahooSymbol);
            if (q == null) return null;
            return new MarketQuote
            {
                Symbol = yahooSymbol,
                Name = name,
                Price = q.Price,
                PreviousClose = q.PreviousClose,
                ChangePercent = ChangePct(q.Price, q.PreviousClose),
                DayHigh = q.DayHigh,
                DayLow = q.DayLow,
                Week52High = q.Week52High,
                Week52Low = q.Week52Low,
                Volume = q.Volume,
            };
        }, _ => CacheTtl.Live);
        if (quote == null) return null;

        quote.Spark = await YahooSparkAsync(yahooSymbol);
        return quote;
    }

    private async Task<List<MarketQuote>> BuildStripAsync()
    {
        var strip = new List<MarketQuote>();

        foreach (var (code, name) in new[] { ("USD", "USD/TRY"), ("EUR", "EUR/TRY"), ("GBP", "GBP/TRY") })
        {
            var fx = await FxQuoteAsync(code, name);
            if (fx != null) strip.Add(fx);
        }

        // Altın: gram TL fiyatı portföyle aynı gold:XAU anahtarından
        var gold = await _marketService.GetPriceAsync(string.Empty, "XAU");
        if (gold != null)
        {
            var usdTry = (await _marketService.GetPriceAsync(string.Empty, "USD"))?.PriceInTry;
            var ounceSeries = await YahooSparkAsync("GC=F");
            strip.Add(new MarketQuote
            {
                Symbol = "XAU",
                Name = "Gram Altın",
                Price = gold.PriceInTry,
                PreviousClose = gold.PreviousClose,
                ChangePercent = ChangePct(gold.PriceInTry, gold.PreviousClose),
                // Seri USD/ons; güncel kurla gram TL'ye çevriliyor. Geçmiş kur farkı
                // yansımaz — sparkline eğilim gösterir, kesin tarihsel fiyat değil.
                Spark = usdTry is { } rate
                    ? [.. ounceSeries.Select(o => o / GramsPerOunce * rate)]
                    : [],
            });
        }

        return strip;
    }

    // Döviz: güncel kur portföyle aynı currency:{code} anahtarından; önceki gün ve sparkline Frankfurter serisinden
    private async Task<MarketQuote?> FxQuoteAsync(string code, string name)
    {
        var spot = await _marketService.GetPriceAsync(string.Empty, code);
        if (spot == null) return null;

        var series = await _cache.GetOrSetAsync(CacheKeys.Spark(code), async () =>
        {
            var s = await _frankfurter.GetSeriesAsync(code, SparkDays);
            return s.Count > 0 ? s : null;
        }, _ => CacheTtl.Daily) ?? [];

        decimal? prev = series.Count > 1 ? series[^2] : null;
        return new MarketQuote
        {
            Symbol = code,
            Name = name,
            Price = spot.PriceInTry,
            PreviousClose = prev,
            ChangePercent = ChangePct(spot.PriceInTry, prev),
            Spark = series,
        };
    }

    // Sparkline eğilim çizgisidir, anlık olması gerekmez → günlük sınıf
    private async Task<List<decimal>> YahooSparkAsync(string yahooSymbol) =>
        await _cache.GetOrSetAsync(CacheKeys.Spark(yahooSymbol), async () =>
        {
            var s = await _yahoo.GetCloseSeriesAsync(yahooSymbol, SparkRange);
            return s.Count > 0 ? s : null;
        }, _ => CacheTtl.Daily) ?? [];

    private static decimal? ChangePct(decimal price, decimal? prev) =>
        prev is > 0 ? (price - prev.Value) / prev.Value * 100 : null;
}
