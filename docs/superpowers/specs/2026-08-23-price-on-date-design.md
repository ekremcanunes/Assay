# Tarihe Göre Fiyat (`PriceOnDate`) — Spec

Varlık eklerken kullanıcı tarih seçtiğinde **o günün fiyatı** otomatik gelsin; elle girilen fiyat gerçek veriden saparsa kullanıcı uyarılsın. Yeni harici sağlayıcı gerekmez — mevcut Yahoo + Frankfurter altyapısı kullanılır.

## 1. Amaç

Bugün alım formunda fiyat tamamen elle giriliyor. Kullanıcı yanlış bir sayı yazarsa portföydeki maliyet **kalıcı olarak** yanlış olur ve kâr/zarar sonsuza kadar hatalı hesaplanır. Bu iş iki şey getirir:

1. Tarih seçilince fiyatın otomatik dolması (doğru olanın kolay yol olması)
2. Elle girilen fiyat gerçekten saparsa kademeli uyarı

Bunun için sistemde bugün cevabı olmayan bir soru cevaplanacak: *"X sembolü Y tarihinde kaçtı?"*

| Var olan | Cevapladığı soru |
|---|---|
| `MarketService` | "Şu an kaç?" |
| `PriceHistoryService` | "Son 1 ayın eğrisi nasıl?" (grafik) |
| **`PriceOnDateService`** (yeni) | **"14 Mart'ta kaçtı?"** |

## 2. Kararlar (onaylı)

- **Otomatik doldurma:** tarih değişince fiyat çekilir ve alana yazılır. Ayrı mod/toggle yok.
- **Üstüne yazma yok:** kullanıcı fiyata elle dokunduysa tarih değişse bile yazdığı korunur; yalnızca referans gösterilir. Yanında "o günün fiyatına dön" bağlantısı durur.
- **Form sırası:** tarih alanı fiyattan **öne** alınır — kullanıcı doğru yola itilir, manuel giriş bilinçli bir eylem olur.
- **İşlemsiz gün:** en yakın **önceki** işlem gününe düşülür ve hangi tarih olduğu kullanıcıya söylenir. İleri tarihe bakılmaz.
- **Günün hangi fiyatı:** **kapanış**. Bu bilgi kullanıcıya gösterilir.
- **Bugün seçilirse:** kapanış henüz oluşmadığı için mevcut `IMarketService.GetPriceAsync` anlık fiyatı kullanılır, etiket "şu anki fiyat" olur.
- **Sapma kontrolü frontend'de.** Backend sapma hesaplamaz, kaydı engellemez.
- **Sapma kademeleri:** `<%5` sessiz · `%5–20` uyarı · `≥%20` uyarı + onay modalı.
- **Ayrı servis, `PriceOnDateService`.** `PriceHistoryService`'e eklenmedi: o sınıf grafik için tasarlanmış ve bilinçli olarak farklı bir doğruluk kuralı uyguluyor (bkz. §5). Aynı sınıfta iki doğruluk kuralı tutmak karıştırır. İsim `PriceHistory` ile çakışmayacak şekilde seçildi — biri **seri**, diğeri **tek gün**.
- **Frontend yalnızca portfolio-service ile konuşur.** Yeni uç nokta da mevcut `history/{symbol}` proxy deseninden geçer.
- **Grafiğin altın hesabı da düzeltilir** (§5) — bu işin yan etkisi olarak doğan çelişki aynı işte kapatılır.

## 3. Doğrulama — formül gerçekle karşılaştırıldı

Altın çevrimi tasarıma gömülmeden önce iki tarihte gerçek piyasa verisiyle ölçüldü:

```
gram TL = (GC=F kapanış USD/ons @ o gün) ÷ 31,1034768 × (USD/TRY @ o gün)
```

| Tarih | Girdiler | Hesap | Gerçek | Fark |
|---|---|---|---|---|
| 16.06.2026 | 4330,9 USD/ons · 46,30 | 6.446,89 ₺ | 6.438,53 ₺ | **%-0,13** |
| 21.08.2026 | 4624,1 USD/ons · 48,066 | 7.145,89 ₺ | 7.107,39 ₺ | **%-0,54** |

Kaynaklar: paraborsa.net / BloombergHT (16.06), altin.doviz.com (21.08), Frankfurter API, Yahoo `GC=F`.

