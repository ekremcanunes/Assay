import { terms } from '../content'

// Masaüstünde üzerine gelince balon; tıklayınca (dokunmatikte de) tanım panelin altında açılır.
export default function TermChip({ id, open, onToggle }) {
  const t = terms.get(id)
  return (
    <span className={`term${open ? ' open' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={open}>{t.term}</button>
      <span className="tip" role="tooltip">{t.def}</span>
    </span>
  )
}
