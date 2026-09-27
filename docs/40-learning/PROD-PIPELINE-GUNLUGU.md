# Prod Pipeline Günlüğü (2026-09-26/27)

Assay'i prod'a hazırlarken alınan kararlar, yaşanan olaylar ve kök nedenleri. Bağlayıcı değil, öğrenme ve geçmiş kaydı. Plan: [`../superpowers/plans/2026-09-08-prod-pipeline.md`](../superpowers/plans/2026-09-08-prod-pipeline.md) (Task 9). Standart: [`../10-standards/PIPELINE-SECURITY.md`](../10-standards/PIPELINE-SECURITY.md).

Başka projelere taşınabilir genel AWS dersleri (kimlikler, Secrets Manager, SSM, OIDC, CodePipeline davranışları) repo dışında: `Desktop/aws/07-cicd/PIPELINE-TASARIM-DERSLERI.md`.

---

## 1. Durum tablosu (2026-09-27)

| Adım | Durum |
|---|---|
| Ölü yerel `postgres` servisini compose'dan kaldırmak | ✅ |
| Kratos sırlarını `.env`/Secrets Manager'dan okumak | ✅ |
| Secrets Manager `assay/prod/env` (Frankfurt, 5 key) | ✅ |
| EC2 rolüne yalnızca bu secret'ı okuma izni | ✅ EC2'den doğrulandı |
| Compose: imaj ECR'dan, build sadece dev override'da | ✅ |
| `deploy/scripts/deploy.sh` | ✅ yazıldı ve yerelde test edildi, EC2'de henüz çalışmadı |
| SSM (Fleet Manager Online, Session Manager) | ✅ |
| EC2'de repo `/opt/assay` (`main-prod`) | ✅ |
| SNS `assay-deploy-approval` + e-posta aboneliği | ✅ |
| İlk `build-push.yml` çalışması → 3 imaj ECR'da | ✅ OIDC düzeltmesinden sonra (§7) |
| **Pipeline tetikleme tasarımı** | ⏳ Karar bekliyor (§8) |
| Domain + HTTPS, Kratos URL'leri, `--dev` kaldırma | ⬜ Task 8 |

---

## 2. Compose temizliği ve kavramlar

**Ölü postgres servisi kaldırıldı.** Kratos ve portfolio-service Neon'a bağlanıyordu. Yerel `postgres` container'ı hiç kullanılmıyordu, ama `kratos` ve `kratos-migrate` onun healthcheck'ini beklediği için gereksiz bir açılış gecikmesi yaratıyordu.

**Volume türleri:**
- **Named volume** (`kratos_postgres_data`): Docker'ın yönettiği kalıcı disk alanı; container silinse de veri kalır. Kalıcı veri tutan tek servis postgres olduğu için sadece orada vardı. Diğer servisler **stateless**: kendi içlerinde kalıcı veri tutmuyorlar, veri Neon'da, cache Redis'te duruyor.
- **Bind mount** (`./kratos:/etc/config/kratos`): Host'taki bir klasörü container'a bağlar. Burada veri değil **config** taşınıyor. Yol, compose dosyasının bulunduğu klasöre göre çözülüyor. Bu yüzden **`kratos/` klasörü EC2'de de bulunmak zorunda**: Kratos resmi imajla çalışıyor ve bizim config'imiz o imajın içinde yok.

**appsettings katmanları (.NET):** `appsettings.json` iki ortamda da okunan **taban katman**. Ortam değişkenleri bunun üstüne yazıyor: `TwelveData__ApiKey` değişkenindeki `__`, .NET'te `:` anlamına geliyor ve `TwelveData:ApiKey` değerini eziyor. `"ApiKey": ""` bilerek boş bırakılmış bir yer tutucu. Sırların kaynağı ortama göre değişiyor: Docker'da `.env`, prod'da Secrets Manager, `dotnet run`'da `appsettings.Development.json`.

---

## 3. Kratos

