# Mobil Dönüşüm Faz 1 — Spec

Assay'ın mobil web deneyimini (Safari / Chrome, 360–390px) uçtan uca kullanılabilir ve şık hale getirmek. Tek kod tabanı: mobile-first yazılır, masaüstü aynı blokların geniş dizilişidir. Bağlayıcı tasarım standardı `docs/10-standards/DESIGN.md` (VOLTAJ) geçerlidir.

Görsel referans (onaylı taslaklar): https://claude.ai/artifact/NsUmwW6sREjJjJpfRSaAWp — örnek veriyle; renk/ölçü kaynağı yine DESIGN.md'dir.

## 1. Amaç ve başarı ölçütü

- Hedef kitle trader değil: hiç bilmeyen biri açınca **merak etmeli** ve **gideceği yeri kolay bulmalı**.
- Başarı:
  - 360 / 375 / 390px'te hiçbir panel sayfasında yatay kaydırma yok (`scrollWidth === clientWidth`).
  - Birincil eylemler (Al, Seç) parmakla rahat basılır (min 44px yükseklik) ve alt menüyle çakışmaz.
  - Varlık alımı tek elle, takvim dahil, geri tuşu doğru davranarak tamamlanır.

## 2. Kapsam

**Faz 1'de:**
1. Uygulama kabuğu: alt menü 4 sekme, belge kaydırma, mobil başlık düzeltmeleri.
2. Piyasa sekmesi (Borsa + Altın & Döviz birleşik).
3. Portföy: kategori kutuları.
4. Varlık Al: yeni form + tam ekran fiyatlı takvim.

