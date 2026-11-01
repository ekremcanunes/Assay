// Düğüm ikonları; (0,0) merkezli, rengi üst öğenin `color`'undan alır.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 }

const ICONS = {
  git: (
    <>
      <circle cx="0" cy="-6" r="3.2" {...S} />
      <circle cx="0" cy="8" r="3.2" {...S} />
      <circle cx="9" cy="0" r="3.2" {...S} />
      <path d="M0-3v8M3 -5c4 1 6 2 6 2" {...S} />
    </>
  ),
  gear: (
    <>
      <circle r="4" {...S} />
      <path d="M0-10v4M0 6v4M-10 0h4M6 0h4M-7-7l3 3M4 4l3 3M-7 7l3-3M4-4l3-3" {...S} />
    </>
  ),
  box: (
    <>
      <path d="M-9-5l9-5 9 5v10l-9 5-9-5z" {...S} />
      <path d="M-9-5l9 5 9-5M0 0v10" {...S} />
    </>
  ),
  bucket: (
    <>
      <path d="M-9-7h18l-3 16h-12z" {...S} />
      <ellipse cx="0" cy="-7" rx="9" ry="3" {...S} />
    </>
  ),
  pipe: (
    <>
      <path d="M-10 0h6M4 0h6M-10-6v12M10-6v12" {...S} />
      <circle r="4" {...S} />
    </>
  ),
  server: (
    <>
      <rect x="-10" y="-9" width="20" height="8" rx="2" {...S} />
      <rect x="-10" y="2" width="20" height="8" rx="2" {...S} />
      <circle cx="-5" cy="-5" r="1.4" fill="currentColor" />
      <circle cx="-5" cy="6" r="1.4" fill="currentColor" />
    </>
  ),
  key: (
    <>
      <circle cx="-4" cy="0" r="5" {...S} />
      <path d="M1 0h10M7 0v4M10 0v3" {...S} />
    </>
  ),
}

export function NodeIcon({ name }) {
  return ICONS[name] ?? ICONS.box
}

// HTML içinde (mobil zincir) kullanmak için 28px'lik SVG kabı.
export function NodeIconSvg({ name }) {
  return (
    <svg width="28" height="28" viewBox="-14 -14 28 28" aria-hidden="true">
      <NodeIcon name={name} />
    </svg>
  )
}
