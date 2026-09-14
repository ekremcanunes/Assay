# Nginx & Reverse Proxy Öğrenim Notları

> İlgili dosyalar: `web/nginx.conf`, `web/Dockerfile`, `docker-compose.yml`, `kratos/kratos.yml`

---

## 1. nginx.conf Satır Satır

```nginx
server {
    listen 80;                              # konteyner içinde 80 portunu dinle
    root /usr/share/nginx/html;             # statik dosyaların klasörü (React build çıktısı)
    index index.html;                       # klasör istenirse index.html dön

    location /api/ {
        proxy_pass http://portfolio-service:5001;     # /api/... → portfolio-service
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Cookie $http_cookie;
    }

    location /.ory/ {
        proxy_pass http://kratos:4433/;               # /.ory/... → kratos (önek atılır)
        ...
    }

    location / {
        try_files $uri $uri/ /index.html;             # dosya yoksa index.html (SPA fallback)
    }
}
```

### Dosya imaja nasıl giriyor
`web/Dockerfile` **multi-stage build** kullanıyor (bir aşamada derleyip sadece çıktıyı son imaja taşımak):
1. `node:22-alpine` aşamasında `npm run build` çalışır ve `dist/` klasörünü üretir.
2. `nginx:alpine` aşamasında `dist/` klasörü `/usr/share/nginx/html` altına, `nginx.conf` de `/etc/nginx/conf.d/default.conf` yerine kopyalanır.

Son imajda Node yok. İçinde sadece nginx, statik dosyalar ve bu ayar var.

### `try_files $uri $uri/ /index.html`
**SPA** (Single Page Application: sayfa geçişlerinin tarayıcıda JavaScript ile yapıldığı uygulama) için gereklidir. `/portfolio` sayfasında F5'e basıldığında diskte `portfolio` diye bir dosya yoktur. nginx sırayla şunlara bakar:
1. `$uri`: böyle bir dosya var mı?
2. `$uri/`: böyle bir klasör var mı?
3. İkisi de yoksa `/index.html` döner. React Router URL'yi okuyup doğru sayfayı çizer.

Bu satır olmasa sayfa yenilemek 404 verirdi.

### `proxy_set_header` satırları
nginx araya girdiği için arka servis isteği nginx'ten gelmiş gibi görür. Bu başlıklar asıl bilgiyi taşır:

| Başlık | Taşıdığı bilgi |
|---|---|
| `Host $host` | Tarayıcının yazdığı alan adı |
| `X-Real-IP $remote_addr` | İsteği yapan istemcinin IP'si |
| `X-Forwarded-For $proxy_add_x_forwarded_for` | Yol boyunca geçilen IP zinciri (her proxy kendi gördüğünü ekler) |
| `Cookie $http_cookie` | Tarayıcının cookie'leri. nginx başlıkları zaten iletir, bu satır açıkça yazılmış hali |

---

## 2. Nginx Kullanınca Otomatik Reverse Proxy mi Olur?

**Hayır.** nginx varsayılan haliyle bir **web sunucusudur** (diskteki dosyaları HTTP ile verir). Reverse proxy rolünü `proxy_pass` direktifi başlatır.

