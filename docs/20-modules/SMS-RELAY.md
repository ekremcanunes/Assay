# SMS Relay Modülü

Kratos'un gönderdiği SMS'leri (giriş kodu, telefon doğrulama kodu) karşılayıp günlük tavanı uygulayan ve SMS sağlayıcısına ileten ara katman. Sağlayıcıdan bağımsızdır: tek bir generic REST gönderici vardır, sağlayıcı değiştirmek yalnızca `.env` değerlerini değiştirmektir. `portfolio-service` içinde bir controller olarak yaşar; ayrı bir servis/container değildir.

Tasarım kararlarının tamamı: [OTP/2FA spec](../superpowers/specs/2026-09-29-otp-2fa-register-design.md) §7; generic gönderici ve kanal açma/kapama: [generic SMS spec](../superpowers/specs/2026-10-02-generic-sms-sender-design.md). Uygulama planı: [plan](../superpowers/plans/2026-09-29-otp-2fa-register.md) Görev 1 ve 6.

---

## 1. Neden var

Kratos SMS'i kendisi gönderemez; yalnızca "şu URL'e HTTP isteği at" diyebilir (`courier.channels`). Sağlayıcıya doğrudan gitmesi üç sebepten mümkün değil:

1. **Bütçe tavanı:** günde en fazla `SMS_DAILY_LIMIT` (varsayılan 16) SMS. Kratos'ta böyle bir ayar yok.
2. **Dev'de gerçek SMS yok:** dev'de SMS'ler Mailpit'e e-posta olarak düşer, bakiye harcanmaz.
3. **Kanal kapatma:** `SMS_ENABLED=false` ile SMS kanalı Kratos'a dokunmadan kapatılır.

---

## 2. Veri akışı

```
Kratos (courier)
   │  POST http://portfolio-service:5001/internal/sms
   │  X-Api-Key: <SMS_RELAY_API_KEY>
   │  { "to": "+905321234567", "message": "Assay giriş kodunuz: 482913", "type": "login_code_valid" }
   ▼
KratosMiddleware ── /internal/* → oturum kontrolü atlanır
   ▼
SmsRelayController
   ├─ 1. API anahtarı doğru mu?          hayır → 401
   ├─ 2. SMS kanalı açık mı?              hayır → 503 (sayaç artmaz)
   ├─ 3. Sayacı artır (SmsUsageCounter)   > DailyLimit → 429
   ├─ 4. HttpSmsSender.SendAsync          hata → sayacı geri al, 502
   └─ 5.                                  başarı → 200
            │
            └─ POST SMS_URL (şablondan JSON gövde, [SMS_AUTH_HEADER: SMS_AUTH_VALUE])
                 dev:  http://mailpit:8025/api/v1/send → Mailpit (localhost:8025)
                 prod: sağlayıcının REST adresi         → gerçek SMS
```

**Erişim:** `/internal/sms` internetten erişilemez. nginx yalnızca `/api/` ve `/.ory/`'yi backend'e iletir; Kratos relay'e Docker ağı içinden doğrudan gider. Docker ağı içinden gelen bir istek de `X-Api-Key` olmadan 401 alır.

**Asenkron gönderim:** Kratos SMS'i kuyruğa alıp arka planda gönderir. Relay 429 ya da 502 dönse bile kullanıcının ekranı "kod gönderildi" der. Bu yüzden frontend'deki SMS kod ekranı "SMS gelmezse başka yöntem seç" ipucunu her zaman gösterir.

---

## 3. İstek / yanıt sözleşmesi

**İstek:** `POST /internal/sms`

| Alan | Tip | Örnek | Kaynak |
|---|---|---|---|
| Header `X-Api-Key` | string | — | `SMS_RELAY_API_KEY` |
| `to` | string, E.164 | `+905321234567` | Kratos `ctx.recipient` |
| `message` | string | `Assay giriş kodunuz: 482913` | Kratos `ctx.body` (şablondan) |
| `type` | string | `login_code_valid`, `verification_code_valid` | Kratos `ctx.template_type` |

