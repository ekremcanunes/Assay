# OTP / 2FA ve Genişletilmiş Kayıt — Spec

Girişe iki faktörlü doğrulama (şifre + SMS/e-posta kodu) eklenmesi ve kayıt formunun genişletilmesi. Bu doküman **kararları** ve **inşa kapsamını** tutar.

## 1. Amaç

Bugün Kratos'ta yalnızca `password` metodu açık, kimlik şemasında tek trait var (`email`). Bu yüzden login ve register aynı iki alanı topluyor, 2FA ve doğrulama yok.

Hedef:
- Her girişte gerçek 2FA: **telefon veya e-posta + şifre → OTP → içeride**.
- Kayıtta ad, soyad, telefon ve KVKK onayı toplanır. E-posta ve telefon doğrulanmadan panele girilmez.

## 2. Kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Giriş modeli | 1. faktör şifre (tanımlayıcı: telefon **veya** e-posta), 2. faktör `code` | Kratos'ta `code` ya 1. ya 2. faktör olabilir, ikisi birden değil (§3). "Tel + OTP ile şifresiz giriş" bu yüzden elendi |
| 2FA kanalı | SMS (varsayılan) + e-posta; kullanıcı seçer | SMS sağlayıcı çökerse, günlük tavan dolarsa kimse kilitlenmez |
| TOTP / passkey | Yok | Öğrenme projesinde authenticator uygulaması istenmiyor |
| Kullanıcı verisi | Kratos trait'lerinde (Neon, `identities.traits`). Uygulama DB'sine profil tablosu **eklenmez** | Alanlar kimlikle ilgili ve az |
| Mevcut kullanıcılar | Silinir, yeniden kayıt alınır | Az sayıda test kullanıcısı; geçiş kodu gereksiz |
| Doğrulama | E-posta + telefon, kayıttan hemen sonra | Başkasının numarası/e-postasıyla hesap açılmasın |
| SMS sağlayıcı | VatanSMS (vatansms.com), 2.500 SMS / 499 TL, süresiz | Netgsm'den ~%35 ucuz birim fiyat; Twilio'nun ~1/6'sı |
| Günlük SMS tavanı | **16** | 2.500 SMS en kötü durumda ~5 ay |
| SMS yolu | Kratos → **SMS relay** (portfolio-service controller) → VatanSMS | Tavan, dev'de gerçek SMS göndermeme ve XML dönüşümü Kratos'ta yapılamıyor |
| E-posta | Dev: Mailpit · Prod: Resend (ücretsiz katman), domain Cloudflare'de | Resend: DNS kaydı yeterli, SES sandbox başvurusu yok |
| Frontend | Sayfalar elle yazılır (mevcut desen), Kratos'tan CSRF + mesajlar okunur | VOLTAJ tasarımına tam uyum |
| Kratos sürümü | v1.2.0'da kalınır | CVE-2024-45042 yalnızca `passwordless_enabled` + 2FA birlikteyken; bizde passwordless kapalı |
| Açma/kapama | 2FA ve doğrulama, ortam başına `.env` anahtarıyla kapatılabilir (§10.1). Varsayılan: açık | Kod değişmeden, rebuild olmadan kapatılabilmeli. Kratos sabit test kodu ("1111") desteklemiyor; dev'de kodlar Mailpit'ten okunur |
| Testler | Bu işin kapsamı dışında, §12'de takip | Kullanıcı kararı: önce özellik, sonra test |

## 3. Kratos v1.2.0 kısıtları (kaynak koddan doğrulandı)

