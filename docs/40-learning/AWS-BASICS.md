# AWS Temelleri (bu projede)

Bu doküman **bu projenin AWS'de neyi neden kullandığını** anlatır. Genel AWS/sertifika notları repo dışında (`Desktop/aws/`) tutulur — burası proje bağlamı.

Pipeline kararları: [`../superpowers/specs/2026-09-06-prod-pipeline-design.md`](../superpowers/specs/2026-09-06-prod-pipeline-design.md)
Log ve maliyet kuralları: [`../10-standards/LOGGING.md`](../10-standards/LOGGING.md) §7

## 1. Kullanılacak servisler ve gerekçeleri

| Servis | Ne işe yarar | Bu projede nerede |
|---|---|---|
| **IAM** | Kimlik ve yetki | GitHub Actions'ın AWS'e OIDC ile erişmesi |
| **ECR** | Özel Docker imaj deposu | `assay/market-service`, `assay/portfolio-service`, `assay/web` |
| **EC2** | Sanal sunucu | Tek `t3.small`, Docker + compose çalıştırır |
| **CodePipeline** | Deploy hattı | Source → **Manual Approval** → Deploy |
| **SNS** | Bildirim | Onay bekleyen deploy için e-posta |
| **CloudWatch** | Log ve metrik | Konteyner logları + billing alarmı |

Kapsam dışı (Aşama 4): ECS, ALB, WAF, Inspector.

## 2. Konsol mu CLI mı

Karar: **konsol ile başla, CLI ile devam et.**

- **IAM/OIDC kurulumu → konsol.** Trust policy, role, federated identity provider gibi kavramların birbirine nasıl bağlandığı görsel arayüzde daha net görülür. Bir kerelik iştir.
- **ECR ve sonrası → CLI.** Tekrarlayan işler (login, push, tag) ve otomasyona girecek komutlar. Konsolda tıklamak hem yavaş hem tekrarlanamaz.

Genel kural: **kalıcı altyapı konsolda tıklanarak bırakılmaz.** Öğrenirken konsol iyidir; ürünleşince komut veya IaC (Terraform/CloudFormation) olması gerekir — çünkü tıklanan bir ayarın kaydı yoktur, gözden geçirilemez, yeniden kurulamaz.

## 3. OIDC — statik anahtar yok

**Sorun:** GitHub Actions'ın ECR'a push edebilmesi için AWS yetkisi lazım. Klasik yol `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`'i GitHub Secrets'a koymaktır. Bu anahtarlar **süresizdir** ve sızarsa hesabın tamamı risk altındadır.

**Çözüm — OIDC federation:** AWS, GitHub'ı bir **kimlik sağlayıcı** olarak tanır. Workflow çalışırken GitHub kısa ömürlü bir token üretir, AWS bunu doğrular ve geçici kimlik bilgisi verir.

```
GitHub Actions çalışır
   → GitHub kısa ömürlü OIDC token üretir (repo, dal, workflow bilgisi içinde)
   → AWS STS bu token'ı doğrular
   → Trust policy koşulları tutuyorsa geçici credential döner (~1 saat)
```

Trust policy'de koşul daraltılır: **yalnızca bu repo, yalnızca `main-prod` dalı**. Başka bir repo ya da `test` dalı aynı rolü üstlenemez.

Depolanan sır: **yok.** Sızacak anahtar olmadığı için rotasyon derdi de yok.

## 4. ECR ayarları ve nedenleri

| Ayar | Değer | Neden |
|---|---|---|
| **Immutable tags** | Açık | Aynı etiket ikinci kez yazılamaz. Taradığın imaj ile deploy ettiğin imajın aynı olduğu garanti olur |
| **Scan on push** | Açık | Her push'ta OS paketi zafiyet taraması, ek iş yok |
| **Lifecycle policy** | Son 10 imaj | Eski imajlar depolama ücreti yazar; otomatik temizlenmezler |

**Etiketleme: git SHA, `latest` değil.** `latest` hangi commit'ten geldiğini söylemez. Sorun çıktığında "hangi kod canlıda?" sorusunun cevabı olmalı — bu yüzden imaj etiketi commit SHA'sıdır.

## 5. Maliyet — bu projede beklenen kalemler

Genel maliyet kontrolü rehberi: `Desktop/aws/02-maliyet/MALIYET-KONTROLU.md`.

Bu projeye özgü dikkat noktaları:

- **CloudWatch Logs retention.** Varsayılan "süresiz saklama"dır. Log grubu oluşturulur oluşturulmaz retention set edilir (test 30 gün, prod 90 gün). `LOGGING.md` §7/2'de zaten kural olarak yazılı.
- **Prod'da log seviyesi `Warning`.** Faturanın ana kalemi ingest edilen satır sayısıdır; `Information` kalıcı açık bırakılmaz.
- **ECR depolama.** Lifecycle policy olmadan her build birikir.
- **EC2 + EBS.** Instance durdurulsa bile disk ücret yazmaya devam eder. Tamamen bitirilecekse volume da silinir.
- **Elastic IP.** EC2'ye bağlı değilken ücretlidir — instance silinince IP de serbest bırakılır.

**Kurulum öncesi zorunlu adım:** herhangi bir AWS kaynağı açılmadan önce billing alarmı + bütçe kurulur.

## 6. Sık karışan kavramlar

Hızlı hatırlatma tablosu. Ayrıntılı anlatım repo dışında, `Desktop/aws/` altında.

| | | Ayrıntı |
|---|---|---|
| **Region vs Availability Zone** | Region coğrafi bölge (`eu-central-1`); AZ o bölge içindeki ayrı veri merkezi (`eu-central-1a`) | `05-network/AG-TEMELLERI.md` §1–2 |
| **Security Group vs NACL** | SG instance seviyesinde, **stateful** (giden isteğin dönüşü otomatik izinli); NACL subnet seviyesinde, stateless | `05-network/AG-TEMELLERI.md` §5 |
| **IAM User vs Role** | User kalıcı kimlik (uzun ömürlü anahtar); Role geçici olarak **üstlenilir** (assume) — OIDC'nin dayandığı mekanizma | `03-iam/IAM-TEMELLERI.md` §2 |
| **Policy vs Trust policy** | Policy "ne yapabilir"; trust policy "kim üstlenebilir" | `03-iam/IAM-TEMELLERI.md` §5 |
| **EC2 stop vs terminate** | Stop → disk durur, ücret azalır, geri başlatılır; terminate → instance yok olur | `04-compute/EC2-TEMELLERI.md` §2 |

## 7. Bölge seçimi

Varsayılan: **`eu-central-1` (Frankfurt)** — Türkiye'ye en yakın düşük gecikmeli bölge.

**İstisna:** Billing metrikleri ve billing alarmı **yalnızca `us-east-1`**'de bulunur. Alarm orada kurulur, kaynaklar Frankfurt'ta durur.
