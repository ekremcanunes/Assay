# LEDGER Yeniden Tasarım — Spec

Uygulamanın görsel kimliğini "Pirinç/Ink (koyu)" yerine **LEDGER (açık, muhasebe defteri)** kimliğine taşıyoruz. Kaynak: kullanıcının başka bir araçta ürettiği ve onayladığı `ledge.html` mockup'ı.

## 1. Neden

- Mevcut koyu + kahve/sarımtırak (brass) tema kullanıcıya **bunaltıcı** geldi.
- Teal/grafit gibi alternatifler "jenerik AI" bulundu.
- LEDGER kimliği konuya sadık (bu bir portföy **defteri**), ayırt edici, ve **açık tema** olduğu için "bunaltma" sorununu da çözüyor.

## 2. Kararlar (onaylı)

- **Tema:** Açık / bone. Koyu Pirinç/Ink tamamen değişiyor. Tek tema (açık).
- **Sidebar:** Korunuyor ama ledger'laşıyor (bone zemin, cetvel, daktilo wordmark). Üst-nav'a geçilmiyor.
- **Offset gölge:** Sert `4px 4px` (neo-brutalist) aynen korunuyor — ledger/damga karakteri.
- **Login:** Kratos yönlendirme akışı değişmiyor; mevcut `/login` **sayfası** ledger kartı gibi stillenir (modal değil).
- **Backend:** Değişmiyor (bu tamamen sunum katmanı).

## 3. Tasarım Token'ları

Renkler (`index.css` `@theme` + `:root`, açık tema):

| Token | Hex | Kullanım |
|-------|-----|----------|
| `ground` (background) | `#EFEDE6` | Ana zemin (bone) |
| `surface` (card) | `#F7F6F1` | Panel/kart |
| `ink` (foreground) | `#1C1B18` | Ana metin/çizgi |
| `muted` | `#6A675E` | İkincil metin |
| `rule` (border) | `#D9D6CB` | Cetvel/hairline |
| `marginRed` | `#B23A2E` | Marj çizgisi, vurgu detay |
| `brass` | `#8C6A38` | İkincil aksan (döviz/işlem butonu) — az kullanılır |
| `profit` / `profitBg` | `#1B6E43` / `#E7F2EC` | Kâr |
| `loss` / `lossBg` | `#7B2D26` / `#F9EBEA` | Zarar |

**Not:** `profit`/`loss` semantik; `marginRed`/`brass`'tan ayrı.

## 4. Tipografi

Self-host `@fontsource` ile (CDN yok):

| Rol | Font | Nerede |
|-----|------|--------|
| UI / metin | **Plus Jakarta Sans** | Varsayılan (`--font-sans`) |
| Wordmark / makbuz başlığı | **Courier Prime** (daktilo) | `--font-serif` sınıfı |
| Rakam / ticker | **JetBrains Mono** | `.tabular` |

Hanken Grotesk kaldırılır. Tüm sayısal değerler mono + tabular.

## 5. Yapısal İmzalar (kimliğin özü)

Bunlar "AI-vari"likten çıkaran şeyler — her sayfada tutarlı uygulanır:

1. **Kırmızı marj çizgisi** — panel/kart sol içinde dikey `marginRed` hairline (muhasebe kağıdı).
2. **Sert offset gölge** — `shadow-[4px_4px_0px_rgba(28,27,24,0.05)]` panellerde; modallarda daha güçlü (`8px 8px` full ink).
3. **Cetvelli tablolar** — mono, tabular, uppercase başlık, `border-b-2 border-ink` başlık altı, satırlar `divide-rule`.
4. **Çift-çizgi toplam** — tablo `tfoot` toplam satırı `border-double` (3px double ink).
5. **Makbuz modal** — modal başlığı daktilo "İşlem Onay Makbuzu", kesikli (dashed) ayraç, receipt hissi.
6. **Folio / defter no** — köşelerde `FOLİO N° 084-2026`, `DEFTER NO: 014` gibi mono etiketler.

## 6. Ortak Popup/Modal Sistemi (#7)

Tek bir temel `Modal` bileşeni; her sayfada küçük değişikliklerle çağrılır:

- Overlay: `ink/50` + hafif blur. Panel: `surface`, `border-2 border-ink`, sert offset gölge.
- Başlık slotu (opsiyonel makbuz/daktilo başlık), gövde slotu, aksiyon slotu (İptal / Onayla).
- Animasyon: sade/versatil (fade + hafif ölçek/aşağıdan), `prefers-reduced-motion`'a saygılı.
- Kullanımlar: Al/Sat onayı (makbuz), silme onayı, genel diyaloglar. `window.confirm` yerine bu kullanılır.
- **Hover:** tüm etkileşimli öğelerde belirgin hover (satır `hover:bg-ground`, buton hover, tab hover `border-ink`).

## 7. Sayfa Bazında Uygulama

| Yüzey | Değişiklik |
|-------|-----------|
| `Layout` (sidebar) | Bone zemin, cetvel ayraç, Courier "LEDGER" wordmark, folio; aktif nav ledger tarzı |
| `Overview` | Net varlık (mono, büyük) + marj çizgili panel + dağılım stacked-bar + kategori kutuları |
| `Assets` (Portföy) | 3 tab (ledger buton stili), cetvelli tablo + çift-çizgi toplam satırı; satır tıklama → drawer |
| `StockDrawer` | Ledger drawer: "Defter No", piyasa metrikleri listesi, pozisyon, grafik (TradingView korunur) |
| `AddAsset` + onay | Form ledger stili + **makbuz onay modalı** (yeni ortak Modal) |
| `Login`/`Register` | Ledger kartı stili (sayfa olarak kalır) |
| `Analytics` | Ledger renk paletiyle pie/chart |

## 8. Kapsam Dışı (YAGNI)

- Backend, API, veri modeli, Kratos akışı — dokunulmuyor.
- Üst-nav'a geçiş yok (sidebar kalıyor).
- Koyu tema desteği yok (tek tema).
- Grafik motoru değişmiyor (TradingView embed aynı).

## 9. Doğrulama

- `npm run build` hatasız.
- Her sayfa token kullanır (ad-hoc renk yok).
- Fontlar bundle'a gömülü (self-host).
- Mevcut `DESIGN.md` bu kimliğe göre güncellenir.
