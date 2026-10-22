# Backlog

Sonraya bırakılan işler. Her madde: sorun, neden önemli, seçenekler, öneri. İşe başlanınca maddeye tarih + dal yazılır, bitince silinir (karar kaydı gerekiyorsa ilgili modül dokümanına taşınır).

---

## Kayıtta hesap, e-posta kodu girilmeden oluşuyor

*Eklendi: 2026-10-04 · Bağlam: OTP/2FA işi (`feat/otp-2fa`)*

**Sorun.** "Hesap Oluştur"a basıldığı anda Kratos kimliği veritabanına yazar (`verified: false`), doğrulama kodunu sonra gönderir. Kullanıcı kodu girmeden sayfayı kapatırsa hesap yine de vardır. İstenen davranış: **kod girilmeden hesap olmamalı / kullanılamamalı.**

**Şu anki etkisi.** 2FA açıkken (`AUTH_REQUIRED_AAL` ≠ `aal1`) girişte e-postaya OTP gittiği için doğrulanmamış hesap panele pratikte giremez. Ama Kratos'ta adres `verified: false` kalır ve 2FA kapatılırsa doğrulanmamış hesap engelsiz girer.

**Seçenekler.**

| | Yaklaşım | Artı | Eksi |
|---|---|---|---|
| **A** | Kratos `require_verified_address` login hook'u: doğrulanmamış hesap şifre adımında reddedilir | Birkaç satır config; garantiyi Kratos verir | Doğrulanmamış satırlar DB'de birikir (isteğe bağlı periyodik temizlik) |
| **B** | Kratos kodla kayıt (`code` registration) | Hesap ancak koddan sonra oluşur | v1.2'de `passwordless_enabled` gerektirir; `mfa_enabled` ile aynı anda açılamaz → 2FA tasarımı ya da şifreli giriş değişir |
| **C** | Önce kod, sonra hesap — kendi backend'imiz: `portfolio-service` kodu gönderir, doğrulanınca Kratos admin API ile kimliği oluşturur | Tam istenen davranış, DB'de yarım satır yok | Kod üretme/saklama/süre/deneme sınırı/şifreyi geçici tutma bizde → en çok iş, en yüksek güvenlik riski |

**Öneri.** A — "kod girilmeden hesap kullanılamaz" garantisi Kratos'tan gelir. "DB'de hiç satır olmasın" şartsa C.

**İlgili.** Planın Görev 3'ü (backend `403 verification_required`) yapılmadı; A seçilirse gereksizleşir. Plan: `docs/superpowers/plans/2026-09-29-otp-2fa-register.md`.

---

## Landing "Fiyat sor" gerçek ölçümle beslenmiyor

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 2 (`mobil-design`)*

**Sorun.** Landing'deki "Fiyat sor" kutusu önbelleği anlatan bir canlandırma: fiyatlar sabit örnek, süreler (önbellek ~2 ms, dış kaynak ~200–280 ms) gerçek mertebede ama ölçülmüş değil. Üzerinde "Canlandırma · gerçek istek değil" yazıyor.

**Neden önemli.** Gerçek süre ve gerçek HIT oranı gösterilebilirse kutu canlandırma olmaktan çıkar, ürünün kendisini kanıtlar.

**Öneri.** market-service'te giriş istemeyen, yalnız 3 sembolle sınırlı, rate limit'li küçük bir uç nokta (`/api/market/demo?symbol=`): fiyat + kaynak (redis/yahoo) + süre döner. Kutu bunu çağırır; uç nokta yoksa bugünkü canlandırmaya düşer.

---

## Teknoloji yazıları: sade dil + eksik 9 teknoloji

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 2*

**Sorun.** 13 teknolojiden yalnız 4'ünün (Giriş görseli, Docker, nginx, GitHub Actions) yazısı var; mevcut yazılar da yazılımcıya göre teknik.

**Öneri.** Her teknoloji aynı dört soruyla, teknik olmayan dille: ne işe yarıyor · neden seçtik (alternatifiyle) · Assay'da nasıl · ne öğrendik. Kod "Teknik ayrıntı" altında kalır. Metinler kullanıcıyla birlikte yazılır — taslakta uydurulmuş ayrıntı kullanılmaz. Veri: `web/src/lib/stack.jsx` + `*Detail.jsx`.

