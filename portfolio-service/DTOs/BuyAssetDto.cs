using portfolio_service.Models;

namespace portfolio_service.DTOs;

public class BuyAssetDto
{
    public string Symbol { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "TRY";
    public DateTime? Date { get; set; }
}
