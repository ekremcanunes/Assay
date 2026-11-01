import { useState } from 'react'
import FlowStage from '../components/FlowStage'
import { getFlow } from '../content'

// Geçici: Task 3 kontrolü için sahne. Task 4'te kaldırılır.
export default function Home() {
  const [i, setI] = useState(2)
  return (
    <main className="wrap">
      <h1 className="h1">Atlas</h1>
      <FlowStage flow={getFlow('teslimat')} stepIndex={i} onSelect={setI} />
    </main>
  )
}
