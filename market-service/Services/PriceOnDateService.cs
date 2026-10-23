using market_service.Caching;
using market_service.Clients;
using market_service.Common;
using market_service.Models;

namespace market_service.Services;

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
    private readonly IMarketService _marketService;
    private readonly CacheStore _cache;

    public PriceOnDateService(IYahooFinanceClient yahoo, IFrankfurterClient frankfurter,
        IMarketService marketService, CacheStore cache)
    {
        _yahoo = yahoo;
        _frankfurter = frankfurter;
        _marketService = marketService;
        _cache = cache;
    }

    private static readonly HashSet<string> AssetTypes =
        new(StringComparer.OrdinalIgnoreCase) { "Stock", "Gold", "Currency" };

    public static bool IsValidAssetType(string assetType) => AssetTypes.Contains(assetType);

    public async Task<PriceOnDate> GetPriceOnAsync(string market, string symbol, string assetType, DateOnly date)
    {
        market = YahooSymbol.NormalizeMarket(market);
        symbol = YahooSymbol.Normalize(symbol);

        var today = MarketClock.Today;

        // Kapanış henüz oluşmadı; anlık fiyat servisine delege edilir. Ayrı kayıt tutulmaz:
        // "bugün" fiyatı portföydekiyle aynı anahtardan (stock:...) okunur, iki ekran aynı değeri gösterir.
        if (date == today)
        {
            var live = NewResult(symbol, assetType, date);
            await FillLiveAsync(live, market, symbol, today);
            return live;
        }

        var result = await _cache.GetOrSetAsync(CacheKeys.PriceOn(assetType, market, symbol, date), async () =>
        {
            var r = NewResult(symbol, assetType, date);
            if (assetType.Equals("Gold", StringComparison.OrdinalIgnoreCase))
                await FillGoldAsync(r, date);
            else if (assetType.Equals("Currency", StringComparison.OrdinalIgnoreCase))
                await FillCurrencyAsync(r, symbol, date);
            else
                await FillStockAsync(r, market, symbol, date);
            return r;
        },
        // Kapanmış bir günün kapanışı bir daha değişmez → kalıcı.
        // Başarısızlık kalıcı bir gerçek değil, geçici bir durum — kısa süre.
        r => r.Available ? CacheTtl.Permanent : CacheTtl.Failure);

        return result!;
    }

    private static PriceOnDate NewResult(string symbol, string assetType, DateOnly date) => new()
    {
        Symbol = symbol,
        AssetType = assetType,
        RequestedDate = date,
        Available = false,
    };

    private async Task FillLiveAsync(PriceOnDate r, string market, string symbol, DateOnly today)
    {
        var price = await _marketService.GetPriceAsync(market, symbol);
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

    private async Task FillStockAsync(PriceOnDate r, string market, string symbol, DateOnly date)
    {
        var (closes, currency) = await _yahoo.GetDailyClosesAsync(
            YahooSymbol.ToYahoo(market, symbol), date.AddDays(-LookbackDays), date);

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
