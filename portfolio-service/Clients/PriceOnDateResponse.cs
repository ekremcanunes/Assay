namespace portfolio_service.Clients;

public class PriceOnDateResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public DateOnly RequestedDate { get; set; }
    public DateOnly? EffectiveDate { get; set; }
    public bool Available { get; set; }
    public string PriceKind { get; set; } = "close";
    public decimal? PriceInNative { get; set; }
    public decimal? PriceInUsd { get; set; }
    public decimal? PriceInTry { get; set; }
    public string NativeCurrency { get; set; } = string.Empty;
}
