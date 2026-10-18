/*
  "Şifre bu sekmede az önce doğrulandı, kod bekleniyor" işareti.
  sessionStorage yalnız bu sekme açıkken yaşar: sekme kapanınca işaret de gider.
  Kod adımına işaretsiz (ya da 10 dk'dan eski işaretle) gelinirse yarım kalmış AAL1 oturum kapatılır,
  kullanıcı şifreden başlar — saatler sonra şifre sorulmadan kod ekranına düşmesin diye.
  Depo kullanılamazsa (gizli mod kısıtı vb.) işaret "yok" sayılır: güvenli taraf yeniden şifre sormaktır.
*/
const KEY = 'assay.otpPending'
const MAX_AGE_MS = 10 * 60 * 1000 // Kratos login akışı ömrüyle aynı

export function markOtpPending() {
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* depo yok: işaret tutulmaz */ }
}

export function clearOtpPending() {
  try { sessionStorage.removeItem(KEY) } catch { /* depo yok: silinecek işaret de yok */ }
}

export function isOtpPendingFresh() {
  try {
    const at = Number(sessionStorage.getItem(KEY))
    return at > 0 && Date.now() - at < MAX_AGE_MS
  } catch {
    return false
  }
}
