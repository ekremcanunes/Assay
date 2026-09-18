import { lazy, Suspense, useSyncExternalStore } from 'react'

// Sahne ayrı chunk: mobilde hiç indirilmez, login'in ana paketine eklenmez.
const AuthVisualScene = lazy(() => import('./AuthVisualScene'))

const wide = window.matchMedia('(min-width: 64rem)')
const subscribe = (cb) => {
  wide.addEventListener('change', cb)
  return () => wide.removeEventListener('change', cb)
}

export default function AuthVisual() {
  const isWide = useSyncExternalStore(subscribe, () => wide.matches)
  if (!isWide) return null
  return (
    <Suspense fallback={null}>
      <AuthVisualScene />
    </Suspense>
  )
}
