# Tasarım Sistemi — "Warm Editorial"

Bu standart web arayüzünün görsel kurallarını tutar: landing, auth ve panel. Açık tema Warm Editorial, koyu tema Obsidian Pulse adını taşır.
Ekranların içeriği ve davranışı burada değil, [`SCREENS.md`](../20-modules/SCREENS.md)'dedir. Yazım kuralları [`WRITING.md`](WRITING.md)'dedir.
Değerlerin kaynağı [`web/src/index.css`](../../web/src/index.css)'tir. Doküman ile kod çelişirse kod doğrudur (`YZ-14`).

---

## İndeks

| Önek | Konu | Bölüm |
|------|------|-------|
| `IL` | İlke | §1 |
| `RN` | Renk | §2 |
| `TM` | Tema | §3 |
| `TP` | Tipografi | §4 |
| `KS` | Köşe | §5 |
| `GL` | Gölge | §6 |
| `AK` | Aksan (kobalt) | §7 |
| `BL` | Bileşen | §8 |
| `HR` | Hareket | §9 |
| `MB` | Mobil | §10 |
| `VR` | Veri dürüstlüğü | §11 |

## Terimler

| Terim | Anlam |
|-------|-------|
| token | `index.css`'te tanımlı CSS değişkeni. Tailwind'de `--color-*`, `--text-*`, `--radius-*`, `--shadow-*` olarak bağlıdır. |
| hairline | 1px `border-border` kenar. |
| yıkama | Rengin `%10` opak arka planı + aynı renkte metin. Ör. `bg-primary/10 text-primary`. |
| segment | Oluk içinde tek seçimli dilimler. Ör. tür seçici, grafik aralığı. |
| hap | `rounded-full` tek seçimli düğme. Ör. döviz, para birimi. |
| sheet | Mobilde alttan açılan katman. |
| açılır katman | Modal, sheet, açılır menü, takvim. |
| bant | Sayfa genişliğinde dolu renkli blok. |

---

## §1 İlke

- `IL-01` Tek aksan rengi kullan: `primary` (kobalt). Başka marka rengi ekleme.
- `IL-02` Tek font ailesi kullan: Plus Jakarta Sans. Hiyerarşiyi boyut ve ağırlıkla kur.
- `IL-03` Katmanları zemin tonu ve hairline ile ayır. Gölgeyi yalnız §6 token'larıyla ekle.
- `IL-04` Kâr/zarar, kategori, uyarı ve marka renklerini birbirinin yerine kullanma.
- `IL-05` Zararı alarm renkleriyle gösterme. Neon yeşil ve neon kırmızı kullanma.

---

## §2 Renk

- `RN-01` Bileşende yalnız token sınıfı kullan. Hex, `gray-*`, `text-white` yazma.
- `RN-02` Sınıf alamayan yerde (SVG, grafik) `hsl(var(--token))` kullan.
- `RN-03` Dolu renkli zemin üstündeki metinde `text-card` veya `*-foreground` kullan.
- `RN-04` Modal ve sheet arkasındaki perdede `bg-veil` kullan. `bg-foreground/50` yazma. Neden: koyu temada `foreground` açık renktir.

### Yüzey ve mürekkep

| Token | Açık | Koyu | Rol |
|-------|------|------|-----|
| `background` | `#FBFBFC` | `#090D16` | zemin |
| `card` | `#FFFFFF` | `#0D1322`, opaklık `0.72` (`--card-alpha`) | kart, alan |
| `popover` | `#FFFFFF` | `#162138` | açılır katman, detay paneli |
| `secondary` / `muted` / `accent` | `#F1F4F8` | `#1A2236` | segment oluğu, hover, ikincil yüzey |
| `border` | `#ECEEF2` | `#232B3D` | hairline |
| `input` | `#CBD5E1` | `#2E3850` | hover kenarı, sheet tutamağı |
| `foreground` | `#0F172A` | `#E2E8F0` | birincil metin |
| `muted-foreground` | `#475569` | `#94A3B8` | ikincil metin, etiket |
| `veil` | slate `%40` | siyah `%40` | perde |

