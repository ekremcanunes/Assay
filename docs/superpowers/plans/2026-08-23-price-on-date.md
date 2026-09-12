# Tarihe Göre Fiyat (`PriceOnDate`) — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alım formunda tarih seçilince o günün fiyatı otomatik gelsin; elle girilen fiyat gerçek veriden saparsa kullanıcı kademeli olarak uyarılsın.

**Architecture:** market-service'e yeni bir `PriceOnDateService` eklenir (mevcut `PriceHistoryService` grafik için tasarlandığından ayrı tutulur). Frontend her zamanki gibi yalnızca portfolio-service ile konuşur; yeni uç nokta mevcut `history/{symbol}` proxy deseninden geçer. Sapma kontrolü tamamen frontend'de, kaydı hiçbir durumda engellemez.

**Tech Stack:** .NET 9 (market-service, portfolio-service), Redis (`IDistributedCache`), React 19 + TanStack Query + Tailwind v4, Yahoo Finance chart API, Frankfurter API.

**Spec:** [`docs/superpowers/specs/2026-08-23-price-on-date-design.md`](../specs/2026-08-23-price-on-date-design.md)

## Global Constraints

- **Test yok — bilinçli karar.** Projede test altyapısı bulunmuyor; bu iş testsiz gidiyor (spec §10). Bu yüzden bu planda TDD adımları yerine **her görevin sonunda elle doğrulama** adımı var. Doğrulama adımı atlanamaz.
- **Görev başına commit YOK.** Kullanıcı isteği: iş bitince tek commit. Görevler commit'siz ilerler.
- **Ad-hoc renk yasak** — yalnızca token (`web/DESIGN.md` §8). Yeni uyarı rengi: `brass` (yumuşak) / `margin` (sert).
- **Ad-hoc tip boyutu yasak** — yalnızca `text-micro / text-ui / text-body / text-figure / text-head / text-title` ve `.label` (`web/DESIGN.md` §3.1).
- **Frontend market-service'e doğrudan gitmez.** Tek giriş kapısı portfolio-service (`nginx.conf` tek `/api/` location).
- **Ham kullanıcı girdisi sağlayıcıya geçmez.** `date` katı `yyyy-MM-dd` parse edilir, `assetType` beyaz listeye karşı doğrulanır.
- **Veri yoksa `200 + Available=false`**, `404` değil.
- **Uydurma veri yok** — kısmi hesap dönülmez (`web/DESIGN.md` §6.1).
- Gram sabiti: `31.1034768`.
- Mevcut `GetSeriesAsync` / `GetCandlesAsync` / `GetCloseSeriesAsync` / `GetQuoteAsync` **değiştirilmez**.

**Servisleri ayağa kaldırma** (doğrulama adımları bunu varsayar):

```bash
docker compose up -d --build market-service portfolio-service
```

---

## Dosya Haritası

**market-service**
| Dosya | Sorumluluk |
|---|---|
| `Models/PriceOnDate.cs` *(yeni)* | Tek günün fiyat sonucu |
| `Services/PriceOnDateService.cs` *(yeni)* | Arayüz + uygulama; tarih→fiyat iş kuralı |
| `Services/YahooFinanceClient.cs` | `DailyClose` record + `GetDailyClosesAsync` eklenir |
| `Services/IFrankfurterClient.cs`, `Services/FrankfurterClient.cs` | `GetRateSeriesAsync` eklenir |
| `Services/PriceHistoryService.cs` | Yalnızca `GoldHistoryAsync` düzeltilir |
| `Controllers/MarketController.cs` | `GET price-on/{symbol}` |
| `Program.cs` | DI kaydı |

**portfolio-service**
| Dosya | Sorumluluk |
|---|---|
| `Services/IMarketServiceClient.cs` | `PriceOnDateResponse` DTO + metot imzası |
| `Services/MarketServiceClient.cs` | HTTP geçişi (cookie forward) |
| `Controllers/MarketController.cs` | Passthrough action |

**web**
| Dosya | Sorumluluk |
|---|---|
| `src/lib/priceDeviation.js` *(yeni)* | Saf sapma/kademe fonksiyonu |
| `src/services/api.js` | `marketApi.priceOn` |
| `src/hooks/queries.js` | `usePriceOnDate` |
| `src/pages/AddAsset.jsx` | Form sırası, otomatik doldurma, notlar, uyarı, onay |
| `src/contexts/LanguageContext.jsx` | TR/EN metinler |
| `DESIGN.md` | Uyarı rengi kuralı |

---

## Task 1: market-service — iskelet + hisse yolu

**Files:**
- Create: `market-service/Models/PriceOnDate.cs`
- Create: `market-service/Services/PriceOnDateService.cs`
- Modify: `market-service/Services/YahooFinanceClient.cs`
- Modify: `market-service/Services/IFrankfurterClient.cs`
- Modify: `market-service/Services/FrankfurterClient.cs`
- Modify: `market-service/Controllers/MarketController.cs`
- Modify: `market-service/Program.cs`

**Interfaces:**
- Consumes: `IBistCatalog.IsBistAsync(string)`, `IDistributedCache`
- Produces: `PriceOnDate` modeli; `IPriceOnDateService.GetPriceOnAsync(string symbol, string assetType, DateOnly date)`; `YahooFinanceClient.DailyClose(DateOnly Date, decimal Close)`; `IYahooFinanceClient.GetDailyClosesAsync(string, DateOnly, DateOnly)`; `IFrankfurterClient.GetRateSeriesAsync(string, DateOnly, DateOnly)`

