# Platform Yol Haritası

*Oluşturuldu: 2026-10-31 · Durum: taslak, aşamalar tek tek tasarlanacak*

Bu doküman iki şeyi birlikte tutar: **ürünün nereye gittiği** ve **bu yolda hangi mühendislik becerilerinin kazanılacağı**. Her ürün adımı bir altyapı problemi doğurmalı; doğurmuyorsa sıranın gerisine düşer.

---

## 1. Neden bu doküman

Ekim'in ikinci yarısında commit'lerin yalnızca ~%10'u altyapıya dokundu; iş ürün cilasına kaydı (font, yükleniyor ekranı, hata metinleri). Asıl hedef ürün değil, **mühendislik kabiliyeti**: AWS, DevOps, Kubernetes, platform mühendisliği ve bunların yapay zekâ ile kesiştiği yer.

Ürün yine de gerekli: yük, istek ve servis yoksa gateway'in, Kubernetes'in, kuyruğun çözeceği gerçek bir problem de olmaz. Bu doküman ürünü **taşıyıcı** olarak kullanır.

## 2. Vizyon

**Assay, finansı bilmeyen birine portföyünün ne anlama geldiğini anlatır.** Rakamları gösterir, sade dille yorumlar; ne alıp satacağını söylemez.

Assay tek başına büyütülmez. Bir ekosistemin (banka uygulamasının yatırım ayağı gibi) **ilk bacağıdır**. Yeni bir yetenek gerektiğinde ince, ayrı bir servis/bacak açılır; ortak işler (kimlik, giriş kapısı, gözlem, CI/CD) platform katmanında bir kez çözülür.

## 3. İlkeler

1. **Anlatır, karar vermez.** Açıklama ve eğitim evet; kişiye özel al/sat önerisi, fiyat tahmini hayır. Kişiye özel yatırım tavsiyesi Türkiye'de SPK lisansı gerektirir (gerçek kullanıcıya açılmadan önce hukuki olarak doğrulanacak). Sitede açıkça bildirilir.
2. **Hesap kodda, yorum LLM'de.** Rakamları kod hesaplar ve doğrular; LLM yalnızca bu rakamları sade dille anlatır, kendi rakam üretmez. Sebep: acemi kullanıcı LLM'in hatasını fark edemez.
3. **LLM eğitilmez, sınırlanır.** Fine-tuning yok; sistem talimatı + yapılandırılmış girdi (kodun hesapladığı rakamlar) + yapılandırılmış çıktı (şemalı JSON) + eval (cevapları otomatik test eden senaryolar).
4. **Her bacak ince kalır.** Uçtan uca çalışan en küçük hali yeter; asıl ürün platformdur. Sahte banka inşa edilmez, para simülasyondur.
5. **Ürün işi filtreden geçer:** "Hangi gerçek kullanıcı sorununu ya da hangi altyapı problemini doğuruyor?" İkisi de yoksa bekler.
6. **İki çalışma modu.** Ürün işi hızlı mod (toplu, az açıklama, sonda test listesi); altyapı işi öğrenme modu (adım adım, terimler açıklanarak).
7. **Yapay zekâyı kullanıcının yerine biz çalıştırırız.** Herkes portföyünü bir sohbet botuna yapıştırabilir ama çoğu kişi yapmaz: ne soracağını bilmez, veriyi toplamaz, cevabı doğrulayamaz. Assay'da veri içeride, soru hazır, rakamlar kodla doğrulanmış; kullanıcı hiçbir şey yazmadan açıklamayı görür. Yapay zekâ sohbet kutusu değil, sessizce çalışan bir özelliktir. Bu yüzden hazır gelen özellikler (günlük özet, senaryolar) soru-cevap türünün önündedir.

## 4. Aşamalar

Sıra bağımlılığa göre: önce gelen, sonrakinin altyapısını kurar. Her aşamanın "bitti" ölçütü tasarlanırken netleşir.

