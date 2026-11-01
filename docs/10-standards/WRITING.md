# Yazım Standardı — Basit Teknik Türkçe

Bu standart `docs/10-standards/` altındaki dokümanlar ve `.claude/agents/` altındaki agent talimatları için geçerlidir.
Kaynak: ASD-STE100 (Simplified Technical English). Bu dosya onun Türkçeye uyarlanmış özetidir.
Amaç: insan ve agent dokümanı bir kez okur ve tek anlamla anlar.

---

## Kimlik önekleri

| Önek | Konu |
|------|------|
| `YZ` | Yazım (bu dosya) |

Her standart dosyası kendi öneklerini başta bir tabloda verir.

---

## Kurallar

### Cümle

- `YZ-01` Bir cümleye bir bilgi yaz.
- `YZ-02` Kural cümlesini en fazla 20 kelime yaz. Açıklama cümlesini en fazla 25 kelime yaz.
- `YZ-03` Kuralı emir kipiyle yaz: "Kullan.", "Yazma." Edilgen yapı ("kullanılır") kullanma.
- `YZ-04` Mecaz ve öznel sıfat kullanma ("sakin", "neredeyse görünmez"). Token, sınıf, dosya veya sayı yaz.
- `YZ-05` Aralık yazma ("12–16px"). Tek değer yaz. İki değer gerekirse her birinin koşulunu yaz.

### Terim

- `YZ-06` Bir terime bir anlam ver. Eş anlamlı kullanma.
- `YZ-07` Terim dosyada birden fazla anlama gelebiliyorsa dosyanın başında "Terimler" tablosunda tanımla.
- `YZ-08` Kod adlarını (sınıf, token, dosya, komut) ters tırnak içinde yaz.

### Yapı

- `YZ-09` Her kurala sabit bir kimlik ver: `ÖNEK-NN` (ör. `RN-03`). Önek ASCII, 2 harf olsun.
- `YZ-10` Kimliği silme veya yeniden numaralama. Kural kalkarsa kimliği "kaldırıldı" diye işaretle.
- `YZ-11` Kural biçimi: `KİMLİK` + kural. Neden gerekiyorsa aynı satıra "Neden:" ile tek cümle ekle.
- `YZ-12` Bir kuralı bir kez yaz. Ayrı "yapma" listesi açma; yasak kendi kuralının içinde dursun.
- `YZ-13` Paragraf yerine tablo veya liste kullan.
- `YZ-14` Değeri koddan al. Doküman ile kod çelişirse kod doğrudur; dokümanı düzelt.

### Kapsam

- `YZ-15` Tarih, deneme ve karar geçmişi yazma. Bunlar git geçmişindedir.
- `YZ-16` Konu dışı bilgiyi kendi dosyasına taşı. Ör. ekran davranışı `DESIGN.md`'ye değil `SCREENS.md`'ye gider.
- `YZ-17` Dosyanın ilk üç satırında kapsamı ve amacı yaz.
