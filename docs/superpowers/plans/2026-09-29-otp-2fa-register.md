# OTP / 2FA ve Genişletilmiş Kayıt — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Girişe şifre + SMS/e-posta OTP ile 2FA eklemek, kaydı ad/soyad/telefon/KVKK ile genişletmek, e-posta ve telefonu doğrulatmak.

**Architecture:** Kratos v1.2.0 `password` (1. faktör) + `code` `mfa_enabled` (2. faktör). SMS'ler Kratos courier HTTP kanalıyla portfolio-service'teki `/internal/sms` relay'ine gider; relay günlük tavanı uygular ve dev'de Mailpit'e, prod'da VatanSMS'e iletir. Frontend sayfaları elle yazılır, Kratos flow'larını `fetch` ile yürütür.

**Tech Stack:** Ory Kratos v1.2.0, .NET 9 + EF Core 9 (Npgsql), React 19 + Vite + react-router 7, Docker Compose, Mailpit, VatanSMS (SOAP), Resend (SMTP).

**Spec:** `docs/superpowers/specs/2026-09-29-otp-2fa-register-design.md`

## Global Constraints

- Kratos sürümü `oryd/kratos:v1.2.0` kalır.
- `code.passwordless_enabled: false`, `code.mfa_enabled: true`. İkisi aynı anda `true` olamaz.
- Şemada hiçbir trait'e `credentials.code` konmaz (v1.2.0'da `via: sms` desteklenmiyor, spec §3.8).
- Telefon: `+905XXXXXXXXX` (E.164, yalnızca TR cep), şema `format: tel` + `pattern: ^\+905[0-9]{9}$`.
- Günlük SMS tavanı varsayılanı **16**.
- Açma/kapama: `AUTH_REQUIRED_AAL` (varsayılan `aal2`), `AUTH_VERIFICATION_ENABLED` (varsayılan `true`).
- OTP kodu, telefon numarası, e-posta **loglanmaz** (`docs/10-standards/LOGGING.md`).
- UI: `docs/10-standards/DESIGN.md` (VOLTAJ); sınıflar `web/src/lib/authStyles.js`'ten. Ad-hoc renk/gölge yok.
- Auth kodu React Query kullanmaz, düz `fetch` (`docs/10-standards/DATA-FETCHING.md`).
- Otomatik testler bu planın **kapsamı dışında** (spec §12). Her görevin doğrulaması: build/lint + docker compose + Mailpit ile elle kontrol.
- Commit mesajları Türkçe, ASCII (mevcut git geçmişi gibi), sonunda `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Branch: `feat/otp-2fa`.

## Review Focus

Otomatik test olmadığı için her satır, sahibi olan görevde **elle kontrol adımı** olarak yer alır.

1. Telefon farklı biçimlerde yazılır (`0532 123 45 67`, `532…`, `+90 532…`) → kayıt ve giriş aynı `+90532…` değerine normalize olmalı. (Görev 4 ve 5)
2. Günlük SMS tavanı doluyken SMS kanalı seçilir → kullanıcı takılmamalı; hata mesajı görür ve e-postayla devam edebilir. (Görev 5)
3. Kayıtlı bir e-posta veya telefonla yeniden kayıt denenir → "zaten kayıtlı" hatası görülmeli, ham Kratos metni değil. (Görev 4)
4. Yanlış ya da süresi geçmiş kod girilir → anlaşılır hata; "kodu tekrar gönder" yeni kod üretmeli. (Görev 4 ve 5)
5. 2FA adımında sayfa yenilenir → kullanıcı giriş sayfasının 2. adımına düşmeli, boş ekrana ya da döngüye değil. (Görev 5)

---

### Görev 1: SMS relay ve Mailpit

**Files:**
- Create: `portfolio-service/Models/SmsDailyUsage.cs`
- Create: `portfolio-service/Services/SmsOptions.cs`
- Create: `portfolio-service/Services/ISmsSender.cs`
- Create: `portfolio-service/Services/MailpitSmsSender.cs`
- Create: `portfolio-service/Services/SmsUsageCounter.cs`
- Create: `portfolio-service/DTOs/SmsRelayRequest.cs`
- Create: `portfolio-service/Controllers/SmsRelayController.cs`
- Create: `portfolio-service/Migrations/<zaman>_AddSmsDailyUsage.cs` (EF üretir)
- Modify: `portfolio-service/Data/AppDbContext.cs`
- Modify: `portfolio-service/Program.cs`
- Modify: `portfolio-service/Middleware/KratosMiddleware.cs`
- Modify: `docker-compose.yml`, `docker-compose.override.yml`, `.env.example`

**Interfaces:**
- Produces: `POST /internal/sms`, header `X-Api-Key`, gövde `{ "to": "+905…", "message": "…", "type": "login_code_valid" }`. Yanıt: 200 gönderildi · 401 anahtar yanlış · 429 tavan dolu · 502 sağlayıcı hatası.
- Produces: `interface ISmsSender { Task SendAsync(string to, string message, CancellationToken ct); }`. Hata durumunda exception fırlatır (Görev 6 bunu uygular).
- Produces: `SmsOptions { Mode, DailyLimit, RelayApiKey, MailpitSmtp }`, config bölümü `Sms`.

- [ ] **Adım 1: Sayaç entity'si**

`portfolio-service/Models/SmsDailyUsage.cs`:
```csharp
namespace portfolio_service.Models;

// Günlük SMS sayacı — relay'in bütçe tavanı için (bkz. spec §7).
public class SmsDailyUsage
{
    public DateOnly Date { get; set; }
    public int Count { get; set; }
}
```

`AppDbContext.cs` içine, `Transactions` DbSet'inin altına:
```csharp
    public DbSet<SmsDailyUsage> SmsDailyUsage => Set<SmsDailyUsage>();
```
ve `OnModelCreating` sonuna:
```csharp
        modelBuilder.Entity<SmsDailyUsage>().HasKey(s => s.Date);
```

- [ ] **Adım 2: Migration**

```bash
cd portfolio-service
dotnet ef migrations add AddSmsDailyUsage
```
Beklenen: `Migrations/` altında `CreateTable("SmsDailyUsage", …)` içeren yeni dosya; `Date` kolonu `date`, PK. Migration açılışta `db.Database.Migrate()` ile uygulanır.

- [ ] **Adım 3: Ayarlar, gönderici arayüzü, Mailpit gönderici**

`portfolio-service/Services/SmsOptions.cs`:
```csharp
namespace portfolio_service.Services;

public class SmsOptions
{
    public string Mode { get; set; } = "Mailpit";   // Mailpit (dev) | VatanSms (prod)
    public int DailyLimit { get; set; } = 16;
    public string RelayApiKey { get; set; } = "";
    public string MailpitSmtp { get; set; } = "mailpit:1025";
}
```

`portfolio-service/Services/ISmsSender.cs`:
```csharp
namespace portfolio_service.Services;

// Gönderim başarısızsa exception fırlatır; relay sayacı geri alıp 502 döner.
public interface ISmsSender
{
    Task SendAsync(string to, string message, CancellationToken ct);
}
```

`portfolio-service/Services/MailpitSmsSender.cs`:
```csharp
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace portfolio_service.Services;

// Dev: SMS'i gerçekten göndermez, Mailpit'e e-posta olarak düşürür (localhost:8025).
public class MailpitSmsSender(IOptions<SmsOptions> options) : ISmsSender
{
    public async Task SendAsync(string to, string message, CancellationToken ct)
    {
        var parts = options.Value.MailpitSmtp.Split(':');
        using var client = new SmtpClient(parts[0], int.Parse(parts[1]));
        using var mail = new MailMessage("sms-relay@assay.local", "sms@assay.local", $"SMS → {to}", message);
        await client.SendMailAsync(mail, ct);
    }
}
```

- [ ] **Adım 4: Sayaç**

`portfolio-service/Services/SmsUsageCounter.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using portfolio_service.Data;

namespace portfolio_service.Services;

public class SmsUsageCounter(AppDbContext db)
{
    // Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok); tzdata bağımlılığına gerek yok.
    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));

    // Tek SQL ile artırıp yeni değeri döner: eşzamanlı iki istek tavanı delemez.
    // ToListAsync: SingleAsync sorguyu alt sorguya sarar, INSERT ... RETURNING alt sorguda çalışmaz.
    public async Task<int> IncrementAsync(CancellationToken ct)
    {
        var rows = await db.Database.SqlQuery<int>($"""
            INSERT INTO "SmsDailyUsage" ("Date", "Count") VALUES ({Today()}, 1)
            ON CONFLICT ("Date") DO UPDATE SET "Count" = "SmsDailyUsage"."Count" + 1
            RETURNING "Count" AS "Value"
            """).ToListAsync(ct);
        return rows.Single();
    }

    public Task DecrementAsync(CancellationToken ct) =>
        db.Database.ExecuteSqlAsync(
            $"""UPDATE "SmsDailyUsage" SET "Count" = "Count" - 1 WHERE "Date" = {Today()}""", ct);
}
```

- [ ] **Adım 5: Controller ve DTO**

`portfolio-service/DTOs/SmsRelayRequest.cs`:
```csharp
namespace portfolio_service.DTOs;

