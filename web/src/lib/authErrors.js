// Basit e-posta format kontrolü
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Kratos yanıtındaki hata mesajını Türkçe'ye eşler (bilinen id'ler), yoksa orijinal/generic
export function kratosErrorText(body, t) {
  const msgs = [
    ...(body?.ui?.messages ?? []),
    ...((body?.ui?.nodes ?? []).flatMap((n) => n.messages ?? [])),
  ]
  const m = msgs.find((x) => x.type === 'error') ?? msgs[0]
  if (!m) return t('auth.errGeneric')

  switch (m.id) {
    case 4000006: // invalid credentials
      return t('auth.errInvalidCredentials')
    case 4000007: // account already exists
      return t('auth.errEmailExists')
    case 4000005: // password policy (too short vb.)
      return t('auth.errPasswordShort')
    default:
      return m.text || t('auth.errGeneric')
  }
}
