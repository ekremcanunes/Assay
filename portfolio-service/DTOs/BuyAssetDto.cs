using portfolio_service.Models;

namespace portfolio_service.DTOs;

public class BuyAssetDto
{
    public string Symbol { get; set; } = string.Empty;
    // Hisse için BIST/US zorunlu; altın ve dövizde boş
    public string Market { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "TRY";
    public DateTime? Date { get; set; }
    // Nullable: gönderilmezse enum varsayılanına (Market) sessizce düşmesin, controller 400 döner
    public PriceSource? PriceSource { get; set; }
}
