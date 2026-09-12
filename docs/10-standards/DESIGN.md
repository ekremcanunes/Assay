# Tasarım Sistemi — "LEDGER" (Muhasebe Defteri)

Uygulamanın görsel dili: **açık/bone, muhasebe defteri** kimliği. Konuya sadık (bu bir portföy defteri), ayırt edici, açık tema. Gelecekteki tüm tasarım işi buna sabit kalır.

> Kaynak: [`src/index.css`](src/index.css) — tüm token'lar burada. Önce token, sonra bileşen.
> Detaylı gerekçe: [`../docs/superpowers/specs/2026-08-10-ledger-redesign-design.md`](../docs/superpowers/specs/2026-08-10-ledger-redesign-design.md)

---

## 1. Felsefe

- **Muhasebe defteri estetiği**: cetvel çizgileri, çift-giriş, makbuz, folio numaraları.
- **AI-vari değil**: kimlik renkten değil **yapı + tipografi + doku + bir riskten** gelir (kırmızı marj çizgisi, sert offset gölge, cetvelli tablolar).
- **Rakamlar birinci sınıf**: mono + tabular, sütunlar hizalı.
- **Semantik (kâr/zarar) vurgudan ayrı**: pirinç/marj-kırmızısı asla artı/eksi anlamı taşımaz.

---

## 2. Renk (token'lar) — açık/bone

| Token | Hex | Kullanım |
|-------|-----|----------|
| `background` | `#EFEDE6` | Ana zemin (bone) |
| `card` | `#F7F6F1` | Panel/kart/popover |
| `foreground` | `#1C1B18` | Ana metin/çizgi (ink) |
| `muted-foreground` | `#6A675E` | İkincil metin |
| `border` | `#D9D6CB` | Cetvel/hairline |
| `primary` | ink `#1C1B18` | Birincil buton (ink-dolu) |
| `brass` | `#8C6A38` | İkincil aksan (işlem/Al butonu) — az |
| `margin` | `#B23A2E` | Kırmızı marj çizgisi, `[X] kapat` |
| `up` (kâr) | `#147C4A` | Kâr |
| `down` (zarar) | `#BE3A2E` | Zarar |
| `destructive` | `#7B2D26` | Silme (K/Z değil) |

Sınıflar: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-up`, `text-down`, `bg-brass`, `text-margin`. **Ad-hoc renk yazma.**

**Uyarı rengi:** `brass` = yumuşak uyarı (dikkat çeker, engellemez), `margin` = sert uyarı (onay ister). `up`/`down` yalnızca kâr/zarar, kategori renkleri yalnızca kategori olduğu için uyarı bu ikisine düşer.

### 2.1 Kategori renkleri

Varlık türünü **ayırt etmek** için. Rozet, halka dilimi, KPI şeridi.

| Token | Hex | Kategori |
|-------|-----|----------|
| `cat-stock` | `#2F5DA8` | Hisse |
| `cat-gold` | `#C69B58` | Altın |
| `cat-fx` | `#17706B` | Döviz |
| `cat-cash` | `#6B4E9B` | Nakit |
| `cat-index` | `#C25E3A` | Endeks |
| `cat-other` | `#8C897E` | Diğer |

> **Kural:** kategori rengi asla artı/eksi anlamı taşımaz; `up`/`down` asla kategori göstermez. İkisi karışırsa "yeşil kutu" hem altın hem kâr demeye başlar.

### 2.2 Şasi (koyu kabuk)

Sidebar ve auth ekranları koyu; sayfa içeriği bone kalır ve şasinin üstünde ayrı bir tuval olarak durur.

| Token | Hex | Kullanım |
|-------|-----|----------|
| `shell` | `#0B0D10` | Sidebar/auth zemini |
| `shell-panel` | `#15151A` | Hover yüzeyi, auth kartı |
| `shell-border` | `#212127` | Şasi kenarı |
| `shell-fg` | `#F2F2F3` | Şasi metni |
| `shell-muted` | `#878791` | Şasi ikincil metni |
| `foil` | `#D4B483` | Şampanya aksan — **yalnızca şasi içinde** |

---

## 3. Tipografi

| Rol | Font | Nerede |
|-----|------|--------|
| Başlık | **Bricolage Grotesque** | `font-display` |
| UI / gövde | **Instrument Sans** | Varsayılan (`--font-sans`) |
| Rakam / etiket | **Geist Mono** | `.tabular`, `font-mono` |

Self-host (`@fontsource`), CDN yok. Tüm sayısal değerlere `.tabular`.

### 3.1 Tip ölçeği — 6 basamak

Ölçek [`index.css`](src/index.css)'te `--text-*` olarak tanımlı. **Ad-hoc boyut yazılmaz** (`text-[11.5px]`, `text-xs`, `text-lg` yok); her metin bu altı adımdan birine oturur.

