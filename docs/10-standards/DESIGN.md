# Tasarım Sistemi — "VOLTAJ"

Tek sistem, üç yüzey: **landing** (`/landing`), **auth** (`/login`, `/register`), **panel** (giriş sonrası tüm sayfalar). Üçü de aynı token'ları, aynı tip ölçeğini ve aynı bileşen anatomisini kullanır.

> Kaynak: [`web/src/index.css`](../../web/src/index.css) — tüm token'lar burada. **Önce token, sonra bileşen.**
> Canlı referans: `/landing`. Tasarımı değiştirmek istediğinde **önce orada** dene, oturunca panele yay.

> **Geçersiz:** LEDGER (bone/ink muhasebe defteri) sistemi kaldırıldı. `docs/superpowers/` altındaki 2026-08 tarihli spec'ler o döneme aittir — tarihsel kayıttır, bağlayıcı değildir.

---

## 1. Felsefe

- **Üç renk.** Beyaz zemin, ink metin ve aksiyon, tek voltaj rengi. Dördüncü marka rengi yok.
- **Voltaj rengi az yerde, keskin.** Doz kuralı §4'te — ihlal edilirse sistem ucuzlar.
- **Tek font ailesi.** Hiyerarşi aileden değil, ölçek + ağırlık + tracking'den gelir.
- **Gölge yok.** Derinlik hairline kenarlıklardan ve yüzey tonundan gelir.
- **Rakamlar birinci sınıf.** Mono + tabular, sütunlar hizalı.
- **Semantik vurgudan ayrı.** Kâr/zarar, kategori, uyarı ve marka birbirinin yerine geçmez.

---

## 2. Renk

### 2.1 Yüzeyler

Panel ile landing aynı paleti kullanır; fark yalnızca **hangisinin zemin olduğudur**. Yoğun tabloda saf beyaz zemin göz yorduğu için panelde katman terstir.

| Token | Hex | Panel | Landing |
|-------|-----|-------|---------|
| `background` | `#F7F7F5` | **zemin** | bant |
| `card` | `#FFFFFF` | yüzey/panel | **zemin** |
| `secondary` / `muted` / `accent` | `#F2F1EE` | hover, ikincil yüzey | rozet dolgusu |
| `border` | `#E4E3DE` | hairline | hairline |
| `input` | `#CFCDC6` | alan alt kenarlığı, güçlü ayraç | aynı |
| `foreground` | `#141414` | ink metin + birincil buton | aynı |
| `muted-foreground` | `#5C5A55` | ikincil metin | aynı |

### 2.2 Marka

| Token | Hex | Anlam |
|-------|-----|-------|
| `voltage` | `#C2185B` | **Markanın tek rengi.** Kullanımı §4'e tabidir. |

### 2.3 Semantik

| Token | Hex | Anlam |
|-------|-----|-------|
| `up` | `#147C4A` | Kâr |
| `down` | `#BE3A2E` | Zarar |
| `warn` | `#A16207` | Yumuşak uyarı (dikkat çeker, engellemez) |
| `destructive` | `#B3261E` | Sert uyarı / silme (onay ister) |

### 2.4 Kategori

Varlık türünü **ayırt etmek** için. Rozet, halka dilimi, KPI şeridi.

| Token | Hex | Kategori |
|-------|-----|----------|
| `cat-stock` | `#2F5DA8` | Hisse |
| `cat-gold` | `#B08843` | Altın |
| `cat-fx` | `#17706B` | Döviz |
| `cat-cash` | `#6B4E9B` | Nakit |
| `cat-index` | `#AD5233` | Endeks |
| `cat-other` | `#77746B` | Diğer |

> **Kural:** kategori rengi asla artı/eksi anlamı taşımaz; `up`/`down` asla kategori göstermez; `voltage` asla ikisinin yerine geçmez. Üçü karışırsa "pembe kutu" hem marka hem kâr hem hisse demeye başlar.

---

## 3. Tipografi

| Rol | Font | Sınıf |
|-----|------|-------|
| Her şey | **Inter Variable** | `font-sans` (varsayılan), `font-display` (aynı aile, ad korundu) |
| Rakam / kod | **JetBrains Mono Variable** | `font-mono`, `.tabular` |

Self-host (`@fontsource-variable`), CDN yok. Tüm sayısal değerlere `.tabular`.

### 3.1 Tip ölçeği — 8 basamak

