namespace portfolio_service.Clients;

public interface IMarketServiceClient
{
    Task<List<MarketPriceResponse>> GetPricesAsync(IEnumerable<string> symbols);
    Task<List<SymbolSearchResponse>> SearchAsync(string query);
    Task<MarketOverviewResponse> GetOverviewAsync();
    Task<PriceHistoryResponse> GetHistoryAsync(string market, string symbol, string assetType, string range);
    Task<PriceOnDateResponse> GetPriceOnAsync(string market, string symbol, string assetType, string date);
}
