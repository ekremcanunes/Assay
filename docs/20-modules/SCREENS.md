# Ekranlar

Bu dosya ekranların içeriğini ve davranışını tutar. Görsel kurallar `docs/10-standards/DESIGN.md`'dedir.
Durum: **taslak.** Aşağıdaki ham notlar `DESIGN.md`'den olduğu gibi taşındı; `WRITING.md`'ye göre henüz yeniden yazılmadı.

---

## Ham notlar (DESIGN.md §5.6'dan)

- **Özet:** net varlık KPI kartı + dağılım kartı (segment çubuğu + 3 kategori kutusu).
- **Portföy:** kategori kartları alt alta (md+ üç sütun; ad, adet, pay rozeti, değer + K/Z, temsilci seri, pay çubuğu) + aynı sayfada tüm varlıklar listesi. Karta dokununca `/assets/<kategori>` detayına büyür ([`CategoryCard`](../../web/src/components/CategoryCard.jsx) → [`StoryHero`](../../web/src/components/StoryHero.jsx), View Transitions).
- **Piyasa:** iki sekme — Borsa · Altın & Döviz (`?tab=goldfx`, yenileyince aynı sekme); başlıkta BIST 100 ve USD/TRY mini göstergesi (md+).
  - Borsa: nabız kartı (BIST 100 + son 30 gün alan grafiği, yorum + BIST 30 endeksi, yükselen/sabit/düşen çubuğu, öne çıkan 3 hisse: en çok yükselen / düşen / hacim lideri) → BIST 30 tablosu (segment sıralama + arama başlıkta; gün aralığı ve 52H konum çubukları).
  - **lg+:** iki sütun; sağda seçili hissenin sabit paneli ([`StockDetail`](../../web/src/components/market/StockDetail.jsx)): fiyat + dünkü kapanış, aralık sekmeli grafik, dönem getirisi (1 ay / 3 ay / 1 yıl, 1 yıllık seriden), gün içi aralık ve 52H konum **çubuk + düz cümle** ("zirvenin %17 altında, dipten %43 yukarıda"), günlük hacim + BIST 30 hacim sırası, "Portföyüme ekle". Bilmeyen birine rakam tek başına bırakılmaz. İlk açılışta en çok yükselen seçili; seçili satır kobalt yıkama + solda 3px kobalt. Daha dar ekranda satır kayan paneli (`AssetDrawer`) açar.
  - Altın & Döviz: 4 kur kutusu (yöne göre renkli mini alan grafiği) → sarrafiye tablosu + 30 günlük değişim (tüm seriler kendi başlangıcına göre %, tek grafik).
- **Alım:** tür segmenti → varlık → miktar → tarih (fiyatlı takvim) → birim fiyat → o gün/bugün kutuları → toplam kartı; ana eylem altta sabit.
- **Durum şeridi** ([`StatusBar`](../../web/src/components/StatusBar.jsx), md+, tüm panel sayfalarının en üstü): solda BIST açık/kapalı + "Fiyatlar 18:10 itibarıyla"; sağda ortam, bölge, veritabanı sağlayıcısı + ping, API gidiş-dönüşü, sürüm. **Hepsi gerçek veri** — seans Yahoo'nun seans sınırlarından tarayıcı saatiyle, sistem bilgisi `/api/system/status`'tan.

## Ham notlar (DESIGN.md §6'dan)

- BIST 30 içi arama **client-side filtredir**; boş dönerse `/market/search` ile tüm BIST evreni önerilir.
- Piyasa sembolleri Postgres'te tutulmaz; DB yalnızca portföy ve işlemler içindir.
