import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/app'
import assayMark from '../assets/assay-mark.svg'

/*
  Landing — VOLTAJ sisteminin pazarlama yüzeyi.
  Panel ve auth ile aynı token'ları kullanır; fark yalnızca hangi yüzeyin
  zemin olduğunda: burada zemin beyaz (bg-card), bantlar bg-background.
  Voltaj rengi doz kuralına tabidir — cetvel, kenar, nokta ve tek dolu bant.
*/

const SYMBOLS = ['TUPRS', 'ASELS', 'GRAM', 'USDTRY', 'THYAO', 'EURTRY', 'KCHOL', 'SASA']
const SOURCES = { GRAM: 'yahoo', USDTRY: 'frankfurter', EURTRY: 'frankfurter' }

// Hero'daki canlı stdout akışı — cache stratejisini anlatmanın en dürüst yolu.
// Gerçek servis logu değil, davranışın canlandırması.
function useCacheLog() {
  const [lines, setLines] = useState([])
  const [ratio, setRatio] = useState(null)
  const stats = useRef({ hits: 0, total: 0, i: 0 })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const make = () => {
      const s = stats.current
      const sym = SYMBOLS[s.i % SYMBOLS.length]
      s.i += 1
      const hit = Math.random() < 0.72
      s.total += 1
      if (hit) s.hits += 1
      const now = new Date()
      return {
        id: `${now.getTime()}-${s.i}`,
        time: now.toLocaleTimeString('tr-TR', { hour12: false }),
        hit,
        sym,
        src: hit ? 'redis' : (SOURCES[sym] ?? 'yahoo'),
        ms: hit ? (1 + Math.random() * 3).toFixed(1) : (120 + Math.random() * 260).toFixed(0),
      }
    }

    const push = () => {
      setLines((prev) => [...prev.slice(-4), make()])
      const s = stats.current
      setRatio(Math.round((s.hits / s.total) * 100))
    }

    for (let i = 0; i < 5; i += 1) push()
    if (reduce) return undefined
    const id = setInterval(push, 1600)
    return () => clearInterval(id)
  }, [])

  return { lines, ratio }
}

function Mark({ className = 'h-6 w-6' }) {
  return <img src={assayMark} alt="" className={`${className} shrink-0`} />
}

function Eyebrow({ children }) {
  return <span className="tick-accent label block text-muted-foreground">{children}</span>
}

/* Teknoloji işaretleri — stilize, resmi marka varlıkları değil */
const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  viewBox: '0 0 32 32',
  'aria-hidden': true,
}