1. `selfservice.methods.code`: `passwordless_enabled` ve `mfa_enabled` aynı anda `true` olamaz (config şemasında `anyOf`).
2. AAL2 kod girişi `?aal=aal2&via=<trait>` ile başlatılır. `via` zorunlu. Gönderilen `identifier`, identity'nin bir `verifiable_address` değeriyle **birebir** eşleşmeli. Kratos UI'da adresin maskeli halini ipucu olarak döner.
3. 2FA kodu doğru girilince o adres **otomatik doğrulanmış** işaretlenir (`strategy_login.go`).
4. Doğrulama akışında elle kod yeniden isteme **yalnızca e-posta** destekler. Telefona doğrulama SMS'i sadece kayıt sonrası otomatik gider.
5. `require_verified_address` hook'u **en az bir** doğrulanmış adres arar, hepsini değil.
6. SMS HTTP kanalına giden Jsonnet `ctx`: `recipient`, `body`, `template_type`, `template_data`.
7. `courier.templates.{login_code,verification_code}.valid.sms` ile SMS metni özelleştirilebilir.
8. Şemada `credentials.code.via: "sms"` **desteklenmez** (`identity/extension_credentials.go`'da yorum satırı; şema doğrulaması hata verir). Gerek de yok: 2FA kodu `verifiable_addresses` üzerinden gider, oturum `code` yöntemi `mfa_enabled` iken AAL2 sayılır. Bu yüzden `code` işareti hiçbir trait'e konmaz.
9. `verification.via: sms` olan alanda `format` zorunlu (`tel`).
10. `required_aal: aal2` iken JSON şifre girişi 422 `browser_location_change_required` döner. Oturum çerezi (AAL1) verilir ama yanıtta identity **yoktur** (oltalamaya karşı). AAL2 akışı `Accept: application/json` ile AJAX olarak başlatılabilir; sayfa yönlendirmesi gerekmez.

## 4. Kimlik şeması — `kratos/identity.schema.json`

| Trait | Kural | Şifre tanımlayıcısı | Doğrulama (= 2FA kanalı, §3.8) |
|---|---|---|---|
| `email` | `format: email`, zorunlu | ✅ | `via: email` |
| `phone` | `format: tel`, `^\+905[0-9]{9}$`, zorunlu | ✅ | `via: sms` |
| `name.first`, `name.last` | string, 1–50 karakter, zorunlu | | |
| `consent` | `boolean`, `const: true`, zorunlu | | |

Telefon TR cep ile sınırlı; VatanSMS paketi yurt içi.

## 5. Kratos ayarları — `kratos/kratos.yml`

- `selfservice.methods.code`: `mfa_enabled: true`, `passwordless_enabled: false`, `config.lifespan: 10m`.
- `session.whoami.required_aal: aal2`. AAL1 oturumlar `whoami`'de 403 alır. İki backend servisi her istekte `whoami` çağırdığı için kural backend'de ek kodsuz uygulanır.
- `selfservice.flows.verification`: `enabled: true`, `use: code`, `ui_url: /verification`. Compose'a `SELFSERVICE_FLOWS_VERIFICATION_UI_URL` env override'ı eklenir.
- `selfservice.flows.registration.after.password.hooks`: `session` hook'u **kaldırılır**. Kayıttan sonra otomatik giriş yok; kullanıcı doğrulamaya gider.
- `require_verified_address` hook'u **kullanılmaz**. Env ile kapatılamıyor ve yalnızca "en az bir adres" arıyor (§3.5). Doğrulama kontrolü tamamen backend'de (§9).
- `courier.smtp.connection_uri` ve `from_address`: env'den (`COURIER_SMTP_CONNECTION_URI`, `COURIER_SMTP_FROM_ADDRESS`).
- `courier.channels`: `[{ id: sms, type: http, request_config: { url: http://portfolio-service:5001/internal/sms, method: POST, body: file:///etc/config/kratos/sms-body.jsonnet, auth: api_key (X-Api-Key) } }]`.
- `courier.templates`: `login_code.valid` ve `verification_code.valid` için Türkçe e-posta + SMS şablonları, `kratos/templates/` altında.

Yeni dosyalar: `kratos/sms-body.jsonnet` (`{ to: ctx.recipient, message: ctx.body, type: ctx.template_type }`), `kratos/templates/**`.

## 6. Ekran akışları

**Kayıt — `/register`** ([Register.jsx](../../../web/src/pages/Register.jsx))
1. Alanlar: Ad, Soyad, E-posta, Telefon (`+90` ön ekli), Şifre (göster/gizle), KVKK kutucuğu.
2. Telefon gönderilmeden önce E.164'e normalize edilir (`0532…`, `532…` → `+90532…`).
3. POST: `method: password`, `traits.*`, `password`, `csrf_token`.
4. Başarılı yanıttaki `continue_with` doğrulama akışı içeriyorsa `/verification`'a, içermiyorsa (doğrulama kapalı) `/login`'e gidilir.

**Doğrulama — `/verification`** (yeni `Verification.jsx`)
1. Sırayla e-posta kodu, sonra SMS kodu. Adres maskeli gösterilir.
2. E-posta için "kodu tekrar gönder" var. Telefon için yok (§3.4); telefon, girişteki SMS 2FA ile doğrulanır.
3. Bitince "Hesabın hazır" mesajıyla `/login`'e yönlendirilir.

**Giriş — `/login`** ([Login.jsx](../../../web/src/pages/Login.jsx), iki adım)
1. **Adım 1:** "Telefon veya e-posta" + şifre. Telefon biçimindeyse normalize edilir. Yanıt 422 `browser_location_change_required` ise adım 2'ye geçilir; 200 ise (2FA kapalı) doğrudan `/overview`.
2. **Adım 2:** "Kodu nereye gönderelim?" → [SMS] [E-posta]. Yanıtta identity olmadığı için (§3.10) hangi adresin doğrulanmamış olduğu burada bilinmez; iki seçenek de gösterilir.
3. Seçimle `/self-service/login/browser?aal=aal2&via=phone|email` AJAX ile açılır. Seçilen kanal adım 1'de yazılanla aynı türdeyse `identifier` otomatik doldurulur ve kod hemen istenir. Değilse kullanıcı, Kratos'un maskeli ipucuyla (`al•••@ornek.com`) o adresi yazar.
4. Kod girilir → AAL2 oturum → `/overview`. Telefon doğrulanmamış kullanıcı e-postayı seçtiyse backend 403 `verification_required` döner ve kullanıcı `/verification`'a gider; orada "SMS ile doğrula" ile telefonu doğrular.

**Oturum durumu** ([AuthContext.jsx](../../../web/src/contexts/AuthContext.jsx), [ProtectedRoute.jsx](../../../web/src/components/ProtectedRoute.jsx))
Frontend açma/kapama anahtarlarını bilmez; yalnızca Kratos ve backend yanıtlarına göre davranır:
- `whoami` 403 + `session_aal2_required` → login adım 2. (`AUTH_REQUIRED_AAL=aal1` iken bu yanıt hiç gelmez.)
- API 403 `verification_required` → `/verification` (e-posta) veya login adım 2 (telefon, yalnızca SMS). Hangi adresin eksik olduğu `whoami`'deki `verifiable_addresses`'tan okunur. (`AUTH_VERIFICATION_ENABLED=false` iken bu yanıt hiç gelmez.)

Yeni hata metinleri [authErrors.js](../../../web/src/lib/authErrors.js)'e, yeni metinler `LanguageContext` sözlüğüne (TR + EN) eklenir. Tasarım: [DESIGN.md](../../10-standards/DESIGN.md), mevcut `authStyles.js` sınıfları.

## 7. SMS relay — portfolio-service

- **Uç nokta:** `POST /internal/sms` (`SmsRelayController`). nginx yalnızca `/api/` ve `/.ory/`'yi backend'e ilettiği için dışarıdan erişilemez.
- **Koruma:** `X-Api-Key` header'ı `Sms:RelayApiKey` ile sabit zamanlı karşılaştırılır (`CryptographicOperations.FixedTimeEquals`). Uyuşmazsa 401.
- **Middleware muafiyeti:** `KratosMiddleware` `/internal/` ile başlayan yolları atlar.
- **Günlük sayaç:** `SmsDailyUsage(Date PK, Count)` tablosu, EF migration. Gün Europe/Istanbul saatine göre. Tek SQL ile artır + oku: `INSERT … ON CONFLICT ("Date") DO UPDATE SET "Count" = "Count" + 1 RETURNING "Count"`.
  - Sonuç > `Sms:DailyLimit` → **429**, gönderim yok.
  - Sağlayıcı hatası → sayaç 1 geri alınır, **502**. Kratos courier yeniden dener.
- **Gönderici (`ISmsSender`)**, `Sms:Mode` ile seçilir:
  - `Mailpit` (dev): SMS, Mailpit'e e-posta olarak gider. Konu: `SMS → +905321234567`, gövde: SMS metni. Mailpit bir log değil, yerel bir test arayüzü; numara tam gösterilir.
  - `VatanSms` (prod): vatansms.com SOAP servisi (`https://panel.vatansms.com/webservis/service.php`, işlem `TekSmsiBirdenCokNumarayaGonder`). Numara `5XXXXXXXXX` biçiminde, `tip=Turkce`, `ticari=0` (OTP ticari ileti değil).
- **Loglama** ([LOGGING.md](../../10-standards/LOGGING.md)): "SMS gönderildi {TemplateType}" (Information), "Günlük SMS tavanı doldu {Limit}" (Warning), sağlayıcı hatası (Error). Numara ve kod **loglanmaz**.

## 8. E-posta

- **Dev:** `docker-compose.override.yml`'a `mailpit` servisi (SMTP 1025, arayüz `localhost:8025`). Kratos: `smtp://mailpit:1025/?disable_starttls=true`. Var olmayan `mailslurper` referansı kalkar.
- **Prod:** Resend SMTP (`smtps://resend:<API_KEY>@smtp.resend.com:465`), gönderen `no-reply@<domain>`. Cloudflare'e Resend'in verdiği SPF/DKIM kayıtları eklenir.

## 9. Backend — `KratosMiddleware` (portfolio + market)

- `KratosIdentity` kaydına `verifiable_addresses` (`value`, `via`, `verified`) eklenir.
- `Auth:RequireVerifiedAddresses` `true` ise ve doğrulanmamış adres varsa **403** `{"error":"verification_required"}`. `false` ise kontrol atlanır.
- 2FA eksikliği için kod gerekmez; `whoami` zaten reddeder (mevcut davranış: 401).

## 10. Yapılandırma / secret'lar

| Değişken | Kim kullanır | Dev | Prod |
|---|---|---|---|
| `COURIER_SMTP_CONNECTION_URI`, `COURIER_SMTP_FROM_ADDRESS` | Kratos | Mailpit | Resend |
| SMS kanalı API anahtarı (Kratos tarafı) | Kratos | `.env` | Secrets Manager |
| `Sms__RelayApiKey` | portfolio-service | `.env` | Secrets Manager |
| `Sms__DailyLimit` | portfolio-service | 16 | 16 |
| `Sms__Mode` | portfolio-service | `Mailpit` | `VatanSms` |
| `Sms__MailpitSmtp` | portfolio-service | `mailpit:1025` | — |
| `VatanSms__*` (kullanıcı, şifre/anahtar, başlık) | portfolio-service | — | Secrets Manager |

Kratos'ta dizi içindeki ayarın env ile ezilme biçimi (`COURIER_CHANNELS_0_…`) plan aşamasında doğrulanır. Olmazsa kanal ayarı bütünüyle env'den verilir.

### 10.1 Açma/kapama anahtarları

`.env`'de iki değişken; `docker-compose.yml` bunları ilgili servislere dağıtır. Rebuild gerekmez; `up -d` env'i değişen container'ları aynı imajdan yeniden oluşturur. `docker compose restart` **yetmez**, çünkü env değerleri container oluşturulurken sabitlenir.

- **Dev/lab:** `.env`'i değiştir → `docker compose up -d`.
- **Prod:** `.env` her deploy'da Secrets Manager'dan yeniden üretilir (`deploy/scripts/deploy.sh`). Değeri **Secrets Manager'da** değiştir → EC2'de mevcut commit SHA'sıyla `IMAGE_TAG=<sha> ./deploy/scripts/deploy.sh`. Sunucudaki `.env`'i elle düzenlemek bir sonraki deploy'da ezilir.

Prosedür [COMMANDS.md](../../30-operations/COMMANDS.md)'ye "2FA / doğrulama nasıl kapatılır" başlığıyla eklenir.

| `.env` | Varsayılan | Kapalı değeri | Beslediği yerler |
|---|---|---|---|
| `AUTH_REQUIRED_AAL` | `aal2` | `aal1` | Kratos `SESSION_WHOAMI_REQUIRED_AAL` |
| `AUTH_VERIFICATION_ENABLED` | `true` | `false` | Kratos `SELFSERVICE_FLOWS_VERIFICATION_ENABLED`, portfolio + market `Auth__RequireVerifiedAddresses` |

Doğrulama kapalıyken kayıt olan kullanıcıların adresleri doğrulanmamış kalır. Anahtar tekrar açılırsa bu kullanıcılar e-postayı `/verification`'dan, telefonu girişteki SMS 2FA ile doğrular (§3.3).

## 11. Veri temizliği (bir kerelik, geri alınamaz)

Yeni şema deploy edilmeden önce, **ayrıca kullanıcı onayıyla**:
1. Tüm Kratos identity'leri Admin API ile silinir (`GET /admin/identities` → her biri için `DELETE /admin/identities/{id}`).
2. Neon'da `Assets` ve `Transactions` tabloları boşaltılır.

Komutlar [COMMANDS.md](../../30-operations/COMMANDS.md)'ye eklenir.

## 12. Kapsam dışı / sonraki işler

- **Testler (sıradaki iş):** `portfolio-service.Tests` (xUnit). Kapsam: relay'de API anahtarı, 17. SMS'in reddi, gönderici seçimi; middleware'de doğrulanmamış adres → 403. CI'a (`build-push.yml`) `dotnet test` adımı. Uçtan uca elle kontrol listesi: kayıt → 2 doğrulama → SMS ile giriş → e-posta ile giriş → tavan dolunca e-posta → yarım doğrulanmış kullanıcı.
- Şifre sıfırlama (recovery flow).
- Telefon/e-posta değiştirme (`/settings`).
- Kratos sürüm yükseltmesi.
- Kayıt limiti (Kratos webhook).

## 13. Doküman güncellemeleri

- [COMMANDS.md](../../30-operations/COMMANDS.md): Mailpit, veri temizliği, günlük SMS kullanımı sorgusu.
- [PIPELINE-SECURITY.md](../../10-standards/PIPELINE-SECURITY.md): "Şifre sıfırlama / e-posta doğrulama" satırı. Doğrulama çözüldü, recovery açık kalıyor.

## 14. Plan aşamasında netleşecekler

- VatanSMS SOAP `return` değerinin başarı/hata biçimi (ilk gerçek gönderimde).
- Kratos courier env override biçimi (§10) ve `SESSION_WHOAMI_REQUIRED_AAL` / `SELFSERVICE_FLOWS_VERIFICATION_ENABLED` env adlarının v1.2.0'da çalıştığı (§10.1).