---

## Fiyatlı takvim: 1 yıldan eski tarihler renksiz

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1 (Varlık Al)*

**Sorun.** Takvimin ısı rengi ve günlük fiyatı `usePriceHistory(…, '1y')`'den geliyor; daha eski yıllar renksiz ve fiyatsız (seçilince tek gün fiyatı ayrıca sorgulanıyor).

**Öneri.** Ay bazında günlük kapanış dönen uç nokta (`/api/market/history?symbol=&month=YYYY-MM`), Redis'te uzun TTL (geçmiş ay değişmez). Takvim görünen aylar için tembel yükler.

---

## Piyasa: hacim filtresi ve "öne çıkanlar" sayfası

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1 (Piyasa)*

**Sorun.** Borsa panelindeki sıralama çipleri (en çok yükselen / düşen / işlem) tek satır; "hacim liderleri" ve günün diğer öne çıkanları (52 hafta zirvesi, sert hareketler) için yer yok.

**Öneri.** Hacim için açılır filtre (çip yerine). Öne çıkanlar ayrı sayfa (`/market/highlights`), Piyasa kart diliyle.

---

## Masaüstü sidebar yeniden tasarımı

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1*

**Sorun.** Mobilde alt menü 4 sekmeye indi; masaüstü sidebar 3 öğeyle (Genel Bakış, Portföy, Piyasa) geçici durumda, mobil kart diliyle uyumsuz.

**Öneri.** Mobil dilin masaüstüne uyarlanması ayrı bir tasarım turu: mockup → onay → uygulama.

---

## Analiz sayfası yeniden tasarımı

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1*

**Sorun.** Analiz sayfası menülerden kaldırıldı; `/analytics` adresi Özet'e yönleniyor. `Analytics.jsx` kodda duruyor.

**Öneri.** Mobil önce, kart diliyle yeniden tasarlanır; hazır olunca yönlendirme kalkar ve menüye döner.

---

## Inter kalınlığı gerçek iPhone'da doğrulanmalı

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1 (Task 5)*

**Sorun.** Playwright'ın Windows WebKit'i değişken fontun kalınlık eksenini uygulamıyor (Arial/Georgia kalın, Inter 700 ince). Kod doğru: `@fontsource-variable/inter`, `font-weight: 100 900`.

**Öneri.** AWS deploy'undan sonra gerçek iPhone Safari'de başlıkların kalın göründüğü kontrol edilir. İnce görünürse statik ağırlık dosyaları (`@fontsource/inter` 400/600/700) yedek olarak eklenir.

---

## Landing hero başlığı geçici

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 2*

**Sorun.** "Hisse, altın ve döviz. Hepsi tek defterde." ve alt metni yer tutucu olarak kondu.

**Öneri.** Kalıcı metin kullanıcıdan gelir; yalnız `web/src/pages/Landing.jsx` hero değişir.

---

## Açık küçük kararlar

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1*

- **Sahip olunan varlıkta "Al":** portföydeki bir varlığın panelinde yalnız "Sat" var. "Al" (daha fazla al) eklenirse o varlık seçili Al sayfası açılır (`buyPath` hazır).
- **Yüzde biçimi tek tip değil:** büyük kartlarda "−%2,89" (`formatPct`), Borsa listesinde ve endeks satırında "−2.86%". Öneri: hepsi `formatPct`.

---

## Kullanılmayan çeviri anahtarları

*Eklendi: 2026-10-17 · Bağlam: mobil dönüşüm Faz 1–2*

**Sorun.** Silinen/yeniden yazılan sayfalardan (`GoldFx`, eski `Market`, eski takvim, eski landing menüsü) `LanguageContext.jsx`'te kullanılmayan anahtarlar kaldı.

**Öneri.** Anahtarlar `t('…')` kullanımlarıyla karşılaştırılıp liste çıkarılır; silmeden önce kullanıcıya gösterilir.

---

## kratos.yml'de Kratos'un örnek sırları duruyor

*Eklendi: 2026-10-18 · Bağlam: repo sır taraması*