// Kratos courier'ın gövdesi — kratos/sms-body.jsonnet üretir.
public record SmsRelayRequest(string To, string Message, string Type);
```

`portfolio-service/Controllers/SmsRelayController.cs`:
```csharp
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using portfolio_service.DTOs;
using portfolio_service.Services;

namespace portfolio_service.Controllers;

// Yalnızca Kratos çağırır (Docker ağı içinden). nginx /internal'ı dışarı açmaz; ayrıca API anahtarı ister.
[ApiController]
[Route("internal/sms")]
public class SmsRelayController(
    SmsUsageCounter counter,
    ISmsSender sender,
    IOptions<SmsOptions> options,
    ILogger<SmsRelayController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SmsRelayRequest req, CancellationToken ct)
    {
        var expected = Encoding.UTF8.GetBytes(options.Value.RelayApiKey);
        var given = Encoding.UTF8.GetBytes(Request.Headers["X-Api-Key"].ToString());
        if (expected.Length == 0 || !CryptographicOperations.FixedTimeEquals(expected, given))
            return Unauthorized();

        var count = await counter.IncrementAsync(ct);
        if (count > options.Value.DailyLimit)
        {
            logger.LogWarning("Günlük SMS tavanı doldu {Limit}", options.Value.DailyLimit);
            return StatusCode(StatusCodes.Status429TooManyRequests);
        }

        try
        {
            await sender.SendAsync(req.To, req.Message, ct);
        }
        catch (Exception ex)
        {
            await counter.DecrementAsync(ct);
            logger.LogError(ex, "SMS sağlayıcısı hata döndü {TemplateType}", req.Type);
            return StatusCode(StatusCodes.Status502BadGateway);
        }

        logger.LogInformation("SMS gönderildi {TemplateType}", req.Type);
        return Ok();
    }
}
```

- [ ] **Adım 6: Kayıt ve middleware muafiyeti**

`Program.cs`'te `builder.Services.AddScoped<ITransactionService, TransactionService>();` satırının altına:
```csharp
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection("Sms"));
builder.Services.AddScoped<SmsUsageCounter>();
builder.Services.AddSingleton<ISmsSender, MailpitSmsSender>();
```
(`Program.cs` zaten `using portfolio_service.Services;` içeriyor, ek `using` gerekmez.)

`portfolio-service/Middleware/KratosMiddleware.cs` → `InvokeAsync`'in ilk satırı olarak:
```csharp
        // /internal/*: Kratos'un sunucudan sunucuya çağrıları (SMS relay). Kullanıcı oturumu yok; API anahtarıyla korunur.
        if (context.Request.Path.StartsWithSegments("/internal"))
        {
            await next(context);
            return;
        }
```

- [ ] **Adım 7: Compose ve env**

`docker-compose.yml` → `portfolio-service.environment` listesine:
```yaml
      - Sms__Mode=${SMS_MODE:-Mailpit}
      - Sms__DailyLimit=${SMS_DAILY_LIMIT:-16}
      - Sms__RelayApiKey=${SMS_RELAY_API_KEY}
```

`docker-compose.override.yml` → `services:` altına:
```yaml
  mailpit:
    # Dev e-posta + SMS kutusu: Kratos mailleri ve relay'in SMS'leri buraya düşer. Arayüz: http://localhost:8025
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"
```

`.env.example` sonuna:
```bash
# --- SMS relay (bkz. docs/superpowers/specs/2026-09-29-otp-2fa-register-design.md §7) ---
# Kratos ile portfolio-service arasındaki paylaşılan anahtar. Uret: openssl rand -hex 32
SMS_RELAY_API_KEY=
# Mailpit (dev: SMS'ler Mailpit'e düşer) | VatanSms (prod: gerçek SMS)
SMS_MODE=Mailpit
SMS_DAILY_LIMIT=16
```
Kendi `.env`'ine de `SMS_RELAY_API_KEY` için üretilmiş bir değer ekle.

- [ ] **Adım 8: Build ve elle doğrulama**

```bash
cd portfolio-service && dotnet build
cd .. && docker compose up -d --build portfolio-service mailpit
KEY=$(grep ^SMS_RELAY_API_KEY= .env | cut -d= -f2)
# 1) Doğru anahtar → 200, Mailpit'te "SMS → +905321234567" maili
curl -i -X POST localhost:5001/internal/sms -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"to":"+905321234567","message":"Kodunuz: 123456","type":"login_code_valid"}'
# 2) Yanlış anahtar → 401
curl -i -X POST localhost:5001/internal/sms -H "X-Api-Key: yanlis" -H "Content-Type: application/json" \
  -d '{"to":"+905321234567","message":"x","type":"t"}'
# 3) Tavan: 16 istek daha at, son istek 429 dönmeli
for i in $(seq 1 16); do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:5001/internal/sms \
  -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d '{"to":"+905321234567","message":"x","type":"t"}'; done
```
Beklenen: 1) `200`, 2) `401`, 3) `200 … 200 429` (ilk istekle birlikte 17. istek 429). `docker compose logs portfolio-service` içinde numara veya kod **görünmemeli**.

Test sonrası sayacı sıfırla (Neon SQL Editor veya `psql "$DB_CONNECTION_STRING"` eşdeğeri):
```sql
DELETE FROM "SmsDailyUsage";
```

- [ ] **Adım 9: Commit**

```bash
git add portfolio-service docker-compose.yml docker-compose.override.yml .env.example
git commit -m "feat(portfolio): Kratos SMS relay'i ve gunluk SMS tavani ekle"
```

---

### Görev 2: Kratos şeması, 2FA, doğrulama, courier

**Files:**
- Modify: `kratos/identity.schema.json` (tamamen yeniden yazılır)
- Modify: `kratos/kratos.yml`
- Create: `kratos/sms-body.jsonnet`
- Create: `kratos/templates/login_code/valid/email.subject.gotmpl`, `email.body.gotmpl`, `email.body.plaintext.gotmpl`, `sms.body.gotmpl`
- Create: `kratos/templates/verification_code/valid/email.subject.gotmpl`, `email.body.gotmpl`, `email.body.plaintext.gotmpl`, `sms.body.gotmpl`
- Modify: `docker-compose.yml` (kratos env), `.env.example`

**Interfaces:**
- Consumes: Görev 1'in `POST /internal/sms` sözleşmesi ve `SMS_RELAY_API_KEY`.
- Produces: trait yolları `traits.email`, `traits.phone`, `traits.name.first`, `traits.name.last`, `traits.consent`. AAL2 akışı: `/self-service/login/browser?aal=aal2&via=phone|email`. Doğrulama sayfası `/verification`.

- [ ] **Adım 1: Kimlik şeması**

`kratos/identity.schema.json`:
```json
{
  "$id": "https://assay.com.tr/schemas/identity.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Person",
  "type": "object",
  "properties": {
    "traits": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "title": "E-posta",
          "maxLength": 320,
          "ory.sh/kratos": {
            "credentials": { "password": { "identifier": true } },
            "verification": { "via": "email" }
          }
        },
        "phone": {
          "type": "string",
          "format": "tel",
          "pattern": "^\\+905[0-9]{9}$",
          "title": "Telefon",
          "ory.sh/kratos": {
            "credentials": { "password": { "identifier": true } },
            "verification": { "via": "sms" }
          }
        },
        "name": {
          "type": "object",
          "properties": {
            "first": { "type": "string", "title": "Ad", "minLength": 1, "maxLength": 50 },
            "last": { "type": "string", "title": "Soyad", "minLength": 1, "maxLength": 50 }
          },
          "required": ["first", "last"],
          "additionalProperties": false
        },
        "consent": { "type": "boolean", "title": "KVKK ve kullanım koşulları onayı", "const": true }
      },
      "required": ["email", "phone", "name", "consent"],
      "additionalProperties": false
    }
  }
}
```

- [ ] **Adım 2: kratos.yml**

`selfservice.methods` bloğunu şununla değiştir:
```yaml
  methods:
    password:
      enabled: true
    code:                               # OTP yalnızca 2. faktör; şifresiz giriş kapalı (ikisi aynı anda açılamaz)
      mfa_enabled: true
      passwordless_enabled: false
      config:
        lifespan: 10m                   # kod geçerlilik süresi
```

`selfservice.flows.registration` bloğundan `after:` kısmını tümüyle sil (kayıt sonrası otomatik giriş yok) ve `flows` altına ekle:
```yaml
    verification:
      enabled: true                     # AUTH_VERIFICATION_ENABLED ezer
      use: code
      ui_url: http://localhost/verification
      lifespan: 15m
