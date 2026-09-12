using portfolio_service.Models;

namespace portfolio_service.DTOs;

public class AssetHoldingDto
{
    public Guid Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    public decimal Quantity { get; set; }
    // Alış para birimi — AvgCostBasis ve UnrealizedProfitLoss bu birimdedir
    public string Currency { get; set; } = "TRY";
    public decimal? AvgCostBasis { get; set; }
    public decimal? TotalCost { get; set; }
    public decimal? PriceInUsd { get; set; }
    public decimal PriceInTry { get; set; }
    public decimal ValueInTry { get; set; }
    public decimal? UnrealizedProfitLoss { get; set; }
    public decimal? UnrealizedProfitLossPercent { get; set; }
    public bool PriceAvailable { get; set; }
    public DateTime CreatedAt { get; set; }

    // Detay kartı için native (işlem para birimi) piyasa verileri
    public string NativeCurrency { get; set; } = string.Empty;
    public decimal? NativePrice { get; set; }
    public decimal? PreviousClose { get; set; }
    public decimal? DayHigh { get; set; }
    public decimal? DayLow { get; set; }
    public decimal? Week52High { get; set; }
    public decimal? Week52Low { get; set; }
    public long? Volume { get; set; }
    public string Exchange { get; set; } = string.Empty;
}