- [ ] **Step 1: Model dosyasını oluştur**

`market-service/Models/PriceOnDate.cs`:

```csharp
namespace market_service.Models;

// Tek bir günün fiyatı. PriceHistory bir SERİ döndürür, bu TEK GÜN döndürür.
public class PriceOnDate
{
    public string Symbol { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;

    public DateOnly RequestedDate { get; set; }

    // Gerçekte kullanılan işlem günü. İstenen gün tatilse önceki iş gününe düşülür;
    // frontend "14 Mart istedin, 13 Mart kapanışı alındı" mesajını bu ikisinden kurar.
    public DateOnly? EffectiveDate { get; set; }

    public bool Available { get; set; }

    // "close" = kapanış, "live" = bugün seçildi, kapanış henüz yok
    public string PriceKind { get; set; } = "close";

    public decimal? PriceInNative { get; set; }
    public decimal? PriceInUsd { get; set; }
    public decimal? PriceInTry { get; set; }
    public string NativeCurrency { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Yahoo istemcisine tarihli kapanış metodunu ekle**

`market-service/Services/YahooFinanceClient.cs` — dosyanın başındaki `YahooQuote` record'unun altına ekle:

```csharp
// Tarihli günlük kapanış. Bilerek Candle DEĞİL: Candle bugün yalnızca grafik
// zincirinde kullanılıyor (GetCandlesAsync → PriceHistoryService → PriceChart).
public record DailyClose(DateOnly Date, decimal Close);
```

`IYahooFinanceClient` arayüzüne ekle (mevcut üç metot aynen kalır):

```csharp
    // Belirli bir tarih penceresindeki günlük kapanışlar. GetCloseSeriesAsync'in
    // tarihli/pencereli kuzeni; range= bugüne göreli olduğu için eski tarihler
    // için period1/period2 kullanılır.
    Task<(List<DailyClose> Closes, string Currency)> GetDailyClosesAsync(
        string yahooSymbol, DateOnly from, DateOnly to);
```

Sınıfa uygulamayı ekle:

```csharp
    public async Task<(List<DailyClose> Closes, string Currency)> GetDailyClosesAsync(
        string yahooSymbol, DateOnly from, DateOnly to)
    {
        try
        {
            var p1 = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds();
            // +1 gün: period2 dışlayıcı davranabiliyor, hedef gün pencerede kalsın
            var p2 = new DateTimeOffset(to.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds();

            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(yahooSymbol)}"
                    + $"?interval=1d&period1={p1}&period2={p2}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Mozilla/5.0");

            var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var result = doc.RootElement.GetProperty("chart").GetProperty("result");
            if (result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                return ([], string.Empty);

            var root = result[0];
            var stamps = root.GetProperty("timestamp");
            var closes = root.GetProperty("indicators").GetProperty("quote")[0].GetProperty("close");
            var currency = root.GetProperty("meta").TryGetProperty("currency", out var c)
                ? c.GetString() ?? string.Empty : string.Empty;

            var list = new List<DailyClose>(stamps.GetArrayLength());
            for (var i = 0; i < stamps.GetArrayLength(); i++)
            {
                // Tatil/durdurma günlerinde close null gelir → atlanır
                if (closes[i].ValueKind != JsonValueKind.Number) continue;

                var date = DateOnly.FromDateTime(
                    DateTimeOffset.FromUnixTimeSeconds(stamps[i].GetInt64()).UtcDateTime);
                list.Add(new DailyClose(date, closes[i].GetDecimal()));
            }

            return (list, currency);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get Yahoo daily closes for {Symbol}", yahooSymbol);
            return ([], string.Empty);
        }
    }
```

- [ ] **Step 3: Frankfurter istemcisine tarihli kur serisini ekle**

`market-service/Services/IFrankfurterClient.cs` — mevcut iki metot aynen kalır, ekle:

```csharp
    // Tarih→kur eşlemesi. GetSeriesAsync tarihleri atıyor; tarih gerektiren
    // işler (tarihe göre fiyat, altın grafiği) bunu kullanır.
    Task<SortedDictionary<DateOnly, decimal>> GetRateSeriesAsync(
        string baseCurrency, DateOnly from, DateOnly to);
```

`market-service/Services/FrankfurterClient.cs` sınıfına ekle:

```csharp
    public async Task<SortedDictionary<DateOnly, decimal>> GetRateSeriesAsync(
        string baseCurrency, DateOnly from, DateOnly to)
    {
        var map = new SortedDictionary<DateOnly, decimal>();
        try
        {
            var url = $"https://api.frankfurter.dev/v1/{from:yyyy-MM-dd}..{to:yyyy-MM-dd}"
                    + $"?base={Uri.EscapeDataString(baseCurrency)}&symbols=TRY";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("rates", out var rates)) return map;

            foreach (var day in rates.EnumerateObject())
            {
                if (!DateOnly.TryParseExact(day.Name, "yyyy-MM-dd", out var d)) continue;
                if (day.Value.TryGetProperty("TRY", out var v) && v.ValueKind == JsonValueKind.Number)
                    map[d] = v.GetDecimal();
            }
            return map;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get rate series for {BaseCurrency}", baseCurrency);
            return map;
        }
    }
