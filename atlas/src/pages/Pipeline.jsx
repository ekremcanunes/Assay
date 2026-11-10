import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { pipelineMap as P } from '../content'
import { renderInline } from '../lib/inline'
import { renderCode } from '../lib/code'
import Terminal from '../components/Terminal'

// Akış 12 · Pipeline haritası: hatlar (tetikleyici) × aşamalar. Çalışan duraklar dolu, önerilenler kesikli.
// "Eksikleri göster" kapalıyken yalnız bugün çalışan pipeline görünür; açılınca araya girecek duraklar yerinde belirir.
const GATE = {
  blocks: { label: 'Durdurur', cls: 'gate-blocks' },
  warns: { label: 'Uyarır', cls: 'gate-warns' },
  none: { label: 'Kontrol yok', cls: 'gate-none' },
}
const MATRIX = {
  yes: { mark: '●', label: 'Var', cls: 'mx-yes' },
  partial: { mark: '◐', label: 'Kısmen', cls: 'mx-partial' },
  no: { mark: '○', label: 'Yok', cls: 'mx-no' },
}

const lineOf = (id) => P.lines.find((l) => l.id === id)
const phaseOf = (id) => P.phases.find((p) => p.id === id)
const fileByPath = new Map(P.files.map((f) => [f.path, f]))
const present = P.stations.filter((s) => s.status === 'present')
const missing = P.stations.filter((s) => s.status === 'missing')

