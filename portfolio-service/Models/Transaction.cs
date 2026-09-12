namespace portfolio_service.Models;

public class Transaction
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Category { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public string? Description { get; set; }
    public DateTime Date { get; set; }
    // Varlık işlemleri (AssetBuy/AssetSell) için: Amount = Quantity * UnitPrice
    public string? Symbol { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    // Sadece AssetSell: (satış fiyatı - ort. maliyet) * miktar, işlem para biriminde
    public decimal? RealizedProfitLoss { get; set; }
    public Guid? AssetId { get; set; }
    public Asset? Asset { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