```

`session` bloğuna:
```yaml
  whoami:
    required_aal: aal2                  # her girişte 2FA; AUTH_REQUIRED_AAL ezer
```

`courier` bloğunu şununla değiştir:
```yaml
courier:
  smtp:
    connection_uri: smtp://mailpit:1025/?disable_starttls=true   # COURIER_SMTP_CONNECTION_URI ezer
    from_address: no-reply@assay.com.tr                          # COURIER_SMTP_FROM_ADDRESS ezer
    from_name: Assay
  channels:
    - id: sms
      type: http
      request_config:
        url: http://portfolio-service:5001/internal/sms
        method: POST
        body: file:///etc/config/kratos/sms-body.jsonnet
        auth:
          type: api_key
          config:
            name: X-Api-Key
            value: PLEASE-CHANGE-ME                              # COURIER_CHANNELS_0_REQUEST_CONFIG_AUTH_CONFIG_VALUE ezer
            in: header
  templates:
    login_code:
      valid:
        email:
          subject: file:///etc/config/kratos/templates/login_code/valid/email.subject.gotmpl
          body:
            html: file:///etc/config/kratos/templates/login_code/valid/email.body.gotmpl
            plaintext: file:///etc/config/kratos/templates/login_code/valid/email.body.plaintext.gotmpl
        sms:
          body:
            plaintext: file:///etc/config/kratos/templates/login_code/valid/sms.body.gotmpl
    verification_code:
      valid:
        email:
          subject: file:///etc/config/kratos/templates/verification_code/valid/email.subject.gotmpl
          body:
            html: file:///etc/config/kratos/templates/verification_code/valid/email.body.gotmpl
            plaintext: file:///etc/config/kratos/templates/verification_code/valid/email.body.plaintext.gotmpl
        sms:
          body:
            plaintext: file:///etc/config/kratos/templates/verification_code/valid/sms.body.gotmpl
```

- [ ] **Adım 3: Jsonnet ve şablonlar**

`kratos/sms-body.jsonnet`:
```jsonnet
function(ctx) {
  to: ctx.recipient,
  message: ctx.body,
  type: ctx.template_type,
}
```

`kratos/templates/login_code/valid/`:
- `email.subject.gotmpl` → `Assay giriş kodunuz`
- `email.body.plaintext.gotmpl` →
  ```
  Giriş kodunuz: {{ .LoginCode }}

  Kod 10 dakika geçerlidir. Bu girişi siz yapmadıysanız şifrenizi değiştirin.
  ```
- `email.body.gotmpl` → `<p>Giriş kodunuz: <strong>{{ .LoginCode }}</strong></p><p>Kod 10 dakika geçerlidir. Bu girişi siz yapmadıysanız şifrenizi değiştirin.</p>`
- `sms.body.gotmpl` → `Assay giriş kodunuz: {{ .LoginCode }}`

`kratos/templates/verification_code/valid/`:
- `email.subject.gotmpl` → `Assay e-posta doğrulama kodunuz`
- `email.body.plaintext.gotmpl` → `Doğrulama kodunuz: {{ .VerificationCode }}`
- `email.body.gotmpl` → `<p>Doğrulama kodunuz: <strong>{{ .VerificationCode }}</strong></p>`
- `sms.body.gotmpl` → `Assay telefon doğrulama kodunuz: {{ .VerificationCode }}`

- [ ] **Adım 4: Compose env ve açma/kapama anahtarları**

`docker-compose.yml` → `kratos.environment` altına:
```yaml
      SELFSERVICE_FLOWS_VERIFICATION_UI_URL: ${APP_URL:-http://localhost}/verification
      # Açma/kapama (spec §10.1): .env'de değiştir → docker compose up -d
      SESSION_WHOAMI_REQUIRED_AAL: ${AUTH_REQUIRED_AAL:-aal2}
      SELFSERVICE_FLOWS_VERIFICATION_ENABLED: ${AUTH_VERIFICATION_ENABLED:-true}
      COURIER_SMTP_CONNECTION_URI: ${COURIER_SMTP_CONNECTION_URI:-smtp://mailpit:1025/?disable_starttls=true}
      COURIER_SMTP_FROM_ADDRESS: ${COURIER_SMTP_FROM_ADDRESS:-no-reply@assay.com.tr}
      COURIER_CHANNELS_0_REQUEST_CONFIG_AUTH_CONFIG_VALUE: ${SMS_RELAY_API_KEY}
```

`.env.example` sonuna:
```bash
# --- 2FA / doğrulama açma-kapama (spec §10.1). Değiştir → docker compose up -d (restart YETMEZ) ---
AUTH_REQUIRED_AAL=aal2            # aal1 = OTP adımı kapalı
AUTH_VERIFICATION_ENABLED=true    # false = kayıtta doğrulama yok

# --- Kratos e-posta (dev: boş bırak → Mailpit; prod: Resend SMTP) ---
COURIER_SMTP_CONNECTION_URI=
COURIER_SMTP_FROM_ADDRESS=
```
Not: compose `${VAR:-varsayılan}` boş değerde de varsayılanı kullanır, dev'de boş bırakmak Mailpit'e düşer.

- [ ] **Adım 5: Kratos'u başlat, yapılandırma hatası olmadığını gör**

```bash
docker compose up -d kratos-migrate kratos mailpit portfolio-service
docker compose logs kratos --tail 50
```
Beklenen: `Starting the admin httpd`/`public httpd` satırları; `config` veya `schema` hatası yok. Hata varsa DUR, logu kullanıcıya göster.

- [ ] **Adım 6: Kratos'u API akışıyla uçtan uca dene (frontend'siz)**

Bu adım spec'teki riskli varsayımları (SMS doğrulama, SMS ile 2FA, AAL2) frontend yazılmadan önce doğrular. Kratos dev'de `localhost:4433`'te açık.

```bash
K=http://localhost:4433
# Kayıt
F=$(curl -s $K/self-service/registration/api | python -c "import json,sys;print(json.load(sys.stdin)['id'])")
curl -s -X POST "$K/self-service/registration?flow=$F" -H "Content-Type: application/json" -d '{
  "method":"password","password":"Deneme-Sifre-2026!",
  "traits":{"email":"deneme@assay.local","phone":"+905320000001","name":{"first":"Deneme","last":"Kullanici"},"consent":true}}' \
  | python -m json.tool | head -40
```
Beklenen: yanıtta `identity.verifiable_addresses` iki kayıt (email + sms, `verified: false`); `continue_with` iki `show_verification_ui`. Mailpit'te iki mail: e-posta doğrulama kodu ve `SMS → +905320000001` (Türkçe metin).

```bash
# Şifreyle giriş (API akışı → session_token döner)
F=$(curl -s $K/self-service/login/api | python -c "import json,sys;print(json.load(sys.stdin)['id'])")
TOKEN=$(curl -s -X POST "$K/self-service/login?flow=$F" -H "Content-Type: application/json" \
  -d '{"method":"password","identifier":"+905320000001","password":"Deneme-Sifre-2026!"}' \
  | python -c "import json,sys;print(json.load(sys.stdin)['session_token'])")
curl -s -o /dev/null -w "whoami AAL1: %{http_code}\n" $K/sessions/whoami -H "X-Session-Token: $TOKEN"
# AAL2: SMS ile kod
F=$(curl -s "$K/self-service/login/api?aal=aal2&via=phone" -H "X-Session-Token: $TOKEN" | python -c "import json,sys;print(json.load(sys.stdin)['id'])")
curl -s -X POST "$K/self-service/login?flow=$F" -H "X-Session-Token: $TOKEN" -H "Content-Type: application/json" \
  -d '{"method":"code","identifier":"+905320000001"}' -o /dev/null -w "kod iste: %{http_code}\n"
```
Beklenen: `whoami AAL1: 403`; Mailpit'te yeni `SMS → +905320000001` "Assay giriş kodunuz: NNNNNN".

```bash
CODE=<Mailpit'teki 6 hane>
curl -s -X POST "$K/self-service/login?flow=$F" -H "X-Session-Token: $TOKEN" -H "Content-Type: application/json" \
  -d "{\"method\":\"code\",\"identifier\":\"+905320000001\",\"code\":\"$CODE\"}" | python -m json.tool | grep -E '"aal"|"verified"'
curl -s -o /dev/null -w "whoami AAL2: %{http_code}\n" $K/sessions/whoami -H "X-Session-Token: $TOKEN"
```
Beklenen: `"aal": "aal2"`, telefon adresi `"verified": true` (spec §3.3), `whoami AAL2: 200`.

Sapmalar:
- Relay 401 dönüyorsa (`docker compose logs portfolio-service`), `COURIER_CHANNELS_0_…` env'i işlememiştir. Env satırını sil, yerine tüm kanalı JSON olarak ver: `COURIER_CHANNELS: '[{"id":"sms","type":"http","request_config":{"url":"http://portfolio-service:5001/internal/sms","method":"POST","body":"file:///etc/config/kratos/sms-body.jsonnet","auth":{"type":"api_key","config":{"name":"X-Api-Key","value":"${SMS_RELAY_API_KEY}","in":"header"}}}}]'`. Yine olmazsa DUR, kullanıcıya bildir.
- AAL2 akışı hata verirse veya oturum `aal2` olmazsa DUR, kullanıcıya bildir (tasarımın temel varsayımı).

Deneme kullanıcısını sil:
```bash
ID=$(curl -s "http://localhost:4434/admin/identities?credentials_identifier=deneme@assay.local" | python -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
curl -s -X DELETE http://localhost:4434/admin/identities/$ID -o /dev/null -w "%{http_code}\n"
```
Beklenen: `204`.

- [ ] **Adım 7: Açma/kapama anahtarını dene**

`.env`'e `AUTH_REQUIRED_AAL=aal1` yaz → `docker compose up -d` → Adım 6'daki "Şifreyle giriş" komutlarını tekrarla. Beklenen: `whoami AAL1: 200`. Sonra `aal2`'ye geri al → `docker compose up -d`.

- [ ] **Adım 8: Commit**

```bash
git add kratos docker-compose.yml .env.example
git commit -m "feat(kratos): 2FA (code mfa), SMS/e-posta dogrulama ve genisletilmis kimlik semasi"
```

---

### Görev 3: Backend doğrulama kontrolü

> **2026-10-02 notu:** Telefon artık `verifiable_addresses`'ta yok (spec §4); kontrol kodu aynen geçerli, pratikte yalnızca e-postaya bakar. Adım 4'teki elle doğrulamada "yalnızca SMS ile AAL2" yerine: e-posta kodunu girmeden **e-postayla** AAL2'ye geç; 2FA kodu adresi doğruladığı için (spec §3.3) 403 beklenmez. 403'ü görmek için `AUTH_REQUIRED_AAL=aal1` ile şifreyle gir.

**Files:**
- Modify: `portfolio-service/Middleware/KratosMiddleware.cs`
- Modify: `market-service/Middleware/KratosMiddleware.cs`
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: e-posta veya telefonu doğrulanmamış kullanıcının API isteği → `403 {"error":"verification_required"}` (Görev 5 frontend'i bunu yakalar).
- Config: `Auth:RequireVerifiedAddresses` (bool, varsayılan `true`).

- [ ] **Adım 1: Kayıt tipleri (iki serviste aynı)**

Her iki `KratosMiddleware.cs` dosyasının en altındaki iki `record` satırını şununla değiştir:
```csharp
public record KratosSession([property: JsonPropertyName("identity")] KratosIdentity? Identity);
public record KratosIdentity(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("verifiable_addresses")] List<KratosVerifiableAddress>? VerifiableAddresses);
public record KratosVerifiableAddress([property: JsonPropertyName("verified")] bool Verified);
```

- [ ] **Adım 2: Kontrol (iki serviste aynı)**

Her iki dosyada `if (session?.Identity?.Id is null) { … return; }` bloğunun hemen altına:
```csharp
            // E-posta + telefon doğrulanmadan panel kullanılmaz (AUTH_VERIFICATION_ENABLED=false ile kapanır).
            if (configuration.GetValue("Auth:RequireVerifiedAddresses", true)
                && session.Identity.VerifiableAddresses?.Any(a => !a.Verified) == true)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new { error = "verification_required" });
                return;
            }