```

- [ ] **Step 4: Servisi oluştur (şimdilik yalnızca hisse yolu)**

`market-service/Services/PriceOnDateService.cs`:

```csharp
using market_service.Models;

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

    public PriceOnDateService(IYahooFinanceClient yahoo, IFrankfurterClient frankfurter,
        IBistCatalog bistCatalog)
    {
        _yahoo = yahoo;
        _frankfurter = frankfurter;
        _bistCatalog = bistCatalog;
    }

    public async Task<PriceOnDate> GetPriceOnAsync(string symbol, string assetType, DateOnly date)
    {
        var result = new PriceOnDate
        {
            Symbol = symbol,
            AssetType = assetType,
            RequestedDate = date,
            Available = false,
        };

        if (assetType.Equals("Stock", StringComparison.OrdinalIgnoreCase))
            await FillStockAsync(result, symbol, date);

        return result;
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
        else
        {
            r.PriceInUsd = hit.Close;
            r.PriceInTry = usdTry > 0 ? hit.Close * usdTry : null;
        }

        // TL karşılığı hesaplanamadıysa kısmi sonuç dönmeyiz (DESIGN.md §6.1)
        r.Available = r.PriceInTry != null;
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
```

- [ ] **Step 5: Uç noktayı ekle**

`market-service/Controllers/MarketController.cs` — sınıfa `IPriceOnDateService` enjekte et (mevcut dört servisin yanına) ve action'ı ekle:

```csharp
    // Tek günün fiyatı. date ham geçmez: katı yyyy-MM-dd parse edilir.
    // Veri yoksa 404 değil, Available=false döner — "veri yok" bir hata değil.
    [HttpGet("price-on/{symbol}")]
    public async Task<ActionResult<PriceOnDate>> PriceOn(string symbol,
        [FromQuery] string assetType = "Stock", [FromQuery] string? date = null)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest();

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var parsed))
            return BadRequest(new { error = "date must be yyyy-MM-dd" });

        if (parsed > DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { error = "date cannot be in the future" });

        if (!PriceOnDateService.IsValidAssetType(assetType))
            return BadRequest(new { error = "Unsupported assetType" });

        return Ok(await _priceOnDateService.GetPriceOnAsync(symbol.Trim(), assetType, parsed));
    }
```

`PriceOnDateService`'e beyaz liste yardımcısını ekle (`PriceHistoryService.IsValidRange` ile aynı refleks):

```csharp
    private static readonly HashSet<string> AssetTypes =
        new(StringComparer.OrdinalIgnoreCase) { "Stock", "Gold", "Currency" };

    public static bool IsValidAssetType(string assetType) => AssetTypes.Contains(assetType);
```

- [ ] **Step 6: DI kaydını ekle**

`market-service/Program.cs`, satır 33'ün altına:

```csharp
builder.Services.AddScoped<IPriceOnDateService, PriceOnDateService>();
```

- [ ] **Step 7: Doğrula — hisse, geçmiş iş günü**

```bash
docker compose up -d --build market-service
```

```bash
curl -s "http://localhost:5002/api/market/price-on/THYAO?assetType=Stock&date=2026-06-16" | python -m json.tool
```

Beklenen: `available: true`, `effectiveDate: "2026-06-16"`, `nativeCurrency: "TRY"`, `priceInTry` dolu, `priceInUsd` dolu, `priceKind: "close"`.

- [ ] **Step 8: Doğrula — hafta sonu önceki iş gününe düşüyor**

```bash
curl -s "http://localhost:5002/api/market/price-on/THYAO?assetType=Stock&date=2026-06-20" | python -m json.tool
```

Beklenen: `requestedDate: "2026-06-20"` (Cumartesi) ama `effectiveDate: "2026-06-19"` (Cuma).

---

## Task 2: Döviz ve altın yolları

**Files:**
- Modify: `market-service/Services/PriceOnDateService.cs`

**Interfaces:**
- Consumes: Task 1'den `IFrankfurterClient.GetRateSeriesAsync`, `IYahooFinanceClient.GetDailyClosesAsync`, `PickAtOrBefore`, `RateOnAsync`
- Produces: `GetPriceOnAsync` artık `Currency` ve `Gold` için de dolu sonuç döner

- [ ] **Step 1: Dallanmayı genişlet**

`GetPriceOnAsync` içindeki tek `if`i şununla değiştir:

```csharp
        if (assetType.Equals("Gold", StringComparison.OrdinalIgnoreCase))
            await FillGoldAsync(result, date);
        else if (assetType.Equals("Currency", StringComparison.OrdinalIgnoreCase))
            await FillCurrencyAsync(result, symbol, date);
        else
            await FillStockAsync(result, symbol, date);
