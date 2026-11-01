# Atlas — Altyapı ve Veri Anlatım Paneli (Tasarım)

Tarih: 2026-11-02 · Branch: `feat/atlas` (`design/warm-editorial`'dan açıldı) · Durum: taslak, onay bekliyor

---

## 1. Amaç

Atlas, Assay'ın altyapısını, mimarisini ve verisini **sunum kalitesinde, interaktif** anlatan, Assay'dan bağımsız deploy edilen bir web uygulamasıdır.

- **Birincil kullanıcı: proje sahibi.** Docker, CI/CD, AWS, Kratos gibi konuları, terimleri ve kurulum kararlarını unuttuğunda açar. "Bunu böyle kurmuşuz, nedeni bu, dosyası şu, komutu şu" cevabını hemen bulur.
- **İkincil kullanıcı: bilinmeyen herkes** (işe alımcı, geliştirici, meraklı). Erişimi sahibi verir.
- **Teknik ve derin olur, yüzeysel olmaz.** Her adım gerçek dosyaya ve gerçek komuta bağlanır.
- **Kararlar koddan değerlidir.** Her adımın çekirdeği: *ne oluyor / neden böyle / bedeli*.

### Hedef dışı

- Kod tabanının otomatik haritası (o iş Understand-Anything'in).
- Canlı izleme (metrik, alarm). Atlas anlatır, izlemez.
- Assay'ın kendisine özellik eklemek.

### Başarısızlık sayılır (çalışsa bile)

- Yüzeysel, pazarlama tonunda anlatım.
- Koddan kopmuş, uydurma veya eskimiş bilgi.
- Gizli bilgi sızıntısı (bkz. §6).
- Uzun ve yorucu metin. Görsel anlatmalı, metin kısa kalmalı.

---

## 2. Görsel dil (onaylandı)

Referans mockup: `.superpowers/brainstorm/.../content/flow-style-v2.html` ("Kod prod'a nasıl çıkar?"). Kullanıcı onayı: "olay budur".

**Akış sahnesi** — Atlas'ın ana sayfa tipi:

- Koyu sahne, hafif ızgara, köşelerde kobalt/zümrüt ışık (Assay Obsidian paletinden türetilir).
- **Şeritler** (lane): her şerit bir ortam (GitHub · AWS kontrol düzlemi · EC2 vb.), kendi tonunda.
- **Kutular** (node): ikon + başlık + mono alt etiket + adım numarası. Aktif kutu kobalt parlar; geçilen kutu soluk mavi; bekleyen kutu soluk; yan bağımlılık sarı kesik kenar.
- **Bağlantılar** (edge): aktif bağlantı akan kesikli çizgi; üzerinde ışık paketi hareket eder.
- **Adım paneli:** büyük adım numarası (`03/06`) + başlık; üç sütun **Ne oluyor** (kobalt) / **Neden böyle** (zümrüt) / **Bedeli** (amber); terim çipleri (üzerine gelince tanım).
- **Terminal penceresi:** o adımın gerçek dosya adı ve komutları, sözdizimi renkli.
- **Kontrol:** ▶ Oynat (otomatik ilerler), İleri/Geri, ← → tuşları, kutuya veya ilerleme çizgisine tıklama.

**Veri sayfası** — ikinci sayfa tipi (mockup'ı Faz 4 başında yapılır):
Assay ekranının görüntüsü/çizimi üstünde bir kutuya tıklanınca o verinin soy ağacı açılır: ekran öğesi → endpoint → servis → cache → dış kaynak, aradaki hesaplamalar ve "neden bu grafik".

**Atlas, Assay'ın `DESIGN.md`'sine bağlı değildir.** Kendi kısa görsel notunu `atlas/README.md`'de tutar. *(Benim kararım.)*

---

## 3. İçerik haritası

| # | Başlık | Tip | Anlatır |
|---|--------|-----|---------|
| **Altyapı** | | | |
| 01 | İstek yolu | akış | Tarayıcı → Cloudflare → nginx → portfolio-service → market-service → Redis / Yahoo. `real_ip`, rate limit (auth 10/dk, api 20/sn), `/api` ve `/.ory` yönlendirmesi. |
| 02 | Teslimat | akış | `main-prod` push → OIDC → 3 image ECR (tag=SHA) → `release.zip` S3 → CodePipeline → `run.sh` → `deploy.sh` (Secrets Manager, compose pull/up). Mockup'ta hazır. |
| 03 | Kimlik | akış | Kratos: kayıt, giriş, OTP/2FA, session cookie, `kratos-migrate`. |
| 04 | Container düzeni | akış | Compose servisleri, image, volume, ağ, `expose` vs `ports`; dev (override) ile prod (`-f docker-compose.yml`) farkı; mailpit. |
| 05 | Gözlem | akış | Serilog → stdout JSON → json-file (10MB × 3) ; seviye politikası. |
| **Veri** | | | |
| 06 | Kaynaklar | akış | Yahoo (fiyat, geçmiş), Twelve Data (katalog, arama), Frankfurter (kur): ne, nasıl, limit, artı/eksi. |
| 07 | Cache | akış | Redis TTL: Live 5 dk, Daily 1 sa, Permanent 30 gün, Failure 5 dk — neden bu süreler. |
| 08 | Enstrüman kataloğu | akış | Twelve Data → `InstrumentSyncJob` (cron) → `Instruments` tablosu; `IsActive`, `IsConflict`. |
| 09 | Türetilen veri | akış | Ham veriden hesaplananlar: K/Z, gram altın TL, 52H konum, piyasa nabzı, seans durumu. Hesap serviste mi istemcide mi. |
| 10 | Ekran → veri | veri sayfası | Her ekran öğesi hangi veriyi, hangi yoldan (DB / API geçişi / fonksiyon) gösteriyor; grafik neden o veriyle. |
| **Ortak** | | | |
| — | Sözlük | liste | Tüm terimler tek yerde; her terim kullanıldığı akışlara bağlı. |

Kaynak malzeme: repo dosyaları, `docs/` (özellikle `40-learning/`), landing teknoloji sayfaları (`web/src/lib/stack.jsx`, `dockerDetail.jsx`, `ciDetail.jsx`).

---

## 4. Teknik yapı

| Konu | Karar |
|------|-------|
| Konum | Assay reposunda `atlas/` klasörü. Assay'ın Docker/AWS hattına dokunmaz. |
| Arayüz | React + Vite (statik çıktı). |
| Diyagram | Kendi SVG çizicimiz: şerit + kutu + bağlantı + paket animasyonu, koordinatlar içerik dosyasından. *(Benim kararım: onaylanan görünüm özel SVG; React Flow'un sürükle/yakınlaştır özellikleri gerekmiyor.)* |
| İçerik | Kodda değil, `atlas/content/` altında YAML. Bir akış = bir dosya (`flows/02-teslimat.yaml`): şeritler, kutular, bağlantılar, adımlar (`h`, `what`, `why`, `cost`, `terms`, `file`, `code`). Sözlük `content/terms.yaml`; akışlar terimlere kimlikle atıf yapar. |
| Yazım | İçerik `docs/10-standards/WRITING.md` cümle ve terim kurallarıyla (`YZ-01`–`YZ-08`) yazılır: kısa cümle, bir terim bir anlam. |
| Doğruluk | Her adımın `file` alanı repoda gerçek bir dosyayı gösterir. Bir build betiği bu dosyaların var olduğunu kontrol eder; yoksa build düşer. |
| Sunucu ucu | Giriş, erişim talebi ve onay uçları Vercel Functions olarak `atlas/api/` altında. *(Benim kararım.)* |
| Tema | Yalnız koyu tema. *(Benim kararım: onaylanan sahne koyu üzerine kurulu.)* |
| Dil | Yalnız Türkçe. *(Benim kararım.)* |
| Ekran | Masaüstü öncelikli. Mobilde diyagram yatay kaydırılır, adım paneli altta tam genişlik. *(Benim kararım.)* |

---

## 5. Deploy

- **Vercel Hobby** (kişisel, ticari olmayan kullanım şartı karşılanıyor).
- Vercel projesi Assay reposuna bağlanır. **Root Directory:** `atlas/`.
- **Production branch:** `main-prod`. Diğer branch'ler → preview deploy (her commit ayrı adres + branch başına sabit adres).
- **Akış:** `feat/atlas` → `test` → `main-prod`.

| Branch | Deploy | Adres |
|--------|--------|-------|
| `feat/atlas` | preview | Vercel'in verdiği adres |
| `test` | preview | `atlas-test.assay.com.tr` (Vercel'de alan adı `test` branch'ine atanır) |
| `main-prod` | production | `atlas.assay.com.tr` |

- **Ortam değişkenleri** Vercel'de Production ve Preview için ayrı tutulur. Test için ayrı izin listesi/depo kullanılıp kullanılmayacağı Faz 2 planında netleşir.
- **Ignored Build Step:** son commit'te `atlas/` değişmediyse Vercel build yapmaz (`git diff --quiet HEAD^ HEAD -- .`).
- **Preview koruması:** Vercel'in ücretsiz "Vercel Authentication" koruması preview adreslerini yalnız Vercel hesabı sahibine açar.
- **Alan adları:** `atlas.assay.com.tr` ve `atlas-test.assay.com.tr`, Cloudflare DNS'te CNAME → Vercel.
- **Preview koruması ile kapı:** Vercel Authentication açıkken preview'ı yalnız sahibi görür. Test sürümü başkasına gösterilecekse bu koruma kapatılır; erişimi Atlas'ın kendi kapısı (§6) kontrol eder.

---

## 6. Erişim (A yolu, onaylandı)

Ziyaretçi akışı:

1. Ziyaretçi adrese girer. Oturumu yoksa giriş sayfasını görür.
2. E-postasını yazar.
   - **İzin listesindeyse:** e-postasına tek kullanımlık giriş linki (magic link) gider. Linke tıklar, oturum açılır.
   - **Değilse:** "Erişim iste" formu açılır (ad, e-posta, kısa not). Gönderince sahibine e-posta gider.
3. Sahibin e-postasında **Onayla** linki vardır. Tıklanınca kişi izin listesine eklenir ve kişiye giriş linki gider.

Bileşenler:

| Parça | Seçim |
|-------|-------|
| Kapı | Vercel Routing Middleware (her istekten önce çalışır). Geçerli oturum çerezi yoksa giriş sayfasına yönlendirir. Vite projesinde çalıştığı Faz 2 başında küçük bir denemeyle doğrulanır; çalışmazsa kapı Vercel Functions + yönlendirme ile kurulur. |
| Oturum | İmzalı, `HttpOnly`, `Secure` çerez (JWT). Süre: 30 gün. *(Benim kararım.)* |
| Linkler | Giriş ve onay linkleri imzalı ve kısa ömürlü token taşır (giriş: 15 dk, tek kullanım). |
| E-posta | Resend (ücretsiz plan). |
| Depo | Vercel Marketplace üzerinden Upstash Redis (ücretsiz plan): izin listesi, bekleyen talepler, kullanılmış token'lar. |
| Gizli değerler | İmza anahtarı, Resend anahtarı ve sahip e-postası (`OWNER_EMAIL`; adresi sahibi verdi) Vercel ortam değişkenlerinde; repoda değil. |
| Kötüye kullanım | "Erişim iste" ve giriş linki isteklerine IP başına sınır. |

### İçerik güvenliği kuralı

Atlas'ın içeriği her zaman herkese açıkmış gibi yazılır. Kapı, kimin baktığını kontrol etmek içindir; gizlilik için değildir.

Atlas içeriğinde **asla** yer almaz: AWS hesap ID'si, IAM rol/ARN adları, bucket adları, IP adresleri, security group kuralları, secret adları ve değerleri, `.env` içeriği. Gerekirse `<deploy rolü>` gibi yer tutucu kullanılır. (Not: `build-push.yml` bu değerlerin bazılarını açık tutuyor; Atlas'a kopyalanmaz.)

---

## 7. Assay hattıyla etkileşim

`build-push.yml` `main-prod`'a her push'ta çalışır ve **`paths-ignore` taşımaz**. Atlas değişikliği `main-prod`'a birleşince Assay'ın üç image'ı da yeniden build edilir ve EC2'ye deploy edilir. `wsl-deploy.yml` (`test`) için de aynı durum geçerli.

Öneri: `build-push.yml` ve `wsl-deploy.yml`'a `paths-ignore: [ "atlas/**" ]` eklenir. Karışık commit'te pipeline yine çalışır.

**Karar (2026-11-02): ertelendi, `BACKLOG.md`'de.** O yapılana kadar her Atlas merge'ü Assay'ı da yeniden deploy eder; sahibi bunu kabul etti.

---

## 8. Fazlar

Her faz ayrı onay ve ayrı commit'ler ile ilerler.

| Faz | Kapsam | Bitti sayılır |
|-----|--------|---------------|
| 1 | `atlas/` iskeleti, akış sahnesi bileşeni, YAML okuyucu, dosya-var kontrolü, **02 Teslimat** (mockup'tan), sözlük sayfası, Vercel bağlantısı + preview. | Preview adresinde 02 akışı mockup'taki gibi çalışır. |
| 2 | Erişim kapısı (§6), alan adı, ilk production deploy. | `main-prod`'dan production; izin listesi dışı kişi içeri giremez; erişim talebi ve onay uçtan uca çalışır. |
| 3 | Altyapı akışları 01, 03, 04, 05. | Dört akış yayında. |
| 4 | Veri sayfası tipi (önce mockup), akışlar 06–09, sayfa 10. | Veri bölümü yayında. |

---

## 9. Kararlar (2026-11-02)

1. `paths-ignore`: ertelendi → `BACKLOG.md` (§7).
2. Alt alan adları: `atlas.assay.com.tr` (production), `atlas-test.assay.com.tr` (`test`).
3. Onay e-postası: sahibin verdiği adres, `OWNER_EMAIL` ortam değişkeninde.

---

## 10. Uygulayıcıya bırakılanlar

Klasör içi dosya düzeni, bileşen ayrımı, YAML şemasının alan adları, ikon seti, animasyon zamanlamaları (mockup referans), test yaklaşımı (kullanıcı testi kendisi yapar; derleme kontrolü + test listesi verilir).
