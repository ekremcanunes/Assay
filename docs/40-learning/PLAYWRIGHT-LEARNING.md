# Playwright & Render Notları

Mobil tasarım denetimine başlamadan önce konuşulanlar (2026-10). Bağlayıcı değil, referans.

---

## 1. Bu projede ne sunucuda, ne tarayıcıda çalışıyor?

**Bu projede SSR yok.** Tüm sayfaları tarayıcıda React çiziyor; sunucular yalnızca veri ve dosya veriyor.

- **SSR (server-side rendering):** HTML sunucuda hazırlanıp hazır gönderilir (Next.js, Razor Pages).
- **CSR (client-side rendering):** Sunucu boş bir `index.html` + JS gönderir, sayfayı tarayıcıdaki JS çizer. **Assay bu.**

### Client side — tarayıcıda (`web/`)

- Tüm sayfalar: Landing, Login, Register, Overview, Market, GoldFx, Assets, AddAsset, Analytics
- Bileşenler: AssetDrawer, grafikler (PriceChart, Sparkline), OTP girişi, alt navigasyon (Layout)
- Sayfa geçişleri: `react-router-dom` (URL değişince sunucuya gidilmez)
- Veri çekme + önbellek: React Query (`hooks/queries.js`)
- Dil, oturum bilgisini tutma: `contexts/`
- `ProtectedRoute`: girişsizse Login'e yönlendirir — sadece arayüz kontrolü, asıl güvenlik sunucuda
- **Mobil tasarımın tamamı** (Tailwind, responsive) → Playwright'ın test edeceği yer

### Server side — sunucuda

