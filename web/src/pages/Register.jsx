import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidEmail, kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls, authPageCls, authCardCls, authDockCls } from '../lib/authStyles'
import { APP_NAME, KRATOS_URL } from '../lib/app'
import { toE164TR } from '../lib/phone'
import assayMark from '../assets/assay-mark.svg'
import AuthVisual from '../components/AuthVisual'
import PasswordToggle from '../components/PasswordToggle'
import CodeStep from '../components/CodeStep'
import { Checkbox } from '../components/ui/checkbox'

const EMPTY = { first: '', last: '', email: '', phone: '', password: '', consent: false }

const csrfOf = (flow) => flow?.ui?.nodes?.find((n) => n.attributes?.name === 'csrf_token')?.attributes?.value

// Kratos tarayıcı akışına JSON gönderir (cookie + CSRF).
const postFlow = async (kind, flowId, payload) => {
  const res = await fetch(`${KRATOS_URL}/self-service/${kind}?flow=${flowId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  return { ok: res.ok, body: await res.json() }
}

export default function Register() {
  const [flow, setFlow] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showPass, setShowPass] = useState(false)
  const [fieldErr, setFieldErr] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Kayıttan sonra e-posta doğrulaması: Kratos kodu kendisi gönderir, akışı continue_with'te verir.
  const [step, setStep] = useState('form')
  const [verifyFlow, setVerifyFlow] = useState(null)
  const [code, setCode] = useState('')
  const [mascot, setMascot] = useState('idle')
  const [sentAt, setSentAt] = useState(null)
  const [shake, setShake] = useState(0)

  const [searchParams] = useSearchParams()
  const { t } = useLanguage()

  useEffect(() => {
    const flowId = searchParams.get('flow')
    if (flowId) {
      fetch(`${KRATOS_URL}/self-service/registration/flows?id=${flowId}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
        .then((res) => res.json())
        .then(setFlow)
    } else {
      window.location.replace(`${KRATOS_URL}/self-service/registration/browser`)
    }
  }, [searchParams])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const validate = () => {
    const e = {}
    if (!form.first.trim()) e.first = t('auth.errRequired')
    if (!form.last.trim()) e.last = t('auth.errRequired')
    if (!form.email) e.email = t('auth.errEmailRequired')
    else if (!isValidEmail(form.email)) e.email = t('auth.errEmailInvalid')
    if (!toE164TR(form.phone)) e.phone = t('auth.errPhoneInvalid')
    if (!form.password) e.password = t('auth.errPasswordRequired')
    else if (form.password.length < 8) e.password = t('auth.errPasswordShort')
    if (!form.consent) e.consent = t('auth.errConsent')
    setFieldErr(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const { ok, body } = await postFlow('registration', flow.id, {
        method: 'password',
        password: form.password,
        csrf_token: csrfOf(flow),
        traits: {
          email: form.email.trim(),
          phone: toE164TR(form.phone),
          name: { first: form.first.trim(), last: form.last.trim() },
          consent: true,
        },
      })
      if (!ok) return setError(kratosErrorText(body, t))

      const next = body.continue_with?.find((c) => c.action === 'show_verification_ui')
      if (!next) return window.location.assign('/login') // doğrulama kapalı (AUTH_VERIFICATION_ENABLED=false)
      setStep('verify')
      const res = await fetch(`${KRATOS_URL}/self-service/verification/flows?id=${next.flow.id}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      setVerifyFlow(await res.json())
      setMascot('open')
      setSentAt(Date.now())
    } finally {
      setLoading(false)
    }
  }

  // Yanlış kodda Kratos 200 döner; sonucu state alanı söyler.
  const verify = async (value) => {
    if (value.length !== 6 || !verifyFlow) return
    setError(null)
    setLoading(true)
    try {
      const { body } = await postFlow('verification', verifyFlow.id, { method: 'code', code: value, csrf_token: csrfOf(verifyFlow) })
      if (body?.state === 'passed_challenge') return setMascot('done')
      if (body?.ui) setVerifyFlow(body)
      setCode('')
      setShake((n) => n + 1)
      setError(kratosErrorText(body, t))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!verifyFlow) return
    setError(null)
    setCode('')
    const { body } = await postFlow('verification', verifyFlow.id, { method: 'code', email: form.email.trim(), csrf_token: csrfOf(verifyFlow) })
    if (body?.ui) setVerifyFlow(body)
    if (body?.ui?.messages?.some((m) => m.id === 1080003)) setSentAt(Date.now())
    else setError(kratosErrorText(body, t))
  }

  if (!flow) {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  // prefix: alanın solunda sabit metin (telefonda "+90" — kullanıcı yalnız 10 haneyi yazar)
  const field = (key, type, label, placeholder = '', { autoComplete, inputMode, prefix } = {}) => (
    <div className="min-w-0">
      <label className={authLabelCls} htmlFor={`register-${key}`}>{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[16px] text-muted-foreground md:text-ui">{prefix}</span>
        )}
        <input
          id={`register-${key}`}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          value={form[key]}
          onChange={(e) => set(key)(e.target.value)}
          placeholder={placeholder}
          className={`${authInputCls} ${prefix ? 'pl-12 md:pl-11' : ''}`}
        />
      </div>
      {fieldErr[key] && <p className="mt-1 text-micro text-down">{fieldErr[key]}</p>}
    </div>
  )

  const passOk = form.password.length >= 8

  return (
    <div className={authPageCls}>
      <div className={authCardCls}>
        {step === 'form' ? (
          <div key="form" className="flex flex-1 flex-col">
            <div className="flex items-center justify-between">
              <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block rounded-sm hover:opacity-70">
                <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
              </Link>
              <Link to="/landing" className="py-2.5 text-ui text-muted-foreground hover:text-foreground md:hidden">
                <span aria-hidden="true">&larr;</span> {APP_NAME} nedir?
              </Link>
            </div>
            <h1 className="mt-6 text-head font-bold text-foreground md:mt-4">{t('auth.createAccount')}</h1>
            <p className="mt-1 text-ui text-muted-foreground">{APP_NAME} — {t('auth.createAccountSubtitle')}</p>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-1 flex flex-1 flex-col" noValidate>
              <div className="grid grid-cols-2 gap-3">
                {field('first', 'text', t('auth.firstName'), '', { autoComplete: 'given-name' })}
                {field('last', 'text', t('auth.lastName'), '', { autoComplete: 'family-name' })}
              </div>
              {field('email', 'email', t('auth.email'), 'you@example.com', { autoComplete: 'email', inputMode: 'email' })}
              {field('phone', 'tel', t('auth.phone'), '5XX XXX XX XX', { autoComplete: 'tel-national', inputMode: 'numeric', prefix: '+90' })}

              <label className={authLabelCls} htmlFor="register-password">{t('auth.password')}</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password')(e.target.value)}
                  placeholder="••••••••"
                  className={`${authInputCls} pr-16`}
                />
                <PasswordToggle shown={showPass} onToggle={() => setShowPass((v) => !v)} />
              </div>
              {fieldErr.password ? (
                <p className="mt-1 text-micro text-down">{fieldErr.password}</p>
              ) : (
                // Kural yazarken işaretlenir; gönderince hata metni bunun yerine geçer
                <p className={`mt-1.5 text-micro ${passOk ? 'text-up' : 'text-muted-foreground'}`}>
                  {passOk ? '✓' : '○'} {t('auth.passwordRule')}
                </p>
              )}

              <Checkbox
                id="register-consent"
                checked={form.consent}
                onCheckedChange={set('consent')}
                label={<span className="text-micro text-muted-foreground">{t('auth.consent')}</span>}
                className="mt-4 min-h-11 items-start py-1"
              />
              {fieldErr.consent && <p className="mt-1 text-micro text-down">{fieldErr.consent}</p>}

              <div className="flex-1 md:hidden" />
              <div className={authDockCls}>
                <button type="submit" disabled={loading} className={authSubmitCls}>
                  {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
                </button>
                <p className="mt-3 text-center text-ui text-muted-foreground md:mt-5 md:text-left">
                  {t('auth.alreadyHaveAccount')}{' '}
                  <Link to="/login" reloadDocument className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70">{t('auth.signIn')}</Link>
                </p>
              </div>
            </form>

            <p className="mt-4 hidden border-t border-border pt-4 md:block">
              <Link to="/landing" className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
                <span aria-hidden="true">&larr;</span> {APP_NAME} nedir?
              </Link>
            </p>
          </div>
        ) : (
          <CodeStep
            key="verify"
            address={form.email.trim()}
            state={mascot}
            title={t('auth.verifyTitle')}
            doneTitle={t('auth.otpVerified')}
            doneContent={
              <>
                <p className="mt-4 text-ui text-foreground">{t('auth.verifyDone')}</p>
                <Link to="/login" reloadDocument className={`${authSubmitCls} mt-6 block text-center`}>{t('auth.signIn')}</Link>
              </>
            }
            error={error}
            loading={loading}
            shake={shake}
            code={code}
            onCodeChange={(v) => { setCode(v); setError(null) }}
            onVerify={verify}
            onResend={resend}
            sentAt={sentAt}
          />
        )}
      </div>
      <AuthVisual />
    </div>
  )
}
