import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { authPageCls, authCardCls, authSubmitCls } from '../lib/authStyles'
import { APP_NAME, KRATOS_URL } from '../lib/app'
import assayMark from '../assets/assay-mark.svg'

/*
  Kratos'un hata sayfası (selfservice.flows.error.ui_url → /error?id=…).
  Tarayıcı akışında Kratos bir hatayla karşılaşınca kullanıcıyı buraya yollar.
  Ayrıntı Kratos'tan okunur; kullanıcıya sade mesaj + "Girişe dön" gösterilir, teknik kod küçük yazılır.
*/
export default function AuthError() {
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const [detail, setDetail] = useState(null)
  const id = searchParams.get('id')

  useEffect(() => {
    if (!id) return
    fetch(`${KRATOS_URL}/self-service/errors?id=${encodeURIComponent(id)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setDetail(body?.error ?? null))
      .catch(() => setDetail(null))
  }, [id])

  return (
    <div className={authPageCls}>
      <div className={authCardCls}>
        <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block self-start rounded-sm hover:opacity-70">
          <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
        </Link>
        <h1 className="mt-6 text-head font-bold text-foreground md:mt-4">{t('auth.errorTitle')}</h1>
        <p className="mt-2 text-ui text-muted-foreground">{t('auth.errorBody')}</p>

        {detail && (
          <p className="mt-4 rounded-md bg-secondary px-3 py-2 font-mono text-micro text-muted-foreground">
            {detail.code} · {detail.reason || detail.message}
          </p>
        )}

        <div className="flex-1 md:hidden" />
        <div className="mt-6 flex flex-col gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0">
          <Link to="/login" reloadDocument className={`${authSubmitCls} block text-center`}>{t('auth.errorBack')}</Link>
          <Link to="/landing" className="text-center text-ui text-muted-foreground underline underline-offset-4 hover:text-foreground md:text-left">
            {t('auth.errorHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