### Marka

| Token | Açık | Koyu | Rol |
|-------|------|------|-----|
| `primary`, `ring` | `#1D4ED8` | `#3B82F6` | tek aksan (§7) |
| `primary-foreground` | `#FFFFFF` | `#FFFFFF` | aksan üstündeki metin |

### Semantik

| Token | Açık | Koyu | Rol |
|-------|------|------|-----|
| `up` | `#059669` | `#10B981` | kâr |
| `down` | `#C2410C` | `#F43F5E` | zarar |
| `warn` | `#A16207` | `#FBBF24` | yumuşak uyarı, açıklama |
| `destructive` | `#C53030` | `#F43F5E` | silme, sert uyarı |

- `RN-05` Kâr/zarar metninde, rozetinde, çubuğunda ve veri grafiğinde yalnız `up` / `down` kullan.
- `RN-06` Delta rozetinde `.chip-up`, `.chip-down`, `.chip-neutral` kullan. `bg-up/10 text-up` yazma.
- `RN-07` Silme ve sert uyarıda `destructive` kullan. Kâr/zararda kullanma.

### Kategori

Erişim: [`lib/assetColors.js`](../../web/src/lib/assetColors.js) → `catOf(type)` → `text`, `tint`, `dot`, `color`.

| Token | Açık | Koyu | Kategori |
|-------|------|------|----------|
| `cat-stock` | `#1D4ED8` | `#60A5FA` | Hisse |
| `cat-gold` | `#B58A3A` | `#E3B341` | Altın |
| `cat-fx` | `#565E74` | `#94A3B8` | Döviz |
| `cat-cash` | `#7C5CC4` | `#A78BFA` | Nakit |
| `cat-index` | `#AD5233` | `#FB923C` | Endeks |
| `cat-other` | `#94A3B8` | `#64748B` | Diğer |

- `RN-08` Kategori rengini yalnız varlık türünü ayırmak için kullan. Artı/eksi anlamı verme.
- `RN-09` `up` / `down` ile kategori gösterme.

### Grafik

- `RN-10` Fiyat grafiğinde mum gövdesini `0.85`, hacim çubuğunu `0.35` opaklıkla çiz. Fitil ve kenar tam renk. Bkz. [`PriceChart`](../../web/src/components/PriceChart.jsx).
- `RN-11` Giriş görselindeki ([`AuthVisualScene`](../../web/src/components/AuthVisualScene.jsx)) mumlar veri değildir. Açık temada yükselen `primary`, düşen `input` ile çiz. Koyu temada `up` / `down` kullan.
- `RN-12` Giriş görselinin önüne kart veya katman koyma.

---

## §3 Tema

- `TM-01` Tema tercihi üç değer alır: `light`, `dark`, `system`. Varsayılan `system`.
- `TM-02` [`ThemeContext`](../../web/src/contexts/ThemeContext.jsx) `<html>`'e `.dark` sınıfını koyar. Tercihi `localStorage.theme`'de tutar.
- `TM-03` Tema seçici olarak yalnız [`ThemeSwitch`](../../web/src/components/ThemeSwitch.jsx) kullan.
- `TM-04` Renk token'dan geliyorsa `dark:` varyantı yazma.
- `TM-05` Token'ı JS'te okuyan bileşende `useTheme().dark`'ı bağımlılık yap. Neden: tema değişince yeniden çizilir.
- `TM-06` Sayfa köklerinde (`Layout`, auth, landing) zemin rengi verme. Neden: koyu temadaki zemin ışığını `body` verir.
- `TM-07` Açılır katmanda `bg-popover` kullan. `bg-card` kullanma. Neden: koyu temada `card` yarı saydamdır.

Koyu tema `body` zemini: sağ üstte `#3B82F6` `%12`, sol altta `#10B981` `%8` radyal ışık. Dolu kobalt buton koyu temada `0 0 20px -4px` kobalt `%45` ışıma alır. İkisi de `index.css`'tedir; bileşen yazmaz.

