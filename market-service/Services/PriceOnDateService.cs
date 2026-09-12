using market_service.Models;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace market_service.Services;

public interface IPriceOnDateService
{
    Task<PriceOnDate> GetPriceOnAsync(string symbol, string assetType, DateOnly date);
}

// "X sembolü Y tarihinde kaçtı?" — MarketService "şu an kaç?", PriceHistoryService
// "serinin şekli ne?" sorularını cevaplar. Bu üçüncü soru.
//
// Ortak ilke: VERİDEN TÜRET, TAKVİM TUTMA. BIST tatil takvimi tutulmaz;
// "tarihi <= istenen tarih olan son kayıt" kuralı tatili verinin kendisinden çıkarır.
public class PriceOnDateService : IPriceOnDateService
{
    private const decimal GramsPerOunce = 31.1034768m;

    // Kurban Bayramı + bitişik hafta sonu BIST'i 9 takvim gününe kadar kapatabiliyor.
    private const int LookbackDays = 14;

    private readonly IYahooFinanceClient _yahoo;
    private readonly IFrankfurterClient _frankfurter;
    private readonly IBistCatalog _bistCatalog;
    private readonly IMarketService _marketService;
    private readonly IDistributedCache _cache;

    public PriceOnDateService(IYahooFinanceClient yahoo, IFrankfurterClient frankfurter,
        IBistCatalog bistCatalog, IMarketService marketService, IDistributedCache cache)
    {
        _yahoo = yahoo;
        _frankfurter = frankfurter;
        _bistCatalog = bistCatalog;
        _marketService = marketService;
        _cache = cache;
    }

    private static readonly HashSet<string> AssetTypes =
        new(StringComparer.OrdinalIgnoreCase) { "Stock", "Gold", "Currency" };

    public static bool IsValidAssetType(string assetType) => AssetTypes.Contains(assetType);

