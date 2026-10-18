import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/app'
import { TECH, STACK_COLUMNS, DEFAULT_TECH } from '../lib/stack'
import { useAuth } from '../contexts/AuthContext'
import PriceDemo from '../components/landing/PriceDemo'
import SnapRail from '../components/landing/SnapRail'
import { DetailBlock } from '../components/landing/techParts'
import { loadDetail } from '../lib/techDetail'
import assayMark from '../assets/assay-mark.svg'

/*
  Landing — VOLTAJ sisteminin pazarlama yüzeyi.
  Panel ve auth ile aynı token'ları kullanır; fark yalnızca hangi yüzeyin
  zemin olduğunda: burada zemin beyaz (bg-card), bantlar bg-background.
  Voltaj rengi doz kuralına tabidir — cetvel, kenar, nokta ve tek dolu bant.
*/

// Ana çağrı: oturum yoksa kayıt, varsa doğrudan uygulama (Kratos akışı için kayıt tam sayfa yüklenir)
function Cta({ session, className, children }) {
  return session ? (
    <Link to="/overview" className={className}>{children ?? 'Uygulamaya git'}</Link>
  ) : (
    <Link to="/register" reloadDocument className={className}>{children ?? 'Kayıt ol'}</Link>
  )
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

function CapCard({ c }) {
  return (
    <div className={`h-full rounded-lg bg-card p-5 md:p-8 ${c.edge ? 'edge-accent' : 'border border-border'}`}>
      <h3 className="mb-2 text-figure font-semibold text-foreground md:mb-3">{c.t}</h3>
      <p className="text-ui text-muted-foreground">{c.d}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {c.tags.map((tg) => (
          <span key={tg} className="rounded-full bg-secondary px-3 py-1 text-micro font-medium text-foreground">{tg}</span>
        ))}
      </div>
    </div>
  )
}

// Mobil istek akışı — masaüstündeki şemanın adım adım hali
const FLOW_STEPS = [
  ['Tarayıcı', null, 'Uygulamada bir fiyat istenir.'],
  ['nginx', '/api', 'Sayfayı verir, /api isteğini servise yollar. Dışarıya açık tek kapı.'],
  ['Ory Kratos', 'oturum', 'Servis oturum çerezini doğrulatır; gelen kimlikle yalnızca senin verin döner.'],
  ['market-service → Redis', 'HIT', 'Önce önbelleğe bakılır. Fiyat oradaysa yanıt hemen döner.'],
  ['Dış kaynak', 'MISS', 'Önbellek boşsa Yahoo / Frankfurter çağrılır, sonuç önbelleğe yazılır (gün içi 5 dk, günlük seri 1 saat).'],
]

const TRADEOFFS = [
  ['Piyasa verisi Postgres\'te tutulmuyor', 'Veritabanı yalnızca portföy ve işlemler için. Fiyatlar Redis\'te yaşar ve bayatlar — kalıcı fiyat tarihçesi yok.'],
  ['BIST 30 araması sunucuya gitmiyor', '30 satır için ağ turu ya da DB indeksi kurmak abartı olurdu. Filtre client-side; boş dönerse tüm BIST evreni sorgulanıyor.'],
  ['Elde olmayan veri uydurulmuyor', 'Sektör bilgisi, F/K, piyasa değeri, emir defteri, haber akışı — hiçbir kaynağımız vermiyor. Ekranda mock veriyle yer doldurulmuyor.'],
  ['TradingView widget\'ı kaldırıldı', 'Ücretsiz widget BIST sembollerinde varsayılana düşüyordu — lisans kısıtı, kod hatası değil. Yerine veriyi kendimiz beslediğimiz Lightweight Charts kondu.'],
]

/* ---------- Entegrasyon bölümü: solda dikey liste, sağda içerik ---------- */

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
        <div className="grid grid-cols-1 gap-7">
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
  const [active, setActive] = useState(DEFAULT_TECH)
  const activeTech = TECH.find((t) => t.slug === active) ?? TECH[0]
  const { session } = useAuth()

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
          {/* Mobilde menü yok: bölümler zaten tek sütunda alt alta; yalnız giriş ve kayıt */}
          <div className="flex items-center gap-1 sm:gap-3">
            {session ? (
              <Cta session={session} className="press rounded-md bg-foreground px-4 py-2.5 text-ui font-semibold text-background hover:opacity-90" />
            ) : (
              <>
                <Link to="/login" reloadDocument className="px-2 py-2.5 text-ui font-semibold text-foreground hover:underline hover:underline-offset-4">
                  Giriş yap
                </Link>
                <Link to="/register" reloadDocument className="press rounded-md bg-foreground px-4 py-2.5 text-ui font-semibold text-background hover:opacity-90">
                  Kayıt ol
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* ---------- HERO ---------- */}
      <header className="paper border-b border-border">
        <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-6 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-12">
            <div>
              <span className="mb-6 block h-[3px] w-[52px] bg-voltage" />
              {/* Başlık geçici — kullanıcı sonra değiştirecek (Faz 2 spec §2) */}
              <h1 className="max-w-[18ch] text-title font-bold text-foreground md:text-display lg:text-hero">
                Hisse, altın ve döviz. Hepsi tek defterde.
              </h1>
              <p className="mt-4 max-w-[52ch] text-body text-muted-foreground md:mt-6">
                Yatırımlarımı tuttuğum bu uygulamayı, modern bir yazılımın nasıl kurulduğunu öğrenirken yazdım.
                Nasıl yapıldığı da burada.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8">
                <a href="#akis" className="hidden rounded-md border border-input px-5 py-3 text-center text-ui font-semibold text-foreground hover:border-foreground sm:block">
                  İstek akışını gör
                </a>
                <a href="#akis" className="text-ui text-foreground underline underline-offset-4 sm:hidden">
                  Bir istek nereden geçiyor ↓
                </a>
              </div>
            </div>

            {/* Eskiden rastgele üretilen "stdout" kutusu vardı (gerçek gibi duruyordu); yerine dokunulabilir canlandırma */}
            <PriceDemo />
          </div>

          {/* stat — sayı ink, üstünde voltaj cetveli; mobilde dördü tek satır */}
          <div className="mt-8 grid grid-cols-4 gap-3 sm:flex sm:flex-wrap sm:gap-12 md:mt-20">
            {[['6', 'container'], ['2', '.NET servisi'], ['3', 'veri kaynağı'], ['5dk', 'cache ömrü']].map(([n, k]) => (
              <div key={k} className="rule-accent min-w-0 pt-2.5 sm:pt-4">
                <span className="block text-head font-bold text-foreground sm:text-display">{n}</span>
                <span className="mt-1 block text-micro font-medium leading-tight text-muted-foreground sm:mt-2 sm:text-ui">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- ÜZERİNDE ÇALIŞTIĞI YIĞIN (logolar + detay tablosu birlikte) ---------- */}
      <section className="hidden border-b border-border py-12 md:block md:py-20">
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
      <section id="ne" className="bg-background py-10 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>01 — Kapsam</Eyebrow>
            <h2 className="mt-2 text-head font-bold text-foreground md:text-display">Defterin tuttukları</h2>
          </div>
          {/* mobil: ekranda tek kart, yana kaydırılır · md+: iki sütun */}
          <SnapRail className="md:hidden" label="Defterin tuttukları">
            {CAPS.map((c) => <CapCard key={c.t} c={c} />)}
          </SnapRail>
          <div className="hidden gap-4 md:grid md:grid-cols-2">
            {CAPS.map((c) => <CapCard key={c.t} c={c} />)}
          </div>
        </div>
      </section>

      {/* ---------- 02 İSTEK AKIŞI ---------- */}
      <section id="akis" className="border-y border-border py-10 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>02 — Mimari</Eyebrow>
            <h2 className="mt-2 text-head font-bold text-foreground md:text-display">Bir fiyat isteği nereden geçiyor</h2>
          </div>

          {/* mobil: geniş şema yerine dikey adımlar (yana kaydırma yok) */}
          <ol className="md:hidden">
            {FLOW_STEPS.map(([title, tag, body], i) => (
              <li key={title} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center" aria-hidden="true">
                  <i className="mt-1 h-2.5 w-2.5 rounded-full border-2 border-foreground bg-card" />
                  {i < FLOW_STEPS.length - 1 && <s className="my-0.5 w-0 flex-1 border-l-2 border-dashed border-voltage" />}
                </div>
                <div className="pb-4">
                  <b className="text-body font-semibold text-foreground">
                    {title}
                    {tag && <span className="ml-1.5 rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-micro font-normal text-foreground">{tag}</span>}
                  </b>
                  <p className="mt-0.5 text-ui text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="hidden overflow-x-auto rounded-lg bg-background p-6 md:block">
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

          <div className="mt-4 hidden grid-cols-1 gap-4 md:grid md:grid-cols-2">
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
      <section id="entegrasyon" className="scroll-mt-4 bg-background py-10 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>03 — Gerekçe</Eyebrow>
            <h2 className="mt-2 text-head font-bold text-foreground md:text-display">Her teknoloji neden burada</h2>
            <p className="mt-4 hidden text-body text-muted-foreground md:block">
              Soldan bir teknoloji seç; nasıl entegre edildiğini, hangi kararların alındığını ve
              hangi tuzağa düşüldüğünü anlatıyorum. Sırayla dolduruluyor.
            </p>
            <p className="mt-3 text-ui text-muted-foreground md:hidden">
              Birine dokun: ne işe yarıyor, neden seçildi, nasıl kuruldu. Soluk olanlar henüz yazılmadı.
            </p>
          </div>

          {/* mobil: 2 sütun ızgara; dokununca teknolojinin kendi sayfası açılır */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            {TECH.map((x) => (
              <Link
                key={x.slug}
                to={`/landing/tech/${x.slug}`}
                viewTransition
                style={{ viewTransitionName: `tech-${x.slug}` }}
                className={`press flex min-h-[52px] items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-foreground ${
                  x.detail || x.loadDetail ? '' : 'opacity-55'
                }`}
              >
                <span className="shrink-0 text-foreground [&>svg]:h-5 [&>svg]:w-5">{x.icon}</span>
                <span className="min-w-0">
                  <span className="block text-ui font-semibold leading-tight text-foreground">{x.name}</span>
                  <span className="block truncate font-mono text-micro tracking-wide text-muted-foreground">{x.role}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="hidden gap-4 md:grid lg:grid-cols-[260px_minmax(0,1fr)]">
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

      {/* ---------- BAŞLA ---------- */}
      <section id="basla" className="hidden border-t border-border py-10 md:block md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="edge-accent grid items-center gap-7 rounded-r-lg bg-background p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:gap-8">
            <div>
              <Eyebrow>Başla</Eyebrow>
              <h3 className="mb-2 mt-3 text-head font-bold text-foreground">Defterini aç</h3>
              <p className="max-w-[56ch] text-ui text-muted-foreground">
                Kayıt ve giriş <b className="font-semibold text-foreground">Ory Kratos</b>&apos;un self-service
                akışlarıyla çalışır — parola bizim kodumuza hiç uğramaz. Giriş yaptıktan sonra portföy,
                işlem defteri ve piyasa sayfalarına geçersin.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {session ? (
                <Cta session={session} className="press rounded-md bg-foreground px-5 py-3.5 text-center text-ui font-semibold text-background hover:opacity-90 sm:py-3" />
              ) : (
                <>
                  <Link to="/register" reloadDocument className="press rounded-md bg-foreground px-5 py-3.5 text-center text-ui font-semibold text-background hover:opacity-90 sm:py-3">
                    Kayıt ol
                  </Link>
                  <Link to="/login" reloadDocument className="press rounded-md border border-input px-5 py-3.5 text-center text-ui font-semibold text-foreground hover:border-foreground sm:py-3">
                    Giriş yap
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 04 ÖDÜNLER ---------- */}
      <section className="bg-background py-10 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="mb-8 max-w-[62ch]">
            <Eyebrow>04 — Dürüstlük</Eyebrow>
            <h2 className="mt-2 text-head font-bold text-foreground md:text-display">Bilinçli ödünler</h2>
            <p className="mt-4 text-body text-muted-foreground">
              Bir öğrenme projesinde her yer üretim standardında olmaz. Nerede bilerek aşağı indiğimi yazmak,
              yanlışlıkla indiğim yerlerden ayırıyor.
            </p>
          </div>
          {/* mobil: katlanır liste (ilki açık) */}
          <div className="overflow-hidden rounded-lg border border-border bg-card md:hidden">
            {TRADEOFFS.map(([h, d], i) => (
              <details key={h} open={i === 0} className="group border-t border-border first:border-t-0">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-ui font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  {h}
                  <span aria-hidden="true" className="font-mono text-muted-foreground group-open:hidden">+</span>
                  <span aria-hidden="true" className="hidden font-mono text-muted-foreground group-open:inline">−</span>
                </summary>
                <p className="px-4 pb-3.5 text-ui text-muted-foreground">{d}</p>
              </details>
            ))}
          </div>
          <div className="hidden rounded-lg bg-card p-6 md:block md:p-8">
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
      <section className="py-10 md:py-24">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6">
          <div className="rounded-lg bg-voltage p-6 md:p-16">
            <h2 className="max-w-[20ch] text-head font-bold leading-[1.1] text-white md:text-display">
              Bitmiş bir ürün değil, süren bir defter.
            </h2>
            <p className="mt-4 max-w-[56ch] text-body text-white/85">
              Kod açık, kararlar dokümanda. Neyi neden yaptığım <code className="font-mono">docs/</code> altında
              standartlar ve öğrenme notları olarak duruyor.
            </p>
            <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Cta session={session} className="press w-full rounded-md bg-foreground px-5 py-3.5 text-center text-ui font-semibold text-background hover:opacity-90 sm:w-auto sm:py-3">
                {session ? 'Uygulamaya git' : 'Kayıt ol'}
              </Cta>
              {!session && (
                <Link to="/login" reloadDocument className="text-ui font-semibold text-white underline underline-offset-4">
                  Zaten hesabın var mı? Giriş yap
                </Link>
              )}
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
