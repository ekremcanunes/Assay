import { useState } from 'react'
import { Link } from 'react-router-dom'
import { screenMap } from '../content'
import { renderInline } from '../lib/inline'
import { NodeIconSvg } from '../components/Icons'
import useReducedMotion from '../lib/useReducedMotion'

const SOURCES = {
  db: { label: 'Veritabanı', desc: 'olduğu gibi okunur' },
  server: { label: 'Sunucu hesabı', desc: '.NET serviste hesaplanır' },
  client: { label: 'Tarayıcı hesabı', desc: 'React tarafında hesaplanır' },
  external: { label: 'Dış kaynak', desc: 'Yahoo vb. olduğu gibi' },
}

const pad = (n) => String(n).padStart(2, '0')
const allBlocks = screenMap.screens.flatMap((s) => s.blocks)
const counts = Object.keys(SOURCES).map((k) => ({ k, n: allBlocks.filter((b) => b.source === k).length }))

// Öğe numarası tüm sayfa boyunca süreklidir (01–12): sekme değişse de aynı öğe aynı numarayı taşır.
const numberOf = new Map(allBlocks.map((b, i) => [b.id, i + 1]))

export default function Screens() {
  const [screenId, setScreenId] = useState(screenMap.screens[0].id)
  const screen = screenMap.screens.find((s) => s.id === screenId)
  const [blockId, setBlockId] = useState(screen.blocks[0].id)
  const block = screen.blocks.find((b) => b.id === blockId) ?? screen.blocks[0]

  const pickScreen = (id) => {
    setScreenId(id)
    setBlockId(screenMap.screens.find((s) => s.id === id).blocks[0].id)
  }

  return (
    <main className="wrap">
      <Link className="back" to="/">← Atlas</Link>
      <header className="top">
        <div>
          <div className="eyebrow">{screenMap.eyebrow}</div>
          <h1 className="h1">{renderInline(screenMap.title)}</h1>
          <p className="lede">{renderInline(screenMap.lede)}</p>
        </div>
        <div className="stats">
          {counts.map(({ k, n }) => (
            <div className={`stat src-${k}`} key={k}><div className="n">{n}</div><div className="l">{SOURCES[k].label}</div></div>
          ))}
        </div>
      </header>

      <div className="legend" aria-label="Kaynak türleri">
        {Object.entries(SOURCES).map(([k, s]) => (
          <span className={`legend-item src-${k}`} key={k}><i />{s.label}<small>{s.desc}</small></span>
        ))}
      </div>

      <div className="tabs" role="tablist" aria-label="Ekranlar">
        {screenMap.screens.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === screenId}
            className={s.id === screenId ? 'on' : ''}
            onClick={() => pickScreen(s.id)}
          >{s.title}</button>
        ))}
      </div>

      <div className="lineage">
        <div className="phone" aria-label={`${screen.title} ekranının şeması`}>
          <div className="phone-bar"><span>{screen.route}</span></div>
          <div className="phone-body">
            {screen.blocks.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`wf src-${b.source}${b.id === block.id ? ' on' : ''}`}
                style={{ minHeight: 44 + b.h * 34 }}
                onClick={() => setBlockId(b.id)}
                aria-pressed={b.id === block.id}
              >
                <span className="wf-no">{pad(numberOf.get(b.id))}</span>
                <span className="wf-label">{b.label}</span>
                <span className="wf-src">{SOURCES[b.source].label}</span>
              </button>
            ))}
          </div>
        </div>

        <LineagePanel block={block} key={block.id} />
      </div>
    </main>
  )
}

function LineagePanel({ block }) {
  const reduced = useReducedMotion()
  return (
    <section className="card lin-panel fade" aria-live="polite">
      <div className="stephead">
        <div className="big">{pad(numberOf.get(block.id))}</div>
        <h2>{block.label}</h2>
      </div>
      <div className="lin-meta">
        <span className={`src-badge src-${block.source}`}><i />{SOURCES[block.source].label}</span>
        <code>{block.endpoint}</code>
        <code className="dim">{block.hook}</code>
      </div>

      <ol className="lin-chain">
        {block.chain.map((c, i) => (
          <li key={i}>
            {i > 0 && (
              <div className="chain-link on" aria-hidden="true">
                {!reduced && <span className="chain-packet" style={{ animationDelay: `${i * 0.35}s` }} />}
              </div>
            )}
            <div className="lin-step">
              <span className="chain-ico"><NodeIconSvg name={c.icon} /></span>
              <span>{renderInline(c.label)}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="cols lin-cols">
        <div className="col what"><div className="k">Nasıl hesaplanıyor</div><p>{renderInline(block.calc)}</p></div>
        <div className="col why"><div className="k">Neden böyle gösteriliyor</div><p>{renderInline(block.why)}</p></div>
      </div>
      <div className="src">Kaynak: <code>{block.file}</code></div>
    </section>
  )
}
