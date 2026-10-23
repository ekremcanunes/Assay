namespace portfolio_service.Clients;

public class PriceHistoryResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string Range { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public List<CandleResponse> Candles { get; set; } = new();
}