| Sınıf | px | Nerede |
|-------|----|--------|
| `text-micro` | 11 | ikincil mikro metin, çip, rozet |
| `text-ui` | 13 | **varsayılan** — UI, tablo hücresi, buton, form |
| `text-body` | 15 | vurgulu gövde, `Section` başlığı |
| `text-figure` | 18 | KPI / kart değeri |
| `text-head` | 24 | modal başlığı, auth başlığı, mobil sayfa başlığı |
| `text-title` | 30 | sayfa başlığı (md+) — display font burada nefes alır |

**`.label`** — mono + uppercase + `0.1em` tracking, 11px. Eyebrow, tablo başlığı, `StatCard` etiketi, sidebar bölüm ayracı: hepsi bu tek sınıf. Elle `font-mono text-[9px] uppercase tracking-[0.1em]` yazılmaz.

> **Dikkat:** ölçek sınıfları Tailwind'in varsayılan adları değil. [`lib/utils.js`](src/lib/utils.js)'teki `cn()` bunları `extendTailwindMerge` ile `font-size` grubuna kaydeder — bildirilmezse tailwind-merge `text-ui`'yi renk sanıp `text-foreground` ile aynı grupta eler ve boyut sessizce 16px'e düşer. Yeni basamak eklenirse **oraya da eklenmeli**.

---

## 4. Yapısal imzalar (kimliğin özü)

CSS yardımcıları [`index.css`](src/index.css)'te:

- **`.margin-rule`** — panelin solunda dikey kırmızı marj çizgisi (içerik `pl-4 md:pl-6` ile açılır).
- **`.shadow-ledger`** — panel offset gölge `4px 4px`. **`.shadow-ledger-strong`** — modal/drawer `8px 8px` full ink.
- **`.border-double-bottom`** — tablo toplam satırı 3px çift çizgi.
- **Yumuşak köşe** — `--radius: 8px`; kart/panel `rounded-xl`, buton/rozet `rounded-lg`.
- **Cetvelli tablo** — mono, tabular, `border-b-2 border-foreground` başlık, `divide-border` satırlar, `tfoot` toplam çift-çizgi. Ledger keskinliği artık **burada** yaşıyor.
- **Sayfa iskeleti** — her sayfa [`Page`](src/components/Page.jsx) ile: tuvale yapışık yapışkan başlık çubuğu (eyebrow + başlık + meta + aksiyon + sekme), altında padding'li gövde.
- **İçerik bloğu** — [`Section`](src/components/Section.jsx): başlık + meta + aksiyon satırı, altında gövde. Yanında `StatCard` (sol kategori şeridi + ikon rozeti) ve `DeltaChip` (yalnızca K/Z).
- **Kategori rozeti** — sembolün yanında `catOf(assetType)` ile renklendirilmiş 2 harfli kare ([`lib/assetColors.js`](src/lib/assetColors.js)).

Şasi imzaları (yalnızca sidebar/auth; bunlar yumuşak köşelidir):

- **`.foil-tile`** — gradyanlı şampanya kare: marka rozeti + birincil buton.
- **`.nav-active`** — aktif nav satırı: yumuşak dolgu + solda ışıyan 2.5px foil şerit, ikon foil'e döner.
- **`.canvas-inset`** — bone içerik tuvalinin şasi üstündeki gölgesi.
- **`.auth-bg`** / **`.auth-card`** — ızgara + foil ışıma zemin, üstünde yüzen auth kartı.

---

## 5. Ortak Modal ([`ui/modal.jsx`](src/components/ui/modal.jsx))

Makbuz-stili tek bileşen; her yerde kullanılır (`window.confirm` yerine de).
- Overlay `foreground/50` + blur; panel `border-2 border-foreground` + `shadow-ledger-strong`.
- `title` → daktilo makbuz başlığı (kesikli ayraç), `subtitle`, `children`, `actions`.
- Animasyon `.ledger-modal` (fade + hafif ölçek), `prefers-reduced-motion`'a saygılı.
- Örnek kullanım: Portföy'de silme onayı.

---

## 6. Etkileşim

- **Hover zorunlu**: satır `hover:bg-secondary` + sembol `group-hover:underline`; butonlar `hover:border-foreground` / `hover:bg-foreground hover:text-background`; tab hover.
- Tıklanabilir hisse satırı → drawer; aksiyon butonları `stopPropagation`.
- Login/Register: client-side validasyon (e-posta/parola) + Kratos hataları Türkçe ([`lib/authErrors.js`](src/lib/authErrors.js)).

---

## 6.1 Piyasa sayfaları — neyi gösterebiliriz

Piyasa iki sayfaya ayrıldı: **Borsa** (`/market`) ve **Altın & Döviz** (`/gold-fx`).

**Elimizdeki veri** — hepsi mevcut çağrılardan gelir, ek maliyet yoktur:

| Alan | Kaynak | Not |
|------|--------|-----|
| Fiyat, önceki kapanış, değişim % | Yahoo chart meta | — |
| Gün yüksek/düşük, 52H yüksek/düşük, hacim | Yahoo chart meta | Aynı çağrıda geliyordu, önce atılıyordu |
| Kapanış serisi (sparkline) | Yahoo `?range=1mo` | Yalnızca **endeks ve altın/döviz** için; 30 hisseye ayrı seri çekilmez |
| Döviz kuru + 30 günlük seri | Frankfurter v1 timeseries | Günlük değişim buradan hesaplanır |
| BIST evreni (sembol + isim) | BistCatalog, Redis 24s | Arama için |