**Sorun.** `kratos/kratos.yml` → `secrets.cookie` ve `secrets.cipher`, Kratos'un herkesçe bilinen örnek değerlerini içeriyor (`PLEASE-CHANGE-ME…`, `32-LONG-SECRET…`). Compose bunları `KRATOS_SECRETS_COOKIE` / `KRATOS_SECRETS_CIPHER` ile eziyor.

**Neden önemli.** Prod'da değişkenlerden biri eksik kalırsa Kratos hata vermez, bu örnek değerlerle sessizce çalışır. Bu değerler oturum çerezini imzalıyor ve hassas veriyi şifreliyor.

**Öneri.** (1) Secrets Manager `assay/prod/env` içinde ikisinin dolu olduğunu kontrol et. (2) Örnek değerleri `kratos.yml`'den sil — değişken yoksa Kratos açılmaz, hata görünür olur (fail-fast). Dev için `.env.example` açıklaması yeterli.

---

## `.playwright-mcp/` kayıtları repoya girmiş

*Eklendi: 2026-10-18 · Bağlam: repo sır taraması*

**Sorun.** `689df43` commit'iyle Playwright MCP tarayıcı aracının konsol kaydı ve sayfa görüntüsü (`.playwright-mcp/*.log`, `*.yml`) repoya girdi; `mobil-design` ve `test`'te var. İçerik zararsız (giriş yönlendirme ekranı) ama repoya ait değil; ileride oturum açık sayfaların görüntüleri de girebilir.

**Öneri.** Kök `.gitignore`'a `.playwright-mcp/` ekle, `git rm -r --cached .playwright-mcp` ile takipten çıkar (dosyalar diskte kalır).

---

## `.env.example`'daki bağlantı metinleri kontrol edilmeli

*Eklendi: 2026-10-18 · Bağlam: repo sır taraması*

**Sorun.** `DB_CONNECTION_STRING` örneğinde şifre alanı dolu (4 karakter). Muhtemelen yer tutucu ama doğrulanmadı. Geçmişte bu dosyaya gerçek bir anahtar yazılıp geri alınmıştı.

**Öneri.** Dosyayı açıp şifre ve host alanlarının yer tutucu olduğunu gözle doğrula (`<sifre>` gibi açıkça yer tutucu bir biçime çevir). Gerçek değer çıkarsa: o sırrı döndür (rotate) ve geçmişten temizlemeyi değerlendir.

---

## Piyasa kartları ayrı veri serisinden besleniyor

*Eklendi: 2026-10-19 · Bağlam: grafik veri kaynakları incelemesi*

**Sorun.** Portföy kartları ve varlık panelindeki mum grafiği `usePriceHistory` (`/api/market/history`) kullanıyor; Piyasa kartları (Borsa, Altın & Döviz) ise `/api/market/overview` içindeki ayrı `spark` serisini. İki yol farklı hesaplıyor: overview'da altının 1 aylık serisi **bütün günler bugünün** USD/TL kuruyla gram TL'ye çevriliyor; history'de **her gün kendi kuruyla**. Piyasa kartındaki altın grafiği panelin grafiğinden biraz farklı görünebiliyor.

**Öneri.** Piyasa kartlarını da `usePriceHistory`'ye geçir (XU100.IS ve XAU, `1mo` veya `1y`). İki yer tek kaynaktan beslenir, altın farkı kaybolur, React Query önbelleği paylaşılır. Bedeli: Piyasa açılışında iki ek istek (önbellekten gelir). Sonra `MarketOverviewService`'teki `Spark` üretimi kaldırılabilir — kullanılan başka yer yoksa.

---

## Portföy kartı: sayı portföyün, grafik endeksin

*Eklendi: 2026-10-19 · Bağlam: Portföy Hisse kartı ile Piyasa Borsa kartı karşılaştırması*

**Sorun.** İki kart da BIST 100 çiziyor ama farklı aralıkta ve farklı anlamda:

