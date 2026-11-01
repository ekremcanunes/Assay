// Masaüstü sahne geometrisi. Koordinatlar mockup'la (flow-style-v2) aynı.
export const NODE_W = 220
export const NODE_H = 64
export const VIEW_W = 1180
const LANE_H = 124

export const viewHeight = (flow) => 28 + flow.lanes.length * LANE_H

export const laneTop = (index) => 22 + index * LANE_H

export function nodePos(flow, nodeId) {
  const node = flow.nodes.find((n) => n.id === nodeId)
  const laneIndex = flow.lanes.findIndex((l) => l.id === node.lane)
  return { x: 150 + node.col * 270, y: 76 + laneIndex * LANE_H }
}

const R = 12 // dik dönüşlerde köşe yarıçapı
const ENTRY = 36 // farklı kolondan gelen bağlantı, hedefin ortasına değil bu kadar yanına girer

// Aynı satır → yatay; aynı kolon → dikey. Diğer: kaynağın altından/üstünden çıkar,
// şeritler arasındaki boşlukta yatay gider, hedefe dikey girer. Böylece kutuların üstünden geçmez.
export function edgePath(flow, a, b) {
  const A = nodePos(flow, a)
  const B = nodePos(flow, b)
  if (A.y === B.y) {
    const s = A.x < B.x ? 1 : -1
    return `M${A.x + (s * NODE_W) / 2} ${A.y} L${B.x - (s * NODE_W) / 2} ${B.y}`
  }
  const v = A.y < B.y ? 1 : -1
  const y1 = A.y + (v * NODE_H) / 2
  const y2 = B.y - (v * NODE_H) / 2
  if (A.x === B.x) return `M${A.x} ${y1} L${B.x} ${y2}`
  const h = A.x < B.x ? 1 : -1
  const gapY = (A.y + B.y) / 2 - (v * (Math.abs(B.y - A.y) - LANE_H)) / 2 // A'nın şeridinin hemen altındaki/üstündeki boşluk
  const x2 = B.x - h * ENTRY
  return [
    `M${A.x} ${y1}`,
    `L${A.x} ${gapY - v * R}`,
    `Q${A.x} ${gapY} ${A.x + h * R} ${gapY}`,
    `L${x2 - h * R} ${gapY}`,
    `Q${x2} ${gapY} ${x2} ${gapY + v * R}`,
    `L${x2} ${y2}`,
  ].join(' ')
}

const edgeKey = (e) => `${e[0]}>${e[1]}`

// Bir adımda her düğüm ve bağlantının durumu: on | aux | done | idle.
export function stepState(flow, stepIndex) {
  const step = flow.steps[stepIndex]
  const order = flow.steps.map((s) => s.node)
  const aux = new Set(step.aux ?? [])
  const nodeState = (id) => {
    if (id === step.node) return 'on'
    if (aux.has(id)) return 'aux'
    const i = order.indexOf(id)
    return i >= 0 && i < stepIndex ? 'done' : 'idle'
  }
  const onEdges = new Set([step.edge, ...(step.auxEdges ?? [])].filter(Boolean).map(edgeKey))
  const doneEdges = new Set(flow.steps.slice(0, stepIndex).map((s) => s.edge).filter(Boolean).map(edgeKey))
  const edgeState = (e) => (onEdges.has(edgeKey(e)) ? 'on' : doneEdges.has(edgeKey(e)) ? 'done' : '')
  return { nodeState, edgeState }
}