**Sırlar env ile ezildi.** `kratos.yml`'deki `PLEASE-CHANGE-ME...` örnek değerleri repoda açık duruyordu. Compose'a şu satırlar eklendi:
```yaml
SECRETS_COOKIE_0: ${KRATOS_SECRETS_COOKIE}
SECRETS_CIPHER_0: ${KRATOS_SECRETS_CIPHER}
```
- **Söz dizimi denenerek doğrulandı:** Kratos'a bilerek 5 karakterlik bir cipher verildi, "en az 32 karakter" hatasıyla durdu. Bu, env'in gerçekten okunduğunu kanıtladı. Ory dokümanının özetinde geçen `_VALUE` eki **yanlıştı**. Genel ders: bir ayarın okunup okunmadığını, onu bilerek geçersiz yapıp hata alarak kanıtlamak.
- Cipher tam 32 karakter olmalı (`xchacha20-poly1305`). Değerler `openssl rand -hex 16` ile üretildi; dev ve prod'da farklılar.
- Cookie sırrı değiştiği için o andaki oturumlar geçersiz oldu.

**`kratos-migrate` her `up`'ta çalışıyor ve bu sorun değil.**
- Migrate komutu **idempotent**: veritabanındaki kayıt tablosuna bakıp sadece eksik migration'ları uyguluyor. `Successfully applied SQL migrations!` mesajını hiçbir şey uygulamasa da basıyor.
- Migration durumu volume'da değil, **Neon'daki veritabanında** tutuluyor.
- Şema sadece iki durumda gerçekten değişiyor: **Kratos sürümü yükseltildiğinde** (migration dosyaları imajın içinde geliyor) ya da **boş bir veritabanına** bağlanıldığında.
- `kratos.yml` ya da `identity.schema.json` değişiklikleri migration gerektirmiyor. Kullanıcı bilgileri (traits) tek bir JSON kolonunda tutuluyor.
- Sürümü sabit tag'le tutmak (`v1.2.0`) bu yüzden önemli. `latest` kullanılsaydı prod veritabanında plansız bir migration çalışabilirdi.
- Bu kalıbın adı **init / migration job**: uygulama başlamadan önce bir kez çalışıp biten, şemayı hazırlayan yardımcı container.

**Açık kalan:** `kratos.yml`'deki tüm URL'ler hâlâ `http://localhost`. Kratos da `serve --dev` ile çalışıyor; `--dev` bazı güvenlik kontrollerini gevşetiyor, örneğin cookie'lerin sadece HTTPS'te gönderilmesi zorunluluğunu. İkisi de Task 8'de (domain + HTTPS) düzeltilecek. O zamana kadar EC2 IP'si üzerinden login çalışmaz.

---

## 4. Compose: temel dosya prod'u, override dosyası dev'i tanımlıyor

```yaml
# docker-compose.yml (prod tanımı)
image: ${ECR_REGISTRY:-local}/assay/market-service:${IMAGE_TAG:-dev}
# docker-compose.override.yml (dev, otomatik okunur)
build: ./market-service
ports: ["5002:5002"]
```

- **`${VAR:-varsayilan}`:** "`VAR` tanımlıysa onu kullan, değilse varsayılanı kullan." `:-` bir **operatör**; çıktıya yazılmıyor ve `${...}` ifadesinin **tamamı** tek bir değerle yer değiştiriyor. Prod'da deploy script'i `ECR_REGISTRY` ve `IMAGE_TAG`'i veriyor, bu yüzden varsayılanlar hiç devreye girmiyor. Varsayılanlar sadece dev bozulmasın diye var; dev'de de temel dosya okunuyor. Dosyanın kendisi değişmiyor, değerler bellekte çözülüyor.
- **Neden `${IMAGE_TAG:?}` ile zorunlu yapılamadı:** Compose her dosyadaki değişkenleri birleştirmeden **önce** çözüyor, bu yüzden dev'de de hata verirdi. Zorunluluk kontrolünü deploy script'i yapıyor.
- **Neden gerekliydi:** Eski `build:` satırlarıyla prod'da compose, ECR'daki imajı çekmek yerine kaynak koddan build ederdi. Bu da **immutable deploy** ilkesini bozar: CI'da build edilip taranan imaj prod'a byte byte aynı haliyle çıkmalı.
- **`-f docker-compose.yml` prod'da zorunlu:** Repo EC2'de git clone ile durduğu için override dosyası da orada. `-f` verilmezse compose onu da okur; portlar dışarı açılır ve imaj ECR'dan çekilmek yerine build edilir.
- **Compose dosyası ile imajın rolleri farklı:** ECR'daki imaj tek bir servisin paketi. Compose dosyası ise sistemin tarifi: hangi servisler, env, portlar, açılış sırası, Kratos, Redis, bind mount. İkisi de gerekiyor ve aynı commit'ten gelmeli.

