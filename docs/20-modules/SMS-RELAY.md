# SMS Relay Modülü

Kratos'un gönderdiği SMS'leri (giriş kodu, telefon doğrulama kodu) karşılayıp günlük tavanı uygulayan ve SMS sağlayıcısına ileten ara katman. `portfolio-service` içinde bir controller olarak yaşar; ayrı bir servis/container değildir.

Tasarım kararlarının tamamı: [OTP/2FA spec](../superpowers/specs/2026-09-29-otp-2fa-register-design.md) §7. Uygulama planı: [plan](../superpowers/plans/2026-09-29-otp-2fa-register.md) Görev 1 ve 6.

---

## 1. Neden var

Kratos SMS'i kendisi gönderemez; yalnızca "şu URL'e HTTP isteği at" diyebilir (`courier.channels`). Sağlayıcıya doğrudan gitmesi üç sebepten mümkün değil:

1. **Bütçe tavanı:** günde en fazla `SMS_DAILY_LIMIT` (varsayılan 16) SMS. Kratos'ta böyle bir ayar yok.
2. **Dev'de gerçek SMS yok:** dev'de SMS'ler Mailpit'e e-posta olarak düşer, bakiye harcanmaz.
3. **Format dönüşümü:** Kratos JSON gönderir, VatanSMS SOAP/XML bekler.

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
   ├─ 2. Sayacı artır (SmsUsageCounter)   > DailyLimit → 429
   ├─ 3. ISmsSender.SendAsync             hata → sayacı geri al, 502
   └─ 4.                                  başarı → 200
            │
            ├─ SMS_MODE=Mailpit  → MailpitSmsSender  → Mailpit (localhost:8025)
            └─ SMS_MODE=VatanSms → VatanSmsSender    → panel.vatansms.com (SOAP)
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
| 429 | Günlük tavan doldu | +1 (tavan zaten aşıldı, zararsız) |
| 502 | Sağlayıcı hata verdi | geri alınır |

---

## 4. Yapılandırma

| `.env` | `SmsOptions` alanı | Varsayılan | Açıklama |
|---|---|---|---|
| `SMS_MODE` | `Mode` | `Mailpit` | `Mailpit` (dev) · `VatanSms` (prod) |
| `SMS_DAILY_LIMIT` | `DailyLimit` | `16` | `0` = SMS tamamen kapalı, kodlar e-postayla alınır |
| `SMS_RELAY_API_KEY` | `RelayApiKey` | (boş) | Boşsa relay her isteği reddeder. Üret: `openssl rand -hex 32` |
| — | `MailpitSmtp` | `mailpit:1025` | Yalnızca dev |
| `VATANSMS_CUSTOMER_NO`, `VATANSMS_USERNAME`, `VATANSMS_PASSWORD`, `VATANSMS_SENDER` | `VatanSmsOptions` | (boş) | Yalnızca `SMS_MODE=VatanSms` |

Zincir: `.env` → `docker-compose.yml` (`Sms__DailyLimit=${SMS_DAILY_LIMIT:-16}`) → .NET config (`__` bölüm ayracı) → `SmsOptions`.

Aynı `SMS_RELAY_API_KEY` iki yere gider: portfolio-service (`Sms__RelayApiKey`) ve Kratos (`COURIER_CHANNELS_0_REQUEST_CONFIG_AUTH_CONFIG_VALUE`). İkisi farklıysa her SMS 401 alır.

Değişiklik sonrası `docker compose up -d` (restart **yetmez**). Prod'da değerler Secrets Manager'dadır; prosedür [COMMANDS.md](../30-operations/COMMANDS.md).

### Hangi ayar neyi kapatır

