/*
  "Şifre az önce güncellendi" işareti: yeni şifre kaydedilince yazılır, çıkıştan sonra Login bir kez gösterip siler.
  sessionStorage yalnız bu sekme açıkken yaşar. Depo kullanılamazsa (gizli mod kısıtı vb.) işaret "yok" sayılır:
  en kötü durumda bilgi satırı görünmez, akış etkilenmez.
*/
const KEY = 'assay.passwordUpdated'

export function markPasswordUpdated() {
  try { sessionStorage.setItem(KEY, '1') } catch { /* depo yok: işaret tutulmaz */ }
}

export function hasPasswordUpdated() {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export function clearPasswordUpdated() {
  try { sessionStorage.removeItem(KEY) } catch { /* depo yok: silinecek işaret de yok */ }
}
