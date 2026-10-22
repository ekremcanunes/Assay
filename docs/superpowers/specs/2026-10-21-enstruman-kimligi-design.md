# Enstrüman Kimliği — Spec

*Tarih: 2026-10-21 · Güncelleme: 2026-10-22 · Dal: `test`*

**Fazlar:**
- **Faz 1 — Kimlik `(Market, Symbol)`:** (1) Yahoo çeviri fonksiyonu, (2) fiyat endpoint'lerine market, (3) arama sonuçlarına market, (4) `Asset.Market` + migration, (5) mevcut kayıtların elle doldurulması, (6) web'de market taşınması, (7) tek fiyat kaynağı ve tek tazelik süresi (§4.11).
- **Faz 2 — Enstrüman listesi veritabanında:** §4.3, §4.4, §4.5.
- **Faz 3 — Alımda sunucu kilidi:** §4.6.

## 1. Sorun

Sistem bir hisseyi yalnızca sembolüyle (`AAPL`, `THYAO`) tanıyor. Kullanıcı aramada borsayı görüyor ama seçim anında borsa atılıyor. Fiyatlama da "bu sembol BIST listesinde mi?" diye **tahmin** yürütüyor. Gerçek API cevaplarıyla doğrulanmış sonuçlar:

| Durum | Ne oluyor |
|---|---|
| "apple" aranır, Xetra'daki `APC` seçilir | Yahoo'ya düz `APC` gider → **ARKO Petroleum** fiyatı gelir, uyarı çıkmaz |
| `LINK` hem BIST'te hem NASDAQ'ta var | Arama sembole göre tekilleştirdiği için NASDAQ'taki hiç görünmez |
| `BRK.B` seçilir | Yahoo bu yazımı tanımaz (doğrusu `BRK-B`) → varlık fiyatsız kalır |
| Twelve Data cevap vermez | BIST listesi boş döner → THYAO `.IS` eki olmadan sorulur |

Bilginin kaybolduğu ya da tahmin edildiği satırlar:

