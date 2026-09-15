import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidEmail, kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls } from '../lib/authStyles'
import { APP_NAME } from '../lib/app'
import assayMark from '../assets/assay-mark.svg'
import { Eye, EyeOff } from 'lucide-react'
import AuthVisual from '../components/AuthVisual'

export default function Login() {
  const [flow, setFlow] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [fieldErr, setFieldErr] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const flowId = searchParams.get('flow')
    if (flowId) {
      fetch(`http://localhost:4433/self-service/login/flows?id=${flowId}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
        .then((res) => res.json())
        .then(setFlow)
    } else {
      window.location.href = 'http://localhost:4433/self-service/login/browser'
    }
  }, [searchParams])

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
    const csrfToken = flow?.ui?.nodes?.find((n) => n.attributes?.name === 'csrf_token')?.attributes?.value
    try {
      const res = await fetch(`http://localhost:4433/self-service/login?flow=${flow.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ method: 'password', identifier: email, password, csrf_token: csrfToken }),
      })
      const body = await res.json()
      if (res.ok) {
        setSession(body)
        navigate('/overview')
      } else {
        setError(kratosErrorText(body, t))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!flow) {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  return (
    <div className="paper flex min-h-screen items-center bg-background p-6 md:p-12">
      <div className="edge-accent relative z-10 w-full max-w-[360px] rounded-r-lg border border-l-0 border-border bg-card p-7">
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
          <Link to="/register" className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70">{t('auth.createOne')}</Link>
        </p>

        <p className="mt-4 border-t border-border pt-4">
          <Link to="/landing" className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
            <span aria-hidden="true">&larr;</span> {APP_NAME} nedir?
          </Link>
        </p>
      </div>
      <AuthVisual />
    </div>
  )
}