const TECH = [
  { name: 'React 19', role: 'ARAYÜZ', icon: (
    <svg {...strokeProps}><circle cx="16" cy="16" r="2.6" fill="currentColor" stroke="none" />
      <ellipse cx="16" cy="16" rx="13" ry="5.2" />
      <ellipse cx="16" cy="16" rx="13" ry="5.2" transform="rotate(60 16 16)" />
      <ellipse cx="16" cy="16" rx="13" ry="5.2" transform="rotate(120 16 16)" /></svg>) },
  { name: 'Vite', role: 'BUILD', icon: (
    <svg {...strokeProps}><path d="M16 3 L28 7.5 L24.5 25 L16 29 L7.5 25 L4 7.5 Z" strokeLinejoin="round" />
      <path d="M17.5 8 L13 17.5 h4 L14.5 24 L20 14 h-4 z" fill="currentColor" stroke="none" /></svg>) },
  { name: 'Tailwind v4', role: 'STİL', icon: (
    <svg {...strokeProps}><path d="M4 13 c2.5-5 5-6.5 7.5-4.5 1.7 1.3 2 3 4.5 3 2.5 0 3.5-2 3.5-2 -2.5 5-5 6.5-7.5 4.5 -1.7-1.3-2-3-4.5-3 -2.5 0-3.5 2-3.5 2 z" fill="currentColor" stroke="none" />
      <path d="M12.5 22 c2.5-5 5-6.5 7.5-4.5 1.7 1.3 2 3 4.5 3 2.5 0 3.5-2 3.5-2 -2.5 5-5 6.5-7.5 4.5 -1.7-1.3-2-3-4.5-3 -2.5 0-3.5 2-3.5 2 z" fill="currentColor" stroke="none" /></svg>) },
  { name: '.NET 9', role: 'SERVİSLER', icon: (
    <svg {...strokeProps}><path d="M6 8 h20 v16 a2 2 0 0 1-2 2 H8 a2 2 0 0 1-2-2 Z" strokeLinejoin="round" />
      <path d="M6 13 h20 M6 18 h20" /><path d="M11 5 v3 M21 5 v3" /></svg>) },
  { name: 'PostgreSQL', role: 'KALICI VERİ', icon: (
    <svg {...strokeProps}><ellipse cx="16" cy="8" rx="11" ry="4" />
      <path d="M5 8 v16 c0 2.2 4.9 4 11 4 s11-1.8 11-4 V8" />
      <path d="M5 16 c0 2.2 4.9 4 11 4 s11-1.8 11-4" /></svg>) },
  { name: 'Redis', role: 'CACHE', icon: (
    <svg {...strokeProps}><path d="M4 10 L16 5 L28 10 L16 15 Z" strokeLinejoin="round" />
      <path d="M4 16 L16 21 L28 16" /><path d="M4 22 L16 27 L28 22" /></svg>) },
  { name: 'Ory Kratos', role: 'KİMLİK', icon: (
    <svg {...strokeProps}><path d="M16 3 L27 8 v8 c0 7-5 11.5-11 13 -6-1.5-11-6-11-13 V8 Z" strokeLinejoin="round" />
      <path d="M11.5 16 l3.2 3.2 L21 12.5" /></svg>) },
  { name: 'Docker', role: 'ÇALIŞTIRMA', icon: (
    <svg {...strokeProps}><rect x="4" y="17" width="5" height="5" /><rect x="10.5" y="17" width="5" height="5" />
      <rect x="17" y="17" width="5" height="5" /><rect x="10.5" y="10.5" width="5" height="5" />
      <rect x="17" y="10.5" width="5" height="5" />
      <path d="M22 19.5 c4 0 6-1.5 6-1.5 0 4.5-3.5 8.5-9 8.5 -7 0-11-4.5-11-4.5" /></svg>) },
  { name: 'nginx', role: 'KENAR', icon: (
    <svg {...strokeProps}><path d="M5 26 V9 L16 26 V9" strokeLinejoin="round" />
      <path d="M21 12 h6 M24 9 v6" opacity=".55" /></svg>) },
  { name: 'AWS', role: 'BULUT — SIRADA', icon: (
    <svg {...strokeProps}><path d="M6 14 a5 5 0 0 1 4.6-5 6.4 6.4 0 0 1 12 1.6 A4.4 4.4 0 0 1 26 19 H9 a4 4 0 0 1-3-5 z" strokeLinejoin="round" />
      <path d="M6 24 c4 1.8 8 2.6 10 2.6 s6-.8 10-2.6" strokeLinecap="round" />
      <path d="M24 22.6 l2.4 1.4 -1 2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { name: 'GitHub Actions', role: 'CI/CD', icon: (
    <svg {...strokeProps}><circle cx="16" cy="16" r="11" /><path d="M16 9 v7 l5 3" />
      <path d="M25 7 l2.5-2.5 M27.5 4.5 v4 M27.5 4.5 h-4" opacity=".55" /></svg>) },
  { name: 'TanStack Query', role: 'SUNUCU VERİSİ', icon: (
    <svg {...strokeProps}><rect x="4" y="6" width="24" height="20" rx="2" strokeLinejoin="round" />
      <path d="M4 11 h24" /><path d="M9 17 h6 M9 21 h10" /><circle cx="21.5" cy="17.5" r="2.5" /></svg>) },
]

