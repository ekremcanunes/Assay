// Uygulama geneli bildirim (toast) deposu. Her yerden çağrılır: toast.success('…'), toast.error('…'), toast.info('…').
// React dışından da (ör. mutation onError) çağrılabilsin diye modül düzeyinde; <Toaster /> useSyncExternalStore ile okur.
export const DURATION_MS = 4000
const EXIT_MS = 180 // çıkış animasyonu süresi (index.css .toast-out ile aynı)
const MAX = 3

let items = []
let nextId = 1
const listeners = new Set()
const timers = new Map()

const emit = () => listeners.forEach((l) => l())

// Önce "çıkıyor" işaretlenir (animasyon), sonra listeden silinir.
export function dismiss(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  if (!items.some((t) => t.id === id && !t.leaving)) return
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t))
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, EXIT_MS)
}

// İmleç bildirimin üstündeyken süre durur; ayrılınca baştan başlar.
export function pause(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
}

export function resume(id) {
  pause(id)
  timers.set(id, setTimeout(() => dismiss(id), DURATION_MS))
}

function push(type, message) {
  if (!message) return
  const id = nextId++
  const overflow = items.filter((t) => !t.leaving).slice(0, -(MAX - 1))
  items = [...items, { id, type, message }]
  emit()
  overflow.forEach((t) => dismiss(t.id))
  resume(id)
}

export const toast = {
  success: (message) => push('success', message),
  error: (message) => push('error', message),
  info: (message) => push('info', message),
}

export const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSnapshot = () => items
