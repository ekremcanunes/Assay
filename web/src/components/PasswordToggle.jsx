import { useLanguage } from '../contexts/LanguageContext'

// Şifre alanının içindeki "Göster / Gizle" — ikon yerine yazı: dokunma alanı büyük, ne yaptığı açık
export default function PasswordToggle({ shown, onToggle }) {
  const { t } = useLanguage()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
      className="absolute right-1 top-1/2 h-11 -translate-y-1/2 px-2.5 text-ui text-muted-foreground underline underline-offset-4 hover:text-foreground"
    >
      {shown ? t('auth.hide') : t('auth.show')}
    </button>
  )
}
