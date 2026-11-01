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

- Akışlar `content/flows/*.yaml`, sözlük `content/terms.yaml`.
- Her adımın `file` alanı repoda gerçek bir dosyayı gösterir. Dosya yoksa build düşer.
- Metin `docs/10-standards/WRITING.md` (`YZ-01`–`YZ-08`) kurallarına uyar.
- **Yasak:** AWS hesap ID'si, `arn:aws`, IP adresi, bucket adı, secret adı veya değeri. Yer tutucu kullan: `<deploy rolü>`, `$REG`.

## Görsel not

- Yalnız koyu tema. Token'lar `src/styles.css`'te.
- Aksan `--cob`. Adım paneli renkleri: Ne oluyor `--cob2`, Neden böyle `--em`, Bedeli `--amb`.
- Şerit tonları: GitHub `--lane-gh`, AWS `--lane-aws`, EC2 `--lane-ec2`.
- Mobil (`max-width: 767px`): sahne dikey zincire döner, yatay taşma yok, dokunma alanı ≥ 44px.
- `prefers-reduced-motion`: paket, akan çizgi ve otomatik oynatma kapalı.