```

- [ ] **Adım 3: Compose**

`docker-compose.yml` → hem `market-service` hem `portfolio-service` `environment` listesine:
```yaml
      - Auth__RequireVerifiedAddresses=${AUTH_VERIFICATION_ENABLED:-true}
```

- [ ] **Adım 4: Build ve elle doğrulama**

```bash
cd portfolio-service && dotnet build && cd ../market-service && dotnet build && cd ..
docker compose up -d --build portfolio-service market-service
```
Görev 2 Adım 6'daki gibi bir kullanıcı kaydet, **yalnızca SMS** ile AAL2'ye geç (e-posta doğrulanmamış kalır):
```bash
curl -s -w "\n%{http_code}\n" localhost:5001/api/assets -H "X-Session-Token: $TOKEN"
```
Beklenen: `{"error":"verification_required"}` ve `403`. Mailpit'teki e-posta doğrulama kodunu API akışıyla gir:
```bash
VF=<kayıt yanıtındaki continue_with içinde email adresli flow id>
curl -s -X POST "http://localhost:4433/self-service/verification?flow=$VF" -H "Content-Type: application/json" \
  -d '{"method":"code","code":"<e-posta kodu>"}' | python -c "import json,sys;print(json.load(sys.stdin)['state'])"
curl -s -o /dev/null -w "%{http_code}\n" localhost:5001/api/assets -H "X-Session-Token: $TOKEN"
```
Beklenen: `passed_challenge`, ardından `200`. Deneme kullanıcısını Görev 2 Adım 6'daki gibi sil.

- [ ] **Adım 5: Commit**

```bash
git add portfolio-service/Middleware market-service/Middleware docker-compose.yml
git commit -m "feat(api): dogrulanmamis e-posta/telefonla API erisimini engelle"
```

---

### Görev 4: Frontend — ortak parçalar, kayıt, doğrulama sayfası

> **2026-10-02 notu (e-posta tek kanal, spec §6):** Kayıt formu telefonu almaya ve normalize etmeye devam eder. Kayıt yanıtındaki `continue_with` yalnızca e-posta doğrulamasını içerir; `Verification.jsx`'teki SMS adımı ve "Telefonunu SMS koduyla doğrula" düğmesi bu görevde **yazılmaz**. `auth.errAccountExists` metni yalnızca e-postayı anar. Aşağıdaki kod bu nota göre sadeleştirilerek uygulanır.

**Files:**
- Create: `web/src/lib/phone.js`
- Create: `web/src/lib/kratos.js`
- Create: `web/src/components/AuthCard.jsx`
- Create: `web/src/pages/Verification.jsx`
- Modify: `web/src/pages/Register.jsx` (yeniden yazılır)
- Modify: `web/src/lib/authErrors.js`
- Modify: `web/src/contexts/LanguageContext.jsx` (tr + en)
- Modify: `web/src/App.jsx`

**Interfaces:**
- Produces: `toE164TR(input: string): string | null`
- Produces: `csrfOf(flow)`, `createFlow(kind, params?)`, `getFlow(kind, id)`, `submitFlow(kind, flow, payload)`. Hepsi `{ ok, status, body }` döner.
- Produces: `<AuthCard title subtitle error footer>{children}</AuthCard>`
- Produces: `/verification` rotası. `location.state.flows: Array<{ id: string, via: 'email' | 'sms', address: string }>` ile gelir (kayıttan) ya da state'siz (API 403'ünden).

- [ ] **Adım 1: Telefon normalizasyonu**

`web/src/lib/phone.js`:
```js
// TR cep numarasını E.164'e çevirir: "0532 123 45 67", "5321234567", "+90 532..." → "+905321234567".
// Telefon değilse (ör. e-posta) null döner. Kratos adresleri birebir eşleştirdiği için tek biçim şart.
export function toE164TR(input) {
  const digits = input.replace(/[\s()-]/g, '')
  const m = digits.match(/^(?:\+?90|0)?(5\d{9})$/)
  return m ? `+90${m[1]}` : null
}
```

- [ ] **Adım 2: Kratos yardımcıları**

`web/src/lib/kratos.js`:
```js
import { KRATOS_URL } from './app'

const accept = { Accept: 'application/json' }

export const csrfOf = (flow) =>
  flow?.ui?.nodes?.find((n) => n.attributes?.name === 'csrf_token')?.attributes?.value

async function call(url, init = {}) {
  const res = await fetch(url, { credentials: 'include', ...init, headers: { ...accept, ...init.headers } })
  return { ok: res.ok, status: res.status, body: await res.json() }
}

// Browser flow'u AJAX ile başlatır: Accept: application/json ile Kratos yönlendirmek yerine flow JSON'u döner.
export const createFlow = (kind, params = {}) =>
  call(`${KRATOS_URL}/self-service/${kind}/browser?${new URLSearchParams(params)}`)

export const getFlow = (kind, id) => call(`${KRATOS_URL}/self-service/${kind}/flows?id=${id}`)