```

- [ ] **Step 2: Döviz yolunu ekle**

```csharp
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
```

- [ ] **Step 3: Altın yolunu ekle**

```csharp
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
```

- [ ] **Step 4: Doğrula — döviz**

```bash
docker compose up -d --build market-service
```

```bash
curl -s "http://localhost:5002/api/market/price-on/USD?assetType=Currency&date=2026-06-16" | python -m json.tool
```

Beklenen: `available: true`, `effectiveDate: "2026-06-16"`, `priceInTry` ≈ `46.30`.

- [ ] **Step 5: Doğrula — altın, spec §3 ölçümüne karşı**

```bash
curl -s "http://localhost:5002/api/market/price-on/XAU?assetType=Gold&date=2026-06-16" | python -m json.tool
```

Beklenen: `priceInTry` ≈ **6446.89** (spec §3'te ölçülen değer; gerçek piyasa kapanışı 6438,53 idi). ±%1 dışına çıkıyorsa dur ve bildir — formül ya da kur eşleştirmesi bozuk demektir.

---

## Task 3: Bugün → anlık fiyat, ve cache

**Files:**
- Modify: `market-service/Services/PriceOnDateService.cs`

**Interfaces:**
- Consumes: `IMarketService.GetPriceAsync(string)` → `MarketPrice?`, `IDistributedCache`
- Produces: `PriceKind: "live"` davranışı; `priceon:*` cache anahtarları

- [ ] **Step 1: Bağımlılıkları ekle**

`PriceOnDateService` kurucusuna `IMarketService marketService` ve `IDistributedCache cache` ekle, alanlara ata. `using Microsoft.Extensions.Caching.Distributed;` ve `using System.Text.Json;` ekle.

- [ ] **Step 2: Bugün dalını ve cache'i `GetPriceOnAsync`'e sar**

Metodun gövdesini şununla değiştir:

```csharp
    public async Task<PriceOnDate> GetPriceOnAsync(string symbol, string assetType, DateOnly date)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
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
        var ttl = isToday ? TimeSpan.FromMinutes(5) : TimeSpan.FromDays(30);
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
        r.PriceInNative = price.PriceInTry;
        r.Available = true;
    }
```

- [ ] **Step 3: Doğrula — bugün**

```bash
docker compose up -d --build market-service
```

```bash
curl -s "http://localhost:5002/api/market/price-on/THYAO?assetType=Stock&date=$(date +%F)" | python -m json.tool
```

Beklenen: `priceKind: "live"`, `effectiveDate` bugün, `available: true`.

- [ ] **Step 4: Doğrula — validasyon ve veri yokluğu**

```bash
curl -s -o /dev/null -w "gelecek tarih -> %{http_code}\n" "http://localhost:5002/api/market/price-on/THYAO?assetType=Stock&date=2030-01-01"
curl -s -o /dev/null -w "bozuk tarih   -> %{http_code}\n" "http://localhost:5002/api/market/price-on/THYAO?assetType=Stock&date=16-06-2026"
curl -s -o /dev/null -w "bozuk tip     -> %{http_code}\n" "http://localhost:5002/api/market/price-on/THYAO?assetType=Crypto&date=2026-06-16"
curl -s -w "\nyok sembol -> %{http_code}\n" "http://localhost:5002/api/market/price-on/ZZZZZZ?assetType=Stock&date=2026-06-16"
```

Beklenen: ilk üçü `400`; sonuncusu `200` ve gövdede `"available": false`.

- [ ] **Step 5: Doğrula — cache**

```bash
docker compose exec redis redis-cli KEYS "priceon:*"
```

Beklenen: yukarıdaki çağrılara karşılık gelen anahtarlar listelenir.

---

## Task 4: Grafiğin altın hesabını düzelt

**Files:**
- Modify: `market-service/Services/PriceHistoryService.cs:82-98`

**Interfaces:**
- Consumes: Task 1'den `IFrankfurterClient.GetRateSeriesAsync`
- Produces: davranış değişikliği; imza değişmez

- [ ] **Step 1: Düzeltmeden önceki değeri kaydet**

```bash
curl -s "http://localhost:5002/api/market/history/XAU?assetType=Gold&range=1y" | python -c "
import sys, json, datetime
d = json.load(sys.stdin)['candles'][0]
print('EN ESKI MUM (duzeltme oncesi):', datetime.datetime.fromtimestamp(d['time'], datetime.UTC).date(), round(d['close'],2))
"
```

Bu sayıyı not et — Step 4'te karşılaştıracaksın.

- [ ] **Step 2: `GoldHistoryAsync`'i değiştir**

Mevcut gövdeyi (satır 82-98) şununla değiştir:

```csharp
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
```

- [ ] **Step 3: Eski cache'i temizle**

```bash
docker compose up -d --build market-service
docker compose exec redis redis-cli --scan --pattern "history:gold:*" | xargs -r docker compose exec -T redis redis-cli DEL
```

- [ ] **Step 4: Doğrula — eski mum artık kendi gününün kuruyla**

```bash
curl -s "http://localhost:5002/api/market/history/XAU?assetType=Gold&range=1y" | python -c "
import sys, json, datetime
d = json.load(sys.stdin)['candles'][0]
print('EN ESKI MUM (duzeltme sonrasi):', datetime.datetime.fromtimestamp(d['time'], datetime.UTC).date(), round(d['close'],2))
"
```

Beklenen: Step 1'de kaydettiğin değerden **belirgin biçimde düşük** (bir yıl önce USD/TRY daha düşüktü). Son mum ise neredeyse aynı kalmalı — bugüne yakın günlerde iki yöntem zaten örtüşür.

- [ ] **Step 5: Doğrula — grafik ve form aynı cevabı veriyor**

```bash
curl -s "http://localhost:5002/api/market/price-on/XAU?assetType=Gold&date=2026-06-16" | python -c "import sys,json; print('form:', round(json.load(sys.stdin)['priceInTry'],2))"
curl -s "http://localhost:5002/api/market/history/XAU?assetType=Gold&range=3mo" | python -c "
import sys, json, datetime
for c in json.load(sys.stdin)['candles']:
    if datetime.datetime.fromtimestamp(c['time'], datetime.UTC).date().isoformat() == '2026-06-16':
        print('grafik:', round(c['close'],2))
