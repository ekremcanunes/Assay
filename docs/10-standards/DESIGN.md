# Tasarım Sistemi — "Warm Editorial"

Tek sistem, üç yüzey: **landing** (`/landing`), **auth** (`/login`, `/register`), **panel** (giriş sonrası tüm sayfalar). Üçü de aynı token'ları, aynı tip ölçeğini ve aynı bileşen anatomisini kullanır. **Açık tema = Warm Editorial, koyu tema = Obsidian Pulse**; ikisi aynı token adlarıyla çalışır.

> Kaynak: [`web/src/index.css`](../../web/src/index.css) — tüm token'lar burada. **Önce token, sonra bileşen.**
> Tasarım girdisi: açık için [`sistem-warm-editorial-minimalism.md`](../60-design/sistem-warm-editorial-minimalism.md), koyu için [`sistem-obsidian-pulse.md`](../60-design/sistem-obsidian-pulse.md); ekranlar `mobil-01..05` ve `web-09-piyasa` (Piyasa web düzeni). Bu dosya onların projeye uyarlanmış, bağlayıcı özetidir.
> Canlı referans: `/landing` (oturumsuz açılır; açık/koyu sistem temasından).

> **Geçersiz:** VOLTAJ (beyaz + ink + magenta) ve ondan önceki LEDGER sistemleri kaldırıldı. `docs/superpowers/` altındaki eski spec'ler tarihsel kayıttır, bağlayıcı değildir.

---

## 1. Felsefe

- **Sakin kesinlik.** Rakamlar sakin otoriteyle sunulur; zarar bir analiz verisidir, kriz değil. Neon yeşil/kırmızı yok.
- **Porselen zemin, beyaz kart, 1px hairline.** Katmanlar ton farkı ve ince kenarlıkla ayrılır; kartta yalnızca algılanması zor bir ambient gölge.
- **Tek aksan: kobalt** (`primary`). Birincil aksiyon, aktif sekme/segment, seçili durum. Başka marka rengi yok.
- **Tek font ailesi** (Plus Jakarta Sans). Hiyerarşi ölçek + ağırlık + tracking'den gelir.
- **Rakamlar birinci sınıf.** Tabular rakam zorunlu, sütunlar hizalı. Mono yalnızca gerçek kodda.
- **Semantik vurgudan ayrı.** Kâr/zarar, kategori, uyarı ve marka birbirinin yerine geçmez.

---

## 2. Renk

Token'lar `hsl` üçlüsü olarak `:root` (açık) ve `.dark` (koyu) altında; Tailwind'e `@theme inline` ile `--color-*` olarak bağlı. **Bileşen hex yazmaz** — SVG/grafik gibi sınıf alamayan yerler `hsl(var(--token))` kullanır, böylece tema değişince kendiliğinden güncellenir.

### 2.1 Yüzeyler ve mürekkep

| Token | Açık | Koyu | Rol |
|-------|------|------|-----|
| `background` | `#FBFBFC` | `#090D16` | zemin (Tier 0) |
| `card` | `#FFFFFF` | `#0D1322` **%72 opak** | kart, alan (Tier 1) — koyuda zemin ışığı arkadan görünür |
| `popover` | `#FFFFFF` | `#162138` (opak) | modal, sheet, açılır menü, detay paneli (Tier 2–3) |
| `secondary` / `muted` / `accent` | `#F1F4F8` | `#1A2236` | segment oluğu, hover, ikincil yüzey |
| `border` | `#ECEEF2` | `#232B3D` (≈ beyaz %8) | hairline |
| `input` | `#CBD5E1` | `#2E3850` (≈ beyaz %14) | aktif/hover kenar, sheet tutamağı |
| `foreground` | `#0F172A` | `#E2E8F0` | birincil mürekkep |
| `muted-foreground` | `#475569` | `#94A3B8` | ikincil mürekkep, etiket |
| `veil` | slate %40 | siyah %40 | modal/sheet arkası perde (`bg-veil`) |

**Koyu temanın atmosferi** ([`index.css`](../../web/src/index.css)): `body` sağ üstte kobalt (%12), sol altta zümrüt (%8) çok hafif ışık taşır. Bu yüzden sayfa kökleri (`Layout`, auth, landing) **zemin rengi boyamaz** — ışığı yalnız `body` verir, yarı saydam kartlar onu gösterir. Açılır katmanlar kart değil `bg-popover` kullanır; yarı saydam kartla okunmaz olurlar.

