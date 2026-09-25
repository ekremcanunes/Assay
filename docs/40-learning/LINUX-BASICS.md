# Linux Temel Kavramlar

Docker'a özel olmayan, genel Linux/işletim sistemi bilgisi. Docker konteynerleri Linux çekirdeği üstünde çalıştığı için (WSL2'de de öyle), bu kavramlar Docker'ı anlamanın önkoşulu.

Docker'a özel notlar: [`DOCKER-LEARNING.md`](DOCKER-LEARNING.md).

## Standart akışlar (stdin / stdout / stderr)

Her process'in doğuştan 3 standart borusu var — Windows, Linux, macOS fark etmez, evrensel (POSIX kökenli):

| Akış | Ne | Örnek |
|---|---|---|
| `stdin` | Girdi | Klavyeden okunan veri |
| `stdout` | Normal çıktı | `Console.WriteLine`, `print` |
| `stderr` | Hata çıktısı | İstisna/hata mesajları |

Terminalde çalıştırınca stdout ekrana bağlı görünür ama **zorunlu değil** — yönlendirilebilir:

```bash
dotnet run > log.txt      # stdout artık dosyaya akıyor
dotnet run | jq            # stdout artık jq'ya akıyor
dotnet run 2> err.txt      # sadece stderr dosyaya
```

**Neden önemli:** `LOGGING.md`'nin temel kuralı ("servis stdout'a yazar, nereye gideceğine platform karar verir") bu prensibe dayanır. Uygulama kodu stdout'un ucunda ne olduğunu bilmez/bilmemeli — bu, EC2→ECS→EKS geçişlerinde kod değişmeden platformun log hedefini değiştirebilmesini sağlar.

## journalctl

systemd'nin merkezi log okuyucusu. Sistemin **tüm** loglarını (kernel, systemd servisleri, boot süreci) tek yerden gösterir.

```bash
journalctl -u docker              # sadece Docker servisinin logu
journalctl -u docker -f           # canlı takip (tail -f gibi)
journalctl -u docker --since "1 hour ago"
journalctl -xe                    # en son + hata detaylı
journalctl -b                     # son boot'tan beri her şey
```

`-u <servis>` filtresi olmadan (`journalctl` çıplak) çok kalabalık çıkar — genelde bir servisle ya da zaman aralığıyla filtrelenir.

**Docker bağlamında iki farklı log var, karıştırılmamalı:**

| | Ne | Nasıl görülür |
|---|---|---|
| Uygulamanın logu | Senin kodunun stdout'u, Docker tarafından yakalanıp diske kaydedilir | `docker logs <konteyner>` |
| Docker Engine'in kendi logu | Docker servisinin kendi iç logu (başlatma, hata, konteyner yaşam döngüsü olayları) | `journalctl -u docker` |

Uygulaman hata veriyor mu → `docker logs`. Docker'ın kendisi çökmüş/başlamıyor mu → `journalctl -u docker`.

## Konteyner logunun zinciri

```
[uygulama kodu]     Console.WriteLine / Serilog WriteTo.Console(...)
       │            (stdout'a yazar)
       ▼
[stdout]            işletim sistemi seviyesinde çıktı borusu
       │
       ▼
[Docker Engine]     konteynerin stdout'unu YAKALAR, diske kaydeder
                    (json-file sürücüsü → /var/lib/docker/containers/<id>/<id>-json.log)
       │
       ▼
[docker logs]       o dosyayı okuyup gösterir
```

`docker logs` kendi başına bir log **üretmiyor** — sadece Docker'ın yakalayıp kaydettiği stdout içeriğini okuyup gösteriyor. Gerçek dosya yolunu görmek için:

```bash
docker inspect --format '{{.LogPath}}' <konteyner_adi>
```

İlgili: [`../10-standards/LOGGING.md`](../10-standards/LOGGING.md) §1, §6