"
```

Beklenen: iki sayı birbirine **%1 içinde**. Çelişki kapandı.

---

## Task 5: portfolio-service geçişi

**Files:**
- Modify: `portfolio-service/Services/IMarketServiceClient.cs`
- Modify: `portfolio-service/Services/MarketServiceClient.cs`
- Modify: `portfolio-service/Controllers/MarketController.cs`

**Interfaces:**
- Consumes: market-service `GET /api/market/price-on/{symbol}`
- Produces: `PriceOnDateResponse`; `IMarketServiceClient.GetPriceOnAsync(string symbol, string assetType, string date)`; `GET /api/market/price-on/{symbol}` (5001)

- [ ] **Step 1: DTO ve imzayı ekle**

`portfolio-service/Services/IMarketServiceClient.cs` — arayüze ekle:

```csharp
    Task<PriceOnDateResponse> GetPriceOnAsync(string symbol, string assetType, string date);
```

Dosyanın sonuna DTO'yu ekle (market-service `PriceOnDate` ile **birebir** kalmalı; eksik alan sessizce düşer):

```csharp
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
```

- [ ] **Step 2: İstemci uygulamasını ekle**

`portfolio-service/Services/MarketServiceClient.cs` — mevcut metotların yanına (cookie forward **zorunlu**, yoksa market-service'in KratosMiddleware'i 401 döner):

```csharp
    public async Task<PriceOnDateResponse> GetPriceOnAsync(string symbol, string assetType, string date)
    {
        var url = $"/api/market/price-on/{Uri.EscapeDataString(symbol)}"
                + $"?assetType={Uri.EscapeDataString(assetType)}&date={Uri.EscapeDataString(date)}";
        var request = new HttpRequestMessage(HttpMethod.Get, url);

        var cookieHeader = httpContextAccessor.HttpContext?.Request.Headers["Cookie"].ToString();
        if (!string.IsNullOrEmpty(cookieHeader))
            request.Headers.Add("Cookie", cookieHeader);

        var response = await httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PriceOnDateResponse>();
        return result ?? new PriceOnDateResponse();
    }
```

- [ ] **Step 3: Passthrough action'ı ekle**

`portfolio-service/Controllers/MarketController.cs`:

```csharp
    // Tarihe göre fiyat — market-service'e geçirilir (nginx tüm /api/'yi buraya yönlendirir)
    [HttpGet("price-on/{symbol}")]
    public async Task<ActionResult<PriceOnDateResponse>> PriceOn(string symbol,
        [FromQuery] string assetType = "Stock", [FromQuery] string? date = null)
    {
        if (string.IsNullOrWhiteSpace(symbol) || string.IsNullOrWhiteSpace(date)) return BadRequest();
        return Ok(await marketServiceClient.GetPriceOnAsync(symbol.Trim(), assetType, date));
    }
```

- [ ] **Step 4: Doğrula — 5001 üzerinden**

```bash
docker compose up -d --build portfolio-service
```

```bash
curl -s "http://localhost:5001/api/market/price-on/THYAO?assetType=Stock&date=2026-06-16" | python -m json.tool
```

Beklenen: market-service'in (5002) verdiği gövdenin aynısı. Farklıysa DTO alan adları uyuşmuyordur.

---

## Task 6: Frontend altyapı

**Files:**
- Create: `web/src/lib/priceDeviation.js`
- Modify: `web/src/services/api.js:23-28`
- Modify: `web/src/hooks/queries.js`

**Interfaces:**
- Consumes: `GET /api/market/price-on/{symbol}` (5001)
- Produces: `deviationOf(entered, reference)` → `{ ratio, tier }`, `tier ∈ 'none'|'info'|'warn'|'confirm'`; `marketApi.priceOn(symbol, assetType, date)`; `usePriceOnDate(symbol, assetType, date)`

- [ ] **Step 1: Sapma fonksiyonunu oluştur**

`web/src/lib/priceDeviation.js`:

```javascript
// Girilen fiyatın o günün gerçek fiyatından sapması ve karşılık gelen kademe.
// Eşikler spec §3'teki ölçüme dayanıyor: formülün gerçek piyasaya göre gürültü
// tabanı ~%0,5. Sessizlik eşiği %5 = gürültünün 10 katı.
export const DEVIATION_WARN = 0.05
export const DEVIATION_CONFIRM = 0.20

// tier: 'none'    → referans yok, gösterilecek bir şey yok
//       'info'    → sapma önemsiz, nötr bilgi göster
//       'warn'    → görünür uyarı, kayıt serbest
//       'confirm' → sert uyarı, göndermeden önce onay iste
export function deviationOf(entered, reference) {
  const e = Number(entered)
  const r = Number(reference)
  if (!Number.isFinite(e) || !Number.isFinite(r) || r <= 0 || e <= 0)
    return { ratio: null, tier: 'none' }

  const ratio = Math.abs(e - r) / r
  const tier = ratio >= DEVIATION_CONFIRM ? 'confirm'
    : ratio >= DEVIATION_WARN ? 'warn'
    : 'info'

  return { ratio, tier }
}
```

- [ ] **Step 2: API metodunu ekle**

`web/src/services/api.js` — `marketApi` nesnesine ekle:

```javascript
  priceOn: (symbol, assetType, date) =>
    api.get(`/api/market/price-on/${encodeURIComponent(symbol)}`, { params: { assetType, date } }),
