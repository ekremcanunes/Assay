import { useEffect, useRef } from 'react'
import { NODE_H, NODE_W, VIEW_W, edgePath, laneTop, nodePos, stepState, viewHeight } from '../lib/layout'
import { NodeIcon } from './Icons'
import useReducedMotion from '../lib/useReducedMotion'

// 10px, 0.16em aralıklı büyük harf için yaklaşık genişlik (+ iç boşluk)
const labelWidth = (text) => Math.round(text.length * 8.4 + 16)

// Masaüstü sahne: şeritler, düğümler, bağlantılar ve aktif bağlantıda akan paket.
export default function FlowStage({ flow, stepIndex, onSelect }) {
  const step = flow.steps[stepIndex]
  const { nodeState, edgeState } = stepState(flow, stepIndex)
  const order = flow.steps.map((s) => s.node)
  const reduced = useReducedMotion()
  const motionRef = useRef(null)
  const packetPath = step.edge ? edgePath(flow, ...step.edge) : null

  useEffect(() => {
    if (packetPath && motionRef.current) motionRef.current.beginElement()
  }, [packetPath, stepIndex])

  return (
    <div className="stage">
      {/* role="group": "img" içindeki düğme düğümleri ekran okuyucudan gizlenir */}
      <svg viewBox={`0 0 ${VIEW_W} ${viewHeight(flow)}`} role="group" aria-label={flow.title.replace(/\*/g, '')}>
        <defs>
          {/* userSpaceOnUse: dikey (genişliği sıfır) çizgide de gradyan çizilsin */}
          <linearGradient id="gEdge" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VIEW_W} y2="0">
            <stop offset="0" stopColor="#3B82F6" />
            <stop offset="1" stopColor="#A5B4FC" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="pk">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".4" stopColor="#93c5fd" />
            <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {flow.lanes.map((lane, i) => (
          <g key={lane.id} className={`lane tone-${lane.tone}`}>
            <rect x="14" y={laneTop(i)} width={VIEW_W - 28} height="108" rx="14" />
          </g>
        ))}

        {flow.edges.map((e) => (
          <path key={e.join('>')} d={edgePath(flow, ...e)} className={`edge ${edgeState(e)}`} />
        ))}

        {/* Etiketler bağlantılardan sonra, opak hap üstünde çizilir: geçen çizgi hapın altında kalır */}
        {flow.lanes.map((lane, i) => (
          <g key={lane.id} className={`lane-label tone-${lane.tone}`}>
            <rect x="22" y={laneTop(i) + 5} width={labelWidth(lane.label)} height="16" rx="8" />
            <text x="30" y={laneTop(i) + 16}>{lane.label}</text>
          </g>
        ))}

        {flow.nodes.map((n) => {
          const { x, y } = nodePos(flow, n.id)
          const idx = order.indexOf(n.id)
          const tone = flow.lanes.find((l) => l.id === n.lane).tone
          const select = idx >= 0 ? () => onSelect(idx) : undefined
          return (
            <g
              key={n.id}
              className={`node ${nodeState(n.id)} tone-${tone}${select ? ' clickable' : ''}`}
              transform={`translate(${x - NODE_W / 2} ${y - NODE_H / 2})`}
              onClick={select}
              onKeyDown={select ? (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select() }
              } : undefined}
              role={select ? 'button' : undefined}
              tabIndex={select ? 0 : undefined}
              aria-label={select ? `Adım ${idx + 1}: ${n.title}` : undefined}
            >
              {select && <rect className="focus-ring" x="-6" y="-6" width={NODE_W + 12} height={NODE_H + 12} rx="18" />}
              <rect className="box" width={NODE_W} height={NODE_H} rx="14" />
              <g className="ico" transform={`translate(30 ${NODE_H / 2})`}><NodeIcon name={n.icon} /></g>
              <text className="ttl" x="54" y="28">{n.title}</text>
              <text className="sub" x="54" y="46">{n.sub}</text>
              {idx >= 0 && (
                <g className="stepbadge" transform={`translate(${NODE_W - 38} -9)`}>
                  <rect width="28" height="18" rx="9" />
                  <text className="stepnum" x="14" y="13" textAnchor="middle">{String(idx + 1).padStart(2, '0')}</text>
                </g>
              )}
            </g>
          )
        })}

        {packetPath && !reduced && (
          <circle r="9" fill="url(#pk)">
            <animateMotion
              ref={motionRef}
              dur="1.1s"
              fill="freeze"
              calcMode="spline"
              keySplines=".4 0 .2 1"
              keyTimes="0;1"
              path={packetPath}
            />
          </circle>
        )}
      </svg>
    </div>
  )
}
