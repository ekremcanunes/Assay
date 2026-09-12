# Tarihe Göre Fiyat — Doğrulama Senaryoları

Özellik: alım formunda tarih seçilince o günün fiyatı otomatik gelir; elle girilen fiyat saparsa kademeli uyarı çıkar. Ayrıca altın grafiği her mumu kendi gününün kuruyla çevirir.

Spec: [`../specs/2026-08-23-price-on-date-design.md`](../specs/2026-08-23-price-on-date-design.md) · Commit: `d528a97`

---

## Neden bu senaryolar var

Özellik geliştirilirken **oturum açılamadığı** için hiçbir uç nokta canlı çağrılamadı. Geliştirme sırasındaki doğrulama üç ayağa dayandı:

| Kontrol | Ne kanıtlar | Ne kanıtlamaz |
|---|---|---|
| `dotnet build` | Derleniyor | Doğru çalıştığını |
| Uç nokta **401** dönüyor (404/500 değil) | Route kaydolmuş, DI çözülmüş, middleware'e ulaşılmış | Dönen sayının doğruluğunu |
| Yahoo/Frankfurter'dan elde hesap | Formülün doğruluğu | Kodun o formülü gerçekten uyguladığını |

Aşağıdaki senaryolar **eksik kalan halkayı** kapatır: kodun HTTP üzerinden gerçekten doğru sayıyı döndürdüğünü.

> **401 hatırlatması:** 404 = route yok, 500 = DI/binding bozuk, 401 = iskelet sağlam. Giriş yapmadan test edersen hepsi 401 döner, bu normaldir.

---

## Referans değerler

Gerçek piyasa verisiyle teyit edildi (Yahoo `GC=F` + Frankfurter + Türk kaynakları):

| Ne | Beklenen | Nereden doğrulandı |
|---|---|---|
| THYAO 16.06.2026 | **326,50 ₺** | Yahoo `THYAO.IS` günlük kapanış |
| THYAO 20.06.2026 (Cmt) | **19.06** tarihine düşer, **326,75 ₺** | aynı |
| USD 16.06.2026 | **46,30 ₺** | Frankfurter |
| Altın 16.06.2026 | **~6.446,89 ₺/gram** | 4330,9 USD/ons ÷ 31,1034768 × 46,30 · gerçek piyasa kapanışı 6.438,53 (−%0,13) |
| Altın grafiği, 1y ilk mumu (25.08.2025) | **~4.446 ₺** | 3373,8 USD/ons × 40,992 (o günün kuru) |
| — düzeltme öncesi yanlış değeri | ~5.213 ₺ | bugünün kuruyla (48,066) çarpılıyordu |

---

## A. Tarayıcı konsolu

`http://localhost` — **giriş yapmış** halde, F12 → Console.

### A1. Dört temel çağrı

```js
const g = async (sym, type, date) => {
  const r = await fetch(`/api/market/price-on/${sym}?assetType=${type}&date=${date}`, { credentials: 'include' })
  const j = await r.json()
  console.log(`${type.padEnd(9)} ${date}  →  available=${j.available}  effective=${j.effectiveDate}  TRY=${j.priceInTry}  kind=${j.priceKind}`)
}
await g('THYAO', 'Stock',    '2026-06-16')
await g('THYAO', 'Stock',    '2026-06-20')
await g('USD',   'Currency', '2026-06-16')
await g('XAU',   'Gold',     '2026-06-16')
```

| Satır | available | effective | TRY | kind |
|---|---|---|---|---|
| THYAO 16 Haz | `true` | `2026-06-16` | ~326,50 | `close` |
| THYAO 20 Haz | `true` | **`2026-06-19`** | ~326,75 | `close` |
| USD 16 Haz | `true` | `2026-06-16` | 46,30 | `close` |
| XAU 16 Haz | `true` | `2026-06-16` | ~6.446,89 | `close` |

**İkinci satır kritik** — istenen tarihten *farklı* bir tarih dönmeli. Hafta sonu geri kayma mantığı orada kanıtlanır.

> Altında sembol yok sayılır; servis her zaman `GC=F` kullanır. `XAU` yerine ne yazarsan aynı sonucu verir.

### A2. Bugün → anlık fiyat

```js
await g('THYAO', 'Stock', new Date().toLocaleDateString('sv'))
```

`kind` **`live`** olmalı. `sv` locale'i `YYYY-MM-DD` verir ve **yerel** takvimi kullanır — bu satır aynı zamanda gece 00:00–03:00 arasındaki UTC/yerel uyuşmazlığını sınar (düzeltilmiş bir hataydı, `MarketClock`).

### A3. Girdi doğrulaması — üçü de 400

```js
for (const u of [
  '/api/market/price-on/THYAO?assetType=Stock&date=2030-01-01',   // gelecek tarih
  '/api/market/price-on/THYAO?assetType=Stock&date=16-06-2026',   // bozuk format
  '/api/market/price-on/THYAO?assetType=Crypto&date=2026-06-16',  // beyaz liste dışı tip
]) console.log((await fetch(u, { credentials: 'include' })).status, u.slice(30))
```

### A4. Veri yok → hata değil

```js
await g('ZZZZZZ', 'Stock', '2026-06-16')
```