export const submitFlow = (kind, flow, payload) =>
  call(`${KRATOS_URL}/self-service/${kind}?flow=${flow.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, csrf_token: csrfOf(flow) }),
  })
```

- [ ] **Adım 3: Ortak kart**

`web/src/components/AuthCard.jsx` (Login/Register'daki mevcut kabuğun aynısı, tek yerde):
```jsx
import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/app'
import assayMark from '../assets/assay-mark.svg'
import AuthVisual from './AuthVisual'

// Login / Register / Verification ortak kabuğu — VOLTAJ auth kartı (DESIGN.md).
export default function AuthCard({ title, subtitle, error, footer, children }) {
  return (
    <div className="paper flex min-h-screen items-center bg-background p-6 md:p-12">
      <div className="edge-accent relative z-10 w-full max-w-[360px] rounded-r-lg border border-l-0 border-border bg-card p-7">
        <Link to="/landing" aria-label={`${APP_NAME} tanıtım sayfası`} className="inline-block rounded-sm hover:opacity-70">
          <img src={assayMark} alt="" className="h-[30px] w-[30px]" />
        </Link>
        <h1 className="mt-4 text-head font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-ui text-muted-foreground">{subtitle}</p>}
        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-micro text-destructive" role="alert">
            {error}
          </div>
        )}
        {children}
        {footer}
        <p className="mt-4 border-t border-border pt-4">
          <Link to="/landing" className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground">
            <span aria-hidden="true">&larr;</span> {APP_NAME} nedir?
          </Link>
        </p>
      </div>
      <AuthVisual />
    </div>
  )
}
```

- [ ] **Adım 4: Hata eşlemesi**

`web/src/lib/authErrors.js` → `switch` içine, `default`'tan önce; ve `4000007` satırının metin anahtarını değiştir:
```js
    case 4000007: // account already exists (e-posta veya telefon)
      return t('auth.errAccountExists')
    case 4010008: // login code invalid / used
    case 4070006: // verification code invalid / used
      return t('auth.errCodeInvalid')
```

- [ ] **Adım 5: Metinler**

`LanguageContext.jsx` → `tr` sözlüğünde `'auth.hidePassword'` satırının altına:
```js
    'auth.firstName': 'Ad',
    'auth.lastName': 'Soyad',
    'auth.phone': 'Telefon',
    'auth.identifier': 'Telefon veya e-posta',
    'auth.consent': 'KVKK aydınlatma metnini ve kullanım koşullarını okudum, kabul ediyorum.',
    'auth.errRequired': 'Bu alan gerekli',
    'auth.errPhoneInvalid': 'Geçerli bir cep telefonu girin (05XX XXX XX XX)',
    'auth.errConsent': 'Devam etmek için onay gerekli',
    'auth.errAccountExists': 'Bu e-posta veya telefon zaten kayıtlı',
    'auth.errCodeInvalid': 'Kod hatalı veya süresi dolmuş',
    'auth.smsHint': 'SMS birkaç dakika içinde gelmezse "Başka yöntem seç" ile kodu e-postayla alabilirsiniz.',
    'auth.chooseChannel': 'Doğrulama kodunu nereye gönderelim?',
    'auth.viaSms': 'SMS ile gönder',
    'auth.viaEmail': 'E-posta ile gönder',
    'auth.enterAddress': 'Kodu göndereceğimiz adresi tam olarak yazın',
    'auth.codeSentTo': 'Kod gönderildi:',
    'auth.code': 'Doğrulama kodu',
    'auth.verify': 'Doğrula',
    'auth.resend': 'Kodu tekrar gönder',
    'auth.otherChannel': 'Başka yöntem seç',
    'auth.verifyTitle': 'Hesabını doğrula',
    'auth.verifySubtitle': 'E-posta ve telefonuna gelen kodları gir',
    'auth.verifyPhoneViaSms': 'Telefonunu SMS koduyla doğrula',
    'auth.verifyDone': 'Hesabın hazır, giriş yapabilirsin.',
```
`en` sözlüğünde aynı yere:
```js
    'auth.firstName': 'First name',
    'auth.lastName': 'Last name',
    'auth.phone': 'Phone',
    'auth.identifier': 'Phone or email',
    'auth.consent': 'I have read and accept the privacy notice and terms of use.',
    'auth.errRequired': 'This field is required',
    'auth.errPhoneInvalid': 'Enter a valid Turkish mobile number (05XX XXX XX XX)',
    'auth.errConsent': 'Consent is required to continue',
    'auth.errAccountExists': 'This email or phone is already registered',
    'auth.errCodeInvalid': 'The code is invalid or has expired',
    'auth.smsHint': 'If the SMS does not arrive within a few minutes, use "Choose another method" to get the code by email.',
    'auth.chooseChannel': 'Where should we send your code?',
    'auth.viaSms': 'Send via SMS',
    'auth.viaEmail': 'Send via email',
    'auth.enterAddress': 'Type the full address we should send the code to',
    'auth.codeSentTo': 'Code sent to:',
    'auth.code': 'Verification code',
    'auth.verify': 'Verify',
    'auth.resend': 'Resend code',
    'auth.otherChannel': 'Choose another method',
    'auth.verifyTitle': 'Verify your account',
    'auth.verifySubtitle': 'Enter the codes sent to your email and phone',
    'auth.verifyPhoneViaSms': 'Verify your phone with an SMS code',
    'auth.verifyDone': 'Your account is ready, you can sign in.',
```

- [ ] **Adım 6: Kayıt sayfası**

`web/src/pages/Register.jsx` (tamamı):
```jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidEmail, kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls } from '../lib/authStyles'
import { APP_NAME, KRATOS_URL } from '../lib/app'
import { getFlow, submitFlow } from '../lib/kratos'
import { toE164TR } from '../lib/phone'
import { Eye, EyeOff } from 'lucide-react'
import AuthCard from '../components/AuthCard'

const EMPTY = { first: '', last: '', email: '', phone: '', password: '', consent: false }

export default function Register() {
  const [flow, setFlow] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showPass, setShowPass] = useState(false)
  const [fieldErr, setFieldErr] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    const flowId = searchParams.get('flow')
    if (flowId) getFlow('registration', flowId).then(({ body }) => setFlow(body))
    else window.location.href = `${KRATOS_URL}/self-service/registration/browser`
  }, [searchParams])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'consent' ? e.target.checked : e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.first.trim()) e.first = t('auth.errRequired')
    if (!form.last.trim()) e.last = t('auth.errRequired')
    if (!form.email) e.email = t('auth.errEmailRequired')
    else if (!isValidEmail(form.email)) e.email = t('auth.errEmailInvalid')
    if (!toE164TR(form.phone)) e.phone = t('auth.errPhoneInvalid')
    if (!form.password) e.password = t('auth.errPasswordRequired')
    else if (form.password.length < 8) e.password = t('auth.errPasswordShort')
    if (!form.consent) e.consent = t('auth.errConsent')
    setFieldErr(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    try {
      const { ok, body } = await submitFlow('registration', flow, {
        method: 'password',
        password: form.password,
        traits: {
          email: form.email.trim(),
          phone: toE164TR(form.phone),
          name: { first: form.first.trim(), last: form.last.trim() },
          consent: true,
        },
      })
      if (!ok) return setError(kratosErrorText(body, t))
      // Doğrulama açıksa Kratos her adres için bir doğrulama akışı başlatıp kodu gönderir.
      const flows = (body.continue_with ?? [])
        .filter((c) => c.action === 'show_verification_ui')
        .map((c) => ({
          id: c.flow.id,
          address: c.flow.verifiable_address,
          via: c.flow.verifiable_address.includes('@') ? 'email' : 'sms',
        }))
        .sort((a, b) => (a.via === 'email' ? 0 : 1) - (b.via === 'email' ? 0 : 1)) // önce e-posta, sonra SMS
      navigate(flows.length ? '/verification' : '/login', { state: flows.length ? { flows } : { registered: true } })
    } finally {
      setLoading(false)
    }
  }

  if (!flow) {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  const field = (key, id, type, label, placeholder) => (
    <>
      <label className={authLabelCls} htmlFor={id}>{label}</label>
      <input id={id} type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} className={authInputCls} />
      {fieldErr[key] && <p className="mt-1 text-micro text-down">{fieldErr[key]}</p>}
    </>
  )

  return (
    <AuthCard
      title={t('auth.createAccount')}
      subtitle={`${APP_NAME} — ${t('auth.createAccountSubtitle')}`}
      error={error}
      footer={
        <p className="mt-5 text-ui text-muted-foreground">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70">{t('auth.signIn')}</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="mt-1" noValidate>
        {field('first', 'register-first', 'text', t('auth.firstName'), '')}
        {field('last', 'register-last', 'text', t('auth.lastName'), '')}
        {field('email', 'register-email', 'email', t('auth.email'), 'you@example.com')}
        {field('phone', 'register-phone', 'tel', t('auth.phone'), '05XX XXX XX XX')}

        <label className={authLabelCls} htmlFor="register-password">{t('auth.password')}</label>
        <div className="relative">
          <input
            id="register-password"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            placeholder="••••••••"
            className={`${authInputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErr.password && <p className="mt-1 text-micro text-down">{fieldErr.password}</p>}

        <label className="mt-4 flex items-start gap-2 text-micro text-muted-foreground">
          <input type="checkbox" checked={form.consent} onChange={set('consent')} className="mt-0.5" />
          {t('auth.consent')}
        </label>
        {fieldErr.consent && <p className="mt-1 text-micro text-down">{fieldErr.consent}</p>}

        <button type="submit" disabled={loading} className={authSubmitCls}>
          {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
        </button>
      </form>
    </AuthCard>
  )
}
```

- [ ] **Adım 7: Doğrulama sayfası**

`web/src/pages/Verification.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls } from '../lib/authStyles'
import { KRATOS_URL } from '../lib/app'
import { createFlow, getFlow, submitFlow } from '../lib/kratos'
import AuthCard from '../components/AuthCard'

