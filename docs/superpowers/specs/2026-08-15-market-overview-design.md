# Market / BIST 30 Sayfası — Spec

Yeni bir **Piyasa** sayfası: BIST 30 tablosu + endeks/döviz/altın şeridi. Yeni harici API gerekmez — mevcut Yahoo + Frankfurter + GC=F altyapısı kullanılır.

## 1. Amaç

Kullanıcının portföyünden bağımsız, genel **piyasa panosu**: BIST 30 hisseleri (fiyat + günlük değişim), en çok yükselen/düşen, BIST 100/30 endeksleri ve USD/EUR/altın özet şeridi.

## 2. Kararlar (onaylı)

- **Tek cache'li endpoint:** `GET /api/market/overview` — hepsini tek çağrıda döndürür.
- **BIST 30 listesi elle tutulur** (endeks üyeliğini API vermiyor; ~30 ticker sabit, periyodik güncellenir).
- **Redis cache ~10 dk** (BIST gecikmeli, kabul edildi).
- **Satır tıklama → AssetDrawer "piyasa modu"** (fiyat + büyük grafik + "Al"; pozisyon/lot yok — sahip değil).

## 3. Veri kaynakları (mevcut, yeni yok)

| Veri | Kaynak |
|------|--------|
| BIST 100 / 30 endeks | Yahoo `XU100.IS` / `XU030.IS` |
| BIST 30 hisseleri | Yahoo `<TICKER>.IS` |
| USD / EUR | Frankfurter |
| Altın (gram TL) | Yahoo `GC=F` + USD/TRY (mevcut gold mantığı) |

## 4. Backend (market-service)

- **BIST 30 sabit listesi** — `MarketService`/yeni `BistIndex` sabiti içinde ~30 ticker (AKBNK, GARAN, THYAO, ASELS, KCHOL, ...). Tek yerde tutulur, yorumla "periyodik güncelle" notu.
- **DTO'lar** (`Models/MarketOverview.cs`):
  - `MarketQuote { Symbol, Name, Price, PreviousClose, ChangePercent }` — `Price` gösterilen değer (hisse/altın/döviz için TL, endeks için puan).
  - `MarketOverview { Indices: List<MarketQuote>, Strip: List<MarketQuote>, Stocks: List<MarketQuote> }`
    - `Indices` = BIST100, BIST30
    - `Strip` = USD, EUR, Gold (gram TL)
    - `Stocks` = 30 hisse
- **Servis** (`IMarketOverviewService` / `MarketOverviewService`):
  - `GetOverviewAsync()` → Redis'ten (`market:overview`) döndür; yoksa Yahoo/Frankfurter'dan paralel çek, 10 dk cache'le.
  - Yahoo chart meta'dan `regularMarketPrice` + `chartPreviousClose` → `ChangePercent`.
  - **Kısmi hata toleransı:** bir sembol çekilemezse atlanır (null döndürmez, listeden düşer); tüm sayfa çökmеz.
- **Controller:** `GET /api/market/overview`.
- **Program.cs:** `IMarketOverviewService` DI.

## 5. portfolio-service proxy

- `IMarketServiceClient.GetOverviewAsync()` + `MarketController` `GET /api/market/overview` (mevcut proxy deseni, cookie forward).
- Frontend yalnızca portfolio-service ile konuşmaya devam eder.

## 6. Frontend

- **Route** `/market` + sidebar **"Piyasa"** nav öğesi (LayoutDashboard/Wallet yanına, uygun ikon).
- **Sayfa** (`pages/Market.jsx`):
  - Üst **şerit**: endeksler (BIST100/30) + USD/EUR/altın — değer + günlük % (yeşil/kırmızı).
  - **BIST 30 tablosu** (ledger stili, cetvel): sembol · fiyat · günlük % (yeşil/kırmızı). Sembole göre alfabetik sıralı.
  - Tablonun üstünde kompakt **"En çok yükselen 3 / En çok düşen 3"** özeti (değişim%'e göre hesaplanır).
  - React Query `['market-overview']`, `staleTime` ~5-10 dk. Skeleton yükleme.
- **api.js:** `marketApi.overview()`; **hooks/queries.js:** `useMarketOverview()`.
- **Satır tıklama → AssetDrawer (piyasa modu):**
  - `AssetDrawer`'a `market` durumu: pozisyon + lot geçmişi blokları gizlenir, alt buton "Sat" yerine **"Al"** (→ `/assets/buy`).
  - Tıklanan hisseden minimal nesne kurulur `{ symbol, assetType:'Stock', exchange:'BIST', nativeCurrency:'TRY', nativePrice, previousClose, priceAvailable:true }`. Genişletme (expand) aynen çalışır.

## 7. Çeviriler

`nav.market`, `market.title`, `market.indices`, `market.gainers`, `market.losers`, `market.change` (TR + EN).

## 8. Kapsam dışı (YAGNI)

- **Haber bülteni** — ayrı parça, kaynak/API henüz seçilmedi. Sonra ele alınır.
- Gerçek-zamanlı websocket / canlı akış — gecikmeli snapshot yeterli.
- Watchlist / kişiselleştirme — bu sürümde yok.
- Tüm BIST 100 — sadece 30.

## 9. Doğrulama

- Yahoo endeks sembolleri doğrulandı (`XU100.IS`=14172, `XU030.IS`=16029, örnek hisse değişim% geliyor).
- `npm run build` + iki backend `dotnet build` hatasız.
- Token'lı ledger stili (ad-hoc renk yok), mono/tabular rakamlar.
