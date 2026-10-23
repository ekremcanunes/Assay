namespace portfolio_service.Clients;

public class SymbolSearchResponse
{
    public string Symbol { get; set; } = string.Empty;
    public string Market { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Exchange { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
}