// İki giriş yolu:
//  1) Kayıttan: location.state.flows — Kratos kodları zaten gönderdi, sırayla girilir.
//  2) API 403 verification_required'dan (state yok): whoami'den doğrulanmamış adresler bulunur.
//     E-posta → yeni doğrulama akışı + kod gönder. Telefon → v1.2.0'da SMS doğrulaması yeniden
//     istenemez (spec §3.4); SMS 2FA kodu telefonu doğrular (spec §3.3), bu yüzden login'in
//     SMS adımına yönlendirilir.
export default function Verification() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [queue, setQueue] = useState(state?.flows ?? null)
  const [flow, setFlow] = useState(null)
  const [phonePending, setPhonePending] = useState(null) // doğrulanmamış telefon numarası
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // State'siz geliş: doğrulanmamış adresleri whoami'den çıkar.
  useEffect(() => {
    if (queue) return
    fetch(`${KRATOS_URL}/sessions/whoami`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (session) => {
        const pending = session?.identity?.verifiable_addresses?.filter((a) => !a.verified) ?? []
        setPhonePending(pending.find((a) => a.via === 'sms')?.value ?? null)
        const email = pending.find((a) => a.via === 'email')
        if (!email) return setQueue([])
        const created = await createFlow('verification')
        await submitFlow('verification', created.body, { method: 'code', email: email.value })
        setQueue([{ id: created.body.id, via: 'email', address: email.value }])
      })
  }, [queue])

  const current = queue?.[0]
  useEffect(() => {
    if (current) getFlow('verification', current.id).then(({ body }) => setFlow(body))
  }, [current])

  const next = () => {
    setCode('')
    setFlow(null)
    setQueue((q) => q.slice(1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { body } = await submitFlow('verification', flow, { method: 'code', code: code.trim() })
      if (body.state === 'passed_challenge') next()
      else setError(kratosErrorText(body, t))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setError(null)
    const { body } = await submitFlow('verification', flow, { method: 'code', email: current.address })
    setFlow(body)
  }

  if (!queue || (current && !flow)) {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  if (!current) {
    return (
      <AuthCard title={t('auth.verifyTitle')}>
        {phonePending ? (
          <button type="button" className={authSubmitCls} onClick={() => navigate('/login', { state: { step: 'channel', via: 'phone', refresh: true, address: phonePending } })}>
            {t('auth.verifyPhoneViaSms')}
          </button>
        ) : (
          <>
            <p className="mt-4 text-ui text-foreground">{t('auth.verifyDone')}</p>
            <button type="button" className={authSubmitCls} onClick={() => navigate('/login', { state: { registered: true } })}>
              {t('auth.signIn')}
            </button>
          </>
        )}
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle')} error={error}>
      <form onSubmit={handleSubmit} className="mt-1" noValidate>
        <p className="mt-4 text-micro text-muted-foreground">{t('auth.codeSentTo')} <span className="font-mono text-foreground">{current.address}</span></p>
        <label className={authLabelCls} htmlFor="verify-code">{t('auth.code')}</label>
        <input id="verify-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={authInputCls} />
        <button type="submit" disabled={loading || !code} className={authSubmitCls}>{t('auth.verify')}</button>
        {current.via === 'email' && (
          <button type="button" onClick={resend} className="mt-3 text-ui text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t('auth.resend')}
          </button>
        )}
      </form>
    </AuthCard>
  )
}
```

- [ ] **Adım 8: Rota**

`web/src/App.jsx` → import'lara `import Verification from './pages/Verification'`, rotalara `/register` satırının altına:
```jsx
            <Route path="/verification" element={<Verification />} />
```

- [ ] **Adım 9: Lint, build, elle doğrulama**

```bash
cd web && npm run lint && npm run build && cd ..
docker compose up -d --build web
```
Tarayıcıda `http://localhost/register`:
1. Telefonu `0532 000 00 02` biçiminde yazıp kayıt ol (Review Focus 1). Mailpit'teki SMS maili `SMS → +905320000002` olmalı.
2. `/verification`'da önce e-posta kodunu yanlış gir → "Kod hatalı veya süresi dolmuş" (Review Focus 4). "Kodu tekrar gönder" → Mailpit'te yeni kod → doğru kodu gir.
3. SMS kodunu gir → "Hesabın hazır" → Giriş Yap.
4. Aynı e-postayla ve sonra aynı telefonla tekrar kayıt dene → "Bu e-posta veya telefon zaten kayıtlı" (Review Focus 3).
5. Boş form gönder → her alanın altında hata; KVKK işaretsizken "Devam etmek için onay gerekli".

- [ ] **Adım 10: Commit**

```bash
git add web/src
git commit -m "feat(web): genisletilmis kayit formu ve dogrulama sayfasi"
```

---

### Görev 5: Frontend — iki adımlı giriş ve oturum durumu

> **2026-10-02 notu (e-posta tek kanal, spec §6):** 1. adım yalnızca e-posta + şifre (`auth.identifier` = "E-posta", telefon normalizasyonu girişte yok). 2. adımda kanallar `/api/auth/options`'tan gelir; yalnızca e-posta açıkken seçim ekranı atlanır ve kod doğrudan e-postaya istenir. `via: 'phone'` yolları, SMS ipucu ve Verification'dan gelen `state.via === 'phone'` bu görevde **yazılmaz**. Adım 5'teki elle doğrulamada SMS'e dair maddeler (1, 2, 5, 6) SMS açılana kadar atlanır. Aşağıdaki kod bu nota göre sadeleştirilerek uygulanır.

**Files:**
- Modify: `web/src/pages/Login.jsx` (yeniden yazılır)
- Modify: `web/src/contexts/AuthContext.jsx`
- Modify: `web/src/components/ProtectedRoute.jsx`
- Modify: `web/src/services/api.js`

**Interfaces:**
- Consumes: Görev 4'ün `toE164TR`, `createFlow`, `getFlow`, `submitFlow`, `AuthCard`, metin anahtarları.
- Consumes: `location.state` → `{ step: 'channel', via?: 'phone', refresh?: boolean }` (Verification ve ProtectedRoute gönderir), `{ registered: true }`.
- Produces: `useAuth()` → `{ session, loading, needs2fa, logout, setSession }`.
- Consumes (2026-10-02 eki): `GET /api/auth/options` → `{ mfaRequired, channels: { sms, email } }`. 2. adım ekranı yalnızca açık kanalları gösterir; tek kanal açıksa seçim adımı atlanır. 500 `auth_misconfigured` → kullanıcıya genel "giriş şu an yapılamıyor" mesajı. Bkz. [generic SMS spec](../specs/2026-10-02-generic-sms-sender-design.md) §4.5.

- [ ] **Adım 1: AuthContext — 2FA eksik durumu**

`web/src/contexts/AuthContext.jsx`'te `useEffect` bloğunu ve state'i şöyle değiştir:
```jsx
  const [session, setSessionRaw] = useState(null)
  const [needs2fa, setNeeds2fa] = useState(false)
  const [loading, setLoading] = useState(true)

  const setSession = (data) => {
    setSessionRaw(unwrapSession(data))
    setNeeds2fa(false)
  }

  useEffect(() => {
    // 403 + session_aal2_required: şifre adımı geçilmiş, 2FA kodu bekleniyor (AUTH_REQUIRED_AAL=aal2).
    fetch(`${KRATOS_URL}/sessions/whoami`, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) return setSessionRaw(unwrapSession(await res.json()))
        const body = await res.json().catch(() => null)
        setNeeds2fa(res.status === 403 && body?.error?.id === 'session_aal2_required')
      })
      .catch(() => setSessionRaw(null))
      .finally(() => setLoading(false))
  }, [])
```
ve Provider değerine `needs2fa` ekle:
```jsx
    <AuthContext.Provider value={{ session, loading, needs2fa, logout, setSession }}>
```

- [ ] **Adım 2: ProtectedRoute**

`web/src/components/ProtectedRoute.jsx`:
```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading, needs2fa } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">Loading...</div>
  if (needs2fa) return <Navigate to="/login" replace state={{ step: 'channel' }} />
  if (!session) return <Navigate to="/login" replace />
  return children
}
```

- [ ] **Adım 3: API 403 → doğrulama**

`web/src/services/api.js` → `const api = axios.create(...)` satırının altına:
```js
// Backend e-posta/telefon doğrulanmamış kullanıcıyı 403 verification_required ile reddeder (spec §9).
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 403 && error.response.data?.error === 'verification_required') {
    window.location.assign('/verification')
  }
  return Promise.reject(error)
})
```

- [ ] **Adım 4: Giriş sayfası**

`web/src/pages/Login.jsx` (tamamı):
```jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { kratosErrorText } from '../lib/authErrors'
import { authLabelCls, authInputCls, authSubmitCls } from '../lib/authStyles'
import { APP_NAME, KRATOS_URL } from '../lib/app'
import { createFlow, getFlow, submitFlow } from '../lib/kratos'
import { toE164TR } from '../lib/phone'
import { Eye, EyeOff } from 'lucide-react'
import AuthCard from '../components/AuthCard'

// Adımlar: 'password' → 'channel' (SMS / e-posta) → 'address' (gerekirse tam adres) → 'code'
export default function Login() {
  const { state } = useLocation()
  const [step, setStep] = useState(state?.step ?? 'password')
  const [flow, setFlow] = useState(null)       // şifre akışı
  const [mfaFlow, setMfaFlow] = useState(null) // AAL2 kod akışı
  const [identifier, setIdentifier] = useState(state?.address ?? '')
  const [address, setAddress] = useState('')
  const [hint, setHint] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    if (step !== 'password') return
    const flowId = searchParams.get('flow')
    if (flowId) getFlow('login', flowId).then(({ body }) => setFlow(body))
    else window.location.href = `${KRATOS_URL}/self-service/login/browser`
  }, [searchParams, step])

  // Verification sayfası telefonu doğrulatmak için doğrudan SMS kanalını ister.
  useEffect(() => {
    if (state?.via === 'phone') chooseChannel('phone', state.refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = (body) => {
    setSession(body)
    navigate('/overview')
  }

  const run = async (fn) => {
    setError(null)
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  const submitPassword = (e) => {
    e.preventDefault()
    run(async () => {
      const id = toE164TR(identifier) ?? identifier.trim()
      setIdentifier(id)
      const { ok, status, body } = await submitFlow('login', flow, { method: 'password', identifier: id, password })
      if (ok) return finish(body) // 2FA kapalı (AUTH_REQUIRED_AAL=aal1)
      if (status === 422 && body?.error?.id === 'browser_location_change_required') return setStep('channel')
      setError(kratosErrorText(body, t))
    })
  }

  const requestCode = async (f, addr) => {
    const { body } = await submitFlow('login', f, { method: 'code', identifier: addr })
    if (body?.state === 'sent_email') {
      setMfaFlow(body)
      setAddress(addr)
      setStep('code')
    } else {
      setError(kratosErrorText(body, t))
    }
  }

  const chooseChannel = (via, refresh = false) =>
    run(async () => {
      const { ok, body } = await createFlow('login', { aal: 'aal2', via, ...(refresh ? { refresh: 'true' } : {}) })
      if (!ok) return setError(kratosErrorText(body, t))
      setMfaFlow(body)
      // Adım 1'de yazılan aynı türdeyse tam adres elimizde; değilse Kratos'un maskeli ipucuyla sorulur.
      const known = via === 'phone' ? (identifier.startsWith('+90') ? identifier : '') : (identifier.includes('@') ? identifier : '')
      if (known) return requestCode(body, known)
      const node = body.ui.nodes.find((n) => n.attributes?.name === 'identifier')
      setHint(node?.messages?.[0]?.text ?? '')
      setStep('address')
    })

  const submitAddress = (e) => {
    e.preventDefault()
    run(() => requestCode(mfaFlow, toE164TR(address) ?? address.trim()))
  }

  const submitCode = (e) => {
    e.preventDefault()
    run(async () => {
      const { ok, body } = await submitFlow('login', mfaFlow, { method: 'code', identifier: address, code: code.trim() })
      if (ok) return finish(body)
      setError(kratosErrorText(body, t))
    })
  }

  const resend = () =>
    run(async () => {
      const { body } = await submitFlow('login', mfaFlow, { method: 'code', identifier: address, resend: 'code' })
      setMfaFlow(body)
    })

  const backToChannel = () => {
    setCode('')
    setStep('channel')
  }

  if (step === 'password' && !flow) {
    return (
      <div className="paper flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        {t('auth.redirecting')}
      </div>
    )
  }

  const linkBtn = 'mt-3 block text-ui text-muted-foreground underline underline-offset-4 hover:text-foreground'

  return (
    <AuthCard
      title={t('auth.signIn')}
      subtitle={step === 'password' ? `${APP_NAME} — ${t('auth.signInSubtitle')}` : t('auth.chooseChannel')}
      error={error}
      footer={step === 'password' && (
        <p className="mt-5 text-ui text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-foreground underline underline-offset-4 hover:opacity-70">{t('auth.createOne')}</Link>
        </p>
      )}
    >
      {state?.registered && step === 'password' && (
        <p className="mt-4 text-micro text-muted-foreground">{t('auth.verifyDone')}</p>
      )}

      {step === 'password' && (
        <form onSubmit={submitPassword} className="mt-1" noValidate>
          <label className={authLabelCls} htmlFor="login-identifier">{t('auth.identifier')}</label>
          <input id="login-identifier" type="text" autoComplete="username" value={identifier}
            onChange={(e) => setIdentifier(e.target.value)} placeholder="05XX… / you@example.com" className={authInputCls} />
          <label className={authLabelCls} htmlFor="login-password">{t('auth.password')}</label>
          <div className="relative">
            <input id="login-password" type={showPass ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${authInputCls} pr-10`} />
            <button type="button" onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}>
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button type="submit" disabled={loading || !identifier || !password} className={authSubmitCls}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
      )}

      {step === 'channel' && (
        <div className="mt-2">
          <button type="button" disabled={loading} onClick={() => chooseChannel('phone')} className={authSubmitCls}>{t('auth.viaSms')}</button>
          <button type="button" disabled={loading} onClick={() => chooseChannel('email')} className={authSubmitCls}>{t('auth.viaEmail')}</button>
        </div>
      )}

      {step === 'address' && (
        <form onSubmit={submitAddress} className="mt-1" noValidate>
          <label className={authLabelCls} htmlFor="login-address">{t('auth.enterAddress')}</label>
          {hint && <p className="mb-1.5 font-mono text-micro text-muted-foreground">{hint}</p>}
          <input id="login-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={authInputCls} />
          <button type="submit" disabled={loading || !address} className={authSubmitCls}>{t('auth.verify')}</button>
          <button type="button" onClick={backToChannel} className={linkBtn}>{t('auth.otherChannel')}</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={submitCode} className="mt-1" noValidate>
          <p className="mt-4 text-micro text-muted-foreground">{t('auth.codeSentTo')} <span className="font-mono text-foreground">{address}</span></p>
          {/* Kratos SMS'i kuyruktan asenkron gönderir: relay 429/502 dönse de bu ekran "gönderildi" der.
              Tavan dolduğunda kullanıcı takılmasın diye e-posta yolu her SMS'te hatırlatılır. */}
          {address.startsWith('+90') && <p className="mt-1 text-micro text-muted-foreground">{t('auth.smsHint')}</p>}
          <label className={authLabelCls} htmlFor="login-code">{t('auth.code')}</label>
          <input id="login-code" inputMode="numeric" autoComplete="one-time-code" value={code}
            onChange={(e) => setCode(e.target.value)} className={authInputCls} />
          <button type="submit" disabled={loading || !code} className={authSubmitCls}>{t('auth.verify')}</button>
          <button type="button" onClick={resend} className={linkBtn}>{t('auth.resend')}</button>
          <button type="button" onClick={backToChannel} className={linkBtn}>{t('auth.otherChannel')}</button>
        </form>
      )}
    </AuthCard>
  )
}
```

- [ ] **Adım 5: Lint, build, elle doğrulama**

```bash
cd web && npm run lint && npm run build && cd ..
docker compose up -d --build web
```
Görev 4'te kaydedilen kullanıcıyla `http://localhost/login`:
1. Telefonu `+90 532 000 00 02` yazıp şifreyle gir → kanal ekranı → **SMS** → kod adresi otomatik dolu, Mailpit'teki kodu gir → `/overview` (Review Focus 1).
2. Çıkış yap, **e-posta** ile gir → kanal ekranı → **SMS** seç → maskeli ipucu (`+90532••••002` benzeri) ve adres alanı çıkmalı → tam numarayı yaz → kod → `/overview`.
3. Kod ekranında yanlış kod → "Kod hatalı veya süresi dolmuş"; "Kodu tekrar gönder" → Mailpit'te yeni kod (Review Focus 4).
4. Kanal ekranındayken sayfayı yenile (F5) → yine kanal ekranı gelmeli; SMS/e-posta seçimi çalışmalı (Review Focus 5).
5. Tavan: `.env`'de `SMS_DAILY_LIMIT=0` → `docker compose up -d portfolio-service` → SMS seç → kod ekranı açılır, SMS ipucu satırı görünür, Mailpit'e SMS **düşmez**, `docker compose logs portfolio-service`'te "Günlük SMS tavanı doldu" → "Başka yöntem seç" → e-posta ile girilebilmeli (Review Focus 2). Sonra `SMS_DAILY_LIMIT=16`'ya geri al.
6. Doğrulanmamış telefon: yeni kayıtta yalnızca e-posta kodunu gir, SMS'i girmeden `/login` → e-posta kanalıyla gir → panel API'si 403 → `/verification` → "Telefonunu SMS koduyla doğrula" → kod → panel açılmalı. `refresh=true` ile AAL2 akışı Kratos'ta hata verirse DUR, kullanıcıya bildir (yedek: çıkış yapıp SMS kanalıyla tekrar giriş).
7. `.env`'de `AUTH_REQUIRED_AAL=aal1` → `docker compose up -d` → giriş kanal ekranına uğramadan `/overview`'a gitmeli. Geri al.

