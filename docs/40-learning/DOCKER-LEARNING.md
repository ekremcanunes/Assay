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
COPY market-service.csproj ./
RUN dotnet restore
# ↑ bağımlılık katmanı: yalnızca .csproj değişince yeniden çalışır
COPY . .
RUN dotnet publish -c Release -o /publish --no-restore
# -c Release → production modu, optimize, debug sembolü yok
# -o /publish → çıktıyı bu klasöre yaz
# --no-restore → paketleri tekrar indirmeye çalışma, yukarıda indirildi

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
COPY package.json package-lock.json ./
RUN npm ci
# ↑ bağımlılık katmanı: yalnızca package*.json değişince yeniden çalışır
COPY . .
RUN npm run build
# npm ci → package-lock.json'daki sürümleri birebir kur (npm install değil, aşağıya bak)
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

## Build, Katman Önbelleği ve Volume'lar

### Katman önbelleği (layer cache) nasıl karar verir
- Dockerfile'daki her satır bir **katman**. Docker her build'de satır satır "girdisi değişti mi?" diye bakar.
- `COPY` satırında girdi, kopyalanan dosyaların **checksum**'ıdır (içerikten hesaplanan parmak izi). Aynıysa katman önbellekten gelir.
- Bir katman değiştiği anda **altındaki bütün satırlar** da yeniden çalışır.
- Kısmi önbellek yok: `.csproj`'a tek paket eklense bile `dotnet restore` **tüm** paketleri yeniden indirir. "Sadece farkı indir" diye bir ara yol yok.
- `dotnet publish` indirme yapmaz, **kodun tamamını** derler (sadece değişen dosyayı değil).

**Kural: az değişen üste, çok değişen alta.** Bağımlılık dosyası (`.csproj`, `package.json`) koddan önce kopyalanır.

| Ne değişti | `COPY *.csproj` | `dotnet restore` | `COPY . .` | `dotnet publish` |
|---|---|---|---|---|
| Hiçbir şey | cache | cache | cache | cache |
| Sadece `Program.cs` | cache | **cache (paket inmez)** | yeniden | yeniden, tüm kod |
| `.csproj`'a paket eklendi | yeniden | yeniden, **tüm** paketler | yeniden | yeniden, tüm kod |

> `.csproj` "paketleri yeniden indirmem gerekiyor mu?" sorusunu, kod "yeniden derlemem gerekiyor mu?" sorusunu cevaplar.

Ölçüm (kaynak dosya değiştirilip ikinci kez build edildi):

| Servis | İlk build | Kod değişince |
|---|---|---|
| web | `npm ci` 11.7 sn | CACHED |
| market-service | `dotnet restore` 13.2 sn | CACHED |
| portfolio-service | `dotnet restore` 23.3 sn | CACHED |

### .dockerignore
`COPY . .` sırasında image'a **gönderilmeyecek** dosyaların listesi. Yoksa klasördeki her şey build'e gider.

```
# web/.dockerignore            # market-service/.dockerignore, portfolio-service/.dockerignore
node_modules                   bin/
dist                           obj/
.env*                          .vs/
*.log                          *.user
```
- `node_modules` gitmezse web build context'i (Docker'a gönderilen klasör) yüzlerce MB yerine ~480 KB kalır.
- Windows'ta oluşmuş `obj/` içinde Windows yolları var; Linux build'ine karışırsa restore/publish bozulabilir.
- `.env*` image katmanına sır olarak gömülmez.

### npm ci vs npm install
- `package.json` → sürüm **aralıkları** (`^19.2.6` = 19.2.6 ≤ x < 20).
- `package-lock.json` → o aralığın çözüldüğü **kesin** sürümler (lock dosyası), alt bağımlılıklar dahil.

| | `npm install` | `npm ci` |
|---|---|---|
| Neye bakar | `package.json` aralıkları | `package-lock.json` kesin sürümleri |
| Lock dosyasını | gerekirse günceller | asla değiştirmez |
| İkisi uyuşmazsa | sessizce çözer | hata verip durur |
| `node_modules` | üzerine ekler | silip sıfırdan kurar |

- **Dockerfile / CI / yeni klon** → `npm ci`. Aynı commit her build'de aynı paketleri kurar (**reproducible build**).
- **Paket eklerken** → `npm install axios`, sonra güncellenen lock dosyası commit'lenir.
- .NET karşılığı varsayılan kapalı: `RestorePackagesWithLockFile` + `dotnet restore --locked-mode`.

### Multi-stage: son image'da ne kalır
- İkinci `FROM` **sıfırdan yeni bir image** başlatır; birinci aşamanın SDK'sı, kaynak kodu ve paket önbelleği taşınmaz.
- `COPY --from=build /publish .` → bilgisayardan değil, `build` aşamasının içinden kopyalar. İki aşamayı bağlayan tek satır.
- Sonuç: `assay-portfolio-service` ~343 MB, içinde derleyici ve kaynak kod yok (daha küçük push/pull, daha az saldırı yüzeyi).
- `RUN` → image **kurulurken** çalışır, sonucu katmana yazılır. `CMD` → container **başlatılırken** çalışır.