```

- [ ] **Step 3: Hook'u ekle**

`web/src/hooks/queries.js` — `usePriceHistory`'nin altına:

```javascript
// Tarihe göre fiyat — backend cache'li (geçmiş gün 30 gün, bugün 5 dk).
// Üçlü eksikse sorgu hiç çalışmaz.
export function usePriceOnDate(symbol, assetType, date) {
  return useQuery({
    queryKey: ['price-on-date', symbol, assetType, date],
    queryFn: () => marketApi.priceOn(symbol, assetType, date).then((r) => r.data),
    enabled: !!symbol && !!assetType && !!date,
    staleTime: 60 * 60_000,
    retry: false,
  })
}
```

- [ ] **Step 4: Doğrula — lint ve build**

```bash
cd web && npx eslint src 2>&1 | tail -3 && npm run build 2>&1 | grep -E "built in|rror"
```

Beklenen: hata sayısı **8'i geçmiyor** (baseline: `AddAsset.jsx` içindeki mevcut `set-state-in-effect` hataları) ve build başarılı.

---

## Task 7: AddAsset — form sırası ve otomatik doldurma

**Files:**
- Modify: `web/src/pages/AddAsset.jsx`
- Modify: `web/src/contexts/LanguageContext.jsx`

**Interfaces:**
- Consumes: Task 6'dan `usePriceOnDate`
- Produces: `priceSource` state (`'auto' | 'manual'`), otomatik dolan `unitPrice`

- [ ] **Step 1: Çeviri anahtarlarını ekle**

`web/src/contexts/LanguageContext.jsx` — TR ve EN sözlüklerine:

```javascript
// TR
'assets.priceFromClose': '{date} kapanışı',
'assets.priceFromLive': 'şu anki fiyat',
'assets.priceFellBack': '{requested} işlem günü değildi',
'assets.priceUnavailableOnDate': 'Bu tarih için fiyat verisi yok — fiyatı sen gir',
'assets.priceFetching': 'getiriliyor…',
'assets.useThatDayPrice': 'o günün fiyatına dön',

// EN
'assets.priceFromClose': '{date} close',
'assets.priceFromLive': 'current price',
'assets.priceFellBack': '{requested} was not a trading day',
'assets.priceUnavailableOnDate': 'No price data for this date — enter it yourself',
'assets.priceFetching': 'fetching…',
'assets.useThatDayPrice': 'use that day\'s price',
```

- [ ] **Step 2: Import ve state ekle**

`web/src/pages/AddAsset.jsx` — import satırlarına `usePriceOnDate`'i ekle (`useBuyAsset` ile aynı satırda), state'lere:

```javascript
  const [priceSource, setPriceSource] = useState('auto')

  const { data: reference, isFetching: refFetching } = usePriceOnDate(symbol, assetType, date)
```

- [ ] **Step 3: Otomatik doldurmayı ekle**

State tanımlarının altına:

```javascript
  // Tarih/sembol değişince fiyatı doldur — ama YALNIZCA kullanıcı elle
  // dokunmadıysa. Kullanıcının yazdığı veri kutsal; üstüne yazmıyoruz.
  useEffect(() => {
    if (priceSource !== 'auto') return
    if (!reference?.available) return

    const value = currency === 'USD' ? reference.priceInUsd : reference.priceInTry
    if (value != null) setUnitPrice(String(value.toFixed(2)))
  }, [reference, currency, priceSource])
```

- [ ] **Step 4: Fiyat alanını manuel moda geçir**

`MoneyInput id="unitPrice"` bileşeninin `onChange`'ini değiştir:

```javascript
                  onChange={(v) => { setUnitPrice(v); setPriceSource('manual') }}
```

- [ ] **Step 5: Tarih alanını fiyatın üstüne taşı**

`{/* Purchase date */}` bloğunu (satır ~270-280) kes ve `{/* Unit price + currency */}` bloğunun **üstüne** yapıştır. `DatePicker`'ın `onChange`'ini değiştir:

```javascript
                onChange={(v) => { setDate(v); if (priceSource === 'auto') setUnitPrice('') }}
```

- [ ] **Step 6: Alan altı notu ekle**

`{/* Unit price + currency */}` grid'inin hemen altına:

```jsx
            {/* Fiyatın nereden geldiği — kullanıcı hangi sayıya baktığını bilsin */}
            {refFetching ? (
              <p className="label text-muted-foreground">{t('assets.priceFetching')}</p>
            ) : reference && !reference.available ? (
              <p className="text-micro text-muted-foreground">{t('assets.priceUnavailableOnDate')}</p>
            ) : reference?.available && priceSource === 'auto' ? (
              <p className="label text-muted-foreground">
                {reference.priceKind === 'live'
                  ? t('assets.priceFromLive')
                  : t('assets.priceFromClose').replace('{date}', reference.effectiveDate)}
                {reference.priceKind === 'close' && reference.effectiveDate !== reference.requestedDate && (
                  <span className="ml-1 normal-case tracking-normal">
                    · {t('assets.priceFellBack').replace('{requested}', reference.requestedDate)}
                  </span>
                )}
              </p>
            ) : null}