### 2.2 Marka

| Token | Açık | Koyu | Anlam |
|-------|------|------|-------|
| `primary` (+`ring`) | `#1D4ED8` | `#3B82F6` | **Tek aksan.** Birincil buton, aktif sekme/segment, odak kenarı, seçili hap/satır, logo taban çizgisi |
| `primary-foreground` | `#FFFFFF` | `#FFFFFF` | aksan üstündeki metin |

Koyu temada dolu kobalt buton hafif ışıma yayar (`0 0 20px -4px` kobalt %45) — [`index.css`](../../web/src/index.css)'te tek kural, bileşen yazmaz.

### 2.3 Semantik

| Token | Açık | Koyu | Anlam |
|-------|------|------|-------|
| `up` | `#059669` | `#10B981` | Kâr — zümrüt ailesi |
| `down` | `#C2410C` | `#F43F5E` | Zarar — açıkta kiremit (düşüşü söyler, alarm vermez; yeşil–turuncu renk körü dostu), koyuda mercan |
| `warn` | `#A16207` | `#FBBF24` | Yumuşak uyarı, açıklama (kiremit zarardan ayrışsın diye amber) |
| `destructive` | `#C53030` | `#F43F5E` | Silme / sert uyarı — kâr/zarardan ayrı "tehlike" anlamı; açıkta kırmızı kalır |

Kâr/zarar iki temada **aynı ailedir**; metin, rozet, dağılım çubuğu ve **mum grafikleri** (fiyat grafiği, giriş görseli) aynı token'ı kullanır — ayrı grafik rengi yoktur.

**Fiyat grafiği kuralı** ([`PriceChart`](../../web/src/components/PriceChart.jsx)): mum gövdesi %85 opak, fitil ve kenar tam renk; hacim çubukları %35. Böylece kâr/zarar renkleri eşit sertlikte bağırmaz. Giriş görseli ([`AuthVisualScene`](../../web/src/components/AuthVisualScene.jsx)) çerçevesiz kalır — arkadaki ızgara animasyonuyla bütün; önüne kart/katman konmaz (2026-11-01 denendi, beğenilmedi). Görseldeki mumlar **dekorasyondur, veri değil**: açık temada marka paletiyle çizilir (yükselen kobalt, düşen açık slate `input`, ortalama mürekkep) — beyaz zeminde yeşil + turuncu + kobalt yarışıyordu. Koyu temada kâr/zarar renkleri kalır. Gerçek veri grafikleri (Piyasa, varlık detayı) her temada `up`/`down` kullanır.

Delta rozeti: **`.chip-up` / `.chip-down` / `.chip-neutral`** sınıfları (renkli metin + %10 yıkama; koyuda ayrıca %25 ince renkli kenar). Elle `bg-up/10 text-up` yazılmaz.

### 2.4 Kategori

Varlık türünü **ayırt etmek** için (ikon kutusu, nokta, dağılım çubuğu, takvim ısısı). Erişim: [`lib/assetColors.js`](../../web/src/lib/assetColors.js) → `catOf(type)` (`text`, `tint`, `dot`, `color`).

| Token | Açık | Koyu | Kategori |
|-------|------|------|----------|
| `cat-stock` | `#1D4ED8` | `#60A5FA` | Hisse |
| `cat-gold` | `#B58A3A` | `#E3B341` | Altın |
| `cat-fx` | `#565E74` | `#94A3B8` | Döviz |
| `cat-cash` | `#7C5CC4` | `#A78BFA` | Nakit |
| `cat-index` | `#AD5233` | `#FB923C` | Endeks |
| `cat-other` | `#94A3B8` | `#64748B` | Diğer |

> **Kural:** kategori rengi asla artı/eksi anlamı taşımaz; `up`/`down` asla kategori göstermez.

### 2.5 Tema

