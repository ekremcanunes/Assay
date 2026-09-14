# Loglama Standardı

Bu doküman bağlayıcıdır. Log yazan veya log altyapısına dokunan her değişiklik buna uyar.

## 1. Temel Kural

> **Servis stdout'a yazar. Logun nereye gideceğine platform karar verir.**

Uygulama kodu dosya yolu, rotasyon, CloudWatch veya herhangi bir log hedefi bilmez. Yalnızca `ILogger` ile olay üretir; Serilog bunu stdout'a basar; oradan sorumluluk Docker'a ve (prod'da) AWS'ye geçer.

Bu kural taşınabilirliği sağlar: EC2 → ECS → EKS geçişlerinde **uygulama kodunda tek satır değişmez**, yalnızca altyapı konfigürasyonu değişir. ([12-Factor App XI: Logs as event streams](https://12factor.net/logs))

**Yasak:** Uygulamadan dosyaya log yazmak (`WriteTo.File`), log dosyası yolu konfigüre etmek, log rotasyonunu uygulama içinde çözmeye çalışmak.

## 2. Format

- **Container'da (Development dışı):** `CompactJsonFormatter` ile tek satır JSON. Makine tarafından ayrıştırılabilir; CloudWatch'ta alan bazlı sorgulanır (`{ $.Symbol = "AAPL" }`).
- **Lokal `dotnet run` (Development):** Okunabilir düz metin. Geliştirici deneyimi için bilinçli istisna; container'a çıkan hiçbir ortamı etkilemez.

Seçim `Program.cs` içinde `builder.Environment.IsDevelopment()` ile yapılır.

JSON logu terminalde okumak için: `docker compose logs market-service | jq`

## 3. Seviye Politikası

| Ortam | Seviye | Gerekçe |
|-------|--------|---------|
| Lokal geliştirme | `Information` | Teşhis kolaylığı, maliyet yok |
| Test / lokal compose | `Information` | Hata ayıklama ihtiyacı yüksek, hacim sınırlı |
| **Prod (AWS)** | **`Warning`** | Maliyetin ana kalemi ingest edilen satır sayısıdır |

Prod'da `Information` **kalıcı olarak açık bırakılmaz**. Sorun analizi için geçici açılır, iş bitince geri alınır.

**İstisna — istek logu.** Prod `Warning` iken `UseSerilogRequestLogging()`'in ürettiği satır (`Information`) de düşerdi; o zaman elde yalnızca 5xx veren istekler kalır, "çalışıyor ama yavaş" durumu görünmez. Bu yüzden `appsettings.json`'da yalnızca o kaynak geri açılmıştır:

```json
"Serilog.AspNetCore.RequestLoggingMiddleware": "Information"
```

Kapsamı istek başına tek satırdır (§4); uygulamanın geri kalan `Information` logları prod'da kapalı kalır. **Bu override silinmez** — silinirse prod'da trafik ve süre görünürlüğü tamamen kaybolur.

### Seviye nasıl değiştirilir

Deploy gerektirmez — `.env` dosyasındaki üç ayrı kadran ile. Her biri farklı bir log kümesini yönetir; **tek bir kadran hepsini birden açmaz**:

| Değişken | Kapsam | Varsayılan | Ne zaman açılır |
|----------|--------|------------|-----------------|
| `LOG_LEVEL` | Uygulamanın kendi logları (`Default`) | `Information` | Prod'da `Warning`; kendi kodunun akışını izlerken `Debug` |
| `LOG_LEVEL_FRAMEWORK` | `Microsoft`, `System` | `Warning` | ASP.NET pipeline / HttpClient teşhisi |
| `LOG_LEVEL_EFCORE` | `Microsoft.EntityFrameworkCore` (portfolio-service) | `Warning` | Üretilen SQL'i görmek gerektiğinde |

Karşılığı ortam değişkenleri (`docker-compose.yml`'de bağlıdır, AWS'de aynı isimlerle set edilir):

```bash
Serilog__MinimumLevel__Default=Warning
Serilog__MinimumLevel__Override__Microsoft=Warning
Serilog__MinimumLevel__Override__Microsoft.EntityFrameworkCore=Warning
```

**Neden ayrı kadranlar:** `Default` yalnızca kendi loglarını etkiler, `Override` altındakileri **hareket ettirmez**. `LOG_LEVEL=Debug` yazıp EF Core'un SQL'ini beklemek boşunadır; o `LOG_LEVEL_EFCORE` ile açılır. EF'in ayrı tutulmasının sebebi hacimdir — HTTP teşhisi için framework'ü açarken her SQL sorgusunu da loglamak zorunda kalmazsın.

**Üç uyarı:**

1. **Geçersiz değer servisi çökertir.** Serilog seviye adını büyük/küçük harf duyarsız çözer (`warning` çalışır) ama tanımadığı bir kelimede (`info`, `verbose` değil de yazım hatası) `InvalidOperationException` fırlatır ve uygulama hiç ayağa kalkmaz. Geçerli değerler: `Verbose`, `Debug`, `Information`, `Warning`, `Error`, `Fatal`.
2. **`LOG_LEVEL_FRAMEWORK=Information` query string'i loglamaya başlar.** ASP.NET'in kendi `Request starting ... {QueryString}` satırı geri gelir; §4'ün hassas veri yasağıyla çakışır. Teşhis bitince `Warning`'e geri alınır, prod'da açık bırakılmaz.
3. **Başlangıç satırları kadranlardan etkilenmez.** `Microsoft.Hosting.Lifetime` `appsettings.json`'da `Information`'a sabitlenmiştir (daha spesifik `Override` kazanır); `LOG_LEVEL_FRAMEWORK=Error` yapsan bile "Now listening on / Application started" satırları düşmeye devam eder. Bu kasıtlıdır — servisin ayağa kalktığını görmek her ortamda gerekir.

### Gürültü bastırma (`Override`)

`appsettings.json` içinde framework ad alanları `Warning`'e sabitlenmiştir:

- `Microsoft`, `System` — her iki serviste
- `Microsoft.EntityFrameworkCore` — portfolio-service'te (her SQL sorgusunu `Information` seviyesinde loglar, hacmin başlıca kaynağıdır)

Yeni bir gürültülü kütüphane fark edilirse çözüm seviyeyi global düşürmek değil, o ad alanı için `Override` eklemektir.

## 4. Ne Loglanır, Ne Loglanmaz

**Loglanır:**
- Dış servis hataları (Yahoo/TwelveData/Frankfurter erişilemedi, rate limit)
- İş kuralı ihlalleri ve beklenmeyen durumlar (`Warning`+)
- HTTP istekleri — `UseSerilogRequestLogging()` ile **istek başına tek satır** (method, path, status, süre). Framework'ün varsayılan 3-4 satırlık dağınık request logu yerine geçer; hem okunabilir hem daha az hacim.

**Loglanmaz (asla):**
- Şifre, token, session cookie, API anahtarı
- Kullanıcının tam portföy içeriği veya finansal pozisyonu
- Kişisel veri (e-posta dahil) — kullanıcı ayrımı gerekiyorsa Kratos identity ID kullanılır

**Döngü içinde loglama yapılmaz.** N sembol için N log satırı yerine tek özet satır yazılır (`"{Count} sembol için fiyat alınamadı"`).

## 5. Yapılandırılmış Log Yazımı

Mesajı string birleştirme ile kurma — **şablon + parametre** kullan. Parametreler JSON'da ayrı alan olur ve sorgulanabilir:

```csharp
// DOĞRU — Symbol ve StatusCode CloudWatch'ta filtrelenebilir alan olur
_logger.LogWarning("Fiyat alınamadı {Symbol}, kaynak yanıtı {StatusCode}", symbol, response.StatusCode);

// YANLIŞ — tek düz metin, filtrelenemez
_logger.LogWarning($"Fiyat alınamadı {symbol}, kaynak yanıtı {response.StatusCode}");
```

Bir istek boyunca tüm loglara ortak alan eklemek için `LogContext` kullanılır:

```csharp
using (LogContext.PushProperty("UserId", userId))
{
    // bu scope'taki her log satırında UserId alanı bulunur
}
```

## 6. Docker Log Rotasyonu

`docker-compose.yml` içinde `x-logging` anchor'ı ile **tüm servislere** uygulanır:

```yaml
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Rotasyon nedir:** Log dosyası 10 MB'a ulaşınca kapatılır, yenisi açılır; en fazla 3 dosya tutulur, dördüncü gerektiğinde en eski silinir. Container başına üst sınır **30 MB**. Rotasyon tanımlanmazsa dosya container yaşadıkça sınırsız büyür ve diski doldurur.

Yeni bir servis eklendiğinde `logging: *default-logging` satırı eklenmesi zorunludur.

## 7. AWS'ye Geçiş

İlk hedef: **EC2 + docker compose**. Bu yapıda uygulama tarafında değişiklik gerekmez, yalnızca aşağıdakiler kurulur:

1. **Log driver'ı `awslogs`'a çevir** (veya CloudWatch agent kur). `json-file` yerine loglar doğrudan CloudWatch Logs'a akar.
2. **Retention süresi ZORUNLU olarak set edilir.** CloudWatch log grubunun varsayılanı "süresiz saklama"dır ve **faturanın kontrolsüz şişmesinin bir numaralı sebebi budur**. Öneri: 30 gün (test), 90 gün (prod).
3. **Seviye `Warning`** — `Serilog__MinimumLevel__Default=Warning`.
4. **Bütçe alarmı** kurulur (CloudWatch Billing Alarm), log ingest beklenmedik artarsa haber verir.
5. Uzun süre saklanması gerekenler için S3'e export + Glacier yaşam döngüsü değerlendirilir (CloudWatch'ta saklamaktan belirgin ucuzdur).

ECS/Fargate'e geçilirse: task definition'da `awslogs` log driver'ı tanımlanır; yine uygulama kodu değişmez.

## 8. Kontrol Listesi (yeni servis eklerken)

- [ ] `Serilog.AspNetCore` paketi eklendi
- [ ] `Program.cs`'te `AddSerilog(...)` + `UseSerilogRequestLogging()` var
- [ ] `appsettings.json`'da `Serilog:MinimumLevel` bölümü var, eski `Logging:LogLevel` bölümü **yok**
- [ ] `docker-compose.yml`'de servise `logging: *default-logging` eklendi
- [ ] `docker-compose.yml`'de servise `Serilog__MinimumLevel__*` kadranları eklendi (bkz. §3)
- [ ] Servis dosyaya log yazmıyor, yalnızca stdout'a

## 9. Ek — `docker-compose.yml` sözdizimi

| Sözdizimi | Katman | Anlamı |
|-----------|--------|--------|
| `x-logging:` | Compose | "Bu anahtarı yok say" — tanımı barındıracak yer |
| `&ad` | YAML | Değeri etiketle (tanımla) |
| `*ad` | YAML | Etiketlenen değeri buraya genişlet (kullan) |
