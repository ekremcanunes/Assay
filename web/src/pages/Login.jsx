import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidEmail, kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls } from '../lib/authStyles'
import { APP_NAME, KRATOS_URL } from '../lib/app'
import assayMark from '../assets/assay-mark.svg'
import { Eye, EyeOff } from 'lucide-react'
import AuthVisual from '../components/AuthVisual'
import CodeStep from '../components/CodeStep'

const csrfOf = (flow) => flow?.ui?.nodes?.find((n) => n.attributes?.name === 'csrf_token')?.attributes?.value

// Kratos akışına JSON gönderir; tarayıcı akışı olduğu için cookie (oturum + CSRF) her istekte gider.
const postFlow = async (flowId, payload) => {
  const res = await fetch(`${KRATOS_URL}/self-service/login?flow=${flowId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  return { ok: res.ok, body: await res.json() }
}

export default function Login() {
  const [flow, setFlow] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [fieldErr, setFieldErr] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 2. adım (e-posta kodu). Kratos v1.2 zorunluluğu kendisi uygulamıyor; backend 403 aal2_required döner (KratosMiddleware).
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(() => (searchParams.get('aal2') ? 'otp' : 'password'))
  const [otpFlow, setOtpFlow] = useState(null)
  const [otpEmail, setOtpEmail] = useState('')
  const [code, setCode] = useState('')
  const [mascot, setMascot] = useState('idle')
  const [sentAt, setSentAt] = useState(null)
  const [shake, setShake] = useState(0)

  const navigate = useNavigate()
  const { session, loading: sessionLoading, setSession, logout } = useAuth()
  const { t } = useLanguage()

  // Kod adımı: AAL2 akışını aç, kodu e-postaya gönder. Gönderim sürerken maskot 'idle', kutular kilitli.
  // İlk state güncellemesi await'ten sonra: effect'ten çağrıldığında zincirleme render olmasın.
  const sendOtp = async (address) => {
    const res = await fetch(`${KRATOS_URL}/self-service/login/browser?aal=aal2&via=email`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    const f = await res.json()
    setOtpEmail(address)
    if (!res.ok) return setError(kratosErrorText(f, t))
    // Kod gönderildiğinde Kratos 400 + güncel akış döner (mesaj 1010014); hata değil, beklenen durum.
    const { body } = await postFlow(f.id, { method: 'code', identifier: address, csrf_token: csrfOf(f) })
    if (body?.ui) setOtpFlow(body)
    if (body?.ui?.messages?.some((m) => m.id === 1010014)) {
      setMascot('open')
      setSentAt(Date.now())
    } else {
      setError(kratosErrorText(body, t))
    }
  }

  useEffect(() => {
    // Panelden 403 aal2_required ile gelindi: şifre adımı geçilmiş, oturum AAL1. Doğrudan kod adımına geç.
    if (searchParams.get('aal2')) {
      if (sessionLoading) return
      const address = session?.identity?.traits?.email
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sendOtp'taki tüm setState'ler await'ten sonra
      if (address) sendOtp(address)
      else window.location.replace(`${KRATOS_URL}/self-service/login/browser`)
      return
    }
    const flowId = searchParams.get('flow')
    if (flowId) {
      fetch(`${KRATOS_URL}/self-service/login/flows?id=${flowId}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
        .then((res) => res.json())
        .then(setFlow)
    } else {
      window.location.replace(`${KRATOS_URL}/self-service/login/browser`)
    }
  }, [searchParams, sessionLoading]) // eslint-disable-line react-hooks/exhaustive-deps -- sendOtp her render'da yeni; yalnızca URL/oturum yüklenince çalışmalı

  const validate = () => {
    const e = {}
    if (!email) e.email = t('auth.errEmailRequired')
    else if (!isValidEmail(email)) e.email = t('auth.errEmailInvalid')
    if (!password) e.password = t('auth.errPasswordRequired')
    setFieldErr(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const { ok, body } = await postFlow(flow.id, { method: 'password', identifier: email, password, csrf_token: csrfOf(flow) })
      if (!ok) return setError(kratosErrorText(body, t))
      setSession(body)
      const options = await fetch('/api/auth/options').then((r) => (r.ok ? r.json() : null)).catch(() => null)
      if (options?.mfaRequired && options.channels?.email) {
        setStep('otp')
        return sendOtp(email)
      }
      navigate('/overview')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (value = code) => {
    if (value.length !== 6 || !otpFlow) return
    setError(null)
    setLoading(true)
    try {
      const { ok, body } = await postFlow(otpFlow.id, { method: 'code', code: value, identifier: otpEmail, csrf_token: csrfOf(otpFlow) })
      if (ok) {
        setMascot('done')
        setSession(body)
        setTimeout(() => navigate('/overview'), 650)
        return
      }
      if (body?.ui) setOtpFlow(body)
      setCode('')
      setShake((n) => n + 1)
      setError(kratosErrorText(body, t))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!otpFlow) return
    setError(null)
    setCode('')
    const { body } = await postFlow(otpFlow.id, { method: 'code', identifier: otpEmail, resend: 'code', csrf_token: csrfOf(otpFlow) })
    if (body?.ui) setOtpFlow(body)
    if (body?.ui?.messages?.some((m) => m.id === 1010014)) setSentAt(Date.now())
    else setError(kratosErrorText(body, t))
  }

  if (!flow && step === 'password') {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  return (
    <div className="paper flex min-h-screen items-center bg-background p-6 md:p-12">
      <div className="edge-accent relative z-10 w-full max-w-[360px] overflow-hidden rounded-r-lg border border-l-0 border-border bg-card p-7">
        {step === 'password' ? (
          <div key="password">
            <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block rounded-sm hover:opacity-70">
              <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
            </Link>
            <h1 className="mt-4 text-head font-bold text-foreground">{t('auth.signIn')}</h1>
            <p className="mt-1 text-ui text-muted-foreground">{APP_NAME} — {t('auth.signInSubtitle')}</p>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-1" noValidate>
              <label className={authLabelCls} htmlFor="login-email">{t('auth.email')}</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={authInputCls}
              />
              {fieldErr.email && <p className="mt-1 text-micro text-down">{fieldErr.email}</p>}

              <label className={authLabelCls} htmlFor="login-password">{t('auth.password')}</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${authInputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErr.password && <p className="mt-1 text-micro text-down">{fieldErr.password}</p>}

              <button type="submit" disabled={loading} className={authSubmitCls}>
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>

            <p className="mt-5 text-ui text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link to="/register" reloadDocument className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70">{t('auth.createOne')}</Link>
            </p>

            <p className="mt-4 border-t border-border pt-4">
              <Link to="/landing" className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
                <span aria-hidden="true">&larr;</span> {APP_NAME} nedir?
              </Link>
            </p>
          </div>
        ) : (
          <CodeStep
            key="otp"
            address={otpEmail}
            state={mascot}
            title={t('auth.otpTitle')}
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
                <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
                  <span aria-hidden="true">&larr;</span> {t('auth.otpOtherAccount')}
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
