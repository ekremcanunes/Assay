# Docker & Auth Öğrenim Notları

## Temel Kavramlar

### Image vs Container
- **Image** → Tarif. Dockerfile'dan build edilir. Çalışmaz, sadece şablondur.
- **Container** → Çalışan kopya. Image'dan oluşturulur. Birden fazla container aynı image'dan çalışabilir.

### Dockerfile
Her satır bir katman (layer) oluşturur. Docker bu katmanları cache'ler — değişmeyen katmanlar tekrar build edilmez.

```dockerfile
FROM        # Hangi image'dan başla (base image)
WORKDIR     # Container içinde çalışma dizini oluştur ve gir
COPY        # Dosyaları host'tan container'a kopyala
RUN         # Build sırasında komut çalıştır (sonuç image'a işlenir)
CMD         # Container başladığında çalışacak komut
```

### Multi-Stage Build
Büyük build araçlarını (SDK, Node) production image'ına taşımamak için kullanılır.

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /publish
# -c Release → production modu, optimize, debug sembolü yok
# -o /publish → çıktıyı bu klasöre yaz

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /publish .
CMD ["dotnet", "market-service.dll"]
# CMD array formatı → shell olmadan direkt çalıştır, sinyaller düzgün iletilir
```

```dockerfile
# Web için (React + Nginx)
# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build
# npm install → bağımlılıkları kur
# npm run build → /app/dist klasörüne statik dosyalar üretir

# Stage 2: Runtime
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# CMD yazmıyoruz — nginx image kendi CMD'sini taşıyor
```

### Image Tag — Neden Önemli?
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk        # latest → tehlikeli, her build farklı versiyon gelebilir
FROM mcr.microsoft.com/dotnet/sdk:9.0    # sabit versiyon → güvenli, tekrarlanabilir
```
`latest` tag'i kullanmak: her `docker compose up --build` farklı bir .NET versiyonu getirebilir.

### CMD: Shell Form vs Exec Form
```dockerfile
CMD dotnet app.dll              # shell form → /bin/sh üzerinden çalışır, sinyal iletimi bozuk
CMD ["dotnet", "app.dll"]       # exec form → direkt çalışır, docker stop düzgün çalışır
```

---

## Docker Networking

### Container İletişimi
- Container'lar birbirini **servis adıyla** bulur, IP ile değil.
- `docker-compose.yml`'de her servis adı otomatik DNS kaydı olur.
- `portfolio-service` → `market-service`'e `http://market-service:5002` ile erişir.
- `portfolio-service` → `kratos`'a `http://kratos:4433` ile erişir.

### 0.0.0.0 vs localhost
```
localhost   → sadece kendi container'ı dinler, dışarıdan erişilemez
0.0.0.0     → tüm arayüzleri dinler, dışarıdan erişilebilir
```

### Port Expose Zinciri
```
Windows tarayıcı → localhost:5001
→ WSL2 otomatik forward
→ Docker port binding (ports: 5001:5001)
→ Container 0.0.0.0:5001
→ Uygulama
```

### Web Container Farkı
React uygulaması **tarayıcıda** çalışır, container içinde değil.
`api.js`'teki `localhost:5001` → kullanıcının makinesinin 5001 portunu kasteder → expose edildiği için çalışır.

### Nginx ve React Router
Nginx statik dosya sunucu olarak çalışır. React Router client-side routing yapar.
Sorgu doğrudan Nginx'e gelince (örn. `/login` URL'ine tarayıcıdan girilince) Nginx dosya arar, bulamaz — 404.

Çözüm: `nginx.conf`'ta `try_files` ile her isteği `index.html`'e yönlendir:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## Docker Compose

### Environment Variables
```yaml
environment:
  - ASPNETCORE_URLS=http://0.0.0.0:5001     # UseUrls'ü ezer
  - ASPNETCORE_ENVIRONMENT=Production
  - ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING}  # .env'den okur
  - Kratos__BaseUrl=http://kratos:4433       # servis adıyla erişim
```

`.env` dosyası compose ile aynı klasörde olmalı. Hassas bilgiler buraya, gitignore'a ekli.

### depends_on
```yaml
depends_on:
  postgres:
    condition: service_healthy   # postgres hazır olana kadar bekle
  kratos-migrate:
    condition: service_completed_successfully  # migration bitene kadar bekle
```

### healthcheck
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U kratos"]
  interval: 5s
  timeout: 5s
  retries: 5