Kalan ~%0,5 fark İstanbul piyasasının uluslararası pariteye göre kendi primi — bizim hatamız değil.

**Bu ölçümün iki sonucu var:**
- Formül güvenilir, tahmin değil doğrulanmış.
- Gürültü tabanı ~%0,5 olduğuna göre **%5'lik sessizlik eşiği** doğru seçilmiş (10 katı).

## 4. Backend — market-service

### Model `Models/PriceOnDate.cs`

`MarketPrice`'ın para birimi üçlüsünü taşır, çünkü formdaki fiyat TRY ya da USD olabiliyor.

```csharp
public class PriceOnDate
{
    public string Symbol { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public DateOnly RequestedDate { get; set; }
    public DateOnly? EffectiveDate { get; set; }      // gerçekte kullanılan işlem günü
    public bool Available { get; set; }
    public string PriceKind { get; set; } = "close";  // "close" | "live"
    public decimal? PriceInNative { get; set; }
    public decimal? PriceInUsd { get; set; }
    public decimal? PriceInTry { get; set; }
    public string NativeCurrency { get; set; } = string.Empty;
}
```

`RequestedDate` ve `EffectiveDate` ayrı tutulur — *"14 Mart istedin, 13 Mart kapanışı kullanıldı"* mesajı bu ikisinden kurulur, ek bayrak gerekmez.

### Servis `IPriceOnDateService` / `PriceOnDateService`

`GetPriceOnAsync(string symbol, string assetType, DateOnly date)`

Ortak ilke: **veriden türet, takvim tutma.** BIST tatil takvimi tutulmaz; "tarihi ≤ istenen tarih olan son kayıt" kuralı tatili verinin kendisinden çıkarır.

**Hisse**
1. `IBistCatalog.IsBistAsync(symbol)` → BIST ise `{symbol}.IS`
2. `GetDailyClosesAsync(sym, date-14, date)` — 14 gün pencere; Kurban Bayramı + bitişik hafta sonu BIST'i 9 takvim gününe kadar kapatabildiği için en kötü durumda bile en az bir işlem günü içerir
3. Tarihi ≤ istenen tarih olan **son kapanış** → `PriceInNative`, o kaydın tarihi → `EffectiveDate`
4. `NativeCurrency` Yahoo meta'sından (BIST → TRY, ABD → USD)
5. Çevrim **o günün kuruyla**: native TRY ise `PriceInUsd = close / usdTry`, native USD ise `PriceInTry = close × usdTry`

**Döviz**
`GetRateSeriesAsync(symbol, date-14, date)` → tarihi ≤ hedef olan son kur. `PriceInTry = kur`, `NativeCurrency = "TRY"`.

**Altın**
`GC=F` kapanışı (hisse ile aynı pencere mantığı) × o günün USD/TRY'si ÷ 31,1034768. İki tarih çakışırsa **altın kaydının tarihi** esas alınır, kur o tarih için istenir.

Alan karşılıkları: `NativeCurrency = "TRY"`, `PriceInTry = PriceInNative = gram TL`, `PriceInUsd = gram USD` (ons ÷ 31,1034768). Form altında para birimi seçimi kapalı olduğu için native = TRY kabul edilir.

**Ortak**
- **Bugün seçilirse** → `IMarketService.GetPriceAsync(symbol)`'a delege. `PriceKind = "live"`, `EffectiveDate = bugün`. Yeni kod yazılmaz.
- **Herhangi bir adım null dönerse** → `Available = false`. Kısmi ya da tahmini sayı **dönülmez** (DESIGN.md §6.1: elimizde olmayan veriyi uydurma).
- **Sağlayıcı patlarsa** → istemciler zaten exception yutup null/boş dönüyor; servis bunu `Available = false`'a çevirir. 500 dönmez.

### Uç nokta

```
GET /api/market/price-on/{symbol}?assetType=Stock&date=2026-03-14
```

