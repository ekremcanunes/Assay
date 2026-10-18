# Mobil Dönüşüm Faz 2 — Landing, Giriş, Kayıt

*Tarih: 2026-10-17 · Dal: `mobil-design` · Mockup (onaylı v3): https://claude.ai/artifact/Gk6KzhnyUeMQHMUYnpBpxA*

## 1. Amaç

Landing ve auth sayfaları masaüstü için tasarlanmış, mobilde yalnızca daraltılmış durumda. Landing iPhone SE'de ~12.300px (18 ekran); teknolojiler iki kez anlatılıyor, teknoloji detayı listenin altında kayboluyor, giriş formu kart içinde ve 13px yazıyla iPhone'da odakta yakınlaştırma yapıyor.

Başarı ölçütü:
- Landing mobilde ≈ 6 ekran, yatay taşma yok, her bölüm tek elle okunur.
- Giriş/kayıt mobilde kartsız, alanlar 16px (iOS yakınlaştırmaz), buton altta sabit.
- **Masaüstü düzeni değişmez** — yalnızca §2'deki ortak içerik kararları (iki yüzeyde de geçerli).

## 2. Ortak kararlar (mobil + masaüstü)

| Karar | Gerekçe |
|---|---|
| "Panel" kelimesi kullanıcıya görünen hiçbir metinde yok. Hero'da ayrı kayıt butonu yok (üst menüdeki "Kayıt ol" yeterli — 2026-10-17). Oturum açıksa butonlar "Uygulamaya git" → `/overview` | Kullanıcı kararı |
| Hero başlığı **"Hisse, altın ve döviz. Hepsi tek defterde."**, alt metin "Yatırımlarımı tuttuğum bu uygulamayı, modern bir yazılımın nasıl kurulduğunu öğrenirken yazdım. Nasıl yapıldığı da burada." | Geçici; kullanıcı sonra değiştirecek |
| Hero'daki rastgele üretilen "market-service · stdout" kutusu kalkar, yerine **"Fiyat sor"** (`PriceDemo`) gelir | Rastgele log gerçek gibi duruyordu (DESIGN.md veri dürüstlüğü). Masaüstünde de aynı kutunun yerine geçer, ayrı tasarım yok |

## 3. Landing — mobil (`< md`)

Sıra ve biçim (mockup L1):

1. **Nav:** logo · "Giriş" (metin) · "Kayıt ol" (buton). Mobil ☰ menü ve açılır bağlantı listesi kalkar.
2. **Hero:** başlık mobilde ≈30px (2 satır), alt metin, metin bağlantısı "Bir istek nereden geçiyor ↓" (`#akis`). Kayıt butonu yok.
3. **PriceDemo** (§5).
4. **Sayılar:** 4 sayı tek satır, küçük boy.
5. **"Üzerinde çalıştığı yığın" bölümü mobilde gizli** (ikon ızgarası + 3 tablo). İçeriği §3.8'deki ızgarada ve teknoloji sayfalarında.
6. **01 Kapsam:** kartlar yatay kaydırılır, **ekranda tek kart** (yan kartın kenarı görünmez), `scroll-snap`, altta nokta göstergesi. Portföy `CardRail` mantığı, ayrı küçük bileşen (oklar yok).
7. **02 Akış:** geniş SVG + docker-compose kutusu + 3 kart yerine **dikey adımlar** (Tarayıcı → nginx → Kratos → market-service/Redis HIT → Dış kaynak MISS), her adım bir cümle.
8. **03 Gerekçe:** solda liste/sağda detay yerine **2 sütun teknoloji ızgarası** (ikon, ad, rol). İçeriği olmayanlar soluk. Dokununca **teknoloji sayfası** açılır (§4).
9. **"Defterini aç" (eski Panel) bölümü mobilde gizli** — kapanış bandı aynı işi görüyor.
10. **04 Ödünler:** **akordeon** (başlıklar; biri açık).
11. **Kapanış bandı + footer:** aynı.

Masaüstü (`md+`): mevcut düzen; yalnız §2 değişiklikleri ve "Defterini aç" bölümündeki "Panel" eyebrow'u "Başla" olur.

## 4. Teknoloji sayfası — `/landing/tech/:slug` (yeni, herkese açık)

- Route korumalı alanın dışında (`App.jsx`, `/landing` yanında). Geçersiz slug → `/landing`.
- Üst çubuk: geri (← ; geçmiş varsa `navigate(-1)`, yoksa `/landing#entegrasyon`) + "Teknolojiler · 6 / 12".
- Hero kartı: ikon, ad, rol, `tagline` ("Ne işe yarıyor").
- Gövde, **mevcut `lib/stack.jsx` detay verisinden** (yeni içerik yazılmaz):
  - `why[]` → **"Neden bunu seçtik"**
  - `blocks[]` (warn hariç) → **"Assay'da nasıl"**; `code` blokları ve blok içi kodlar **"Teknik ayrıntı · Göster"** ile kapalı gelir; `MiniTable` mobilde yatay kaydırılabilir kalır.
  - `kind: 'warn'` blokları → **"Ne öğrendik"**
  - `files`, `doc` → en altta küçük "İlgili dosyalar".
  - Detayı olmayan teknoloji: "Henüz yazılmadı" kartı.
