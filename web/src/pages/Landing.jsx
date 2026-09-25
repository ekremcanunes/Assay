import { Suspense, use, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/app'
import { TECH, STACK_COLUMNS, DEFAULT_TECH } from '../lib/stack'
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
      const st = stats.current
      const sym = SYMBOLS[st.i % SYMBOLS.length]
      st.i += 1
      const hit = Math.random() < 0.72
      st.total += 1
      if (hit) st.hits += 1
      const now = new Date()
      return {
        id: `${now.getTime()}-${st.i}`,
        time: now.toLocaleTimeString('tr-TR', { hour12: false }),
        hit,
        sym,
        src: hit ? 'redis' : (SOURCES[sym] ?? 'yahoo'),
        ms: hit ? (1 + Math.random() * 3).toFixed(1) : (120 + Math.random() * 260).toFixed(0),
      }
    }

    const push = () => {
      setLines((prev) => [...prev.slice(-4), make()])
      const st = stats.current
      setRatio(Math.round((st.hits / st.total) * 100))
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

const TRADEOFFS = [
  ['Piyasa verisi Postgres\'te tutulmuyor', 'Veritabanı yalnızca portföy ve işlemler için. Fiyatlar Redis\'te yaşar ve bayatlar — kalıcı fiyat tarihçesi yok.'],
  ['BIST 30 araması sunucuya gitmiyor', '30 satır için ağ turu ya da DB indeksi kurmak abartı olurdu. Filtre client-side; boş dönerse tüm BIST evreni sorgulanıyor.'],
  ['Elde olmayan veri uydurulmuyor', 'Sektör bilgisi, F/K, piyasa değeri, emir defteri, haber akışı — hiçbir kaynağımız vermiyor. Ekranda mock veriyle yer doldurulmuyor.'],
  ['TradingView widget\'ı kaldırıldı', 'Ücretsiz widget BIST sembollerinde varsayılana düşüyordu — lisans kısıtı, kod hatası değil. Yerine veriyi kendimiz beslediğimiz Lightweight Charts kondu.'],
]

/* ---------- Entegrasyon bölümü: solda dikey liste, sağda içerik ---------- */

function CodeBlock({ code, title, note }) {
  return (
    <div>
      {title && (
        <div className="mb-2 flex items-center gap-2 font-mono text-micro text-muted-foreground">
          <i className="h-[6px] w-[6px] rounded-full bg-voltage" aria-hidden="true" />
          {title}
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg bg-foreground p-5 font-mono text-micro leading-[1.7] text-background/85">
        {code}
      </pre>
      {note && <p className="mt-2 font-mono text-micro text-muted-foreground">{note}</p>}
    </div>
  )
}

function MiniTable({ head, rows }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="label border-b border-foreground px-0 pb-2 pr-4 text-left text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.join('|')}>
              {r.map((c, i) => (
                <td key={r.join('|') + i}
                    className={`border-b border-border py-2 pr-4 text-ui ${i === 0 ? 'text-foreground' : 'font-mono text-micro text-muted-foreground'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Lazy içerik promise'i teknoloji başına bir kez oluşur; use() aynı promise'i görmeli.
const detailPromises = new Map()
function loadDetail(tech) {
  if (!detailPromises.has(tech.slug)) {
    detailPromises.set(tech.slug, tech.loadDetail().then((m) => m.default))
  }
  return detailPromises.get(tech.slug)
}

function DetailBlock({ b }) {
  if (b.kind === 'code') return <CodeBlock code={b.code} title={b.title} note={b.note} />

  if (b.kind === 'diagram') {
    return (
      <figure>
        <h4 className="mb-1.5 text-figure font-semibold text-foreground">{b.title}</h4>
        {b.body && <p className="mb-4 text-ui text-muted-foreground">{b.body}</p>}
        <div className="overflow-x-auto rounded-lg border border-border bg-background p-5">{b.figure}</div>
        {b.caption && <figcaption className="mt-2 font-mono text-micro text-muted-foreground">{b.caption}</figcaption>}
      </figure>
    )
  }

  if (b.kind === 'warn') {
    return (
      <div className="edge-accent rounded-r-lg bg-background p-5">
        <h4 className="mb-1.5 text-ui font-semibold text-foreground">{b.title}</h4>
        <p className="text-ui text-muted-foreground">{b.body}</p>
      </div>
    )
  }

  return (
    <div>
      <h4 className="mb-1.5 text-figure font-semibold text-foreground">{b.title}</h4>
      <p className="text-ui text-muted-foreground">{b.body}</p>
      {b.table && <MiniTable head={b.table.head} rows={b.table.rows} />}
      {b.code && <div className="mt-4"><CodeBlock code={b.code} /></div>}
      {b.after && <p className="mt-3 text-ui text-muted-foreground">{b.after}</p>}
    </div>
  )
}

function TechDetail({ tech }) {
  const detail = tech.detail ?? (tech.loadDetail ? use(loadDetail(tech)) : null)
  if (!detail) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-input bg-background p-10 text-center">
        <span className="text-muted-foreground [&>svg]:h-10 [&>svg]:w-10">{tech.icon}</span>
        <h3 className="mt-4 text-figure font-semibold text-foreground">{tech.name}</h3>
        <p className="mt-1.5 max-w-[42ch] text-ui text-muted-foreground">
          Bu teknolojinin entegrasyon yazısı henüz hazır değil. Sırayla ekleniyor.
        </p>
        <span className="mt-4 rounded-sm border border-input px-2 py-0.5 font-mono text-micro text-muted-foreground">
          sırada
        </span>
      </div>
    )
  }

  const { tagline, why, blocks, files, doc } = detail

  return (
    <article className="rounded-lg bg-card p-5 md:p-9">
      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span className="text-voltage [&>svg]:h-8 [&>svg]:w-8">{tech.icon}</span>
          <div>
            <h3 className="text-head font-bold text-foreground">{tech.name}</h3>
            <span className="font-mono text-micro tracking-wide text-muted-foreground">{tech.role}</span>
          </div>
        </div>
        <p className="mt-4 max-w-[64ch] text-body text-muted-foreground">{tagline}</p>
      </header>

      <section className="border-b border-border py-6">
        <span className="label mb-4 block text-muted-foreground">Neden bu</span>
        <div className="grid gap-5 md:grid-cols-3">
          {why.map((w) => (
            <div key={w.t} className="rule-accent pt-3">
              <h4 className="mb-1.5 text-ui font-semibold text-foreground">{w.t}</h4>
              <p className="text-ui text-muted-foreground">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-6">
        <span className="label mb-5 block text-muted-foreground">Nasıl entegre edildi</span>
        <div className="grid gap-7">
          {blocks.map((b) => <DetailBlock key={b.title} b={b} />)}
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5">
        <span className="label text-muted-foreground">İlgili dosyalar</span>
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <code key={f} className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-micro text-foreground">{f}</code>
          ))}
        </div>
        <span className="font-mono text-micro text-muted-foreground">Ayrıntılı not: {doc}</span>
      </footer>
    </article>
  )
}

const NAV_LINKS = [
  ['#ne', 'Ne yapıyor'],
  ['#akis', 'İstek akışı'],
  ['#entegrasyon', 'Entegrasyonlar'],
]

export default function Landing() {
  const { lines, ratio } = useCacheLog()
  const [active, setActive] = useState(DEFAULT_TECH)
  const [menuOpen, setMenuOpen] = useState(false)
  const activeTech = TECH.find((t) => t.slug === active) ?? TECH[0]

  // Üstteki şeritten bir logoya tıklanınca entegrasyon bölümüne in ve onu seç
  const openTech = (slug) => {
    setActive(slug)
    document.getElementById('entegrasyon')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-dvh bg-card text-muted-foreground">
      {/* ---------- NAV ---------- */}
      <div className="mx-auto max-w-[1280px] px-5 md:px-6">
        <nav className="flex h-16 items-center justify-between gap-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Mark className="h-[26px] w-[26px]" />
            <b className="text-body font-bold tracking-tight text-foreground">{APP_NAME}</b>
          </div>
          <div className="hidden gap-6 text-ui font-medium md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} className="text-muted-foreground hover:text-foreground">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-ui font-semibold text-foreground hover:underline hover:underline-offset-4 sm:block">
              Giriş yap
            </Link>
            <Link to="/register" className="rounded-md bg-foreground px-4 py-2.5 text-ui font-semibold text-background hover:opacity-90">
              Kayıt ol
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={menuOpen}
              className="-mr-1.5 flex h-10 w-10 items-center justify-center text-foreground md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                {menuOpen
                  ? <path d="M5 5l14 14M19 5L5 19" />
                  : <><path d="M3 7h18" /><path d="M3 12h18" /><path d="M3 17h18" /></>}
              </svg>
            </button>
          </div>
        </nav>

        {/* mobil menü — nav linkleri md altında buraya iner */}
        {menuOpen && (
          <div className="border-b border-border py-2 md:hidden">
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-border py-3.5 text-body font-medium text-foreground last:border-b-0"
              >
                {label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block border-t border-border py-3.5 text-body font-medium text-foreground sm:hidden"
            >
              Giriş yap
            </Link>
          </div>
        )}
      </div>

      {/* ---------- HERO ---------- */}
      <header className="paper border-b border-border">
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-6 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-12">
            <div>
              <span className="mb-6 block h-[3px] w-[52px] bg-voltage" />
              <h1 className="max-w-[15ch] text-display font-bold leading-[1.08] text-foreground lg:text-hero">
                Kendi portföyümü tuttuğum, mimariyi öğrendiğim uygulama.
              </h1>
              <p className="mt-6 max-w-[52ch] text-body text-muted-foreground">
                Başka platformlardan aldığım hisse, altın ve dövizi tek defterde tutuyorum.{' '}
                <b className="font-semibold text-foreground">Ama asıl amaç bu değil:</b> mikroservis, Docker,
                kimlik doğrulama ve CI/CD&apos;yi oyuncak örnek üzerinde değil, her gün kullandığım bir uygulamada denemek.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/register" className="rounded-md bg-foreground px-5 py-3.5 text-center text-ui font-semibold text-background hover:opacity-90 sm:py-3">
                  Panele geç
                </Link>
                <a href="#akis" className="rounded-md border border-input px-5 py-3.5 text-center text-ui font-semibold text-foreground hover:border-foreground sm:py-3">
                  İstek akışını gör
                </a>
              </div>
            </div>

            {/* canlı cache logu — gerçek artefakt, dekor değil */}
            <div className="rounded-lg bg-foreground p-5 md:p-6">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-background/15 pb-3">
                <span className="flex items-center gap-2 font-mono text-micro text-background/60">
                  <i className="h-[7px] w-[7px] rounded-full bg-up" aria-hidden="true" />
                  market-service · stdout
                </span>
                <span className="font-mono text-micro text-background/60">json</span>
              </div>
              <div className="min-h-[132px] overflow-x-auto">
                {lines.map((l) => (
                  <div key={l.id} className="whitespace-nowrap font-mono text-micro leading-[1.75] text-background/80">
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
          <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-8 sm:flex sm:flex-wrap sm:gap-12 md:mt-20">
            {[['6', 'container'], ['2', '.NET servisi'], ['3', 'veri kaynağı'], ['5dk', 'cache ömrü']].map(([n, k]) => (
              <div key={k} className="rule-accent pt-4">
                <span className="block text-display font-bold text-foreground">{n}</span>
                <span className="mt-2 block text-ui font-medium text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- ÜZERİNDE ÇALIŞTIĞI YIĞIN (logolar + detay tablosu birlikte) ---------- */}
      <section className="border-b border-border py-12 md:py-20">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <span className="tick-accent label mb-2 block text-muted-foreground">Üzerinde çalıştığı yığın</span>
          <p className="mb-8 max-w-[62ch] text-body text-muted-foreground">
            Her seçimin bir gerekçesi var; &quot;popülerdi&quot; gerekçe sayılmadı. Bir işarete tıklayınca
            o teknolojinin entegrasyonuna inersin.
          </p>

          {/* Çizgiler hücre kenarlığından: yarım kalan son satırın boş hücreleri gri değil beyaz görünür.
              -mr-px/-mb-px en sağ ve en alt kenarlığı dış çerçevenin altına iter, çift çizgi oluşmaz. */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {TECH.map((x) => (
                <button
                  key={x.slug}
                  type="button"
                  onClick={() => openTech(x.slug)}
                  className="group flex flex-col items-center gap-2.5 border-b border-r border-border bg-card px-4 py-6 text-center hover:bg-background"
                >
                  <span className="text-foreground group-hover:text-voltage [&>svg]:h-[30px] [&>svg]:w-[30px]">{x.icon}</span>
                  <span className="text-ui font-semibold text-foreground">{x.name}</span>
                  <span className="font-mono text-micro tracking-wide text-muted-foreground">{x.role}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {STACK_COLUMNS.map((col) => (
              <div key={col.h} className="rounded-lg bg-background p-6">
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

      {/* ---------- 01 NE YAPIYOR ---------- */}
      <section id="ne" className="bg-background py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>01 — Kapsam</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Defterin tuttukları</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {CAPS.map((c) => (
              <div key={c.t} className={`rounded-lg bg-card p-6 md:p-8 ${c.edge ? 'edge-accent' : 'border border-border'}`}>
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
      <section id="akis" className="border-y border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>02 — Mimari</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Bir fiyat isteği nereden geçiyor</h2>
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

      {/* ---------- 03 ENTEGRASYONLAR — solda liste, sağda içerik ---------- */}
      <section id="entegrasyon" className="scroll-mt-4 bg-background py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>03 — Gerekçe</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Her teknoloji neden burada</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Soldan bir teknoloji seç; nasıl entegre edildiğini, hangi kararların alındığını ve
              hangi tuzağa düşüldüğünü anlatıyorum. Sırayla dolduruluyor.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* sol: dikey teknoloji listesi */}
            <nav className="h-max overflow-hidden rounded-lg border border-border bg-card lg:sticky lg:top-4">
              {TECH.map((x) => {
                const on = x.slug === active
                return (
                  <button
                    key={x.slug}
                    type="button"
                    onClick={() => setActive(x.slug)}
                    aria-current={on ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 ${
                      on ? 'nav-active' : 'hover:bg-background'
                    }`}
                  >
                    <span className={`${on ? 'text-voltage' : 'text-muted-foreground'} [&>svg]:h-5 [&>svg]:w-5`}>
                      {x.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-ui ${on ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                        {x.name}
                      </span>
                      <span className="block truncate font-mono text-micro text-muted-foreground">{x.role}</span>
                    </span>
                    {!x.detail && !x.loadDetail && (
                      <span className="shrink-0 font-mono text-micro text-muted-foreground">·</span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* sağ: seçilen teknolojinin içeriği */}
            <div className="min-w-0">
              <Suspense
                fallback={
                  <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-card font-mono text-micro text-muted-foreground">
                    yükleniyor…
                  </div>
                }
              >
                <TechDetail tech={activeTech} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PANELE GEÇ ---------- */}
      <section id="panel" className="border-t border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="edge-accent grid items-center gap-7 rounded-r-lg bg-background p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:gap-8">
            <div>
              <Eyebrow>Panel</Eyebrow>
              <h3 className="mb-2 mt-3 text-head font-bold text-foreground">Defterini aç</h3>
              <p className="max-w-[56ch] text-ui text-muted-foreground">
                Kayıt ve giriş <b className="font-semibold text-foreground">Ory Kratos</b>&apos;un self-service
                akışlarıyla çalışır — parola bizim kodumuza hiç uğramaz. Giriş yaptıktan sonra portföy,
                işlem defteri ve piyasa sayfalarına geçersin.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/register" className="rounded-md bg-foreground px-5 py-3.5 text-center text-ui font-semibold text-background hover:opacity-90 sm:py-3">
                Kayıt ol
              </Link>
              <Link to="/login" className="rounded-md border border-input px-5 py-3.5 text-center text-ui font-semibold text-foreground hover:border-foreground sm:py-3">
                Giriş yap
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 04 ÖDÜNLER ---------- */}
      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>04 — Dürüstlük</Eyebrow>
            <h2 className="mt-2 text-display font-bold text-foreground">Bilinçli ödünler</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Bir öğrenme projesinde her yer üretim standardında olmaz. Nerede bilerek aşağı indiğimi yazmak,
              yanlışlıkla indiğim yerlerden ayırıyor.
            </p>
          </div>
          <div className="rounded-lg bg-card p-6 md:p-8">
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
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="rounded-lg bg-voltage p-8 md:p-16">
            <h2 className="max-w-[20ch] text-display font-bold leading-[1.1] text-white">
              Bitmiş bir ürün değil, süren bir defter.
            </h2>
            <p className="mt-4 max-w-[56ch] text-body text-white/85">
              Kod açık, kararlar dokümanda. Neyi neden yaptığım <code className="font-mono">docs/</code> altında
              standartlar ve öğrenme notları olarak duruyor.
            </p>
            <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link to="/register" className="w-full rounded-md bg-foreground px-5 py-3.5 text-center text-ui font-semibold text-background hover:opacity-90 sm:w-auto sm:py-3">
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
