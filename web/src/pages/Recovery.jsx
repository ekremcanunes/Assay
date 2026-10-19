import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidEmail, kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls, authPageCls, authCardCls, authDockCls } from '../lib/authStyles'
import { APP_NAME } from '../lib/app'
import { csrfOf, browserFlowUrl, getFlow, submitFlow, classifyFlowError } from '../lib/kratosFlow'
import assayMark from '../assets/assay-mark.svg'
import AuthVisual from '../components/AuthVisual'
import CodeStep from '../components/CodeStep'

/*
  Şifremi unuttum (Kratos recovery, code yöntemi): e-posta → kod → Kratos /settings?flow= ile yeni şifre sayfasına yollar.
  Kayıtlı olmayan adreste Kratos e-posta göndermez ama aynı "kod gönderildi" durumunu döner; sayfa ayrım yapmaz.
*/

// Kullanılamayan akışta baştan başla: Kratos yeni ?flow= ile /recovery'ye geri yollar.
const restartRecovery = () => window.location.replace(browserFlowUrl('recovery'))

// Kod adımındaki akış, adresi "tekrar gönder" düğümünde taşır; sayfa yenilenince adres buradan okunur.
const emailOf = (flow) => flow?.ui?.nodes?.find((n) => n.attributes?.name === 'email')?.attributes?.value ?? ''

export default function Recovery() {
  const [flow, setFlow] = useState(null)
  const [email, setEmail] = useState('')
  const [fieldErr, setFieldErr] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [mascot, setMascot] = useState('open')
  const [sentAt, setSentAt] = useState(null)
  const [shake, setShake] = useState(0)

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  // Kod adımı akışın durumundan çıkar; adres bilinmiyorsa (bozuk akış) e-posta adımında kalınır.
  const address = email || emailOf(flow)
  const step = flow?.state === 'sent_email' && address ? 'code' : 'email'

  // Akış bozulduğunda ne yapılacağı (kararı lib/kratosFlow verir)
  const applyDecision = async (d) => {
    if (d.action === 'go_app') return navigate('/overview')
    if (d.action === 'redirect') return window.location.assign(d.url)
    if (d.action === 'use_flow') {
      // Süre doldu: Kratos'un verdiği yeni akışa geç; yazılan e-posta yerinde kalır
      const r = await getFlow('recovery', d.flowId)
      if (!r.flow) return restartRecovery()
      setFlow(r.flow)
      setSearchParams({ flow: r.flow.id }, { replace: true })
      return setError(t('auth.errFlowExpired'))
    }
    return restartRecovery()
  }

  useEffect(() => {
    const flowId = searchParams.get('flow')
    if (!flowId) return restartRecovery()
    if (flow?.id === flowId) return // süre dolunca geçilen yeni akış zaten yüklü
    getFlow('recovery', flowId).then((r) => {
      if (r.flow) return setFlow(r.flow)
      return applyDecision(r.decision.action === 'show' ? { action: 'restart' } : r.decision)
    })
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps -- yalnızca URL değişince çalışmalı

  // Kodu gönderir (ilk gönderim ve "tekrar gönder" aynı çağrı). Başarıda akış "sent_email" durumuna geçer.
  const sendCode = async (address) => {
    const { ok, status, body } = await submitFlow('recovery', flow.id, { method: 'code', email: address, csrf_token: csrfOf(flow) })
    if (!ok) {
      const d = classifyFlowError(status, body)
      if (d.action !== 'show') return applyDecision(d)
    }
    if (body?.ui) setFlow(body)
    if (body?.state === 'sent_email') return setSentAt(Date.now())
    setError(kratosErrorText(body, t))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email) return setFieldErr(t('auth.errEmailRequired'))
    if (!isValidEmail(email)) return setFieldErr(t('auth.errEmailInvalid'))
    setFieldErr(null)

    setLoading(true)
    try {
      await sendCode(email.trim())
    } finally {
      setLoading(false)
    }
  }

  const verify = async (value = code) => {
    if (value.length !== 6 || !flow) return
    setError(null)
    setLoading(true)
    try {
      const { status, body } = await submitFlow('recovery', flow.id, { method: 'code', code: value, csrf_token: csrfOf(flow) })
      const d = classifyFlowError(status, body)
      // Doğru kod: Kratos 422 + redirect_browser_to (/settings?flow=) döner
      if (d.action === 'redirect') {
        setMascot('done')
        setTimeout(() => window.location.assign(d.url), 650)
        return
      }
      if (d.action !== 'show') {
        setCode('')
        return applyDecision(d)
      }
      if (body?.ui) setFlow(body)
      setCode('')
      setShake((n) => n + 1)
      setError(kratosErrorText(body, t))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setError(null)
    setCode('')
    await sendCode(address)
  }

  if (!flow) {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  return (
    <div className={authPageCls}>
      <div className={authCardCls}>
        {step === 'email' ? (
          <div key="email" className="flex flex-1 flex-col">
            <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block self-start rounded-sm hover:opacity-70">
              <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
            </Link>
            <h1 className="mt-6 text-head font-bold text-foreground md:mt-4">{t('auth.recoveryTitle')}</h1>
            <p className="mt-1 text-ui text-muted-foreground">{t('auth.recoverySubtitle')}</p>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-1 flex flex-1 flex-col" noValidate>
              <label className={authLabelCls} htmlFor="recovery-email">{t('auth.email')}</label>
              <input
                id="recovery-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={authInputCls}
              />
              {fieldErr && <p className="mt-1 text-micro text-down">{fieldErr}</p>}

              {/* mobilde buton ekranın altına iner */}
              <div className="flex-1 md:hidden" />
              <div className={authDockCls}>
                <button type="submit" disabled={loading} className={authSubmitCls}>
                  {loading ? t('auth.recoverySending') : t('auth.recoverySend')}
                </button>
                <p className="mt-3 text-center md:mt-5 md:text-left">
                  <Link to="/login" reloadDocument className="inline-flex items-center gap-1.5 py-2.5 text-ui text-muted-foreground hover:text-foreground">
                    <span aria-hidden="true">&larr;</span> {t('auth.errorBack')}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        ) : (
          <CodeStep
            key="code"
            address={address}
            state={mascot}
            title={t('auth.recoveryCodeTitle')}
            doneTitle={t('auth.otpVerified')}
            error={error}
            loading={loading}
            shake={shake}
            code={code}
            onCodeChange={(v) => { setCode(v); setError(null) }}
            onVerify={verify}
            onResend={resend}
            sentAt={sentAt}
            footer={
              <p className="mt-4 border-t border-border pt-4">
                <button type="button" onClick={restartRecovery} className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
                  <span aria-hidden="true">&larr;</span> {t('auth.recoveryOtherEmail')}
                </button>
              </p>
            }
          />
        )}
      </div>
      <AuthVisual />
    </div>
  )
}