- `date` katı `yyyy-MM-dd` parse → olmazsa `400`. Ham kullanıcı girdisi sağlayıcıya geçmez (mevcut `range` beyaz listesiyle aynı refleks).
- Gelecek tarih → `400`. `assetType` beyaz liste (`Stock` / `Gold` / `Currency`) dışı → `400`.
- **Veri yoksa `404` değil, `200 + Available=false`.** Sembolün o tarihte işlem görmemesi hata değil normal sonuçtur; frontend'in "veri yok" ile "istek bozuk"u ayırması gerekir.

### Cache

Anahtar `priceon:{assetType}:{symbol}:{date}`.

| Durum | TTL | Gerekçe |
|---|---|---|
| Geçmiş gün | **30 gün** | Kapanmış bir günün kapanışı bir daha değişmez |
| Bugün (`live`) | **5 dk** | Mevcut `MarketService` TTL'iyle aynı ruh |

### Yeni istemci metotları

Mevcut metotlara **dokunulmaz**; ikisi de yalın kardeş olarak eklenir.

```csharp
// YahooFinanceClient — GetCloseSeriesAsync'in tarihli/pencereli kuzeni
public record DailyClose(DateOnly Date, decimal Close);
Task<(List<DailyClose> Closes, string Currency)>
    GetDailyClosesAsync(string yahooSymbol, DateOnly from, DateOnly to);

// FrankfurterClient — GetSeriesAsync tarihleri atıyor; bu koruyor
Task<SortedDictionary<DateOnly, decimal>>
    GetRateSeriesAsync(string baseCurrency, DateOnly from, DateOnly to);
```

`GetDailyClosesAsync` bilerek `Candle` döndürmez. `Candle` bugün yalnızca grafik zincirinde kullanılıyor (`GetCandlesAsync` → `PriceHistoryService` → `PriceChart.jsx`); fiilen grafiğin tipi olmuş. Yeni özelliği ona bağlamak gereksiz kuplaj olurdu, üstelik OHLCV'den yalnızca `Close` okunuyor.

Yahoo çağrısı `period1`/`period2` kullanır — mevcut `range=` bugüne göreli olduğu için 3 yıl öncesi tek bir sayı uğruna `5y` indirmeyi gerektirirdi.

## 5. Grafiğin altın hesabının düzeltilmesi

`PriceHistoryService.GoldHistoryAsync` bugün **tüm mumları bugünün USD/TRY'siyle** çarpıyor ([PriceHistoryService.cs:85](../../../market-service/Services/PriceHistoryService.cs)). Grafik için bilinçli bir kısayoldu — eğrinin *şekli* doğru çıkıyor.

Ama `PriceOnDateService` altını doğru hesaplayınca aynı kavramın iki cevabı olur:

| | 2023 ortası gram altın |
|---|---|
| Grafik (bugünün kuru) | ~2.690 ₺ |
| Alım formu (o günün kuru) | ~1.650 ₺ |

Kullanıcı grafikte bir sayı görür, aynı tarihe alım girer, form başka sayı der. **Uygulama kendiyle çelişir** — üstelik "yanlış fiyat girdin" diye uyardığımız ekranda.

**Düzeltme:** tek `factor` yerine `GetRateSeriesAsync` ile tarih→kur eşlemesi; her mum kendi gününün kuruyla çevrilir. Kur bulunamayan günde kural aynı: tarihi ≤ mum tarihi olan son kur.

Sağlayıcı çağrı **sayısı artmaz** — eskiden de iki çağrı vardı (mumlar + tek kur), şimdi de iki (mumlar + kur serisi). Düzeltme ağ maliyeti açısından bedava.

## 6. portfolio-service proxy

Mevcut `history/{symbol}` deseninin aynısı, yeni bir şey yok:

- `IMarketServiceClient.GetPriceOnAsync(symbol, assetType, date)` + `PriceOnDateResponse` DTO
- `MarketController`'a `GET /api/market/price-on/{symbol}` action
- **Cookie header forward zorunlu** — market-service'in de kendi `KratosMiddleware`'i var, taşınmazsa 401 döner

## 7. Frontend

### Akış (`pages/AddAsset.jsx`)

- Form sırası: **tarih → fiyat**
- `symbol + assetType + date` hazır olunca `usePriceOnDate` (yeni, `hooks/queries.js`)
- Sonuç gelince: fiyata **hiç dokunulmadıysa** doldur (`auto`); dokunulduysa yalnızca referansı göster
- Kullanıcı fiyata yazarsa → `manual`; yanında "o günün fiyatına dön" bağlantısı