```

- [ ] **Step 7: Doğrula — tarayıcıda**

```bash
docker compose up -d --build && cd web && npm run dev
```

Tarayıcıda `/assets/buy`:
1. Hisse seç (THYAO) → tarih alanı fiyattan **önce** görünmeli
2. Tarihi `2026-06-16` yap → fiyat otomatik dolmalı, altında `16.06.2026 KAPANIŞI` yazmalı
3. Tarihi `2026-06-20` (Cumartesi) yap → fiyat dolmalı, not iki tarihi de söylemeli
4. Tarihi bugün yap → not `şu anki fiyat` demeli
5. Fiyatı elle değiştir, sonra tarihi değiştir → **elle yazdığın kalmalı**

---

## Task 8: Sapma kademeleri ve onay modalı

**Files:**
- Modify: `web/src/pages/AddAsset.jsx`
- Modify: `web/src/contexts/LanguageContext.jsx`
- Modify: `web/DESIGN.md`

**Interfaces:**
- Consumes: Task 6'dan `deviationOf`; mevcut `Modal` bileşeni
- Produces: yok (uç nokta)

- [ ] **Step 1: Çeviri anahtarlarını ekle**

```javascript
// TR
'assets.deviationInfo': 'O gün {price} idi',
'assets.deviationWarn': 'O gün {price} idi — %{pct} farklı girdin',
'assets.confirmPriceTitle': 'Fiyatı doğrula',
'assets.confirmPriceBody': 'Girdiğin fiyat o günün fiyatından %{pct} farklı. Bu maliyet portföyünde kalıcı olarak kullanılacak.',
'assets.confirmPriceKeep': 'Girdiğim fiyatı kullan',

// EN
'assets.deviationInfo': 'That day it was {price}',
'assets.deviationWarn': 'That day it was {price} — you entered {pct}% off',
'assets.confirmPriceTitle': 'Confirm the price',
'assets.confirmPriceBody': 'Your price is {pct}% away from that day\'s price. This cost stays in your portfolio permanently.',
'assets.confirmPriceKeep': 'Use my price',
```

- [ ] **Step 2: Import ve türetilmiş değerleri ekle**

```javascript
import { Modal } from '@/components/ui/modal'
import { deviationOf } from '@/lib/priceDeviation'
import { AlertTriangle } from 'lucide-react'
```

State ve türetme:

```javascript
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refPrice = reference?.available
    ? (currency === 'USD' ? reference.priceInUsd : reference.priceInTry)
    : null
  const { ratio, tier } = priceSource === 'manual'
    ? deviationOf(unitPrice, refPrice)
    : { ratio: null, tier: 'none' }
  const pct = ratio != null ? (ratio * 100).toFixed(0) : '0'
