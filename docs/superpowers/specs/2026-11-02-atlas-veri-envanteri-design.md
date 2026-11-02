# Atlas — Veri Envanteri sayfası (Tasarım)

Tarih: 2026-11-02 · Branch: `feat/atlas` · Durum: taslak, onay bekliyor
Üst tasarım: `2026-11-02-atlas-design.md` (görsel dil, gizlilik kuralları, içerik doğrulayıcı).

---

## 1. Amaç

Sistemin **toplamda hangi veriyi aldığını, hangi biçimde aldığını, nerede sakladığını ve bundan ne ürettiğini** tek sayfada göstermek.

- Proje sahibi bir veriye bakınca şu sorulara cevap bulur: ham hali neydi, hangi alanları alıyoruz, hangi tabloya/Redis anahtarına yazıyoruz, örnek bir satır nasıl görünür, bundan ne hesaplıyoruz veya olduğu gibi mi sunuyoruz.
- Akışlar (01–09) tek tek yolculukları anlatır; Ekran → veri sayfası (`/ekran-veri`) ekrandaki bir sayının kaynağını anlatır. Bu sayfa ikisinin göstermediği şeyi gösterir: **verinin biçimi ve yapısı**.

### Hedefler

- Her veri için bağımsız, açıklamalı bir kart. Kartlar sırayla okunmak zorunda değildir.
- Gerçek alan adları, tipler ve biçimler; koddan doğrulanmış.
- Her geçişte (gelen → saklanan → üretilen) kısa "neden böyle" açıklaması.

### Hedef dışı

- Canlı veri, veritabanına veya Redis'e bağlanmak.
- Gerçek kullanıcı verisi.
- "Sunucuda / tarayıcıda / ikisinde yapılan işler" kartı. Bu ayrı bir iştir, sonra ele alınacak.
- Mevcut akışları veya `/ekran-veri` sayfasını değiştirmek (yalnız ana sayfaya bağlantı eklenir).

### Başarısızlık sayılır (çalışsa bile)

- Örnek değerin gerçek veri gibi görünmesi (etiketsiz).
- Kodda olmayan bir alan, yanlış tip veya yanlış tablo/anahtar.
- Gizli bilgi sızıntısı (üst tasarım §6 ve `atlas/README.md` yasakları geçerli).
- Uzun, yorucu metin. Yapıyı örnek gösterir; metin kısa kalır.

---

## 2. Kullanıcının verdiği kararlar

- **Kapsam:** üç grubun hepsi girer: dış kaynaklar, kullanıcı girişi, kimlik (Kratos). Saklanmayıp her istekte üretilen görünümler de kart olur.
- **Biçim:** bağımsız, açıklamalı kartlar.
- **Örnek veriler:** gerçek şemaya ve koda birebir uyan, **açıkça "örnek" diye etiketlenmiş** temsilî değerler (mock). Gerçek veritabanından satır alınmaz. Neden: Atlas yayınlanan bir sitedir; maskeli gerçek veri bile finansal bilgi sızdırır.

---

## 3. Kart listesi

Repo taramasından (2026-11-02). Uygulayıcı her kartı koddan yeniden doğrular.

**Liste açık (benim kararım):** amaç "sistemin aldığı her şey" olduğu için, kodda bu tabloda olmayan bir veri girişi veya kullanıcıya dönen bir görünüm bulunursa kart eklenir. Eklenen kart raporda belirtilir.

**Redis anahtar biçimi:** örneklerdeki anahtarlar `CacheKeys.Build` ile üretilen gerçek biçimde yazılır (tür küçük harf, parçalar `:` ile, boş parça atlanır; sembol `YahooSymbol.Normalize` sonrası hali). Tablodaki `stock:BIST:THYAO` bir tahmindir; uygulayıcı koddan doğrular.