**Faz 1 dışında (sonraki spec'ler):**
- Analiz sayfasının yeniden tasarımı (bkz. §3.1).
- Masaüstü kenar çubuğunun yeniden düşünülmesi.
- **Faz 2: Landing ve Login / Register** mobil tasarımı — projenin vitrini, Faz 1'den hemen sonra. İstisna: Landing'deki yatay taşma (mimari diyagram SVG'si `min-w-[660px]`, `Landing.jsx:459`) Faz 1'de düzeltilir.
- "Öne çıkanlar" ayrı sayfası (hacim lideri, 52H zirve/dip, en hareketli, senin hisselerin).
- 1 yıldan eski tarihler için takvim fiyat endpoint'i → `docs/50-planning/BACKLOG.md`.
- React Native. Tek kural şimdiden: veri/mantık (hooks/, saf `lib/*.js`) görünümden ayrı kalır.

## 3. Uygulama kabuğu (`components/Layout.jsx`)

### 3.1 Alt menü: 4 sekme

`Özet · Portföy · Piyasa · Menü` (mevcut: 6).

- **Piyasa** → `/market`. `/gold-fx` rotası kalır ama Piyasa'ya yönlendirir ve Altın & Döviz kutusunu seçili açar (`/market?tab=fx`). Masaüstü kenar çubuğu da aynı iki öğeyi tek "Piyasa" öğesine indirir.
- **Analiz** hem alt menüden hem masaüstü kenar çubuğundan kalkar; Özet'e taşınmaz. Analiz sayfası ayrı bir spec'te baştan detaylandırılacak. O zamana kadar `pages/Analytics.jsx` kodu silinmez (yeniden tasarımın başlangıç noktası), `/analytics` rotası `/overview`'e yönlendirir.
- **Masaüstü kenar çubuğu** 3 öğeye (Özet, Portföy, Piyasa) iner; boş görünmemesi için yeniden düşünülecek → ayrı iş (BACKLOG). Faz 1'de yalnızca öğeler güncellenir.
- Aktif sekme göstergesi mevcut kuralla: ikon voltaj rengi, etiket `font-medium`.

### 3.2 Belge kaydırma

Bugün `<main>` kaydırma kabı (`flex h-dvh` + `overflow-auto`) → mobilde adres çubuğu gizlenmiyor, ekran alanı kaybı var.

- Mobilde (`< md`) kaydırmayı belge yapar: kök `min-h-dvh`, `<main>` `overflow` vermez. Alt menü `fixed` kalır; içerik altı `pb-[calc(56px+env(safe-area-inset-bottom))]`.
- Alt menüye `padding-bottom: env(safe-area-inset-bottom)` (iPhone ana ekran çizgisi). `index.html` viewport'una `viewport-fit=cover`.
- Masaüstü (`md+`) mevcut yerleşim değişmez.
- `Page` başlığındaki `sticky top-0` belge kaydırmada da çalışır; doğrulanacak.

### 3.3 Mobil başlık

- `Page` başlığı 360px'te eylemleri başlığın altına düşürmesin: eylemler ikon butona küçülür veya başlıkla aynı satıra sığar (Overview bulgusu).
- WebKit'te başlık ağırlığı ince görünüyor (Playwright WebKit). Faz 1'de font import'u kodda kontrol edilir; gerçek iPhone Safari doğrulaması AWS deploy'unda.

## 4. Piyasa sekmesi (`pages/Market.jsx`, `pages/GoldFx.jsx`)

**Güncellendi 2026-10-16:** Portföy ile aynı **karttan sayfaya** dili (§5). Kutular kullanılmaz.

- `/market`: iki uzun kart (Portföy kartlarıyla aynı görünüm bileşeni). Mobilde yatay kaydırma + noktalar/oklar, masaüstünde yan yana.

  | Kart | Değer | Grafik (piyasa verisinden, ek istek yok) |
  |---|---|---|
  | Borsa | BIST 100 + günlük % | BIST 100 son 30 gün (`indices[].spark`) |
  | Altın & Döviz | Gram altın ₺ + günlük % | Gram altın son 30 gün (`strip[XAU].spark`) |

- Karta dokunma → `/market/stocks` veya `/market/gold-fx` (`viewTransition`). Detayın üstünde kartın büyüdüğü alan (geri "‹ Piyasa", değer, %, grafik), altında §4.1 / §4.2 içeriği.
- Eski `/gold-fx` → `/market/gold-fx`. Geçersiz alt adres → `/market`.
- Ortak görünüm: `components/StoryCard.jsx` (kart) + `components/StoryHero.jsx` (detay üst alanı) — Portföy ve Piyasa ikisi de kullanır; `CategoryTiles` silinir.

### 4.1 Borsa içeriği

1. **Nabız (1+4):**
   - Yorum başlığı, BIST 30 ortalama değişimine göre:

     | Ortalama | Metin | Renk |
     |---|---|---|
     | > +1% | güçlü yükselişte | up |
     | 0 … +1% | hafif yükselişte | up |
     | 0 | yatay | muted |
     | −1% … 0 | hafif düşüşte | down |
     | < −1% | sert düşüşte | down |

   - Üç büyük sayı: yükselen · değişmeyen · düşen (`text-figure`, mono).
   - İki satır: en çok yükselen, en çok düşen (sembol + %).
   - Kırmızı-yeşil oran çubuğu kaldırılır.
2. **Arama** (mevcut BIST 30 filtresi + geniş arama mantığı korunur) ve altında **sıralama çipleri**: En çok yükselen · En çok düşen · En çok işlem.
3. **Hisse listesi:** satır = sembol + şirket adı (tek satır, kırpılır) | fiyat + değişim rozeti. Tablo yalnızca `md+`'da kalır. Satıra dokunma → mevcut AssetDrawer piyasa modu; gün aralığı ve 52H konum orada gösterilir.
4. Kaldırılan: "Ortalama değişim" kartı (nabızda), "52H zirvesine yakın" kartı ve boşken görünen "52H Zirvesine Yakın" bölümü (öne çıkanlar sayfasına gider). Hacim Liderleri bölümü kaldırılır; "En çok işlem" sıralaması karşılar. İleride sıralama çipleri bir dropdown filtreye dönüşebilir (BACKLOG).
5. Endeks kartları (BIST 100 / 30): Borsa kutusu BIST 100'ü taşır; BIST 30 değeri nabız başlığının yanında küçük gösterilir.

### 4.2 Altın & Döviz içeriği

1. Kurlar **2×2 ızgara** (USD, EUR, GBP, Gram altın): ad, değer, günlük % rozeti, küçük sparkline.
2. Altın çeşitleri listesi (gram, çeyrek, yarım, tam, Cumhuriyet) — mevcut hesap aynen.
3. 30 günlük değişim listesi — mevcut, korunur.

### 4.3 Sade dil

Mobil metinlerde jargon yerine açıklama: "52H" → "son 1 yıl", "bandın %90 üstü" → "1 yılın zirvesine yakın". Yeni metinler `LanguageContext` TR + EN.

## 5. Portföy (`pages/Assets.jsx` + yeni `pages/AssetCategory.jsx`)

**Güncellendi 2026-10-16** — ilk tasarım (sekme yerine 3 kutu) denendi; kutular masaüstünde çok uzun, geçiş hissi zayıf bulundu. Yeni yön Dribbble "Card transition experiment" örneğinden: **karttan sayfaya**. Onaylı demo: https://claude.ai/artifact/LNer8iywfG6xa1HmKz5H2R

### 5.1 Üst şerit (`components/PortfolioStrip.jsx`)

Portföy sayfalarında (`/assets` ve `/assets/:kategori`) başlığın altında, yapışık başlıkla birlikte hep görünür:

- Toplam portföy (₺) + toplam K/Z %.
- İnce ağırlık çubuğu (kategori renkleriyle, genişlik = pay).
- Kategori başına: ad · **₺ tutar** · **%** pay (3 sütun).

### 5.2 Kategori kartları (`/assets`)

- Her kategori (Hisse, Döviz, Altın) uzun bir kart: üstte varlık sayısı + K/Z %, ortada kategori adı, büyük değer (₺), K/Z %; altta kartın kenarlarına taşan **fiyat grafiği** (alan + çizgi, kategori rengi).
- Grafik verisi kategorinin temsilci serisi, son 1 yıl (`usePriceHistory(..., '1y')`, mevcut endpoint, Redis cache'li): Hisse → `XU100.IS` (BIST 100), Döviz → `USD`, Altın → `XAU` (gram TL). Kartta etiketiyle yazar ("BIST 100 · son 1 yıl") — portföy değeri sanılmasın.
- **Mobil:** yatay kaydırma (`scroll-snap`), yandaki kartın kenarı görünür; altta noktalar + ‹ › okları.
- **Masaüstü (`md+`):** üç kart yan yana, daha kısa; kaydırma yok.
- Boş kategori: kart ₺0, "—" ve "Henüz varlık yok"; dokunulabilir (detayda "Al" bağlantısı).
- Seri yüklenemezse grafik çizilmez, kart yine çalışır.

### 5.3 Kategori detayı (`/assets/:kategori`, kategori = `stock` | `currency` | `gold`)

- Karta dokunma → `navigate('/assets/<kategori>', { viewTransition: true })`. Kart, detaydaki üst alana (hero) büyür; ad ve değer yerlerine akar (CSS `view-transition-name`). Kütüphane yok; desteklemeyen tarayıcıda animasyonsuz açılır.
- Hero: geri ("‹ Portföy"), kategori adı, değer, K/Z %, aynı grafik.
- Altında mevcut varlık listesi **olduğu gibi**: mobilde kart listesi, masaüstünde tablo; sat / düzenle / sil, AssetDrawer, silme onayı. Bu kod `Assets.jsx`'ten `components/HoldingsList.jsx`'e taşınır (davranış değişmez).
- Geri: `navigate('/assets', { viewTransition: true, state: { from: kategori } })`; kartlar sayfası açılınca o kart ortaya kaydırılır. Tarayıcı geri tuşu da çalışır (animasyonsuz olabilir).
- Geçersiz kategori → `/assets`'e yönlendirme.
- Eski `?tab=Gold` linkleri → `/assets/gold`'a yönlendirilir; AddAsset alımdan sonra `/assets/<kategori>`'ye gider.

Piyasa sekmesi (§4) de aynı kart dilini kullanır (karar 2026-10-16).

## 6. Varlık Al (`pages/AddAsset.jsx`)

### 6.1 Form

- Tek kolon, kart-içinde-kart kalkar (sayfa başlığı ve kart başlığının ikisi birden "Varlık Al" yazıyordu → yalnızca sayfa başlığı).
- Alanlar: Tür → Varlık → Miktar → Alış tarihi → (otomatik fiyat) → Karşılaştırma kutusu → Toplam.
- **Alış tarihi alanı** dokununca tam ekran takvimi açar (§6.2).
- **Karşılaştırma kutusu** (fiyat otomatikken ve tarih bugün değilken):
  - O günkü fiyat · Bugünkü fiyat · "O günden bugüne" % (up/down).
  - Bugünkü fiyat = `usePriceOnDate(symbol, type, today)` — ayrı sorgu, cache'li.
  - Tarih bugünse kutu tek satır: "Güncel fiyat".
- Fiyat elle değiştirilebilir (mevcut sapma uyarısı/onay mantığı aynen).
- **"Al" butonu** ekranın altına sabit (`sticky bottom`), alt menünün üstünde; metin miktarı içerir ("25 gram al"). İptal = başlıktaki geri oku.
- Mevcut veri kuralları korunur: kullanıcı fiyatı elle yazdıysa üzerine yazılmaz; altın/döviz TL kilidi.

### 6.2 Tam ekran fiyatlı takvim (yeni `components/PriceCalendar.jsx`)

- **Açılış/kapanış:** açılınca tarayıcı geçmişine kayıt eklenir (`?date=pick` arama parametresi). Telefonun geri tuşu yalnızca takvimi kapatır, formu değil. "Bu tarihi kullan" seçer ve kapatır.
- **Kaydırma:** aylar dikey, en yeni ay üstte; aşağı kaydırdıkça geçmiş. Hafta günleri başlığı yapışkan. Takvim yeniden açıldığında seçili günün ayına kaydırılır.
- **Veri:** `usePriceHistory(symbol, assetType, '1y')` — mevcut endpoint, günlük kapanış, Redis cache'li. Yeni backend yok.
- **Gün hücresi:** gün numarası + kısa fiyat (`text-[10px]` mono). Fiyat 5 karakteri aşarsa kısaltılır (1.234 → "1,2B"; 12,34 → "12,3").
- **Isı rengi:** ay içi göreli, 5 kademe, varlığın **kategori rengi** ile (`color-mix` kart zemini ile %10 → %100). Voltaj rengi kullanılmaz (doz kuralı). Ölçek göstergesi: "Ucuz ▢▢▢▢▢ Pahalı".
- **Fiyatsız günler:** hafta sonu / tatil → gün numarası soluk, fiyat yok, seçilebilir (backend mevcut "en yakın kapanış" geri düşüşünü kullanır, form bunu zaten gösteriyor).
- **1 yıldan eski aylar:** renksiz, fiyatsız, seçilebilir. Ayların altında "Daha eski tarih" ile yıl seçici (mevcut 20 yıl sınırı).
- **Gelecek günler:** devre dışı.
- **Alt çubuk:** seçilen tarih, o günkü fiyat, bugünkü fiyat + fark, "Bu tarihi kullan" butonu.
- **Para birimi:** seri varlığın kendi para birimindedir (`PriceHistory.Currency`); takvim o birimle etiketlenir. Formda seçili birim farklıysa (ör. USD hisse TL ile), takvim yalnızca renk + tarih seçimi için kullanılır, fiyat metni seri biriminde kalır; formdaki asıl fiyat yine `usePriceOnDate`'ten gelir.
- **Varlık seçilmeden** takvim açılırsa: renksiz düz takvim (seri yok).
- **Yükleniyor / hata:** renksiz takvim hemen çizilir, seri gelince renk ve fiyat dolar; hata olursa renksiz kalır, seçim çalışır.
- **Masaüstü:** aynı bileşen ortada modal olarak (max ~420px genişlik).

### 6.3 Mevcut takvim hatası

`components/ui/calendar.jsx`'te ay/yıl seçicinin üstünü ok butonlarının katmanı (`nav`, `z-20`) kaplıyor olabilir, yıl seçilemiyor (tahmin; Playwright ile doğrulanacak). `DatePicker` + `Calendar` yalnızca AddAsset'te kullanılıyor; AddAsset `PriceCalendar`'a geçince `components/ui/date-picker.jsx` ve `components/ui/calendar.jsx` silinir (onaylı); `react-day-picker` başka yerde kullanılmıyorsa bağımlılıktan da çıkarılır; `PriceCalendar`'daki "Daha eski tarih" yıl seçicisi bu hatayı taşımayacak şekilde yazılır.

## 7. Bileşen sınırları

| Birim | Ne yapar | Bağımlılık |
|---|---|---|
| `StoryCard` / `StoryHero` | Uzun kart + taşan grafik / detay üst alanı, `view-transition-name` (Portföy + Piyasa) | yalnızca props |
| `PortfolioStrip` | Toplam + ağırlık çubuğu + kategori ₺/% | yalnızca props |
| `CategoryCard` | Portföy kategorisi için StoryCard + seri | `usePriceHistory` |
| `HoldingsList` | Varlık listesi/tablosu + sat/düzenle/sil + drawer | mutation hook'ları |
| `lib/portfolioCategories.js` (saf) | `summarizeCategories`, kategori ↔ URL eşlemesi | yok (RN'e taşınır) |
| `PriceCalendar` | Ay listesi + ısı + seçim, `onSelect(date)` | `usePriceHistory` |
| `lib/heat.js` (saf) | `heatTier(value, monthValues) → 0..4`, `shortPrice(v)` | yok (RN'e taşınır) |
| `lib/marketPulse.js` (saf) | `pulse(stocks) → { mood, up, flat, down, top, bottom }` | yok (RN'e taşınır) |

## 8. Doğrulama

Faz 1'de kalıcı otomatik test yazılmaz; her adım kullanıcıyla birlikte elle doğrulanır. Kalıcı test yazmaya geçmeden önce kullanıcıya haber verilir.

Her adımın sonunda:

- **Playwright taraması (3 cihaz):** `audit.spec.js` ile ekran görüntüsü + yatay taşma ölçümü (`scrollWidth === clientWidth`). Görüntüler `web/e2e/audit-shots/`'ta.
- **Tarayıcı:** kullanıcı tarayıcıda (DevTools mobil görünüm) bakar. Gerçek telefon kontrolü (adres çubuğu, safe-area, WebKit font) AWS deploy'unda yapılır.
- **Adıma özel kontrol listesi** (örnek, Varlık Al): takvim açılır · geri tuşu yalnız takvimi kapatır · gün seçimi formu doldurur · karşılaştırma kutusu doğru farkı gösterir · Al butonu alt menüyle çakışmaz.
- `npm run lint` mevcut 9 hatadan fazlasını üretmez; `npm run build` geçer.

Oturum `auth.json` ile (yalnızca yerel). `audit.spec.js` iş bitince silinir.

## 9. Uygulama sırası (her biri ayrı commit, her biri sonrası doğrulama)

1. Kabuk: belge kaydırma + safe-area + 4 sekme + Analiz'in menülerden kalkması + `/gold-fx`, `/analytics` yönlendirmeleri.
2. Portföy: şerit + kategori kartları + `/assets/:kategori` detayı (View Transitions).
3. Piyasa: iki kart + `/market/stocks` (nabız, liste) + `/market/gold-fx` (2×2).
4. `PriceCalendar` + Varlık Al formu + eski takvim dosyalarının silinmesi.
5. Başlık taşması + WebKit font doğrulaması.
6. Landing yatay taşma düzeltmesi.
