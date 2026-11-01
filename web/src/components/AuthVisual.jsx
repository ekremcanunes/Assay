import { lazy, Suspense } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// Sahne ayrı chunk: mobilde hiç indirilmez, login'in ana paketine eklenmez.
const AuthVisualScene = lazy(() => import('./AuthVisualScene'))

export default function AuthVisual() {
  const isWide = useMediaQuery('(min-width: 64rem)')
  if (!isWide) return null
  return (
    <Suspense fallback={null}>
      <AuthVisualScene />
    </Suspense>
  )
}
