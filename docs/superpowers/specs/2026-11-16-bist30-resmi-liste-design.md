# BIST 30 / BIST 100 Üyeliğini Resmî Kaynaktan Alma — Tasarım

*Tarih: 2026-11-16 · Boyut: küçük değişiklik*

## Neden

Piyasa ekranındaki "BIST 30" tablosu `MarketOverviewService.Bist30` sabit dizisinden gelir. Liste 2026-08-15'te dayanaksız yazıldı, hiç güncellenmedi ve bilinen hiçbir dönemle uyuşmuyor. 16.11.2026 resmî listesiyle 5 fark var (bizde fazla: ARCLK, BRSAN, HEKTS, KONTR, OYAKC; eksik: MGROS, TAVHL, TRALT, TRMET, VAKBN).

Twelve Data kataloğu ~600 BIST hissesini verir ama hangisinin hangi endekste olduğunu vermez. Amaç: bu hisselerden hangilerinin BIST 30 ve BIST 100 üyesi olduğunu resmî kaynaktan bilmek ve uygulamayı deneyen kullanıcılara doğru listeyi göstermek.

## Hedefler

- BIST 30 (`XU030`) ve BIST 100 (`XU100`) üyeliği Borsa İstanbul'un resmî dosyasından, elle bakım olmadan güncellenir.
- Kaynak adresi kodda değil ayarda durur. Prod URL'den indirir; lokal, geliştiricinin klasöründeki dosyayı okur (indirme yok).
- Kaynak alınamazsa ekran son geçerli listeyi göstermeye devam eder; sorun loga düşer, BT müdahale eder.

## Hedef dışı

