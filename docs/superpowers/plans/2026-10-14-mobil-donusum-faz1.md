# Mobil Dönüşüm Faz 1 — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assay panelini 360–390px telefonda yatay taşmasız, 4 sekmeli, kutu dilli ve tam ekran fiyatlı takvimli hale getirmek.

**Architecture:** Mevcut React SPA üzerinde yüzey değişikliği; yeni backend yok. Saf hesaplar `lib/*.js`'e (DOM'suz, ileride RN'e taşınabilir), ortak görünüm `components/`'e, sayfalar ince kalır. Mobil kaydırma `<main>`'den belgeye geçer.

**Tech Stack:** React 19, react-router-dom 7, @tanstack/react-query, Tailwind v4 (VOLTAJ token'ları `src/index.css`), lucide-react, Playwright (yalnızca tarama).

**Spec:** `docs/superpowers/specs/2026-10-14-mobil-donusum-faz1-design.md`

## Global Constraints

- **Commit yok.** Hiçbir görev commit atmaz. Tüm iş bitince, kullanıcıyla test sonrası, kullanıcının açık "at" onayıyla toplu commit (Task 7).
- **Kalıcı test yok.** Her görev sonunda: `npm run lint` (mevcut 9 hatadan fazlası yok), `npm run build`, Playwright taraması (`web/e2e/audit.spec.js`), kullanıcı tarayıcıda (DevTools mobil görünüm) kontrol eder. Gerçek telefon kontrolü AWS deploy'unda yapılır, bu planın kapsamında değil. Kalıcı teste geçmeden kullanıcıya haber verilir.
- **VOLTAJ bağlayıcı** (`docs/10-standards/DESIGN.md`): yalnızca token renkleri (`text-up`, `bg-cat-gold` …), tip ölçeği (`text-micro/ui/body/figure/head/title`), gölge yok, voltaj rengi az doz.
- **Metinler** `contexts/LanguageContext.jsx`'te TR + EN; bileşende sabit Türkçe metin yok.
- **Mobil hedef:** 360 / 375 / 390px'te `document.documentElement.scrollWidth === clientWidth`; dokunma hedefi ≥ 44px.
- **Masaüstü (`md+`)** düzeni bozulmaz; yalnızca menü öğeleri azalır.
- `.env` değerleri asla basılmaz; `web/e2e/auth.json` asla commit'lenmez/basılmaz.
- Komutlar `web/` dizininden çalışır. Playwright: `cd web/e2e && npx playwright test audit.spec.js --reporter=line`. Oturum düşmüşse: `npx playwright codegen --save-storage=auth.json http://localhost/login` (kullanıcı girer).
- Uygulama Docker'da (`http://localhost`) çalışıyor; kod değişikliğini görmek için web imajı yeniden derlenir: `MSYS_NO_PATHCONV=1 wsl docker compose up -d --build web` (repo kökünden).

## Review Focus

1. **Boş portföy** — hesapta hiç varlık yokken kutular ₺0 / "—" gösterir, sıfıra bölme NaN üretmez (Task 2 Step 3 + Step 7).
2. **Piyasa verisi geç gelir / hiç gelmez** (`/api/market/overview` 60 sn+ veya 504) — Piyasa sayfası iskelet gösterir, kutular çökmez; nabız 0 hisseyle "—" gösterir (Task 3 Step 6).
3. **Takvimde fiyat serisi yok** (varlık seçilmemiş, seri hatası, 1 yıldan eski ay) — renksiz takvim çizilir, gün seçimi çalışır (Task 4 Step 7).
4. **Telefon geri tuşu** — takvim açıkken geri yalnızca takvimi kapatır, form verisi (miktar, tür) kaybolmaz (Task 4 Step 8).
5. **USD hisse + TL alış** (ör. AAPL, para birimi TRY seçili) — takvim seri biriminde (USD) etiketlenir, formdaki fiyat `usePriceOnDate`'ten TL gelir; karışmaz (Task 4 Step 7).

---

## Dosya haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `web/index.html` | Değişir | `viewport-fit=cover` |
| `web/src/components/Layout.jsx` | Değişir | 4 sekme, belge kaydırma, safe-area |
| `web/src/App.jsx` | Değişir | `/gold-fx`, `/analytics` yönlendirmeleri |
| `web/src/contexts/LanguageContext.jsx` | Değişir | Yeni metinler |
| `web/src/lib/portfolioCategories.js` | Yeni | Kategori toplamı / K/Z / pay (saf) |
| `web/src/lib/format.js` | Yeni | `compactMoney` kısaltma (saf) |
| `web/src/components/CategoryTiles.jsx` | Yeni | Kutu satırı (Portföy + Piyasa) |
| `web/src/pages/Assets.jsx` | Değişir | Sekme → kutular, üst toplam |
| `web/src/lib/marketPulse.js` | Yeni | Nabız hesabı (saf) |
| `web/src/components/market/StockPanel.jsx` | Yeni | Borsa içeriği (Market.jsx'ten taşınır) |
| `web/src/components/market/GoldFxPanel.jsx` | Yeni | Altın & Döviz içeriği (GoldFx.jsx'ten taşınır) |
| `web/src/pages/Market.jsx` | Yeniden yazılır | Piyasa kabı: kutular + panel seçimi |
| `web/src/pages/GoldFx.jsx` | Silinir | İçerik GoldFxPanel'e taşındı |
| `web/src/lib/heat.js` | Yeni | Isı kademesi, kısa fiyat, ay listesi (saf) |
| `web/src/components/PriceCalendar.jsx` | Yeni | Tam ekran fiyatlı takvim |
| `web/src/pages/AddAsset.jsx` | Yeniden yazılır | Yeni form |
| `web/src/components/ui/calendar.jsx`, `date-picker.jsx` | Silinir | Kullanılmaz hale gelir |
| `web/package.json` | Değişir | `react-day-picker` kaldırılır |
| `web/src/components/Page.jsx` | Değişir | Mobil başlık eylemleri tek satır |
| `web/src/pages/Landing.jsx` | Değişir | Yatay taşma |

---

### Task 1: Uygulama kabuğu — 4 sekme, belge kaydırma, yönlendirmeler

**Files:**
- Modify: `web/index.html:6`
- Modify: `web/src/components/Layout.jsx`
- Modify: `web/src/App.jsx:10,13,61,64`
- Modify: `web/src/contexts/LanguageContext.jsx` (TR + EN `nav.*`)

**Interfaces:**
- Produces: `/market?tab=fx|stock` URL sözleşmesi (Task 3 okur).

- [ ] **Step 1: Viewport**

`web/index.html` satır 6:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 2: Menü öğeleri**

`Layout.jsx` import satırından `Coins`, `BarChart2` çıkar:

```jsx
import { LayoutDashboard, CandlestickChart, Wallet, LogOut, Globe, Menu, X } from 'lucide-react'
```

Nav dizileri:

```jsx
  const generalNav = [
    { to: '/overview', label: t('nav.overview'), short: t('nav.overviewShort'), icon: LayoutDashboard },
    { to: '/assets', label: t('nav.assets'), short: t('nav.assetsShort'), icon: Wallet },
  ]
  const marketNav = [
    { to: '/market', label: t('nav.market'), short: t('nav.marketShort'), icon: CandlestickChart },
  ]
```

- [ ] **Step 3: Belge kaydırma + safe-area**

`Layout.jsx` dönüş bloğunda kök, `main` ve alt nav sınıfları:

```jsx
    <div className="min-h-dvh bg-background text-foreground md:flex md:h-dvh">
```

```jsx
      {/* Mobilde kaydırmayı belge yapar (adres çubuğu gizlenebilsin); md+ eski düzen */}
      <main className="min-w-0 bg-background pb-[calc(56px+env(safe-area-inset-bottom))] text-foreground md:flex-1 md:overflow-auto md:pb-0">
        <Outlet />
      </main>
```

```jsx
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
```

Menü paneli (`absolute inset-x-0 bottom-0 ... pb-6`) → `pb-[calc(1.5rem+env(safe-area-inset-bottom))]`.

- [ ] **Step 4: Yönlendirmeler**

`App.jsx`: `import GoldFx` ve `import Analytics` satırlarını sil (sayfa dosyaları bu görevde silinmez; GoldFx Task 3'te silinir, Analytics kalır). Rotalar:

```jsx
              <Route path="/gold-fx" element={<Navigate to="/market?tab=fx" replace />} />
```

```jsx
              {/* Analiz yeniden tasarlanana kadar menüde yok (bkz. spec §3.1) */}
              <Route path="/analytics" element={<Navigate to="/overview" replace />} />
```

`GoldFx` rotası Task 3'e kadar boşta kalmasın diye bu adımda doğrudan yönlendirmeye çevrilir; Market sayfası Task 3'e kadar `?tab=fx`'i yok sayar (kabul).

- [ ] **Step 5: Metinler**

`LanguageContext.jsx` TR bloğu:

```js
    'nav.market': 'Piyasa',
    'nav.marketShort': 'Piyasa',
```

EN bloğu:

```js
    'nav.market': 'Markets',
    'nav.marketShort': 'Markets',
```

(`nav.goldFx`, `nav.goldFxShort`, `nav.analytics*` anahtarları silinmez — Analytics.jsx ve Task 3 başlığı kullanabilir; kullanılmayanlar Task 7'de listelenir.)

- [ ] **Step 6: Lint + build**

Run: `cd web && npm run lint 2>&1 | tail -3 && npm run build 2>&1 | tail -3`
Expected: lint "9 problems" (veya daha az), build "built in".

- [ ] **Step 7: Tarama**

Repo kökünden web imajını yeniden derle, sonra `cd web/e2e && npx playwright test audit.spec.js -g "panel" --reporter=line`.
Expected: panel sayfalarında `scrollW === vw`; `audit-shots/*_overview.png`'de alt menü 4 sekme. Not: `audit.spec.js` `<main>`'i açan `evaluate` artık mobilde gereksiz ama zararsız.

- [ ] **Step 8: Kullanıcı kontrolü**

Kullanıcı tarayıcıda (DevTools mobil görünüm) bakar: alt menü 4 sekme, sayfa belge olarak kayıyor, `/gold-fx` ve `/analytics` doğru yönleniyor. (Adres çubuğu gizlenmesi ve safe-area yalnızca gerçek cihazda görülür → AWS deploy kontrolü.) Onay gelmeden Task 2'ye geçme.

---

### Task 2: Portföy — üst şerit + kategori kartları + karttan sayfaya detay

> **Güncellendi 2026-10-16** (spec §5 yeniden yazıldı). İlk sürümün `lib/format.js`, `lib/portfolioCategories.js`, `components/CategoryTiles.jsx` dosyaları **yazıldı ve kalır** (CategoryTiles Task 3'te Piyasa'da kullanılır). `Assets.jsx`'e eklenen kutu kodu bu görevde kaldırılır.

**Files:**
- Modify: `web/src/lib/portfolioCategories.js` (kategori ↔ URL eşlemesi + temsilci seri)
- Create: `web/src/hooks/usePortfolioSummary.js`
- Create: `web/src/components/AreaSpark.jsx`
- Create: `web/src/components/PortfolioStrip.jsx`
- Create: `web/src/components/CategoryCard.jsx`
- Create: `web/src/components/HoldingsList.jsx` (Assets.jsx'teki liste/tablo/sat/düzenle/sil kodu taşınır)
- Create: `web/src/pages/AssetCategory.jsx`
- Rewrite: `web/src/pages/Assets.jsx`
- Modify: `web/src/components/Page.jsx` (`band` prop)
- Modify: `web/src/App.jsx` (`/assets/:category` rotası)
- Modify: `web/src/pages/AddAsset.jsx:127` (alım sonrası yönlendirme)
- Modify: `web/src/index.css` (View Transitions zamanlaması + `rise` animasyonu)
- Modify: `web/src/contexts/LanguageContext.jsx`

**Interfaces:**
- Produces:
  - `CATEGORY_TYPES = ['Stock', 'Currency', 'Gold']`, `slugOf(type) → 'stock'|'currency'|'gold'`, `typeOf(slug) → type|null`, `CATEGORY_SERIES[type] → { symbol, assetType }`
  - `usePortfolioSummary() → { holdings, isLoading, error, total, totalPct, categories: [{ key, value, changePct, share, count }] }`
  - `<AreaSpark values={number[]} color="#hex" className />`
  - `<PortfolioStrip total totalPct categories />`
  - `<CategoryCard type summary series onOpen />`
  - `<HoldingsList holdings type isLoading queryError />`
  - URL: `/assets/stock|currency|gold`; `navigate(..., { viewTransition: true })`; kart ↔ hero `view-transition-name`: `cat-<slug>`, `cat-name-<slug>`, `cat-val-<slug>`.

- [x] **Step 0 (ilk sürümden, yapıldı):** `lib/format.js` (`compactMoney`, `formatPct`), `lib/portfolioCategories.js` (`summarizeCategories`), `components/CategoryTiles.jsx`. Node kontrolü geçti.

- [ ] **Step 1: `lib/portfolioCategories.js` — eklemeler**

Dosyanın sonuna:

```js
// Kategori ↔ URL parçası (/assets/gold)
export const CATEGORY_TYPES = ['Stock', 'Currency', 'Gold']
const SLUGS = { Stock: 'stock', Currency: 'currency', Gold: 'gold' }
export const slugOf = (type) => SLUGS[type] ?? null
export const typeOf = (slug) => CATEGORY_TYPES.find((t) => SLUGS[t] === slug) ?? null

// Kart grafiği: kategorinin temsilci serisi (portföy değeri DEĞİL — kartta etiketle yazılır)
export const CATEGORY_SERIES = {
  Stock: { symbol: 'XU100.IS', assetType: 'Stock' },
  Currency: { symbol: 'USD', assetType: 'Currency' },
  Gold: { symbol: 'XAU', assetType: 'Gold' },
}
```

`summarizeCategories` dönüşüne `count: items.length` eklenir.

- [ ] **Step 2: Hızlı doğrulama (kalıcı değil)**

```bash
cd web && node --input-type=module -e "
import { slugOf, typeOf, summarizeCategories } from './src/lib/portfolioCategories.js'
console.log(slugOf('Gold'), typeOf('currency'), typeOf('xyz'), summarizeCategories([{assetType:'Gold',valueInTry:5}],['Gold'])[0].count)"
```

Expected: `gold Currency null 1`

- [ ] **Step 3: `hooks/usePortfolioSummary.js`**

```js
import { useHoldings } from '@/hooks/queries'
import { summarizeCategories, CATEGORY_TYPES } from '@/lib/portfolioCategories'

// Portföy şeridi + kartlar için tek kaynak (iki sayfa da kullanır)
export function usePortfolioSummary() {
  const { data: holdings = [], isLoading, error } = useHoldings()
  const categories = summarizeCategories(holdings, CATEGORY_TYPES)
  const total = categories.reduce((s, c) => s + c.value, 0)
  const totalPct = summarizeCategories(holdings.map((h) => ({ ...h, assetType: 'All' })), ['All'])[0].changePct
  return { holdings, isLoading, error, total, totalPct, categories }
}
```

- [ ] **Step 4: `components/AreaSpark.jsx`**

```jsx
// Kenardan kenara alan grafiği (kart ve detay başlığının altında). Eksen yok: yön ve şekil için.
export function AreaSpark({ values = [], color, className }) {
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 38 - ((v - lo) / (hi - lo || 1)) * 30])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <path d={`${line} L100 40 L0 40 Z`} fill={color} opacity="0.16" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
```

- [ ] **Step 5: `components/PortfolioStrip.jsx`**

```jsx
import { useLanguage } from '@/contexts/LanguageContext'
import { catOf } from '@/lib/assetColors'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

// Portföy sayfalarında hep görünen ince şerit: toplam + ağırlık + kategori ₺/%
export function PortfolioStrip({ total, totalPct, categories }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular text-figure font-semibold tracking-tight text-foreground">{money(total)}</span>
        <span className={cn('tabular text-ui', totalPct == null ? 'text-muted-foreground' : totalPct >= 0 ? 'text-up' : 'text-down')}>
          {formatPct(totalPct)}
        </span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-border">
        {categories.filter((c) => c.share > 0).map((c) => (
          <span key={c.key} className={catOf(c.key).dot} style={{ width: `${c.share * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((c) => (
          <div key={c.key} className="min-w-0">
            <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
              <i className={cn('h-2 w-2 shrink-0 rounded-sm', catOf(c.key).dot)} />
              {t(`assets.${c.key.toLowerCase()}`)}
            </div>
            <div className="tabular truncate text-ui font-semibold text-foreground">
              {money(c.value)} <span className="font-normal text-muted-foreground">%{Math.round(c.share * 100)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: `components/Page.jsx` — `band` prop**

İmza `export function Page({ eyebrow, title, meta, actions, tabs, band, children })`; `tabs` satırının hemen üstüne:

```jsx
        {band && <div className="pb-3 md:pb-4">{band}</div>}
```

- [ ] **Step 7: `components/CategoryCard.jsx`**

```jsx
import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory } from '@/hooks/queries'
import { AreaSpark } from '@/components/AreaSpark'
import { catOf } from '@/lib/assetColors'
import { slugOf, CATEGORY_SERIES } from '@/lib/portfolioCategories'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)
const pctCls = (v) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-up' : 'text-down')

// Kategori kartı: dokununca detay sayfasına büyür (view-transition-name eşleşmesi)
export function CategoryCard({ summary, onOpen, className }) {
  const { t } = useLanguage()
  const type = summary.key
  const slug = slugOf(type)
  const s = CATEGORY_SERIES[type]
  const { data: history } = usePriceHistory(s.symbol, s.assetType, '1y')
  const closes = (history?.candles ?? []).map((c) => c.close)
  const name = t(`assets.${type.toLowerCase()}`)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('portfolio.open').replace('{name}', name)}
      style={{ viewTransitionName: `cat-${slug}` }}
      className={cn('relative flex flex-col items-center overflow-hidden rounded-lg border border-border bg-card px-4 pt-4 text-center text-foreground', className)}
    >
      <span className="flex w-full justify-between text-micro text-muted-foreground">
        <span>{summary.count ? `${summary.count} ${t('overview.assetCount')}` : t('portfolio.empty')}</span>
        <span className={pctCls(summary.changePct)}>{formatPct(summary.changePct)}</span>
      </span>
      <span className="mt-6 text-head font-bold tracking-tight" style={{ viewTransitionName: `cat-name-${slug}` }}>{name}</span>
      <span className="text-micro text-muted-foreground">{t(`portfolio.series.${type}`)}</span>
      <span className="tabular mt-5 text-head font-semibold tracking-tight md:text-title" style={{ viewTransitionName: `cat-val-${slug}` }}>{money(summary.value)}</span>
      <span className={cn('tabular text-ui', pctCls(summary.changePct))}>{formatPct(summary.changePct)}</span>
      <AreaSpark values={closes} color={catOf(type).hex} className="absolute inset-x-0 bottom-0 h-[42%] w-full" />
    </button>
  )
}
```

- [ ] **Step 8: `components/HoldingsList.jsx` — taşıma**

`Assets.jsx`'ten **değiştirmeden** taşınır: `formatMoney`, `formatPercent`, `derive`; mutation hook'ları, `error/editing/form/drawer/confirmId` state'leri, `startEdit`, `startSell`, `handleConfirm`, `doDelete`, `saving`; tür etiketleri (`qtyLabel`, `costLabel`, `curLabel` — `tab` yerine `type`); hata kutusu; `<Section>…</Section>` (mobil kart listesi + masaüstü tablo); `AssetDrawer`; silme `Modal`. Değişenler:

```jsx
export default function HoldingsList({ holdings, type, isLoading, queryError }) {
  // holdings: bu kategorinin varlıkları (sayfa filtreler)
  const visible = holdings
  const tabTotal = visible.reduce((s, h) => s + (h.valueInTry ?? 0), 0)
  ...
  // Section başlığı: <Section title={`${visible.length} ${t('overview.assetCount')}`}>
  // Kök: <> {hata kutusu} <Section…/> {drawer && <AssetDrawer…/>} <Modal…/> </>
}
```

Importlar yalnızca kullanılanlar (`Page`, `PageTab`, `CategoryTiles`, `summarizeCategories`, `compactMoney`, `formatPct` HoldingsList'e girmez).

- [ ] **Step 9: `pages/Assets.jsx` (yeniden yazılır)**

```jsx
import { useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary'
import { Page, PrimaryAction } from '@/components/Page'
import { PortfolioStrip } from '@/components/PortfolioStrip'
import { CategoryCard } from '@/components/CategoryCard'
import { Skeleton } from '@/components/ui/skeleton'
import { slugOf } from '@/lib/portfolioCategories'
import { cn } from '@/lib/utils'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Assets() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { isLoading, total, totalPct, categories } = usePortfolioSummary()
  const railRef = useRef(null)
  const [index, setIndex] = useState(0)

  // Detaydan dönünce o kart ortada olsun
  useLayoutEffect(() => {
    const from = location.state?.from
    const rail = railRef.current
    const card = from && rail?.querySelector(`[data-slug="${from}"]`)
    if (card) rail.scrollLeft = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2
  }, [location.state, isLoading])

  // Eski ?tab=Gold linkleri → /assets/gold
  const legacy = slugOf(params.get('tab'))
  if (legacy) return <Navigate to={`/assets/${legacy}`} replace />

  const onScroll = () => {
    const rail = railRef.current
    const mid = rail.scrollLeft + rail.clientWidth / 2
    const cards = [...rail.children]
    const dist = (c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
    setIndex(cards.reduce((b, c, i) => (dist(c) < dist(cards[b]) ? i : b), 0))
  }
  const goTo = (i) => {
    const rail = railRef.current
    const card = rail.children[i]
    rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <Page
      eyebrow={t('nav.sectionGeneral')}
      title={t('assets.title')}
      actions={
        <PrimaryAction onClick={() => navigate('/assets/buy')}>
          <Plus className="h-3.5 w-3.5" />
          {t('assets.buy')}
        </PrimaryAction>
      }
      band={<PortfolioStrip total={total} totalPct={totalPct} categories={categories} />}
    >
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <>
          {/* Mobil: yatay kaydırılan kartlar; md+: üçü yan yana */}
          <div
            ref={railRef}
            onScroll={onScroll}
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((c) => (
              <div key={c.key} data-slug={slugOf(c.key)} className="w-[84%] shrink-0 snap-center md:w-auto">
                <CategoryCard
                  summary={c}
                  className="h-[400px] w-full md:h-[340px]"
                  onOpen={() => navigate(`/assets/${slugOf(c.key)}`, { viewTransition: true })}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1 md:hidden">
            <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t('portfolio.prev')}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {categories.map((c, i) => (
              <button key={c.key} type="button" onClick={() => goTo(i)} aria-label={t(`assets.${c.key.toLowerCase()}`)} aria-current={i === index}
                className="grid h-10 w-6 place-items-center">
                <i className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-foreground' : 'w-1.5 bg-border')} />
              </button>
            ))}
            <button type="button" onClick={() => goTo(index + 1)} disabled={index === categories.length - 1} aria-label={t('portfolio.next')}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </Page>
  )
}
```

- [ ] **Step 10: `pages/AssetCategory.jsx`**

```jsx
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary'
import { usePriceHistory } from '@/hooks/queries'
import { Page, PrimaryAction } from '@/components/Page'
import { PortfolioStrip } from '@/components/PortfolioStrip'
import { AreaSpark } from '@/components/AreaSpark'
import HoldingsList from '@/components/HoldingsList'
import { catOf } from '@/lib/assetColors'
import { typeOf, CATEGORY_SERIES } from '@/lib/portfolioCategories'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChevronLeft, Plus } from 'lucide-react'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

export default function AssetCategory() {
  const { category } = useParams()
  const type = typeOf(category)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { holdings, isLoading, error, total, totalPct, categories } = usePortfolioSummary()
  const s = CATEGORY_SERIES[type] ?? CATEGORY_SERIES.Stock
  const { data: history } = usePriceHistory(type ? s.symbol : null, s.assetType, '1y')

  if (!type) return <Navigate to="/assets" replace />

  const summary = categories.find((c) => c.key === type)
  const name = t(`assets.${type.toLowerCase()}`)
  const back = () => navigate('/assets', { viewTransition: true, state: { from: category } })

  return (
    <Page
      eyebrow={t('assets.title')}
      title={name}
      actions={
        <PrimaryAction onClick={() => navigate('/assets/buy')}>
          <Plus className="h-3.5 w-3.5" />
          {t('assets.buy')}
        </PrimaryAction>
      }
      band={<PortfolioStrip total={total} totalPct={totalPct} categories={categories} />}
    >
      {/* Kartın büyüdüğü alan — aynı view-transition-name */}
      <section
        style={{ viewTransitionName: `cat-${category}` }}
        className="relative mb-4 flex h-[240px] flex-col items-center overflow-hidden rounded-lg border border-border bg-card px-4 pt-2 text-center"
      >
        <button type="button" onClick={back} className="flex h-11 items-center gap-1 self-start rounded-md pr-3 text-ui text-foreground hover:bg-secondary">
          <ChevronLeft className="h-4 w-4" /> {t('portfolio.back')}
        </button>
        <span className="text-head font-bold tracking-tight" style={{ viewTransitionName: `cat-name-${category}` }}>{name}</span>
        <span className="tabular mt-2 text-head font-semibold tracking-tight md:text-title" style={{ viewTransitionName: `cat-val-${category}` }}>{money(summary.value)}</span>
        <span className={cn('tabular text-ui', summary.changePct == null ? 'text-muted-foreground' : summary.changePct >= 0 ? 'text-up' : 'text-down')}>
          {formatPct(summary.changePct)}
        </span>
        <AreaSpark values={(history?.candles ?? []).map((c) => c.close)} color={catOf(type).hex} className="absolute inset-x-0 bottom-0 h-[38%] w-full" />
      </section>

      <div className="rise">
        <HoldingsList holdings={holdings.filter((h) => h.assetType === type)} type={type} isLoading={isLoading} queryError={error} />
      </div>
    </Page>
  )
}
```

- [ ] **Step 11: Rota, yönlendirme, CSS, metinler**

`App.jsx`: `import AssetCategory from './pages/AssetCategory'`; `/assets/buy` satırının **altına**:

```jsx
              <Route path="/assets/:category" element={<AssetCategory />} />
```

(react-router statik `/assets/buy`'ı dinamik `:category`'den önce eşler.)

`AddAsset.jsx:127`: `navigate(\`/assets/${slugOf(assetType)}\`)` + `import { slugOf } from '@/lib/portfolioCategories'`.

`index.css` sonuna:

```css
/* Karttan sayfaya geçiş (View Transitions) — desteklemeyen tarayıcı animasyonsuz geçer */
::view-transition-group(*) { animation-duration: 420ms; animation-timing-function: cubic-bezier(.2, .8, .2, 1); }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.rise { animation: rise .4s cubic-bezier(.2, .8, .2, 1) .2s both; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
  .rise { animation: none; }
}
```

`LanguageContext.jsx` TR:

```js
    'portfolio.back': 'Portföy',
    'portfolio.open': '{name} ayrıntıları',
    'portfolio.empty': 'Henüz varlık yok',
    'portfolio.prev': 'Önceki kategori',
    'portfolio.next': 'Sonraki kategori',
    'portfolio.series.Stock': 'BIST 100 · son 1 yıl',
    'portfolio.series.Currency': 'USD/TRY · son 1 yıl',
    'portfolio.series.Gold': 'Gram altın · son 1 yıl',
```

EN:

```js
    'portfolio.back': 'Portfolio',
    'portfolio.open': '{name} details',
    'portfolio.empty': 'No assets yet',
    'portfolio.prev': 'Previous category',
    'portfolio.next': 'Next category',
    'portfolio.series.Stock': 'BIST 100 · last 1 year',
    'portfolio.series.Currency': 'USD/TRY · last 1 year',
    'portfolio.series.Gold': 'Gram gold · last 1 year',
```

- [ ] **Step 12: Lint + build** — Task 1 Step 6. Expected: lint 9, build OK.

- [ ] **Step 13: Derle + tarama**

```bash
MSYS_NO_PATHCONV=1 wsl docker compose up -d --build --no-deps web
cd web/e2e && npx playwright test audit.spec.js -g "panel" --reporter=line
```

Expected: `scrollW === vw` (kart rayı kendi içinde kayar, sayfa kaymaz). `audit.spec.js`'e `/assets/gold` eklenir (panel listesine). Görüntüde: şerit, ilk kart, yandaki kartın kenarı, noktalar.

- [ ] **Step 14: Review Focus kontrolleri (Playwright MCP, 375px)**
  - Boş hesap: kartlar ₺0 / "Henüz varlık yok", NaN yok.
  - `/assets?tab=Gold` → `/assets/gold`.
  - `/assets/xyz` → `/assets`.
  - Kart → detay → "‹ Portföy" → aynı kart ortada.

- [ ] **Step 15: Kullanıcı kontrolü** — tarayıcıda geçiş hissi, masaüstünde üç kart, şeritte ₺ ve %. Onay gelmeden Task 3'e geçme.

---

### Task 3: Piyasa sekmesi — iki kart + karttan sayfaya detay

> **Güncellendi 2026-10-16** (spec §4): kutular yerine Portföy'deki kart dili. Step 1–5 (nabız, metinler, GoldFxPanel, StockPanel) aynen geçerli; Step 6'dan sonrası yeni. Ortak kart görünümü `StoryCard`/`StoryHero`/`CardRail`'e çıkarılır ve Portföy de bunlara geçer.

**Files:**
- Create: `web/src/lib/marketPulse.js`
- Create: `web/src/components/market/StockPanel.jsx`
- Create: `web/src/components/market/GoldFxPanel.jsx`
- Create: `web/src/components/StoryCard.jsx`, `web/src/components/StoryHero.jsx`, `web/src/components/CardRail.jsx`
- Create: `web/src/pages/MarketDetail.jsx`
- Rewrite: `web/src/pages/Market.jsx`
- Modify: `web/src/components/CategoryCard.jsx`, `web/src/pages/Assets.jsx`, `web/src/pages/AssetCategory.jsx` (ortak bileşenlere geçiş, davranış aynı)
- Modify: `web/src/App.jsx` (`/market/:panel`, `/gold-fx` → `/market/gold-fx`)
- Delete: `web/src/pages/GoldFx.jsx`, `web/src/components/CategoryTiles.jsx`
- Modify: `web/src/contexts/LanguageContext.jsx`

**Interfaces:**
- Consumes: `formatPct` (Task 2), `AreaSpark` (Task 2), `useMarketOverview` → `{ indices: [{symbol:'XU100.IS'|'XU030.IS', price, changePercent, spark: number[]}], strip: [{symbol:'XAU'|'USD'|…, price, changePercent, spark}], stocks: [...] }`.
- Produces:
  - `pulse(stocks) → { mood: 'strongUp'|'up'|'flat'|'down'|'strongDown'|null, up, flat, down, total, top: Quote|null, bottom: Quote|null }`
  - `<StoryCard vt title sub topLeft value changePct values color onOpen ariaLabel className />` — `view-transition-name`: `vt`, `${vt}-name`, `${vt}-val`
  - `<StoryHero vt title value changePct values color backLabel onBack />` — aynı adlar
  - `<CardRail items={[{ key, label, node }]} prevLabel nextLabel />` — `location.state.from === key` ise o kart ortalanır
  - URL: `/market/stocks`, `/market/gold-fx`; vt kökü `mkt-<panel>`

- [ ] **Step 1: `lib/marketPulse.js`**

```js
// Piyasa nabzı — saf hesap. ±0.05 altı "değişmedi" sayılır (mevcut Market.jsx kuralı).
const FLAT = 0.05

export function moodOf(avg) {
  if (avg == null) return null
  if (avg > 1) return 'strongUp'
  if (avg > FLAT) return 'up'
  if (avg < -1) return 'strongDown'
  if (avg < -FLAT) return 'down'
  return 'flat'
}

export function pulse(stocks) {
  const rated = stocks.filter((s) => s.changePercent != null)
  const up = rated.filter((s) => s.changePercent > FLAT).length
  const down = rated.filter((s) => s.changePercent < -FLAT).length
  const avg = rated.length ? rated.reduce((a, s) => a + s.changePercent, 0) / rated.length : null
  const byChange = [...rated].sort((a, b) => b.changePercent - a.changePercent)
  return {
    mood: moodOf(avg),
    up,
    down,
    flat: rated.length - up - down,
    total: rated.length,
    top: byChange[0] ?? null,
    bottom: byChange.length > 1 ? byChange[byChange.length - 1] : null,
  }
}
```

Spec eşik tablosu "0 → yatay" diyordu; mevcut kodun ±0,05 yatay bandı korunur (tek tutarlı kural).

- [ ] **Step 2: Hızlı doğrulama (kalıcı değil)**

```bash
cd web && node --input-type=module -e "
import { pulse, moodOf } from './src/lib/marketPulse.js'
console.log(moodOf(1.5), moodOf(0.3), moodOf(0), moodOf(-0.34), moodOf(-2), moodOf(null))
console.log(JSON.stringify(pulse([])))
const p = pulse([{symbol:'A',changePercent:2},{symbol:'B',changePercent:-3},{symbol:'C',changePercent:0}]); console.log(p.up,p.flat,p.down,p.top.symbol,p.bottom.symbol)"
```

Expected: `strongUp up flat down strongDown null`; boş → `mood null, total 0, top null`; `1 1 1 A B`.

- [ ] **Step 3: Metinler**

TR:

```js
    'market.today': 'Bugün BIST 30',
    'market.mood.strongUp': 'güçlü yükselişte',
    'market.mood.up': 'hafif yükselişte',
    'market.mood.flat': 'yatay',
    'market.mood.down': 'hafif düşüşte',
    'market.mood.strongDown': 'sert düşüşte',
    'market.moodLead': 'Bugün borsa',
    'market.rose': 'yükseldi',
    'market.unchanged': 'değişmedi',
    'market.fell': 'düştü',
    'market.topGainer': 'En çok yükselen',
    'market.topLoser': 'En çok düşen',
    'market.sortGainers': 'En çok yükselen',
    'market.sortLosers': 'En çok düşen',
    'market.sortMostTraded': 'En çok işlem',
    'market.tileStocks': 'Borsa',
    'market.tileGoldFx': 'Altın & Döviz',
    'market.gramGold': 'Gram altın',
    'goldfx.rates': 'Kurlar · bugün',
```

EN:

```js
    'market.today': 'BIST 30 today',
    'market.mood.strongUp': 'rallying',
    'market.mood.up': 'slightly up',
    'market.mood.flat': 'flat',
    'market.mood.down': 'slightly down',
    'market.mood.strongDown': 'falling sharply',
    'market.moodLead': 'The market is',
    'market.rose': 'rose',
    'market.unchanged': 'unchanged',
    'market.fell': 'fell',
    'market.topGainer': 'Top gainer',
    'market.topLoser': 'Top loser',
    'market.sortGainers': 'Top gainers',
    'market.sortLosers': 'Top losers',
    'market.sortMostTraded': 'Most traded',
    'market.tileStocks': 'Stocks',
    'market.tileGoldFx': 'Gold & FX',
    'market.gramGold': 'Gram gold',
    'goldfx.rates': 'Rates · today',
```

- [ ] **Step 4: `components/market/GoldFxPanel.jsx`**

`pages/GoldFx.jsx`'in gövdesini taşı (GOLD_UNITS, `num`, `pct`, `open`, drawer, sarrafiye tablosu, 30 günlük değişim aynen). Değişen tek şey kart ızgarası ve `Page` sarmalayıcısının kalkması:

```jsx
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import AssetDrawer from '@/components/AssetDrawer'
import { Section } from '@/components/Section'
import { Sparkline } from '@/components/Sparkline'
import { catOf } from '@/lib/assetColors'

const num = (v, d = 2) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v ?? 0)
const pct = (v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—')

// Sarrafiye ağırlıkları — gram fiyatından türetilir, ayrı veri kaynağı yok.
// Milyem: külçe dışındaki ürünler 22 ayar (0.916) ve gram karşılıkları standarttır.
const GOLD_UNITS = [
  { key: 'gram', labelKey: 'goldfx.gram', grams: 1, purity: 1 },
  { key: 'quarter', labelKey: 'goldfx.quarter', grams: 1.75, purity: 0.916 },
  { key: 'half', labelKey: 'goldfx.half', grams: 3.5, purity: 0.916 },
  { key: 'full', labelKey: 'goldfx.full', grams: 7.0, purity: 0.916 },
  { key: 'republic', labelKey: 'goldfx.republic', grams: 7.216, purity: 0.916 },
]

export default function GoldFxPanel({ strip }) {
  const { t } = useLanguage()
  const [drawer, setDrawer] = useState(null)
  const gold = strip.find((q) => q.symbol === 'XAU')
  const fx = strip.filter((q) => q.symbol !== 'XAU')

  const open = (q) =>
    setDrawer({
      symbol: q.symbol,
      market: true,
      assetType: q.symbol === 'XAU' ? 'Gold' : 'Currency',
      nativeCurrency: 'TRY',
      nativePrice: q.price,
      previousClose: q.previousClose,
      priceAvailable: true,
    })

  return (
    <div className="space-y-4">
      <div>
        <div className="label mb-2 text-muted-foreground">{t('goldfx.rates')}</div>
        {/* Mobilde 2×2 — dört kur ilk ekrana sığar */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {strip.map((q) => (
            <button
              key={q.symbol}
              onClick={() => open(q)}
              className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left hover:border-foreground"
            >
              <span className="label truncate text-muted-foreground">{q.name || q.symbol}</span>
              <span className="tabular truncate text-body font-semibold tracking-tight text-foreground">{num(q.price)} ₺</span>
              <span className="flex items-end justify-between gap-2">
                {q.changePercent != null ? (
                  <span className={`tabular inline-flex rounded-full px-1.5 py-0.5 text-micro ${q.changePercent >= 0 ? 'bg-up/12 text-up' : 'bg-down/12 text-down'}`}>
                    {pct(q.changePercent)}
                  </span>
                ) : <span />}
                <Sparkline data={q.spark} className="h-6 w-14" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sarrafiye + 30 günlük değişim: GoldFx.jsx satır 87-139 AYNEN buraya
          (Section'lar, tablo, liste — hiçbir sınıf değişmez). */}

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </div>
  )
}
```

Yorum satırının yerine `GoldFx.jsx` satır 87–139'daki `<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">…</div>` bloğu birebir kopyalanır (`gold`, `fx`, `strip`, `num`, `pct`, `catOf`, `Section`, `Sparkline`, `t` hepsi bu dosyada tanımlı). Sonra `catOf` kullanılmıyorsa importu kalmaz — kopyalanan blok `catOf` kullanıyor, kalır.

- [ ] **Step 5: `components/market/StockPanel.jsx`**

`Market.jsx`'ten taşınır: `num`, `pct`, `pctCls`, `compact`, `bandPos`, `SymbolBadge`, `open`, arama + geniş arama, masaüstü tablosu. Kalkar: endeks kartları, StatCard'lar, oran çubuğu, Hacim Liderleri, 52H bölümü, `volumeLeaders`, `nearHigh`.

```jsx
import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSymbolSearch } from '@/hooks/queries'
import AssetDrawer from '@/components/AssetDrawer'
import { Section } from '@/components/Section'
import { RangeBar } from '@/components/Sparkline'
import { catOf } from '@/lib/assetColors'
import { pulse as computePulse } from '@/lib/marketPulse'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'

const num = (v) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)
const pct = (v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—')
const pctCls = (v) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-up' : 'text-down')
const compact = (v) =>
  v == null ? '—' : new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
const bandPos = (q) =>
  q.week52Low != null && q.week52High != null && q.week52High > q.week52Low
    ? ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100
    : null

const SORTS = [
  { key: 'gainers', label: 'market.sortGainers', fn: (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity) },
  { key: 'losers', label: 'market.sortLosers', fn: (a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity) },
  { key: 'volume', label: 'market.sortMostTraded', fn: (a, b) => (b.volume ?? -1) - (a.volume ?? -1) },
]

const moodCls = { strongUp: 'text-up', up: 'text-up', flat: 'text-muted-foreground', down: 'text-down', strongDown: 'text-down' }

export default function StockPanel({ stocks, bist30 }) {
  const { t } = useLanguage()
  const [drawer, setDrawer] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('gainers')

  const p = useMemo(() => computePulse(stocks), [stocks])

  const q = query.trim().toLocaleUpperCase('tr')
  const filtered = useMemo(
    () => (q.length === 0 ? stocks : stocks.filter((s) =>
      s.symbol.toLocaleUpperCase('tr').includes(q) || (s.name ?? '').toLocaleUpperCase('tr').includes(q))),
    [stocks, q]
  )
  const sorted = useMemo(() => [...filtered].sort(SORTS.find((s) => s.key === sort).fn), [filtered, sort])
  const wantsWideSearch = q.length >= 2 && filtered.length === 0
  const { data: wideResults = [], isFetching: wideSearching } = useSymbolSearch(wantsWideSearch ? query.trim() : null)

  const open = (s) =>
    setDrawer({
      symbol: s.symbol, market: true, assetType: 'Stock', exchange: 'BIST', nativeCurrency: 'TRY',
      nativePrice: s.price, previousClose: s.previousClose, dayHigh: s.dayHigh, dayLow: s.dayLow,
      week52High: s.week52High, week52Low: s.week52Low, priceAvailable: true,
    })

  return (
    <div className="space-y-4">
      {/* Nabız: yorum + sayılar + öne çıkanlar (spec §4.1) */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="label text-muted-foreground">{t('market.today')}</span>
          {bist30 && <span className={`tabular text-micro ${pctCls(bist30.changePercent)}`}>{num(bist30.price)} · {pct(bist30.changePercent)}</span>}
        </div>
        <p className="mt-2 text-body text-foreground">
          {t('market.moodLead')}{' '}
          <b className={cn('font-semibold', p.mood ? moodCls[p.mood] : 'text-muted-foreground')}>
            {p.mood ? t(`market.mood.${p.mood}`) : '—'}
          </b>
        </p>
        <div className="mt-3 flex gap-6">
          {[['up', 'text-up', 'market.rose'], ['flat', 'text-muted-foreground', 'market.unchanged'], ['down', 'text-down', 'market.fell']].map(([k, cls, label]) => (
            <div key={k} className="flex flex-col">
              <span className={`tabular text-head font-semibold leading-none ${cls}`}>{p.total ? p[k] : '—'}</span>
              <span className="mt-1 text-micro text-muted-foreground">{t(label)}</span>
            </div>
          ))}
        </div>
        {(p.top || p.bottom) && (
          <div className="mt-3 divide-y divide-border border-t border-border">
            {[[p.top, 'market.topGainer'], [p.bottom, 'market.topLoser']].filter(([s]) => s).map(([s, label]) => (
              <button key={label} onClick={() => open(s)} className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-ui">
                <span className="text-muted-foreground">{t(label)} · <b className="font-semibold text-foreground">{s.symbol}</b></span>
                <span className={`tabular ${pctCls(s.changePercent)}`}>{pct(s.changePercent)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Arama + sıralama çipleri */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('market.searchPlaceholder')}
            aria-label={t('market.searchPlaceholder')}
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-ui text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none md:w-72"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('common.clear')} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={cn('h-9 shrink-0 rounded-full border px-3 text-ui',
                sort === s.key ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground')}
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>

      <Section title="BIST 30" meta={`${sorted.length} / ${stocks.length}`}>
        {/* Mobil: satır listesi */}
        <ul className="divide-y divide-border md:hidden">
          {sorted.map((s) => (
            <li key={s.symbol}>
              <button onClick={() => open(s)} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left">
                <span className="min-w-0">
                  <span className="block text-body font-semibold text-foreground">{s.symbol}</span>
                  <span className="block truncate text-micro text-muted-foreground">{s.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tabular block text-ui font-semibold text-foreground">₺{num(s.price)}</span>
                  <span className={`tabular mt-0.5 inline-flex rounded px-1.5 py-0.5 text-micro ${s.changePercent >= 0 ? 'bg-up/12 text-up' : 'bg-down/12 text-down'}`}>
                    {pct(s.changePercent)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Masaüstü: Market.jsx satır 243-285'teki tablo AYNEN (sınıfı "hidden overflow-x-auto md:block" olur) */}

        {/* Boş sonuç + geniş arama: Market.jsx satır 287-305 AYNEN */}
      </Section>

      {drawer && <AssetDrawer holding={drawer} onClose={() => setDrawer(null)} onSell={() => {}} />}
    </div>
  )
}

function SymbolBadge({ symbol }) {
  const cat = catOf('Stock')
  return (
    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md font-mono text-micro ${cat.tint} ${cat.text}`}>
      {symbol.slice(0, 2)}
    </span>
  )
}
```

İki yorum satırı, `Market.jsx`'in belirtilen satırlarıyla birebir değiştirilir: tablo bloğunun dış `<div className="overflow-x-auto">` sınıfı `hidden overflow-x-auto md:block` olur; boş-sonuç bloğu bu div'in DIŞINA (Section içine) alınır ki mobilde de görünsün. Tablo `SymbolBadge`, `RangeBar`, `compact`, `bandPos` kullanır — hepsi bu dosyada.

- [ ] **Step 6: Ortak kart bileşenleri**

`components/StoryCard.jsx`:

```jsx
import { AreaSpark } from '@/components/AreaSpark'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const pctCls = (v) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-up' : 'text-down')

// Uzun kart: dokununca detay sayfasına büyür. vt = view-transition-name kökü (StoryHero ile aynı).
// Gölge yok (VOLTAJ): üzerine gelince ink kenarlık + hafif kalkar; basınca içe basma.
export function StoryCard({ vt, title, sub, topLeft, value, changePct, values, color, onOpen, ariaLabel, className }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      style={{ viewTransitionName: vt }}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-lg border border-border bg-card px-4 pt-4 text-center text-foreground',
        'transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground',
        'active:translate-y-0 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className
      )}
    >
      <span className="flex w-full justify-between text-micro text-muted-foreground">
        <span>{topLeft}</span>
        <span className={pctCls(changePct)}>{formatPct(changePct)}</span>
      </span>
      <span className="mt-6 text-head font-bold tracking-tight" style={{ viewTransitionName: `${vt}-name` }}>{title}</span>
      <span className="text-micro text-muted-foreground">{sub}</span>
      <span className="tabular mt-5 text-head font-semibold tracking-tight md:text-title" style={{ viewTransitionName: `${vt}-val` }}>{value}</span>
      <span className={cn('tabular text-ui', pctCls(changePct))}>{formatPct(changePct)}</span>
      <AreaSpark values={values} color={color} className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-80 transition-opacity duration-200 group-hover:opacity-100" />
    </button>
  )
}
```

`components/StoryHero.jsx`:

```jsx
import { AreaSpark } from '@/components/AreaSpark'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

// Detay sayfasının üst alanı — kartın büyüdüğü yer (StoryCard ile aynı vt adları)
export function StoryHero({ vt, title, value, changePct, values, color, backLabel, onBack }) {
  return (
    <section
      style={{ viewTransitionName: vt }}
      className="relative mb-4 flex h-[240px] flex-col items-center overflow-hidden rounded-lg border border-border bg-card px-4 pt-2 text-center"
    >
      <button type="button" onClick={onBack} className="press flex h-11 items-center gap-1 self-start rounded-md pr-3 text-ui text-foreground hover:bg-secondary">
        <ChevronLeft className="h-4 w-4" /> {backLabel}
      </button>
      <span className="text-head font-bold tracking-tight" style={{ viewTransitionName: `${vt}-name` }}>{title}</span>
      <span className="tabular mt-2 text-head font-semibold tracking-tight md:text-title" style={{ viewTransitionName: `${vt}-val` }}>{value}</span>
      <span className={cn('tabular text-ui', changePct == null ? 'text-muted-foreground' : changePct >= 0 ? 'text-up' : 'text-down')}>
        {formatPct(changePct)}
      </span>
      <AreaSpark values={values} color={color} className="absolute inset-x-0 bottom-0 h-[38%] w-full" />
    </section>
  )
}
```

`components/CardRail.jsx` — Assets.jsx'teki ray + noktalar + oklar + geri dönüşte ortalama kodu buraya taşınır (davranış aynı):

```jsx
import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Mobil: tek kart tam genişlik, yatay kaydırma + noktalar/oklar. md+: kartlar yan yana.
export function CardRail({ items, prevLabel, nextLabel }) {
  const location = useLocation()
  const railRef = useRef(null)
  const [index, setIndex] = useState(0)

  // Detaydan dönünce o kart ortada olsun
  useLayoutEffect(() => {
    const from = location.state?.from
    const rail = railRef.current
    const card = from && rail?.querySelector(`[data-key="${from}"]`)
    if (card) rail.scrollLeft = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2
  }, [location.state])

  const onScroll = () => {
    const rail = railRef.current
    const mid = rail.scrollLeft + rail.clientWidth / 2
    const cards = [...rail.children]
    const dist = (c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
    setIndex(cards.reduce((b, c, i) => (dist(c) < dist(cards[b]) ? i : b), 0))
  }
  const goTo = (i) => {
    const rail = railRef.current
    const card = rail.children[i]
    rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <>
      <div
        ref={railRef}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-8 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:auto-cols-fr md:grid-flow-col md:gap-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => (
          <div key={it.key} data-key={it.key} className="w-full shrink-0 snap-center pt-1 md:w-auto">{it.node}</div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1 md:hidden">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={prevLabel}
          className="press grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {items.map((it, i) => (
          <button key={it.key} type="button" onClick={() => goTo(i)} aria-label={it.label} aria-current={i === index}
            className="grid h-10 w-6 place-items-center">
            <i className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-foreground' : 'w-1.5 bg-border')} />
          </button>
        ))}
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === items.length - 1} aria-label={nextLabel}
          className="press grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 7: Portföy ortak bileşenlere geçer (davranış aynı)**

`CategoryCard.jsx` gövdesi → `<StoryCard vt={\`cat-${slug}\`} title={name} sub={t(\`portfolio.series.${type}\`)} topLeft={summary.count ? … : t('portfolio.empty')} value={money(summary.value)} changePct={summary.changePct} values={closes} color={catOf(type).hex} onOpen={onOpen} ariaLabel={…} className={className} />` (kullanılmayan importlar çıkar).

`Assets.jsx`: ray/nokta/ok/useLayoutEffect kodu silinir, yerine:

```jsx
          <CardRail
            prevLabel={t('portfolio.prev')}
            nextLabel={t('portfolio.next')}
            items={categories.map((c) => ({
              key: slugOf(c.key),
              label: t(`assets.${c.key.toLowerCase()}`),
              node: (
                <CategoryCard
                  summary={c}
                  className="h-[min(400px,calc(100dvh-290px))] min-h-[300px] w-full md:h-[340px]"
                  onOpen={() => navigate(`/assets/${slugOf(c.key)}`, { viewTransition: true })}
                />
              ),
            }))}
          />
```

`AssetCategory.jsx`: `<section>…</section>` → `<StoryHero vt={\`cat-${category}\`} title={name} value={money(summary.value)} changePct={summary.changePct} values={closes} color={catOf(type).hex} backLabel={t('portfolio.back')} onBack={back} />`.

Kontrol: Task 2'deki geri dönüş testi (kart merkez sapması) aynı sonucu vermeli.

- [ ] **Step 8: Metinler (Step 3'e ek)**

TR: `'market.back': 'Piyasa'`, `'market.open': '{name} ayrıntıları'`, `'market.seriesStocks': 'BIST 100 · son 30 gün'`, `'market.seriesGoldFx': 'Gram altın · son 30 gün'`, `'market.prev': 'Önceki'`, `'market.next': 'Sonraki'`.
EN: `'market.back': 'Markets'`, `'market.open': '{name} details'`, `'market.seriesStocks': 'BIST 100 · last 30 days'`, `'market.seriesGoldFx': 'Gram gold · last 30 days'`, `'market.prev': 'Previous'`, `'market.next': 'Next'`.

- [ ] **Step 9: `pages/Market.jsx` (yeniden yazılır)**

```jsx
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page } from '@/components/Page'
import { StoryCard } from '@/components/StoryCard'
import { CardRail } from '@/components/CardRail'
import { catOf } from '@/lib/assetColors'

const num0 = (v) => (v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(v))

// Piyasa: Borsa ve Altın & Döviz kartları; dokununca /market/<panel> detayına büyür
export default function Market() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data, isLoading } = useMarketOverview()
  const bist100 = data?.indices?.find((i) => i.symbol === 'XU100.IS')
  const gold = data?.strip?.find((q) => q.symbol === 'XAU')

  const cards = [
    { key: 'stocks', title: t('market.tileStocks'), sub: t('market.seriesStocks'), topLeft: 'BIST 100',
      value: num0(bist100?.price), changePct: bist100?.changePercent ?? null, values: bist100?.spark ?? [], color: catOf('Stock').hex },
    { key: 'gold-fx', title: t('market.tileGoldFx'), sub: t('market.seriesGoldFx'), topLeft: t('market.gramGold'),
      value: gold ? `₺${num0(gold.price)}` : '—', changePct: gold?.changePercent ?? null, values: gold?.spark ?? [], color: catOf('Gold').hex },
  ]

  return (
    <Page eyebrow={t('nav.sectionMarket')} title={t('nav.market')} meta={t('market.delayNote')}>
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <CardRail
          prevLabel={t('market.prev')}
          nextLabel={t('market.next')}
          items={cards.map((c) => ({
            key: c.key,
            label: c.title,
            node: (
              <StoryCard
                vt={`mkt-${c.key}`}
                title={c.title}
                sub={c.sub}
                topLeft={c.topLeft}
                value={c.value}
                changePct={c.changePct}
                values={c.values}
                color={c.color}
                ariaLabel={t('market.open').replace('{name}', c.title)}
                className="h-[min(400px,calc(100dvh-240px))] min-h-[300px] w-full md:h-[340px]"
                onOpen={() => navigate(`/market/${c.key}`, { viewTransition: true })}
              />
            ),
          }))}
        />
      )}
    </Page>
  )
}
```

Veri hiç gelmezse kartlar "—" ve grafiksiz çizilir (Review Focus 2).

- [ ] **Step 10: `pages/MarketDetail.jsx`**

```jsx
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page } from '@/components/Page'
import { StoryHero } from '@/components/StoryHero'
import StockPanel from '@/components/market/StockPanel'
import GoldFxPanel from '@/components/market/GoldFxPanel'
import { catOf } from '@/lib/assetColors'

const num0 = (v) => (v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(v))
const PANELS = ['stocks', 'gold-fx']

export default function MarketDetail() {
  const { panel } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data, isLoading } = useMarketOverview()

  if (!PANELS.includes(panel)) return <Navigate to="/market" replace />

  const stocks = panel === 'stocks'
  const bist100 = data?.indices?.find((i) => i.symbol === 'XU100.IS')
  const bist30 = data?.indices?.find((i) => i.symbol === 'XU030.IS')
  const gold = data?.strip?.find((q) => q.symbol === 'XAU')
  const q = stocks ? bist100 : gold
  const title = stocks ? t('market.tileStocks') : t('market.tileGoldFx')

  return (
    <Page eyebrow={t('nav.market')} title={title} meta={t('market.delayNote')}>
      <StoryHero
        vt={`mkt-${panel}`}
        title={title}
        value={q ? (stocks ? num0(q.price) : `₺${num0(q.price)}`) : '—'}
        changePct={q?.changePercent ?? null}
        values={q?.spark ?? []}
        color={catOf(stocks ? 'Stock' : 'Gold').hex}
        backLabel={t('market.back')}
        onBack={() => navigate('/market', { viewTransition: true, state: { from: panel } })}
      />
      <div className="rise">
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : stocks ? (
          <StockPanel stocks={data?.stocks ?? []} bist30={bist30} />
        ) : (
          <GoldFxPanel strip={data?.strip ?? []} />
        )}
      </div>
    </Page>
  )
}
```

- [ ] **Step 11: Rotalar + silmeler**

`App.jsx`: `import MarketDetail from './pages/MarketDetail'`; `/market` satırının altına `<Route path="/market/:panel" element={<MarketDetail />} />`; `/gold-fx` yönlendirmesi `to="/market/gold-fx"`.

```bash
cd web && rm src/pages/GoldFx.jsx src/components/CategoryTiles.jsx && grep -rn "CategoryTiles\|pages/GoldFx" src
```

Expected: grep boş.

- [ ] **Step 12: Lint + build** — Task 1 Step 6.

- [ ] **Step 13: Tarama** — `docker compose up -d --build --no-deps web`; `audit.spec.js` piyasa listesi `['/market', '/market/stocks', '/market/gold-fx']` olur; `AUDIT_WAIT=6000 npx playwright test audit.spec.js -g "piyasa|panel" --reporter=line`. Expected: tüm sayfalarda `scrollW === vw`; Portföy sonuçları Task 2 ile aynı.

- [ ] **Step 14: Review Focus (geçici test, sonra silinir)** — `/gold-fx` → `/market/gold-fx`; `/market/xyz` → `/market`; Borsa kartı → detay → "‹ Piyasa" → Borsa kartı ortada; Portföy geri dönüş testi hâlâ geçiyor.

- [ ] **Step 15: Kullanıcı kontrolü** — nabız metni, sıralama çipleri, satıra dokununca drawer, 2×2 kurlar, kart geçişi. Onay gelmeden Task 4'e geçme.

---

### Task 4: Fiyatlı takvim + Varlık Al

**Files:**
- Create: `web/src/lib/heat.js`
- Create: `web/src/components/PriceCalendar.jsx`
- Rewrite: `web/src/pages/AddAsset.jsx`
- Delete: `web/src/components/ui/calendar.jsx`, `web/src/components/ui/date-picker.jsx`
- Modify: `web/package.json`, `web/package-lock.json` (react-day-picker çıkar)
- Modify: `web/src/contexts/LanguageContext.jsx`

**Interfaces:**
- Consumes: `usePriceHistory(symbol, assetType, '1y')` → `{ currency: string, candles: [{ time: unixSec, close: number }] }`; `usePriceOnDate(symbol, assetType, 'YYYY-MM-DD')` → `{ available, priceInTry, priceInUsd, priceKind, effectiveDate, requestedDate }`; `toDateString`, `fromDateString`, `todayString`, `formatDisplayDate` (`lib/date.js`).
- Produces:
  - `heatTier(value: number, monthValues: number[]) → 0..4`
  - `shortPrice(value: number) → string` (≤ 5 karakter)
  - `closesByDay(candles) → Map<'YYYY-MM-DD', number>`
  - `monthsBack(from: Date, count: number) → { year, month }[]` (en yeni önce)
  - `<PriceCalendar open symbol assetType value onClose onSelect />`

- [ ] **Step 1: `lib/heat.js`**

```js
import { toDateString } from './date.js'

// Ay içi göreli 5 kademe: o ayın en ucuzu 0, en pahalısı 4.
export function heatTier(value, monthValues) {
  if (value == null || monthValues.length === 0) return null
  const lo = Math.min(...monthValues)
  const hi = Math.max(...monthValues)
  if (hi === lo) return 2
  return Math.min(4, Math.floor(((value - lo) / (hi - lo)) * 5))
}

// Takvim hücresine sığan fiyat (≤ 5 karakter, tr-TR).
export function shortPrice(v) {
  if (v == null) return ''
  const fmt = (n, d) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })
  if (v >= 100_000) return fmt(v / 1_000_000, 1) + 'M'
  if (v >= 10_000) return fmt(v / 1000, 0) + 'B'
  if (v >= 1000) return fmt(v / 1000, 1) + 'B'
  if (v >= 100) return fmt(v, 0)
  if (v >= 10) return fmt(v, 1)
  return fmt(v, 2)
}

// Günlük mumlar → yerel gün anahtarı. Mum zamanı Unix saniye (borsa açılışı);
// yerel tarihe çevirmek BIST/NASDAQ/altın için doğru günü verir.
export function closesByDay(candles = []) {
  const map = new Map()
  for (const c of candles) map.set(toDateString(new Date(c.time * 1000)), c.close)
  return map
}

export function monthsBack(from, count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
}
```

- [ ] **Step 2: Hızlı doğrulama (kalıcı değil)**

```bash
cd web && node --input-type=module -e "
import { heatTier, shortPrice, closesByDay, monthsBack } from './src/lib/heat.js'
console.log(heatTier(10,[10,20]), heatTier(20,[10,20]), heatTier(15,[10,20]), heatTier(5,[5,5]), heatTier(null,[1]))
console.log(['1,92','21,10','394,50','6607','43674','1234567'].map(s=>shortPrice(+s.replace(',','.'))).join(' '))
console.log([...closesByDay([{time:1760421600,close:5}])][0], JSON.stringify(monthsBack(new Date(2026,0,15),3)))"
```

Expected: `0 4 2 2 null`; `1,92 21,1 395 6,6B 44B 1,2M` (hepsi ≤ 5 karakter); `[ '2025-10-14', 5 ]`; `[{2026,0},{2025,11},{2025,10}]`.

- [ ] **Step 3: Metinler**

TR:

```js
    'cal.title': 'Alış tarihi',
    'cal.lastYear': 'son 1 yıl',
    'cal.cheap': 'Ucuz',
    'cal.expensive': 'Pahalı',
    'cal.selected': 'Seçilen',
    'cal.today': 'Bugün',
    'cal.use': 'Bu tarihi kullan',
    'cal.older': 'Daha eski tarih',
    'cal.olderNote': '1 yıldan eski günlerde fiyat gösterilmez',
    'buy.thenPrice': 'O günkü fiyat',
    'buy.nowPrice': 'Bugünkü fiyat',
    'buy.sinceThen': 'O günden bugüne',
    'buy.livePrice': 'Güncel fiyat',
    'buy.total': 'Toplam alış',
    'buy.cta': '{qty} {unit} al',
    'buy.unitPiece': 'adet',
    'buy.unitGram': 'gram',
```

EN:

```js
    'cal.title': 'Purchase date',
    'cal.lastYear': 'last 1 year',
    'cal.cheap': 'Cheap',
    'cal.expensive': 'Expensive',
    'cal.selected': 'Selected',
    'cal.today': 'Today',
    'cal.use': 'Use this date',
    'cal.older': 'Older date',
    'cal.olderNote': 'No prices for dates older than 1 year',
    'buy.thenPrice': 'Price that day',
    'buy.nowPrice': 'Price today',
    'buy.sinceThen': 'Since then',
    'buy.livePrice': 'Current price',
    'buy.total': 'Total cost',
    'buy.cta': 'Buy {qty} {unit}',
    'buy.unitPiece': 'units',
    'buy.unitGram': 'grams',
```

- [ ] **Step 4: `components/PriceCalendar.jsx`**

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory } from '@/hooks/queries'
import { toDateString, fromDateString, formatDisplayDate } from '@/lib/date'
import { heatTier, shortPrice, closesByDay, monthsBack } from '@/lib/heat'
import { catOf } from '@/lib/assetColors'
import { cn } from '@/lib/utils'

// Kategori rengi kart zeminiyle karıştırılır: %10 → %100 (voltaj değil — DESIGN.md doz kuralı)
const MIX = [10, 28, 48, 72, 100]
const heatStyle = (hex, tier) =>
  tier == null ? undefined : { background: `color-mix(in oklab, ${hex} ${MIX[tier]}%, hsl(var(--card)))`, color: tier >= 3 ? '#fff' : undefined }

const YEARS_BACK = 20

export default function PriceCalendar({ open, symbol, assetType, value, onClose, onSelect }) {
  const { t, lang } = useLanguage()
  const { data: history } = usePriceHistory(open ? symbol : null, assetType, '1y')
  const closes = useMemo(() => closesByDay(history?.candles), [history])
  const hex = catOf(assetType).hex
  const today = useMemo(() => new Date(), [])
  const yearAgo = useMemo(() => new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), [today])
  const [picked, setPicked] = useState(value)
  const [extraMonths, setExtraMonths] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => { if (open) setPicked(value) }, [open, value])

  // Açılınca seçili ayın başlığına kaydır
  useEffect(() => {
    if (!open) return
    const el = scrollRef.current?.querySelector(`[data-month="${value.slice(0, 7)}"]`)
    el?.scrollIntoView({ block: 'start' })
  }, [open, value])

  if (!open) return null

  const months = monthsBack(today, 13 + extraMonths)
  const pickedClose = closes.get(picked)
  const todayClose = closes.get(toDateString(today)) ?? [...closes.values()].at(-1)
  const diff = pickedClose != null && todayClose != null ? ((todayClose - pickedClose) / pickedClose) * 100 : null
  const weekdays = lang === 'tr' ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:inset-auto md:left-1/2 md:top-1/2 md:h-[640px] md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:border-border" role="dialog" aria-modal="true" aria-label={t('cal.title')}>
      <div className="flex items-center gap-2 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button onClick={onClose} aria-label={t('common.cancel')} className="grid h-11 w-11 place-items-center rounded-md text-foreground hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="text-body font-semibold text-foreground">{t('cal.title')}</div>
          <div className="truncate text-micro text-muted-foreground">{symbol ? `${symbol} · ${t('cal.lastYear')}${history?.currency ? ` · ${history.currency}` : ''}` : ''}</div>
        </div>
      </div>

      {closes.size > 0 && (
        <div className="flex items-center gap-2 px-4 pb-2 text-micro text-muted-foreground">
          <span>{t('cal.cheap')}</span>
          <span className="flex gap-0.5">{MIX.map((_, i) => <i key={i} className="h-2 w-4 rounded-sm" style={heatStyle(hex, i)} />)}</span>
          <span>{t('cal.expensive')}</span>
        </div>
      )}

      <div className="grid grid-cols-7 border-b border-border px-3 py-1.5">
        {weekdays.map((d) => <span key={d} className="text-center text-micro font-semibold uppercase text-muted-foreground">{d}</span>)}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {months.map(({ year, month }) => {
          const key = `${year}-${String(month + 1).padStart(2, '0')}`
          const days = new Date(year, month + 1, 0).getDate()
          const lead = (new Date(year, month, 1).getDay() + 6) % 7
          const monthVals = []
          for (let d = 1; d <= days; d++) {
            const v = closes.get(`${key}-${String(d).padStart(2, '0')}`)
            if (v != null) monthVals.push(v)
          }
          return (
            <section key={key} data-month={key} className="pt-4">
              <h3 className="px-1 pb-2 text-ui font-semibold text-foreground">
                {new Date(year, month, 1).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="grid grid-cols-7 gap-[3px]">
                {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const date = new Date(year, month, i + 1)
                  const ds = toDateString(date)
                  const future = date > today
                  const v = date >= yearAgo ? closes.get(ds) : undefined
                  const tier = v != null ? heatTier(v, monthVals) : null
                  return (
                    <button
                      key={ds}
                      disabled={future}
                      onClick={() => setPicked(ds)}
                      style={heatStyle(hex, tier)}
                      aria-label={`${formatDisplayDate(ds, lang)}${v != null ? ` ${v}` : ''}`}
                      aria-pressed={picked === ds}
                      className={cn(
                        'flex aspect-[1/1.08] min-w-0 flex-col items-center justify-between rounded-md py-1 text-foreground disabled:opacity-30',
                        v == null && 'text-muted-foreground',
                        picked === ds && 'outline outline-2 outline-offset-1 outline-foreground'
                      )}
                    >
                      <span className={cn('text-ui', ds === toDateString(today) && 'font-bold text-voltage')}>{i + 1}</span>
                      <span className="tabular text-[10px] leading-none">{v != null ? shortPrice(v) : ''}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* 1 yıldan eskisi: ay ay daha eskiye — renksiz, fiyatsız */}
        {months.length < YEARS_BACK * 12 && (
          <div className="pt-4 text-center">
            <button onClick={() => setExtraMonths((n) => n + 12)} className="h-11 rounded-full border border-border px-4 text-ui text-foreground">
              {t('cal.older')}
            </button>
            <p className="mt-2 text-micro text-muted-foreground">{t('cal.olderNote')}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="label text-muted-foreground">{t('cal.selected')}</span>
          <span className="text-micro text-muted-foreground">{formatDisplayDate(picked, lang)}</span>
        </div>
        {pickedClose != null && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="tabular text-figure font-semibold text-foreground">{pickedClose.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>
            {diff != null && (
              <span className="text-micro text-muted-foreground">
                {t('cal.today')} <span className="tabular text-foreground">{todayClose.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>
                {' · '}<span className={diff >= 0 ? 'text-up' : 'text-down'}>{diff >= 0 ? '+' : '−'}%{Math.abs(diff).toFixed(1).replace('.', ',')}</span>
              </span>
            )}
          </div>
        )}
        <button onClick={() => onSelect(picked)} className="h-12 w-full rounded-md bg-foreground text-body font-semibold text-background">
          {t('cal.use')}
        </button>
      </div>
    </div>
  )
}
```

`fromDateString` kullanılmıyorsa importtan çıkarılır (lint yakalar).

- [ ] **Step 5: `pages/AddAsset.jsx` (yeniden yazılır)**

Korunanlar birebir: `assetTypes`, `currencySymbols`, `currencies`; state'ler; `reference` sorgusu; `refPrice`/`deviationOf`; otomatik fiyat `useEffect`; hisse arama `useEffect`; `handleTypeChange`, `handleSelectResult`, `handleClearSymbol`, `handleSubmit`; onay `Modal`; Tür/Varlık/Miktar alanları (mevcut satır 154–264 JSX'i); fiyat kaynağı/sapma metni (mevcut satır 308–341). Değişenler:

Importlar: `DatePicker`, `Card*` kalkar; eklenir:

```jsx
import { useSearchParams } from 'react-router-dom'
import PriceCalendar from '@/components/PriceCalendar'
import { formatPct } from '@/lib/format'
import { CalendarDays } from 'lucide-react'
```

State/sorgu ekleri (`reference` satırının altına):

```jsx
  const [params, setParams] = useSearchParams()
  const calOpen = params.get('date') === 'pick'
  // Takvim geçmişe kayıt ekler → telefonun geri tuşu yalnızca takvimi kapatır
  const openCal = () => setParams((p) => { p.set('date', 'pick'); return p })
  const closeCal = () => navigate(-1)

  const today = todayString()
  const { data: nowRef } = usePriceOnDate(date !== today ? symbol : null, assetType, today)
  const pick = (v) => (currency === 'USD' ? v?.priceInUsd : v?.priceInTry)
  const thenPrice = reference?.available ? pick(reference) : null
  const nowPrice = date === today ? thenPrice : nowRef?.available ? pick(nowRef) : null
  const sinceThen = thenPrice != null && nowPrice != null && date !== today ? ((nowPrice - thenPrice) / thenPrice) * 100 : null
  const totalCost = quantity && unitPrice ? parseFloat(quantity) * parseFloat(unitPrice) : null
  const unitWord = assetType === 'Gold' ? t('buy.unitGram') : assetType === 'Stock' ? t('buy.unitPiece') : (symbol || '')
```

Doğrudan `/assets/buy?date=pick` ile açılırsa `navigate(-1)` uygulamadan çıkarabilir; bunu önlemek için:

```jsx
  const closeCal = () =>
    window.history.state?.idx > 0 ? navigate(-1) : setParams((p) => { p.delete('date'); return p }, { replace: true })
```

(Yukarıdaki ilk `closeCal` tanımı yerine bu kullanılır.)

Dönüş iskeleti:

```jsx
  return (
    <Page
      eyebrow={t('assets.title')}
      title={t('assets.buyAsset')}
      actions={
        <Button variant="ghost" size="icon" onClick={() => navigate('/assets')} aria-label={t('common.cancel')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 pb-24 md:pb-0">
        {error && (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-ui text-destructive">{error}</div>
        )}

        {/* Tür, Varlık, Miktar: mevcut satır 154-264 AYNEN */}

        {/* Alış tarihi — tam ekran takvimi açar */}
        <div className="space-y-1.5">
          <Label>{t('assets.purchaseDate')}</Label>
          <button
            type="button"
            onClick={openCal}
            className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-body text-foreground"
          >
            {formatDisplayDate(date, lang)}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Birim fiyat + para birimi: mevcut satır 279-306 AYNEN */}

        {/* Fiyat kaynağı / sapma metni: mevcut satır 308-341 AYNEN */}

        {/* O gün / bugün karşılaştırması — yalnızca otomatik fiyatta */}
        {priceSource === 'auto' && thenPrice != null && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-3.5">
            {date === today ? (
              <div className="flex items-baseline justify-between">
                <span className="text-ui text-muted-foreground">{t('buy.livePrice')}</span>
                <span className="tabular text-body text-foreground">{thenPrice.toFixed(2)} {currency}</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-ui text-muted-foreground">{t('buy.thenPrice')}</span>
                  <span className="tabular text-body text-foreground">{thenPrice.toFixed(2)} {currency}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ui text-muted-foreground">{t('buy.nowPrice')}</span>
                  <span className="tabular text-body text-foreground">{nowPrice != null ? `${nowPrice.toFixed(2)} ${currency}` : '…'}</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-2">
                  <span className="label text-muted-foreground">{t('buy.sinceThen')}</span>
                  <span className={`tabular text-figure font-semibold ${sinceThen == null ? 'text-muted-foreground' : sinceThen >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatPct(sinceThen)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {totalCost != null && (
          <div className="flex items-baseline justify-between px-0.5">
            <span className="label text-muted-foreground">{t('buy.total')}</span>
            <span className="tabular text-figure font-semibold text-foreground">{totalCost.toFixed(2)} {currency}</span>
          </div>
        )}

        {/* Al butonu: mobilde alt menünün üstüne yapışık */}
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background px-4 py-3 md:static md:border-0 md:p-0">
          <Button type="submit" className="h-12 w-full text-body md:w-auto" disabled={buyMutation.isPending || !assetType || !symbol || !quantity || !unitPrice}>
            {buyMutation.isPending ? '...' : quantity ? t('buy.cta').replace('{qty}', quantity).replace('{unit}', unitWord) : t('assets.buy')}
          </Button>
        </div>
      </form>

      <PriceCalendar
        open={calOpen}
        symbol={symbol}
        assetType={assetType}
        value={date}
        onClose={closeCal}
        onSelect={(v) => { setDate(v); if (priceSource === 'auto') setUnitPrice(''); closeCal() }}
      />

      {/* Onay Modal: mevcut satır 355-376 AYNEN */}
    </Page>
  )
```

Yorum satırları mevcut dosyanın belirtilen satırlarıyla birebir değiştirilir. Eski "İptal" butonu kalkar (başlıktaki geri ok).

- [ ] **Step 6: Eski takvim dosyaları + bağımlılık**

Run:

```bash
cd web && grep -rln "ui/calendar\|ui/date-picker\|react-day-picker" src
```

Expected: yalnızca `src/components/ui/calendar.jsx` ve `src/components/ui/date-picker.jsx`. Sonra:

```bash
rm src/components/ui/calendar.jsx src/components/ui/date-picker.jsx && npm uninstall react-day-picker
```

- [ ] **Step 7: Lint + build + Review Focus 3/5 kontrolü**

Task 1 Step 6 komutu. Sonra imajı derle, Playwright MCP ile (375px) elle:
- Tür seçmeden takvimi aç → renksiz takvim, gün seçilebiliyor.
- Hisse → AAPL, para birimi TRY → takvim başlığı "USD", formdaki fiyat TL.
- Altın → takvimde son 1 yıl renkli + fiyatlı, "Daha eski tarih" sonrası aylar renksiz.

- [ ] **Step 8: Review Focus 4 — geri tuşu**

Playwright MCP: Altın seç, miktar 25 yaz, takvimi aç, `browser_navigate_back` → takvim kapalı, miktar hâlâ 25, URL `/assets/buy`. Takvimi aç, gün seç, "Bu tarihi kullan" → karşılaştırma kutusu görünür, tarih alanı güncel.

- [ ] **Step 9: Tarama** — `npx playwright test audit.spec.js -g "/assets/buy" --reporter=line`. Expected: `scrollW === vw`; Al butonu alt menünün hemen üstünde.

- [ ] **Step 10: Kullanıcı kontrolü** — tarayıcıda (DevTools mobil görünüm) tüm akış; tarayıcının geri butonu takvimi kapatmalı. Onay gelmeden Task 5'e geçme.

---

### Task 5: Mobil başlık + WebKit font

**Files:**
- Modify: `web/src/components/Page.jsx:9,17`
- Modify (koşullu): `web/src/main.jsx` veya `web/src/index.css` (font)

- [ ] **Step 1: Başlık eylemleri tek satır**

`Page.jsx` satır 9 ve 17:

```jsx
        <div className="flex items-end gap-3 pb-3 md:flex-wrap md:pb-4">
```

```jsx
          {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
```

Satır 10'daki başlık kabı `min-w-0 flex-1` olur ki uzun başlık kırpılsın, eylemler alta düşmesin.

- [ ] **Step 2: Overview eylemleri mobilde ikon**

`Overview.jsx` satır 69–72: GhostAction metni mobilde gizlenir:

```jsx
          <GhostAction onClick={() => navigate('/assets')} aria-label={t('overview.allAssets')}>
            <span className="hidden sm:inline">{t('overview.allAssets')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </GhostAction>
```

- [ ] **Step 3: WebKit font — önce doğrula**

Gerçek iPhone kontrolü AWS deploy'unda. Burada yalnızca kod tarafı: `grep -rn "fontsource" web/src` ile import'u bul; `@fontsource-variable/inter` için ağırlık aralığını taşıyan dosyanın (`index.css` veya `wght.css`) import edildiğini doğrula. Eksikse düzelt ve Playwright WebKit (`iphone-se`) ekran görüntüsünde başlığın kalınlaştığına bak. Kod doğruysa ve WebKit hâlâ ince gösteriyorsa: Playwright WebKit farkı say, BACKLOG'a "AWS'de gerçek iPhone'da doğrula" notu düş, adımı kapat. İki denemede çözülmezse dur, kullanıcıya rapor et.

- [ ] **Step 4: Lint + build + tarama** — Task 1 Step 6; `audit.spec.js -g "panel"`; `android-360_overview.png`'de eylemler başlıkla aynı satırda.

- [ ] **Step 5: Kullanıcı kontrolü.**

---

### Task 6: Landing yatay taşma

**Files:**
- Modify: `web/src/pages/Landing.jsx` (teşhise göre)

- [ ] **Step 1: Teşhis**

Playwright MCP, 360px, `/landing`, `browser_evaluate`:

```js
() => {
  const vw = document.documentElement.clientWidth
  return [...document.querySelectorAll('body *')]
    .filter((el) => el.getBoundingClientRect().right > vw + 1)
    .filter((el) => !el.closest('[class*="overflow-x-auto"]') || el.matches('[class*="overflow-x-auto"]'))
    .slice(0, 8)
    .map((el) => `${el.tagName.toLowerCase()} ${String(el.getAttribute('class')).slice(0, 80)}`)
}
```

Expected: taşan en dış eleman(lar). Tahmin: `overflow-x-auto` kabının bir grid/flex atasında `min-w-0` yok.

- [ ] **Step 2: Düzelt**

Bulunan atanın sınıfına `min-w-0` ekle (grid/flex çocuğu ise) veya taşan elemana `max-w-full`. Tek, cerrahi değişiklik. İki denemede çözülmezse dur ve rapor et.

- [ ] **Step 3: Tarama** — `audit.spec.js -g "landing"`. Expected: 3 cihazda `scrollW === vw` (önce 604).

- [ ] **Step 4: Kullanıcı kontrolü.**

---

### Task 7: Kapanış — toplu doğrulama, temizlik, commit onayı

- [ ] **Step 1: Tam tarama** — `npx playwright test audit.spec.js --reporter=line`. Expected: tüm sayfalarda `scrollW === vw`.
- [ ] **Step 2: Kullanılmayan metin anahtarları** — `nav.goldFx*`, `nav.analytics*`, `market.volumeLeaders`, `market.nearHigh*`, `market.avgChange`, `market.pulse`, `market.sortChange`, `market.sortVolume`: `grep -rn "<anahtar>" web/src --include=*.jsx` ile kullanılmayanları **listele**, kullanıcıya sor; onaysız silme.
- [ ] **Step 3: Belgeler** — `docs/50-planning/BACKLOG.md`'ye ekle: 1 yıldan eski takvim fiyat endpoint'i; sıralama çipleri → dropdown filtre (hacim liderleri); masaüstü kenar çubuğu yeniden tasarımı; öne çıkanlar sayfası; Analiz yeniden tasarımı; kalıcı Playwright testleri. `DESIGN.md`'ye kısa "Mobil" bölümü (kategori kutusu, belge kaydırma, safe-area, ısı rengi kuralı) — içeriği kullanıcıya göster, onayla yaz.
- [ ] **Step 4: Commit önerisi** — kullanıcıya her adım için ayrı commit listesi sun (CLAUDE.md: "bağımsız değişiklikler tek commit'e konmaz"); önceki 3 bekleyen commit (öğrenme notu, e2e kurulumu, spec) + bu plan + Task 1–6. Mesajlarda Claude imzası yok. **Açık "at" onayı gelmeden commit atma.** Sonra kullanıcının test + merge akışı.