---

## §4 Tipografi

| Sınıf | Font | Kullanım |
|-------|------|----------|
| `font-sans` (varsayılan) | Plus Jakarta Sans Variable | tüm metin ve rakam |
| `font-code` | IBM Plex Mono 400 | yalnız gerçek kod (`pre`, dosya adı) |

- `TP-01` Fontları self-host kullan (`@fontsource`). CDN ekleme.
- `TP-02` Etiket, rakam ve cümlede `font-code` kullanma.
- `TP-03` Her sayısal değere `.tabular` ekle.
- `TP-04` Yalnız aşağıdaki ölçek sınıflarını kullan. `text-xs`, `text-lg`, `text-[13px]` yazma.
- `TP-05` `tracking-tight` ekleme. Neden: negatif tracking ölçek token'ında tanımlıdır.
- `TP-06` Ölçeğe basamak eklersen [`lib/utils.js`](../../web/src/lib/utils.js) içindeki `extendTailwindMerge` listesine de ekle.

| Sınıf | px | Ağırlık | Kullanım |
|-------|----|---------|----------|
| `text-micro` | 11 | 400–600 | çip, rozet, mikro metin |
| `text-ui` | 13 | 400–600 | varsayılan: UI, tablo hücresi, buton |
| `text-body` | 15 | 400–600 | gövde, form alanı, liste satırı adı |
| `text-figure` | 18 | 600–700 | kart değeri, modal başlığı |
| `text-head` | 24 | 700 | bölüm başlığı, mobil sayfa başlığı, varlık sembolü |
| `text-title` | 32 | 700 | md+ sayfa başlığı, ana KPI |
| `text-display` | 44 | 700 | yalnız landing bölüm başlığı |
| `text-hero` | 60 | 700 | yalnız landing h1 |

- `TP-07` Eyebrow, KPI etiketi, form etiketi ve tablo başlığında `.label` kullan. `text-[11px] uppercase tracking-*` yazma.
- `TP-08` Sembolün altındaki şirket adını `text-foreground` yaz. Gri yazma.
- `TP-09` Ölçek dışı yalnız iki istisna var:

| Yer | Değer | Neden |
|-----|-------|-------|
| Mobil auth alanı ([`authStyles`](../../web/src/lib/authStyles.js)) | `text-[16px] md:text-body` | iOS Safari 16px altı alanda sayfayı yakınlaştırır. |
| Fiyatlı takvim hücresi ([`PriceCalendar`](../../web/src/components/PriceCalendar.jsx)) | 9.5px | 7 sütunlu ızgaraya sığar. |

---

## §5 Köşe

| Öğe | Sınıf | px |
|-----|-------|----|
| delta rozeti, küçük etiket | `rounded-sm` | 6 |
| checkbox | `rounded-md` | 8 |
| buton, form alanı, segment oluğu | `rounded-[10px]` | 10 |
| segment dilimi, ikon kutusu, küçük buton (`size="sm"`) | `rounded-lg` | 12 |
| kart, panel, liste kutusu | `rounded-xl` | 12 |
| masaüstü modal, büyük bant | `rounded-2xl` | 16 |
| sheet üst köşeleri | `rounded-t-sheet` | 20 |
| hap, filtre çipi | `rounded-full` | — |

- `KS-01` Köşeyi yukarıdaki tablodan seç. Başka değer yazma.

---

## §6 Gölge

| Sınıf | Kullanım |
|-------|----------|
| `shadow-card` | kart, aktif segment dilimi |
| `shadow-sheet` | sheet |
| `shadow-float` | açılır menü, masaüstü modal, dolu bant |

- `GL-01` Yalnız yukarıdaki üç sınıfı kullan. `shadow`, `shadow-lg` yazma.
- `GL-02` Koyu temada ayrımı `border` ve yarı saydam yüzeyle kur. Neden: koyu temada gölge görünmez.

