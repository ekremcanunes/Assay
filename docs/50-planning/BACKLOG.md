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

## Servisler arası kimlik doğrulama yok (güvenilir ağ modeli)

*Eklendi: 2026-10-19 · Bağlam: servisler arası iletişim incelemesi*

**Durum.** Bütün container'lar tek Docker ağında; dışarıya yalnız nginx açık (prod'da 443, yalnız Cloudflare). İçeride servis kimliği yok: nginx → portfolio-service, portfolio-service → market-service, servisler → Kratos `whoami` kullanıcı çerezini iletip kullanıcı düzeyinde doğrulanıyor; servisin kendisi kanıtlanmıyor. Tek istisna Kratos → `/internal/sms` (`X-Api-Key`). Compose'taki `expose` bir kısıtlama değildir — ağdaki her container her porta ulaşır.

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
2. **Yeni cihazdan giriş e-postası:** "Hesabına yeni bir cihazdan girildi — sen değilsen diğer cihazlardan çık ve şifreni değiştir." Kratos'ta hazır değil: login `after` hook'unda `web_hook` ile portfolio-service'e bildirim (Kratos → `/internal/...`, mevcut SMS relay gibi API anahtarlı), servis cihazı daha önce görüp görmediğine bakıp Resend ile e-posta gönderir.

**Not.** "Yeni cihaz" tanımı (user agent + IP alt ağı mı, çerez tabanlı cihaz kimliği mi) tasarımda netleşmeli; yanlış tanım her girişte e-posta üretir.
