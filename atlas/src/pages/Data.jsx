import { Link } from 'react-router-dom'
import { dataMap, getFlow } from '../content'
import { renderInline } from '../lib/inline'
import { renderCode } from '../lib/code'

// Kartın üç bölümü her zaman aynı sırayla çizilir; bölüm yoksa içerikte "Saklanmaz" / "Yok" yazar.
const SECTIONS = [
  { key: 'in', label: 'Gelen' },
  { key: 'store', label: 'Saklanan' },
  { key: 'out', label: 'Üretilen / sunulan' },
]

const countOf = (group) => dataMap.cards.filter((c) => c.group === group).length

export default function Data() {
  return (
    <main className="wrap">
      <Link className="back" to="/">← Atlas</Link>
      <header className="top">
        <div>
          <div className="eyebrow">{dataMap.eyebrow}</div>
          <h1 className="h1">{renderInline(dataMap.title)}</h1>
          <p className="lede">{renderInline(dataMap.lede)}</p>
        </div>
        <div className="stats">
          {dataMap.groups.map((g) => (
            <div className={`stat g-${g.id}`} key={g.id}><div className="n">{countOf(g.id)}</div><div className="l">{g.label}</div></div>
          ))}
        </div>
      </header>

      <nav className="dnav" aria-label="Kartlar">
        {dataMap.cards.map((c) => (
          <a className={`g-${c.group}`} href={`#${c.id}`} key={c.id}><i />{c.title}</a>
        ))}
      </nav>

      {dataMap.groups.map((g) => (
        <section className="group" key={g.id} aria-labelledby={`grup-${g.id}`}>
          <div className="group-head">
            <h2 id={`grup-${g.id}`}>{g.label}</h2>
            <p>{g.desc}</p>
          </div>
          {dataMap.cards.filter((c) => c.group === g.id).map((c) => <DataCard card={c} key={c.id} />)}
        </section>
      ))}
    </main>
  )
}

function DataCard({ card }) {
  const flow = card.flow ? getFlow(card.flow) : null
  return (
    <article className={`card dcard g-${card.group}`} id={card.id}>
      <header className="dcard-head">
        <h3>{card.title}</h3>
        <span className="sample-tag">Örnek veri</span>
        <span className="dcard-via">{renderInline(card.via)}</span>
        {flow && <Link className="dcard-flow" to={`/flow/${flow.id}`}>Akış {flow.no} · {flow.title.replace(/\*/g, '')} →</Link>}
      </header>

      {SECTIONS.map(({ key, label }) => (
        <DataSection label={label} part={card[key]} key={key} />
      ))}

      <div className="drow">
        <div className="drow-k why">Neden böyle</div>
        <ul className="dwhy">
          {card.why.map((w, i) => <li key={i}>{renderInline(w)}</li>)}
        </ul>
      </div>
      <div className="src">Kaynak: <code>{card.file}</code></div>
    </article>
  )
}

function DataSection({ label, part }) {
  return (
    <div className="drow">
      <div className="drow-k">{label}</div>
      <div className="drow-v">
        {part.where && <div className="dwhere">{renderInline(part.where)}</div>}
        <p>{renderInline(part.text)}</p>
        {part.used && <FieldList title="Kullanılan" items={part.used} />}
        {part.dropped && <FieldList title="Atılan" items={part.dropped} />}
        {(part.samples ?? []).map((s, i) => (
          <figure className="sample" key={i}>
            <figcaption><span className="sample-tag">Örnek</span>{s.label}</figcaption>
            <pre>{renderCode(s.code)}</pre>
          </figure>
        ))}
      </div>
    </div>
  )
}

function FieldList({ title, items }) {
  return (
    <div className="dfields">
      <span>{title}</span>
      <ul>{items.map((t, i) => <li key={i}>{renderInline(t)}</li>)}</ul>
    </div>
  )
}
