import { useState } from 'react'
import { Link } from 'react-router-dom'
import { flowsUsingTerm, terms } from '../content'

const sorted = [...terms.entries()].sort(([, a], [, b]) => a.term.localeCompare(b.term, 'tr'))

export default function Glossary() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLocaleLowerCase('tr')
  const list = needle
    ? sorted.filter(([, t]) => `${t.term} ${t.def}`.toLocaleLowerCase('tr').includes(needle))
    : sorted

  return (
    <main className="wrap">
      <Link className="back" to="/">← Atlas</Link>
      <div className="eyebrow">Sözlük</div>
      <h1 className="h1">Terimler</h1>
      <input
        className="search"
        type="search"
        placeholder="Terim ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Terim ara"
      />
      {list.length === 0 && <p className="lede">Eşleşen terim yok.</p>}
      <dl className="glossary">
        {list.map(([id, t]) => (
          <div className="gl-item" key={id}>
            <dt>{t.term}</dt>
            <dd>
              {t.def}
              <span className="gl-flows">
                Geçtiği akışlar:{' '}
                {flowsUsingTerm(id).map((f, i) => (
                  <span key={f.id}>{i > 0 && ', '}<Link to={`/flow/${f.id}`}>{f.eyebrow.split(' · ')[1] ?? f.id}</Link></span>
                ))}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
