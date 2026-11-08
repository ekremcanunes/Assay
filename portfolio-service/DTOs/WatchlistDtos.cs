using portfolio_service.Models;

namespace portfolio_service.DTOs;

public class AddWatchlistDto
{
    public AssetType AssetType { get; set; }
    public string? Market { get; set; }
    public string Symbol { get; set; } = string.Empty;
}

// Fiyatlar enstrümanın kendi para biriminde (Currency). Fiyat alınamadıysa Price null döner, kalem yine listelenir.
public class WatchlistItemDto
{
    public Guid Id { get; set; }
    public string Market { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = "TRY";
    public decimal? Price { get; set; }
    public decimal? ChangePercent { get; set; }
    public decimal? PriceAtAdd { get; set; }
    public decimal? SinceAddedPercent { get; set; }
    public DateTime CreatedAt { get; set; }
}