- Alt çubuk: ‹ Önceki / Sonraki › (TECH sırası, döngüsel).
- Kartın sayfaya büyümesi `viewTransition` ile (Portföy'deki gibi); desteklemeyen tarayıcıda animasyonsuz.
- Masaüstünden de açılabilir (tek kolon, `max-w-2xl`); masaüstü landing'i yine yerinde detay gösterir.

**Kapsam dışı:** detay metinlerinin sade dille yeniden yazılması — içerik işi, kullanıcıyla ayrıca (mockup'taki örnek metinlerdeki bazı ayrıntılar uydurmaydı, kullanılmaz).

## 5. `PriceDemo` — "Bir fiyat iste, nereden geldiğini gör"

- Semboller: THYAO, GRAM, USD (hap düğmeler). Rota: Sen → Assay → kaynak.
- İlk dokunuş: kaynak = dış kaynak (Yahoo / Frankfurter), kırmızı, ~200–280 ms; cevap altında "● 5 dk önbellekte · tekrar dokun".
- Aynı sembole sonraki dokunuş: kaynak = önbellek, yeşil, ~2 ms, "Dış kaynağa hiç gidilmedi."
- Fiyatlar **sabit örnek değer**; altta açık etiket: **"Canlandırma · gerçek istek değil"**.
- `prefers-reduced-motion`: çizgi animasyonu yok, sonuç anında.
- Saf mantık (`lib/priceDemo.js`: sembol → sonuç üretimi) DOM'dan ayrı.
- Gerçek ölçümle besleme (giriş gerektirmeyen uç nokta) → BACKLOG.

## 6. Giriş / Kayıt / Kod adımı — mobil (`< md`)

- Kart çerçevesi (`edge-accent`, kenarlık, `max-w-[360px]`) yalnızca `md+`. Mobilde ekranın tamamı form, `p-5`.
- Üst satır (giriş/kayıt): logo · sağda "← Assay nedir?". Alttaki "Assay nedir?" bağlantısı mobilde kalkar. Kod adımındaki "Başka hesap" bağlantısı mevcut yerinde kalır.
- Alanlar: yükseklik 52px, **yazı 16px** (`text-[16px] md:text-ui`). Stil VOLTAJ auth kuralında kalır (yüzey dolgusu + alt kenarlık, çerçeve yok) — mockup'taki çerçeveli alanlar kurala aykırıydı, uygulanmaz.
- `autoComplete`: `email`, `current-password`, `new-password`, `given-name`, `family-name`, `tel-national`; e-postada `inputMode="email"`.
- Şifre göster/gizle: ikon yerine **"Göster / Gizle"** metin düğmesi (mobil ve masaüstü).
- **Buton altta sabit** (`sticky bottom-0` + safe-area), altında "Hesabın yok mu? Kayıt ol" / "Zaten hesabın var mı? Giriş yap".
- **Kayıt (A, tek sayfa):** Ad/Soyad yan yana (`grid-cols-2`, `minmax(0,1fr)`), telefon alanında sabit **+90** öneki (kullanıcı 10 hane yazar; `toE164TR` zaten kabul ediyor), şifre altında canlı kural "○/✓ En az 8 karakter", onay satırı 44px dokunma alanı.
- **Kod adımı:** kutular 56px; `one-time-code` + 6. hanede otomatik doğrulama **zaten var**, korunur. "Kodu yapıştır" düğmesi eklenmez.
- Kratos akışı, doğrulama kuralları, hata metinleri **değişmez** — yalnız görünüm.

## 7. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `lib/authStyles.js` | mobil alan/etiket/buton sınıfları |
| `pages/Login.jsx`, `pages/Register.jsx`, `components/CodeStep.jsx` | mobil yerleşim, sabit buton, +90, şifre kuralı, autocomplete |
| `components/landing/PriceDemo.jsx` + `lib/priceDemo.js` | yeni |
| `components/landing/SnapRail.jsx` | yeni (tek kart, noktalı) |
| `pages/Landing.jsx` | §2–§3; mobil/masaüstü dalları `md:` sınıflarıyla |
| `pages/LandingTech.jsx` | yeni (§4) |
| `App.jsx` | `/landing/tech/:slug` |
| `contexts/LanguageContext.jsx` | auth'taki yeni metinler (Göster/Gizle, şifre kuralı) |

## 8. Uygulama sırası (her adım sonrası kullanıcı onayı)

1. **Auth:** Giriş + Kayıt + Kod adımı (§6).
2. **Landing üst kısım:** §2 kararları, nav, hero, PriceDemo, sayılar.
3. **Landing bölümleri:** kapsam rayı, dikey akış, teknoloji ızgarası, akordeon, mobilde gizlenenler.
4. **Teknoloji sayfası** (§4).
5. **Kapanış:** Playwright taraması (3 cihaz, landing/login/register/tech, `scrollW === vw`), lint/build; kullanıcı kontrolü. Commit kullanıcının açık onayıyla.

## 9. Test

Kalıcı test yok (kullanıcı kararı). Her adımda geçici Playwright kontrolü + ekran görüntüsü, sonra silinir. Login/Register akışı için gerçek giriş codegen penceresinde kullanıcı tarafından yapılır.

## 10. BACKLOG'a gidecekler

- PriceDemo'yu gerçek ölçümle besleyen, giriş istemeyen uç nokta.
- Teknoloji detay metinlerinin sade dille yeniden yazılması (kullanıcıyla).
- Faz 1'den kalanlar: eski takvim fiyat uç noktası, hacim dropdown, öne çıkanlar sayfası, masaüstü sidebar, Analiz yeniden tasarım, Inter kalınlığının gerçek iPhone'da doğrulanması.
