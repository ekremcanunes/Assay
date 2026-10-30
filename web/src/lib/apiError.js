// Sunucu hata cevabı { error: { code, message, params } } → kullanıcıya gösterilecek metin.
// Bilinen kod TR/EN çevrilir, params metindeki {yer tutucu}ları doldurur. Bilinmeyen kodda
// sunucunun (İngilizce, teşhis amaçlı) mesajı gösterilir.
const ERROR_KEYS = {
  INSTRUMENT_NOT_SUPPORTED: 'assets.instrumentNotSupported',
  INSTRUMENT_CHECK_UNAVAILABLE: 'assets.instrumentCheckUnavailable',
  CURRENCY_MISMATCH: 'assets.currencyMismatch',
  INSUFFICIENT_QUANTITY: 'assets.insufficientQuantity',
}

export function apiErrorMessage(err, t) {
  const error = err.response?.data?.error
  const key = ERROR_KEYS[error?.code]
  if (!key) return error?.message ?? err.message
  return Object.entries(error.params ?? {})
    .reduce((text, [name, value]) => text.replace(`{${name}}`, value), t(key))
}
