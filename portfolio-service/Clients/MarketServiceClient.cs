using System.Net;
using System.Net.Http.Json;
using portfolio_service.Middleware;
using portfolio_service.Services;

namespace portfolio_service.Clients;

public class MarketServiceClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor,
    CacheLifetime cacheLifetime) : IMarketServiceClient
{
    public async Task<List<MarketPriceResponse>> GetPricesAsync(IEnumerable<string> symbols) =>
        await GetAsync<List<MarketPriceResponse>>($"/api/market/prices?symbols={string.Join(",", symbols)}") ?? new();

    public async Task<List<SymbolSearchResponse>> SearchAsync(string query) =>
        await GetAsync<List<SymbolSearchResponse>>($"/api/market/search?q={Uri.EscapeDataString(query)}") ?? new();

    public async Task<MarketOverviewResponse> GetOverviewAsync() =>
        await GetAsync<MarketOverviewResponse>("/api/market/overview") ?? new();

    public async Task<PriceHistoryResponse> GetHistoryAsync(string market, string symbol, string assetType, string range) =>
        await GetAsync<PriceHistoryResponse>($"/api/market/history/{Uri.EscapeDataString(symbol)}"
            + $"?market={Uri.EscapeDataString(market)}&assetType={Uri.EscapeDataString(assetType)}&range={Uri.EscapeDataString(range)}") ?? new();

    public async Task<PriceOnDateResponse> GetPriceOnAsync(string market, string symbol, string assetType, string date) =>
        await GetAsync<PriceOnDateResponse>($"/api/market/price-on/{Uri.EscapeDataString(symbol)}"
            + $"?market={Uri.EscapeDataString(market)}&assetType={Uri.EscapeDataString(assetType)}&date={Uri.EscapeDataString(date)}") ?? new();

    // Alım kilidi (spec §4.6). 404 → null: enstrüman desteklenmiyor. 503 ve diğer hatalar, ulaşılamama
    // fırlatılır; çağıran bunları "doğrulanamadı" sayar ve alımı reddeder (fail closed).
    public async Task<SymbolSearchResponse?> GetInstrumentAsync(string market, string symbol)
    {
        try
        {
            return await GetAsync<SymbolSearchResponse>(
                $"/api/market/instrument?market={Uri.EscapeDataString(market)}&symbol={Uri.EscapeDataString(symbol)}");
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    // Tüm market-service çağrılarının tek yolu: kullanıcının cookie'si iletilir,
    // cevaptaki kalan cache ömrü (X-Cache-Expires-In) bu isteğin CacheLifetime'ına eklenir.
    private async Task<T?> GetAsync<T>(string url)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);

        var cookieHeader = httpContextAccessor.HttpContext?.Request.Headers["Cookie"].ToString();
        if (!string.IsNullOrEmpty(cookieHeader))
            request.Headers.Add("Cookie", cookieHeader);

        var response = await httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        if (response.Headers.TryGetValues(CacheLifetimeMiddleware.HeaderName, out var values)
            && int.TryParse(values.FirstOrDefault(), out var seconds))
            cacheLifetime.Report(seconds);

        return await response.Content.ReadFromJsonAsync<T>();
    }
}