const CAPS = [
  { t: 'Varlık takibi', edge: true, tags: ['TRY / USD', 'ağırlıklı ortalama'],
    d: 'Adet, alış fiyatı, para birimi ve tarih girilir. Aynı varlıktan tekrar alınca ortalama maliyet ağırlıklı güncellenir. Satışta gerçekleşen kâr/zarar hesaplanıp kaydedilir.' },
  { t: 'Piyasa sayfaları', tags: ['BIST 30', 'sarrafiye'],
    d: 'BIST 30 için fiyat, günlük değişim, hacim ve 52 hafta bandı. Altın ve döviz ayrı sayfada. Varlık detayında fiyat geçmişi grafiği.' },
  { t: 'İşlem defteri', tags: ['append-only', 'EF Core'],
    d: 'Her alış ve satış arka planda tek bir transaction tablosuna yazılır. Varlık silinse bile işlem geçmişi kalır — veri modelinin tamamı bu tabloya dayanıyor.' },
  { t: 'Sembol arama', tags: ['Twelve Data', 'client-side'],
    d: 'BIST ve ABD borsalarındaki semboller isim ya da kodla aranır. BIST 30 içi arama client-side filtredir — 30 satır için sunucuya gidilmez.' },
]

const STACK = [
  { h: 'Arka uç', rows: [['portfolio-service', '.NET 9'], ['market-service', '.NET 9'], ['ORM', 'EF Core'],
    ['Veritabanı', 'PostgreSQL · Neon'], ['Cache', 'Redis'], ['Kimlik', 'Ory Kratos 1.2'], ['Log', 'Serilog · JSON']] },
  { h: 'Ön uç', rows: [['Çatı', 'React 19 · Vite'], ['Stil', 'Tailwind v4'], ['Bileşen', 'shadcn/ui'],
    ['Sunucu verisi', 'TanStack Query'], ['Dağılım grafiği', 'Recharts'], ['Fiyat grafiği', 'Lightweight Charts'], ['Dil', 'TR / EN']] },
  { h: 'Altyapı', rows: [['Çalıştırma', 'Docker Compose'], ['Kenar', 'nginx'], ['Ortam', 'WSL2 · Ubuntu'],
    ['Dağıtım', 'GitHub Actions'], ['Bulut', 'AWS — sırada'], ['Kod taraması', 'CodeQL'], ['Sır yönetimi', 'Actions secrets']] },
]

const LEARN = [
  { s: 'oturdu', t: 'Docker & container', ev: '6 servis tek compose up ile ayakta',
    d: 'Image/container ayrımı, katman cache\'i, çok aşamalı build, compose ile servis bağlama. Docker Desktop yok — WSL2\'de native engine.' },
  { s: 'oturdu', t: 'Kimlik doğrulama', ev: 'parola hash\'i hiç bizim kodumuza girmedi',
    d: 'Kendi auth\'unu yazmak yerine Kratos\'u koymak. Cookie tabanlı session, self-service flow\'lar, her istekte doğrulama.' },
  { s: 'oturdu', t: 'Cache stratejisi', ev: 'TTL sabit değil, veri tipine göre',
    d: 'Ücretsiz API limitleri gerçek bir kısıt. Neyin ne kadar bayatlayabileceğine karar vermek: gün içi 5 dk, günlük seri 1 saat.' },
  { s: 'devam', t: 'CI/CD', ev: 'pipeline güvenlik standardı yazım aşamasında',
    d: 'GitHub Actions ile WSL\'e dağıtım, CodeQL taraması. Sırların nerede durduğu, hangi tag\'in çekildiği gibi tuzaklar burada öğrenildi.' },
  { s: 'devam', t: 'Loglama', ev: 'FrankfurterClient\'ta sanitizer eklendi',
    d: 'Serilog, stdout + JSON, seviye politikası, hassas veri yasağı. Log injection (CWE-117) gerçek bir bulgu olarak çıktı ve kapatıldı.' },
  { s: 'sırada', t: 'Linux & AWS', ev: 'docs/40-learning altında not tutuluyor',
    d: 'WSL2 üzerinde çalışmak Linux\'u zorunlu kıldı. Sonraki adım bulut: log maliyeti şimdiden hesaba katıldı.' },
]

