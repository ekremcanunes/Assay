# Veri Çekme Mimarisi

Bu doküman uygulamanın veriyi nasıl çektiğini ve **React Query'nin tam olarak nerede/ne kadar** kullanıldığını gösterir.

> **Redux:** kullanılmıyor. State yönetimi = React Context (Auth, Language) + sunucu verisi için **TanStack React Query**.

---

## 1. Genel akış (görsel)

```mermaid
flowchart TD
    subgraph RQ["React Query — sunucu verisi (cache'li)"]
      H["useHoldings()  →  key: ['holdings']"]
      D["useDashboard() →  key: ['dashboard']"]
      M["mutations: buy / sell / update / delete"]
    end

    QC["QueryClient (App.jsx)\nvarsayılan staleTime 60s · refetchOnWindowFocus off"] --> RQ

    H --> Assets["Portföy (Assets.jsx)"]
    H --> Analytics["Analytics.jsx"]
    D --> Overview["Overview.jsx"]
    M --> AddAsset["AddAsset.jsx (buy)"]
    M --> Assets

    M -. "invalidate" .-> H
    M -. "invalidate" .-> D

    subgraph NoRQ["React Query DIŞI (bilinçli)"]
      Auth["AuthContext / Login / Register\n→ Kratos, fetch"]
      Search["AddAsset arama kutusu\n→ marketApi.search, debounce axios"]
    end
```

**Özet:** React Query yalnızca **portföy + dashboard** verisini ve **al-sat mutation'larını** yönetir. Auth (Kratos) ve canlı hisse araması bilinçli olarak dışında.

---

## 2. Nerede, hangi sorgu (yazılı + kod referansı)

### Merkez
| Dosya | İçerik |
|-------|--------|
| [`src/App.jsx`](src/App.jsx) | `QueryClientProvider` + `QueryClient` ayarı (`staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`). Buradaki `staleTime` yalnızca sunucu tazelik bilgisi göndermeyen sorgular için geçerlidir (bkz. §2.1). |
| [`src/hooks/queries.js`](src/hooks/queries.js) | Tüm hook'lar burada: `useHoldings`, `useDashboard` + `useBuyAsset/useSellAsset/useUpdateAsset/useDeleteAsset`. Mutation'lar başarıda `['holdings']` ve `['dashboard']`'ı **invalidate** eder. |

### 2.1 Tazelik kuralı: süreyi sunucu belirler

Fiyat içeren sorgularda frontend süre tutmaz. Süre yalnızca backend'de, [`market-service/Caching/CacheTtl.cs`](../../market-service/Caching/CacheTtl.cs) içinde tanımlıdır.

| Sınıf | Süre | Veri |
|---|---|---|
| `Live` | 5 dk | Anlık fiyat, piyasa özeti, endeks, gün içi grafik, "bugün" fiyatı |
| `Daily` | 1 saat | Günlük grafik, sparkline serileri |
| `Permanent` | 30 gün | Geçmiş günün kapanışı |
| `Failure` | 5 dk | Başarısız tarihli fiyat cevabı |
| `Catalog` | 24 saat | BIST hisse listesi |

Akış:

1. market-service veriyi Redis'e yazarken bitiş anını kaydın içine ekler.
2. market-service her cevaba `X-Cache-Expires-In` header'ını ekler. Değer, cevaptaki en erken bitecek kaydın **kalan saniyesidir**. Mutlak saat gönderilmez, çünkü tarayıcının saati farklı olabilir.
3. portfolio-service bu header'ı okur ve tarayıcıya iletir. Bir cevapta birden çok fiyat varsa (portföy) en kısa süre iletilir.
4. `queries.js` içindeki `serverCached` yardımcısı header'ı okur. React Query veriyi tam bu süre boyunca taze sayar.
5. Header yoksa (örneğin fiyat alınamadıysa) veri bayat sayılır. Bir sonraki ihtiyaçta yeniden istenir.

Sonuç:

- Redis kaydı dolmadan boşa istek atılmaz.
- Süreler üst üste binmez. Kullanıcının gördüğü en eski veri, sınıfın Redis süresi kadardır.
- Aynı veri her sayfada aynı Redis kaydından okunur. Örneğin THYAO portföyde ve piyasa özetinde `stock:BIST:THYAO` kaydından gelir. İki sayfa aynı fiyatı gösterir.

`staleTime` dolunca React Query kendiliğinden istek atmaz. Veriyi "bayat" diye işaretler. Yeni istek; sayfa değişince, sayfa yenilenince veya al-sat sonrasında gider.

**Yeni bir fiyat sorgusu eklerken:** `staleTime` rakamı yazma. `serverCached(...)` kullan.