export default function Pipeline() {
  const [showMissing, setShowMissing] = useState(false)
  const [selectedId, setSelectedId] = useState('prod-deploysh')
  const [fileId, setFileId] = useState(P.files[0].id)
  const guideRef = useRef(null)
  const panelRef = useRef(null)
  // Mobilde panel listenin altında kalır: durağa dokununca panele kaydır.
  const select = (id) => {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 767px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const visible = useMemo(() => P.stations.filter((s) => showMissing || s.status === 'present'), [showMissing])
  const selected = P.stations.find((s) => s.id === selectedId)
  // Seçili durak eksikse ve eksikler gizlendiyse panel boş kalmasın.
  const shown = selected && (showMissing || selected.status === 'present') ? selected : null
  const openGuide = (path) => {
    const f = fileByPath.get(path)
    if (!f) return
    setFileId(f.id)
    guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cell = (lineId, phaseId) => visible.filter((s) => s.line === lineId && s.phase === phaseId)

  return (
    <main className="wrap">
      <Link className="back" to="/">← Atlas</Link>
      <header className="top">
        <div>
          <div className="eyebrow">{P.eyebrow}</div>
          <h1 className="h1">{renderInline(P.title)}</h1>
          <p className="lede">{renderInline(P.lede)}</p>
        </div>
        <div className="stats">
          <div className="stat"><div className="n">{present.length}</div><div className="l">çalışan durak</div></div>
          <div className="stat"><div className="n">{present.filter((s) => s.gate === 'blocks').length}</div><div className="l">durdurabilen</div></div>
          <div className="stat stat-missing"><div className="n">{missing.length}</div><div className="l">eksik durak</div></div>
          <div className="stat"><div className="n">{P.files.length}</div><div className="l">dosya</div></div>
        </div>
      </header>

      <div className="pipe-toolbar">
        <button
          type="button"
          role="switch"
          aria-checked={showMissing}
          className={`pipe-switch${showMissing ? ' on' : ''}`}
          onClick={() => setShowMissing((v) => !v)}
        >
          <span className="pipe-knob" aria-hidden="true" />
          Eksikleri göster <small>({missing.length})</small>
        </button>
        <div className="pipe-legend" aria-label="Gösterim">
          <span><i className="pdot pdot-present" />çalışıyor</span>
          <span><i className="pdot pdot-missing" />önerildi, yok</span>
          {Object.values(GATE).map((g) => <span key={g.cls} className={`gate ${g.cls}`}>{g.label}</span>)}
        </div>
      </div>

      {/* Masaüstü: hat × aşama panosu */}
      <div className="pipe-board only-desktop" style={{ '--phases': P.phases.length }}>
        <div className="pipe-head" />
        {P.phases.map((p, i) => (
          <div key={p.id} className="pipe-head"><span className="pipe-step">{i + 1}</span>{p.label}</div>
        ))}
        {P.lines.map((l) => (
          <Row key={l.id} line={l} cell={cell} selectedId={shown?.id} onSelect={select} />
        ))}
      </div>

      {/* Mobil: hat başına liste */}
      <div className="only-mobile pipe-mobile">
        {P.lines.map((l) => {
          const items = visible.filter((s) => s.line === l.id)
            .sort((a, b) => P.phases.findIndex((p) => p.id === a.phase) - P.phases.findIndex((p) => p.id === b.phase))
          if (!items.length) return null
          return (
            <section key={l.id} className={`pipe-mline tone-${l.tone}`}>
              <h3><i />{l.label} <small>{l.sub}</small></h3>
              <ol>
                {items.map((s) => (
                  <li key={s.id}>
                    <StationChip s={s} active={shown?.id === s.id} onSelect={select} withPhase />
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>

      <div ref={panelRef} className="pipe-anchor">{shown && <StationPanel s={shown} onOpenGuide={openGuide} />}</div>

      <section className="pipe-section">
        <h2 className="pipe-h2">Kontrol matrisi</h2>
        <p className="lede">"Pipeline'ınız neyi kontrol ediyor?" sorusunun tek bakış cevabı.</p>
        <div className="mx-wrap">
          <table className="mx">
            <thead>
              <tr>
                <th>Kontrol</th>
                {P.matrix.columns.map((c) => <th key={c}>{lineOf(c).label}</th>)}
                <th className="mx-note-h">Not</th>
              </tr>
            </thead>
            <tbody>
              {P.matrix.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {P.matrix.columns.map((c) => (
                    <td key={c} className={MATRIX[r[c]].cls}>
                      <span aria-hidden="true">{MATRIX[r[c]].mark}</span> {MATRIX[r[c]].label}
                    </td>
                  ))}
                  <td className="mx-note">{renderInline(r.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pipe-section" ref={guideRef}>
        <h2 className="pipe-h2">Dosya rehberi</h2>
        <p className="lede">Pipeline'ı oluşturan dosyalar, satır satır: ne yapar, neden böyle yazıldı.</p>
        <FileGuide fileId={fileId} onPick={setFileId} />
      </section>
    </main>
  )
}

function Row({ line, cell, selectedId, onSelect }) {
  return (
    <>
      <div className={`pipe-line tone-${line.tone}`}>
        <i className="pipe-swatch" />
        <span>
          <b>{line.label}</b>
          <small>{line.sub}</small>
        </span>
      </div>
      {P.phases.map((p) => (
        <div key={p.id} className={`pipe-cell tone-${line.tone}`}>
          <span className="pipe-rail" aria-hidden="true" />
          {cell(line.id, p.id).map((s) => (
            <StationChip key={s.id} s={s} active={selectedId === s.id} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </>
  )
}

function StationChip({ s, active, onSelect, withPhase = false }) {
  const missingCls = s.status === 'missing' ? ' missing' : ''
  return (
    <button
      type="button"
      className={`station${missingCls}${active ? ' on' : ''}`}
      onClick={() => onSelect(s.id)}
      aria-pressed={active}
    >
      <i className={`pdot ${s.status === 'missing' ? 'pdot-missing' : 'pdot-present'}`} aria-hidden="true" />
      {/* Rozet etiketin altında: dar hücrede etiket tam genişliği kullanır, kelime ortadan bölünmez */}
      <span className="station-txt">
        {withPhase && <small className="station-phase">{phaseOf(s.phase).label}</small>}
        <span className="station-label">{s.label}</span>
        {s.status === 'present'
          ? <span className={`gate ${GATE[s.gate].cls}`}>{GATE[s.gate].label}</span>
          : <span className="prio">{s.priority}</span>}
      </span>
    </button>
  )
}

function StationPanel({ s, onOpenGuide }) {
  const line = lineOf(s.line)
  const guide = fileByPath.get(s.file)
  return (
    <section className="deck pipe-panel fade" key={s.id} aria-live="polite">
      <div className="card">
        <div className="eyebrow">{line.label} · {phaseOf(s.phase).label}</div>
        <div className="stephead">
          <h2>{s.label}</h2>
          {s.status === 'present'
            ? <span className={`gate ${GATE[s.gate].cls}`}>{GATE[s.gate].label}</span>
            : <span className="prio">{s.priority} · önerildi</span>}
        </div>
        <div className="cols">
          <div className="col what"><div className="k">Ne yapar</div><p>{renderInline(s.does)}</p></div>
          <div className="col why"><div className="k">Neyi kontrol eder</div><p>{renderInline(s.checks)}</p></div>
          <div className="col cost"><div className="k">Başarısız olursa</div><p>{renderInline(s.ifFails)}</p></div>
        </div>
        {s.ref && <p className="termdef"><b>Kaynak</b> — {s.ref}</p>}
        {guide && (
          <button type="button" className="btnlink" onClick={() => onOpenGuide(s.file)}>
            Dosya rehberinde aç: {guide.title.split(' — ')[0]} →
          </button>
        )}
      </div>
      {s.code
        ? <Terminal file={s.file} code={s.code} />
        : (
          <div className="card termcard pipe-nocode">
            <p className="lede">{s.status === 'missing' ? 'Bu durak henüz yok; kodu yazılmadı.' : 'Bu durak için kod alıntısı yok.'}</p>
            <div className="src">Kaynak: <code>{s.file}</code></div>
          </div>
        )}
    </section>
  )
}

function FileGuide({ fileId, onPick }) {
  const f = P.files.find((x) => x.id === fileId)
  return (
    <div className="guide">
      <nav className="guide-list" aria-label="Dosyalar">
        {P.files.map((x) => (
          <button key={x.id} type="button" className={x.id === fileId ? 'on' : ''} onClick={() => onPick(x.id)} aria-pressed={x.id === fileId}>
            <span className={`guide-kind kind-${x.kind}`}>{x.kind}</span>
            <code>{x.path.split('/').pop()}</code>
          </button>
        ))}
      </nav>
      <article className="guide-body card fade" key={f.id}>
        <h3>{f.title}</h3>
        <dl className="guide-meta">
          <div><dt>Yol</dt><dd><code>{f.path}</code></dd></div>
          <div><dt>Tetikleyici</dt><dd>{f.trigger}</dd></div>
          <div><dt>Nerede koşar</dt><dd>{f.runsOn}</dd></div>
        </dl>
        <ol className="guide-blocks">
          {f.blocks.map((b) => (
            <li key={b.lines}>
              <div className="term-win">
                <div className="term-bar"><span className="fname">satır {b.lines}</span></div>
                <pre>{renderCode(b.code)}</pre>
              </div>
              <p>{renderInline(b.note)}</p>
            </li>
          ))}
        </ol>
      </article>
    </div>
  )
}
