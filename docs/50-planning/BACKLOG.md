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
