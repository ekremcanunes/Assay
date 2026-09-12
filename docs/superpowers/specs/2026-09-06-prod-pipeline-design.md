# Prod Pipeline Tasarımı — Spec

`main-prod` dalındaki kodun, onay mekanizmasından geçerek AWS'e deploy edilmesi. Bu doküman **kararları** ve **inşa sırasını** tutar; araç seçimi ve güvenlik gerekçeleri [`PIPELINE-SECURITY.md`](../../10-standards/PIPELINE-SECURITY.md)'de.

## 1. Amaç

Bugün prod pipeline'ı yok. Tek workflow (`wsl-deploy.yml`) `test` dalına push olunca WSL'deki runner'da `docker compose up` çalıştırıyor — dev amaçlı.

Kurulacak: `main-prod` → imaj build → ECR → **insan onayı** → EC2. Onay olmadan hiçbir kod prod'a gitmez.

## 2. Kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Dal stratejisi | `main-prod` = prod (korumalı), `test` = staging + **varsayılan dal** | PR'ların çoğu `test`'e açılıyor; varsayılan orası olmazsa her seferinde hedef değiştirilir |
| Governance | **AWS merkezli** — CodePipeline Manual Approval + SNS | Onay kaydı deploy hattının içinde kalır. Jira key PR başlığında izlenebilirlik notu olarak durur, mekanizma değil |
| Branch koruması | PR zorunlu, **onay şartı yok**, status check zorunlu | Tek kişilik projede kendi PR'ını onaylamak mümkün değil → kilitlenme. İnsan kapısı AWS tarafında |
| Gate katılığı | Sır → her yerde durdurur · Critical/High → prod'da durdurur, test'te uyarır · Medium/Low → raporlar | Geri alınamaz olan her yerde keser; gürültülü olan önce veri toplar |
| Kod kalitesi | **SonarCloud** (SonarQube CE değil) | Public repo'da ücretsiz, sunucu bakımı yok, üstelik CE'nin yapamadığı **PR analizi**ni yapar. `PIPELINE-SECURITY.md` §4.1 buna göre güncellenecek |
| Sürekli tarama | Amazon Inspector **kapalı** | Ücretli. Boşluğu Dependabot (bağımlılık) + düzenli imaj yenilemesi (OS paketleri) kapatıyor |
| Yük dengeleme | nginx **reverse proxy**, ALB ertelendi | Tek EC2 — dengelenecek ikinci hedef yok. ALB ~20$/ay, ECS aşamasında anlam kazanır |
| Statik dosya servisi | nginx sunmaya devam eder | Ayırmanın (S3 + CloudFront) kazancı ancak ECS'te doğar; tek EC2'de SPA yönlendirmesini CloudFront kuralına çevirmek, ayrı deploy adımı ve cache invalidation eklemek karşılıksız maliyettir |
| Config yönetimi | `nginx.conf` imaja `COPY` ile gömülür, volume ile bağlanmaz | Config imajın dışındaysa aynı imaj farklı makinelerde farklı davranır; "taranan imaj = deploy edilen imaj" ilkesi bozulur. Dev'de volume kullanımı serbest |
| Rate limiting | nginx `limit_req` | AWS WAF ~5$/ay + kural ücreti; bu ölçekte gereksiz |
| `dependabot.yml` | **Eklenmiyor** | Bedeli kabul edildi: pinlenen action SHA'ları elle güncellenecek |
| İnşa yöntemi | **Walking skeleton** | Önce uçtan uca akan boru, sonra istasyonlar |

## 3. Bölüm 1 — P0 Hijyen

Public repo olduğu için prod'dan bağımsız olarak önceliklidir. Kod değişikliği içermez.

**Tamamlanan:** Secret scanning + Push Protection · Dependabot alerts + security updates · CodeQL advanced kurulumu · Workflow action'larının SHA ile pinlenmesi

**Kalan:**
1. `main-uat` silinir — `main-prod` ile aynı commit'te duran ölü dal
2. Varsayılan dal `test` olarak ayarlanır
3. `gitleaks` ile tüm git geçmişi taranır — Push Protection yalnızca ileriye dönük korur
4. `main-prod` branch koruması: doğrudan push kapalı, PR zorunlu, force push ve dal silme kapalı
5. `test` → `main-prod` PR'ı — dalları eşitleyen ilk birleştirme, aynı zamanda korumanın ilk denemesi

**Açılması önerilen ek ayarlar:** grouped security updates, Dependabot malware alerts, private vulnerability reporting.

## 4. Bölüm 2 — İskelet CI/CD

Tarama içermez; amaç boruyu baştan sona akıtmaktır.

**4.1 OIDC** — GitHub↔AWS güven ilişkisi. IAM Identity Provider + koşullu güvene sahip IAM Role (yalnızca bu repo, yalnızca `main-prod`). Statik `AWS_ACCESS_KEY_ID` oluşturulmaz.

**4.2 ECR** — üç repository: `assay/market-service`, `assay/portfolio-service`, `assay/web`. Her birinde scan-on-push açık, **immutable tag**, lifecycle policy (son 10 imaj tutulur).

