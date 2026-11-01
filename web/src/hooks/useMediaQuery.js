import { useSyncExternalStore } from 'react'

// CSS medya sorgusunu canlı izler (ör. '(min-width: 64rem)' = Tailwind lg).
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches
  )
}