- [ ] **Adım 6: Commit**

```bash
git add web/src
git commit -m "feat(web): iki adimli giris (sifre + SMS/e-posta OTP)"
```

---

### Görev 6: Prod SMS sağlayıcısı ve prod yapılandırması

> **2026-10-02:** Sağlayıcıya özel gönderici (VatanSMS/SOAP) kaldırıldı. Kod tarafı generic REST göndericiyle tamamlandı ([generic SMS spec](../specs/2026-10-02-generic-sms-sender-design.md)); bu görevde kod yazılmaz.

- [ ] **Adım 1: Sağlayıcı seç ve API'sini kontrol et (kullanıcıyla)**

Sağlayıcının REST API dokümanından gönderim adresini, kimlik doğrulama biçimini ve JSON gövdesini çıkar. Generic spec §6'daki dört sınıra karşı kontrol et (form gövdesi, 200 + gövdede hata, numara biçimi, tek header). Biri gerekiyorsa DUR, kullanıcıyla `HttpSmsSender` eklemesini konuş.

- [ ] **Adım 2: Dev'de gerçek SMS denemesi (kısa süreli)**

Dev `.env`'de geçici olarak `SMS_URL`, `SMS_SENDER`, `SMS_AUTH_HEADER`, `SMS_AUTH_VALUE`, `SMS_BODY_TEMPLATE` sağlayıcının değerleriyle → `docker compose up -d portfolio-service` → Görev 1 Adım 8'in 1. curl komutunu **kendi numaranla** çalıştır. Beklenen: `200` ve telefona SMS. Sonra değerleri `.env.example`'daki Mailpit değerlerine geri al, `DELETE FROM "SmsDailyUsage";`.