### Volume türleri
Container silinince içine yazılanlar gider. Kalıcı olması gereken şey container dışında bir yere bağlanır (**mount**).

| | Named volume | Bind mount | Anonymous volume |
|---|---|---|---|
| Compose'da | `kratos_postgres_data:/var/lib/postgresql/data` | `./kratos:/etc/config/kratos` | yazılmaz; image'daki `VOLUME` satırı açar |
| Sol taraf | düz **isim** | **yol** (`./` veya `/` ile başlar) | — |
| Nerede durur | Docker'ın volume deposu | proje klasörü | Docker'ın volume deposu, rastgele isimle |
| Alttaki `volumes:` bölümüne yazılır mı | **evet, zorunlu** | hayır | hayır |
| Kim yazar | uygulama (Postgres) | siz (editörde) | uygulama |

- Alttaki `volumes:` bölümü **yalnızca named volume** tanımlar. Bind mount'un yolu zaten diskte var, tanım gerekmez.
- Compose, named volume adının başına proje adını ekler: `name: assay` → `assay_kratos_postgres_data`. Proje adı değişirse eski volume geride kalır, yenisi boş açılır.
- `oryd/kratos` image'ı `/home/ory` ve `/var/lib/sqlite` için `VOLUME` tanımlıyor → `kratos` ve `kratos-migrate` container'larının her birine ikişer isimsiz volume açılıyor.
- `redis:alpine` container'ında hiç mount yok → `/data` container katmanında, container silinince gider.
- Bir volume'un sahibini bulmak: `docker ps -a --filter volume=<ad>`

**Container silinince ne kalır:**

| Ne | Nasıl girdi | `down` sonrası | `down -v` sonrası |
|---|---|---|---|
| Uygulama kodu | `COPY` (image) | image'da durur | image'da durur |
| Container içine sonradan yazılanlar (Redis `/data`) | container katmanı | **silinir** | silinir |
| `kratos/kratos.yml` | bind mount | diskte kalır | diskte kalır |
| Kullanıcı kayıtları | named volume | kalır | **silinir** |
| Kratos çalışma dizinleri | anonymous volume | kalır | silinir |

> `down -v` kullanıcı kayıtlarını siler. Temizlik yaparken volume'lara dokunan komutları (`down -v`, `volume prune`) ayrı düşün.