### Sayfa bazında kullanım
| Sayfa | Kullanılan hook | Query key | Ne için |
|-------|-----------------|-----------|---------|
| [`Overview.jsx`](src/pages/Overview.jsx) | `useDashboard()` | `['dashboard']` | Net varlık + dağılım özeti |
| [`Assets.jsx`](src/pages/Assets.jsx) (Portföy) | `useHoldings()` + `useSellAsset` + `useUpdateAsset` + `useDeleteAsset` | `['holdings']` | Portföy listesi (3 tab tek fetch'ten filtrelenir) + sat/düzenle/sil |
| [`Analytics.jsx`](src/pages/Analytics.jsx) | `useHoldings()` | `['holdings']` | Tür dağılımı pie chart (aynı cache'ten, ekstra istek yok) |
| [`AddAsset.jsx`](src/pages/AddAsset.jsx) | `useBuyAsset()` + `usePriceOnDate()` | — (mutation) · `['price-on-date', symbol, assetType, date]` (query) | Varlık alımı; sonrası otomatik tazeleme · Tarihe göre fiyat otomatik doldurma |

**Önemli:** `Assets` ve `Analytics` aynı `['holdings']` key'ini paylaşır → **tek istek**, ikisi de cache'ten beslenir (dedup).

### Piyasa sorguları (ek)

| Hook | Query key | `staleTime` | Davranış |
|------|-----------|-------------|----------|
| `usePriceHistory()` | `['price-history', symbol, assetType, range]` | Sunucu (§2.1) | Grafik veri serisi |
| `usePriceOnDate()` | `['price-on-date', symbol, assetType, date]` | Sunucu (§2.1) | Tarihe göre tek gün kapanışı |
| `useSymbolSearch()` | `['symbol-search', q]` | Sunucu (§2.1) | BIST evreninde sembol arama |
| `useMarketOverview()` | `['market-overview']` | Sunucu (§2.1) | BIST 30 + endeks + döviz/altın |

`useHoldings()` ve `useDashboard()` da `staleTime` değerini sunucudan alır.

**`usePriceOnDate` özellikleri:**
- Sorgu yalnızca `symbol`, `assetType`, `date` hepsi hazırsa çalışır (`enabled` koşulu).
- `retry: false` — amaçlı. Fiyat çekilemezse form manuel giriş moduna sessizce düşer; tekrar denemek sadece gereksiz gecikme yaratırdı.
- Geçmiş gün `Permanent` sınıfındadır, çünkü kapanmış bir günün fiyatı değişmez. Başarısız cevap `Failure` sınıfındadır ve kısa süre sonra yeniden sorulur.
- "Bugün" seçilirse ayrı kayıt tutulmaz. Fiyat, portföyle aynı `stock:...` kaydından okunur (`Live`).
- Uç nokta: `GET /api/market/price-on/{symbol}?market=BIST&assetType=Stock&date=2026-06-16` — portfolio-service aracılığıyla, market-service tarafından sunuluyor. Hisse için `market` zorunludur.

---

## 3. React Query DIŞINDA kalanlar (bilinçli)

| Yer | Yöntem | Neden RQ değil |
|-----|--------|----------------|
| [`AuthContext.jsx`](src/contexts/AuthContext.jsx) | `fetch` (Kratos `whoami`) | Oturum kontrolü; auth akışının parçası |
| [`Login.jsx`](src/pages/Login.jsx) / [`Register.jsx`](src/pages/Register.jsx) | `fetch` (Kratos self-service flow) | Tek seferlik akış, cache anlamsız |
| [`AddAsset.jsx`](src/pages/AddAsset.jsx) arama | `marketApi.search` (debounce'lu axios, `useEffect`) | Canlı yazdıkça arama; kısa ömürlü, cache gerekmez |

---

## 4. Ne kadarını kullanıyoruz? (kapsam)

- **Sorgular (queries):** 2 adet — `['holdings']`, `['dashboard']`.
- **Mutation:** 4 adet — buy / sell / update / delete (hepsi otomatik invalidation'lı).
- **Kapsanan sayfa:** 4 (Overview, Portföy, Analytics, AddAsset).
- **Kapsanmayan:** auth (3 dosya) + canlı arama — bilinçli dışarıda.

Yani React Query "her yerde" değil; sadece **cache'ten fayda gören sunucu verisinde** (portföy/dashboard). Kısa ömürlü/akış verisi (auth, arama) sade `fetch`/axios ile kalıyor.

---

## 5. Kazanımlar

- Tab geçişi ve sayfa gezinmesi: cache'ten **anında**, arkada sessiz yenileme (stale-while-revalidate).
- Aynı veriyi isteyen sayfalar **tek istek** (dedup).
- Al-sat sonrası liste **otomatik** tazelenir (elle refetch yok).
- Gelecek modüller (Altın, BIST30, Haber): her biri kendi key'i + `serverCached` → aynı akıcılık, fetch yağmuru yok.
