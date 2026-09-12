namespace portfolio_service.DTOs;

public class SellAssetDto
{
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime? Date { get; set; }
}
