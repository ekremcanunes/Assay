# Generic SMS Gönderici — Tasarım

**Tarih:** 2026-10-02
**Kapsam:** portfolio-service SMS relay'inin sağlayıcıya gönderim katmanı; 2FA kanallarının (SMS, e-posta) `.env` ile açılıp kapatılması ve frontend'e bildirilmesi.
**Değiştirdiği:** [OTP/2FA spec](2026-09-29-otp-2fa-register-design.md) §7 (sağlayıcı kısmı) ve §10 (yapılandırma tablosu); [plan](../plans/2026-09-29-otp-2fa-register.md) Görev 6.

---

## 1. Amaç

SMS sağlayıcısı zamanla değişebilir. Kod ve yapılandırma hiçbir sağlayıcının adını bilmemeli; sağlayıcı değiştirmek yalnızca `.env` değerlerini değiştirmek olmalı.

Sağlayıcıların büyük çoğunluğu REST/JSON API sunduğu için tek bir generic HTTP gönderici yeterlidir. İstek (adres, kimlik doğrulama header'ı, gövde) tamamen yapılandırmadan kurulur.

E-posta tarafında değişiklik yoktur: Kratos SMTP konuşur, sağlayıcı değiştirmek `COURIER_SMTP_CONNECTION_URI` değerini değiştirmektir.

Ayrıca 2FA kanalları (SMS, e-posta) `.env` ile ayrı ayrı açılıp kapatılabilir; frontend hangi kanalların açık olduğunu bir uç noktadan öğrenir (§4.5). Değişiklik yeniden başlatmayla (`docker compose up -d`, prod'da deploy) uygulanır; çalışırken değiştirme kapsam dışıdır.

## 2. Kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Gönderici sayısı | Tek: `HttpSmsSender` | Sağlayıcıların ~%90'ı REST. Sağlayıcı başına sınıf, adı koda sokar. |
| Sağlayıcı seçimi | Yok (`SMS_MODE`/`SMS_PROVIDER` kalkar) | Tek gönderici var; farkı değerler taşır. |
| Dev | Aynı gönderici → Mailpit HTTP API (`POST /api/v1/send`) | Dev, prod'un kod yolunu birebir çalıştırır. |
| Değerlerin yeri | Hepsi `.env`; prod'da tek secret `assay/prod/env` | Kullanıcı kararı. Secrets Manager secret başına ücretlendirir; aynı JSON'a anahtar eklemek maliyeti değiştirmez. |
| Adresler | Kodda sabit adres yok; `SMS_URL` | Kullanıcı tercihi. |
| Başarı kuralı | HTTP 2xx başarılı, gerisi hata | En sade kural; bkz. §6 sınırlar. |
| Boş `SMS_URL` | Servis açılır, SMS kanalı kapalı sayılır | SMS ayarı yüzünden e-postayla giriş yapan kullanıcı servisi kaybetmemeli. |
| Kanal açma/kapama | `SMS_ENABLED`, `EMAIL_OTP_ENABLED` (`.env`) | Kratos v1.2.0'da kanal başına ayar yok; `code` yöntemi tek parça. Kanal seçimi frontend'in Kratos'a gönderdiği `via` değeriyle olur. |
| 2FA'yı tamamen kapatma | Mevcut `AUTH_REQUIRED_AAL=aal1` (Kratos uygular) | Zorunluluk Kratos'ta kalır; uygulama kodu 2FA kararı vermez. |
| İki kanal kapalı + 2FA zorunlu | `/api/auth/options` hata döner, açılışta hata loglanır | Kullanıcı kararı: yanlış ayar sessizce düzeltilmez, ayarı yapan düzeltir. |

## 3. Yapılandırma

`.env` (dev elle, prod `deploy.sh` ile Secrets Manager'dan):

| Değişken | Sır mı | Dev değeri | Açıklama |
|---|---|---|---|
| `SMS_RELAY_API_KEY` | Evet | rastgele | Kratos ↔ relay anahtarı (değişmez) |
| `SMS_ENABLED` | Hayır | `true` | `false` → relay SMS'leri reddeder, frontend SMS seçeneğini göstermez |
| `EMAIL_OTP_ENABLED` | Hayır | `true` | `false` → frontend e-posta seçeneğini göstermez (bkz. §6.5) |
| `AUTH_REQUIRED_AAL` | Hayır | `aal2` | Mevcut (OTP spec §10.1). Artık portfolio-service'e de verilir |
| `SMS_DAILY_LIMIT` | Hayır | `16` | Günlük tavan. `0` = SMS kapalı |
| `SMS_URL` | Hayır | `http://mailpit:8025/api/v1/send` | Sağlayıcının gönderim adresi |
| `SMS_SENDER` | Hayır | boş | SMS başlığı; şablonda `{sender}` |
| `SMS_AUTH_HEADER` | Hayır | boş | Kimlik doğrulama header adı (`Authorization`, `X-Api-Key`…). Boşsa header eklenmez |
| `SMS_AUTH_VALUE` | Evet | boş | Header değeri (`Bearer <token>`, `Basic <base64(kullanıcı:şifre)>`…) |
| `SMS_BODY_TEMPLATE` | Hayır | aşağıda | JSON gövde şablonu |

Dev şablonu (Mailpit):
```bash
SMS_BODY_TEMPLATE='{"From":{"Email":"sms@assay.local"},"To":[{"Email":"sms@assay.local"}],"Subject":"SMS {to}","Text":"{message}"}'
```

Değer tek tırnak içinde yazılır. `deploy.sh` değerleri zaten tek tırnakla yazar ve tek tırnak içeren değeri reddeder; JSON çift tırnak kullandığı için sorun yoktur.

`docker-compose.yml` → `portfolio-service.environment`:
```yaml
- Sms__RelayApiKey=${SMS_RELAY_API_KEY}
- Sms__Enabled=${SMS_ENABLED:-true}
- Sms__DailyLimit=${SMS_DAILY_LIMIT:-16}
- Sms__Url=${SMS_URL}
- Sms__Sender=${SMS_SENDER}
- Sms__AuthHeader=${SMS_AUTH_HEADER}
- Sms__AuthValue=${SMS_AUTH_VALUE}
- Sms__BodyTemplate=${SMS_BODY_TEMPLATE}
- Auth__RequiredAal=${AUTH_REQUIRED_AAL:-aal2}
- Auth__EmailOtpEnabled=${EMAIL_OTP_ENABLED:-true}
```
`Sms__Mode` satırı kaldırılır. `AUTH_REQUIRED_AAL` Kratos'a zaten veriliyor; aynı değer portfolio-service'e de gider, iki taraf tek kaynaktan okur.

## 4. Kod

### 4.1 `SmsOptions`

```csharp
public class SmsOptions
{
    public bool Enabled { get; set; } = true;
    public int DailyLimit { get; set; } = 16;
    public string RelayApiKey { get; set; } = "";
    public string Url { get; set; } = "";
    public string Sender { get; set; } = "";
    public string AuthHeader { get; set; } = "";
    public string AuthValue { get; set; } = "";
    public string BodyTemplate { get; set; } = "";
}
```
`Mode` ve `MailpitSmtp` kaldırılır.

SMS kanalının kullanılabilir olması: `Enabled && Url != ""`. Bu kural tek bir yerde (`SmsOptions` üzerinde bir property) tanımlanır; relay ve §4.5'teki uç nokta aynı kuralı kullanır.

`AuthOptions` (yeni, `Auth` bölümü):
```csharp
public class AuthOptions
{
    public string RequiredAal { get; set; } = "aal2";
    public bool EmailOtpEnabled { get; set; } = true;
}
```

### 4.2 `HttpSmsSender : ISmsSender`

- `{to}`, `{message}`, `{sender}` yer tutucularını değerin JSON-kaçışlanmış hâliyle değiştirir (tırnaksız; şablon tırnakları kendisi koyar). Kaçışlama: `JsonEncodedText.Encode(value).ToString()`.
- `SMS_URL`'e `POST`, `Content-Type: application/json`.
- `AuthHeader` doluysa `AuthHeader: AuthValue` header'ını ekler.
- 2xx dışı yanıtta exception fırlatır; mesajda yalnızca durum kodu bulunur. Controller'ın mevcut davranışı sürer: sayaç geri alınır, 502 döner.
- `HttpClient` zaman aşımı 10 sn (`AddHttpClient<ISmsSender, HttpSmsSender>` ile kayıt).
- Telefon, mesaj, gövde, auth değeri **loglanmaz** (`docs/10-standards/LOGGING.md`).

### 4.3 Açılış kontrolü (`Program.cs`)

Servis açılırken. Hiçbir durum servisi düşürmez, bozuk şablon hariç:

| Durum | Davranış |
|---|---|
| `Sms:Enabled=true`, `Sms:Url` boş | Error log: "SMS açık ama SMS_URL boş; SMS kanalı kapalı sayılıyor". Servis açılır. |
| SMS kanalı kullanılabilir (`Enabled` ve `Url` dolu), şablon geçerli JSON değil | `InvalidOperationException`, servis açılmaz. Şablon örnek değerlerle doldurulup `JsonDocument.Parse` edilir. Yazım hatasıdır, bilinçli kapatma değildir. |
| SMS kanalı kullanılamaz (`Enabled=false` ya da `Url` boş) | Şablon kontrol edilmez: SMS'i henüz yapılandırmamış ortam açılabilmeli. |
| 2FA zorunlu, iki kanal da kapalı | Error log (§4.5'teki mesaj). Servis açılır. |

### 4.4 Relay değişikliği ve kaldırılanlar

`SmsRelayController`: API anahtarı kontrolünden sonra, sayaç artırılmadan önce SMS kanalı kullanılabilir değilse **503** döner. Sayaç artmaz.

Kaldırılanlar:
- `portfolio-service/Services/MailpitSmsSender.cs`
- `SmsOptions.Mode`, `SmsOptions.MailpitSmtp`
- `.env.example` → `SMS_MODE`

`ISmsSender`, `SmsUsageCounter`, Kratos tarafı değişmez.

### 4.5 `GET /api/auth/options`

Frontend, şifre adımından sonra 2. adımda hangi seçenekleri göstereceğini buradan öğrenir.

- **Erişim:** Oturum gerektirmez. Bu noktada kullanıcının oturumu AAL1'dir ve Kratos `whoami` 403 döner; `KratosMiddleware` bu yolu `/internal` gibi atlar. Dönen bilgi hassas değildir.
- **Yanıt (200):**
  ```json
  { "mfaRequired": true, "channels": { "sms": true, "email": true } }
  ```
  - `mfaRequired`: `Auth:RequiredAal != "aal1"`.
  - `channels.sms`: SMS kanalı kullanılabilir mi (§4.1).
  - `channels.email`: `Auth:EmailOtpEnabled`.
- **Yanlış yapılandırma (500):** `mfaRequired` ve iki kanal da kapalıysa:
  ```json
  { "error": "auth_misconfigured",
    "message": "2FA zorunlu ama SMS ve e-posta kanallarinin ikisi de kapali. SMS_ENABLED veya EMAIL_OTP_ENABLED degerini acin ya da AUTH_REQUIRED_AAL=aal1 yapin." }
  ```
  Frontend kullanıcıya genel bir "giriş şu an yapılamıyor" mesajı gösterir; `message` alanı ayarı yapan kişi içindir (tarayıcı geliştirici araçlarında ve logda görünür). Değişken adlarının herkese açık yanıtta görünmesi bilinçli bir tercihtir: sır içermezler.
- Frontend tarafındaki kullanım OTP planı Görev 5'e (iki adımlı giriş) eklenir.

## 5. Veri akışı

```
Kratos courier ──POST /internal/sms {to,message,type}──▶ SmsRelayController
   ├─ API anahtarı / günlük tavan (değişmez)
   └─ HttpSmsSender
        ├─ şablon + {to},{message},{sender} → JSON gövde
        ├─ [AuthHeader: AuthValue]
        └─ POST SMS_URL
              dev:  http://mailpit:8025/api/v1/send  → Mailpit kutusu
              prod: sağlayıcının REST adresi          → gerçek SMS
```

## 6. Bilinen sınırlar (bilerek dışarıda)

İhtiyaç doğduğunda küçük eklemeler olarak gelir:

1. **Form gövdesi** (`application/x-www-form-urlencoded`, örn. Twilio) desteklenmez.
2. **200 + gövdede hata kodu** dönen sağlayıcılarda hata yakalanmaz; SMS gitmemiş olsa bile sayaç artar ve Kratos'a 200 dönülür.
3. **Numara biçimi:** `{to}` her zaman E.164 (`+905…`). `+`'sız ya da `0`'lı biçim isteyen sağlayıcı için ek yer tutucu yoktur.
4. **Birden fazla header** (örn. ayrı kullanıcı adı ve anahtar header'ları) desteklenmez; tek auth header vardır.

Sağlayıcı seçildiğinde API dokümanı bu dört maddeye karşı kontrol edilir.

5. **E-posta kanalını kapatmak yalnızca arayüzde gizlemektir.** E-posta Kratos'tan doğrudan SMTP'ye gider, arada bizim kodumuz yoktur. Arayüzü atlayıp Kratos'a `via=email` isteğini elle atan biri yine e-postayla kod alabilir. Bu 2FA'yı atlatmaz: kod kullanıcının kendi e-posta kutusuna gider. SMS kanalı ise gerçekten kapanır, çünkü SMS relay'den geçmek zorundadır.
6. **Ayarlar çalışırken değişmez.** Değişiklik yeniden başlatma gerektirir. İleride admin paneli bunu çalışırken yapmak isterse 2FA zorunluluğunun Kratos'tan uygulama koduna taşınması gerekir; bu ayrı bir tasarım konusudur.

## 7. Doğrulama

Proje otomatik test projesi içermez (OTP spec §12). Doğrulama:

1. `dotnet build` hatasız.
2. Dev: `docker compose up -d` → Kratos'tan bir SMS tetikle (OTP planı Görev 2 Adım 6) → Mailpit'te `SMS +905…` konulu mail, gövdede Türkçe mesaj.
3. Bozuk şablon (`SMS_BODY_TEMPLATE='{'`) → portfolio-service açılmaz, logda net hata.
4. `SMS_URL`'i erişilemeyen bir adrese çevir → relay 502, `SmsDailyUsage` sayacı artmamış.
5. Log çıktısında telefon numarası ve mesaj metni yok.
6. `SMS_URL` boş, `SMS_ENABLED=true` → servis açılır, logda Error satırı; `/api/auth/options` → `sms: false`; relay 503, sayaç artmamış.
7. `SMS_ENABLED=false` → `/api/auth/options` → `sms: false`.
8. `SMS_ENABLED=false`, `EMAIL_OTP_ENABLED=false`, `AUTH_REQUIRED_AAL=aal2` → `/api/auth/options` 500 `auth_misconfigured`; açılışta Error log.
9. Aynı ayarlarla `AUTH_REQUIRED_AAL=aal1` → `/api/auth/options` 200, `mfaRequired: false`.
10. Oturumsuz `curl http://localhost/api/auth/options` → 200 (middleware atlıyor). Diğer `/api/*` yolları oturumsuz hâlâ 401.

## 8. Doküman güncellemeleri

- `docs/20-modules/SMS-RELAY.md`: veri akışı ve yapılandırma bölümleri bu tasarıma göre; VatanSMS/SOAP anlatımı kaldırılır.
- OTP spec §10 tablosu: `Sms__Mode`, `Sms__MailpitSmtp`, `VatanSms__*` satırları yerine §3'teki değişkenler.
- OTP planı Görev 6: "VatanSMS göndericisi yaz" yerine "seçilen sağlayıcının değerlerini Secrets Manager'a gir, §6'ya karşı kontrol et, tek SMS ile dene".
- `.env.example`: §3'teki değişkenler ve açıklamaları.
- OTP spec §10.1 açma/kapama tablosu: `SMS_ENABLED`, `EMAIL_OTP_ENABLED` satırları.
- OTP planı Görev 5: 2. adım ekranı seçenekleri `/api/auth/options`'tan alır; 500 `auth_misconfigured`'da genel hata mesajı.
- `docs/30-operations/COMMANDS.md` "2FA / doğrulama nasıl kapatılır": kanal kapatma.
