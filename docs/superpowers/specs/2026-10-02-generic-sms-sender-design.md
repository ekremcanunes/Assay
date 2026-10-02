# Generic SMS Gönderici — Tasarım

**Tarih:** 2026-10-02
**Kapsam:** portfolio-service SMS relay'inin sağlayıcıya gönderim katmanı.
**Değiştirdiği:** [OTP/2FA spec](2026-09-29-otp-2fa-register-design.md) §7 (sağlayıcı kısmı) ve §10 (yapılandırma tablosu); [plan](../plans/2026-09-29-otp-2fa-register.md) Görev 6.

---

## 1. Amaç

SMS sağlayıcısı zamanla değişebilir. Kod ve yapılandırma hiçbir sağlayıcının adını bilmemeli; sağlayıcı değiştirmek yalnızca `.env` değerlerini değiştirmek olmalı.

Sağlayıcıların büyük çoğunluğu REST/JSON API sunduğu için tek bir generic HTTP gönderici yeterlidir. İstek (adres, kimlik doğrulama header'ı, gövde) tamamen yapılandırmadan kurulur.

E-posta tarafında değişiklik yoktur: Kratos SMTP konuşur, sağlayıcı değiştirmek `COURIER_SMTP_CONNECTION_URI` değerini değiştirmektir.

## 2. Kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Gönderici sayısı | Tek: `HttpSmsSender` | Sağlayıcıların ~%90'ı REST. Sağlayıcı başına sınıf, adı koda sokar. |
| Sağlayıcı seçimi | Yok (`SMS_MODE`/`SMS_PROVIDER` kalkar) | Tek gönderici var; farkı değerler taşır. |
| Dev | Aynı gönderici → Mailpit HTTP API (`POST /api/v1/send`) | Dev, prod'un kod yolunu birebir çalıştırır. |
| Değerlerin yeri | Hepsi `.env`; prod'da tek secret `assay/prod/env` | Kullanıcı kararı. Secrets Manager secret başına ücretlendirir; aynı JSON'a anahtar eklemek maliyeti değiştirmez. |
| Adresler | Kodda sabit adres yok; `SMS_URL` | Kullanıcı tercihi. |
| Başarı kuralı | HTTP 2xx başarılı, gerisi hata | En sade kural; bkz. §6 sınırlar. |

## 3. Yapılandırma

`.env` (dev elle, prod `deploy.sh` ile Secrets Manager'dan):

| Değişken | Sır mı | Dev değeri | Açıklama |
|---|---|---|---|
| `SMS_RELAY_API_KEY` | Evet | rastgele | Kratos ↔ relay anahtarı (değişmez) |
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
- Sms__DailyLimit=${SMS_DAILY_LIMIT:-16}
- Sms__Url=${SMS_URL}
- Sms__Sender=${SMS_SENDER}
- Sms__AuthHeader=${SMS_AUTH_HEADER}
- Sms__AuthValue=${SMS_AUTH_VALUE}
- Sms__BodyTemplate=${SMS_BODY_TEMPLATE}
```
`Sms__Mode` satırı kaldırılır.

## 4. Kod

### 4.1 `SmsOptions`

```csharp
public class SmsOptions
{
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

### 4.2 `HttpSmsSender : ISmsSender`

- `{to}`, `{message}`, `{sender}` yer tutucularını değerin JSON-kaçışlanmış hâliyle değiştirir (tırnaksız; şablon tırnakları kendisi koyar). Kaçışlama: `JsonEncodedText.Encode(value).ToString()`.
- `SMS_URL`'e `POST`, `Content-Type: application/json`.
- `AuthHeader` doluysa `AuthHeader: AuthValue` header'ını ekler.
- 2xx dışı yanıtta exception fırlatır; mesajda yalnızca durum kodu bulunur. Controller'ın mevcut davranışı sürer: sayaç geri alınır, 502 döner.
- `HttpClient` zaman aşımı 10 sn (`AddHttpClient<ISmsSender, HttpSmsSender>` ile kayıt).
- Telefon, mesaj, gövde, auth değeri **loglanmaz** (`docs/10-standards/LOGGING.md`).

### 4.3 Açılış kontrolü (`Program.cs`)

Servis açılırken:
- `Sms:Url` boşsa → `InvalidOperationException`, servis açılmaz.
- `Sms:BodyTemplate` örnek değerlerle doldurulup `JsonDocument.Parse` edilir; parse edilemiyorsa → `InvalidOperationException`.

Bozuk yapılandırma ilk SMS'te değil, deploy anında görünür.

### 4.4 Kaldırılanlar

- `portfolio-service/Services/MailpitSmsSender.cs`
- `SmsOptions.Mode`, `SmsOptions.MailpitSmtp`
- `.env.example` → `SMS_MODE`

`ISmsSender`, `SmsRelayController`, `SmsUsageCounter`, Kratos tarafı değişmez.

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

## 7. Doğrulama

Proje otomatik test projesi içermez (OTP spec §12). Doğrulama:

1. `dotnet build` hatasız.
2. Dev: `docker compose up -d` → Kratos'tan bir SMS tetikle (OTP planı Görev 2 Adım 6) → Mailpit'te `SMS +905…` konulu mail, gövdede Türkçe mesaj.
3. Bozuk şablon (`SMS_BODY_TEMPLATE='{'`) → portfolio-service açılmaz, logda net hata.
4. `SMS_URL`'i erişilemeyen bir adrese çevir → relay 502, `SmsDailyUsage` sayacı artmamış.
5. Log çıktısında telefon numarası ve mesaj metni yok.

## 8. Doküman güncellemeleri

- `docs/20-modules/SMS-RELAY.md`: veri akışı ve yapılandırma bölümleri bu tasarıma göre; VatanSMS/SOAP anlatımı kaldırılır.
- OTP spec §10 tablosu: `Sms__Mode`, `Sms__MailpitSmtp`, `VatanSms__*` satırları yerine §3'teki değişkenler.
- OTP planı Görev 6: "VatanSMS göndericisi yaz" yerine "seçilen sağlayıcının değerlerini Secrets Manager'a gir, §6'ya karşı kontrol et, tek SMS ile dene".
- `.env.example`: §3'teki değişkenler ve açıklamaları.
