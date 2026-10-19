import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls, authPageCls, authCardCls, authDockCls } from '../lib/authStyles'
import { APP_NAME } from '../lib/app'
import { csrfOf, browserFlowUrl, getFlow, submitFlow, classifyFlowError } from '../lib/kratosFlow'
import { markPasswordUpdated } from '../lib/passwordNotice'
import assayMark from '../assets/assay-mark.svg'
import AuthVisual from '../components/AuthVisual'
import PasswordToggle from '../components/PasswordToggle'

/*
  Yeni şifre (Kratos settings akışı, password yöntemi). Şimdilik yalnız şifremi unuttum akışının son adımı:
  recovery kodu doğrulanınca Kratos buraya ?flow= ile yollar. Kayıttan sonra bu oturum da kapatılır,
  kullanıcı yeni şifre + e-posta koduyla girer (spec §8-1). Diğer cihazları Kratos hook'u kapatır (kratos.yml).
*/

const goLogin = () => window.location.assign('/login')

export default function Settings() {
  const [flow, setFlow] = useState(null)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const { logout } = useAuth()
  const { t } = useLanguage()

  const email = flow?.identity?.traits?.email ?? ''
  const passOk = password.length >= 8

  // Settings akışı oturum ister: oturum yok/eskiyse Kratos ya yönlendirme verir ya da akışı açmaz → girişe dön.
  const applyDecision = async (d, body) => {
    if (d.action === 'redirect') return window.location.assign(d.url)
    if (body?.redirect_browser_to) return window.location.assign(body.redirect_browser_to)
    if (d.action === 'use_flow') {
      const r = await getFlow('settings', d.flowId)
      if (!r.flow) return goLogin()
      setFlow(r.flow)
      setSearchParams({ flow: r.flow.id }, { replace: true })
      return setError(t('auth.errFlowExpired'))
    }
    return goLogin()
  }

  useEffect(() => {
    const flowId = searchParams.get('flow')
    if (!flowId) return window.location.replace(browserFlowUrl('settings'))
    if (flow?.id === flowId) return // süre dolunca geçilen yeni akış zaten yüklü
    getFlow('settings', flowId).then((r) => {
      if (r.flow) return setFlow(r.flow)
      return applyDecision(r.decision.action === 'show' ? { action: 'restart' } : r.decision)
    })
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps -- yalnızca URL değişince çalışmalı

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!passOk) return

    setLoading(true)
    try {
      const { ok, status, body } = await submitFlow('settings', flow.id, { method: 'password', password, csrf_token: csrfOf(flow) })
      if (ok) {
        markPasswordUpdated()
        return logout() // Kratos çıkıştan sonra /login'e yollar; Login işareti görüp bilgi satırını gösterir
      }
      const d = classifyFlowError(status, body)
      if (d.action !== 'show') return applyDecision(d, body)
      if (body?.ui) setFlow(body) // güncel akış (yeni CSRF dahil) ile devam
      setError(kratosErrorText(body, t))
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
    <div className={authPageCls}>
      <div className={authCardCls}>
        <div className="flex flex-1 flex-col">
          <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block self-start rounded-sm hover:opacity-70">
            <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
          </Link>
          <h1 className="mt-6 text-head font-bold text-foreground md:mt-4">{t('auth.settingsTitle')}</h1>
          <p className="mt-1 font-mono text-ui text-muted-foreground">{email}</p>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-1 flex flex-1 flex-col" noValidate>
            {/* Şifre yöneticisi yeni şifreyi doğru hesaba kaydetsin */}
            <input type="email" autoComplete="username" value={email} readOnly hidden />

            <label className={authLabelCls} htmlFor="settings-password">{t('auth.newPassword')}</label>
            <div className="relative">
              <input
                id="settings-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${authInputCls} pr-16`}
              />
              <PasswordToggle shown={showPass} onToggle={() => setShowPass((v) => !v)} />
            </div>
            <p className={`mt-1.5 text-micro ${passOk ? 'text-up' : 'text-muted-foreground'}`}>
              {passOk ? '✓' : '○'} {t('auth.passwordRule')}
            </p>

            {/* mobilde buton ekranın altına iner */}
            <div className="flex-1 md:hidden" />
            <div className={authDockCls}>
              <button type="submit" disabled={loading || !passOk} className={authSubmitCls}>
                {loading ? t('auth.settingsSaving') : t('auth.settingsSave')}
              </button>
            </div>
          </form>
        </div>
      </div>
      <AuthVisual />
    </div>
  )
}
