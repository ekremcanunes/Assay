# Pipeline Güvenlik Standardı

Bu doküman **planlama** aşamasındadır — aşağıdaki kontrollerin çoğu henüz kurulmadı. Pipeline kodu yazılırken bu standart bağlayıcıdır; §8'deki öncelik sırası yol haritasıdır.

## 1. Bağlam ve Kısıtlar

| Konu | Durum |
|------|-------|
| Repo görünürlüğü | **Public** (bilinçli tercih) |
| CI | GitHub Actions |
| CD (prod) | AWS CodePipeline |
| Prod hedefi | EC2 + docker compose (ilk aşama) |
| Yığın | .NET 9 ×2 servis, React/Vite, Docker, Postgres, Redis, Ory Kratos |
| Prod durumu | Henüz çıkılmadı |

**Public repo'nun iki sonucu var:**

1. **Avantaj:** GitHub'ın güvenlik paketi ücretsiz — CodeQL, secret scanning, Push Protection, Dependabot. Private repo'da bunlar Advanced Security lisansı ister.
2. **Risk:** Yanlışlıkla commit'lenen bir sır, push edildiği **saniye** içinde yakalanır (botlar public commit akışını sürekli tarar). Commit'i silmek işe yaramaz — sır yanmıştır, tek çözüm onu iptal edip yenilemektir. Bu yüzden sır kontrolü bu projede 1 numaralı öncelik.

## 2. Mevcut Durum (dürüst değerlendirme)

Bugün var olan tek workflow `.github/workflows/wsl-deploy.yml`; **dev amaçlı**, `test` branch'ine push olunca WSL2'deki self-hosted runner'da `docker compose up` çalıştırıyor. Prod pipeline'ı henüz yazılmadı.

Bugün **hiç** yapılmayan kontroller: statik kod analizi, bağımlılık zafiyet taraması, sır taraması, imaj taraması, Dockerfile denetimi, test koşumu, herhangi bir gate.

Ayrıca not edilen iki nokta:

- `docker-compose.yml` ve `.env.example` içinde `kratospassword` düz metin duruyor. Bunlar **dev varsayılanı**; kabul edilebilir ama prod'a asla taşınmamalı ve bu yüzden prod sırları kesinlikle repo'da tutulmamalı (bkz. §6).
- Dev workflow'u sırları runner'daki `~/secrets/` klasöründen kopyalıyor. Dev için pratik; prod'da bu yaklaşım kullanılmaz (bkz. §6).

## 3. Kod Hangi İstasyonlardan Geçer

Sorunun özü buydu: kod nerede analize girer. Akış soldan sağa, **her istasyon bir öncekinin kaçırdığını yakalar**:

```
[1] Geliştirici makinesi
     └─ pre-commit: gitleaks (sır commit'lenmeden yakala)
              │
              ▼  git push
[2] GitHub push anı
     └─ Secret Scanning Push Protection (sır varsa push REDDEDİLİR)
              │
              ▼  Pull Request açılır
[3] GitHub Actions — CI (asıl analiz burada)
     ├─ Build + Test          .NET build, npm build, testler
     ├─ SAST                  CodeQL (C# + JS)  → kodun kendisindeki açık
     ├─ SCA                   dotnet list --vulnerable / npm audit / Dependabot
     │                                            → bağımlılıklardaki açık
     ├─ Secret (tam geçmiş)   gitleaks           → hook atlanmışsa yakalar
     └─ IaC / Dockerfile      Trivy config + hadolint
              │
              ▼  merge → imaj build
[4] Container imajı
     ├─ Trivy image scan      alpine paketleri + uygulama bağımlılıkları
     └─ SBOM üretimi          (Syft) — "hangi imajda hangi kütüphane var"
              │
              ▼  ECR'a push
[5] AWS ECR
     └─ scan-on-push (basic ücretsiz / Inspector gelişmiş)
              │
              ▼
[6] AWS CodePipeline — CD
     ├─ Deploy öncesi gate    (imaj eskimişse yeniden tara)
     ├─ Manual approval       prod için zorunlu
     └─ Deploy → EC2
              │
              ▼
[7] Çalışma zamanı (sürekli)
     ├─ Amazon Inspector      EC2 + ECR sürekli tarama
     └─ Dependabot            yeni CVE çıktığında otomatik PR açar
```

**Kritik nokta:** 3. istasyondaki taramalar bir kereliktir — kod değişmese bile dünyada yeni zafiyet açıklanır. 7. istasyon (sürekli tarama) bu yüzden vazgeçilmezdir; "pipeline'dan geçti, temiz" kalıcı bir durum değildir.

