import { NodeIconSvg } from './Icons'
import { stepState } from '../lib/layout'
import useReducedMotion from '../lib/useReducedMotion'

// Mobil sahne: adımların düğümleri alt alta; aktif adımın bağlantısında paket aşağı akar.
export default function FlowChain({ flow, stepIndex, onSelect }) {
  const { nodeState } = stepState(flow, stepIndex)
  const reduced = useReducedMotion()
  const step = flow.steps[stepIndex]
  const nodeOf = (id) => flow.nodes.find((n) => n.id === id)
  const toneOf = (n) => flow.lanes.find((l) => l.id === n.lane).tone

  return (
    <ol className="chain">
      {flow.steps.map((s, i) => {
        const n = nodeOf(s.node)
        const state = nodeState(s.node)
        const linkIn = i > 0 && (i === stepIndex && step.edge ? 'on' : i <= stepIndex ? 'done' : '')
        return (
          <li key={i}>
            {i > 0 && (
              <div className={`chain-link ${linkIn}`} aria-hidden="true">
                {linkIn === 'on' && !reduced && <span className="chain-packet" key={stepIndex} />}
              </div>
            )}
            <button
              type="button"
              className={`chain-node ${state} tone-${toneOf(n)}`}
              onClick={() => onSelect(i)}
              aria-current={i === stepIndex ? 'step' : undefined}
            >
              <span className="chain-ico"><NodeIconSvg name={n.icon} /></span>
              <span className="chain-txt">
                <span className="ttl">{n.title}</span>
                <span className="sub">{n.sub}</span>
              </span>
              <span className="stepnum">{String(i + 1).padStart(2, '0')}</span>
            </button>
            {i === stepIndex && (step.aux ?? []).length > 0 && (
              <div className="chain-aux">
                {step.aux.map((id) => <span key={id} className="aux-pill">+ {nodeOf(id).title}</span>)}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