**Türetilenler** (backend işi yok, tamamen frontend):

- **Piyasa nabzı** — `changePercent` sayımı: yükselen / yatay / düşen + ortalama
- **Hacim liderleri** — `volume` sıralaması. Birim **adet**, TL değil
- **52H konum** — `(price − week52Low) / (week52High − week52Low)`
- **Gün aralığı çubuğu** — fiyatın gün bandındaki yeri (`RangeBar`)
- **Sarrafiye** — gram fiyatı × ağırlık × milyem (22 ayar = 0.916)

> **Elimizde OLMAYAN — üretmeyin, mock'lamayın:** sektör/endüstri bilgisi, F/K – piyasa değeri – temettü gibi temel veriler, emir defteri/derinlik, seans içi tick, haber akışı, duyarlılık skoru. Hiçbir kaynağımız bunları vermiyor.

**Arama:** BIST 30 içinde arama **client-side filtredir** — 30 satır için ağ turu ya da DB indeksi kurulmaz. Filtre boş dönerse `/market/search` ile tüm BIST evreni önerilir. Piyasa sembolleri Postgres'te tutulmaz; DB yalnızca portföy ve işlemler içindir.

**Bileşenler:** [`Sparkline`](src/components/Sparkline.jsx) (yön rengi kâr/zarar semantiğinde) ve `RangeBar` (bant içi konum işareti).

### Grafik — [`PriceChart`](src/components/PriceChart.jsx)

Uygulamadaki **tek** grafik. Gömülü TradingView widget'ı kaldırıldı: ücretsiz widget BIST sembollerinde *"Sembol sadece TradingView'de bulunabilir"* uyarısı verip varsayılan sembole (AAPL) düşüyordu. Lisans kısıtı, kod hatası değil.

- Kütüphane: `lightweight-charts` (TradingView, Apache-2.0). Veriyi **biz** besliyoruz → BIST çalışıyor
- Veri: `/api/market/history/{symbol}?assetType=&range=` — Yahoo OHLC + hacim; döviz için Frankfurter
- Aralıklar: `1d 1w 1mo 3mo 1y 5y`. Backend'de **beyaz listeye** karşı doğrulanır, kullanıcı girdisi Yahoo'ya doğrudan geçmez
- Cache: gün içi 5 dk, günlük 1 saat (Redis)
- Hisse/altın → mum + hacim. **Döviz → alan grafiği**, çünkü Frankfurter yalnızca günlük kapanış verir; OHLC'nin dördü de aynı olur, mum yanıltıcı olurdu
- **Renkler token'dan okunur:** `token('--up')` → `hsl(152 72% 28%)`. Grafikteki yeşil tablodaki yeşille aynı hex. Tema değiştirici eklenirse `applyOptions` yeniden çağrılmalı
- TradingView logosu **bilinçli olarak açık** (Apache-2.0 NOTICE: logo ya da kalıcı tradingview.com bağlantısı zorunlu)

---

## 7. İki katman, tek tema

Kullanıcıya seçtirilen bir tema **yok**. Bunun yerine iki sabit katman var:

- **Şasi** (koyu): sidebar, login, register. `shell-*` + `foil` token'ları, yumuşak köşe.
- **Tuval** (bone): tüm sayfa içeriği. LEDGER token'ları, keskin köşe.

İçerik her zaman bone kalır — şasi onu taşıyan çerçevedir.

---

## 8. YAPMA listesi

- ❌ Ad-hoc renk (`gray-950`, `#111` vb.) — sadece token. shadcn'den gelen bileşenlerde `gray-*`/`blue-*` kalıntısı varsa token'a çevrilir.
- ❌ Ad-hoc boyut (`text-[11.5px]`) veya Tailwind varsayılanı (`text-xs`, `text-sm`, `text-lg`) — sadece §3.1 ölçeği.
- ❌ Elle `font-mono … uppercase … tracking-…` — `.label`.
- ❌ Rakamı normal fontla — `.tabular`.
- ❌ Vurgu/marj rengini kâr-zarar için kullanmak.
- ❌ Kategori rengini kâr/zarar, `up`/`down`'ı kategori için kullanmak.
- ❌ `foil`'i bone tuval içinde kullanmak — foil yalnızca şasiye ait. Tuvalde birincil aksiyon rengi `brass`.
- ❌ Sayfayı `Page` olmadan yazmak — başlık çubuğu ve padding oradan gelir, Layout padding vermez.
- ❌ Ad-hoc `<h1>` — başlık `Page`'in işi.
- ❌ Elimizde olmayan piyasa verisini uydurmak veya mock'lamak (bkz. §6.1).
- ❌ 30 satırlık BIST 30 için sunucuya arama isteği atmak — filtre client-side.
- ❌ `window.confirm` — ortak `Modal`.
- ❌ Uyarı için `up`/`down` ya da kategori rengi — uyarı `brass` (yumuşak) / `margin` (sert).