## 4. Kontrol Kategorileri ve Araç Seçimi

| Kategori | Ne arar | Araç | Maliyet | Nerede koşar |
|---|---|---|---|---|
| **SAST** (statik kod analizi) | Kodun kendisindeki açık: SQL injection, XSS, hatalı kripto, path traversal | **CodeQL** (C# + JS) | Ücretsiz (public) | Actions |
| **SCA** (bağımlılık) | Kullandığın paketlerdeki bilinen CVE'ler | `dotnet list package --vulnerable --include-transitive`, `npm audit`, **Dependabot** | Ücretsiz | Actions |
| **Secret scanning** | Kod/geçmişte sızmış anahtar, token, şifre | **GitHub Push Protection** + **gitleaks** | Ücretsiz (public) | Push anı + Actions |
| **Container** | Temel imajdaki (alpine) işletim sistemi paketleri | **Trivy image** | Ücretsiz (OSS) | Actions |
| **Dockerfile / IaC** | Root ile çalışma, sabitlenmemiş imaj etiketi, hatalı compose ayarı | **hadolint** + **Trivy config** | Ücretsiz | Actions |
| **SBOM** | "Hangi imajda hangi kütüphane var" envanteri | **Syft** (CycloneDX) | Ücretsiz | Actions |
| **Sürekli tarama** | Deploy sonrası yeni çıkan CVE'ler | **Amazon Inspector** | Ücretli (imaj/instance başına) | AWS |
| **Kod kalitesi** | Code smell, duplikasyon, karmaşıklık, coverage trendi | **SonarQube Community Edition** (bkz. §4.1) | Ücretsiz (self-hosted) | Kendi sunucumuz |

**Neden bu araçlar:** Hepsi ya GitHub'ın public repo'da ücretsiz verdiği ya da OSS. Güvenlik tarafında ticari araç (Snyk, Checkmarx) bu ölçekte ek değer getirmiyor; kod **kalitesi** tarafı ise SonarQube CE hibritiyle karşılanır (§4.1).

**SAST ile SCA farkı** (sık karıştırılır): SAST *senin yazdığın kodu* inceler, SCA *başkasının yazdığı ve senin kullandığın kodu*. Gerçek hayatta zafiyetlerin büyük çoğunluğu ikinci kategoridedir — o yüzden SCA daha yüksek öncelikli.

### 4.1 SonarQube CE Hibriti (karar: alındı)

**Karar:** Güvenlik kapısı GitHub'da (CodeQL + gitleaks + Dependabot), kod kalitesi tabelası self-hosted **SonarQube Community Edition**'da. Kurumsal ortamlarda yaygın olan ayrım budur: SonarQube'un asıl gücü kalite tarafıdır (teknik borç, duplikasyon, coverage trendi, quality gate), güvenlik SAST'ı olarak CodeQL daha derindir (taint analysis).

**İşbölümü ve akış:**

```
PR açıldı ──► GitHub Actions: build + test + CodeQL + gitleaks
                   │  (kırmızıysa merge yok — KAPI burada)
                   ▼
             merge (ana dala)
                   ▼
Ana dal push ──► Actions: dotnet test (coverage raporu üretir)
                   │
                   ▼
             sonar-scanner → raporu + coverage XML'ini kendi
             SonarQube sunucumuza gönderir (SONAR_HOST_URL + token,
             token GitHub Secrets'ta)
                   ▼
             SonarQube CE: trend, teknik borç, quality gate TABELASI
```

**Bilinçli kabul edilen CE kısıtı:** Community Edition **PR analizi ve çoklu dal analizi yapmaz** (Developer Edition özelliği). PR üstüne kalite yorumu yazamaz; yalnızca ana dalın merge sonrası fotoğrafını ve trendini tutar. Hibritin tasarımı bu kısıta göre: **PR kapısı görevi CodeQL + testlerde, Sonar merge sonrası tabeladır.**

**Not edilen alternatif:** Public repoda **SonarCloud ücretsizdir ve PR analizi de yapar** (sıfır sunucu bakımı). CE tercihi, kurumsal self-hosted kurulumu bizzat deneyimlemek içindir; işletme yükü sorun olursa SonarCloud'a geçiş her zaman açık.

**Sunucu nerede yaşar:** Şimdilik WSL'de docker ile (`sonarqube:community` + PostgreSQL, ~2-4 GB RAM). AWS'ye geçince küçük bir EC2'de aynı yapı. Veritabanı volume'u **kalıcı olmalı** — analiz geçmişi kaybolursa trend sıfırlanır.

**Önkoşul:** Coverage'ı SonarQube ölçmez, test koşucusunun raporunu okur. Projede henüz test olmadığı için kurulum, test altyapısı (xUnit + Vitest) geldikten sonra anlamlıdır (bkz. §8/P2). Ayrıca CE tek dalı analiz eder — dal stratejisi netleşince (§9/1) scanner o dala bağlanır.

## 5. GitHub Actions ile AWS CodePipeline Sorumluluk Ayrımı

İki platform kullanılacağı için sınır net olmalı, yoksa aynı tarama iki yerde koşup hem yavaşlatır hem maliyet üretir.

| | GitHub Actions (CI) | AWS CodePipeline (CD) |
|---|---|---|
| **Sorumluluk** | Kodun doğruluğu ve güvenliği | Artefaktın güvenli şekilde prod'a taşınması |
| **Ne koşar** | Build, test, SAST, SCA, secret, Dockerfile taraması, imaj build + tarama, SBOM | Deploy öncesi son kontrol, manual approval, deploy, smoke test, rollback |
| **Çıktısı** | ECR'a push edilmiş, taranmış, etiketlenmiş imaj | Çalışan prod ortamı |
| **Prensip** | **Tarama solda kalır** — hata ne kadar erken yakalanırsa o kadar ucuz | **Kod yeniden build edilmez** — CI'ın ürettiği imaj aynen deploy edilir |

**"Deploy anında build etme" kuralı:** CodePipeline kaynak koddan yeniden build ederse, taranan şey ile deploy edilen şey farklı olur ve tüm CI güvencesi anlamını yitirir. Deploy edilecek imaj, taraması geçmiş imajın **tam olarak kendisi** olmalıdır (immutable tag / digest ile).

## 6. Pipeline'ın Kendi Güvenliği

Çoğu kurumsal denetim buradan takılır: pipeline kodu tarar ama pipeline'ın kendisi korunmasızdır.

**1. AWS'ye erişimde statik anahtar kullanılmaz — OIDC federasyonu kurulur.**
GitHub Actions'a `AWS_ACCESS_KEY_ID` koymak, süresiz geçerli bir anahtarı üçüncü tarafta saklamak demektir. Bunun yerine GitHub↔AWS arasında OIDC güven ilişkisi kurulur; Actions her koşumda **dakikalar ömürlü** geçici kimlik alır. Sızsa bile kısa sürede geçersizdir. *Bu maddenin alternatifi yoktur.*

**2. IAM rolü en az yetkiyle sınırlanır.** Pipeline rolü yalnızca ilgili ECR reposuna push ve ilgili deploy hedefine erişebilmeli; `*` yetki verilmez. Ayrıca role branch bazlı koşul konur (yalnızca `main`'den prod deploy'u).

**3. Third-party action'lar commit SHA ile sabitlenir.** `uses: actions/checkout@v4` yerine `uses: actions/checkout@<40-karakter-sha>`. Etiketler taşınabilir — saldırgan action reposunu ele geçirirse `v4` etiketini kötücül koda taşıyabilir ve pipeline'ın onu sessizce çeker (tedarik zinciri saldırısı).

**4. Workflow izinleri daraltılır.** Her workflow'da `permissions:` bloğu açıkça yazılır; varsayılan geniş `GITHUB_TOKEN` yetkisi kullanılmaz.

**5. Prod sırları repo'da veya runner diskinde tutulmaz.** `~/secrets/` yaklaşımı dev'e özeldir. Prod'da **AWS Secrets Manager** veya **SSM Parameter Store** kullanılır; uygulama sırrı çalışma anında IAM rolüyle çeker. Sır rotasyonu deploy gerektirmez.

**6. Branch koruması.** Prod'a giden branch'e doğrudan push kapatılır; PR + geçmesi zorunlu status check'ler + en az bir onay istenir. Pipeline'ı ne kadar sıkılaştırırsan sıkılaştır, korumasız branch'e doğrudan push varsa hepsi atlanabilir.

## 7. Gate Politikası (öneri — karar bekliyor)

**Kademeli yaklaşım öneriliyor:**

| Bulgu | Test/dev deploy | Prod deploy |
|---|---|---|
| **Sır tespit edildi** | **Durdurur** | **Durdurur** |
| Critical zafiyet | Uyarır | **Durdurur** |
| High zafiyet | Uyarır | **Durdurur** |
| Medium / Low | Raporlar | Raporlar |

Gerekçe: sır sızıntısı geri alınamaz, bu yüzden her ortamda kesin durdurur. Critical/High için prod'da katı, test'te esnek olmak geliştirmeyi kilitlemeden riski prod'un dışında tutar. Medium/Low başlangıçta çok yanlış pozitif üretir; önce veri toplanır, gürültü temizlenince sıkılaştırılır.

**İstisna süreci:** Bir bulgu kabul edilecekse (yanlış pozitif veya düzeltmesi olmayan CVE), sözlü karar yetmez — süre sınırlı ve gerekçeli bir dosyaya (`.trivyignore` / CodeQL baseline) yazılır. Süresiz istisna açılmaz.

## 8. Öncelik Sırası

### P0 — Hemen (prod'dan bağımsız, repo public olduğu için acil)

1. **Sır taraması ve tam geçmiş kontrolü.** GitHub'da Secret Scanning + **Push Protection** açılır (public repo'da ücretsiz, tek ayar). Ardından `gitleaks detect` ile **tüm git geçmişi** taranır. Kabaca bir kontrol yaptım ve açık bir sır görünmedi, ancak bu **kanıt değildir** — araçla doğrulanmalı. Bir bulgu çıkarsa ilgili anahtar derhal iptal edilip yenilenir; geçmişi temizlemek tek başına yeterli değildir.
2. **Dependabot alerts + security updates açılır.** Tek tık, ücretsiz, en yüksek fayda/emek oranı.
3. **Bağımlılık taraması CI'a eklenir** (`dotnet list package --vulnerable --include-transitive`, `npm audit`). Başlangıçta gate değil, yalnızca görünürlük.
4. **Branch koruması.** Şu an default branch `test` ve doğrudan push açık. Branch stratejisi netleştirilip (bkz. §9) prod branch'i korumaya alınır.