---

## §7 Aksan (kobalt)

- `AK-01` `primary`'yi yalnız şuralarda kullan: birincil buton dolgusu, aktif sekme/segment/nav, odak kenarı, seçili hap, metin bağlantısı, landing bölüm etiketi, logo taban çizgisi.
- `AK-02` Seçili hapta `border-primary/30 bg-primary/10 text-primary` kullan.
- `AK-03` Sayfada en fazla bir dolu aksan bandı kullan.
- `AK-04` `primary`'yi uyarı, hata, kâr/zarar veya kategori için kullanma.
- `AK-05` Büyük gövde metninde `primary` kullanma.

---

## §8 Bileşen

### Buton — [`ui/button`](../../web/src/components/ui/button.jsx)

| Varyant | Sınıflar | Kullanım |
|---------|----------|----------|
| `default` | `bg-primary text-primary-foreground` | birincil eylem |
| `outline` | `border border-border bg-card`, hover `bg-secondary` | ikincil eylem |
| `destructive` | `bg-down/10 text-down` | tehlikeli eylemin ilk adımı |
| `ghost` | hover `bg-secondary` | ikon düğmesi |

- `BL-01` Onay modalındaki son silme adımında dolu `bg-destructive` kullan.
- `BL-02` Form ana eyleminde 48px yükseklik (`h-12`) kullan.
- `BL-03` Sayfa başlığındaki eylemde `PrimaryAction` / `GhostAction` kullan ([`Page`](../../web/src/components/Page.jsx), 36px).

### Alan

- `BL-04` Alanda `bg-card border border-border rounded-[10px] h-12 text-body` kullan.
- `BL-05` Hover'da `border-input`, odakta `border-primary` kullan. Alanda odak halkası veya dış parlama kullanma.
- `BL-06` Etiketi alanın üstüne `.label` ile koy.
- `BL-07` Her alana `autoComplete` ve `inputMode` ver.
- `BL-08` Auth alanlarında [`lib/authStyles.js`](../../web/src/lib/authStyles.js) kullan (mobilde 52px).
- `BL-09` Checkbox: 20px, `rounded-md`, seçiliyken dolu `bg-primary`.

### Segment ve hap

- `BL-10` Segment oluğu: `bg-secondary p-1 rounded-[10px]`.
- `BL-11` Aktif dilim: `border-border bg-card shadow-card font-bold`. Pasif dilim: `border-transparent text-muted-foreground`.
- `BL-12` Hap: `rounded-full border`. Seçili hap: `AK-02`.

### Kart ve liste

- `BL-13` Kart: `rounded-xl border border-border bg-card shadow-card`. Başlıklı blokta [`Section`](../../web/src/components/Section.jsx) kullan.
- `BL-14` Kartın içine kart koyma.
- `BL-15` KPI sırası: `.label` → değer (`text-title` veya `text-figure`, `.tabular`, `font-bold`) → rozet.
- `BL-16` Liste satırı en az 44px olsun. Solda `rounded-lg` monogram kutusu (`catOf().tint` + `catOf().text`) koy.
- `BL-17` Dağılım çubuğu: 6px yükseklik, `rounded-full`, dilim rengi `catOf().dot`, altında lejant.

### Sayfa ve katman

- `BL-18` Her panel sayfasını [`Page`](../../web/src/components/Page.jsx) ile yaz. Ayrı `<h1>` yazma.
- `BL-19` Modal için [`ui/modal`](../../web/src/components/ui/modal.jsx) kullan. `window.confirm` kullanma.
- `BL-20` Varlık detayı için [`AssetDrawer`](../../web/src/components/AssetDrawer.jsx) kullan.
- `BL-21` Tam ekran yükleme için [`PageLoader`](../../web/src/components/PageLoader.jsx) kullan. Metni yalnız `sr-only` yaz.
- `BL-22` Kenar çubuğunda aktif öğe: `.nav-active text-primary`.
- `BL-23` Logoyu [`AssayMark`](../../web/src/components/AssayMark.jsx) ile ekle. `<img>` kullanma. Neden: koyu temada görünmez olur.