| | Piyasa / Borsa | Portföy / Hisse |
|---|---|---|
| Büyük sayı | BIST 100 endeks puanı | Kullanıcının hisselerinin TL değeri |
| Yüzde | Günlük değişim (önceki kapanışa göre) | Gerçekleşmemiş K/Z (maliyete göre, `summarizeCategories`) |
| Grafik | BIST 100, `1mo` (~22 nokta, `spark`) | BIST 100, `1y` (~250 nokta, `usePriceHistory`) |

Portföy kartında değer ve yüzde kullanıcının, hemen altındaki grafik endeksin (`CATEGORY_SERIES` — bilinçli karar, kartta "BIST 100 · son 1 yıl" etiketi var). Okuyan grafiği kendi portföyü sanabilir; DESIGN.md veri dürüstlüğü açısından zayıf nokta. Altın ve Döviz kartları için de aynısı geçerli.

**Seçenekler.**

| | Yaklaşım | Artı | Eksi |
|---|---|---|---|
| **A** | Olduğu gibi bırak | İş yok; etiket durumu söylüyor | Yanlış okuma riski sürer |
| **B** | Aralıkları eşitle (ikisi de `1mo` veya `1y`) | Görsel tutarlılık; yukarıdaki "ayrı veri serisi" maddesiyle birlikte yapılabilir | Anlam farkı (portföy vs endeks) çözülmez |
| **C** | Portföy kartına gerçek portföy değeri serisi | En dürüst; sayı, yüzde ve grafik aynı şeyi anlatır | Backend'de günlük portföy değeri geçmişi yok — işlem geçmişi + tarihsel fiyatlarla hesaplanmalı ya da günlük anlık görüntü (snapshot) tutulmalı; büyük iş |

**Öneri.** Kısa vadede B (tek kaynak maddesiyle beraber); C ayrı bir tasarım turu.

---

## Servisler arası kimlik doğrulama yok (güvenilir ağ modeli)

*Eklendi: 2026-10-19 · Bağlam: servisler arası iletişim incelemesi*

**Durum.** Bütün container'lar tek Docker ağında; dışarıya yalnız nginx açık (prod'da 443, yalnız Cloudflare). İçeride servis kimliği yok: nginx → portfolio-service, portfolio-service → market-service, servisler → Kratos `whoami` kullanıcı çerezini iletip kullanıcı düzeyinde doğrulanıyor; servisin kendisi kanıtlanmıyor. Compose'taki `expose` bir kısıtlama değildir — ağdaki her container her porta ulaşır.

**Neden önemli.** Bugün doğrudan açık yok; risk bir container ele geçirilirse (ör. bağımlılık açığı) **yanal hareket**: içeriden Kratos yönetim API'si (4434, kimlik doğrulaması yok — kullanıcıları listeleme/silme/değiştirme) ve şifresiz Redis (sahte fiyat yazma). Kodda 4434'ü kullanan hiçbir servis yok.

**Önlemler (öncelik sırasıyla).**

| # | Önlem | Etki | İş |
|---|---|---|---|
| 1 | Kratos yönetim API'sini container içine kapat (`serve.admin.host: 127.0.0.1`) | Kullanılmayan en tehlikeli kapı kapanır | Çok küçük (kratos.yml) |
| 2 | Redis'e şifre (`requirepass`) | Yetkisiz okuma/yazma engellenir | Küçük (compose + iki servisin bağlantı ayarı + Secrets Manager) |
| 3 | Docker ağlarını ayır (Kratos yalnız ihtiyacı olanlarla, Redis yalnız servislerle) | Yanal hareket alanı daralır | Orta |
| 4 | Servisler arası karşılıklı TLS (mTLS) | "Sıfır güven" modeli | Büyük; bu ölçekte gereksiz |

**Öneri.** 1 ve 2 yapılsın; 3 ve 4 ölçek büyürse. Not: dev'de `docker-compose.override.yml` 4434'ü host'a açıyor; 1 uygulanınca dev'de de kapanır, gerekirse yalnız dev'de açık bırakılır.

---

## Aktif oturumlar listesi ve yeni cihaz bildirimi

*Eklendi: 2026-10-19 · Bağlam: aynı hesaba iki cihazdan giriş sorusu*

**Durum.** Kratos bir hesabın aynı anda birden fazla oturumuna izin veriyor (her cihaz kendi çerezi). Bu beklenen davranış; kullanıcı ise hangi cihazların açık olduğunu göremiyor ve yeni bir cihazdan girildiğinden haberi olmuyor.

