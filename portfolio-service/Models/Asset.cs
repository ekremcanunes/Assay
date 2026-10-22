namespace portfolio_service.Models;

public class Asset
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    // Hisse kimliğinin parçası: BIST veya US. Altın ve dövizde boş metin (null değil:
    // unique index'te iki null farklı sayılır, aynı kullanıcıya iki XAU satırı açılabilirdi).
    public string Market { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    public decimal Quantity { get; set; }
    // Alışlarda ödenen para birimi (TRY/USD) — AvgCostBasis bu birimdedir
    public string Currency { get; set; } = "TRY";
    public decimal? AvgCostBasis { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
