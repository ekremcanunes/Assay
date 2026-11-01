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
  browser: (
    <>
      <rect x="-11" y="-9" width="22" height="18" rx="3" {...S} />
      <path d="M-11-3h22" {...S} />
      <circle cx="-7" cy="-6" r="1" fill="currentColor" />
      <circle cx="-4" cy="-6" r="1" fill="currentColor" />
    </>
  ),
  cloud: <path d="M-8 6a5 5 0 0 1 0-10 7 7 0 0 1 13-2 5 5 0 0 1 3 12z" {...S} />,
  shield: (
    <>
      <path d="M0-10l9 3v6c0 6-4 9-9 11-5-2-9-5-9-11v-6z" {...S} />
      <path d="M-4 0l3 3 5-6" {...S} />
    </>
  ),
  db: (
    <>
      <ellipse cx="0" cy="-7" rx="9" ry="3" {...S} />
      <path d="M-9-7v14c0 2 4 3 9 3s9-1 9-3V-7M-9 0c0 2 4 3 9 3s9-1 9-3" {...S} />
    </>
  ),
  bolt: <path d="M2-11l-9 13h7l-2 9 9-13H0z" {...S} />,
  globe: (
    <>
      <circle r="10" {...S} />
      <path d="M-10 0h20M0-10c4 4 4 16 0 20M0-10c-4 4-4 16 0 20" {...S} />
    </>
  ),
  user: (
    <>
      <circle cx="0" cy="-4" r="4.5" {...S} />
      <path d="M-9 10c1-6 5-8 9-8s8 2 9 8" {...S} />
    </>
  ),
  clock: (
    <>
      <circle r="10" {...S} />
      <path d="M0-5v5l4 3" {...S} />
    </>
  ),
  log: (
    <>
      <rect x="-9" y="-10" width="18" height="20" rx="2" {...S} />
      <path d="M-5-5h10M-5 0h10M-5 5h6" {...S} />
    </>
  ),
  mail: (
    <>
      <rect x="-11" y="-8" width="22" height="16" rx="2" {...S} />
      <path d="M-11-6l11 8 11-8" {...S} />
    </>
  ),
  code: <path d="M-5-7l-6 7 6 7M5-7l6 7-6 7M2-10l-4 20" {...S} />,
  chart: <path d="M-10 9h20M-8 5l5-6 4 3 7-9" {...S} />,
  calc: (
    <>
      <rect x="-8" y="-10" width="16" height="20" rx="2" {...S} />
      <path d="M-5-6h10M-4 0h1M3 0h1M-4 5h1M3 5h1" {...S} />
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
