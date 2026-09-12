// Girilen fiyatın o günün gerçek fiyatından sapması ve karşılık gelen kademe.
// Eşikler spec §3'teki ölçüme dayanıyor: formülün gerçek piyasaya göre gürültü
// tabanı ~%0,5. Sessizlik eşiği %5 = gürültünün 10 katı.
export const DEVIATION_WARN = 0.05
export const DEVIATION_CONFIRM = 0.20

// tier: 'none'    → referans yok, gösterilecek bir şey yok
//       'info'    → sapma önemsiz, nötr bilgi göster
//       'warn'    → görünür uyarı, kayıt serbest
//       'confirm' → sert uyarı, göndermeden önce onay iste
export function deviationOf(entered, reference) {
  const e = Number(entered)
  const r = Number(reference)
  if (!Number.isFinite(e) || !Number.isFinite(r) || r <= 0 || e <= 0)
    return { ratio: null, tier: 'none' }

  const ratio = Math.abs(e - r) / r
  const tier = ratio >= DEVIATION_CONFIRM ? 'confirm'
    : ratio >= DEVIATION_WARN ? 'warn'
    : 'info'

  return { ratio, tier }
}
