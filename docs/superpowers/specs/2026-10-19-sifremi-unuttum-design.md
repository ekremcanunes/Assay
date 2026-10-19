# Şifremi Unuttum — Spec

*Tarih: 2026-10-19 · Dal: `test`*

## 1. Amaç

Şifresini unutan kullanıcının bugün hesabına dönme yolu yok: girişte bağlantı yok, Kratos'ta recovery akışı kapalı, `/settings` sayfası yok. Hedef:

**Giriş → "Şifremi unuttum" → e-posta → e-postaya gelen kod → yeni şifre → uygulamaya giriş.**

Başarı ölçütü:
- Kullanıcı şifresini bilmeden, yalnız e-postasına erişerek yeni şifre belirleyip içeri girer.
- Kayıtlı olmayan bir e-posta yazıldığında ekran kayıtlı olanla aynı davranır (hesap varlığı sızmaz).
- Sayfalar giriş/kayıt ile aynı mobil ve masaüstü standardında (faz 2 §6, DESIGN.md).

## 2. Kapsam

| Var | Yok |
|---|---|
| Login'de "Şifremi unuttum?" bağlantısı | Giriş yapmışken menüden şifre değiştirme (settings sayfası yalnız bu akışın son adımı olarak kullanılır) |
| `/recovery` sayfası: e-posta → kod | Profil (ad, telefon) düzenleme |
| `/settings` sayfası: yalnız yeni şifre formu | Aktif oturumlar, yeni cihaz bildirimi (BACKLOG) |
| Kratos recovery ayarı + Türkçe `recovery_code` e-posta şablonu | SMS ile kurtarma (SMS kapalı) |

## 3. Kratos v1.2 davranışı (kaynak koddan doğrulandı)

1. Recovery `use: code` ile çalışır. `code` yöntemi zaten açık (`mfa_enabled`). Recovery bu ayardan bağımsızdır, mevcut 2FA'yı etkilemez.
2. Doğru kod girilince Kratos **AAL1** bir oturum açar (yöntem: recovery code), e-posta adresini doğrulanmış işaretler ve bir **settings akışı** oluşturur.
3. Bizde `feature_flags.use_continue_with_transitions` kapalı (varsayılan). Bu yüzden JSON isteğe doğru kodun cevabı **422 `browser_location_change_required`**, `redirect_browser_to` = `/settings?flow=<id>`. Mevcut `classifyFlowError` bunu zaten `redirect` kararına çeviriyor; ek kod gerekmez.
4. Kayıtlı olmayan adreste Kratos e-posta göndermez ama aynı "kod gönderildi" ekranını döner (`notify_unknown_recipients` varsayılan `false`, değiştirilmez).
5. Oturum yeni açıldığı için `privileged_session_max_age: 15m` engel çıkarmaz.

**Dev'de doğrulanacak (kaynakta kesinleşmedi):** settings akışı AAL1 recovery oturumunu kabul ediyor mu? `KratosMiddleware` yorumuna göre v1.2 e-posta kodunu "2FA yapabilen" kimlik bilgisi saymıyor; o halde `highest_available` = AAL1 ve settings açılır. Açılmazsa Kratos settings'te 403 + AAL2 yönlendirmesi döner; bu durumda §5.3'teki sıra tersine döner (önce kod, sonra şifre). Plan adımı bunu ilk iş olarak test eder.

## 4. Kratos ayarları

`kratos/kratos.yml`:

```yaml
selfservice:
  flows:
    recovery:
      enabled: true
      use: code
      ui_url: http://localhost/recovery
      lifespan: 15m                     # verification ile aynı
```

