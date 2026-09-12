# Doküman İndeksi

Proje dokümanları bu klasörde, numaralı kategori klasörleri altında tutulur.

## Klasör Şeması

| Klasör | Kategori | Ne zaman okunur |
|--------|----------|-----------------|
| `10-standards/` | Standartlar (tasarım, kod kuralları) | İlgili alanda kod yazmadan **önce** — bağlayıcıdır |
| `20-modules/` | Modül tasarımları | O modülde çalışırken |
| `30-operations/` | Operasyon (komutlar, çalıştırma) | Servis ayağa kaldırırken, sorun giderirken |
| `40-learning/` | Öğrenme notları | Referans; bağlayıcı değildir |
| `superpowers/` | Plan/spec/verification arşivi | Tarihsel kayıt; içindeki eski dosya yolları güncel olmayabilir |

## Dokümanlar

- [10-standards/DESIGN.md](10-standards/DESIGN.md) — Tasarım sistemi: renk token'ları, tipografi, veri dürüstlüğü kuralları. **UI değişikliğinden önce zorunlu okuma.**
- [10-standards/DATA-FETCHING.md](10-standards/DATA-FETCHING.md) — React Query veri çekme kuralları. **Web'de veri çeken kod yazmadan önce zorunlu okuma.**
- [10-standards/PIPELINE-SECURITY.md](10-standards/PIPELINE-SECURITY.md) — Pipeline güvenlik standardı (planlama): kod hangi analiz istasyonlarından geçer, araç seçimi, GitHub Actions/CodePipeline sorumluluk ayrımı, öncelik sırası.
- [10-standards/LOGGING.md](10-standards/LOGGING.md) — Loglama standardı: stdout+JSON kuralı, seviye politikası, ne loglanmaz, docker rotasyonu, AWS'ye geçiş adımları. **Log yazan veya log altyapısına dokunan değişikliklerde zorunlu okuma.**
- [20-modules/GOLD-MODULE.md](20-modules/GOLD-MODULE.md) — Altın modülü tasarımı.
- [30-operations/COMMANDS.md](30-operations/COMMANDS.md) — Komut rehberi: Docker, Redis, Kratos, psql, EF Core, hata ayıklama sırası.
- [40-learning/DOCKER-LEARNING.md](40-learning/DOCKER-LEARNING.md) — Docker öğrenme notları.

## Kurallar

- Yeni doküman → kategorisine uygun klasöre; yeni bir kategori gerekirse sıradaki onluk numarayla klasör açılır (ör. `50-...`).
- Kök dizine veya servis klasörlerinin içine (`web/` vb.) doküman konmaz. İstisnalar: `CLAUDE.md` (Claude Code kökten yükler) ve `README.md` (proje tanıtımı).
- Doküman eklenince/taşınınca bu indeks ve `CLAUDE.md` §0 güncellenir.
