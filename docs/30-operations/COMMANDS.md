# Komut Rehberi

Bu projede sık kullanılan komutlar. Tümü WSL2 terminalinde, proje kök dizininde çalıştırılır.

## Docker Compose

```bash
docker compose ps                  # servislerin durumunu göster (ayakta mı?)
docker compose up -d               # tüm servisleri arka planda başlat
docker compose up -d --build       # imajları yeniden build edip başlat (kod değişince)
docker compose down                # tüm servisleri durdur ve container'ları sil
docker compose logs               # tüm loglar
docker compose logs -f kratos      # bir servisin loglarını canlı izle (Ctrl+C ile çık)
docker compose logs --tail 50 web  # son 50 satır log
docker compose restart portfolio-service   # tek servisi yeniden başlat
docker compose exec kratos sh      # çalışan container içinde shell aç (exit ile çık)
docker compose exec market-service env     # container'ın environment variable'larını gör
```

> `docker compose exec <servis>` → compose'daki servis adını kullanır (`postgres`, `kratos`, `redis`, `web`, `portfolio-service`, `market-service`). Container'ın tam adını bilmek gerekmez.

## Docker (genel)

```bash
docker ps                          # çalışan container'lar
docker ps -a                       # duranlar dahil hepsi
docker images                      # indirilen imajlar
docker inspect <container-adı>     # container detayları (network, IP, env)
docker network ls                  # network listesi
docker network inspect investment-tracker_default   # hangi container'lar bağlı
docker volume ls                   # volume'lar (kratos_postgres_data burada)
docker system df                   # docker'ın kapladığı disk alanı
docker logs <container-adı>        # compose dışı container logları
docker container prune             # sadece durdurulmuş container'ları sil
docker system prune -a             # kullanılmayan her şeyi temizle (container, image, network, cache)
```

## Kratos Postgres (kullanıcı/kimlik verisi)

```bash
docker compose exec postgres psql -U kratos -d kratos   # veritabanına bağlan
```

Bağlandıktan sonra psql içinde:

```sql
\dt                                          -- tabloları listele
\d identities                                -- bir tablonun kolonlarını göster
SELECT id, traits, created_at FROM identities;   -- kayıtlı kullanıcılar (email traits içinde JSON)
SELECT * FROM sessions ORDER BY issued_at DESC LIMIT 5;  -- son oturumlar
\q                                           -- çık
```

### psql temel komutlar

| Komut | Ne yapar |
|-------|----------|
| `\dt` | Tabloları listeler |
| `\d <tablo>` | Tablonun şemasını gösterir |
| `\l` | Veritabanlarını listeler |
| `\c <db>` | Başka veritabanına geçer |
| `\x` | Geniş satırları dikey gösterir (aç/kapa) |
| `\q` | Çıkar |

> Şifreler `identity_credentials` tablosunda bcrypt hash olarak durur — plaintext yoktur, "şifreyi görmek" diye bir şey mümkün değildir (bu iyi bir şey).

## Redis (market cache)

```bash
docker compose exec redis redis-cli ping           # ayakta mı? Beklenen: PONG
docker compose exec redis redis-cli                # redis komut satırına bağlan
docker compose exec redis redis-cli keys '*'       # cache'deki tüm key'ler (dev'de ok, prod'da kullanma)
docker compose exec redis redis-cli get currency:USD   # belirli key'i oku
docker compose exec redis redis-cli del currency:USD   # key sil
docker compose exec redis redis-cli flushall       # tüm cache'i temizle (dikkat!)
docker compose exec redis redis-cli INFO server | grep port   # redis bilgisi (port, versiyon)
```

redis-cli içinde ek olarak:

```
TTL <anahtar>       # kalan yaşam süresi (saniye; -2 = yok, -1 = süresiz)
exit                # çık
```

## Ory Kratos API

```bash
curl -s http://localhost:4433/health/ready        # kratos ayakta mı?
curl http://localhost:4433/health/alive           # canlılık kontrolü
curl http://localhost:4433/version                # versiyon
curl http://localhost:4433/sessions/whoami        # mevcut session kontrolü
curl -s http://localhost:4434/admin/identities | head -50   # admin API: kullanıcı listesi (JSON)
curl http://localhost:4434/admin/identities/<identity-id>   # belirli kullanıcı
curl -X DELETE http://localhost:4434/admin/identities/<identity-id>   # kullanıcı sil

# Tarayıcıda flow başlatma:
# Login:        http://localhost:4433/self-service/login/browser
# Registration: http://localhost:4433/self-service/registration/browser
```

## API Test

```bash
# Portfolio servisi (session cookie gerekir)
curl -b "ory_session=<token>" http://localhost:5001/api/portfolios
curl -b "ory_session=<token>" http://localhost:5001/api/dashboard

# Market servisi (session cookie gerekir)
curl -b "ory_session=<token>" "http://localhost:5002/api/market/prices?symbols=USD,AAPL,BTC"
```

## EF Core Migration

```bash
# Migration oluştur (Windows'ta çalıştır)
cd portfolio-service
dotnet ef migrations add <MigrationAdi>

dotnet ef migrations remove      # migration geri al
dotnet ef database update        # migration uygula
dotnet ef migrations list        # migration listesi
```

## Linux / WSL2

```bash
sudo lsof -i :5002        # hangi process bu portu kullanıyor (6379, 5001, 4433...)
hostname -I               # WSL2 IP adresi
free -h                   # RAM durumu

# WSL2 native servisler
sudo service docker start
sudo service docker status
sudo service redis-server stop    # native redis, container'daki ile çakışırsa
```

## GitHub Actions Runner (WSL2)

```bash
sudo systemctl status actions.runner.*   # runner servisi çalışıyor mu?
```

## Hata Ayıklama Sırası

Bir şey çalışmıyorsa bu sırayı takip et:

```bash
# 1. Container'lar ayakta mı?
docker compose ps

# 2. Hatalı servisin loguna bak
docker compose logs <servis-adı> --tail=50

# 3. Migration hatası şüphesinde
docker compose logs kratos-migrate

# 4. Environment variable'lar doğru mu?
docker compose exec <servis-adı> env

# 5. Network sorunuysa — sıfırla
docker compose down && docker compose up -d --build

# 6. Port çakışması varsa — kimin kullandığını bul
sudo lsof -i :<port>

# 7. Kratos session geçerli mi?
curl http://localhost:4433/sessions/whoami

# 8. Kratos restart et
docker compose restart kratos
```

> **DİKKAT — geri dönüşü yok:** `docker volume rm investment-tracker_kratos_postgres_data` tüm kullanıcı kayıtlarını siler. Son çare.
