// TR cep numarasını E.164'e çevirir: "0532 123 45 67", "5321234567", "+90 532..." → "+905321234567".
// Geçersizse null döner. Şema yalnızca +905XXXXXXXXX biçimini kabul ediyor.
export function toE164TR(input) {
  const digits = input.replace(/[\s()-]/g, '')
  const m = digits.match(/^(?:\+?90|0)?(5\d{9})$/)
  return m ? `+90${m[1]}` : null
}