| İstenen | Ayar |
|---|---|
| Sadece SMS kapalı, e-posta OTP açık | `SMS_DAILY_LIMIT=0` |
| Girişteki OTP adımı kapalı | `AUTH_REQUIRED_AAL=aal1` (Kratos, relay'e hiç istek gelmez) |
| Kayıttaki doğrulama kapalı | `AUTH_VERIFICATION_ENABLED=false` |

Prod'da `SMS_MODE=Mailpit` **yapılmaz**: prod'da Mailpit yoktur, her SMS 502 ile düşer. SMS'i kesmenin doğru yolu `SMS_DAILY_LIMIT=0`.

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

## 6. Sağlayıcılar

### Mailpit (dev) — `MailpitSmsSender`

SMS'i Mailpit'e e-posta olarak gönderir. Konu: `SMS → <numara>`, gövde: SMS metni. Arayüz: `http://localhost:8025`. Mailpit servisi yalnızca `docker-compose.override.yml`'de tanımlıdır; prod'da oluşmaz.

### VatanSMS (prod) — `VatanSmsSender`

- Sağlayıcı: vatansms.com (bireysel hesap; 2.500 SMS / 499 TL, süresiz).
- Protokol: SOAP. Uç nokta `https://panel.vatansms.com/webservis/service.php`, işlem `TekSmsiBirdenCokNumarayaGonder`, `SOAPAction: urn:testnamespace#TekSmsiBirdenCokNumarayaGonder`.
- Alanlar: `kullanicino`, `kullaniciadi`, `sifre`, `orjinator` (başlık), `numaralar`, `mesaj`, `zaman` (boş), `zamanasimi` (boş), `tip=Turkce`, `ticari=0`.
- Numara biçimi: ülke kodu olmadan, `+905321234567` → `5321234567`.
- `ticari=0`: OTP ticari ileti değildir; İYS sorgusu yapılmaz.
- Başarı: SOAP `return` değeri pozitif bir sayı (SMS ID). HTTP hata ya da SOAP Fault → exception → relay 502.

### Yeni sağlayıcı eklemek

1. `Services/` altına `ISmsSender`'ı uygulayan bir sınıf yaz. Başarısızlıkta exception fırlatsın; numara ve kodu exception mesajına koyma.
2. Gerekirse ayarları için bir options sınıfı ekle.
3. `Program.cs`'te `SMS_MODE` değerine göre kaydını ekle.
4. `.env.example` ve bu dokümanı güncelle.

Controller'a ve Kratos ayarına dokunulmaz.

---

## 7. Loglama

[LOGGING.md](../10-standards/LOGGING.md) kuralına göre **telefon numarası ve OTP kodu loglanmaz**. Loglanan:

| Seviye | Mesaj |
|---|---|
| Information | `SMS gönderildi {TemplateType}` |
| Warning | `Günlük SMS tavanı doldu {Limit}` |
| Error | `SMS sağlayıcısı hata döndü {TemplateType}` + exception |

---

## 8. Kod referansları

- `portfolio-service/Controllers/SmsRelayController.cs` — uç nokta, anahtar ve tavan kontrolü
- `portfolio-service/DTOs/SmsRelayRequest.cs` — istek gövdesi
- `portfolio-service/Models/SmsDailyUsage.cs` — sayaç tablosu
- `portfolio-service/Services/SmsUsageCounter.cs` — sayaç SQL'i
- `portfolio-service/Services/ISmsSender.cs` — gönderici sözleşmesi
- `portfolio-service/Services/MailpitSmsSender.cs` — dev göndericisi
- `portfolio-service/Services/SmsOptions.cs` — ayarlar
- `portfolio-service/Program.cs` — kayıtlar (`SmsOptions`, `SmsUsageCounter` scoped, `ISmsSender` singleton)
- `portfolio-service/Middleware/KratosMiddleware.cs` — `/internal/*` istisnası
- `docker-compose.yml` — `Sms__*` ortam değişkenleri
- `docker-compose.override.yml` — `mailpit` servisi

---

## 9. Durum (2026-10-01)

| Parça | Durum |
|---|---|
| Relay kodu (controller, sayaç, Mailpit göndericisi, kayıtlar, middleware istisnası) | ✅ Yazıldı, build geçiyor |
| Compose ve `.env.example` | ✅ Yazıldı, `docker compose config` ile henüz doğrulanmadı |
| `SmsDailyUsage` EF migration | ⏳ Üretilmedi (`dotnet-ef` gerekli). Üretilmeden relay çalışmaz: tablo yok |
| Çalıştırma testi (200 / 401 / 429) | ⏳ Yapılmadı |
| Kratos tarafı (`courier.channels`, `sms-body.jsonnet`, şablonlar) | ⏳ Plan Görev 2 |
| `VatanSmsSender` | ⏳ Plan Görev 6. §6'daki bilgiler WSDL'den alındı; başarı yanıtı ilk gerçek gönderimde doğrulanacak |