### Yardımcı sınıflar — [`index.css`](../../web/src/index.css)

| Sınıf | İş |
|-------|-----|
| `.label` | 11px, 600, büyük harf, `0.06em` tracking |
| `.tabular` | `tabular-nums` |
| `.nav-active` | aktif nav zemini |
| `.paper` | 34px hairline ızgara + radyal maske (landing hero, auth zemini) |
| `.press` | basınca `scale(.97)` |
| `.modal-in`, `.rise`, `.step-in` | giriş animasyonları |

---

## §9 Hareket

- `HR-01` Renk/kenar/opaklık geçişi: `110ms` + `cubic-bezier(0,0,.38,.9)`.
- `HR-02` Sayfalar arası kart büyümesinde View Transitions API kullan: `navigate(to, { viewTransition: true })` + aynı `view-transition-name`. Süre `420ms` + `cubic-bezier(.2,.8,.2,1)`.
- `HR-03` Her animasyonu `prefers-reduced-motion` ile kapat.

---

## §10 Mobil

- `MB-01` Önce mobil yaz. Sınır `md`: altı telefon, üstü masaüstü.
- `MB-02` İki ayrı düzen gerekirse `md:hidden` / `hidden md:block` kullan.
- `MB-03` Alt gezinme çubuğu: `min-h-16` (64px), 4 sekme (Özet, Portföy, Piyasa, Menü), `env(safe-area-inset-bottom)` payı.
- `MB-04` Sayfa kenar boşluğu: mobilde `px-4` (16px), md+ `px-8` (32px).
- `MB-05` Dokunma alanı en az 44px olsun.
- `MB-06` Ana eylemi (Al, Giriş yap, Hesap oluştur) altta sabit tut. Eylemi metinde yaz: "25 gram al".
- `MB-07` Açılır katmanı `createPortal` ile sayfa köküne çiz. Neden: `transform` taşıyan ata `fixed` öğeyi yanlış konumlar.
- `MB-08` Açılır katman açıkken arka sayfayı kaydırma. Odağı katmana taşı.
- `MB-09` Sheet tutamağı: 36×4px, `bg-input`.
- `MB-10` Her ekranı 360, 375 ve 390px genişlikte, iki temada test et. Yatay taşma olmasın: `scrollWidth === innerWidth`.

---

## §11 Veri dürüstlüğü

- `VR-01` Elimizde olmayan piyasa verisini gösterme: sektör, F/K, PD/DD, piyasa değeri, temettü, emir defteri, haber, duyarlılık skoru. Tasarım girdisinde olsa da gösterme.
- `VR-02` Yapay zekâ özeti kartı gösterme. Servis gelince kartı "yatırım tavsiyesi değildir" notuyla ekle.
- `VR-03` Canlandırmayı gerçek veri gibi sunma. Üstüne "Canlandırma · gerçek istek değil" yaz.
- `VR-04` Rastgele üretilip canlı log gibi akan kutu kullanma.
- `VR-05` Temsilci seriyi (BIST 100, USD/TRY, gram altın) portföy değeri gibi gösterme. Altına etiketini yaz.

---

## Açık konular

Kod tek bir değere bağlı değil. Karar verilince kurala dönüşür.

- Kart iç boşluğu: kodda `p-4`, `p-5`, `p-4 md:p-5` karışık.
- `rounded-[10px]` için token yok; her yerde elle yazılıyor.
- `font-mono` ve `font-display` Plus Jakarta Sans'a bağlı. Ad yanıltıcı; [`authStyles.js`](../../web/src/lib/authStyles.js) alanda `font-mono` kullanıyor.
- `rounded-lg` (12px) ile `rounded-xl` (12px) aynı değeri veriyor.
- [`index.css`](../../web/src/index.css) `--radius` yorumu "8 — buton, alan" diyor; butonlar 10px.
