import { Link } from 'react-router-dom'
import { dataMap, flows, screenMap, terms } from '../content'
import { renderInline } from '../lib/inline'

const GROUPS = [
  { id: 'altyapi', label: 'Altyapı', desc: 'İstek yolu, teslimat, kimlik, container düzeni, gözlem.' },
  { id: 'veri', label: 'Veri', desc: 'Kaynaklar, cache, katalog, türetilen veri, ekran → veri haritası.' },
]

const firstSentence = (text) => (text ?? '').split(/(?<=\.)\s/)[0]

export default function Home() {
  return (
    <main className="wrap">
      <header className="home-top">
        <div>
          <div className="eyebrow">Assay · Altyapı ve veri</div>
          <h1 className="h1">Atlas</h1>
          <p className="lede">
            Assay'ın nasıl kurulduğunu ve verinin nereden gelip nereye gittiğini adım adım anlatan akışlar.
            Her adımda: ne oluyor, neden böyle, bedeli ne.
          </p>
        </div>
        <Link className="btnlink" to="/terms">Sözlük · {terms.size} terim</Link>
      </header>

      {GROUPS.map((g) => {
        const items = flows.filter((f) => f.group === g.id)
        return (
          <section className="group" key={g.id}>
            <div className="group-head">
              <h2>{g.label}</h2>
              <p>{g.desc}</p>
            </div>
            {items.length === 0 ? (
              <div className="soon">Yakında</div>
            ) : (
              <div className="flow-grid">
                {items.map((f) => (
                  <Link className="flow-card" key={f.id} to={`/flow/${f.id}`}>
                    <span className="flow-no">{f.no}</span>
                    <span className="flow-title">{renderInline(f.title.replace(/\*/g, ''))}</span>
                    <span className="flow-lede">{renderInline(firstSentence(f.lede))}</span>
                    <span className="flow-meta">{f.steps.length} adım →</span>
                  </Link>
                ))}
                {g.id === 'veri' && (
                  <Link className="flow-card" to="/ekran-veri">
                    <span className="flow-no">{screenMap.no}</span>
                    <span className="flow-title">{renderInline(screenMap.title.replace(/\*/g, ''))}</span>
                    <span className="flow-lede">{renderInline(firstSentence(screenMap.lede))}</span>
                    <span className="flow-meta">{screenMap.screens.flatMap((s) => s.blocks).length} öğe →</span>
                  </Link>
                )}
                {g.id === 'veri' && (
                  <Link className="flow-card" to="/veri">
                    <span className="flow-no">{dataMap.no}</span>
                    <span className="flow-title">{renderInline(dataMap.title.replace(/\*/g, ''))}</span>
                    <span className="flow-lede">{renderInline(firstSentence(dataMap.lede))}</span>
                    <span className="flow-meta">{dataMap.cards.length} kart →</span>
                  </Link>
                )}
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}