- `courier.templates.recovery_code.valid.email`: subject + html + plaintext, `kratos/templates/recovery_code/valid/` altında. Mevcut `verification_code` şablonlarıyla aynı sade biçim, değişken `{{ .RecoveryCode }}`.
- `docker-compose.yml`: `SELFSERVICE_FLOWS_RECOVERY_UI_URL: ${APP_URL:-http://localhost}/recovery` (diğer UI URL'leri gibi).
- `SELFSERVICE_FLOWS_SETTINGS_UI_URL` zaten tanımlı, değişmez.
- `selfservice.flows.settings.after.password.hooks: [revoke_active_sessions]` — şifre değişince diğer cihazlardaki oturumlar kapanır (§8-2).

## 5. Ekran akışı

### 5.1 Login — bağlantı

Şifre alanının altında, sağa yaslı **"Şifremi unuttum?"** metin bağlantısı → `/recovery` (`reloadDocument`, kayıt bağlantısıyla aynı: akış tarayıcı yönlendirmesiyle başlar). Mobilde 44px dokunma alanı.

### 5.2 `/recovery` — yeni sayfa (`pages/Recovery.jsx`)

İskelet Login ile aynı: `authPageCls`, `authCardCls`, `authDockCls`, `AuthVisual`.

**Adım 1 — e-posta**
- `?flow=` yoksa `browserFlowUrl('recovery')`'ye gidilir; varsa `getFlow('recovery', id)`. Bozuk akışta Login'deki `applyDecision` mantığı.
- Başlık "Şifreni sıfırla", alt metin "Hesabının e-posta adresini yaz, sıfırlama kodu gönderelim."
- Alan: e-posta (`autoComplete="email"`, `inputMode="email"`), mevcut `isValidEmail` doğrulaması.
- Gönder: `submitFlow('recovery', id, { method: 'code', email, csrf_token })`. Cevapta akış "kod gönderildi" durumuna geçer → adım 2.
- Altta "← Girişe dön" (`/login`, `reloadDocument`).

**Adım 2 — kod**
- Mevcut `CodeStep` bileşeni yeniden kullanılır (6 kutu, `one-time-code`, 6. hanede otomatik gönderim, 60 sn tekrar gönder sayacı).
- Başlık "Sıfırlama kodunu gir". Adres maskeli gösterilir (kayıtlı olmasa bile, §3.4).
- Gönder: `{ method: 'code', code, csrf_token }`. Doğru kod → 422 redirect → `window.location.assign('/settings?flow=…')`.
- Yanlış kod → mevcut sallanma + hata metni (`kratosErrorText`).
- Tekrar gönder: e-postayla yeniden gönderim (`{ method: 'code', email, csrf_token }`); Kratos'un recovery'de bunu nasıl karşıladığı dev'de doğrulanır.
- Footer: "← Farklı e-posta" (adım 1'e döner, yeni akış).

### 5.3 `/settings` — yeni sayfa (`pages/Settings.jsx`)

- Route korumalı alanın **dışında** (`/login`, `/recovery` yanında), çünkü `Layout` (menü, panel) gösterilmez ve oturum kontrolünü Kratos zaten yapar: oturumsuz gelinirse settings akışı açılmaz → `/login`.
- `?flow=` yoksa `browserFlowUrl('settings')`; varsa `getFlow('settings', id)`.
- Başlık "Yeni şifre belirle", alt metin kullanıcının e-postası (mono).
- Alan: yeni şifre (`autoComplete="new-password"`, `PasswordToggle`), altında Register'daki canlı kural "○/✓ En az 8 karakter". Şifre yöneticileri doğru kaydı güncellesin diye gizli `username` alanı (e-posta, `autoComplete="username"`).
- Tek alan, tekrar alanı yok (Register ile tutarlı; göster/gizle var).
- Gönder: `submitFlow('settings', id, { method: 'password', password, csrf_token })`. Kratos politika hataları (kısa, sızmış şifre listesinde) `kratosErrorText` ile gösterilir.
- Başarı sonrası (§8-1): bir kerelik "şifre güncellendi" işareti `sessionStorage`'a yazılır (`otpPending` deseni), ardından `logout()` ile bu oturum da kapatılır; Kratos çıkıştan sonra `/login`'e yollar. Login açılışta işareti okur, silip giriş formunun üstünde bilgi satırı gösterir: "Şifren güncellendi. Yeni şifrenle giriş yap." Kullanıcı yeni şifre + e-posta kodu ile normal girer. (İşaret URL parametresiyle taşınmaz: Login `?flow=` olmadan açılınca yeni akışa yönlenir ve parametre kaybolur.)
- Uzun süre sonra doğrudan `/settings` açılırsa Kratos yeniden kimlik doğrulama ister (403/redirect). Bu akış kapsam dışı; `classifyFlowError` kararı uygulanır (çoğunlukla `/login`).

## 6. Dokunulacak dosyalar

| Dosya | Değişiklik |
|---|---|
| `kratos/kratos.yml` | recovery akışı (§4) |
| `kratos/templates/recovery_code/valid/*` | yeni: subject, html, plaintext |
| `docker-compose.yml` | `SELFSERVICE_FLOWS_RECOVERY_UI_URL` |
| `web/src/pages/Login.jsx` | "Şifremi unuttum?" bağlantısı |
| `web/src/pages/Recovery.jsx` | yeni |
| `web/src/pages/Settings.jsx` | yeni |
| `web/src/App.jsx` | `/recovery`, `/settings` route'ları |
| `web/src/contexts/LanguageContext.jsx` | TR + EN metinler |
| `web/src/lib/authErrors.js` | recovery/settings'e özgü Kratos mesaj kimlikleri gerekiyorsa |

Backend (portfolio-service, market-service) ve nginx değişmez: `/.ory/self-service/` prod'da zaten `auth` hız sınırı bölgesinde.

## 7. Doğrulama

Faz 2 ile aynı yaklaşım (kalıcı test yok, kullanıcı kararı):
1. `npm run lint` + `npm run build` temiz.
2. Dev'de uçtan uca: kayıtlı e-posta → Mailpit'ten kod → yeni şifre → çıkış + "Şifren güncellendi" → yeni şifre + kodla içeri. Eski şifreyle giriş reddedilir. Akıştan önce ikinci bir tarayıcıda açılmış oturum, şifre değişince düşer (whoami 401).
3. Kayıtlı olmayan e-posta: aynı ekran, Mailpit'e e-posta düşmez.
4. Yanlış kod, süresi dolmuş akış (15 dk), tekrar gönder.
5. Geçici Playwright kontrolü: `/recovery` ve `/settings` üç cihaz boyutunda, yatay taşma yok (`scrollW === vw`), alanlar 16px; ekran görüntüleri kullanıcıya, sonra silinir.

## 8. Kararlar (kullanıcı, 2026-10-19)

1. **Yeni şifre kaydedilince oturum kapatılır**, kullanıcı "Şifren güncellendi" bilgisiyle `/login`'e döner ve yeni şifre + e-posta koduyla girer (§5.3). Elenen seçenek: doğrudan kod adımına geçmek (bir adım az, ama yeni şifre denenmemiş olurdu).
2. **Şifre değişince diğer cihazlardaki oturumlar kapatılır** (`revoke_active_sessions`, §4). Girişteki "otomatik çıkarma yok" kararından farklı durum: şifre sıfırlamanın tipik nedeni hesabın başkasının elinde olma şüphesi.

## 9. Bilinen risk

Herkes, kayıtlı bir adrese istediği kadar sıfırlama e-postası tetikleyebilir. Prod'da nginx `auth` hız sınırı IP başına sınırlıyor; Resend kotası (ücretsiz katman) ve kullanıcıyı rahatsız etme riski kalır. Bu iş kapsamında ek önlem yok; sorun görülürse BACKLOG.
