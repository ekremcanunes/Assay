namespace market_service.Models;

// Bir endeksin tek bileşeni. Kaynağı Borsa İstanbul'un endeks bileşen dosyası (hisse_endeks_ds.csv),
// haftalık senkronla güncellenir (bkz. docs/superpowers/specs/2026-11-16-bist30-resmi-liste-design.md).
// Instruments ile ilişki mantıksaldır: ("BIST", Symbol). Foreign key yok: iki tabloyu iki ayrı kaynak
// doldurur; Twelve Data bir sembolde geride kalırsa kısıt bütün güncellemeyi reddettirirdi.
public class IndexConstituent
{
    public const string Bist30 = "XU030";
    public const string Bist100 = "XU100";

    // Borsa İstanbul endeks kodu: XU030, XU100
    public string IndexCode { get; set; } = string.Empty;
    // ".E" eki atılmış BIST sembolü: ASELS
    public string Symbol { get; set; } = string.Empty;
    // Dosyadaki TARIH: listenin geçerli olduğu işlem günü
    public DateOnly AsOf { get; set; }
}
