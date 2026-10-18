import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidEmail, kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls, authPageCls, authCardCls, authDockCls } from '../lib/authStyles'
import { APP_NAME, KRATOS_URL } from '../lib/app'
import { csrfOf, browserFlowUrl, getFlow, submitFlow, classifyFlowError } from '../lib/kratosFlow'
import { markOtpPending, clearOtpPending, isOtpPendingFresh } from '../lib/otpPending'
import assayMark from '../assets/assay-mark.svg'
import AuthVisual from '../components/AuthVisual'
import PasswordToggle from '../components/PasswordToggle'
import CodeStep from '../components/CodeStep'

// Kullanılamayan akışta baştan başla: Kratos yeni ?flow= ile /login'e geri yollar.
const restartLogin = () => window.location.replace(browserFlowUrl('login'))

export default function Login() {
  const [flow, setFlow] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [fieldErr, setFieldErr] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 2. adım (e-posta kodu). Kratos v1.2 zorunluluğu kendisi uygulamıyor; backend 403 aal2_required döner (KratosMiddleware).
  // Kod adımına yalnız bu sekmede şifre az önce doğrulandıysa devam edilir; aksi halde yarım oturum kapatılır (otpPending).
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState(() => (searchParams.get('aal2') && isOtpPendingFresh() ? 'otp' : 'password'))
  const [otpFlow, setOtpFlow] = useState(null)
  const [otpEmail, setOtpEmail] = useState('')
  const [code, setCode] = useState('')
  const [mascot, setMascot] = useState('idle')
  const [sentAt, setSentAt] = useState(null)
  const [shake, setShake] = useState(0)

  const navigate = useNavigate()
  const { session, loading: sessionLoading, setSession, logout } = useAuth()
  const { t } = useLanguage()

  // Şifre akışı bozulduğunda ne yapılacağı (kararı lib/kratosFlow verir)
  const applyDecision = async (d) => {
    if (d.action === 'go_app') return navigate('/overview')
    if (d.action === 'redirect') return window.location.assign(d.url)
    if (d.action === 'use_flow') {
      // Süre doldu: Kratos'un verdiği yeni akışa geç; yazılan e-posta yerinde kalır
      const r = await getFlow('login', d.flowId)
      if (!r.flow) return restartLogin()
      setFlow(r.flow)
      setSearchParams({ flow: r.flow.id }, { replace: true })
      return setError(t('auth.errFlowExpired'))
    }
    return restartLogin()
  }

  // Kod adımı: AAL2 akışını aç, kodu e-postaya gönder. Gönderim sürerken maskot 'idle', kutular kilitli.
  // İlk state güncellemesi await'ten sonra: effect'ten çağrıldığında zincirleme render olmasın.
  const sendOtp = async (address) => {
    const res = await fetch(`${KRATOS_URL}/self-service/login/browser?aal=aal2&via=email`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    const f = await res.json().catch(() => null)
    setOtpEmail(address)
    if (!res.ok || !f?.id) {
      const d = classifyFlowError(res.status, f)
      if (d.action === 'go_app') return navigate('/overview') // oturum zaten AAL2
      clearOtpPending()
      return restartLogin()
    }
    // Kod gönderildiğinde Kratos 400 + güncel akış döner (mesaj 1010014); hata değil, beklenen durum.
    const { body } = await submitFlow('login', f.id, { method: 'code', identifier: address, csrf_token: csrfOf(f) })
    if (body?.ui) setOtpFlow(body)
    if (body?.ui?.messages?.some((m) => m.id === 1010014)) {
      setMascot('open')
      setSentAt(Date.now())
    } else {
      setError(kratosErrorText(body, t))
    }
  }

  useEffect(() => {
    // Panelden 403 aal2_required ile gelindi: oturum AAL1, şifre adımı geçilmiş.
    if (searchParams.get('aal2')) {
      if (sessionLoading) return
      const address = session?.identity?.traits?.email
      if (!address) return restartLogin()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sendOtp'taki tüm setState'ler await'ten sonra
      if (isOtpPendingFresh()) sendOtp(address)
      else logout() // şifre bu sekmede az önce girilmedi: yarım oturumu kapat, şifreden başlasın
      return
    }
    const flowId = searchParams.get('flow')
    if (!flowId) return restartLogin()
    if (flow?.id === flowId) return // süre dolunca geçilen yeni akış zaten yüklü
    // Hata gövdesi asla "akış" diye saklanmaz: okunamayan akışta karar uygulanır (çoğunlukla yeni akış)
    getFlow('login', flowId).then((r) => {
      if (r.flow) return setFlow(r.flow)
      return applyDecision(r.decision.action === 'show' ? { action: 'restart' } : r.decision)
    })
  }, [searchParams, sessionLoading]) // eslint-disable-line react-hooks/exhaustive-deps -- yalnızca URL/oturum yüklenince çalışmalı

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
      const { ok, status, body } = await submitFlow('login', flow.id, { method: 'password', identifier: email, password, csrf_token: csrfOf(flow) })
      if (!ok) {
        const d = classifyFlowError(status, body)
        if (d.action !== 'show') return applyDecision(d)
        if (body?.ui) setFlow(body) // güncel akış (yeni CSRF dahil) ile devam
        return setError(kratosErrorText(body, t))
      }
      setSession(body)
      const options = await fetch('/api/auth/options').then((r) => (r.ok ? r.json() : null)).catch(() => null)
      if (options?.mfaRequired && options.channels?.email) {
        markOtpPending()
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
      const { ok, status, body } = await submitFlow('login', otpFlow.id, { method: 'code', code: value, identifier: otpEmail, csrf_token: csrfOf(otpFlow) })
      if (ok) {
        clearOtpPending()
        setMascot('done')
        setSession(body)
        setTimeout(() => navigate('/overview'), 650)
        return
      }
      const d = classifyFlowError(status, body)
      if (d.action === 'go_app') return navigate('/overview')
      if (d.action !== 'show') {
        // Kod akışı kullanılamıyor (süre doldu vb.): yeni akış aç, yeni kod gönder
        setCode('')
        setError(t('auth.errFlowExpired'))
        return sendOtp(otpEmail)
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
    const { status, body } = await submitFlow('login', otpFlow.id, { method: 'code', identifier: otpEmail, resend: 'code', csrf_token: csrfOf(otpFlow) })
    if (body?.ui) setOtpFlow(body)
    if (body?.ui?.messages?.some((m) => m.id === 1010014)) return setSentAt(Date.now())
    if (classifyFlowError(status, body).action !== 'show') return sendOtp(otpEmail) // akış bitmiş: yenisini aç
    setError(kratosErrorText(body, t))
  }

  // Başka hesap: yarım oturumu kapat (işaret de silinir)
  const otherAccount = () => {
    clearOtpPending()
    logout()
  }

  if (!flow && step === 'password') {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  return (
    <div className={authPageCls}>
      <div className={authCardCls}>
        {step === 'password' ? (
          <div key="password" className="flex flex-1 flex-col">
            <div className="flex items-center justify-between">
              <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block rounded-sm hover:opacity-70">
                <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
              </Link>
              <Link to="/landing" className="py-2.5 text-ui text-muted-foreground hover:text-foreground md:hidden">
                <span aria-hidden="true">&larr;</span> {APP_NAME} nedir?
              </Link>
            </div>
            <h1 className="mt-6 text-head font-bold text-foreground md:mt-4">{t('auth.signIn')}</h1>
            <p className="mt-1 text-ui text-muted-foreground">{APP_NAME} — {t('auth.signInSubtitle')}</p>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-1 flex flex-1 flex-col" noValidate>
              <label className={authLabelCls} htmlFor="login-email">{t('auth.email')}</label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${authInputCls} pr-16`}
                />
                <PasswordToggle shown={showPass} onToggle={() => setShowPass((v) => !v)} />
              </div>
              {fieldErr.password && <p className="mt-1 text-micro text-down">{fieldErr.password}</p>}

              {/* mobilde buton ekranın altına iner */}
              <div className="flex-1 md:hidden" />
              <div className={authDockCls}>
                <button type="submit" disabled={loading} className={authSubmitCls}>
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </button>
                <p className="mt-3 text-center text-ui text-muted-foreground md:mt-5 md:text-left">
                  {t('auth.noAccount')}{' '}
                  <Link to="/register" reloadDocument className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70">{t('auth.createOne')}</Link>
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
                <button type="button" onClick={otherAccount} className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
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