`available=false` ve HTTP **200** dönmeli — 404 değil. Frontend'in "veri yok" ile "istek bozuk"u ayırt etmesi buna bağlı.

### A5. Cache gidiş-dönüşü — aynı çağrıyı iki kez

```js
await g('THYAO', 'Stock', '2026-06-16')   // ilk: sağlayıcıdan gelir, Redis'e yazılır
await g('THYAO', 'Stock', '2026-06-16')   // ikinci: Redis'ten okunur
```

**İki satır birebir aynı olmalı.** Fark varsa serileştirme gidiş-dönüşü bozuktur — özellikle `effectiveDate` boş ya da bozuk gelirse `DateOnly`'nin JSON'a yazılıp geri okunması sorunludur. Geliştirme sırasında oturum olmadığı için cache hiç dolmadı, yani bu yol **hiç çalışmadı**; en çok göz isteyen yer burası.

Anahtarları görmek istersen:

```bash
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/acer/Desktop/investment-tracker && docker compose exec -T redis redis-cli KEYS "priceon:*"'
```

### A6. Grafik ile form aynı şeyi söylüyor mu

Önce eski cache'i temizle:

```bash
wsl -d Ubuntu -- bash -lc "cd /mnt/c/Users/acer/Desktop/investment-tracker && docker compose exec -T redis sh -c \"redis-cli --scan --pattern 'history:gold:*' | xargs -r redis-cli DEL\""
```

Sonra konsolda:

```js
const h = await (await fetch('/api/market/history/XAU?assetType=Gold&range=1y', { credentials: 'include' })).json()
const ilk = h.candles[0], son = h.candles.at(-1)
console.log('ilk mum:', new Date(ilk.time*1000).toISOString().slice(0,10), ilk.close.toFixed(2))
console.log('son mum:', new Date(son.time*1000).toISOString().slice(0,10), son.close.toFixed(2))
```

- İlk mum (25.08.2025) → **~4.446**. Eğer **~5.213** görürsen düzeltme çalışmamış **ya da** cache temizlenmemiştir.
- Son mum → ~7.233, değişmemiş olmalı (bugüne yakın günlerde iki yöntem zaten örtüşür).

---

## B. Arayüz senaryoları

`/assets/buy` → Hisse → THYAO seç.

| # | Yapılacak | Beklenen |
|---|---|---|
| 1 | Tarih **16.06.2026** | Fiyat kendiliğinden dolar, altında `16.06.2026 KAPANIŞI` |
| 2 | Tarih **20.06.2026** (Cmt) | Fiyat dolar, not **iki tarihi birden** söyler: 19.06 kapanışı kullanıldı, 20.06 işlem günü değildi |
| 3 | Tarih bugün | Not `şu anki fiyat` der |
| 4 | Fiyatı elle değiştir, **sonra** tarihi değiştir | Yazdığın **korunur**, ezilmez |
| 5 | Fiyatı **%8** artır | Kahverengi (`brass`) uyarı, kayıt serbest |
| 6 | Fiyatı **%30** artır, "Al"a bas | Kırmızı (`margin`) uyarı + **onay modalı**; onaylayınca kayıt tamamlanır, modal tekrar açılmaz |
| 7 | Fiyat alanını tamamen sil | **Hiçbir uyarı çıkmaz** (bir bugdı, düzeltildi) |
| 8 | "o günün fiyatına dön" bağlantısı | Fiyat otomatiğe döner, uyarı kaybolur |
| 9 | Tarih alanının konumu | **Fiyatın üstünde** olmalı — kullanıcıyı tarihe itme kararı |

### B10. Sağlayıcı kesintisi

```bash
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/acer/Desktop/investment-tracker && docker compose stop market-service'
```

Forma dön: fiyat gelmez ama **"fiyat getirilemedi"** notu çıkar ve **kayıt yine çalışır**. Sonra:

```bash
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/acer/Desktop/investment-tracker && docker compose start market-service'
```

---

## Takılırsan

| Belirti | Muhtemel sebep |
|---|---|
| Hepsi 401 | Giriş yapılmamış, ya da farklı bir tarayıcıda giriş yapılmış |
| Altın grafiği hâlâ ~5.213 | Redis cache temizlenmedi (A5'teki komut) |
| `effective` her zaman istenen tarihe eşit | Hafta sonu/tatil mantığı çalışmıyor — `PickAtOrBefore` |
| Bugün seçilince `kind=close` | `MarketClock` saat dilimi sorunu |
| Fiyat elle yazdıktan sonra eziliyor | `priceSource` `manual`'a geçmiyor |

## Bilinen, kabul edilmiş sınırlar

- **Test yok** — bilinçli ertelenen borç, spec §10'da hangi testlerin hangi fixture'la yazılacağı yazılı.
- **EUR/GBP kote hisse:** geçmiş tarihte `available=false` döner ama bugün seçilirse çevrilir. Arayüz zaten TRY/USD dışında para birimi sunmadığı için ertelendi.
- **Döviz kurları 2 haneye yuvarlanır.** İzlenen kurlar 40–60 aralığında olduğu için etki ≤%0,02. Düşük birimli bir para birimi eklenirse yeniden bakılmalı.
