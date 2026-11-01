import { useState } from 'react'
import { renderInline } from '../lib/inline'
import { terms } from '../content'
import TermChip from './TermChip'

const pad = (n) => String(n).padStart(2, '0')

export default function StepPanel({ step, index, total }) {
  const [openTerm, setOpenTerm] = useState(null)
  const open = openTerm && step.terms.includes(openTerm) ? openTerm : null

  return (
    <div className="card fade" key={index}>
      <div className="stephead">
        <div className="big">{pad(index + 1)}<small>/{pad(total)}</small></div>
        <h2>{step.title}</h2>
      </div>
      <div className="cols">
        <div className="col what"><div className="k">Ne oluyor</div><p>{renderInline(step.what)}</p></div>
        <div className="col why"><div className="k">Neden böyle</div><p>{renderInline(step.why)}</p></div>
        <div className="col cost"><div className="k">Bedeli</div><p>{renderInline(step.cost)}</p></div>
      </div>
      <div className="terms">
        {step.terms.map((id) => (
          <TermChip key={id} id={id} open={open === id} onToggle={() => setOpenTerm(open === id ? null : id)} />
        ))}
      </div>
      {open && (
        <p className="termdef"><b>{terms.get(open).term}</b> — {terms.get(open).def}</p>
      )}
    </div>
  )
}