**Karar (2026-10-19).** Girişte diğer cihazları otomatik çıkarmak **yok** — Assay bir takip uygulaması (para/emir yok), giriş zaten şifre + e-posta kodu; otomatik atma güvenlikten çok kullanım zorluğu getirir ve saldırganla "birbirini atma" yarışına döner. Onun yerine görünürlük:

1. **Aktif oturumlar** (Menü → Güvenlik): cihaz/tarayıcı, yaklaşık konum, son etkinlik; "Bu cihaz" etiketi; satır başına "Çıkış yap" ve toplu **"Diğer cihazlardan çıkış yap"**. Kratos hazır sağlıyor: `GET /sessions` (diğer oturumlar), `DELETE /sessions/{id}`, `DELETE /sessions` (mevcut hariç hepsi). Cihaz bilgisi oturumun `devices` alanından (user agent, IP, konum).
2. **Yeni cihazdan giriş e-postası:** "Hesabına yeni bir cihazdan girildi — sen değilsen diğer cihazlardan çık ve şifreni değiştir." Kratos'ta hazır değil: login `after` hook'unda `web_hook` ile portfolio-service'e bildirim (Kratos → `/internal/...`, API anahtarlı), servis cihazı daha önce görüp görmediğine bakıp Resend ile e-posta gönderir.

**Not.** "Yeni cihaz" tanımı (user agent + IP alt ağı mı, çerez tabanlı cihaz kimliği mi) tasarımda netleşmeli; yanlış tanım her girişte e-posta üretir.

---

## Enstrüman listesi (Faz 2): ertelenen inceleme bulguları

*Eklendi: 2026-10-23 · Bağlam: enstrüman kimliği Faz 2 kod incelemesi (`test`, `835852b`). Spec: `docs/superpowers/specs/2026-10-21-enstruman-kimligi-design.md` §4.4*

### 1. Hisse–ETF çakışması bir gün sızabiliyor — **Faz 3'ten önce**

**Sorun.** Çakışma (aynı ABD sembolü hem hisse hem ETF listesinde, ör. `GRIN`) yalnızca o gün başarılı olan kaynaklar arasında yakalanıyor (`InstrumentSyncer`). Çakışan sembol tabloya hiç yazılmadığı için çakışmanın kaydı da yok. ETF kaynağı bir gün başarısız/atlanırsa sembol o gün hisse olarak eklenir ve aramada görünür; ertesi gün iki kaynak da gelince pasife çekilir (Warning ile).

