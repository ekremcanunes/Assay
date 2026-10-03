# Backlog

Sonraya bırakılan işler. Her madde: sorun, neden önemli, seçenekler, öneri. İşe başlanınca maddeye tarih + dal yazılır, bitince silinir (karar kaydı gerekiyorsa ilgili modül dokümanına taşınır).

---

## Kayıtta hesap, e-posta kodu girilmeden oluşuyor

*Eklendi: 2026-10-04 · Bağlam: OTP/2FA işi (`feat/otp-2fa`)*

**Sorun.** "Hesap Oluştur"a basıldığı anda Kratos kimliği veritabanına yazar (`verified: false`), doğrulama kodunu sonra gönderir. Kullanıcı kodu girmeden sayfayı kapatırsa hesap yine de vardır. İstenen davranış: **kod girilmeden hesap olmamalı / kullanılamamalı.**

**Şu anki etkisi.** 2FA açıkken (`AUTH_REQUIRED_AAL` ≠ `aal1`) girişte e-postaya OTP gittiği için doğrulanmamış hesap panele pratikte giremez. Ama Kratos'ta adres `verified: false` kalır ve 2FA kapatılırsa doğrulanmamış hesap engelsiz girer.

**Seçenekler.**

| | Yaklaşım | Artı | Eksi |
|---|---|---|---|
| **A** | Kratos `require_verified_address` login hook'u: doğrulanmamış hesap şifre adımında reddedilir | Birkaç satır config; garantiyi Kratos verir | Doğrulanmamış satırlar DB'de birikir (isteğe bağlı periyodik temizlik) |
| **B** | Kratos kodla kayıt (`code` registration) | Hesap ancak koddan sonra oluşur | v1.2'de `passwordless_enabled` gerektirir; `mfa_enabled` ile aynı anda açılamaz → 2FA tasarımı ya da şifreli giriş değişir |
| **C** | Önce kod, sonra hesap — kendi backend'imiz: `portfolio-service` kodu gönderir, doğrulanınca Kratos admin API ile kimliği oluşturur | Tam istenen davranış, DB'de yarım satır yok | Kod üretme/saklama/süre/deneme sınırı/şifreyi geçici tutma bizde → en çok iş, en yüksek güvenlik riski |

**Öneri.** A — "kod girilmeden hesap kullanılamaz" garantisi Kratos'tan gelir. "DB'de hiç satır olmasın" şartsa C.

**İlgili.** Planın Görev 3'ü (backend `403 verification_required`) yapılmadı; A seçilirse gereksizleşir. Plan: `docs/superpowers/plans/2026-09-29-otp-2fa-register.md`.
