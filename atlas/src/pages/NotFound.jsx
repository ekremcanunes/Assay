import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="wrap notfound">
      <div className="eyebrow">404</div>
      <h1 className="h1">Akış bulunamadı</h1>
      <p className="lede">Adres yanlış veya akış kaldırılmış olabilir.</p>
      <Link className="btnlink" to="/">← Ana sayfaya dön</Link>
    </main>
  )
}
