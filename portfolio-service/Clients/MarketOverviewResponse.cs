namespace portfolio_service.Clients;

public class MarketOverviewResponse
{
    public List<MarketQuoteResponse> Indices { get; set; } = new();
    public List<MarketQuoteResponse> Strip { get; set; } = new();
    public List<MarketQuoteResponse> Stocks { get; set; } = new();
}