const TRADEOFFS = [
  ['Piyasa verisi Postgres\'te tutulmuyor', 'Veritabanı yalnızca portföy ve işlemler için. Fiyatlar Redis\'te yaşar ve bayatlar — kalıcı fiyat tarihçesi yok.'],
  ['BIST 30 araması sunucuya gitmiyor', '30 satır için ağ turu ya da DB indeksi kurmak abartı olurdu. Filtre client-side; boş dönerse tüm BIST evreni sorgulanıyor.'],
  ['Elde olmayan veri uydurulmuyor', 'Sektör bilgisi, F/K, piyasa değeri, emir defteri, haber akışı — hiçbir kaynağımız vermiyor. Ekranda mock veriyle yer doldurulmuyor.'],
  ['TradingView widget\'ı kaldırıldı', 'Ücretsiz widget BIST sembollerinde varsayılana düşüyordu — lisans kısıtı, kod hatası değil. Yerine veriyi kendimiz beslediğimiz Lightweight Charts kondu.'],
]

const STATUS_CLS = {
  oturdu: 'border-up text-up',
  devam: 'border-voltage text-voltage',
  sırada: 'border-border text-muted-foreground',
}

export default function Landing() {
  const { lines, ratio } = useCacheLog()

  return (
    <div className="min-h-dvh bg-card text-muted-foreground">
      {/* ---------- NAV ---------- */}
      <div className="mx-auto max-w-[1280px] px-6">
        <nav className="flex h-16 items-center justify-between gap-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Mark className="h-[26px] w-[26px]" />
            <b className="text-body font-bold tracking-tight text-foreground">{APP_NAME}</b>
          </div>
          <div className="hidden gap-6 text-ui font-medium md:flex">
            <a href="#ne" className="text-muted-foreground hover:text-foreground">Ne yapıyor</a>
            <a href="#akis" className="text-muted-foreground hover:text-foreground">İstek akışı</a>
            <a href="#stack" className="text-muted-foreground hover:text-foreground">Teknolojiler</a>
            <a href="#ogrenim" className="text-muted-foreground hover:text-foreground">Öğrenim</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-ui font-semibold text-foreground hover:underline hover:underline-offset-4">
              Giriş yap
            </Link>
            <Link to="/register" className="rounded-md bg-foreground px-4 py-2.5 text-ui font-semibold text-background hover:opacity-90">
              Kayıt ol
            </Link>
          </div>
        </nav>
      </div>

      {/* ---------- HERO ---------- */}
      <header className="paper border-b border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[7fr_5fr] lg:items-start">
            <div>
              <span className="mb-6 block h-[3px] w-[52px] bg-voltage" />
              <h1 className="max-w-[15ch] text-title font-bold text-foreground md:text-display lg:text-hero">
                Kendi portföyümü tuttuğum, mimariyi öğrendiğim uygulama.
              </h1>
              <p className="mt-6 max-w-[52ch] text-body text-muted-foreground">
                Başka platformlardan aldığım hisse, altın ve dövizi tek defterde tutuyorum.{' '}
                <b className="font-semibold text-foreground">Ama asıl amaç bu değil:</b> mikroservis, Docker,
                kimlik doğrulama ve CI/CD&apos;yi oyuncak örnek üzerinde değil, her gün kullandığım bir uygulamada denemek.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="rounded-md bg-foreground px-5 py-3 text-ui font-semibold text-background hover:opacity-90">
                  Panele geç
                </Link>
                <a href="#akis" className="rounded-md border border-input px-5 py-3 text-ui font-semibold text-foreground hover:border-foreground">
                  İstek akışını gör
                </a>
              </div>
            </div>

            {/* canlı cache logu — gerçek artefakt, dekor değil */}
            <div className="rounded-lg bg-foreground p-6">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-background/15 pb-3">
                <span className="flex items-center gap-2 font-mono text-micro text-background/60">
                  <i className="h-[7px] w-[7px] rounded-full bg-up" aria-hidden="true" />
                  market-service · stdout
                </span>
                <span className="font-mono text-micro text-background/60">json</span>
              </div>
              <div className="min-h-[132px]">
                {lines.map((l) => (
                  <div key={l.id} className="font-mono text-micro leading-[1.75] text-background/80">
                    <span className="text-background/45">{l.time}</span>{' '}
                    <span className={l.hit ? 'text-up' : 'text-down'}>{l.hit ? 'HIT ' : 'MISS'}</span>{' '}
                    {l.sym} <span className="text-background/45">{l.src} {l.ms}ms</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between gap-3 border-t border-background/15 pt-3 font-mono text-micro text-background/60">
                <span>REDIS TTL 300s</span>
                <span>{ratio === null ? '—' : `HIT ORANI ${ratio}%`}</span>
              </div>
            </div>
          </div>

          {/* stat — sayı ink, üstünde voltaj cetveli */}
          <div className="mt-20 flex flex-wrap gap-12">
            {[['6', 'container'], ['2', '.NET servisi'], ['3', 'veri kaynağı'], ['5dk', 'cache ömrü']].map(([n, k]) => (
              <div key={k} className="rule-accent pt-4">
                <span className="block text-display font-bold text-foreground">{n}</span>
                <span className="mt-2 block text-ui font-medium text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- TEKNOLOJİ ŞERİDİ ---------- */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="border-b border-border py-8">
          <span className="tick-accent label mb-6 block text-muted-foreground">Üzerinde çalıştığı yığın</span>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {TECH.map((x) => (
              <div key={x.name} className="group flex flex-col items-center gap-2.5 bg-card px-4 py-6 text-center hover:bg-background">
                <span className="text-foreground group-hover:text-voltage [&>svg]:h-[30px] [&>svg]:w-[30px]">{x.icon}</span>
                <span className="text-ui font-semibold text-foreground">{x.name}</span>
                <span className="font-mono text-micro tracking-wide text-muted-foreground">{x.role}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-micro text-muted-foreground">
            İşaretler stilize edilmiştir — resmi marka varlıkları değildir.
          </p>
        </div>
      </div>

      {/* ---------- 01 NE YAPIYOR ---------- */}
      <section id="ne" className="bg-background py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>01 — Kapsam</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Dört iş yapıyor</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Hepsi kendim kullandığım için var. Özellik listesi şişirmek için değil.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {CAPS.map((c) => (
              <div key={c.t} className={`rounded-lg bg-card p-8 ${c.edge ? 'edge-accent' : 'border border-border'}`}>
                <h3 className="mb-3 text-figure font-semibold text-foreground">{c.t}</h3>
                <p className="text-ui text-muted-foreground">{c.d}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.tags.map((tg) => (
                    <span key={tg} className="rounded-full bg-secondary px-3 py-1 text-micro font-medium text-foreground">{tg}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 02 İSTEK AKIŞI ---------- */}
      <section id="akis" className="border-y border-border py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>02 — Mimari</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Bir fiyat isteği nereden geçiyor</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Akan çizgiler gerçek yolu gösteriyor. Kritik nokta Redis: cache doluysa dış API hiç çağrılmaz —
              ücretsiz limitler böyle korunuyor.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg bg-background p-6">
            <svg viewBox="0 0 900 250" className="block h-auto w-full min-w-[660px]"
                 role="img" aria-label="İstek akışı: istemci, nginx, market-service, Redis, dış kaynaklar">
              <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".3">
                <path d="M132 68 H212" /><path d="M332 68 H412" /><path d="M532 68 H612" />
                <path d="M472 106 V172 H612" /><path d="M132 106 V204 H212 V106" />
              </g>
              <g fill="none" stroke="hsl(var(--voltage))" strokeWidth="1.7"
                 strokeDasharray="5 7" className="[animation:flow_1.5s_linear_infinite] motion-reduce:[animation:none]">
                <path d="M132 68 H212" /><path d="M332 68 H412" /><path d="M532 68 H612" />
                <path d="M472 106 V172 H612" />
              </g>
              {[
                { x: 12, y: 42, w: 120, h: 52, l: 'İSTEMCİ', t: 'React 19 · Vite', s: ['React Query'] },
                { x: 212, y: 42, w: 120, h: 52, l: 'KENAR', t: 'nginx', s: [':80'] },
                { x: 412, y: 42, w: 120, h: 64, l: 'SERVİS', t: 'market-service', s: ['.NET 9 · :5002', 'cookie → Kratos'] },
                { x: 612, y: 42, w: 120, h: 52, l: 'CACHE', t: 'Redis', s: ['TTL 300s'], hot: true },
                { x: 612, y: 146, w: 272, h: 52, l: 'DIŞ KAYNAKLAR — CACHE BOŞSA', t: 'Yahoo · Twelve Data · Frankfurter', s: ['fiyat + geçmiş · arama · döviz'] },
                { x: 212, y: 178, w: 120, h: 52, l: 'KİMLİK', t: 'Ory Kratos', s: [':4433 · cookie'] },
              ].map((n) => (
                <g key={n.l}>
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="8" fill="hsl(var(--card))"
                        stroke={n.hot ? 'hsl(var(--voltage))' : 'hsl(var(--input))'} strokeWidth={n.hot ? 1.5 : 1.2} />
                  <text x={n.x + 12} y={n.y + 18} className="fill-[hsl(var(--muted-foreground))] font-mono text-[9.5px] tracking-wider">{n.l}</text>
                  <text x={n.x + 12} y={n.y + 36} className="fill-[hsl(var(--foreground))] text-[12.5px] font-semibold">{n.t}</text>
                  {n.s.map((line, i) => (
                    <text key={line} x={n.x + 12} y={n.y + 48 + i * 11} className="fill-[hsl(var(--muted-foreground))] font-mono text-[9.5px]">{line}</text>
                  ))}
                </g>
              ))}
              <g className="fill-[hsl(var(--muted-foreground))] font-mono text-[9px]">
                <text x="146" y="62">HTTP</text><text x="346" y="62">/api</text>
                <text x="546" y="62">GET</text><text x="486" y="140">MISS</text>
                <text x="146" y="198">session</text>
              </g>
            </svg>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-foreground p-6">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-background/15 pb-3">
                <span className="flex items-center gap-2 font-mono text-micro text-background/60">
                  <i className="h-[7px] w-[7px] rounded-full bg-up" aria-hidden="true" />docker-compose.yml
                </span>
                <span className="font-mono text-micro text-background/60">6 servis</span>
              </div>
              <pre className="overflow-x-auto font-mono text-micro leading-[1.7] text-background/80">
{`# tek komutla ayağa kalkar: docker compose up --build -d
services:
  web:                nginx              ports: ["80:80"]
  portfolio-service:  .NET 9             ports: ["5001"]
  market-service:     .NET 9             ports: ["5002"]
  kratos:             oryd/kratos:v1.2.0 ports: ["4433","4434"]
  postgres:           postgres:16-alpine
  redis:              redis:alpine`}
              </pre>
            </div>
            <div className="grid gap-4">
              {[
                ['01 · Kenar', 'nginx statik dosyaları verir, /api\'yi servise yollar.'],
                ['02 · Kimlik', 'Servis cookie\'yi Kratos\'a doğrulatır; dönen kimlik ID\'siyle veri filtrelenir.'],
                ['03 · Cache — 04 · Kaynak', 'Önce Redis. Doluysa yanıt buradan döner. Boşsa dış API çağrılır ve sonuç yazılır — gün içi 5 dk, günlük seri 1 saat.'],
              ].map(([h, d]) => (
                <div key={h} className="rounded-lg border border-border bg-card p-5">
                  <h3 className="mb-1 text-ui font-semibold text-foreground">{h}</h3>
                  <p className="text-ui text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 03 STACK ---------- */}
      <section id="stack" className="bg-background py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>03 — Yığın</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Teknolojiler</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Her seçimin bir gerekçesi var; &quot;popülerdi&quot; gerekçe sayılmadı.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {STACK.map((col) => (
              <div key={col.h} className="rounded-lg bg-card p-6">
                <h3 className="label mb-4 border-b border-input pb-3 text-muted-foreground">{col.h}</h3>
                <dl>
                  {col.rows.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0">
                      <dt className="text-ui text-foreground">{k}</dt>
                      <dd className="whitespace-nowrap font-mono text-micro text-muted-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 04 ÖĞRENİM ---------- */}
      <section id="ogrenim" className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>04 — Sebep</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Öğrenim hedefleri</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Projenin asıl sebebi. Her hedefin altında onu öğrendiğimin kanıtı — okuduğum doküman değil, koda giren karar.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {LEARN.map((l) => (
              <div key={l.t} className="rounded-lg border border-border bg-card p-6">
                <span className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-micro ${STATUS_CLS[l.s]}`}>{l.s}</span>
                <h3 className="mb-1 mt-4 text-figure font-semibold text-foreground">{l.t}</h3>
                <p className="text-ui text-muted-foreground">{l.d}</p>
                <p className="mt-4 border-t border-border pt-3 font-mono text-micro text-muted-foreground">→ {l.ev}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 05 PANELE GEÇ ---------- */}
      <section id="panel" className="bg-background py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="edge-accent grid items-center gap-8 rounded-r-lg bg-card p-8 lg:grid-cols-[1fr_auto]">
            <div>
              <Eyebrow>Panel</Eyebrow>
              <h3 className="mb-2 mt-3 text-head font-bold text-foreground">Defterini aç</h3>
              <p className="max-w-[56ch] text-ui text-muted-foreground">
                Kayıt ve giriş <b className="font-semibold text-foreground">Ory Kratos</b>&apos;un self-service
                akışlarıyla çalışır — parola bizim kodumuza hiç uğramaz. Giriş yaptıktan sonra portföy,
                işlem defteri ve piyasa sayfalarına geçersin.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="rounded-md bg-foreground px-5 py-3 text-ui font-semibold text-background hover:opacity-90">
                Kayıt ol
              </Link>
              <Link to="/login" className="rounded-md border border-input px-5 py-3 text-ui font-semibold text-foreground hover:border-foreground">
                Giriş yap
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 06 ÖDÜNLER ---------- */}
      <section className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>05 — Dürüstlük</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Bilinçli ödünler</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Bir öğrenme projesinde her yer üretim standardında olmaz. Nerede bilerek aşağı indiğimi yazmak,
              yanlışlıkla indiğim yerlerden ayırıyor.
            </p>
          </div>
          <div className="rounded-lg bg-background p-8">
            {TRADEOFFS.map(([h, d]) => (
              <div key={h} className="border-b border-input py-4 first:pt-0 last:border-b-0 last:pb-0">
                <h3 className="mb-1 text-ui font-semibold text-foreground">{h}</h3>
                <p className="text-ui text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- KAPANIŞ — sayfadaki TEK dolu voltaj bandı ---------- */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="rounded-lg bg-voltage p-10 md:p-16">
            <h2 className="max-w-[20ch] text-display font-bold text-white">
              Bitmiş bir ürün değil, süren bir defter.
            </h2>
            <p className="mt-4 max-w-[56ch] text-body text-white/85">
              Kod açık, kararlar dokümanda. Neyi neden yaptığım <code className="font-mono">docs/</code> altında
              standartlar ve öğrenme notları olarak duruyor.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/register" className="rounded-md bg-foreground px-5 py-3 text-ui font-semibold text-background hover:opacity-90">
                Kayıt ol
              </Link>
              <Link to="/login" className="text-ui font-semibold text-white underline underline-offset-4">
                Zaten hesabın var mı? Giriş yap
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-4 px-6 font-mono text-micro tracking-wide text-muted-foreground">
          <span>{APP_NAME.toUpperCase()} · KİŞİSEL PORTFÖY DEFTERİ</span>
          <span>FİYATLAR GECİKMELİ OLABİLİR · YATIRIM TAVSİYESİ DEĞİLDİR</span>
        </div>
      </footer>
    </div>
  )
}