- **nginx (`web` container'ı):**
  - `dist/` içindeki build edilmiş React dosyalarını olduğu gibi verir (statik dosya sunumu)
  - `try_files ... /index.html` → hangi URL gelirse gelsin `index.html` döner, sayfayı React çizer
  - **Reverse proxy:** `/api/` → portfolio-service, `/.ory/` → Kratos
- **portfolio-service (.NET):** portföy/varlık işlemleri, veritabanı (EF Core), yetki kontrolü
- **market-service (.NET):** fiyat verisi (Yahoo, Twelve Data, Frankfurter), Redis önbelleği
- **Kratos:** kayıt, giriş, e-posta doğrulama, OTP, oturum cookie'si. Login/Register ekranını React çizer, doğrulamayı Kratos yapar.
- **Redis / Mailpit:** önbellek / dev'de e-posta yakalama

**Playwright açısından:** Mobil sorunlar client tarafında (`web/src/`), ama sayfalar veriyle dolu görünsün diye backend container'ları da ayakta olmalı.

### DOM, SPA, MPA, Next.js — kavramlar

**DOM (Document Object Model):** Tarayıcının açık sayfa için bellekte tuttuğu nesne ağacı.

- Lego benzetmesi: HTML = kâğıttaki kurulum şeması · DOM = masada kurulmuş Lego (parça parça değiştirilebilir) · ekran = Lego'nun fotoğrafı · JavaScript = Lego'ya dokunan eller.
- Neden var: ekran sadece pikseldir; "neye tıklandı", "sadece şu kısmı güncelle", "burada buton var (ekran okuyucu)" sorularını cevaplayan kayıt defteri ağaçtır. Standart olduğu için aynı JS her tarayıcıda çalışır.
- Her UI sisteminin böyle bir ağacı var: Android'de View hiyerarşisi, iOS'ta UIView hiyerarşisi. React Native'de DOM yok çünkü tarayıcı yok — React kararlarını telefonun kendi ağacına uygular.
- React iki parça: `react` (bileşen, state, hooks — platformdan bağımsız) + renderer (`react-dom` → tarayıcı DOM'u, `react-native` → native bileşenler).
- **DOM'dan bağımsız kod** = `document`, `window`, `<div>`, `className` kullanmayan saf JS (API çağrısı, React Query hook'u, hesaplama). React Native'e olduğu gibi taşınır; sadece görünüm (JSX) yeniden yazılır.

**İlk DOM nereden gelir (Assay akışı):**

1. Tarayıcı URL'yi ister → nginx her URL için `index.html` döner.
2. Gelen HTML neredeyse boş: `<div id="root"></div>` + `<script>`.
3. Tarayıcı metni **parse** eder (okuyup yapıya çevirir) → küçük, boş bir DOM.
4. JS iner, çalışır → `main.jsx`: `createRoot(document.getElementById('root')).render(<App />)`.
5. React tüm ekranı `div#root` altına DOM nesneleri olarak ekler.
6. Sonraki geçişlerde yeni HTML gelmez; React aynı DOM'u günceller, veri için sadece `/api/...`.

Görmek için: `Ctrl+U` = sunucudan gelen boş HTML · `F12 → Elements` = React'in doldurduğu güncel DOM.

**DOM ile SPA farkı:** DOM bir *şey* (malzeme, her sayfada var); SPA bir *yöntem* (o malzemeyi nasıl kullandığın). Ev benzetmesi: DOM = ev · MPA = her odaya geçişte evi yıkıp yeniden kurmak · SPA = evi bir kez kurup sadece mobilyaları değiştirmek.

| | İlk HTML | Sonraki geçişler | Sunucu |
|---|---|---|---|
| **MPA** (PHP, Razor Pages) | Dolu | Her seferinde yeni HTML | HTML üreten sunucu |
| **SPA** (Assay) | Boş, React doldurur | Aynı DOM'da değişim | Sadece statik dosya (nginx) |
| **Next.js** | Dolu (SSR) | SPA gibi | Node sunucusu |

- **SSR artıları:** ilk açılış hızlı hissettirir, SEO (arama motoru içeriği HTML'de bulur), link önizlemesi dolu. **Eksi:** her istekte HTML üreten sunucu gerekir.
- **Hydration:** SSR ile dolu gelen HTML'e JS inince tıklama/state'in bağlanması.
- **SSG:** sayfanın build anında bir kez üretilip hazır HTML olarak dağıtılması.
- **Next.js:** React framework'ü — ilk açılış SSR, sonrası SPA; dosya tabanlı routing.
- **Assay neden SPA kalıyor:** panel ve piyasa girişli (2026-10 kararı: piyasa herkese açık olmayacak) → SEO ihtiyacı yok.

---

## 2. Playwright nedir, ne katar?

Microsoft'un **tarayıcı otomasyon kütüphanesi** — tarayıcıyı kod yönetir (aç, tıkla, yaz, bekle, ekran görüntüsü al). **E2E (uçtan uca) test** için yapıldı: uygulamayı gerçek kullanıcı gibi baştan sona kullanarak doğrulama.

- **Cihaz emülasyonu:** `iPhone SE` → 375px, piksel yoğunluğu, dokunmatik, user-agent. Sayfa gerçekten "mobildeyim" sanır (pencere küçültmekten farklı).
- **WebKit:** Safari motoru. iPhone'daki tüm tarayıcılar WebKit kullanır → iOS'a özgü hatalar (`100vh`, sabit menü kayması) Windows'ta yakalanır.
- **Otomatik bekleme:** eleman hazır olmadan tıklamaz → daha az kararsız test.
- **Erişilebilirlik ağacı:** sayfayı yapılandırılmış metin olarak da verir ("buton: Giriş yap").
- **Temiz ortam:** her açılış önbelleksiz, eklentisiz → tekrarlanabilir.
- **Teste dönüşür:** kontroller test dosyasına yazılıp CI'da her commit'te çalışabilir. Ekran görüntüsünü öncekiyle karşılaştırma = **görsel regresyon testi**.

### MCP'nin rolü

**MCP (Model Context Protocol):** Claude'a dış araç bağlama standardı. Playwright MCP, Playwright yeteneklerini Claude'un çağırabileceği araçlara çevirir — adım adım, etkileşimli gezinme (giriş yap → menüyü aç → bak).

MCP olmadan da Playwright terminalden kullanılabilir, ama tek atış:

```bash
npx playwright screenshot --device="iPhone SE" http://localhost mobil.png
```

---

## 3. Claude uygulaması tarayıcısı vs Playwright

| | Claude uygulaması | Playwright |
|---|---|---|
| Aç / tıkla / yaz / ekran görüntüsü | ✅ | ✅ |
| Kurulum | Yok | Tek komut |
| Açık oturumunu kullanma (Kratos girişi hazır) | ✅ (Chrome eklentisi) | ❌ ayrı profil |
| Gerçek mobil emülasyonu | ? muhtemelen sadece pencere boyutu | ✅ |
| WebKit (Safari) / Firefox | ❌ sadece Chromium | ✅ |
| Kontrolü test dosyasına dönüştürme, CI'da çalıştırma | ❌ | ✅ |
| Görsel regresyon | ❌ | ✅ |
| Tekrarlanabilirlik | Zayıf | ✅ |

**Özet:** Tek seferlik bakışta ikisi yakın. Playwright'ın farkı: WebKit, gerçek emülasyon, kontrolün kalıcı teste dönüşmesi.

---

## 4. npm vs npx

- **npm (Node Package Manager):** paketi **kurar ve yönetir**. `npm install x` → `node_modules` + `package.json`. Kalıcı.
- **npx (Node Package eXecute):** paketi **çalıştırır**; yoksa geçici önbelleğe indirir. Projeye bir şey eklemez.
- Benzetme: npm = programı kurmak, npx = taşınabilir sürümü kurmadan açmak.
- `@latest` her seferinde en yeni sürümü alır → bir gün davranış değişebilir; sabitlemek için sürüm yazılır.

---

## 5. MCP kapsamı ve repoya ekleme

İki **ayrı** karar:

1. **Playwright MCP (`.mcp.json`)** — Claude'un aracı. Kodu/testleri etkilemez.
   - `-s user`: sadece bu makine, tüm projeler, repoya dosya eklenmez.
   - `-s project`: repoya `.mcp.json` girer, herkes aynı ayarı kullanır.
   - Repoya eklemenin riskleri: sır içermez, prod'u etkilemez; ama klonlayan herkese onay sorulur ve `@latest` **tedarik zinciri riski** taşır (dış paket üzerinden gelen tehlike) → eklenirse sürüm sabitlenmeli.
2. **Playwright testleri (`@playwright/test`)** — `web/` altına **devDependency** (sadece geliştirme/test için, prod build'ine girmez). Test dosyaları repoda, CI'da çalışabilir.

Testleri projeye almak MCP'yi projeye almayı gerektirmez.

Kurulum komutu (user kapsamı):

```bash
claude mcp add playwright -s user -- npx @playwright/mcp@latest
```
