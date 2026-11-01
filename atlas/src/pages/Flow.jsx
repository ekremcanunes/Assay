import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getFlow } from '../content'
import { renderInline } from '../lib/inline'
import useReducedMotion from '../lib/useReducedMotion'
import FlowStage from '../components/FlowStage'
import FlowChain from '../components/FlowChain'
import StepPanel from '../components/StepPanel'
import Terminal from '../components/Terminal'
import Controls from '../components/Controls'
import NotFound from './NotFound'

const PLAY_MS = 4200
const SWIPE_PX = 50

export default function Flow() {
  const { id } = useParams()
  const flow = getFlow(id)
  if (!flow) return <NotFound />
  return <FlowView key={flow.id} flow={flow} />
}

function FlowView({ flow }) {
  const total = flow.steps.length
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reduced = useReducedMotion()
  const touchX = useRef(null)

  // Elle gezinme oynatmayı durdurur.
  const go = useCallback((i) => { setPlaying(false); setIndex(((i % total) + total) % total) }, [total])
  const prev = useCallback(() => go(index - 1), [go, index])
  const next = useCallback(() => go(index + 1), [go, index])

  useEffect(() => {
    if (!playing || reduced) return
    const t = setInterval(() => setIndex((i) => (i + 1) % total), PLAY_MS)
    return () => clearInterval(t)
  }, [playing, reduced, total])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx <= -SWIPE_PX) next()
    if (dx >= SWIPE_PX) prev()
  }

  const step = flow.steps[index]

  return (
    <main className="wrap">
      <Link className="back" to="/">← Atlas</Link>
      <header className="top">
        <div>
          <div className="eyebrow">{flow.eyebrow}</div>
          <h1 className="h1">{renderInline(flow.title)}</h1>
          {flow.lede && <p className="lede">{renderInline(flow.lede)}</p>}
        </div>
        {flow.stats && (
          <div className="stats">
            {flow.stats.map((s) => (
              <div className="stat" key={s.l}><div className="n">{s.n}</div><div className="l">{s.l}</div></div>
            ))}
          </div>
        )}
      </header>

      <div className="only-desktop"><FlowStage flow={flow} stepIndex={index} onSelect={go} /></div>
      <div className="only-mobile"><FlowChain flow={flow} stepIndex={index} onSelect={go} /></div>

      <div className="deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <StepPanel step={step} index={index} total={total} />
        <Terminal file={step.file} fileNote={step.fileNote} code={step.code} />
      </div>

      <Controls
        index={index}
        total={total}
        playing={playing}
        canPlay={!reduced}
        onGo={go}
        onPrev={prev}
        onNext={next}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
    </main>
  )
}