**4.3 Build workflow** — `main-prod`'a merge → üç imaj build → **git SHA ile etiketlenir** → ECR'a push. `latest` kullanılmaz; hangi imajın hangi commit'ten geldiği kesin olmalıdır.

**4.4 CodePipeline** — Source (ECR) → **Manual Approval** (SNS bildirimi) → Deploy. Governance kararının uygulandığı yer.

**4.5 EC2 + nginx** — tek `t3.small`, Docker + compose.

nginx `web` imajının içinde çalışır (multi-stage build'in ikinci aşaması); `web/nginx.conf` imaja `COPY` ile gömülür, host'a ayrıca kurulmaz. Yönlendirme: `/api/` → portfolio-service, `/.ory/` → kratos, `/` → statik React.

**Ağ yüzeyi:** Bugün compose beş servisi de host'a yayınlıyor (`ports`), yani nginx atlanarak `:5001` ve `:5002` üzerinden servislere doğrudan erişilebiliyor. Bu, nginx'e konulacak her kuralı (rate limiting, header'lar, TLS zorlaması) atlanabilir kılar.

Prod compose dosyasında yalnızca `web` (80/443) yayınlanır; portfolio-service, market-service, redis ve kratos `expose` ile yalnızca compose ağına açılır. Servis-servis iletişimi Docker DNS üzerinden zaten yürüdüğü için etkilenmez. Dev'de doğrudan erişim `docker-compose.override.yml` ile korunur.

EC2 Security Group yalnızca 80/443'e izin verir. İki katman birlikte uygulanır: tek bir Security Group hatası arkadaki servisi internete açmamalı, ve makine içinden gelen erişim de kapalı olmalı.

**Çıktı:** `main-prod`'a merge → bildirim → onay → uygulama canlıda.

## 5. Bölüm 3 — İstasyon Sırası

Sıranın kuralları: ucuz ve yüksek getirili olan önce · engelleyen önce · gate'ten önce veri toplanır.

**Aşama 2 — güvenlik**

1. CodeQL'e `main-prod` eklenir
2. Bağımlılık taraması CI'da: `dotnet list package --vulnerable --include-transitive`, `npm audit`
3. hadolint — Dockerfile denetimi
4. Trivy image scan — temel imajdaki OS paketlerinin zafiyetleri
5. Dockerfile düzenlemeleri — `USER` eklenir (servisler hâlihazırda root ile çalışıyor), temel imaj etiketleri sürüm bazlı sabitlenir, `web` imajında bağımlılık kurulumu kaynak kopyalamadan ayrılır (bugün `nginx.conf` değişikliği tüm `npm install`'ı yeniden tetikliyor)
6. **TLS** — certbot host'ta çalışır, sertifikaları `/etc/letsencrypt`'e yazar; dizin nginx konteynerine salt okunur volume ile bağlanır. Yenileme sonrası `nginx -s reload` (yeniden başlatma değil). Sertifika imaja gömülmez: 90 günlük yenileme döngüsü uygulama imajını yeniden build etmeyi gerektirmemeli, aksi hâlde aynı kod farklı imajlarla deploy edilir.
   nginx tarafı: `80` → `443` yönlendirmesi (`/.well-known/acme-challenge/` hariç — bu yol yönlendirilirse yenileme başarısız olur), TLSv1.2+, HSTS header'ı.
7. nginx yapılandırması — gzip, güvenlik header'ları, `limit_req` (rate limiting)

**Aşama 3 — kalite**

8. Test altyapısı (xUnit + Vitest) → 9'un önkoşulu; coverage'ı Sonar üretmez, okur
9. SonarCloud — quality gate "yeni kod" bazlı
10. SBOM (Syft)

**Aşama 4 — cloud-native**

ECS → ALB → WAF. nginx'in rate limiting görevini WAF devralır, reverse proxy görevi kalır.

**Gate açma kuralı:** Her istasyon önce **rapor modunda** koşar, gürültü seviyesi görülür, sonra §2'deki gate politikası uygulanır. Gate'i ilk gün açmak, yanlış pozitif nedeniyle pipeline'ın devre dışı bırakılmasıyla sonuçlanır.

> **Uygulama planının kapsamı:** İlk plan yalnızca **Bölüm 1 + Bölüm 2**'yi kapsar. Aşama 2 ve sonrası, iskelet aktıktan sonra kendi planını alır.

## 6. Kapsam Dışı

- ECS, ALB, WAF, Inspector — Aşama 4
- DAST (OWASP ZAP), imaj imzalama (cosign), lisans taraması
- `dependabot.yml` ve otomatik SHA tazeleme
- Çoklu ortam (UAT) — iki dal, iki ortam
- Mevcut `wsl-deploy.yml` — dev akışı olduğu gibi kalır

## 7. Açık Konular

1. **AWS hesabı** — IAM, ECR, EC2, CodePipeline kurulumu Bölüm 2'nin önkoşulu
2. **Prod sırları** — Secrets Manager / SSM'e taşınacak; `~/secrets/` yaklaşımı dev'e özeldir
3. **EC2 boyutu** — `t3.small` (2GB) başlangıç tahmini; üç konteyner + nginx ile doğrulanmalı
4. **Alan adı** — certbot ile TLS için gerekli; henüz alınmadı