    public async Task<PriceOnDate> GetPriceOnAsync(string symbol, string assetType, DateOnly date)
    {
        var today = MarketClock.Today;
        var isToday = date == today;

        var cacheKey = $"priceon:{assetType}:{symbol}:{date:yyyy-MM-dd}".ToLowerInvariant();
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<PriceOnDate>(cached) ?? new PriceOnDate();

        var result = new PriceOnDate
        {
            Symbol = symbol,
            AssetType = assetType,
            RequestedDate = date,
            Available = false,
        };

        if (isToday)
        {
            // Kapanış henüz oluşmadı; mevcut anlık fiyat servisine delege ediyoruz.
            await FillLiveAsync(result, symbol, today);
        }
        else if (assetType.Equals("Gold", StringComparison.OrdinalIgnoreCase))
            await FillGoldAsync(result, date);
        else if (assetType.Equals("Currency", StringComparison.OrdinalIgnoreCase))
            await FillCurrencyAsync(result, symbol, date);
        else
            await FillStockAsync(result, symbol, date);

        // Kapanmış bir günün kapanışı bir daha değişmez → uzun TTL.
        // Başarısızlık kalıcı bir gerçek değil, geçici bir durum — uzun TTL verilmez.
        var ttl = !result.Available ? TimeSpan.FromMinutes(5)
            : isToday ? TimeSpan.FromMinutes(5)
            : TimeSpan.FromDays(30);
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });

        return result;
    }

    private async Task FillLiveAsync(PriceOnDate r, string symbol, DateOnly today)
    {
        var price = await _marketService.GetPriceAsync(symbol);
        if (price == null) return;

        r.PriceKind = "live";
        r.EffectiveDate = today;
        r.NativeCurrency = price.NativeCurrency;
        r.PriceInUsd = price.PriceInUsd;
        r.PriceInTry = price.PriceInTry;
        r.PriceInNative = price.NativeCurrency.Equals("TRY", StringComparison.OrdinalIgnoreCase) ? price.PriceInTry
            : price.NativeCurrency.Equals("USD", StringComparison.OrdinalIgnoreCase) ? price.PriceInUsd
            : null;
        r.Available = true;
    }

    private async Task FillStockAsync(PriceOnDate r, string symbol, DateOnly date)
    {
        var isBist = await _bistCatalog.IsBistAsync(symbol);
        var yahooSymbol = isBist ? $"{symbol}.IS" : symbol;

        var (closes, currency) = await _yahoo.GetDailyClosesAsync(
            yahooSymbol, date.AddDays(-LookbackDays), date);

        var hit = PickAtOrBefore(closes, date);
        if (hit == null) return;

        r.EffectiveDate = hit.Date;
        r.PriceInNative = hit.Close;
        r.NativeCurrency = string.IsNullOrEmpty(currency) ? "TRY" : currency;

        var usdTry = await RateOnAsync("USD", hit.Date);

        if (r.NativeCurrency.Equals("TRY", StringComparison.OrdinalIgnoreCase))
        {
            r.PriceInTry = hit.Close;
            r.PriceInUsd = usdTry > 0 ? hit.Close / usdTry : null;
        }
        else if (r.NativeCurrency.Equals("USD", StringComparison.OrdinalIgnoreCase))
        {
            r.PriceInUsd = hit.Close;
            r.PriceInTry = usdTry > 0 ? hit.Close * usdTry : null;
        }
        // Başka bir para birimi için kur çekmiyoruz; tahmin etmek yerine
        // PriceInTry null kalır ve Available = false olur (veri uydurma yok).

        // TL karşılığı hesaplanamadıysa kısmi sonuç dönmeyiz (DESIGN.md §6.1)
        r.Available = r.PriceInTry != null;
    }

    // Döviz: 1 birim yabancı paranın TL karşılığı. Native = TRY.
    private async Task FillCurrencyAsync(PriceOnDate r, string symbol, DateOnly date)
    {
        var series = await _frankfurter.GetRateSeriesAsync(
            symbol, date.AddDays(-LookbackDays), date);

        var hit = series.Where(kv => kv.Key <= date)
                        .Select(kv => (KeyValuePair<DateOnly, decimal>?)kv)
                        .LastOrDefault();
        if (hit == null) return;

        r.EffectiveDate = hit.Value.Key;
        r.NativeCurrency = "TRY";
        r.PriceInNative = hit.Value.Value;
        r.PriceInTry = hit.Value.Value;
        r.Available = true;
    }

    // Altın: GC=F ons/USD → gram TL.
    // İKİ ÇARPAN DA AYNI GÜNE AİT OLMALI. Bugünün kuruyla geçmişi çevirmek
    // TL'nin değer kaybı yüzünden %60'a varan sapma üretir (bkz. spec §3, §5).
    private async Task FillGoldAsync(PriceOnDate r, DateOnly date)
    {
        var (closes, _) = await _yahoo.GetDailyClosesAsync(
            "GC=F", date.AddDays(-LookbackDays), date);

        var hit = PickAtOrBefore(closes, date);
        if (hit == null) return;

        // Altın kaydının tarihi esastır; kur o tarih için istenir, gerekirse
        // Frankfurter kendi geri kayar.
        var usdTry = await RateOnAsync("USD", hit.Date);
        if (usdTry <= 0) return;

        var gramUsd = hit.Close / GramsPerOunce;

        r.EffectiveDate = hit.Date;
        r.NativeCurrency = "TRY";
        r.PriceInUsd = gramUsd;
        r.PriceInTry = gramUsd * usdTry;
        r.PriceInNative = r.PriceInTry;
        r.Available = true;
    }

    // Tarihi <= hedef olan SON kapanış. Hafta sonu/tatil bu kuralla çözülür.
    private static DailyClose? PickAtOrBefore(List<DailyClose> closes, DateOnly date) =>
        closes.Where(c => c.Date <= date).OrderByDescending(c => c.Date).FirstOrDefault();

    // Tarihi <= hedef olan son kur. Bulunamazsa 0.
    private async Task<decimal> RateOnAsync(string baseCurrency, DateOnly date)
    {
        var series = await _frankfurter.GetRateSeriesAsync(
            baseCurrency, date.AddDays(-LookbackDays), date);

        return series.Where(kv => kv.Key <= date)
                     .Select(kv => kv.Value)
                     .LastOrDefault();
    }
}