Ölçek [`index.css`](../../web/src/index.css)'te `--text-*` olarak tanımlı. **Ad-hoc boyut yazılmaz** (`text-[13.5px]`, `text-xs`, `text-lg` yok).

| Sınıf | px | Ağırlık | Tracking | Nerede |
|-------|----|---------|----------|--------|
| `text-micro` | 11 | 400–600 | — | mikro metin, çip, rozet, log satırı |
| `text-ui` | 13 | 400–600 | — | **varsayılan** — UI, tablo hücresi, buton, form |
| `text-body` | 15 | 400 | — | vurgulu gövde, açıklama paragrafı |
| `text-figure` | 18 | 600 | −0.01em | KPI / kart değeri, kart başlığı |
| `text-head` | 24 | 700 | −0.025em | modal/auth başlığı, mobil sayfa başlığı |
| `text-title` | 32 | 700 | −0.032em | sayfa başlığı (md+) |
| `text-display` | 44 | 700 | −0.038em | **yalnızca landing** bölüm başlığı, stat sayısı |
| `text-hero` | 60 | 700 | −0.042em | **yalnızca landing** h1 |

**Negatif tracking zorunlu.** Inter 700 tracking'siz fazla geniş okunur; sıkıştırma sisteme mühendislik hissini veren şeydir.

**`.label`** — Inter 600 + uppercase + `0.12em` tracking, 11px. Eyebrow, tablo başlığı, kart etiketi, sidebar bölüm ayracı: hepsi bu tek sınıf. Elle `text-[11px] uppercase tracking-[0.12em]` yazılmaz.

> **Dikkat:** ölçek sınıfları Tailwind'in varsayılan adları değil. [`lib/utils.js`](../../web/src/lib/utils.js)'teki `cn()` bunları `extendTailwindMerge` ile `font-size` grubuna kaydeder — bildirilmezse tailwind-merge `text-ui`'yi renk sanıp eler ve boyut sessizce 16px'e düşer. **Yeni basamak eklenirse oraya da eklenmeli.**

---

## 4. Voltaj doz kuralı — sistemin özü

Voltaj rengi neyin markası olduğunu söyler, ama **kapladığı alan** ne kadar pahalı durduğunu söyler. Doygun bir rengi 44px sayıda veya dolu butonda kullanmak sistemi ucuzlatır.

### Voltaj rengi ASLA