- Tercih: `light` · `dark` · `system` (varsayılan). [`ThemeContext`](../../web/src/contexts/ThemeContext.jsx) `<html>`'e `.dark` koyar, tercihi `localStorage.theme`'de tutar. Seçici tek bileşen: [`ThemeSwitch`](../../web/src/components/ThemeSwitch.jsx) — kenar çubuğu / mobil menü (etiketli), landing üst menüsü ve giriş/kayıt (`iconOnly`).
- İlk boyamada beyaz flaş olmasın diye [`index.html`](../../web/index.html)'deki küçük betik aynı kuralla sınıfı önceden koyar.
- Tailwind `dark:` varyantı `.dark` sınıfına bağlı (`@custom-variant dark`). Ama önce token: renk token'dan geliyorsa `dark:` yazmaya gerek yoktur.
- Token'ı JS'te okuyan yer ([`PriceChart`](../../web/src/components/PriceChart.jsx), [`AuthVisualScene`](../../web/src/components/AuthVisualScene.jsx) ızgarası) `useTheme().dark`'ı bağımlılık yapar; tema değişince yeniden kurulur.

---

## 3. Tipografi

| Rol | Font | Sınıf |
|-----|------|-------|
| Her şey (rakam dahil) | **Plus Jakarta Sans Variable** | `font-sans` (varsayılan); `font-display` ve `font-mono` aynı aile, adlar korundu |
| Yalnızca gerçek kod (`pre`, dosya adı) | **IBM Plex Mono** 400 | `font-code` |

Self-host (`@fontsource-variable/plus-jakarta-sans`, `@fontsource/ibm-plex-mono`), CDN yok. Tüm sayısal değerlere `.tabular` (`tabular-nums`).

### 3.1 Tip ölçeği

Ölçek [`index.css`](../../web/src/index.css)'te `--text-*`. **Ad-hoc boyut yazılmaz** (`text-[13.5px]`, `text-xs`, `text-lg` yok).

| Sınıf | px | Ağırlık | Nerede |
|-------|----|---------|--------|
| `text-micro` | 11 | 400–600 | mikro metin, çip, rozet |
| `text-ui` | 13 | 400–600 | **varsayılan** — UI, tablo hücresi, buton |
| `text-body` | 15 | 400–600 | gövde, form alanı, liste satırı adı |
| `text-figure` | 18 | 600–700 | kart değeri, modal başlığı |
| `text-head` | 24 | 700 | bölüm başlığı, mobil sayfa başlığı, varlık sembolü |
| `text-title` | 32 | 700 | sayfa başlığı (md+), ana KPI (net varlık, güncel fiyat) |
| `text-display` | 44 | 700 | **yalnızca landing** bölüm başlığı |
| `text-hero` | 60 | 700 | **yalnızca landing** h1 |

Büyük basamaklarda negatif tracking ölçeğin içinde tanımlı; elle `tracking-tight` eklenmez.

**`.label`** — 600 + uppercase + `0.06em` tracking, 11px. Eyebrow, KPI etiketi, form alanı etiketi (`ui/label`), tablo başlığı: hepsi bu tek sınıf.

**Ölçek dışı izinli iki istisna** (başka yerde kullanılmaz):

| Nerede | Boyut | Neden |
|--------|-------|-------|
| Mobilde auth form alanı yazısı ([`authStyles`](../../web/src/lib/authStyles.js) ve önek) | 16px (`text-[16px] md:text-body`) | iOS Safari 16px altı alana odaklanınca sayfayı yakınlaştırır |
| Fiyatlı takvim hücresindeki kısa fiyat ([`PriceCalendar`](../../web/src/components/PriceCalendar.jsx)) | 9.5px | 7 sütunlu ızgarada hücreye sığmak zorunda |

**Şirket adı ikincil metin değildir.** Sembolün altındaki şirket adı `text-foreground` — sembolden yalnız boy ve ağırlıkla ayrılır, gri yazılmaz.

> **Dikkat:** ölçek sınıfları Tailwind'in varsayılan adları değil. [`lib/utils.js`](../../web/src/lib/utils.js)'teki `cn()` bunları `extendTailwindMerge` ile `font-size` grubuna kaydeder. **Yeni basamak eklenirse oraya da eklenmeli.**

---

## 4. Şekil, derinlik, aksan dozu

### 4.1 Köşe

| Öğe | Köşe | Sınıf |
|-----|------|-------|
| Delta rozeti, küçük etiket | 6px | `rounded-sm` |
| Segment dilimi, ikon kutusu, küçük düğme | 8px | `rounded-lg` / `rounded-md` |
| Buton, form alanı, segment oluğu | 10px | `rounded-[10px]` |
| Kart, panel, liste kutusu | 12px | `rounded-xl` |
| Masaüstü modal, büyük bant | 16px | `rounded-2xl` |
| Alt sayfa (sheet) üst köşeleri | 20px | `rounded-t-sheet` |
| Hap / filtre çipi | tam | `rounded-full` |

