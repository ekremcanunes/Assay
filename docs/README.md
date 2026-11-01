# Doküman İndeksi

Proje dokümanları bu klasörde, numaralı kategori klasörleri altında tutulur.

## Klasör Şeması

| Klasör | Kategori | Ne zaman okunur |
|--------|----------|-----------------|
| `10-standards/` | Standartlar (tasarım, kod kuralları) | İlgili alanda kod yazmadan **önce** — bağlayıcıdır |
| `20-modules/` | Modül tasarımları | O modülde çalışırken |
| `30-operations/` | Operasyon (komutlar, çalıştırma) | Servis ayağa kaldırırken, sorun giderirken |
| `40-learning/` | Öğrenme notları | Referans; bağlayıcı değildir |
| `50-planning/` | Planlama (backlog) | Yeni işe başlamadan, ertelenen işleri hatırlamak için |
| `60-design/` | Tasarım girdileri (mockup, ekran görüntüsü, UI aracı çıktısı) — tek klasör, ad öneki `mobil-` / `web-` | Ekranı kodlamadan önce; bağlayıcı olan yine `10-standards/DESIGN.md` |
| `superpowers/` | Plan/spec/verification arşivi | Tarihsel kayıt; içindeki eski dosya yolları güncel olmayabilir |

## Dokümanlar

- [10-standards/DESIGN.md](10-standards/DESIGN.md) — **Warm Editorial** tasarım sistemi: açık + koyu token'lar, tek kobalt aksan, 8 basamaklı tip ölçeği, köşe/gölge kademeleri, bileşen anatomisi, veri dürüstlüğü. Landing + auth + panel için tek standart. **UI değişikliğinden önce zorunlu okuma.** Canlı referans: `/landing`.
- [10-standards/DATA-FETCHING.md](10-standards/DATA-FETCHING.md) — React Query veri çekme kuralları. **Web'de veri çeken kod yazmadan önce zorunlu okuma.**
- [10-standards/PIPELINE-SECURITY.md](10-standards/PIPELINE-SECURITY.md) — Pipeline güvenlik standardı (planlama): kod hangi analiz istasyonlarından geçer, araç seçimi, GitHub Actions/CodePipeline sorumluluk ayrımı, öncelik sırası.
- [10-standards/LOGGING.md](10-standards/LOGGING.md) — Loglama standardı: stdout+JSON kuralı, seviye politikası, ne loglanmaz, docker rotasyonu, AWS'ye geçiş adımları. **Log yazan veya log altyapısına dokunan değişikliklerde zorunlu okuma.**
- [10-standards/WRITING.md](10-standards/WRITING.md) — Yazım standardı (Basit Teknik Türkçe, ASD-STE100 uyarlaması): kısa cümle, emir kipi, kural kimliği. **Standart dokümanı veya agent talimatı yazmadan önce zorunlu okuma.**
- [20-modules/GOLD-MODULE.md](20-modules/GOLD-MODULE.md) — Altın modülü tasarımı.
- [20-modules/SCREENS.md](20-modules/SCREENS.md) — Ekranların içeriği ve davranışı (taslak; DESIGN.md'den taşınan ham notlar).
- [30-operations/COMMANDS.md](30-operations/COMMANDS.md) — Komut rehberi: Docker, Redis, Kratos, psql, EF Core, hata ayıklama sırası.
- [40-learning/DOCKER-LEARNING.md](40-learning/DOCKER-LEARNING.md) — Docker öğrenme notları.
- [40-learning/LINUX-BASICS.md](40-learning/LINUX-BASICS.md) — Linux temel kavramlar: stdout/stderr, journalctl, konteyner log zinciri.
- [40-learning/AWS-BASICS.md](40-learning/AWS-BASICS.md) — Bu projede kullanılacak AWS servisleri: OIDC, ECR, EC2, maliyet kalemleri, bölge seçimi.
- [40-learning/PROD-PIPELINE-GUNLUGU.md](40-learning/PROD-PIPELINE-GUNLUGU.md) — Prod pipeline günlüğü (2026-09-26/27): Kratos sırları, compose image/build ayrımı, deploy.sh tasarımı, OIDC `sub` olayı, pipeline tetikleme sorunu ve "deploy birimi" kök nedeni.
- [40-learning/PLAYWRIGHT-LEARNING.md](40-learning/PLAYWRIGHT-LEARNING.md) — Playwright & render notları: projede client/server ayrımı (SSR yok, CSR), Playwright'ın katkısı, Claude uygulaması karşılaştırması, npm/npx, MCP kapsamı.
- [50-planning/BACKLOG.md](50-planning/BACKLOG.md) — Sonraya bırakılan işler: sorun, seçenekler, öneri (ilk madde: kayıtta hesabın OTP'den önce oluşması).
- [50-planning/PLATFORM-ROADMAP.md](50-planning/PLATFORM-ROADMAP.md) — Platform yol haritası: vizyon (Assay anlatır, karar vermez), ilkeler (hesap kodda, yorum LLM'de), aşamalar (Assay toparlama → Insight/LLM → bildirim → platform katmanı → yeni bacaklar) ve her aşamanın öğrettiği altyapı. **Yeni iş seçmeden önce oku.**
- [40-learning/NGINX-LEARNING.md](40-learning/NGINX-LEARNING.md) — Nginx & reverse proxy notları: nginx.conf satır satır, `proxy_pass` sondaki `/` kuralı, Compose DNS, session cookie akışı, rebuild gerekliliği, proxy atlamayı engelleme.

## Kurallar

- Yeni doküman → kategorisine uygun klasöre; yeni bir kategori gerekirse sıradaki onluk numarayla klasör açılır (ör. `50-...`).
- Kök dizine veya servis klasörlerinin içine (`web/` vb.) doküman konmaz. İstisnalar: `CLAUDE.md` (Claude Code kökten yükler) ve `README.md` (proje tanıtımı).
- Doküman eklenince/taşınınca bu indeks ve `CLAUDE.md` §0 güncellenir.