---

## 5. `deploy.sh`: tasarım kararları

Pipeline'ın son halkası: onaylanan SHA'yı EC2'de çalışır hale getiriyor. Tekrarlanabilir, git'te versiyonlanıyor, elle çalıştırılabiliyor ve eski bir SHA ile çalıştırılınca **rollback** yapıyor.

| Karar | Neden |
|---|---|
| Gövde `main()` fonksiyonunda | Script `git checkout` ile **kendi dosyasını** değiştirebiliyor. Bash script'i satır satır okuduğu için dosya çalışırken değişirse yarı eski, yarı yeni koddan okuyabilir. Fonksiyonu ise çalıştırmadan önce tamamen belleğe okuyor |
| `git checkout --detach <SHA>` | Compose ve `kratos/`, imajla **aynı commit'ten** gelsin. **Detached HEAD**, bir dal yerine doğrudan bir commit'e bakan durum; sunucuda commit atılmayacağı için uygun |
| `umask 077` + `.env.tmp` → `mv` | `.env` ilk andan itibaren `600` izinli oluyor. Yazma yarıda kalırsa eski `.env` bozulmuyor |
| Değerler tek tırnak içinde | Compose, değerin içindeki `$`'ı değişken sanmıyor. Tek tırnak içeren bir değer güvenli yazılamayacağı için reddediliyor |
| `LOG_LEVEL=Warning` | [LOGGING.md](../10-standards/LOGGING.md) prod seviyesi |
| Önce `pull`, sonra `up` | Bir imaj çekilemezse çalışan eski sürüme dokunulmuyor |
| Git'te `+x` (100755) | EC2'de "Permission denied" almamak için |

**Testte yakalanan hata:** `: "${IMAGE_TAG:?... SHA'si ...}"` satırında, `${...:?}` içindeki kesme işareti çift tırnak içinde olmasına rağmen yeni bir tek tırnak başlattı ve script **hiç çalışmadı**. `bash -n` (sadece söz dizimi kontrolü) bunu yakaladı. Ders: script'i yazdıktan sonra en azından `bash -n` ile kontrol etmek.

**CRLF:** Windows satır sonları (`\r\n`) Linux'ta script'i bozar. Git `autocrlf` repoya LF yazıyor; yerelde de `grep -c $'\r'` ile kontrol edildi.

---

## 6. Git: untracked, staged ve ignored

| Durum | `git status` | Commit'e girer mi? |
|---|---|---|
| Untracked | `??` | Hayır, `git add` edilmedikçe |
| Staged | `A` / `M` (ilk sütun) | Evet |
| Ignored | Hiç görünmez | Hayır |

- `.gitignore`'daki `.ua/` sadece **klasörü** kapsar (sondaki `/`). Kökteki `.ua-dashboard.log` **dosyası** bu kurala uymadı ve VS Code'un Changes listesinde `U` olarak görünmeye devam etti.
- VS Code'daki **"Stage All Changes"** untracked dosyaları da stage'e alır. `.gitignore` staged bir dosyayı commit'ten çıkarmaz; `git restore --staged <dosya>` gerekir. Bu komut dosyayı diskte bırakır, silmez.

---

## 7. Olay: ilk build — `Not authorized to perform sts:AssumeRoleWithWebIdentity`