| Grup | Kart | Gelen (biçim) | Saklanan | Üretilen / sunulan |
|---|---|---|---|---|
| Dış kaynak | Yahoo fiyat | `v8/finance/chart` JSON: `meta.*`, `timestamp`, `indicators.quote[0].open/high/low/close/volume` (`market-service/Clients/YahooFinanceClient.cs`) | Yalnız Redis: `stock:BIST:THYAO`, `history:…`, `priceon:…`, `spark:…` (`Caching/CacheKeys.cs`), süre `CacheTtl` | Anlık fiyat, mum, kapanış serisi, tarihli fiyat |
| Dış kaynak | Frankfurter kur | JSON `rate` (`Clients/FrankfurterClient.cs`, v2 anlık / v1 aralık) | Yalnız Redis | USD/TRY; her hisse ve altın fiyatının TL'ye çevrimi |
| Dış kaynak | Twelve Data listesi | `/stocks`, `/etfs` JSON: `symbol, name, currency, exchange, type` (`Clients/TwelveDataListing.cs`) | Postgres `Instruments` + tek satır `InstrumentSyncState` | Arama listesi (bellekte `InstrumentCatalog`) |
| Kullanıcı | Alım | `BuyAssetDto` JSON | `Assets` (yeni veya güncellenen satır) + `Transactions` (AssetBuy) | Ağırlıklı ortalama maliyet |
| Kullanıcı | Satış | `SellAssetDto` JSON | `Transactions` (AssetSell, `RealizedProfitLoss`) + `Assets` miktar | Gerçekleşen K/Z |
| Kullanıcı | Düzenleme | `UpdateAssetDto` JSON: `Quantity`, `PurchasePrice` | `Assets`: `Quantity`; `PurchasePrice` → `AvgCostBasis` alanına yazılır (`AssetService.cs:139`). İşlem geçmişine yazılmaz | — |
| Kullanıcı | Silme | `DELETE /api/assets/{id}`, `DELETE /api/transactions/{id}` (gövde yok) | Satır silinir; uygulayıcı her birinin `Assets`/`Transactions` üzerindeki etkisini koddan yazar | — |
| Kimlik | Kratos kimliği | Kayıt formu: `traits.email`, `traits.phone`, `traits.name.first/last`, `traits.consent` (`kratos/identity.schema.json`), şifre | Kratos'un kendi tabloları (Neon): kimlik, şifre hash'i, oturum | Uygulama yalnız kimlik id'sini `UserId` olarak kullanır |
| Üretilen | Varlık listesi | — | Saklanmaz | `AssetHoldingDto` (`GET /api/assets`): girdi `Assets` + Redis fiyatları |
| Üretilen | İşlem geçmişi | — | Saklanmaz | `TransactionDto`, sayfalı (`GET /api/transactions`) |
| Üretilen | Grafik ve tarihli fiyat | — | Saklanmaz (parçaları Redis'te) | `GET /api/market/history/{symbol}`, `GET /api/market/price-on/{symbol}` |
| Üretilen | Özet panosu | — | Saklanmaz | `DashboardDto` (`GET /api/dashboard`) |
| Üretilen | Piyasa özeti | — | Saklanmaz (parçaları Redis'te) | `MarketOverview` (`GET /api/market/overview`) |
| Üretilen | Arama sonucu | — | Saklanmaz | `SymbolSearchResult` (`GET /api/market/search`): girdi bellekteki liste |

---

## 4. Kartın anatomisi

Her kartta aynı bölümler, aynı sırayla. Bir bölüm o veri için yoksa "yok" diye açıkça yazar (ör. "Saklanmaz, her istekte üretilir").

1. **Başlık satırı:** ad, grup, kaynak (ör. "Yahoo · HTTPS · JSON"), "örnek veri" etiketi.
2. **Gelen:** endpoint/form, biçim, örnek ham parça (kod bloğu). Kullanılan alanlar ve **atılan** alanlar ayrı belirtilir.
3. **Saklanan:** yer (tablo / Redis anahtarı / Kratos / bellek), süre (Redis için `CacheTtl` değeri), örnek satır (tablo için alan → değer; Redis için anahtar + JSON değer).
4. **Üretilen / sunulan:** ne hesaplanır, nerede (sunucu / tarayıcı), formül kısa; veya "olduğu gibi sunulur".
5. **Neden böyle:** her geçiş için 1–2 kısa cümle.
6. **Kaynak dosya:** repoda gerçek dosya yolu (doğrulayıcı kontrol eder).
7. **İlgili akış:** varsa akışa bağlantı (ör. Yahoo kartı → Akış 06).

**Örnek etiketi:** her örnek kod bloğunun ve örnek satırın üstünde görünür bir "örnek" işareti bulunur. Etiket kart başına bir kez değil, her örnek blokta görünür.

**Tutarlı örnek senaryo (benim kararım):** örnek değerler kartlar arasında birbirini tutar. Ör. alım kartındaki THYAO alımı, `Assets` satırında, `Transactions` satırında, Redis fiyat kaydında ve varlık listesi çıktısında aynı sembol, miktar ve fiyatla görünür. Böylece okuyucu bir değeri kartlar arasında izleyebilir.

**Örnek değer kuralları:**

- Alan adları, tipler, enum değerleri, anahtar biçimleri koddan birebir.
- Değerler gerçekçi ama temsilî. Kimlikler açıkça sahte ve 12 haneli rakam dizisi içermez (doğrulayıcının gizli bilgi kalıbı reddeder), ör. `0000aaaa-0000-0000-0000-00000000000a`. E-posta `ornek@example.com`.
- Telefon (`traits.phone`) değer olarak yazılmaz; maskeli yer tutucu kullanılır: `+905XX XXX XX XX`. Alanın kuralı (`^\+905[0-9]{9}$`) ayrıca yazılır. Doğrulayıcıya istisna eklenmez. *Benim kararım.*
- Hesaplanan değerler örnek girdilerle tutarlı olur (ortalama maliyet, K/Z, TL çevrimi elle doğrulanır).
- Gizli kalıplar yasak: 12 haneli sayı, `arn:aws`, IP adresi (doğrulayıcı zaten tarar).

---

## 5. Sayfa ve içerik

- **Adres:** `/veri`. Ana sayfada Veri grubunda, `/ekran-veri`'den ("Akış 10") sonra **"Akış 11"** olarak numaralı kart. *Benim kararım.*
- **İçerik dosyası:** `atlas/content/data.yaml` (ayrı dosya; akış şeması kullanılmaz). Üst düzeyde `no`, `id`, `eyebrow`, `title`, `lede` bulunur; `screens.yaml` ile aynı yaklaşım.
- **Gruplama:** dört bölüm: Dış kaynaklar, Kullanıcı girişi, Kimlik, Üretilen görünümler. Sayfanın başında grup başına kart sayısı.
- **Görsel dil:** mevcut Atlas tokenları ve `/ekran-veri` sayfasının kart düzeni (koyu tema, `src/styles.css`). Yeni renk veya font eklenmez.
- **Mobil:** `max-width: 767px` altında kartlar tek sütun; kod blokları kendi içinde yatay kayar, sayfa yatay taşmaz; dokunma alanı ≥ 44px (üst tasarımın mobil kuralı).

## 6. Doğrulayıcı

`atlas/scripts/check-content.mjs` `data.yaml`'ı da kontrol eder:

- Zorunlu alanlar (kartın bölüm anatomisi).
- `file` yolları repoda gerçek dosya.
- Grup değeri bilinen bir grup.
- Gizli bilgi kalıpları (mevcut `SECRET_PATTERNS`).
- İlgili akış bağlantısı varsa akış id'si gerçek.
- Sayfa id'si akış ve `ekran-veri` id'leriyle çakışmaz.

**Alan adlarının koda uygunluğu elle doğrulanır (benim kararım).** Doğrulayıcı C# sınıflarını ayrıştırmaz; bu iş inceleme adımıdır. Uygulayıcı her kartta kullandığı alan adlarını, tipleri, tablo ve anahtar adlarını kaynak dosyayla karşılaştırır ve raporlar. Neden: C# ayrıştırıcısı bu sayfa için orantısız iş; yanlışlar zaten `file` alanındaki dosyaya bakılarak bulunur.

---

## 7. Uygulayıcıya bırakılanlar

- `data.yaml` alan adları ve tam şeması.
- Kart bileşeninin iç düzeni (bölümlerin açılır/kapanır olup olmaması dahil), `/ekran-veri` stiliyle uyumlu kalmak şartıyla.
- Yahoo kartının dört kullanım şeklini (anlık, seri, mum, tarihli) tek kartta mı alt bölümlerle mi göstereceği.
- Örnek senaryonun somut değerleri (§4 kurallarına uyarak).