```

- [ ] **Step 3: Sapma göstergesini ekle**

Task 7'de eklenen notun `) : null}` satırından **önce**, yeni bir dal olarak:

```jsx
            ) : priceSource === 'manual' && refPrice != null ? (
              <p className={
                tier === 'confirm' ? 'flex items-center gap-1.5 text-micro text-margin'
                : tier === 'warn' ? 'flex items-center gap-1.5 text-micro text-brass'
                : 'text-micro text-muted-foreground'
              }>
                {tier !== 'info' && <AlertTriangle className="h-3 w-3 shrink-0" />}
                {tier === 'info'
                  ? t('assets.deviationInfo').replace('{price}', refPrice.toFixed(2))
                  : t('assets.deviationWarn').replace('{price}', refPrice.toFixed(2)).replace('{pct}', pct)}
                <button type="button" onClick={() => { setPriceSource('auto'); setUnitPrice('') }}
                  className="ml-1 underline hover:no-underline">
                  {t('assets.useThatDayPrice')}
                </button>
              </p>
```

- [ ] **Step 4: Gönderimi onaya bağla**

Mevcut `handleSubmit` fonksiyonunun en başına ekle:

```javascript
    if (tier === 'confirm' && !confirmOpen) { setConfirmOpen(true); return }
    setConfirmOpen(false)
```

`handleSubmit`'in tanımını, `e` olmadan da çağrılabilir hale getir: `const handleSubmit = async (e) => { e?.preventDefault()` şeklinde.

- [ ] **Step 5: Onay modalını ekle**

`</Page>` kapanışından hemen önce:

```jsx
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('assets.confirmPriceTitle')}
        subtitle={symbol}
        actions={
          <>
            <button onClick={() => setConfirmOpen(false)}
              className="w-1/2 border border-foreground py-2.5 font-mono text-micro font-bold uppercase text-foreground hover:bg-secondary">
              {t('common.cancel')}
            </button>
            <button onClick={() => handleSubmit()}
              className="w-1/2 border border-margin bg-margin py-2.5 font-mono text-micro font-bold uppercase text-white hover:opacity-90">
              {t('assets.confirmPriceKeep')}
            </button>
          </>
        }
      >
        <p className="text-center font-mono text-micro text-muted-foreground">
          {t('assets.confirmPriceBody').replace('{pct}', pct)}
        </p>
      </Modal>
```

- [ ] **Step 6: DESIGN.md'ye uyarı rengi kuralını ekle**

`## 2. Renk (token'lar)` bölümündeki tablonun altına:

```markdown
**Uyarı rengi:** `brass` = yumuşak uyarı (dikkat çeker, engellemez), `margin` = sert uyarı (onay ister). `up`/`down` yalnızca kâr/zarar, kategori renkleri yalnızca kategori olduğu için uyarı bu ikisine düşer.
```

Ve `## 8. YAPMA listesi`'ne:

```markdown
- ❌ Uyarı için `up`/`down` ya da kategori rengi — uyarı `brass` (yumuşak) / `margin` (sert).
```

- [ ] **Step 7: Doğrula — kademeler**

Tarayıcıda `/assets/buy`, THYAO, tarih `2026-06-16`:

| Girilen fiyat | Beklenen |
|---|---|
| otomatik gelen değer | nötr not, uyarı yok |
| %3 fazlası | `muted` renkte "O gün … idi" |
| %8 fazlası | **brass** renk + üçgen ikon |
| %30 fazlası | **margin** kırmızı + ikon; "Al"a basınca **onay modalı** |
| onayda "Girdiğim fiyatı kullan" | kayıt tamamlanır |
| "o günün fiyatına dön" | fiyat otomatiğe döner, uyarı kaybolur |

- [ ] **Step 8: Doğrula — lint ve build**

```bash
cd web && npx eslint src 2>&1 | tail -3 && npm run build 2>&1 | grep -E "built in|rror"
```

Beklenen: build başarılı. Lint hata sayısı baseline 8'den fazlaysa, **yalnızca** Task 7 Step 3'teki `useEffect` kaynaklı `react-hooks/set-state-in-effect` olabilir — bu dosyada zaten var olan desenle aynı, kabul edilir. Başka türde yeni hata çıkarsa dur ve düzelt.

---

## Task 9: Uçtan uca doğrulama ve dokümantasyon

**Files:**
- Modify: `web/DATA-FETCHING.md`
- Modify: `docs/superpowers/specs/2026-08-23-price-on-date-design.md` (§11 işaretleme)

**Interfaces:**
- Consumes: tüm önceki görevler
- Produces: yok

- [ ] **Step 1: Spec §11'deki 9 maddeyi sırayla çalıştır**

Spec'in "Doğrulama (manuel)" bölümündeki listeyi baştan sona uygula. Herhangi biri geçmezse dur ve bildir — sonraki adıma geçme.

- [ ] **Step 2: Sağlayıcı kesintisi senaryosunu doğrula**

```bash
docker compose stop market-service
```

Tarayıcıda `/assets/buy` → fiyat otomatik gelmemeli, form manuel çalışmalı, **kayıt yine tamamlanmalı**. Sonra:

```bash
docker compose start market-service
```

- [ ] **Step 3: DATA-FETCHING.md'yi güncelle**

Yeni sorguyu belgele: `usePriceOnDate` anahtarı `['price-on-date', symbol, assetType, date]`, `staleTime` 1 saat, `retry: false` (fiyat gelmezse sessizce manuele düşmek yeniden denemekten iyi), backend cache geçmiş gün 30 gün / bugün 5 dk.

- [ ] **Step 4: Tek commit**

```bash
git add -A
git status
```

Çıktıyı gözden geçir — beklenmeyen dosya varsa dur. Sonra:

```bash
git commit -m "feat: alim formunda tarihe gore fiyat ve sapma uyarisi

- market-service: PriceOnDateService + GET /api/market/price-on
- Yahoo tarihli kapanis (period1/period2), Frankfurter tarihli kur serisi
- altin grafigi artik her mumu kendi gununun kuruyla ceviriyor (onceden
  bugunun kuru kullaniliyordu, tek gun icin %60'a varan sapma)
- portfolio-service passthrough
- AddAsset: tarih fiyattan once, otomatik doldurma, %5/%20 sapma kademeleri"
```

---

## Self-Review

**Spec kapsamı:** §2 kararların tamamı → Task 1-8. §3 doğrulama → Task 2 Step 5 fixture olarak. §4 backend → Task 1-3. §5 grafik düzeltmesi → Task 4. §6 proxy → Task 5. §7 frontend → Task 6-8. §8 çeviriler → Task 7 Step 1, Task 8 Step 1. §10 test borcu → planda uygulanmıyor (bilinçli). §11 doğrulama → Task 9 Step 1.

**Tip tutarlılığı:** `PriceOnDate` alan adları Task 1 (C#) ile Task 5 (DTO) ve Task 7-8 (camelCase JSON) arasında eşleşiyor. `deviationOf` → `{ratio, tier}` Task 6'da tanımlı, Task 8'de aynı adlarla kullanılıyor. `GetRateSeriesAsync` Task 1'de tanımlı, Task 2 ve Task 4'te kullanılıyor. `DailyClose` Task 1'de tanımlı, Task 2'de `PickAtOrBefore` üzerinden kullanılıyor.

**Bilinen kabul:** Task 7 Step 3'teki `useEffect` içinde `setUnitPrice` var — bu, dosyada zaten mevcut olan `react-hooks/set-state-in-effect` lint hatalarının sayısını artırabilir. Doğrulama adımları bu yüzden "8'i geçmiyor" yerine hata sayısını gözlemlemeyi ister; artarsa bu bilinçli bir kabuldür, mevcut desenle aynı.
