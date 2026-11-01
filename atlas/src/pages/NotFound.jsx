import { Link } from 'react-router-dom'

// kind="flow": /flow/:id bulunamadı; diğer her bilinmeyen adres için genel sayfa.
export default function NotFound({ kind }) {
  return (
    <main className="wrap notfound">
      <div className="eyebrow">404</div>
      <h1 className="h1">{kind === 'flow' ? 'Akış bulunamadı' : 'Sayfa bulunamadı'}</h1>
      <p className="lede">Adres yanlış veya içerik kaldırılmış olabilir.</p>
      <Link className="btnlink" to="/">← Ana sayfaya dön</Link>
    </main>
  )
}