- ❌ Büyük metin olmaz (başlık, stat sayısı, kart başlığı — hepsi ink)
- ❌ Birincil butonu doldurmaz (birincil aksiyon **ink dolu**)
- ❌ Uyarı/hata anlamı taşımaz (o `warn` ve `destructive`'in işi)
- ❌ Kategori ya da kâr/zarar göstermez

### Voltaj rengi YALNIZCA

- ✅ **Cetvel** — `.rule-accent` (3px üst kenar; stat/KPI blokları)
- ✅ **Kenar** — `.edge-accent` (3px sol kenar; öne çıkan kart, auth kartı, panel bandı)
- ✅ **Aktif nav şeridi** — `.nav-active` (yumuşak dolgu + solda 3px)
- ✅ **Bölüm etiketi tiresi** — `.tick-accent` (22×2px)
- ✅ **Mikro metin** — 11px durum etiketi (`devam`), diyagramdaki akan hat, logo taban çizgisi
- ✅ **Tek dolu bant** — sayfa başına **en fazla bir** tam dolgulu voltaj yüzeyi (landing kapanış bandı). Orada metin değil, zemindir.

---

## 5. Bileşen anatomisi

### 5.1 Buton

| Tür | Görünüm |
|-----|---------|
| Birincil | `bg-foreground text-background`, radius 8px |
| İkincil | `border border-input`, dolgusuz, hover'da `border-foreground` |
| Tehlike | `bg-destructive text-destructive-foreground` |

Yükseklik ≥ 40px (form içi 36px). Radius `rounded-md` (8px). **Gölge yok.**

### 5.2 Alan (input)

`bg-secondary` dolgu + **yalnızca alt kenarlık** (`border-b border-input`). Çerçeveli input yok. Odakta 2px iç ink çerçeve, dış halka yok. Ortak stiller: [`lib/authStyles.js`](../../web/src/lib/authStyles.js).

### 5.3 Yüzeyler

- Kart / panel: `rounded-lg` (12px) + `border border-border` veya `bg-card` üzerinde `bg-background`.
- Rozet: `rounded-sm` (6px) veya `rounded-full` (çip).
- **Gölge yok.** Ayrım kenarlık ve yüzey tonuyla kurulur.

### 5.4 Yapısal yardımcılar

CSS [`index.css`](../../web/src/index.css)'te:

- **`.rule-accent`** / **`.edge-accent`** — voltaj cetveli ve kenarı
- **`.nav-active`** — aktif nav satırı
- **`.tick-accent`** — bölüm etiketi tiresi
- **`.border-total`** — tablo toplam satırı (2px ink üst kenar)
- **`.paper`** — 34px cetvel ızgarası + radyal maske (landing hero'su, auth zemini)
- **`.label`**, **`.tabular`** — §3
- **`.modal-in`** — modal giriş animasyonu, `prefers-reduced-motion`'a saygılı
- **`@keyframes flow`** — mimari diyagramındaki akan hat
- **[`AuthVisual`](../../web/src/components/AuthVisual.jsx)** — auth sağ alanı: mouse'a bükülen ızgara + temsili mum grafiği (`--up`/`--down`, voltaj yalnızca hareketli ortalama hattında; fiyat/eksen rakamı yok, §6). Yalnızca `lg`+ ekranda lazy yüklenir.

### 5.5 Sayfa iskeleti

- Her panel sayfası [`Page`](../../web/src/components/Page.jsx) ile: yapışkan başlık çubuğu (eyebrow + başlık + meta + aksiyon + sekme), altında padding'li gövde.
- İçerik bloğu [`Section`](../../web/src/components/Section.jsx); yanında `StatCard` ve `DeltaChip` (yalnızca K/Z).
- Sidebar: beyaz panel, sağda hairline, aktif öğe `.nav-active`. **Koyu şasi yok — tek katman.**
- Modal: ortak [`ui/modal.jsx`](../../web/src/components/ui/modal.jsx), `window.confirm` yerine de bu.

### 5.6 Geçişler

110ms + `cubic-bezier(0,0,.38,.9)`. Sert duran "productive" easing — yumuşak `ease-out` butonu kart gibi gösterir. `prefers-reduced-motion`'a saygılı.

---

## 6. Veri dürüstlüğü

Bunlar renk ya da font değil, **anlam** taşır. Palet değişirse bile geçerlidir.

- Elimizde olmayan piyasa verisi **uydurulmaz, mock'lanmaz**: sektör/endüstri, F/K, piyasa değeri, temettü, emir defteri/derinlik, seans içi tick, haber akışı, duyarlılık skoru. Hiçbir kaynağımız bunları vermiyor.
- BIST 30 içi arama **client-side filtredir** — 30 satır için ağ turu ya da DB indeksi kurulmaz. Filtre boş dönerse `/market/search` ile tüm BIST evreni önerilir.
- Piyasa sembolleri Postgres'te tutulmaz; DB yalnızca portföy ve işlemler içindir.
- Grafik renkleri **token'dan okunur** — [`PriceChart`](../../web/src/components/PriceChart.jsx) `token('--up')` ile çalışır. Palet değişirse `applyOptions` yeniden çağrılmalı.

---

## 7. YAPMA listesi

- ❌ Ad-hoc renk (`gray-950`, `#111`) — sadece token.
- ❌ Ad-hoc boyut (`text-[13.5px]`) veya Tailwind varsayılanı (`text-xs`, `text-sm`, `text-lg`) — sadece §3.1 ölçeği.
- ❌ Elle `text-[11px] uppercase tracking-…` — `.label`.
- ❌ Rakamı normal fontla — `.tabular`.
- ❌ Voltaj rengini büyük metinde, dolu butonda, uyarıda, kategoride veya kâr/zararda kullanmak — §4.
- ❌ Sayfada birden fazla dolu voltaj bandı.
- ❌ Gölge eklemek (`shadow-*`) — ayrım kenarlıkla kurulur.
- ❌ Dördüncü marka rengi eklemek.
- ❌ Sayfayı `Page` olmadan yazmak — başlık çubuğu ve padding oradan gelir.
- ❌ Ad-hoc `<h1>` — başlık `Page`'in işi.
- ❌ Elimizde olmayan piyasa verisini uydurmak (§6).
- ❌ `window.confirm` — ortak `Modal`.