### Alan altı not

| Durum | Not |
|---|---|
| `auto` · close | `13 MART KAPANIŞI · ₺284,10` + *"14 Mart hafta sonuydu"* |
| `auto` · live | `ŞU ANKİ FİYAT · ₺284,10` |
| `Available=false` | *"Bu tarih için fiyat verisi yok — fiyatı sen gir"* |
| `manual` | sapma göstergesi ↓ |

### Sapma kademeleri

`d = |girilen − referans| / referans` — saf fonksiyon olarak `lib/priceDeviation.js`'te.

| d | Davranış | Renk |
|---|---|---|
| `< %5` | Nötr bilgi, uyarı değil | `muted-foreground` |
| `%5 – %20` | Görünür uyarı: *"O gün ₺284,10 idi — %8 farklı girdin"* | `brass` |
| `≥ %20` | Sert uyarı + gönderirken onay modalı (mevcut `Modal`) | `margin` |

**Renk gerekçesi:** DESIGN.md'ye göre `up`/`down` yalnızca kâr/zarar, kategori renkleri yalnızca kategori. Uyarı bunların hiçbiri değil; `brass` ve `margin` boşta ve `margin` zaten "dikkat" semantiğine yakın. DESIGN.md'ye eklenecek satır: **uyarı = brass (yumuşak) / margin (sert)**.

### Kenar durumlar

- **Yükleniyor:** alan disabled olmaz, placeholder *"getiriliyor…"*. Kullanıcı beklerken yazmaya başlarsa `manual`'a geçer ve gelen sonuç yazdığını **ezmez**.
- **İstek patlarsa:** sessizce manuel + küçük not. Kayıt akışı hiçbir durumda engellenmez.

## 8. Çeviriler

`LanguageContext` içine TR/EN: kapanış etiketi, anlık fiyat etiketi, işlemsiz gün açıklaması, veri yok, sapma uyarısı, onay modalı başlık/gövde, "o günün fiyatına dön".

## 9. Kapsam dışı (YAGNI)

- Backend'de sapma doğrulaması veya kaydı engelleme
- Sapma bilgisinin veritabanına yazılması
- Gün içi (saatlik) fiyat seçimi — yalnızca günlük kapanış
- Geçmişteki alımların toplu yeniden hesaplanması
- BIST resmi tatil takvimi tablosu — veriden türetiliyor
- Mevcut `GetSeriesAsync` / `GetCandlesAsync` / `GetCloseSeriesAsync` metotlarının değiştirilmesi

## 10. Bilinçli ertelenen borç — test

Projede **hiç test altyapısı yok** (ne .NET test projesi ne vitest). Bu iş testsiz gidiyor; bu bir atlama değil, kayıtlı bir karar.

Sonraki iş olarak yapılacak:

- **(b)** market-service'e xUnit projesi + `PriceOnDateService` birim testleri. Hazır fixture: §3'teki 16.06.2026 ölçümü (4330,9 · 46,30 → 6.446,89). Kapsanacak: hafta sonu → önceki gün, veri yok → `Available=false`, altın çevrimi, bugün → `live`.
- **(c)** frontend vitest + `lib/priceDeviation.js` kademe testleri.

## 11. Doğrulama (manuel)

Test altyapısı gelene kadar kabul kriterleri elle kontrol edilir:

1. Geçmiş bir iş günü seç → fiyat dolar, not "… kapanışı" der
2. Hafta sonu seç → önceki cuma fiyatı gelir, not iki tarihi de söyler
3. Bugünü seç → anlık fiyat gelir, not "şu anki fiyat" der
4. Fiyatı elle değiştir → üstüne yazılmaz, sapma notu çıkar
5. %6 sapma gir → `brass` uyarı, kayıt serbest
6. %30 sapma gir → `margin` uyarı + onay modalı
7. Altın, geçmiş bir tarih → §3'teki gibi gerçek piyasa değeriyle ~%0,5 içinde
8. Altın grafiği, 1y aralık → eski tarihlerdeki gram değeri artık o günün kuruyla; §3 ölçümüyle tutarlı
9. Sağlayıcıyı kes (market-service'i durdur) → form manuel moda düşer, kayıt yine çalışır