- [ ] **Adım 3: Prod yapılandırması (kullanıcı yapar, adımlar burada)**

1. **Resend:** hesap aç → Domains → `assay.com.tr` ekle → verilen SPF/DKIM kayıtlarını Cloudflare DNS'e ekle (proxy kapalı, "DNS only") → doğrulanınca API Keys → "Sending access" anahtarı üret.
2. **Secrets Manager** `assay/prod/env` secret'ına anahtarları ekle (değerlerde tek tırnak olmamalı, `deploy.sh` reddeder):
   - `SMS_RELAY_API_KEY=<openssl rand -hex 32>`
   - `SMS_ENABLED=true`, `SMS_DAILY_LIMIT=16`
   - `SMS_URL`, `SMS_SENDER`, `SMS_AUTH_HEADER`, `SMS_AUTH_VALUE`, `SMS_BODY_TEMPLATE` (Adım 1'deki değerler)
   - `COURIER_SMTP_CONNECTION_URI=smtps://resend:<RESEND_API_KEY>@smtp.resend.com:465`
   - `COURIER_SMTP_FROM_ADDRESS=no-reply@assay.com.tr`
   - `AUTH_REQUIRED_AAL=aal2`, `AUTH_VERIFICATION_ENABLED=true`, `EMAIL_OTP_ENABLED=true`

---

### Görev 7: Dokümanlar ve veri temizliği

**Files:**
- Modify: `docs/30-operations/COMMANDS.md`
- Modify: `docs/10-standards/PIPELINE-SECURITY.md:44`

- [ ] **Adım 1: COMMANDS.md**

`## Redis (market cache)` başlığının hemen üstüne ekle:
````markdown
## Mailpit (dev e-posta + SMS kutusu)

Dev'de Kratos'un e-postaları ve SMS relay'inin SMS'leri gerçekten gönderilmez, Mailpit'e düşer.

```bash
# Arayüz: http://localhost:8025   (OTP kodları buradan okunur)
curl -s http://localhost:8025/api/v1/messages | python -m json.tool | head   # son mesajlar (otomasyon için)
```

## 2FA / doğrulama nasıl kapatılır

İki anahtar (spec: docs/superpowers/specs/2026-09-29-otp-2fa-register-design.md §10.1):
`AUTH_REQUIRED_AAL` (`aal2` açık · `aal1` OTP kapalı) ve `AUTH_VERIFICATION_ENABLED` (`true` / `false`).
`docker compose restart` YETMEZ — env container oluşturulurken sabitlenir; `up -d` yeniden oluşturur (build yok).

```bash
# Dev / lab: .env'i düzenle, sonra
docker compose up -d

# Prod: .env her deploy'da Secrets Manager'dan üretilir — sunucudaki .env'i elle düzenleme.
# 1) AWS konsolu → Secrets Manager → assay/prod/env → değeri değiştir
# 2) EC2'de, ŞU AN çalışan commit'le yeniden deploy (başka SHA vermek onaysız kod çıkarmak olur):
cd /opt/assay && IMAGE_TAG=$(git rev-parse HEAD) ./deploy/scripts/deploy.sh
```
Etkisi: yalnızca env'i değişen container'lar (kratos; doğrulama anahtarında ayrıca portfolio/market) birkaç saniye yeniden başlar. Oturumlar korunur.

## SMS kullanımı (günlük tavan)

```sql
-- portfolio DB (DB_CONNECTION_STRING)
SELECT * FROM "SmsDailyUsage" ORDER BY "Date" DESC LIMIT 14;   -- son 2 haftanın günlük SMS sayısı
```

## Kullanıcı verisini sıfırlama — GERİ ALINAMAZ

Tüm Kratos kullanıcılarını ve portföy verisini siler. Yalnızca bilinçli karar sonrası.

```bash
# Kratos kullanıcıları (admin API dışarı açık değil → compose ağı içinden)
KR="docker run --rm --network assay_default curlimages/curl -s"
for id in $($KR "http://kratos:4434/admin/identities?page_size=1000" \
    | python3 -c 'import json,sys;[print(i["id"]) for i in json.load(sys.stdin)]'); do
  $KR -X DELETE "http://kratos:4434/admin/identities/$id"
done
```
```sql
-- portfolio DB
DELETE FROM "Transactions";
DELETE FROM "Assets";
```
````

- [ ] **Adım 2: PIPELINE-SECURITY.md**

Satır 44'ü şununla değiştir:
```markdown
| **Şifre sıfırlama** | E-posta/SMS doğrulama ve 2FA 2026-09-29'da eklendi (courier: dev Mailpit, prod Resend). Hesap kurtarma (recovery) yolu hâlâ yok | Orta |
```

- [ ] **Adım 3: Commit**

```bash
git add docs/30-operations/COMMANDS.md docs/10-standards/PIPELINE-SECURITY.md
git commit -m "docs: Mailpit, 2FA acma/kapama, SMS kullanimi ve veri sifirlama komutlari"
```

- [ ] **Adım 4: Veri temizliği — KULLANICIDAN AÇIK ONAY AL, SONRA ÇALIŞTIR**

Prod'a yeni şema çıkmadan önce, **kullanıcı "sil" dedikten sonra**, COMMANDS.md'deki "Kullanıcı verisini sıfırlama" komutlarını ilgili ortamda çalıştır. Çalıştırmadan önce `GET /admin/identities` çıktısındaki kullanıcı sayısını kullanıcıya göster. Sonrasında sayının 0 olduğunu ve `SELECT count(*) FROM "Assets"` = 0 olduğunu göster.