- **Reverse proxy:** İstemcinin önünde durup istekleri kendi adına arkadaki sunuculara ileten katman. İstemci arkada kim olduğunu bilmez.
- **Forward proxy:** İstemci tarafında durup istemci adına dışarıya çıkan katman (ör. kurumsal internet proxy'si).

Bizim `nginx.conf` dosyasında nginx iki rolü birlikte oynar:

| Blok | Rol |
|---|---|
| `location /` | Web sunucusu: React dosyalarını diskten verir |
| `location /api/`, `location /.ory/` | Reverse proxy: isteği başka konteynere iletir |

nginx aynı mekanizmayla şunlar için de kullanılabilir: **load balancer** (yükü birden fazla sunucuya dağıtmak), **TLS termination** (HTTPS şifrelemesini proxy'de çözüp arkaya düz HTTP iletmek), rate limit, cache.

---

## 3. `proxy_pass` Sonundaki `/` Farkı

nginx'in kuralı şudur. `proxy_pass` adresinde `host:port` kısmından sonra **herhangi bir yol yazılmışsa** (tek bir `/` bile olsa) nginx, `location` ile eşleşen öneki keser ve yerine o yolu koyar. **Yol yazılmamışsa** isteğin yolu hiç değiştirilmeden iletilir.

### Kural tablosu

| `location` | `proxy_pass` | Gelen istek | Arkaya giden istek |
|---|---|---|---|
| `/api/` | `http://portfolio-service:5001` (yol **yok**) | `/api/assets` | `/api/assets` (aynen) |
| `/.ory/` | `http://kratos:4433/` (yol **var**: `/`) | `/.ory/sessions/whoami` | `/sessions/whoami` |

`/.ory/` için adım adım:
1. Gelen yol: `/.ory/sessions/whoami`
2. `location /.ory/` ile eşleşen kısım kesilir: `/.ory/`
3. Geriye kalan: `sessions/whoami`
4. Başına `proxy_pass` içindeki yol (`/`) eklenir: `/sessions/whoami`

### Neden iki blok farklı yazılmış
- **portfolio-service**'in endpoint'leri zaten `/api/...` ile başlıyor (`/api/assets`, `/api/dashboard`). Önek kesilseydi servis `/assets` görür ve 404 dönerdi.
- **Kratos** `/.ory` diye bir yol tanımıyor. Endpoint'leri doğrudan `/sessions/whoami`, `/self-service/login/browser` gibi yollarda. Önek kesilmeseydi Kratos `/.ory/sessions/whoami` görür ve 404 dönerdi.

`/.ory` sadece bizim uydurduğumuz bir yönlendirme etiketi. Kratos'a gitmeden önce atılması gerekir.

### Vite karşılığı
`web/vite.config.js` dosyasındaki dev proxy aynı işi JavaScript ile yapar:
```js
'/.ory': {
  target: 'http://localhost:4433',
  rewrite: (path) => path.replace(/^\/.ory/, ''),   // = nginx'teki sondaki "/"
}
```

### Tuzak: `location` ile `proxy_pass` uyumsuzluğu
```nginx
location /.ory {                      # sonda / YOK
    proxy_pass http://kratos:4433/;   # sonda / VAR
}
```
`/.ory/sessions` isteğinde `/.ory` kesilir, geriye `/sessions` kalır. Başına `/` eklenince `//sessions` olur. Kural: **`location` ve `proxy_pass` ya ikisi de `/` ile bitsin ya da hiçbiri.**

---

## 4. Konteyner İsimleri Nasıl Çözülüyor? (`portfolio-service`, `kratos`)

Evet, isimler `docker-compose.yml` dosyasındaki **servis adlarıdır**:

```yaml
services:
  portfolio-service:   # ← nginx.conf'taki "portfolio-service" bu
  kratos:              # ← "kratos" bu
  web:
```

### Mekanizma
1. `docker compose up` çalışınca Compose bir **ağ** oluşturur: `<proje-klasörü>_default`.
2. Her servisin konteyneri bu ağa bağlanır ve **servis adı, konteynerin ağdaki hostname'i olarak kaydedilir**.
3. Docker'ın her konteyner içinde çalışan bir **gömülü DNS sunucusu** vardır (`127.0.0.11`). **DNS**, isim → IP çözümleme sistemidir.
4. nginx `portfolio-service` adını çözmek istediğinde bu DNS `172.18.0.5` gibi bir iç IP döner.

Kendin görmek için:
```bash
docker network ls                                      # investment-tracker_default
docker network inspect investment-tracker_default      # hangi konteyner hangi IP'de
docker compose exec web nslookup portfolio-service     # web konteyneri içinden isim çözümle
```

### Sonuçları
- **İsimler sadece Docker ağının içinde çalışır.** Host makinede (Windows'ta) `http://portfolio-service:5001` çözülmez. Bu yüzden Vite dev proxy'si `localhost:5001` kullanır.
- **Servisler arası iletişim de aynı yolla çalışır:** `ServiceUrls__MarketService=http://market-service:5002`, `Kratos__BaseUrl=http://kratos:4433`.
- **Ağ içinde port açmak için `ports` gerekmez.** Aynı ağdaki konteynerler birbirlerinin dinlediği her porta erişebilir. `ports` sadece host'a açmak içindir (bkz. §7).
- **nginx ismi başlarken çözer.** `proxy_pass` içinde sabit isim yazılıysa nginx IP'yi açılışta alır. Açılışta isim çözülemezse `host not found in upstream` hatasıyla başlamaz. Arka konteyner yeniden oluşturulup IP'si değişirse nginx eski IP'de kalabilir ve 502 döner. Çözüm: `docker compose restart web`.

---

## 5. Kratos Session Cookie'si `/api/` İsteklerine Nasıl Gidiyor?

### Önce kavramlar
- **Cookie:** Sunucunun `Set-Cookie` başlığıyla tarayıcıya bıraktığı küçük veri. Tarayıcı bu veriyi sonraki isteklerde `Cookie` başlığıyla kendiliğinden geri gönderir.
- **Session cookie (bizde `ory_kratos_session`):** Giriş başarılı olunca Kratos'un bıraktığı, "bu tarayıcı giriş yapmış kullanıcı X" bilgisini taşıyan cookie.
- **Origin:** `şema + host + port` üçlüsü. `http://localhost` ile `http://localhost:4433` **farklı origin'lerdir**.

### Kritik kural: cookie port ayırmaz
Cookie'ler **alan adına (host) bağlıdır, porta bağlı değildir** (RFC 6265 bunu açıkça belirtir). `localhost:4433` adresinden bırakılan cookie, tarayıcı `localhost` üzerindeki **her porta** istek atarken gönderilir: `localhost:80`, `localhost:5001`, `localhost:4433`.

### Akış
```
1) Giriş
   Tarayıcı ──POST /self-service/login──▶ Kratos
   Tarayıcı ◀── Set-Cookie: ory_kratos_session=abc ──  (host: localhost)

2) API isteği
   Tarayıcı ──GET http://localhost/api/assets
              Cookie: ory_kratos_session=abc ──▶ nginx      ← tarayıcı cookie'yi kendisi ekler
   nginx    ──GET /api/assets
              Cookie: ory_kratos_session=abc ──▶ portfolio-service

3) Doğrulama (KratosMiddleware.cs)
   portfolio-service ──GET http://kratos:4433/sessions/whoami
                       Cookie: ory_kratos_session=abc ──▶ Kratos
   Kratos ── 200 { identity: { id: "u-123" } } ──▶ portfolio-service
   portfolio-service: context.Items["UserId"] = "u-123" → isteği işler
                      (cookie geçersizse 401 Unauthorized)
```

Özet: portfolio-service kimlik doğrulamayı **kendisi yapmaz**. Tarayıcıdan gelen cookie'yi Kratos'a gösterip "bu kim?" diye sorar. Bunun çalışması için iki şart var:
1. Tarayıcı cookie'yi `/api/` isteğine eklemeli. Aynı host olduğu için ekler. Axios tarafında `withCredentials: true` gerekir.
2. nginx cookie'yi arkaya iletmeli. `proxy_set_header Cookie` ve nginx'in varsayılan davranışı bunu sağlar.

### CORS nerede devreye giriyor
**CORS** (Cross-Origin Resource Sharing): tarayıcının JavaScript ile **farklı origin'e** istek atıp cevabını okumayı varsayılan olarak engellemesi ve sunucunun hangi origin'lere izin verdiğini başlıklarla bildirmesi mekanizması.

- Frontend `http://localhost` origin'inde çalışır. `/api/...` isteği aynı origin'e gider, CORS gerekmez.
- Kratos'a `http://localhost:4433` adresinden gidilirse port farklı olduğu için origin de farklıdır. Bu durumda CORS gerekir. `kratos.yml` içindeki `serve.public.cors.allowed_origins: [http://localhost]` bu izni verir.
- Kratos'a `http://localhost/.ory/...` üzerinden gidilirse her şey tek origin olur ve CORS'a hiç ihtiyaç kalmaz (bkz. §7).

---

## 6. Ayar Değişikliği: Neden `restart` Yetmez, `--build` Gerekir?

### Image ve container farkı
- **Image:** Donmuş şablon. `docker build` sırasında Dockerfile satırları çalıştırılarak üretilir.
- **Container:** Image'dan başlatılmış çalışan kopya.

`web/Dockerfile` içindeki şu satır:
```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
**build anında** çalışır. O andaki `nginx.conf` içeriğini image'ın içine kalıcı olarak yazar. Diskteki dosyayla image arasında canlı bir bağ kalmaz. Bu, yazıyı fotokopi çekmek gibidir: aslını sonradan değiştirmek fotokopiyi değiştirmez.

### Komutların farkı

| Komut | Ne yapar | `nginx.conf` değişikliği yansır mı |
|---|---|---|
| `docker compose restart web` | **Aynı container**'ı durdurup başlatır | ❌ Eski ayar image'da |
| `docker compose up -d web` | Image zaten varsa **yeniden build etmez**, onu kullanır | ❌ |
| `docker compose up -d --build web` | Image'ı yeniden build eder (yeni `COPY`), container'ı yeni image'la yeniden oluşturur | ✅ |

Aynı kural React kodu için de geçerli: `src/` altındaki bir değişiklik de ancak `--build` ile image'a girer.

### Doğrulama
```bash
docker compose up -d --build web
docker compose exec web cat /etc/nginx/conf.d/default.conf   # konteynerdeki ayar gerçekten yeni mi
docker compose exec web nginx -t                             # sözdizimi kontrolü
```

### Alternatif: bind mount (geliştirme için)
**Bind mount**, host'taki bir dosyayı konteynerin içine canlı bağlamaktır. İki taraf aynı dosyayı görür:
```yaml
web:
  volumes:
    - ./web/nginx.conf:/etc/nginx/conf.d/default.conf:ro
```
Bu kurulumda dosyayı değiştirdikten sonra rebuild gerekmez, nginx'e yeniden okumasını söylemek yeter:
```bash
docker compose exec web nginx -s reload
```
Prod'da tercih edilmez. Prod'da image içeriği, build edilip test edilen haliyle aynı kalmalıdır.

---

## 7. Proxy'nin Atlanmasını Engellemek

### Problem
`ports` ile host'a açılan her servis, nginx'e uğramadan doğrudan erişilebilir hale gelir:

```
                 ┌──▶ :80    nginx ──▶ servisler      ← istenen tek giriş
Dış dünya ───────┼──▶ :5001  portfolio-service        ← nginx atlanır
                 ├──▶ :5002  market-service           ← nginx atlanır
                 ├──▶ :4433  kratos public
                 ├──▶ :4434  kratos ADMIN             ← kimlik silme/oluşturma, kimlik doğrulaması yok
                 └──▶ :6379  redis                    ← şifresiz veri erişimi
```

Proxy atlanınca nginx'te uygulanan her kural (yönlendirme, başlıklar, ileride rate limit ve TLS) devre dışı kalır. Kratos admin API'si ve Redis ise kimlik doğrulaması olmadan tam yetki verir.

### `ports` ve `expose` farkı

| | `ports: "5001:5001"` | `expose: ["5001"]` |
|---|---|---|
| Host'tan erişim | ✅ Açık (`localhost:5001`) | ❌ Kapalı |
| Aynı Docker ağındaki konteynerlerden erişim | ✅ | ✅ |
| Asıl işlevi | Portu host'a **yayınlar** (publish) | **Belgeleme**: "bu servis bu portu dinliyor" bilgisi |

Compose ağında konteynerler `expose` yazılmasa da birbirlerinin portlarına erişebilir. Yani `expose` erişim açmaz, niyeti okunur kılar. Güvenliği sağlayan şey **iç servislerde `ports` bulunmamasıdır**.

**Kural:** Dışarıya sadece giriş kapısı (`web`) `ports` ile açılır. Diğer servisler `expose` ile belgelenir.

### Hedef `docker-compose.yml`
```yaml
services:
  postgres:
    expose: ["5432"]

  kratos:
    expose: ["4433", "4434"]      # admin (4434) asla host'a açılmaz

  redis:
    expose: ["6379"]

  market-service:
    expose: ["5002"]

  portfolio-service:
    expose: ["5001"]

  web:
    ports:
      - "80:80"                   # tek giriş kapısı
```

### Kratos'u da nginx arkasına almak
Kratos portu kapatılınca tarayıcı `localhost:4433` adresine artık ulaşamaz. Bu yüzden Kratos trafiği de nginx'teki `/.ory/` bloğundan geçmelidir:

**1. Frontend: mutlak adres yerine göreli yol**
```js
// AuthContext.jsx, Login.jsx, Register.jsx
fetch('/.ory/sessions/whoami', { credentials: 'include' })
window.location.href = '/.ory/self-service/login/browser'
```

**2. `kratos.yml`: Kratos'a dışarıdan hangi adresle görüldüğünü bildir**
```yaml
serve:
  public:
    base_url: http://localhost/.ory/
```
Kratos yönlendirme ve form `action` adreslerini `base_url` üzerinden üretir. Bu değer yanlış kalırsa tarayıcı yine kapalı olan `:4433` portuna yönlendirilir.

**3. CORS ihtiyacı ortadan kalkar.** Tüm istekler `http://localhost` origin'inden gider.

Sonuçta tarayıcının gördüğü tek adres şudur:
```
Tarayıcı ──▶ http://localhost ──▶ nginx ─┬─ /        → React dosyaları
                                         ├─ /api/    → portfolio-service:5001 ──▶ market-service:5002
                                         └─ /.ory/   → kratos:4433
```

### Geliştirme ortamında doğrudan erişim gerekirse
Servisi tek başına test etmek (Swagger, Redis CLI, psql) için iki güvenli yol var.

**a) `docker-compose.override.yml` ile sadece yerel makineye aç.** Compose, aynı klasördeki `docker-compose.override.yml` dosyasını ana dosyayla **otomatik birleştirir**. Bu dosya sadece geliştirici makinesinde bulunur, sunucuya gönderilmez:
```yaml
# docker-compose.override.yml (sadece lokal)
services:
  portfolio-service:
    ports: ["127.0.0.1:5001:5001"]
  redis:
    ports: ["127.0.0.1:6379:6379"]
```
`127.0.0.1:` öneki portu sadece **loopback arayüzüne** (makinenin kendi kendine eriştiği iç adres) bağlar. Aynı ağdaki başka bir bilgisayar bu porta erişemez. Önek yazılmazsa Docker portu `0.0.0.0` adresine, yani tüm ağ arayüzlerine açar.

**b) Port açmadan konteynerin içinden eriş:**
```bash
docker compose exec redis redis-cli
docker compose exec postgres psql -U kratos
docker compose exec web wget -qO- http://portfolio-service:5001/health
```

### Prod'da ek katman
Sunucu tarafında **security group / firewall** (hangi portlara hangi kaynaklardan trafik gelebileceğini belirleyen ağ kuralı) sadece 80/443 portlarına izin verir. Compose ayarında bir hata yapılsa bile iç portlar internete açılmaz. Bu yaklaşıma **defense in depth** denir: tek bir güvenlik katmanına güvenmeyip birbirinden bağımsız birden fazla katman koymak.

---

## 8. Hata Ayıklama: İstek Nerede Kaldı?

```bash
docker compose logs -f web                      # nginx: her istek bir satır (IP, yol, status)
docker compose logs -f web portfolio-service    # iki tarafı yan yana izle
```

| nginx logunda gördüğün | Anlamı | Nereye bak |
|---|---|---|
| Satır **yok** | İstek nginx'e hiç ulaşmadı | Tarayıcı, yanlış port, `ports` eşlemesi |
| `404` | Hiçbir `location` bloğu uymadı ya da dosya yok | `location` önekleri, `proxy_pass` sonundaki `/` (§3) |
| `502 Bad Gateway` | nginx arka servise ulaşamadı | Servis ayakta mı, isim/port doğru mu, IP değişti mi (§4) |
| `504 Gateway Timeout` | Arka servis zamanında cevap vermedi | Arka servisin logları, yavaş sorgu |
| `401` | İstek arkaya ulaştı, oturum geçersiz | Cookie gidiyor mu (§5), Kratos ayakta mı |
| `500` | İstek arkaya ulaştı, uygulama hata verdi | portfolio-service logları |

`location` eşleştirme kuralı: önek eşleşmesinde **en uzun eşleşen kazanır**, dosyadaki sıranın önemi yoktur. `/api/assets` isteği hem `/api/` hem `/` ile eşleşir ama `/api/` daha uzun olduğu için o seçilir.
