using System.Text.Json;
using market_service.Models;

namespace market_service.Services;

public class TwelveDataClient(HttpClient httpClient, IConfiguration configuration,
    ILogger<TwelveDataClient> logger) : ITwelveDataClient
{
    private readonly string _apiKey = configuration["TwelveData:ApiKey"] ?? string.Empty;

    public async Task<List<SymbolSearchResult>> GetBistStocksAsync()
    {
        try
        {
            var url = $"https://api.twelvedata.com/stocks?exchange=BIST&apikey={_apiKey}";
            var response = await httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                return [];

            var results = new List<SymbolSearchResult>();
            foreach (var item in data.EnumerateArray())
            {
                results.Add(new SymbolSearchResult
                {
                    Symbol = item.GetProperty("symbol").GetString() ?? string.Empty,
                    Name = item.GetProperty("name").GetString() ?? string.Empty,
                    Exchange = "BIST",
                    Currency = item.TryGetProperty("currency", out var c) ? c.GetString() ?? "TRY" : "TRY"
                });
            }
            return results;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch BIST stocks from Twelve Data");
            return [];
        }
    }

    public async Task<List<SymbolSearchResult>> SearchSymbolsAsync(string query)
    {
        try
        {
            var url = $"https://api.twelvedata.com/symbol_search?symbol={Uri.EscapeDataString(query)}&apikey={_apiKey}";
            var response = await httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                return [];

            var results = new List<SymbolSearchResult>();
            foreach (var item in data.EnumerateArray())
            {
                results.Add(new SymbolSearchResult
                {
                    Symbol = item.TryGetProperty("symbol", out var s) ? s.GetString() ?? string.Empty : string.Empty,
                    Name = item.TryGetProperty("instrument_name", out var n) ? n.GetString() ?? string.Empty : string.Empty,
                    Exchange = item.TryGetProperty("exchange", out var e) ? e.GetString() ?? string.Empty : string.Empty,
                    Currency = item.TryGetProperty("currency", out var c) ? c.GetString() ?? string.Empty : string.Empty
                });
            }
            return results;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to search symbols for {Query}", LogSanitizer.ForLog(query));
            return [];
        }
    }
}
