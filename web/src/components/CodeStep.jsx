import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { authSubmitCls } from '../lib/authStyles'
import OtpInput from './OtpInput'
import VerificationIcon from './VerificationIcon'

const RESEND_SECONDS = 60

// ab***@ornek.com — kodun gittiği adresi gösterirken tamamını açmayız.
const maskEmail = (email) => {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

// E-posta kodu adımı (giriş 2FA'sı ve kayıt doğrulaması ortak). Akış/Kratos bilgisi yok; yalnızca görünüm ve etkileşim.
// state: 'idle' (gönderiliyor) · 'open' (kod bekleniyor) · 'done' (doğrulandı)
// sentAt: son gönderim zamanı (Date.now()); tekrar gönder sayacı buradan hesaplanır.
export default function CodeStep({
  address, state, title, doneTitle, doneContent, error, loading, shake, code, onCodeChange, onVerify, onResend, sentAt, footer,
}) {
  const { t } = useLanguage()
  const [now, setNow] = useState(() => Date.now())
  // now, sentAt'ten eski olabilir (ilk tik gelmeden) → üstten de sınırla.
  const left = sentAt ? Math.min(RESEND_SECONDS, Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000))) : 0

  useEffect(() => {
    if (!sentAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [sentAt])

  const ready = state === 'open'

  return (
    <div className="step-in">
      <VerificationIcon state={state} />
      <h1 className="mt-3 text-head font-bold text-foreground">{state === 'done' ? doneTitle : title}</h1>
      <p className="mt-1 text-ui text-muted-foreground">
        {state === 'idle' ? (
          t('auth.otpSending')
        ) : (
          <>
            <span className="font-mono text-foreground">{maskEmail(address)}</span> {t('auth.otpSentTo')}
          </>
        )}
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
          {error}
        </div>
      )}

      {state === 'done' && doneContent ? (
        doneContent
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); onVerify(code) }} className="mt-6" noValidate>
            <OtpInput
              value={code}
              onChange={onCodeChange}
              onComplete={onVerify}
              disabled={loading || !ready}
              invalid={!!error}
              shake={shake}
              label={t('auth.otpCodeLabel')}
            />
            <p className="mt-2 text-micro text-muted-foreground">{t('auth.otpPasteHint')}</p>

            <button type="submit" disabled={loading || code.length !== 6 || !ready} className={authSubmitCls}>
              {loading && ready ? t('auth.otpVerifying') : t('auth.otpVerify')}
            </button>
          </form>

          <p className="mt-5 text-ui text-muted-foreground">
            {left > 0 ? (
              <>{t('auth.otpResendIn')} <span className="tabular font-mono">0:{String(left).padStart(2, '0')}</span></>
            ) : (
              <button type="button" onClick={onResend} disabled={!ready} className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70 disabled:opacity-50">
                {t('auth.otpResend')}
              </button>
            )}
          </p>
        </>
      )}

      {footer}
    </div>
  )
}
