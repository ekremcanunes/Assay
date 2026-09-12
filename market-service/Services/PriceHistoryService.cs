using System.Text.Json;
using market_service.Models;
using Microsoft.Extensions.Caching.Distributed;

namespace market_service.Services;

public interface IPriceHistoryService
{
    Task<PriceHistory> GetHistoryAsync(string symbol, string assetType, string range);
}

// Grafik için OHLC serisi. Kaynak Yahoo; sembol çözümlemesi MarketService ile aynı mantık.
public class PriceHistoryService : IPriceHistoryService
{
    private const decimal GramsPerOunce = 31.1034768m;

    // Desteklenen aralıklar → (Yahoo range, interval). Beyaz liste: dışarıdan gelen
    // değer doğrudan Yahoo'ya geçmez.
    private static readonly Dictionary<string, (string Range, string Interval)> Ranges = new(StringComparer.OrdinalIgnoreCase)
    {
        ["1d"] = ("1d", "5m"),
        ["1w"] = ("5d", "30m"),
        ["1mo"] = ("1mo", "1d"),
        ["3mo"] = ("3mo", "1d"),
        ["1y"] = ("1y", "1d"),
        ["5y"] = ("5y", "1wk"),
    };

    private readonly IYahooFinanceClient _yahoo;
    private readonly IFrankfurterClient _frankfurter;
    private readonly IBistCatalog _bistCatalog;
    private readonly IDistributedCache _cache;

    public PriceHistoryService(IYahooFinanceClient yahoo, IFrankfurterClient frankfurter,
        IBistCatalog bistCatalog, IDistributedCache cache)
    {
        _yahoo = yahoo;
        _frankfurter = frankfurter;
        _bistCatalog = bistCatalog;
        _cache = cache;
    }

    public static bool IsValidRange(string range) => Ranges.ContainsKey(range);

    public async Task<PriceHistory> GetHistoryAsync(string symbol, string assetType, string range)
    {
        if (!Ranges.TryGetValue(range, out var spec))
            return new PriceHistory { Symbol = symbol, Range = range };

        var cacheKey = $"history:{assetType}:{symbol}:{range}".ToLowerInvariant();
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<PriceHistory>(cached) ?? new PriceHistory();

        var history = assetType.Equals("Gold", StringComparison.OrdinalIgnoreCase)
            ? await GoldHistoryAsync(spec)
            : assetType.Equals("Currency", StringComparison.OrdinalIgnoreCase)
                ? await CurrencyHistoryAsync(symbol, spec)
                : await StockHistoryAsync(symbol, spec);

        history.Symbol = symbol;
        history.Range = range;

        // Gün içi seriler hızlı bayatlar, günlük seriler bayatlamaz.
        var ttl = spec.Interval.EndsWith('m') ? TimeSpan.FromMinutes(5) : TimeSpan.FromHours(1);
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(history),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });

        return history;
    }

    private async Task<PriceHistory> StockHistoryAsync(string symbol, (string Range, string Interval) spec)
    {
        var isBist = await _bistCatalog.IsBistAsync(symbol);
        var yahooSymbol = isBist ? $"{symbol}.IS" : symbol;
        var (candles, currency) = await _yahoo.GetCandlesAsync(yahooSymbol, spec.Range, spec.Interval);
        return new PriceHistory { Candles = candles, Currency = currency };
    }

    // Altın: GC=F USD/ons → gram TL. Her mum KENDİ GÜNÜNÜN kuruyla çevrilir.
    // Eskiden tek bir güncel kur kullanılıyordu; eğri şekli doğru çıkıyordu ama
    // tek bir günün değeri %60'a varan hata veriyordu. Alım formu artık aynı
    // kavramı sorduğu için iki yer aynı cevabı vermek zorunda (bkz. spec §5).
    private async Task<PriceHistory> GoldHistoryAsync((string Range, string Interval) spec)
    {
        var (candles, _) = await _yahoo.GetCandlesAsync("GC=F", spec.Range, spec.Interval);
        if (candles.Count == 0) return new PriceHistory();

        var first = DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(candles[0].Time).UtcDateTime);
        var last = DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(candles[^1].Time).UtcDateTime);

        // Serinin başında kur bulunabilsin diye pencereyi geriye doğru genişletiyoruz.
        var rates = await _frankfurter.GetRateSeriesAsync("USD", first.AddDays(-14), last);
        if (rates.Count == 0) return new PriceHistory();

        var kept = new List<Candle>(candles.Count);
        foreach (var c in candles)
        {
            var day = DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(c.Time).UtcDateTime);

            // Tarihi <= mum tarihi olan son kur (hafta sonu/tatil aynı kuralla çözülür)
            var rate = rates.Where(kv => kv.Key <= day).Select(kv => kv.Value).LastOrDefault();
            if (rate <= 0) continue;   // kuru olmayan mumu uydurmak yerine düşürüyoruz

            var factor = rate / GramsPerOunce;
            c.Open *= factor;
            c.High *= factor;
            c.Low *= factor;
            c.Close *= factor;
            c.Volume = null; // ons hacmi gram TL grafiğinde anlamsız
            kept.Add(c);
        }

        return new PriceHistory { Candles = kept, Currency = "TRY" };
    }

    // Döviz: Frankfurter yalnızca günlük kapanış verir → OHLC dört alan da aynı.
    // Mum değil çizgi grafiği anlamlıdır; frontend bunu Currency tipinde çizgiye çeviriyor.
    private async Task<PriceHistory> CurrencyHistoryAsync(string symbol, (string Range, string Interval) spec)
    {
        var days = spec.Range switch
        {
            "1d" => 5,
            "5d" => 10,
            "1mo" => 30,
            "3mo" => 90,
            "1y" => 365,
            _ => 1825,
        };

        var series = await _frankfurter.GetSeriesAsync(symbol, days);
        var start = DateTimeOffset.UtcNow.Date.AddDays(-series.Count + 1);

        var candles = series.Select((rate, i) => new Candle
        {
            Time = new DateTimeOffset(start.AddDays(i), TimeSpan.Zero).ToUnixTimeSeconds(),
            Open = rate,
            High = rate,
            Low = rate,
            Close = rate,
        }).ToList();

        return new PriceHistory { Candles = candles, Currency = "TRY" };
    }
}