- **Belirti:** `test` → `main-prod` merge'ünden (PR #9) sonra `build-push.yml` ilk kez çalıştı ve AWS'ye girişte düştü. Matrix'teki diğer iki job, **fail-fast** nedeniyle iptal edildi.
- **Kök neden:** Trust policy `sub`'ı `repo:ekremcanunes/Assay:ref:refs/heads/main-prod` olarak bekliyordu. GitHub ise isimlerin yanına sayısal ID'leri ekleyen formatta gönderiyordu: `repo:ekremcanunes@<owner-id>/Assay@<repo-id>:ref:refs/heads/main-prod`.
- **Nasıl bulundu:** CloudTrail → Event history → `AssumeRoleWithWebIdentity` → `userIdentity.userName`.
- **Çözüm:** `sub` değeri gerçek değerle güncellendi ve `StringLike` yerine `StringEquals` kullanıldı. Re-run sonrası üç imaj ECR'a çıktı.
- **Neden geç fark edildi:** OIDC rolü Bölüm 2'de kuruldu ama gerçek bir workflow ile hiç denenmedi.
- Bu yeni formatın GitHub'ın genel bir varsayılanı mı yoksa hesap/repo düzeyinde bir ayar mı olduğu doğrulanmadı.

---

## 8. Olay: pipeline hiç tetiklenmeyecekti — kök neden "deploy birimi"

**Keşif:** Plan, Source aşaması için "ECR, image tag: herhangi" diyordu. AWS dokümanına göre ECR source **tek bir sabit tag'i** izliyor (varsayılanı `latest`). Bizim imajlar her seferinde farklı bir SHA ile push ediliyor. `latest` eklemek de mümkün değil, çünkü repolar immutable. Sonuç: pipeline **hiçbir zaman** tetiklenmeyecekti.

**Mimari kök neden:** Plan ECS kalıbıyla yazılmıştı. ECS'te deploy birimi **tek bir imaj** ve AWS bunu uçtan uca tanıyor. Assay'de ise deploy birimi bileşik bir **sürüm**: 3 imaj + compose + `kratos/` + sırlar, hepsini bağlayan kimlik de commit SHA. AWS bu sürümü tanımıyor, CodePipeline sadece artifact taşıyor. Buna bağlı üç çatışma çıktı:
1. ECR source tek bir repoyu izliyor; bizde üç imaj var.
2. ECR source sabit bir mutable tag bekliyor; bizim tag'lerimiz immutable SHA.
3. ECS'te imajı platform çalıştırıyor; bizde bir sunucuda script çalıştırmak gerekiyor. EC2 deploy action da bir **paket** istiyor ve pipeline değişkenini script'e geçiremiyor.

**Değerlendirilen yollar** (ayrıntılı karşılaştırma genel AWS notunda):

| Yol | Özet |
|---|---|
| A: GitHub pipeline'ı başlatır, SHA'yı değişken olarak verir | Elendi: EC2 action değişkeni script'e iletemiyor ve Source aşaması yine zorunlu |
| **B: GitHub build eder, S3 zip ile devreder** | Mevcut `build-push.yml` korunuyor. Ek parçalar: S3 bucket, EventBridge kuralı, `release` job'u, `run.sh` |
| **Hibrit: GitHub sadece tarar, CodePipeline + CodeBuild build edip deploy eder** | SHA pipeline'da doğuyor, yapıştırıcı yok, GitHub'ın AWS yetkisi sıfır. `build-push.yml` ve OIDC rolü emekliye ayrılıyor |
| Tamamen GitHub Actions | En az parça, ama [PIPELINE-SECURITY §1](../10-standards/PIPELINE-SECURITY.md)'deki "CD = CodePipeline" kısıtıyla çelişiyor |
| C: Mutable `latest` | Reddedildi: güvenlik açısından geri adım |

**Karar:** B ile hibrit arasında karar bekliyor.

---

## 9. Çıkarılan dersler

1. **"Deploy birimimiz ne?"** Pipeline tasarımında ilk sorulacak soru bu.
2. **Plan varsayımlarını dokümanla doğrula.** Bir günde iki sorun (OIDC `sub` ve ECR source) aynı kökten çıktı: plan gerçek sistemle hiç karşılaştırılmamıştı.
3. **Kurduğun şeyi hemen dene.** Denenmeyen bir rol, ilk gerçek kullanımda patlar.
4. **Kimlik ve yetki hatalarında CloudTrail'e bak.** AWS'nin reddettiği isteğin tam olarak ne olduğunu gösteriyor.
5. **Bir ayarın okunduğunu, onu bilerek bozarak kanıtla** (Kratos cipher testi).
