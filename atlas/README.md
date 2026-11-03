# Atlas

Assay'ın altyapısını, mimarisini ve verisini interaktif akışlarla anlatan bağımsız web uygulaması.
Tasarım: `docs/superpowers/specs/2026-11-02-atlas-design.md`.

## Çalıştırma

```bash
npm install
npm run dev     # geliştirme sunucusu
npm run check   # içerik doğrulayıcı
npm run build   # check + üretim derlemesi (dist/)
```

## İçerik

- Akışlar `content/flows/*.yaml`, sözlük `content/terms.yaml`, ekran → veri sayfası `content/screens.yaml` (`/ekran-veri`).
- Veri envanteri `content/data.yaml` (`/veri`): her kartta `in` / `store` / `out` bölümü (`text` zorunlu, `samples` isteğe bağlı), `why` ve `file`. Örnek değerler temsilîdir; alan adları koddan birebir yazılır.
- Ekran öğesinin `source` alanı: `db` (olduğu gibi), `server` (serviste hesap), `client` (tarayıcıda hesap), `external` (dış kaynaktan olduğu gibi).
- Adımın isteğe bağlı `next` alanı dallanmayı yazar: `{ when: "koşul", to: <adım id> }`. Hedef adıma `id` verilir.
- Her adımın `file` alanı repoda gerçek bir dosyayı gösterir. Dosya yoksa build düşer.
- Metin `docs/10-standards/WRITING.md` (`YZ-01`–`YZ-08`) kurallarına uyar.
- **Yasak:** AWS hesap ID'si, `arn:aws`, IP adresi, bucket adı, secret adı veya değeri. Yer tutucu kullan: `<deploy rolü>`, `$REG`.

## Görsel not

- Yalnız koyu tema. Token'lar `src/styles.css`'te.
- Aksan `--cob`. Adım paneli renkleri: Ne oluyor `--cob2`, Neden böyle `--em`, Bedeli `--amb`.
- Şerit tonları (`tone`): `gh` GitHub, `aws` AWS, `ec2` EC2, `client` istemci, `edge` Cloudflare, `app` uygulama servisleri, `data` veri, `ext` dış kaynak.
- Şerit etiketleri YAML'da büyük harfle yazılır (CSS çevirmez; `tr` dilinde "i" → "İ" olur).
- Mobil (`max-width: 767px`): sahne dikey zincire döner, yatay taşma yok, dokunma alanı ≥ 44px.
- `prefers-reduced-motion`: paket, akan çizgi ve otomatik oynatma kapalı.
