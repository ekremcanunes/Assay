import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

const LENGTH = 6

// 6 haneli kod alanı. Mailden kopyalanan kod (boşluk/tire içerse bile) yapıştırılınca kutulara dağılır;
// mobilde one-time-code önerisi de aynı yoldan gelir. 6. hane dolunca onComplete çağrılır.
// shake: her artışta kutular sallanır (yanlış kod).
export default function OtpInput({ value, onChange, onComplete, disabled, invalid, shake = 0, label }) {
  const refs = useRef([])
  const groupRef = useRef(null)

  // Animasyonu yeniden başlatmak için sınıfı kaldırıp reflow sonrası geri ekliyoruz (state'siz, odak kaybolmaz).
  useEffect(() => {
    const el = groupRef.current
    if (!shake || !el) return
    el.classList.remove('otp-shake')
    void el.offsetWidth
    el.classList.add('otp-shake')
  }, [shake])

  useEffect(() => {
    if (!disabled) refs.current[Math.min(value.length, LENGTH - 1)]?.focus()
  }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps -- yalnızca kilit açılınca odakla

  const commit = (next) => {
    const code = next.slice(0, LENGTH)
    onChange(code)
    refs.current[Math.min(code.length, LENGTH - 1)]?.focus()
    if (code.length === LENGTH) onComplete?.(code)
  }

  // Bir kutuya birden fazla rakam gelirse (otomatik doldurma) o kutudan itibaren yerleştir.
  const handleChange = (i, raw) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    commit((value.slice(0, i) + digits).slice(0, LENGTH))
  }

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!digits) return
    e.preventDefault()
    commit(digits)
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const at = value[i] ? i : Math.max(i - 1, 0)
      onChange(value.slice(0, at))
      refs.current[at]?.focus()
    } else if (e.key === 'ArrowLeft') {
      refs.current[Math.max(i - 1, 0)]?.focus()
    } else if (e.key === 'ArrowRight') {
      refs.current[Math.min(i + 1, value.length, LENGTH - 1)]?.focus()
    }
  }

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={label}
      className="flex justify-between gap-2"
      onAnimationEnd={(e) => e.currentTarget.classList.remove('otp-shake')}
    >
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`${label} ${i + 1}`}
          className={cn(
            'tabular h-12 w-full min-w-0 rounded-none border-0 border-b bg-secondary text-center font-mono text-figure text-foreground',
            'focus:border-foreground focus:outline-none focus:shadow-[inset_0_0_0_2px_hsl(var(--foreground))] disabled:opacity-50',
            invalid ? 'border-destructive' : value[i] ? 'border-foreground' : 'border-input',
          )}
        />
      ))}
    </div>
  )
}