Gövdeyi Kratos tarafında `kratos/sms-body.jsonnet` üretir.

**Yanıt:**

| Kod | Anlamı | Sayaç |
|---|---|---|
| 200 | Gönderildi | +1 |
| 401 | API anahtarı eksik/yanlış, ya da `SMS_RELAY_API_KEY` hiç ayarlanmamış | değişmez |
| 503 | SMS kanalı kapalı (`SMS_ENABLED=false` ya da `SMS_URL` boş) | değişmez |
| 429 | Günlük tavan doldu | +1 (tavan zaten aşıldı, zararsız) |
| 502 | Sağlayıcı hata verdi | geri alınır |

---

## 4. Yapılandırma

| `.env` | Options alanı | Sır | Varsayılan | Açıklama |
|---|---|---|---|---|
| `SMS_RELAY_API_KEY` | `Sms.RelayApiKey` | Evet | (boş) | Boşsa relay her isteği reddeder. Üret: `openssl rand -hex 32` |
| `SMS_ENABLED` | `Sms.Enabled` | Hayır | `true` | `false` → relay 503, girişte SMS seçeneği yok |
| `SMS_DAILY_LIMIT` | `Sms.DailyLimit` | Hayır | `16` | Günlük tavan |
| `SMS_URL` | `Sms.Url` | Hayır | (boş) | Sağlayıcının gönderim adresi. Boş = SMS kanalı kapalı |
| `SMS_SENDER` | `Sms.Sender` | Hayır | (boş) | SMS başlığı; şablonda `{sender}` |
| `SMS_AUTH_HEADER` | `Sms.AuthHeader` | Hayır | (boş) | Kimlik doğrulama header adı. Boş = header eklenmez |
| `SMS_AUTH_VALUE` | `Sms.AuthValue` | Evet | (boş) | Header değeri: `Bearer <token>`, `Basic <base64(kullanıcı:şifre)>`… |
| `SMS_BODY_TEMPLATE` | `Sms.BodyTemplate` | Hayır | (boş) | JSON gövde şablonu. Yer tutucular: `{to}` (E.164, `+905…`), `{message}`, `{sender}` |
| `EMAIL_OTP_ENABLED` | `Auth.EmailOtpEnabled` | Hayır | `true` | `false` → girişte e-posta seçeneği gösterilmez |
| `AUTH_REQUIRED_AAL` | `Auth.RequiredAal` | Hayır | `highest_available` | Kratos'a da gider; zorunluluğu Kratos uygular |

Zincir: `.env` → `docker-compose.yml` (`Sms__Url=${SMS_URL}`) → .NET config (`__` bölüm ayracı) → `SmsOptions` / `AuthOptions`. Prod'da `.env` Secrets Manager'daki tek secret'tan (`assay/prod/env`) üretilir; anahtar eklemek maliyeti değiştirmez.

Aynı `SMS_RELAY_API_KEY` iki yere gider: portfolio-service (`Sms__RelayApiKey`) ve Kratos (`COURIER_CHANNELS_0_REQUEST_CONFIG_AUTH_CONFIG_VALUE`). İkisi farklıysa her SMS 401 alır.

Değişiklik sonrası `docker compose up -d` (restart **yetmez**). Prod'da değerler Secrets Manager'dadır; değiştir → deploy.

### Açılış kontrolleri

| Durum | Davranış |
|---|---|
| `SMS_ENABLED=true`, `SMS_URL` boş | Error log, servis açılır, SMS kanalı kapalı sayılır |
| SMS kanalı açık, şablon geçerli JSON değil | Servis **açılmaz** (`InvalidOperationException`) |
| 2FA zorunlu, SMS ve e-posta ikisi de kapalı | Error log, servis açılır; `/api/auth/options` 500 döner |

### Şu anki durum: SMS kapalı (2026-10-02)

