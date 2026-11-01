import { Link } from 'react-router-dom'

// Geçici: Task 5'te akış listesiyle değişir.
export default function Home() {
  return (
    <main className="wrap">
      <h1 className="h1">Atlas</h1>
      <Link to="/flow/teslimat">02 · Teslimat →</Link>
    </main>
  )
}