### P1 — Prod'a çıkmadan önce (zorunlu)

5. **CodeQL** (C# + JavaScript) PR'larda koşar.
6. **Trivy image scan + hadolint** — imaj ve Dockerfile denetimi. Servis Dockerfile'larının root ile çalışıp çalışmadığı burada görülecek.
7. **GitHub↔AWS OIDC** kurulur; statik AWS anahtarı hiç oluşturulmaz.
8. **Prod sırları AWS Secrets Manager / SSM'e taşınır.**
9. **Action'lar SHA ile sabitlenir**, workflow `permissions:` daraltılır.
10. **ECR ayarları:** scan-on-push açık, immutable tag, lifecycle policy (eski imajları temizler — depolama maliyeti de kontrol altına alınır).

### P2 — Prod sonrası olgunlaşma

11. **SBOM üretimi ve saklanması** (Syft/CycloneDX) — yeni bir CVE çıktığında "hangi imajım etkileniyor" sorusunu dakikalar içinde cevaplar.
12. **Amazon Inspector** — EC2 ve ECR için sürekli tarama.
13. **İmaj imzalama** (cosign) + provenance — "bu imaj gerçekten bizim pipeline'ımızdan çıktı" kanıtı.
14. **DAST** (OWASP ZAP) — çalışan uygulamaya karşı dinamik test; SAST'ın göremediği çalışma zamanı açıklarını yakalar.
15. **Lisans uyumluluğu** taraması.
16. **SonarQube CE kurulumu** (§4.1) — önkoşulu test altyapısı: önce xUnit/Vitest + coverage raporu, sonra ana dal push'unda sonar-scanner. Quality gate "yeni kod" bazlı kurulur (toplam coverage değil, PR'la eklenen kodun coverage'ı).

## 9. Açık Kararlar

Bunlar netleşmeden pipeline yazılmamalı:

1. **Branch stratejisi.** Default branch şu an `test`. Prod pipeline'ı hangi branch'i dinleyecek, korumalar nereye uygulanacak? (Öneri: `main` = prod, `test` = test ortamı, geliştirme PR ile.)
2. **Gate katılığı** — §7'deki kademeli tablo onaylanıyor mu?
3. **Deploy hedefi kesinleşmesi.** EC2 + compose ilk aşama; ECS'e geçiş öngörülüyorsa imaj/görev tanımı tasarımı buna göre kurulur.
4. **Kim onaylar.** Prod manual approval gate'inde onay yetkisi kimde?
5. **Amazon Inspector maliyeti** kabul ediliyor mu, yoksa yalnızca ECR basic scanning (ücretsiz) ile mi başlanacak?

## 10. İlgili

- Log ve maliyet politikası: [`LOGGING.md`](LOGGING.md)
- Komutlar: [`../30-operations/COMMANDS.md`](../30-operations/COMMANDS.md)