- [AddAsset.jsx:123](../../../web/src/pages/AddAsset.jsx#L123) — seçilen sonucun yalnızca sembolü saklanıyor
- [AssetService.cs:31](../../../portfolio-service/Services/AssetService.cs#L31) — varlık borsasız kaydediliyor
- [MarketService.cs:117-118](../../../market-service/Services/MarketService.cs#L117-L118), [PriceHistoryService.cs:74-75](../../../market-service/Services/PriceHistoryService.cs#L74-L75), [PriceOnDateService.cs:104-105](../../../market-service/Services/PriceOnDateService.cs#L104-L105) — `IsBist ? ".IS" : ""` tahmini (aynı kod üç yerde)
- [SymbolSearchService.cs:47-52](../../../market-service/Services/SymbolSearchService.cs#L47-L52) — sonuçlar yalnızca sembole göre tekilleştiriliyor
- [BistCatalog.cs:34-40](../../../market-service/Services/BistCatalog.cs#L34-L40) — hata durumunda boş liste dönüyor

## 2. Hedef

1. Kullanıcının seçtiği enstrüman ile fiyatı gösterilen enstrüman her zaman aynı olur.
2. Desteklenmeyen hiçbir şey portföye giremez. Kontrol sunucuda yapılır, frontend atlatılsa bile çalışır.
3. Twelve Data ya da Redis kesintisi yanlış fiyata yol açmaz. En kötü ihtimalle işlem reddedilir.

**Başarı ölçütleri:**
- "apple" aramasında yalnızca ABD'deki Apple çıkar; Xetra, Meksika ve diğer borsalardaki kotasyonlar çıkmaz.
- "link" aramasında iki sonuç çıkar: `LINK · BIST` ve `LINK · US`. İkisi de alınabilir ve ayrı fiyatlanır.
- `BRK.B` alındığında Berkshire'ın fiyatı gelir.
- API'ye doğrudan `{symbol: "AAC.WT"}` gönderilirse 400 döner ve kayıt oluşmaz.
- Twelve Data kapalıyken arama ve alım dünkü listeyle çalışmaya devam eder.
- Geçişten sonra mevcut hiçbir varlığın fiyatı değişmez.

## 3. Kapsam

| Var | Yok |
|---|---|
| BIST ve ABD (NASDAQ + NYSE) hisseleri ve ABD ETF'leri | Avrupa, Asya ve diğer borsalar |
| Enstrüman listesinin market-service veritabanında tutulması | Fiyat geçmişini veritabanında tutmak (Yahoo + Redis olduğu gibi kalır) |
| Alımda sunucu tarafı doğrulama | İmtiyazlı hisse, varant, unit gibi enstrümanlar |
| Varlıklara `Market` alanı ve mevcut kayıtların doldurulması | BIST 30 bileşen listesinin otomatikleştirilmesi (kodda elle kalır) |
| Redis anahtarlarına piyasa eklenmesi | İşlemler (Transaction) tablosunda değişiklik |

## 4. Tasarım

### 4.1 Kim ne iş yapar

| Kaynak | Görevi | Değişiklik |
|---|---|---|
| **Twelve Data** | Günde bir kez enstrüman listesini sağlar | Kullanıcı isteği sırasında **artık hiç çağrılmaz**. Global arama (`symbol_search`) kaldırılır. |
| **Yahoo** | Fiyat: anlık, grafik, tarihli kapanış, endeks, altın | Yok |
| **Frankfurter** | Döviz kurları | Yok |

### 4.2 Kimlik = (Market, Symbol)

`Market` iki değer alır: **`BIST`** ve **`US`**.

ABD için NASDAQ/NYSE ayrımı yerine tek bir `US` değeri kullanılır, çünkü:
- Yahoo da bu iki borsayı ayırmıyor; ikisinde de sembol eksiz yazılıyor.
- ABD'de bir sembol aynı anda yalnızca tek bir borsada kullanılabiliyor. Twelve Data'nın iki listesinde ortak 9 sembol var ve hepsi aynı ETF'in iki kaydı.
- Bir şirket NYSE'den NASDAQ'a geçtiğinde portföy kaydı bozulmaz.

Gerçek borsa (NASDAQ/NYSE) yine saklanır, ama yalnızca ekranda göstermek için.

**Yahoo çevirisi** tek bir fonksiyonda yapılır. Bu fonksiyon dışında `.IS` eklenmez.

| Market | Sembol | Yahoo'ya giden |
|---|---|---|
| BIST | `THYAO` | `THYAO.IS` |
| US | `AAPL` | `AAPL` |
| US | `BRK.B` | `BRK-B` (nokta → tire) |
| Başka bir değer | — | Hata. Tahmin yapılmaz. |

**Kabul edilen sembol biçimleri:**
- BIST: harf ve rakam
- US: harf ve rakam, veya harfler + nokta + tek harf (`BRK.B`)

Bu biçimlere uymayan semboller (ör. `BAC.PR.S`, `AAC.WT`, `AAC.UN`) listeye hiç alınmaz.

### 4.3 Enstrüman tablosu (market-service)

market-service ilk kez bir veritabanına bağlanır: mevcut Neon projesinde, portfolio'nunkinden **ayrı bir veritabanı**.

| Kolon | Örnek | Not |
|---|---|---|
| `market` | `US` | Birincil anahtar (market + symbol) |
| `symbol` | `AAPL` | Birincil anahtar |
| `exchange` | `NASDAQ` | Yalnızca gösterim için |
| `name` | `Apple Inc.` | |
| `currency` | `USD` | |
| `type` | `stock` / `etf` | |
| `is_active` | `true` | Listeden düşünce `false` olur; satır silinmez |
| `updated_at` | | |

Boyut: yaklaşık 17.000 satır, indekslerle birlikte birkaç MB. Neon için önemsiz.

### 4.4 Günlük senkron

Bir `BackgroundService` servis açılışında ve her gün 06:00'da (Türkiye saati) çalışır. Twelve Data'ya 5 istek atar:
- `/stocks?exchange=BIST`
- `/stocks?exchange=NASDAQ` ve `/stocks?exchange=NYSE`
- `/etfs?exchange=NASDAQ` ve `/etfs?exchange=NYSE`

Kurallar:
1. Biçim filtresinden (§4.2) geçmeyen semboller atılır.
2. Bir istek hata verir ya da boş dönerse **o kaynağın satırlarına dokunulmaz**.
3. Gelen kayıt sayısı o kaynağın tablodaki aktif kayıt sayısının %80'inden azsa o kaynak atlanır ve uyarı loglanır. Bu, eksik gelen bir cevabın binlerce hisseyi pasife çekmesini engeller.
4. Yalnızca değişen satırlar yazılır. Değişmeyen satıra dokunulmaz; böylece Neon'da her gün 17.000 satırlık gereksiz yazma oluşmaz.
5. Listede olup artık gelmeyen kayıt `is_active = false` yapılır. Listeye geri dönerse tekrar `true` olur.
6. Aynı sembol hem NASDAQ hem NYSE listesinden gelirse tek satır olarak tutulur (`US` + sembol).

Senkron bittikten sonra market-service listeyi belleğine yeniden yükler (§4.5).

### 4.5 Arama

- market-service aktif listeyi açılışta ve her senkrondan sonra **belleğe** yükler. Arama bellekte yapılır, bu yüzden her tuş vuruşunda veritabanına gidilmez.
- Mevcut Türkçe karakter normalizasyonu ve `THYAO` takma adı korunur.
- Sıralama: önce sembolün tam eşleştiği sonuç, sonra sembolü aranan metinle başlayanlar, sonra isminde geçenler. En fazla 15 sonuç.
- Her sonuç şu alanları taşır: `symbol`, `market`, `exchange`, `name`, `currency`.
- Tekilleştirme sembol + market çiftine göre yapılır.

### 4.6 Alım: üç katman

1. **Görünürlük:** Arama yalnızca desteklenen enstrümanları gösterir (§4.5).
2. **Kilit:** Alınan varlık hisseyse (`AssetType = Stock`), portfolio-service `BuyAsync` kaydetmeden önce market-service'e sorar:
   `GET /api/market/instrument?market=US&symbol=LINK`
   market-service iki kontrol yapar: enstrüman bellekteki aktif listede var mı, ve Yahoo'dan fiyatı geliyor mu.

   | market-service cevabı | portfolio-service |
   |---|---|
   | 200 `{market, symbol, exchange, name, currency}` | Kaydeder. `Market` değerini **bu cevaptan** alır, tarayıcının gönderdiğinden değil. |
   | 404 | 400 "Bu enstrüman desteklenmiyor" |
   | Ulaşılamıyor / 5xx | 503 "Şu an doğrulanamıyor, biraz sonra tekrar deneyin" — **fail closed** |

   İstek, mevcut servisler arası çağrılar gibi kullanıcının cookie'siyle gider ([MarketServiceClient.cs](../../../portfolio-service/Services/MarketServiceClient.cs)).
3. **Çeviri:** Yahoo çeviri fonksiyonu (§4.2) tanımadığı bir değerle karşılaşırsa hata verir.

Altın ve döviz alımı değişmez.

### 4.7 API değişiklikleri (market-service)

| Endpoint | Değişiklik |
|---|---|
| `GET /prices?symbols=` | Hisseler `BIST:THYAO`, `US:AAPL` biçiminde gönderilir. Altın ve döviz eskisi gibi (`XAU`, `USD`). Cevaptaki her kayıtta `market` alanı bulunur. |
| `GET /history/{symbol}` | Hisse için `market` parametresi zorunlu |
| `GET /price-on/{symbol}` | Hisse için `market` parametresi zorunlu |
| `GET /price/{symbol}` | Hiçbir tüketicisi yok. Diğerleriyle tutarlı olsun diye `market` parametresi alır. Silinmesi ayrı bir karar. |
| `GET /search` | Kaynağı bellekteki liste olur (§4.5) |
| `GET /instrument` | Yeni (§4.6) |
| `GET /overview` | BIST 30 listesi kodda kalır. Hisse isimleri bellekteki listeden okunur. |

Hisse isteğinde `market` yoksa endpoint 400 döner. `BistCatalog`, `IsBistAsync` ve `TwelveDataClient.SearchSymbolsAsync` kaldırılır.

### 4.8 Redis

Anahtarlar tek bir yerde üretilir: `market-service/Services/CacheKeys.cs`. Kural: önek ve varlık tipi küçük harf; market ve sembol standart yazımda (büyük harf). Altın ve dövizde market boştur, anahtara girmez.

| Anahtar | Değişiklik |
|---|---|
| `bist:stocks` | Faz 2'de kaldırılır |
| `stock:{symbol}` | `stock:{MARKET}:{SYMBOL}` (ör. `stock:BIST:THYAO`) |
| `history:stock:{symbol}:{range}` | `history:stock:{MARKET}:{SYMBOL}:{range}` |
| `priceon:stock:{symbol}:{date}` | `priceon:stock:{MARKET}:{SYMBOL}:{date}`. "Bugün" için kayıt tutulmaz (§4.11). |
| `market:overview` | Kaldırılır (§4.11) |
| — | Yeni: `index:{yahooSymbol}`, `spark:{kaynakSembol}` |
| `gold:XAU`, `currency:{code}` | Değişmez |

Eski anahtarlar silinmez; TTL'leri dolunca kendiliğinden giderler (en uzunu 30 gün).

**Kural:** Redis'e yalnızca silindiğinde sistemin bir şey kaybetmediği veri konur. Silindiğinde sistemi bozacak veri PostgreSQL'e konur.

### 4.9 portfolio-service ve web

- `Asset` modeline `Market` alanı eklenir. Hisse için `BIST` veya `US`; altın ve döviz için boş metin (`""`). Null kullanılmaz, çünkü PostgreSQL unique index'te iki null değeri farklı sayar ve aynı kullanıcı için iki ayrı `XAU` satırı oluşabilir.
- Unique index `(UserId, Symbol)` → `(UserId, Symbol, Market)` olur.
- Fiyat eşleştirmesi ([AssetService.cs:153-172](../../../portfolio-service/Services/AssetService.cs#L153-L172)) `(Market, Symbol)` anahtarıyla yapılır.
- `AssetHoldingDto` `Market` alanını da taşır.
- Web: [AddAsset.jsx](../../../web/src/pages/AddAsset.jsx) seçilen sonucun `market` değerini saklar ve alım isteğiyle gönderir. Sembol taşıyan her ekran ve link `market`'i de taşır: `history` ve `price-on` çağrıları, [AssetDrawer.jsx:178](../../../web/src/components/AssetDrawer.jsx#L178) "tekrar al" yönlendirmesi.
- ~~Transaction tablosu değişmez~~ (karar 2026-10-22): Transaction'a `Market`, `UsdTryRate` ve `PriceSource` eklenir. Sebep: varlık tamamen satılınca silinir ve `AssetId` null olur; lot geçmişi `(Symbol, Market)` ile bulunur. Ayrıntı §4.12.

### 4.10 Mevcut kayıtların doldurulması

Hedef, **bugünkü fiyatlamanın birebir korunması**: sembol BIST listesindeyse `BIST`, değilse `US`. EFOR, LILAK ve LINK bugün BIST olarak fiyatlandıkları için `BIST` olarak kalır.

Yöntem (karar: 2026-10-22):
1. EF migration `Market` kolonunu ekler. Migration, servis açılışında otomatik uygulanır (`db.Database.Migrate()`). Mevcut hisse satırları boş kalır.
2. Deploy'dan hemen sonra kayıtları biz doldururuz. Uygulamada doldurma kodu yazılmaz.
   - Prod'daki farklı hisse sembolleri bir sorguyla listelenir.
   - Liste elle incelenir. BIST olanlar belirlenir.
   - Tek seferlik `UPDATE` çalıştırılır: listedekiler `BIST`, kalan hisseler `US`. Aynı işlem hem `Assets` hem `Transactions` tablosunda yapılır (işlemlerde `Category = 'Stock'`).
   - Kontrol: iki tabloda da `Market` değeri boş hisse kalmamalıdır.
   - Eski işlemlerde `UsdTryRate` ve `PriceSource` boş kalır. Kur istenirse sonradan işlem tarihine göre doldurulabilir.
3. Deploy ile doldurma arasında kısa bir süre mevcut hisseler fiyatsız görünür. Bu kabul edildi.

Kolon ekleme (yapı) migration'da, doldurma (veri) elle yapılır. Sebep: yapı her ortamda aynıdır, veri ortama göre değişir.

### 4.11 Tek fiyat kaynağı ve tek tazelik süresi (Faz 1, adım 7)

Sorun: aynı hisse farklı sayfalarda farklı Redis kayıtlarından ve farklı sürelerle okunuyordu. Portföyde THYAO en fazla 6 dk, piyasa özetinde en fazla 15 dk eski olabiliyordu.

Kurallar:
- **Tek kaynak:** bir verinin tek bir Redis kaydı vardır. Piyasa özeti ve "bugün" fiyatı kendi kopyasını tutmaz; portföyle aynı `stock:`, `gold:`, `currency:` kayıtlarını okur.
- **Tek süre tablosu:** süreler yalnızca `market-service/Services/CacheTtl.cs` içinde tanımlıdır (`Live`, `Daily`, `Permanent`, `Failure`, `Catalog`).
- **Tek cache akışı:** "cache'e bak, yoksa çek, yaz" akışı yalnızca `CacheStore.GetOrSetAsync` içinde uygulanır.
- **Tazelik sunucudan gelir:** her cevap `X-Cache-Expires-In` header'ını taşır (kalan saniye). portfolio-service bu header'ı tarayıcıya iletir. React Query `staleTime` değerini bu header'dan alır. Frontend'de süre rakamı yoktur.
- **TL çevirisi:** hisse ve altın fiyatları tek bir cache'li kurla (`currency:USD`) TL'ye çevrilir.

Ayrıntı: `docs/10-standards/DATA-FETCHING.md` §2.1.

### 4.12 Faz 1 kararları (2026-10-22)

| Konu | Karar |
|---|---|
| Sembol yazımı | Standart biçim `BRK.B`. `brk.b`, `BRK-B` ve `BRK.B` aynı kabul edilir (`YahooSymbol.Normalize`). Yahoo'ya giderken `BRK-B` olur. |
| Market adı | Büyük-küçük harf farkı önemsizdir. Anahtara büyük harfle yazılır. |
| Geçersiz market (`/history`, `/price-on`, `/price`) | 400 |
| Geçersiz market veya fiyatı olmayan sembol (`/prices`) | O sembol atlanır, diğerleri döner. Sebep tek bir `Warning` satırıyla loglanır; sembol listesi loglanmaz. Cevabın biçimi değişmez. |
| `Market` tipi | `string`. Altın ve dövizde `""` (null değil). |
| Lot geçmişi | `Transactions.Market` eklenir; filtre `(Symbol, Market)`. `AssetId` yetmez: varlık tamamen satılınca silinir. |
| `Transactions.UsdTryRate` | İşlem tarihindeki 1 USD'nin TL karşılığı; alımda ve satışta yazılır. Alınamazsa null, işlem engellenmez. |
| `Transactions.PriceSource` | `Market` (otomatik doldu, değişmedi) / `Manual`. Alımda frontend gönderir (zorunlu); satışta her zaman `Manual`. Bilgi amaçlı. |
| Alım doğrulaması | Yalnızca biçim: hisse için `BIST`/`US`, diğerlerinde boş. Enstrümanın varlığı Faz 3'te. |
| Deploy | Faz 1'in tüm adımları tek deploy ile çıkar. |
| Test | Testi kullanıcı yapar. |

## 5. Doğrulanacaklar

Twelve Data denemeleri herkese açık `demo` anahtarıyla yapıldı. Uygulamadan önce kontrol edilecekler:
- Kendi anahtarımızla `/stocks` ve `/etfs` aynı listeleri dönüyor mu, kaç kredi harcıyor?
- Neon planımızın depolama ve compute limitleri (beklenen kullanım çok düşük: birkaç MB depolama, günde bir kısa senkron).

## 6. Uygulayana bırakılanlar

Tablo, sınıf ve endpoint isimleri; senkron saatinin konfigürasyondan okunup okunmayacağı; log mesajlarının metni; bellek listesinin veri yapısı.
