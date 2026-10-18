import { Suspense, use, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TECH } from '../lib/stack'
import { loadDetail } from '../lib/techDetail'
import { CodeBlock, MiniTable } from '../components/landing/techParts'

/*
  Teknoloji sayfası (/landing/tech/:slug) — mobilde landing'deki ızgaradan açılır.
  İçerik lib/stack.jsx'teki mevcut detaydan gelir; yalnız düzen farklı:
  ne işe yarıyor (tagline) · neden seçtik (why) · Assay'da nasıl (blocks) · ne öğrendik (warn blokları).
  Kodlar "Teknik ayrıntı" altında kapalı gelir — sayfa önce anlatır, kodu isteyen açar.
*/

function Fold({ label, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-ui text-foreground hover:bg-secondary"
      >
        <span className="min-w-0 truncate font-mono text-micro text-muted-foreground">{label}</span>
        <span className="shrink-0 underline underline-offset-4">{open ? 'Gizle' : 'Teknik ayrıntı'}</span>
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  )
}

function HowBlock({ b }) {
  if (b.kind === 'code') {
    return <Fold label={b.title ?? 'kod'}><CodeBlock code={b.code} note={b.note} /></Fold>
  }
  if (b.kind === 'diagram') {
    return (
      <figure>
        <h3 className="mb-1.5 text-body font-semibold text-foreground">{b.title}</h3>
        {b.body && <p className="mb-3 text-ui text-muted-foreground">{b.body}</p>}
        <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">{b.figure}</div>
        {b.caption && <figcaption className="mt-2 font-mono text-micro text-muted-foreground">{b.caption}</figcaption>}
      </figure>
    )
  }
  return (
    <div>
      <h3 className="mb-1.5 text-body font-semibold text-foreground">{b.title}</h3>
      <p className="text-ui text-muted-foreground">{b.body}</p>
      {b.table && <MiniTable head={b.table.head} rows={b.table.rows} />}
      {b.after && <p className="mt-3 text-ui text-muted-foreground">{b.after}</p>}
      {b.code && <div className="mt-3"><Fold label={b.title}><CodeBlock code={b.code} /></Fold></div>}
    </div>
  )
}

// Kart ızgaradan buraya büyür (View Transition, aynı ad)
function TechHeader({ tech, tagline }) {
  return (
    <header className="mb-6 rounded-xl border border-foreground bg-card p-5" style={{ viewTransitionName: `tech-${tech.slug}` }}>
      <span className="text-voltage [&>svg]:h-8 [&>svg]:w-8">{tech.icon}</span>
      <h1 className="mt-3 text-head font-bold text-foreground">{tech.name}</h1>
      <span className="font-mono text-micro tracking-wide text-muted-foreground">{tech.role}</span>
      {tagline && <p className="mt-3 text-body text-foreground">{tagline}</p>}
    </header>
  )
}

function Body({ tech }) {
  const detail = tech.detail ?? (tech.loadDetail ? use(loadDetail(tech)) : null)
  if (!detail) {
    return (
      <>
      <TechHeader tech={tech} />
      <div className="rounded-lg border border-dashed border-input bg-card p-6 text-center">
        <h2 className="text-body font-semibold text-foreground">Henüz yazılmadı</h2>
        <p className="mt-1 text-ui text-muted-foreground">Bu teknolojinin yazısı sırada. Önceki / Sonraki ile diğerlerine bakabilirsin.</p>
      </div>
      </>
    )
  }

  const { tagline, why, blocks, files, doc } = detail
  const how = blocks.filter((b) => b.kind !== 'warn')
  const learned = blocks.filter((b) => b.kind === 'warn')

  return (
    <>
    <TechHeader tech={tech} tagline={tagline} />
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="label mb-3 text-muted-foreground">Neden bunu seçtik</h2>
        <div className="flex flex-col gap-4">
          {why.map((w) => (
            <div key={w.t} className="rule-accent pt-2.5">
              <h3 className="mb-1 text-body font-semibold text-foreground">{w.t}</h3>
              <p className="text-ui text-muted-foreground">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {how.length > 0 && (
        <section>
          <h2 className="label mb-3 text-muted-foreground">Assay&apos;da nasıl</h2>
          <div className="flex flex-col gap-6">
            {how.map((b) => <HowBlock key={b.title ?? b.code} b={b} />)}
          </div>
        </section>
      )}

      {learned.length > 0 && (
        <section>
          <h2 className="label mb-3 text-muted-foreground">Ne öğrendik</h2>
          <div className="flex flex-col gap-3">
            {learned.map((b) => (
              <div key={b.title} className="edge-accent rounded-r-lg bg-card p-4">
                <h3 className="mb-1 text-ui font-semibold text-foreground">{b.title}</h3>
                <p className="text-ui text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="label text-muted-foreground">İlgili dosyalar</span>
        <div className="flex flex-wrap gap-1.5">
          {files.map((f) => (
            <code key={f} className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-micro text-foreground">{f}</code>
          ))}
        </div>
        <span className="font-mono text-micro text-muted-foreground">Ayrıntılı not: {doc}</span>
      </footer>
    </div>
    </>
  )
}

export default function LandingTech() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const i = TECH.findIndex((t) => t.slug === slug)
  // Önceki/Sonraki sayfayı değiştirince en üstten başla
  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  if (i < 0) return <Navigate to="/landing" replace />

  const tech = TECH[i]
  const prev = TECH[(i + TECH.length - 1) % TECH.length]
  const next = TECH[(i + 1) % TECH.length]
  // Geri: landing'den gelindiyse tarayıcı geçmişi (kaydırma yeri korunur), doğrudan açıldıysa entegrasyon bölümü
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/landing#entegrasyon'))

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-card px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button type="button" onClick={back} aria-label="Landing'e dön" className="press grid h-11 w-11 place-items-center rounded-md text-foreground hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-ui text-muted-foreground">Teknolojiler · {i + 1} / {TECH.length}</span>
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-6 pt-4">
        <Suspense fallback={<><TechHeader tech={tech} /><p className="font-mono text-micro text-muted-foreground">yükleniyor…</p></>}>
          <Body tech={tech} />
        </Suspense>
      </main>

      <nav className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <Link to={`/landing/tech/${prev.slug}`} replace className="press flex h-11 items-center justify-center truncate rounded-md border border-border px-3 text-ui text-foreground hover:border-foreground">
          ‹ {prev.name}
        </Link>
        <Link to={`/landing/tech/${next.slug}`} replace className="press flex h-11 items-center justify-center truncate rounded-md border border-border px-3 text-ui text-foreground hover:border-foreground">
          {next.name} ›
        </Link>
      </nav>
    </div>
  )
}