- ~~Ekranda BIST 100 tablosu~~ — sonradan aynı işe eklendi (2026-11-16): tablo başlığında BIST 30 · BIST 100 segmenti; BIST 100 yalnız seçilince `GET /api/market/index-stocks/{indexCode}` ile yüklenir, Yahoo'ya aynı anda en fazla 8 istek (`MarketOverviewService.MaxParallelQuotes`). Ayrıntı `SCREENS.md` → Piyasa.
- Diğer 84 endeks; bir hissenin hangi endekslerde olduğunu göstermek.
- Ekranda tarih/eskime uyarısı (karar: kullanıcıya değil BT'ye haber verilir).
- Log alarmı (BACKLOG'a not).
- Şirket adlarını Borsa İstanbul dosyasından almak (adlar bugünkü gibi Twelve Data kataloğundan).

## Kaynak

`https://www.borsaistanbul.com/datum/hisse_endeks_ds.csv` — borsaistanbul.com/endeksler/bist-pay sayfasındaki "BIST Pay Endeksleri kapsamında yer alan paylar" linki.

- `;` ayraçlı, ASCII, CRLF. İlk 2 satır başlık (TR + EN). 16.11.2026: 5.815 veri satırı, 86 endeks, 589 farklı hisse.
- Sütunlar: `BILESEN KODU;BULTEN_ADI;ENDEKS KODU;ENDEKS ADI;ENDEKS INGILIZCE ADI;TARIH(GG/AA/YYYY)`
- Örnek: `AKBNK.E;AKBANK;XU030;BIST 30;BIST 30;16/11/2026`. Sembol = `BILESEN KODU` eksi `.E`.
- `XU030` 30 satır, `XU100` 100 satır. XU030, TradingView ve Midas listeleriyle birebir aynı (16.11.2026).
- Dosya günlük yenileniyor görünüyor (Last-Modified Cuma 15:48, `TARIH` ertesi işlem günü). Tek gözleme dayanır.

## Yaklaşımlar

**Kaynak:**

| Yaklaşım | Artı | Eksi |
|---|---|---|
| Elle güncellenen sabit liste + eskime uyarısı | Bağımlılık yok | Bakım ister; resmî duyurular yalnız fark verir; dönem ortası değişiklikler kaçabilir |
| TradingView tarama ucu (JSON) | Otomatik | Gayriresmî, koşulları belirsiz, haber vermeden kırılabilir |
| **Borsa İstanbul CSV (seçilen)** | Resmî, tam liste, dönem ortası değişiklikler de gelir | Yeni dış bağımlılık; site koşulları yazılı izin istiyor (Yasal not) |

**Saklama:**

| Yaklaşım | Eksi |
|---|---|
| Sabit diziyi CSV'den güncellemek | Mümkün değil: `static readonly` çalışırken değişmez, deploy ister |
| İki tablo (`Bist30`, `Bist100`) | Aynı şekil iki kez; endeks adı veri değil tablo adı olur; yeni endeks = migration |
| `Instruments`'a `IsBist30`/`IsBist100` sütunu | Tabloya iki senkron yazar; Twelve Data'da olmayan sembol yazılamaz; US satırlarında anlamsız; yeni endeks = migration |
| Redis (cache-aside) | Redis'in kalıcı diski yok; deploy'da "son geçerli liste" kaybolur |
| **Tek üyelik tablosu `IndexConstituents` (seçilen)** | — |

## Tasarım

### Veri

Yeni tablo `IndexConstituents` (market-service, `MarketDbContext`):

| Sütun | Örnek | Not |
|---|---|---|
| `IndexCode` | `XU030` | |
| `Symbol` | `ASELS` | `.E` atılmış |
| `AsOf` | 2026-11-16 | Dosyadaki `TARIH` |

PK `(IndexCode, Symbol)`. Bir hisse iki endeksteyse iki satırı olur. ~130 satır.

`Instruments` ile ilişki **mantıksal**: `Instruments.Market = 'BIST' AND Instruments.Symbol = IndexConstituents.Symbol`. Foreign key kısıtı yok — iki tabloyu iki bağımsız kaynak doldurur; Twelve Data bir sembolde geride kalırsa FK bütün güncellemeyi reddettirirdi. Eşleşmeyen sembol yazılır ve loga uyarı düşer. `Instruments`'a dokunulmaz.

Başlangıç verisi yok: migration yalnız tabloyu oluşturur. Tablo boşken servis açılışta kaynaktan okur (Akış §1). Prod'da ilk açılışta kaynağa ulaşılamazsa BIST 30 tablosu bir sonraki başarılı okumaya (yeniden başlatma ya da pazartesi) kadar boş görünür ve `Error` düşer (kabul edildi; seed, kaldırılan sabit listeyi migration'a geri gömmek olurdu).

### Ayarlar

| Ayar | Prod | Lokal |
|---|---|---|
| `BorsaIstanbul:ConstituentsSource` (env `BorsaIstanbul__ConstituentsSource` ← `.env` `BIST_CONSTITUENTS_SOURCE`) | `https://www.borsaistanbul.com/datum/hisse_endeks_ds.csv` | `/data/bist/hisse_endeks_ds.csv` |
| `BorsaIstanbul:Cron` | `0 6 * * 1` (pazartesi 06:00, Türkiye saati) | aynı |
| `.env` `BIST_DATA_DIR` | — | geliştiricinin klasörü, ör. `C:/Users/.../bist` |

- Prod URL'si `docker-compose.yml`'de varsayılan değerdir (`${BIST_CONSTITUENTS_SOURCE:-https://…}`): prod `.env`'i Secrets Manager'dan üretildiği için yeni gizli olmayan bir değer oraya eklenmez. `appsettings.json`'da kaynak boştur.
- Değer `http` ile başlıyorsa indirilir, değilse diskten okunur.
- Lokal klasör yalnız `docker-compose.override.yml`'de volume ile bağlanır (servis lokalde de konteynerde çalışır; konteyner host diskini göremez): `${BIST_DATA_DIR}:/data/bist:ro`. Prod compose'a volume eklenmez.
- `.env.example`'a iki değişken açıklamasıyla eklenir.
- Kaynak ayarı boşsa iş çalışmaz, `Error` yazar; servis ayakta kalır (InstrumentSyncJob'daki geçersiz cron davranışı gibi).

### Akış

Mevcut Twelve Data deseninin aynısı: zamanlayıcı → iş → tablo → bellekteki kopya.

1. **`IndexConstituentSyncJob`** (yeni `BackgroundService`, `InstrumentSyncJob` gibi): `BorsaIstanbul:Cron` geldiğinde çalışır. Açılışta tablo boşsa ya da en yeni `AsOf` 7 günden eskiyse de çalışır. Twelve Data senkronundan bağımsızdır (ayrı zamanlama, ayrı hata).
2. **`IndexConstituentSyncer`** (yeni, işin kendisi):
   - Kaynağı oku (indir ya da dosyadan), satırlara ayır, `XU030` ve `XU100` satırlarını al, `.E` ekini at.
   - **Ret kuralları** — biri tutarsa tablo değişmez, `Warning`: okuma/ayrıştırma hatası; XU030 30 satır değil; XU100 100 satır değil.
   - Geçerse: iki endeksin satırları tek transaction'da silinip yenisi yazılır; bellekteki kopya yenilenir.
   - **Katalog kontrolü:** sembol `InstrumentCatalog`'da aktif BIST hissesi değilse `Warning` ("sembol değişmiş olabilir"). Liste yine kabul edilir — üyeliğin otoritesi Borsa İstanbul; fiyat Yahoo'dan sembolle gelir, ad bulunamazsa sembol gösterilir (bugünkü davranış).
   - **Eskime:** her çalışmada tablo boşsa ya da `AsOf` 10 günden eskiyse `Error`. İki durumu yakalar: kaynak okunamıyor, ya da okunuyor ama Borsa İstanbul güncellemiyor. Lokalde elle konan dosya eskiyince her çalışmada bir `Error` düşer (haftada bir + açılış; kabul edildi).
3. **`IndexMembership`** (yeni singleton, bellekteki kopya; `InstrumentCatalog`'a eklenmez — sahipleri farklı): açılışta (`Program.cs`, katalogla birlikte) ve her başarılı güncellemeden sonra tablodan yüklenir. `Symbols("XU030")` gibi okunur.
4. **`MarketOverviewService`**: sabit `Bist30` dizisi ve "periyodik güncellenmeli" yorumu kaldırılır; `IndexMembership`'ten XU030 okunur. Overview her istekte veritabanına gitmez.
5. **`BorsaIstanbulClient`** (yeni, `HttpClient`): URL'den indirme. Diğer client'lar gibi `AddHttpClient` ile kaydedilir.

**Ekran ve API değişmez.** Overview cevabı ve web aynı; yalnız tablodaki hisseler doğru olur. XU100 verisi tutulur ama henüz kullanılmaz.

Log seviyeleri `LOGGING.md`'ye uyar: prod `Warning` olduğu için tüm sorunlar `Warning`/`Error`; başarılı çalışma `Information`.

## Yasal not

Borsa İstanbul "Telif Hakkı ve Çekince İhbarı": bilgiler "sadece bilgi edinme amacıyla" kullanılabilir; yazılı izin olmadan kopyalanamaz, saklanamaz, dağıtılamaz. Proje ticari olmayan bir öğrenme projesi; internette erişilebilir ama tanıtılmıyor. Risk mevcut kaynaklarla (Yahoo gayriresmî uç, Twelve Data ücretsiz plan) aynı sınıfta. `BACKLOG.md` → "Veri lisansları" bölümüne bu dosya bir satır olarak eklenir.

## Doğrulama

Test projesi yok.
- `dotnet build` hatasız.
- Lokal: dosya klasöre konur, compose ayağa kalkar, migration uygulanır; `/api/market/overview` 30 hisseyi 16.11.2026 listesiyle döndürür.
- Kaynak ayarı geçersiz bir yola çevrilince son liste kalır, `Warning` düşer.
- Prod ayarıyla (URL) bir çalışma lokalde denenir: indirme ve yazma loglarda görülür.

## Uygulayıcıya kalanlar

- Borsa İstanbul'un User-Agent başlığı olmadan cevap verip vermediği (keşifte tarayıcı UA'sı kullanıldı).
- İndirme zaman aşımı; sınıf/dosya adları; dosya kodlaması (bugün ASCII, Türkçe karakter gelirse windows-1254 olabilir).
- `BACKLOG.md`: "Veri lisansları"na Borsa İstanbul CSV satırı; log alarmı eksikliği notu.