| # | İş | Tür | Kullanıcıya | Öğrettiği | Mod |
|---|---|---|---|---|---|
| 0 | **Assay toparlama** — 2FA fail-open, çıkış sonrası geri tuşu (bfcache), market-service çağrı süresi, Twelve Data anahtarı header'a, veri kaynağı satırı, gecikme ibaresi, Faz 2 BACKLOG maddeleri, para birimi kararı | Ürün | Sağlam temel | — | Hızlı |
| 1 | **TL ve dolar gerçeği** — kazancın gerçek değerde ne olduğu | Assay özelliği (LLM yok) | "Kâr ettim sanıyordun, dolar bazında zarardasın" | "Hesap kodda" katmanı: LLM'in yorumlayacağı doğrulanmış rakamlar | Hızlı |
| 2 | **Insight servisi + "Portföyüm neden değişti?"** | Yatay servis, ilk AI bacağı | Rakamlara anlam | LLM entegrasyonu, yapılandırılmış çıktı, eval, token/maliyet metrikleri, asenkron işçi | Öğrenme |
| 3 | **Bildirim servisi** — haftalık özet e-postası | Yatay servis | Özetin kullanıcıya ulaşması | Olay güdümlü mimari, SNS/SQS, tekrar deneme, ölü mektup kuyruğu (DLQ) | Öğrenme |
| 4 | **Fiyat alarmları** | Bildirimin ilk kullanıcısı | "THYAO 300'ün altına indi" | Zamanlayıcı + işçi, fan-out, Kubernetes otomatik ölçekleme (HPA) | Öğrenme |
| 5 | **Platform katmanı** — API gateway, golden path (yeni servis şablonu), GitOps | Platform | — | 3+ servis olunca ortaklaştırmanın gerçek sebebi | Öğrenme |
| 6 | **KAP bildirimi yorumlayıcı** | Yeni bacak (Insight'ı kullanır) | Anlaşılmaz şirket açıklamalarını anlatmak | Veri toplama hattı, büyük metinle LLM; golden path'in ilk gerçek testi | Öğrenme |
| 7 | **Fon modülü (TEFAS)** | Yeni bacak | Acemi yatırımcının asıl yatırım yaptığı yer | Toplu veri işleme (batch ETL), veri kalitesi | Karışık |
| 8 | **Sanal portföy (cüzdan dahil)** | Yeni bacak | Para riske atmadan pratik | Defter (double-entry), idempotency, event sourcing — fintech'in yazma ağırlıklı tarafı | Öğrenme |

**Insight servisinin sonraki kullanıcıları** (2'den sonra eklenir): bağlam içi açıklamalar ("52 haftalık aralık bu hisse için ne demek"), risk aynası ("portföyünün %70'i tek hissede — bu ne anlama gelir"), portföy asistanı (araç çağıran agent; agent tasarımı burada denenir).

## 5. Altyapı hattı

Bacaklarla birlikte ilerler; ayrı bir "altyapı dönemi" yoktur.

| Ne | Ne zaman | Neden o noktada |
|---|---|---|
| **Terraform** | 1 ile 2 arası | Yeni AWS kaynakları (SQS vb.) baştan kodla; mevcut konsol kaynakları `terraform import` ile içeri |
| **Gözlemlenebilirlik** | 2 ile | LLM'in maliyetini ve gecikmesini ölçmeden işletilemez |
| **Kubernetes (lokal: kind/k3d)** | 2 ile | İlk gerçek ihtiyaç: Insight'ın asenkron işçisi; enstrüman senkronu → CronJob |
| **EKS** (ya da maliyete göre k3s) | 4–5 civarı | Ölçeklemenin anlam kazandığı yer; pod'ların AWS erişimi GitHub OIDC'sinin aynı mantığı (IRSA / Pod Identity) |
| **GitOps** | 5 ile | Platform katmanının parçası |

## 6. Konuşulacak aday fikirler

Henüz sıraya girmedi; aşamalar tasarlanırken değerlendirilecek. Hepsi yalnızca elimizdeki veriyle (Yahoo fiyatları, Frankfurter kurları, kullanıcının işlemleri) yapılabilir — yeni veri kaynağı ve yeni yasal yük getirmez.

| Fikir | Kullanıcıya | Altyapıda öğrettiği |
|---|---|---|
| **"Ya olursa?" senaryoları** | "Dolar %20 artarsa portföyüm ne olur?" — hesap kodda, anlatım LLM'de | Hesap servisi, önbellek, yapılandırılmış çıktı |
| **"Bugün ne oldu?" piyasa özeti** | Endeks, döviz, altındaki günlük hareketin tek paragraf sade anlatımı | Günlük CronJob, LLM, önbellek (herkese aynı metin, bir kez üretilir → düşük maliyet); ilk LLM denemesi için aday |
| **Düzenli yatırım simülatörü** | "Son 3 yıl her ay 2.000 TL altın alsaydım?" | Geçmiş fiyatla toplu hesap, iş kuyruğu |
| **Hedefler** | "Ev peşinatı için 200 bin — neredeyim, ne zaman ulaşırım?" | Zamanlanmış yeniden hesap, bildirim tetikleme |
| **Ortak / aile portföyü** | Eşle ortak portföy; biri görür, biri düzenler | Yetkilendirme (authorization) ayrı serviste — ör. Ory Keto |
| **Haftalık rapor (PDF / e-posta)** | Haftanın özeti mailde | PDF üreten işçi servisi, S3, bildirim |

Öne çıkan üçü: "Ya olursa?", "Bugün ne oldu?", ortak portföy.

## 7. İç platform aracı (operasyon konsolu)

Kullanıcıya dönük Assay'ın yanında, **Assay'ı işleten** bir iç araç. Platform mühendisliğinin tanımı budur: müşterisi geliştirici olan iç ürün. Müşteri bizzat sensin. Örnek: Spotify'ın açık kaynak iç geliştirici portalı **Backstage**.

**Gerçek acılardan doğuyor:** `.env`'in her deploy'da ezilmesi, diskteki eski `deploy.sh` yüzünden 521 kesintisi, `test` ile `main-prod` farkının izlenememesi, maliyet yüzünden prod'un kapatılması, Docker volume birikimi, sırların durumu.

**Kural — yerine geçmez, üstüne oturur:** Veri ve iş standart araçlarda kalır (loglar CloudWatch Logs, metrik/alarm CloudWatch ya da Prometheus/Grafana, maliyet Cost Explorer, pipeline CodePipeline, imaj ECR). Araç yalnızca bunların API'lerini çağırır, tek ekranda birleştirir ve AWS'nin vermediği boşluğu doldurur (ör. "test ile main-prod arasında hangi commit'ler var", "bu hata anında loglarda ne oldu — özetle"). Kendi log toplama / grafik / alarm sistemi yazılmaz; yazılırsa AWS öğrenilmemiş olur.

**Sıra kuralı:** Önce standart aracı kendin kullan (CloudWatch kur, alarm yaz, Cost Explorer'a bak). İç aracı ancak "tek ekranda görmek istiyorum" ya da "AWS bunu vermiyor" boşluğu gerçekten hissedilince yaz. Bu yüzden yol haritasında gözlemlenebilirlik adımından sonra gelir.

## 8. Bilerek dışarıda kalanlar

- **"Geçmişte alsaydım" hesaplayıcı** — küçük ve güzel ama yeni bir şey öğretmiyor; hızlı modda ara doldurucu.
- **Makro takvim (TCMB EVDS)** — KAP yorumlayıcının kalıbı oturunca neredeyse bedava; 6'dan sonra.
- **Canlı fiyat akışı** — BIST canlı verisi lisanslı ve pahalı; yalnız simülasyon olabilir. Teknik olarak öğretici, ürün değeri yok; en sona, opsiyonel.
- **Ekstre (CSV/PDF) içe aktarma** — gündelik kullanımda kimse yapmaz; yalnız ilk kurulumda değerli. Gerekirse sonra.

## 9. Açık kontroller

- **Hukuki:** "Yatırım tavsiyesi değildir" sınırının SPK mevzuatına göre doğrulanması (gerçek kullanıcıya açılmadan önce).
- **Veri lisansları:** KAP, TEFAS ve TCMB EVDS verilerinin kullanım koşulları bilinmiyor (resmî API var mı, ticari kullanım, atıf). Aşama 6–7'ye gelmeden birincil kaynaklardan araştırılacak; o zamana kadar bu iki bacak koşullu. Bugünkü kaynakların da benzer sorusu var (Yahoo resmî olmayan yoldan kullanılıyor) — BACKLOG'daki "Veri lisansları" maddesiyle birlikte ele alınır.
- **Mobil uygulama:** React Native ne zaman, PWA ara adım olur mu — karar açık (2026-10-31 konuşması).
- **Understand-Anything grafiği:** 2026-09-25'ten kalma, kodun ~%80'i değişti. Tam yeniden analiz Assay toparlandıktan sonra (aşama 0 sonu) yapılacak.
- **Sır rotasyonu:** Neon şifresi ve Resend anahtarı bir ara sohbette görünmüştü; yenilenip yenilenmediği teyit edilmedi.