SMS sağlayıcı entegrasyonu KEP gerektirdiği için ertelendi; 2FA ve doğrulama yalnızca e-postayla yapılır. Kod yerinde, `SMS_ENABLED` varsayılanı `false`.

SMS'i açmak **yalnızca `.env` değildir.** Telefon şu an kimlik şemasında doğrulanabilir adres değil; Kratos ona SMS gönderemez. Sırayla:

1. `kratos/identity.schema.json` → `phone` alanına `"ory.sh/kratos": { "credentials": { "password": { "identifier": true } }, "verification": { "via": "sms" } }` geri eklenir.
2. Sağlayıcı değerleri girilir (§6), `SMS_ENABLED=true`.
3. Frontend'de SMS yolları (OTP planı Görev 4–5 notları) eklenir.

### Hangi ayar neyi kapatır

| İstenen | Ayar |
|---|---|
| Sadece SMS kapalı, e-posta OTP açık | `SMS_ENABLED=false` |
| Sadece e-posta seçeneği kapalı | `EMAIL_OTP_ENABLED=false` (yalnızca arayüz, aşağıya bkz.) |
| Girişteki OTP adımı kapalı | `AUTH_REQUIRED_AAL=aal1` (Kratos, relay'e hiç istek gelmez) |
| Kayıttaki doğrulama kapalı | `AUTH_VERIFICATION_ENABLED=false` |

Kratos v1.2.0'da kanal başına ayar yoktur; `code` yöntemi tek parçadır ve kanalı frontend'in gönderdiği `via` değeri seçer. SMS kanalı gerçekten kapanır, çünkü SMS relay'den geçmek zorundadır. E-posta Kratos'tan doğrudan SMTP'ye gider; `EMAIL_OTP_ENABLED=false` yalnızca seçeneği gizler. Arayüzü atlayıp `via=email` isteğini elle atan biri yine e-postayla kod alabilir; bu 2FA'yı atlatmaz, kod kullanıcının kendi kutusuna gider.

### `GET /api/auth/options`

Frontend 2. adımda hangi seçenekleri göstereceğini buradan öğrenir. Oturum gerektirmez (`KratosMiddleware` atlar).

```json
200 { "mfaRequired": true, "channels": { "sms": true, "email": true } }
500 { "error": "auth_misconfigured", "message": "2FA zorunlu ama SMS ve e-posta kanallarinin ikisi de kapali. ..." }
```

---

## 5. Günlük sayaç

- Tablo: `SmsDailyUsage(Date PK, Count)` — portfolio DB (`DB_CONNECTION_STRING`).
- Gün Türkiye saatine göre: `DateTime.UtcNow.AddHours(3)` (Türkiye 2016'dan beri sabit UTC+3).
- Artırma tek SQL komutudur (upsert + `RETURNING`): aynı anda gelen iki istek tavanı delemez.

```sql
INSERT INTO "SmsDailyUsage" ("Date", "Count") VALUES (bugün, 1)
ON CONFLICT ("Date") DO UPDATE SET "Count" = "SmsDailyUsage"."Count" + 1
RETURNING "Count" AS "Value"
```

Kullanımı görmek:
```sql
SELECT * FROM "SmsDailyUsage" ORDER BY "Date" DESC LIMIT 14;
```

---

## 6. Sağlayıcı — `HttpSmsSender`

Tek gönderici; hiçbir sağlayıcının adını bilmez.

- Şablondaki `{to}`, `{message}`, `{sender}` değerlerin JSON-kaçışlanmış hâliyle tek geçişte değiştirilir.
- `POST SMS_URL`, `Content-Type: application/json`; `SMS_AUTH_HEADER` doluysa header eklenir.
- Başarı: HTTP 2xx. Gerisi exception → relay sayacı geri alır, 502.
- Zaman aşımı 10 sn.

### Dev: Mailpit

Mailpit'in HTTP API'si (`POST /api/v1/send`) kullanılır; dev, prod'un kod yolunu birebir çalıştırır. Şablon `.env.example`'da. SMS, `SMS +905…` konulu e-posta olarak `http://localhost:8025`'te görünür. Mailpit servisi yalnızca `docker-compose.override.yml`'de tanımlıdır; prod'da oluşmaz.

### Sağlayıcı değiştirmek

1. Sağlayıcının REST API dokümanından gönderim adresini, kimlik doğrulama biçimini ve JSON gövdesini bul.
2. Aşağıdaki sınırlara karşı kontrol et.
3. `SMS_URL`, `SMS_SENDER`, `SMS_AUTH_HEADER`, `SMS_AUTH_VALUE`, `SMS_BODY_TEMPLATE` değerlerini Secrets Manager'a gir → deploy.
4. Kendi numarana tek SMS ile dene.

Kod değişmez.

### Bilinen sınırlar

1. Form gövdesi (`application/x-www-form-urlencoded`, örn. Twilio) desteklenmez.
2. Hata durumunda HTTP 200 + gövdede hata kodu dönen sağlayıcıda hata yakalanmaz.
3. `{to}` her zaman E.164 (`+905…`); başka biçim isteyen sağlayıcı için yer tutucu yoktur.
4. Tek auth header vardır.

Bunlardan biri gerekirse `HttpSmsSender`'a küçük bir ekleme olarak gelir.

---

## 7. Loglama

[LOGGING.md](../10-standards/LOGGING.md) kuralına göre **telefon numarası ve OTP kodu loglanmaz**. Loglanan:

| Seviye | Mesaj |
|---|---|
| Information | `SMS gönderildi {TemplateType}` |
| Warning | `Günlük SMS tavanı doldu {Limit}` |
| Warning | `SMS kanalı kapalı, istek reddedildi {TemplateType}` |
| Error | `SMS sağlayıcısı hata döndü {TemplateType}` + exception |

---

## 8. Kod referansları

- `portfolio-service/Controllers/SmsRelayController.cs` — uç nokta, anahtar ve tavan kontrolü
- `portfolio-service/DTOs/SmsRelayRequest.cs` — istek gövdesi
- `portfolio-service/Models/SmsDailyUsage.cs` — sayaç tablosu
- `portfolio-service/Services/SmsUsageCounter.cs` — sayaç SQL'i
- `portfolio-service/Services/ISmsSender.cs` — gönderici sözleşmesi
- `portfolio-service/Services/HttpSmsSender.cs` — generic REST gönderici
- `portfolio-service/Services/SmsOptions.cs`, `AuthOptions.cs` — ayarlar ve kanal kuralları
- `portfolio-service/Controllers/AuthOptionsController.cs` — `GET /api/auth/options`
- `portfolio-service/Program.cs` — kayıtlar ve açılış kontrolleri
- `portfolio-service/Middleware/KratosMiddleware.cs` — `/internal/*` ve `/api/auth/options` istisnası
- `docker-compose.yml` — `Sms__*` ortam değişkenleri
- `docker-compose.override.yml` — `mailpit` servisi

---

## 9. Durum (2026-10-02)

| Parça | Durum |
|---|---|
| Relay kodu, generic gönderici, `/api/auth/options`, açılış kontrolleri | ✅ Yazıldı, build geçiyor; davranışlar geçici bir konsol projesiyle doğrulandı |
| `SmsDailyUsage` EF migration | ✅ Eklendi, açılışta `Migrate()` uygular |
| Kratos tarafı (`courier.channels`, `sms-body.jsonnet`, şablonlar) | ✅ Yazıldı (plan Görev 2), Kratos ile çalıştırılmadı |
| Docker ile uçtan uca deneme (Mailpit'e SMS, 401/429/503) | ⏳ Yapılmadı |
| Frontend'in `/api/auth/options` kullanımı | ⏳ Plan Görev 5 |
| Prod sağlayıcı seçimi ve değerleri | ⏳ Plan Görev 6 |