### Container'ın içi: her dizin başka yerde durur
Container içinden tek bir Linux dosya sistemi görünür; gerçekte parçalar farklı yerlerden gelir (`kratos` container'ı):

| Container'ın gördüğü | Gerçekte durduğu yer |
|---|---|
| `/usr/bin/kratos`, `/bin`, `/lib` … | image katmanları (salt okunur) |
| `/etc/config/kratos/` | bind mount → proje klasöründeki `kratos/` |
| `/home/ory`, `/var/lib/sqlite` | anonymous volume |
| container'ın kendi yazdıkları | yazılabilir katman (`down` ile gider) |

`docker diff <container>` yazılabilir katmandaki değişiklikleri gösterir: `A` eklendi, `C` değişti, `D` silindi.

### Kod image'ın içinde: `--build` ne zaman gerekir
Bu projede kod `COPY` ile image'a **gömülü**, container'a bağlı değil. Kod değiştiyse `--build` şart; yoksa container eski image'daki eski kodla çalışır.

| Durum | Komut |
|---|---|
| Kod değişti | `docker compose up -d --build` |
| Tek servisin kodu değişti | `docker compose up -d --build portfolio-service` |
| Hiçbir şey değişmedi, kapalı servisleri aç | `docker compose up -d` |
| `kratos/kratos.yml` değişti (bind mount) | `docker compose restart kratos` |
| `web/nginx.conf` ya da `web/public/*` değişti (`COPY` ile giriyor) | `docker compose up -d --build web` |

- Katman önbelleği sayesinde değişiklik yokken `--build` birkaç saniye sürer. Ortaya çıkan image aynıysa compose container'ı **yeniden oluşturmaz**, kesinti olmaz.
- "Her seferinde `--build` gerekmez" tavsiyesi farklı bir kurulumu varsayar: kod bind mount ile bağlı + hot reload (`dotnet watch`, `vite`). Bunun yolu bir **override dosyası**dır (`docker-compose.dev.yml`: ana compose'un üzerine yalnızca dev'de eklenen, ayarları ezen ikinci dosya). Bedeli: dev ile prod farklı image'la çalışır.
- Web için en hızlı döngü Docker'sız: `web/` içinde `npm run dev`.

### Derlenen kod: diskte o an ne varsa
- Build context, **komutun çalıştırıldığı klasör**dür. Docker git'e bakmaz, dosyalara bakar.
- Stack WSL'deki `~/assay` klasöründen çalışıyor ve orası **ayrı bir git kopyası**. Windows'taki değişiklik push + `git pull` ile oraya gelmeden ne build'e girer ne de bind mount'a yansır.
- O klasörde commit'lenmemiş bir değişiklik varsa o da derlenir.
- Container'ın hangi klasörden başlatıldığını görmek:
  `docker inspect <container> --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'`

### Disk temizliği
```bash
docker system df            # image, container, volume ve build cache ne kadar yer tutuyor
docker image prune -f       # dangling image'ları siler
docker builder prune -f     # kullanılmayan build önbelleğini siler
docker image rm <ad>        # isimli ama kullanılmayan image'ı siler
```
- **Dangling image:** aynı isimle yeni image kurulunca isimsiz (`<none>`) kalan eskisi. Çalışan bir container kullanıyorsa `prune` onu silmez.
- Asıl yer kaplayan çoğu zaman build cache: bir temizlikte 6.47 GB → 524 MB (5.95 GB açıldı). Kalan kısım o sırada çalışan build'in kullandığıydı.
- Proje yeniden adlandırılınca eski `investment-tracker-*` image'ları **isimli** olduğu için dangling sayılmaz; `prune` silmez, `docker image rm` gerekir.
- `builder prune` sonrası ilk build yavaştır (önbellek sıfırlandı), sonrakiler yine hızlanır.

**`docker images` çıktısı (yeni Docker sürümleri):**
- `DISK USAGE` → diskte açılmış hali. `CONTENT SIZE` → sıkıştırılmış içerik, push/pull'da taşınan miktar (ör. 343 MB ↔ ~96 MB).
- `EXTRA` sütununda `U` → **In Use**: bu image'dan oluşturulmuş en az bir container var. `U` olmayan image silinebilir.

### CI/CD'de build
- **CI** (sürekli entegrasyon): her push'ta kodu temiz bir makinede otomatik derleyip test/tarama yapmak. **CD**: CI'ın ürettiğini ortama dağıtmak.
- Doğru akış: CI'da image **bir kez** build → commit SHA'sıyla **tag** → **registry**'ye push → sunucuda `docker compose pull && up -d`. Sunucu derlemez.
- Test'te denenen image ile prod'a çıkan image byte byte aynıdır; "hangi kod çalışıyor" sorusunun cevabı tag'deki SHA.
- Her commit sonrası otomatik build için post-commit hook kurmak önerilmez: commit ≠ çalışır durum, yarım commit ortamı bozar.

### İnceleme komutları
```bash
docker inspect <container> --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}'
docker exec <container> ls -1 /etc/config/kratos   # container'ın içinden dizin listesi
docker diff <container>                            # yazılabilir katmandaki değişiklikler
docker history <image>                             # image hangi katmanlardan oluşuyor, kaç MB
docker volume ls                                   # tüm volume'lar
docker ps -a --filter volume=<ad>                  # volume'u hangi container kullanıyor
docker ps --filter label=com.docker.compose.service=kratos   # compose servis adıyla container bul
```

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
**Çözüm:** WSL'deki `~/assay` bir git kopyası. Değişikliği commit'le ve push et; WSL'de `git pull`, sonra `docker compose up -d --build`. (`test` branch'ine push, `wsl-deploy.yml` ile bunu otomatik yapar.) Eski yöntem `cp` ile elle kopyalamaktı.

### Favicon / nginx.conf değişikliği yansımadı
**Sorun:** `web/public/favicon.svg` değiştirildi ama sekmede eski logo durdu; container içindeki dosya hâlâ eskiydi.
**Neden:** `public/` ve `nginx.conf` build sırasında `COPY` ile image'a giriyor; ayrıca değişiklik henüz WSL kopyasına gelmemişti.
**Çözüm:** WSL kopyasına getir → `docker compose up -d --build web` → tarayıcıda `Ctrl+F5` (tarayıcılar favicon'u agresif önbelleğe alır).

### Dosya "farklı" görünüyor ama değil
**Sorun:** `diff` Windows'taki ve WSL'deki `kratos.yml` için "differ" dedi.
**Neden:** Yalnızca satır sonları farklı: Windows CRLF, Linux LF.
**Çözüm:** `diff --strip-trailing-cr a b` ile karşılaştır; çıkış kodu 0 ise içerik aynı.

### PowerShell'den WSL'e komut gönderirken tırnaklar bozuluyor
**Sorun:** `wsl -e bash -c "... '{{.Names}}' ..."` → `unexpected EOF while looking for matching`.
**Neden:** PowerShell ve bash tırnakları iki kez yorumluyor.
**Çözüm:** Komutları bir `.sh` dosyasına yaz, `wsl -e bash /mnt/c/.../script.sh` ile çalıştır. Basit komutlarda tırnaksız `wsl -e docker ps` yeterli. Docker Windows PATH'inde yok, yalnızca WSL içinde.