**Neden önemli.** O gün alan kullanıcı yanlış enstrümanın fiyatını görür (Yahoo'da `GRIN` artık ETF) — spec kural 7'nin ("yanlış enstrümanı sunmaktansa sunmamak") tam tersi. Faz 3'te alım kilidi bu listeye bakacağı için önemi artar.

**Öneri.** Çakışmayı kalıcı tut: çakışan sembol tabloya `IsActive = false` ve bir işaretle (ör. `Category = 'Conflict'` ya da ayrı kolon) yazılır; senkron, işaretli sembolü iki taraf da başarılı olup çakışma kalkana kadar eklemez.

### 2. Bellek yenileme hatası yanlış raporlanıyor

**Sorun.** Senkron `SaveChangesAsync` ile yazdıktan hemen sonra `InstrumentCatalog.ReloadAsync` hata verirse (Neon bağlantısı iki sorgu arasında koparsa) log "Instrument sync failed" der; ama veri ve son senkron zamanı zaten yazılmıştır. Bellek bir sonraki senkrona ya da yeniden başlatmaya kadar eski listeyle kalır, açılış kontrolü bunu kaçırılmış saymaz.

**Neden önemli.** Düşük olasılık; etkisi bir günlük eski liste ve yanıltıcı log.

**Öneri.** Belleği veritabanından yeniden okumak yerine senkronun elindeki birleşik listeden kur; ya da reload'u ayrı `try/catch` ile sarıp "yazıldı, bellek yenilenemedi" diye ayrı logla ve kısa süre sonra yeniden dene.

### 3. Arama her istekte isimleri yeniden normalize ediyor

**Sorun.** `SymbolSearchService` her aramada ~16.600 kaydın ismini diakritik-duyarsız biçime çeviriyor (her biri yeni string). Ölçülmedi; tahminen birkaç milisaniye.

**Neden önemli.** Bugün önemsiz; trafik artarsa gereksiz CPU ve bellek tahsisi.

**Öneri.** Normalize edilmiş isim (ve takma ad) `ReloadAsync` sırasında `InstrumentCatalog` snapshot'ında bir kez hesaplanır; arama hazır değeri kullanır.

### 4. Twelve Data API anahtarı URL'de

**Sorun.** `TwelveDataClient` anahtarı query string'de gönderiyor (`?apikey=`). Kodumuz URL'yi loglamıyor; ama `LOG_LEVEL_FRAMEWORK=Information` açılırsa `System.Net.Http.HttpClient` logları istek adresini yazabilir (.NET 9'un sorgu dizisini maskeleyip maskelemediği doğrulanmadı). Faz 2'den önce de böyleydi.

**Neden önemli.** Teşhis için log seviyesi açıldığında sır loga düşebilir (LOGGING.md §4 hassas veri yasağı).

**Öneri.** Anahtarı `Authorization: apikey <anahtar>` header'ıyla gönder (Twelve Data destekliyor); URL'de sır kalmaz.

---

## Veri kaynağı ve "yatırım tavsiyesi değildir" satırı

*Eklendi: 2026-10-23 · Bağlam: veri lisansları konuşması*

**Sorun.** Landing footer'ında yalnız `FİYATLAR GECİKMELİ OLABİLİR · YATIRIM TAVSİYESİ DEĞİLDİR` var (`web/src/pages/Landing.jsx:573`); veri kaynakları yazmıyor. Giriş yapılan panelde (fiyatların asıl görüldüğü yer) hiçbir uyarı yok.

**Neden önemli.** Kaynağı belirtmek dürüst bilgilendirme ve veri sağlayıcılarının atıf beklentisine uyum; "yatırım tavsiyesi değildir" ifadesi kullanıcıyı yanlış beklentiden korur.

**Öneri (kullanıcıyla konuşuldu).** Metin: *"Veriler: Yahoo Finance, Twelve Data, Frankfurter. Fiyatlar gecikmeli olabilir. Yatırım tavsiyesi değildir."* (Frankfurter döviz kurlarının kaynağı.)
1. Landing: mevcut footer satırı bu metinle değişir, stil aynı kalır (mono, `text-micro`, soluk, büyük harf).
2. Panel (`web/src/components/Layout.jsx`): `<main>` içinde sayfa içeriğinin altına aynı stilde tek satır; mobil alt menünün altında kalmaz. Metin `LanguageContext` ile TR + EN.

Uygulamadan önce DESIGN.md okunur.

---

## Herkese açık kayıt: KVKK yükümlülükleri

*Eklendi: 2026-10-23 · Bağlam: projenin AWS'de herkese açık olması sorusu*

**Sorun.** Kayıt herkese açık; e-posta ve portföy verisi işleniyor. Aydınlatma metni, gizlilik politikası ve hesap silme yok; veriler yurt dışında duruyor (Neon, AWS, e-posta için Resend).

**Neden önemli.** Başkalarının kişisel verisini işleyen site KVKK kapsamına girer. Yalnızca bir metin eklemek yetmez; yükümlülükler verinin fiilen nasıl işlendiğine bakar. Hukuki görüş değildir; kesinleştirmek için hukukçu ya da hazır KVKK şablonu.

**Yapılacaklar (öncelik sırasıyla).**

| # | Yükümlülük | Durum / iş |
|---|---|---|
| 1 | **Aydınlatma metni + gizlilik politikası** (hangi veri, amaç, süre, kimlerle paylaşılıyor, haklar) | Yok. Sayfa eklenir, kayıt ekranından link verilir. |
| 2 | **Yurt dışına aktarım** (KVKK md. 9, 2024 değişikliği: yeterlilik kararı ya da standart sözleşme gibi uygun güvenceler) | Neon, AWS, Resend yurt dışında. En kritik madde; metinle çözülmez. Hukukçu ile netleştirilmeli. |
| 3 | **İlgili kişi hakları** (md. 11: verisini görme, silme) | Hesap silme yok. Kratos kimliği + portföy verisi + işlemler birlikte silinmeli. |
| 4 | **Açık rıza** | Hizmetin çalışması için gereken veride büyük ihtimalle gerekmez (sözleşmenin ifası). Pazarlama e-postası gibi ek kullanım eklenirse gerekir. |
| 5 | **Veri güvenliği + ihlal bildirimi** | Kratos, 2FA, şifreleme var. İhlalde Kurul'a bildirim süreci yazılı olmalı. |
| 6 | **VERBİS kaydı** | Küçük ölçekte muhtemelen muaf; kontrol edilir. |

**Kısa vadeli alternatif.** Yükümlülükler tamamlanana kadar kaydı kapatmak ya da davetle sınırlamak; site "kişisel proje" olarak kalır.

---

## Veri lisansları (herkese açık / ticari kullanımdan önce)

*Eklendi: 2026-10-23 · Bağlam: enstrüman listesini veritabanında tutmanın yasallığı sorusu*

**Durum.** Kaynakların lisans durumu:
- **Twelve Data (enstrüman listesi), ücretsiz plan.** Şartlar (twelvedata.com/terms): saklama yalnız iç kullanım için (§2.2a). Son kullanıcıya göstermek "redistribution / external display" sayılır ve plan ya da ek izin ister (§2.2b, §2.2e). Ücretsiz katmanda ticari kullanım yasak (§2.3l). Abonelik bitince veriler 30 gün içinde silinir (§16.2a).
- **Yahoo Finance (fiyatlar).** Kullanılan `query1.finance.yahoo.com/v8/finance/chart` resmi API değil; anahtar ve sözleşme yok. Yahoo her an değiştirip engelleyebilir; bulut IP'leri daha sık engellenir. İzinsiz ticari kullanım risklidir.
- **Frankfurter (döviz).** Açık kaynak, ECB referans kurları; risk düşük.
- **BIST verisi.** Üçüncü kişilere dağıtımı (özellikle anlık) Borsa İstanbul lisansına tabi.

**Neden önemli.** Kişisel ve az trafikli projede pratik risk düşük; en olası sonuç Yahoo'nun engellemesi ya da Twelve Data'nın anahtarı kapatması (teknik kesinti). Herkese açık ya da ticari ürün olursa izinsiz veri kullanımı somut hukuki risk olur.

**Öneri.** Herkese açık büyüme veya para kazanma kararından önce: (1) fiyatlar için lisanslı kaynak (ör. Twelve Data ücretli planı fiyat da veriyor), (2) Twelve Data redistribution hakkı, (3) BIST gecikmeli veri koşullarının kontrolü, (4) hukukçu görüşü.

---

## Girişte 2FA adımı, portfolio-service cevap vermezse atlanıyor (fail open)

*Eklendi: 2026-10-23 · Bağlam: Faz 1 deploy'unda portfolio-service çökükken giriş denendi*

**Sorun.** Şifre adımından sonra frontend 2FA'nın gerekip gerekmediğini `GET /api/auth/options` ile sorar ([Login.jsx:136-142](../../web/src/pages/Login.jsx#L136-L142)). İstek başarısız olursa `options = null` olur, kod bunu "2FA gerekmiyor" sayar ve `/overview`'a yönlendirir. Kullanıcı e-posta kodu girmeden panele girmiş görünür.

**Şu anki etkisi.** Veri sızmaz: portfolio-service ve market-service aal2 olmayan her isteğe 403 `aal2_required` döner; servis ayağa kalkınca ilk API isteği kullanıcıyı `/login?aal2=1` kod adımına gönderir. Sorun, arayüzün yanlış izlenim vermesi ve güvenlik kontrolünün hata durumunda açık kalması.

**Öneri.** Fail closed: `/api/auth/options` cevap vermezse yönlendirme yapılmaz; "Giriş şu an tamamlanamıyor, biraz sonra tekrar deneyin" hatası gösterilir. Login.jsx'te birkaç satır.

---

## İstek süreleri yüksek (500 ms – 1,7 sn)

*Eklendi: 2026-10-23 · Bağlam: Faz 1 deploy sonrası WSL log incelemesi*

**Gözlem.** portfolio-service istek logunda (`Elapsed`) çoğu istek 500–950 ms: `GET /api/assets` ~900 ms, `/api/market/search` ~920 ms, `/api/market/price-on` ~900 ms. Alım (`POST /api/assets/buy`) 1,5–1,7 sn. Karşılaştırılacak eski ölçüm yok.

**Muhtemel sebep.** Her istek birden çok ağ turu atıyor:

```
portfolio-service → Kratos whoami → (Kratos → Neon)
                  → Neon (veri, us-east-1)
                  → market-service → Kratos whoami (tekrar) → Redis / Yahoo
```

Kullanıcı oturumu bir istekte iki kez (portfolio-service ve market-service) Kratos'a soruluyor. Neon `us-east-1` bölgesinde; her sorgu okyanus ötesine gidiyor. Faz 1 alıma bir çağrı ekledi: işlem kuru için `/price-on/USD`.

**İlk adım: ölçmek.** Tahminle değil, ölçümle başlanır. Bir isteğin süresi parçalara ayrılır: whoami, veritabanı, market-service, Redis, Yahoo. Loglarda `@tr` (trace id) zaten var; parça süreleri aynı trace altında loglanabilir.

**Olası iyileştirmeler (ölçüme göre).**

| # | Önlem | Etki | İş |
|---|---|---|---|
| 1 | whoami sonucunu kısa süre (ör. 30 sn) önbellekle | İstek başına bir veya iki Kratos turu azalır | Küçük; oturum iptali gecikmeli yansır |
| 2 | Neon bölgesini kullanıcıya yaklaştır (ör. `eu-central-1`) | Her sorgu daha kısa sürer | Orta; veritabanı taşıma |
| 3 | İşlem kurunu alım cevabından sonra arka planda doldur | Alım süresi kısalır | Küçük; kur kısa süre boş kalır |

**Öneri.** Önce ölçüm; iyileştirme ölçüme göre seçilir.

---

## `Transactions` tablosundaki kolonlar gözden geçirilmeli

*Eklendi: 2026-10-23 · Bağlam: Faz 1 sonrası işlem tablosu kontrolü*

**Sorun.** Tablo 19 kolona çıktı. Bir kısmı başka kolonlardan türetilebiliyor, bir kısmı hiçbir yerde kullanılmıyor. Kod taramasındaki ilk gözlemler:

| Kolon | Gözlem |
|---|---|
| `Amount` | `Quantity × UnitPrice` ile aynı; türetilebilir |
| `Category` | `AssetType`'ın metin hali (`"Stock"`). İşlemde ayrı bir `AssetType` yok; kimlik bu kolondan okunuyor |
| `Description` | Otomatik üretilen metin (`"LINK alış: 100 x 45 TRY"`); diğer kolonlardan türetilebilir. Arama filtresi bunun üzerinde çalışıyor |
| `Tags` | Model, DTO ve filtrede var; ekranda hiçbir yerde kullanılmıyor, yazan bir akış yok |
| `UpdatedAt` | Yalnızca oluşturulurken atanıyor; işlem güncellenmediği için hep `CreatedAt` ile aynı |
| `Market`, `UsdTryRate`, `PriceSource` | Faz 1'de eklendi; kararlar spec §4.12'de |

**Neden önemli.** Türetilebilen kolon, kaynağıyla çelişebilir (ör. `Amount` ≠ `Quantity × UnitPrice`). Kullanılmayan kolon, okuyanı "bu ne için?" diye düşündürür.

**Dikkat.** Kolon silmek geri alınması zor bir işlem: migration'da `Down` metodu kolonu geri getirir, ama içindeki veriyi getirmez. Önce her kolonun gerçekten kullanılmadığı doğrulanmalı; gerekirse silmeden önce veri yedeklenmeli.

**Öneri.** Kolon kolon karar: tut / türet (DTO'da hesapla) / sil. `Tags` ve `UpdatedAt` en güçlü silme adayları.