```
Servisin gerçekten hazır olduğunu kontrol eder. `depends_on` ile birlikte kullanılır.

### appsettings Hiyerarşisi (.NET)
1. `appsettings.json` → default değerler, commit'lenebilir
2. `appsettings.Development.json` → yerel credentials, gitignore'da
3. Environment variables → compose'dan gelir, appsettings'i ezer

---

## Kimlik Doğrulama Kavramları

### Session vs JWT
```
Session → her istekte DB sorgusu gerekir, microservice'te hangi servis tutar?
JWT     → token içinde bilgi var, DB sorgusu gerekmez, her servis doğrulayabilir
```

### OAuth2
Yetkilendirme protokolü — "şu kaynağa erişebilir misin?"
Token'ların nasıl alınıp verileceğinin kuralları.

### OIDC (OpenID Connect)
OAuth2 üzerine kimlik doğrulama katmanı — "sen kimsin?"
JWT tabanlı ID Token döner: kullanıcı adı, email, id.

### SAML vs OIDC
| | SAML | OIDC |
|---|---|---|
| Format | XML, ağır | JSON/JWT, hafif |
| Dönem | 2002, kurumsal | 2014, modern web |
| Mobil | Desteklemez | Destekler |

### Identity Provider (IdP)
Kratos, Keycloak, Auth0, Google — token üretme işini bunlar yapar.
Senin uygulamaN sadece "bu token geçerli mi?" diye sorar.

---

## Ory Kratos

### Ne yapar?
- Kayıt, giriş, çıkış, şifre sıfırlama — hepsi hazır API
- Kendi UI'ını kendin yazarsın
- Cookie tabanlı session kullanır

### Self-Service Flow Mantığı
Kratos her işlem için bir "flow" başlatır:

```
1. GET /self-service/login/browser → Kratos flow oluşturur, ?flow=xxx ile UI'a yönlendirir
2. GET /self-service/login/flows?id=xxx → Frontend form alanlarını alır (csrf_token dahil)
3. POST /self-service/login?flow=xxx → Kullanıcı formu submit eder
4. Kratos cookie set eder → session başlar
```

### Whoami
Her API isteğinde backend Kratos'a sorar: "bu cookie'nin sahibi kim?"
```
GET /sessions/whoami → { identity: { id: "uuid", traits: { email: "..." } } }
```

### Port Yapısı
```
4433 → public API (frontend erişir)
4434 → admin API (backend veya araçlar erişir, dışarıya kapatılabilir)
```

### CORS — credentials ile zorunlu kural
Cookie tabanlı auth kullanıyorsan:
- Frontend: `credentials: 'include'` veya axios'ta `withCredentials: true`
- Backend CORS: `AllowAnyOrigin()` çalışmaz, `WithOrigins("http://localhost").AllowCredentials()` gerekir
- Kratos config'de de `cors.allowed_origins` doğru set edilmeli

---

## Karşılaşılan Sorunlar ve Çözümler

### UseUrls localhost sorunu
**Sorun:** `builder.WebHost.UseUrls("http://localhost:5001")` container dışından erişilmesini engeller.
**Çözüm:** `ASPNETCORE_URLS=http://0.0.0.0:5001` environment variable ile ez.

### latest tag versiyonu
**Sorun:** `FROM dotnet/sdk` → .NET 10 geldi, proje .NET 9 ile yazılmış, uyumsuzluk.
**Çözüm:** `FROM dotnet/sdk:9.0` ile sabit versiyon kullan.

### Port çakışması
**Sorun:** WSL2'de Redis servisi 6379'u tutuyordu, Docker Redis container'ı başlayamadı.
**Çözüm:** `sudo service redis-server stop`

### Network dışı container
**Sorun:** Redis container eski network'te kaldı, yeni container'lar onu bulamadı.
**Çözüm:** `docker compose down && docker compose up` — her şeyi sıfırlar.

### Nginx 404 — React Router
**Sorun:** `/login` gibi route'lara direkt URL ile girilince Nginx dosya arar, bulamaz.
**Çözüm:** `nginx.conf`'ta `try_files $uri $uri/ /index.html` ekle.

### Kratos cipher secret uzunluğu
**Sorun:** `secrets.cipher` değeri tam 32 karakter olmalı, fazlası hata verir.
**Çözüm:** `kratos.yml`'de cipher değerini tam 32 karakter yap.

### WSL2 senkronizasyon
**Sorun:** Windows'ta düzeltilen dosya WSL2'ye otomatik yansımaz.
**Çözüm:** Her değişiklikten sonra `cp` ile WSL2'ye kopyala, sonra `docker compose up --build`.