### 4.2 Derinlik (gölge)

Gölge yalnızca token'dan, üç kademe — `shadow-*` varsayılanları kullanılmaz:

| Sınıf | Nerede |
|-------|--------|
| `shadow-card` | kart (hairline'ı canlandıran, neredeyse görünmez ambient) |
| `shadow-sheet` | alttan açılan sheet |
| `shadow-float` | açılır menü, masaüstü modal, dolu bant |

Koyu temada gölge siyaha döner ve pratikte görünmez; ayrımı `border`, yarı saydam yüzey ve zemin ışığı taşır.

### 4.3 Aksan (kobalt) dozu

- ✅ Birincil buton dolgusu, aktif sekme/segment/nav metni ve noktası, odak kenarı, seçili hap yıkaması (`bg-primary/10 text-primary`), metin bağlantısı, landing bölüm etiketi, logo taban çizgisi.
- ✅ Sayfa başına **en fazla bir** dolu aksan bandı (landing kapanışı).
- ❌ Uyarı/hata anlamı (o `warn`/`destructive`'in işi), kâr/zarar, büyük gövde metni.

---

## 5. Bileşen anatomisi

### 5.1 Buton ([`ui/button`](../../web/src/components/ui/button.jsx), [`Page`](../../web/src/components/Page.jsx))

| Tür | Görünüm |
|-----|---------|
| Birincil | `bg-primary text-primary-foreground`, 10px, form CTA'sı 48px (`h-12`) |
| İkincil | `bg-card border border-border`, hover `bg-secondary` |
| Tehlike | yıkama: `bg-down/10 text-down`; onay modalındaki son adım dolu `bg-destructive` |
| Başlık aksiyonu | `PrimaryAction` / `GhostAction` — 36px |

### 5.2 Alan (input)

`bg-card` + `border border-border` + 10px köşe, 48px yükseklik, `text-body`. Hover `border-input`, odakta `border-primary` — **dış parlama yok**. Etiket üstte `.label`. Ortak auth stilleri: [`lib/authStyles.js`](../../web/src/lib/authStyles.js) (mobilde 52px + 16px yazı). Her alana `autoComplete` / `inputMode`.

Checkbox 20px, seçilince dolu kobalt.

### 5.3 Segment ve hap

- **Segment** (tür seçici, grafik aralığı, tema): oluk `bg-secondary p-1 rounded-[10px]`; aktif dilim `bg-card border-border shadow-card font-bold`, pasif `text-muted-foreground`.
- **Hap** (döviz, para birimi, sıralama): `rounded-full border`; seçili `border-primary/30 bg-primary/10 text-primary`.

### 5.4 Kart ve liste

- Kart: `rounded-xl border border-border bg-card shadow-card`, iç boşluk 16px (`p-4`). Blok için [`Section`](../../web/src/components/Section.jsx) (başlık + meta + aksiyon).
- KPI: `.label` üstte → değer (`text-title`/`text-figure`, `.tabular`, bold) → altta rozet.
- Liste satırı: ≥44px; solda kategori tonunda monogram kutusu (`rounded-lg`, `catOf().tint/text`), sembol `text-body font-semibold`, sağda değer + delta.
- Dağılım: 6px yüksek segment çubuğu (`rounded-full`, dilimler `catOf().dot`) + lejant.

### 5.5 Sayfa iskeleti

- Her panel sayfası [`Page`](../../web/src/components/Page.jsx): yapışkan başlık (`bg-background/90` + blur, alt hairline) + padding'li gövde.
- Kenar çubuğu (md+): `bg-card`, aktif öğe `.nav-active` + `text-primary`. Altta saat, tema seçici, dil, kullanıcı kartı.
- Modal: ortak [`ui/modal`](../../web/src/components/ui/modal.jsx) — mobilde alttan sheet (tutamak 36×4px `bg-input`), md+ ortada pencere. `window.confirm` yerine de bu.
- Varlık detayı: [`AssetDrawer`](../../web/src/components/AssetDrawer.jsx) — mobilde sheet, md+ sağ panel, genişletilince iki kolonlu tam ekran.
- Tam ekran yükleniyor: [`PageLoader`](../../web/src/components/PageLoader.jsx) — yazısız halka (`border-t-primary`), metin yalnız ekran okuyucuya.

### 5.6 Ekran yapıları

- **Özet:** net varlık KPI kartı + dağılım kartı (segment çubuğu + 3 kategori kutusu).
- **Portföy:** kategori kartları alt alta (md+ üç sütun; ad, adet, pay rozeti, değer + K/Z, temsilci seri, pay çubuğu) + aynı sayfada tüm varlıklar listesi. Karta dokununca `/assets/<kategori>` detayına büyür ([`CategoryCard`](../../web/src/components/CategoryCard.jsx) → [`StoryHero`](../../web/src/components/StoryHero.jsx), View Transitions).
- **Piyasa:** iki sekme — Borsa · Altın & Döviz (`?tab=goldfx`, yenileyince aynı sekme); başlıkta BIST 100 ve USD/TRY mini göstergesi (md+).
  - Borsa: nabız kartı (BIST 100 + son 30 gün alan grafiği, yorum + BIST 30 endeksi, yükselen/sabit/düşen çubuğu, öne çıkan 3 hisse: en çok yükselen / düşen / hacim lideri) → BIST 30 tablosu (segment sıralama + arama başlıkta; gün aralığı ve 52H konum çubukları).
  - **lg+:** iki sütun; sağda seçili hissenin sabit paneli ([`StockDetail`](../../web/src/components/market/StockDetail.jsx)): fiyat + dünkü kapanış, aralık sekmeli grafik, dönem getirisi (1 ay / 3 ay / 1 yıl, 1 yıllık seriden), gün içi aralık ve 52H konum **çubuk + düz cümle** ("zirvenin %17 altında, dipten %43 yukarıda"), günlük hacim + BIST 30 hacim sırası, "Portföyüme ekle". Bilmeyen birine rakam tek başına bırakılmaz. İlk açılışta en çok yükselen seçili; seçili satır kobalt yıkama + solda 3px kobalt. Daha dar ekranda satır kayan paneli (`AssetDrawer`) açar.
  - Altın & Döviz: 4 kur kutusu (yöne göre renkli mini alan grafiği) → sarrafiye tablosu + 30 günlük değişim (tüm seriler kendi başlangıcına göre %, tek grafik).
- **Alım:** tür segmenti → varlık → miktar → tarih (fiyatlı takvim) → birim fiyat → o gün/bugün kutuları → toplam kartı; ana eylem altta sabit.

- **Durum şeridi** ([`StatusBar`](../../web/src/components/StatusBar.jsx), md+, tüm panel sayfalarının en üstü): solda BIST açık/kapalı + "Fiyatlar 18:10 itibarıyla"; sağda ortam, bölge, veritabanı sağlayıcısı + ping, API gidiş-dönüşü, sürüm. **Hepsi gerçek veri** (§6) — seans Yahoo'nun seans sınırlarından tarayıcı saatiyle, sistem bilgisi `/api/system/status`'tan.

### 5.7 Yardımcı sınıflar ([`index.css`](../../web/src/index.css))

`.label`, `.tabular` (§3) · `.nav-active` · `.paper` (34px hairline ızgara + radyal maske; landing hero'su, auth zemini — [`AuthVisual`](../../web/src/components/AuthVisual.jsx) ızgarası buna hizalı) · `.press` (basınca `scale(.97)`) · `.modal-in`, `.rise`, `.step-in` · `@keyframes flow`, `wire-fill`. Hepsi `prefers-reduced-motion`'a saygılı.

Logo: [`AssayMark`](../../web/src/components/AssayMark.jsx) — satır içi SVG, "A" `currentColor`, taban çizgisi `primary`. `<img>` olarak eklenmez (koyu temada görünmez olur).

### 5.8 Geçişler

110ms + `cubic-bezier(0,0,.38,.9)`. Sayfalar arası kart büyümesi **View Transitions API** ile (`navigate(to, { viewTransition: true })` + aynı `view-transition-name`); desteklemeyen tarayıcıda animasyonsuz açılır.

### 5.9 Mobil

Tek kod tabanı, önce mobil. Sınır **`md`**: altı telefon, üstü masaüstü. Farklı biçim gerekiyorsa iki dal `md:hidden` / `hidden md:block`.

- **Gezinme:** alt çubuk 64px, 4 sekme — Özet · Portföy · Piyasa · Menü; aktif sekme kobalt + altta nokta; çentik payı `env(safe-area-inset-bottom)`. Masaüstünde kenar çubuğu.
- **Kaydırma:** mobilde belge kayar. Yeni sayfa en üstten açılır; geri tuşunda tarayıcı eski konumu getirir ([`Layout`](../../web/src/components/Layout.jsx)).
- **Kenar boşluğu 16px**, bloklar arası 12–16px. Kart içinde kart yok.
- **Ana eylem altta sabit:** Al, Giriş yap, Hesap oluştur — alt çubuğun / ekranın hemen üstünde, eylemi yazar ("25 gram al").
- **Dokunma alanı ≥ 44px.**
- **Açılır katmanlar** (sheet, modal, takvim) sayfa köküne çizilir (`createPortal`); `transform` taşıyan ata `fixed` öğeyi kendine göre konumlar, portal bunu önler. Açıkken arka sayfa kaymaz, odak katmana geçer.
- **Tekrarı azalt:** masaüstündeki tekrarlı içerik mobilde özet biçime iner (ızgara, dikey adımlar, katlanır liste).
- **Kontrol:** her ekran 360 / 375 / 390 genişlikte yatay taşma (`scrollWidth === innerWidth`) ve iki temada taranır.

---

## 6. Veri dürüstlüğü

Bunlar renk ya da font değil, **anlam** taşır. Palet değişse de geçerlidir.

- Elimizde olmayan piyasa verisi **uydurulmaz, mock'lanmaz**: sektör, F/K, PD/DD, piyasa değeri, temettü, emir defteri, haber akışı, duyarlılık skoru. Tasarım girdilerinde bunlar olsa bile ekrana gelmez.
- **Yapay zekâ özeti kartları gösterilmez** — arkasında bir servis yok. Servis gelince kart, "yatırım tavsiyesi değildir" notuyla eklenir.
- BIST 30 içi arama **client-side filtredir**; boş dönerse `/market/search` ile tüm BIST evreni önerilir.
- Piyasa sembolleri Postgres'te tutulmaz; DB yalnızca portföy ve işlemler içindir.
- **Canlandırma gerçek veri gibi sunulmaz.** Landing "Fiyat sor" demosunda "Canlandırma · gerçek istek değil" yazar. Rastgele üretilip canlı log gibi akan kutu **yasak**.
- Kategori kartındaki grafik **portföy değeri değil**, kategorinin temsilci serisidir (BIST 100, USD/TRY, gram altın) — altında etiketle yazılır.

---

## 7. YAPMA listesi

- ❌ Ad-hoc renk (`gray-950`, `#111`, `text-white`) — sadece token. Dolu renkli zemin üstünde metin için `text-card` / `*-foreground`.
- ❌ `bg-foreground/50` gibi perde — `bg-veil` (koyu temada `foreground` açık renktir).
- ❌ Ad-hoc boyut veya Tailwind varsayılanı (`text-xs`, `text-lg`) — §3.1.
- ❌ Elle `text-[11px] uppercase tracking-…` — `.label`.
- ❌ Rakamı `tabular-nums`'suz yazmak — `.tabular`.
- ❌ Etiket, rakam veya cümlede mono — `font-code` yalnızca gerçek kodda.
- ❌ Tailwind varsayılan gölgesi (`shadow`, `shadow-lg`) veya koyu, dağınık gölge — §4.2.
- ❌ Odakta dış parlama/halka ile alan vurgusu — kenar `border-primary` olur.
- ❌ İkinci marka rengi; kobaltı uyarı, kâr/zarar ya da kategori anlamında kullanmak — §4.3.
- ❌ Sayfada birden fazla dolu aksan bandı.
- ❌ Logoyu `<img>` ile eklemek — `AssayMark`.
- ❌ Sayfayı `Page` olmadan yazmak; ad-hoc `<h1>`.
- ❌ Elimizde olmayan veriyi uydurmak (§6).
- ❌ `window.confirm` — ortak `Modal`.
- ❌ Mobilde 16px altı auth alanı (iOS yakınlaştırır).
- ❌ Kart içinde kart.
- ❌ `transform`/animasyon taşıyan kabın içine `fixed` panel/modal — portal kullan.
- ❌ Token'ı JS'te okuyup temaya bağlamamak — `useTheme().dark` bağımlılığı (§2.5).
