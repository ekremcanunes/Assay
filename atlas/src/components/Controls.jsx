export default function Controls({ index, total, playing, canPlay, onGo, onPrev, onNext, onTogglePlay }) {
  return (
    <div className="ctrl">
      <div className="dots">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? 'on' : i < index ? 'done' : ''}
            onClick={() => onGo(i)}
            aria-label={`Adım ${i + 1}`}
            aria-current={i === index ? 'step' : undefined}
          ><i /></button>
        ))}
      </div>
      <div className="btns">
        <span className="kbd">← → ile gez</span>
        <button type="button" onClick={onPrev}>Geri</button>
        {canPlay && (
          <button type="button" onClick={onTogglePlay} aria-pressed={playing}>{playing ? '❚❚ Durdur' : '▶ Oynat'}</button>
        )}
        <button type="button" className="pri" onClick={onNext}>İleri</button>
      </div>
    </div>
  )
}
