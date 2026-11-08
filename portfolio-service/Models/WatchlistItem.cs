namespace portfolio_service.Models;

// İzleme listesi kalemi: kullanıcı varlığı almadan takip eder. Kimlik (UserId, Market, Symbol) — Asset ile aynı.
public class WatchlistItem
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    // Hisse için BIST veya US; altın ve dövizde boş metin (Asset.Market ile aynı gerekçe).
    public string Market { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    // Hissede katalogdaki ad; altın ve dövizde boş (web türden çevirir).
    public string Name { get; set; } = string.Empty;
    // PriceAtAdd'in para birimi (enstrümanın kendi birimi: BIST/altın/döviz TRY, US USD).
    public string Currency { get; set; } = "TRY";
    // Eklendiği andaki fiyat — "eklediğinden beri" değişimi için. Fiyat alınamadıysa null.
    public decimal? PriceAtAdd { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
