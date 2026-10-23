using System.Text.Json;

namespace market_service.Clients;

public class TwelveDataClient(HttpClient httpClient, IConfiguration configuration,
    ILogger<TwelveDataClient> logger) : ITwelveDataClient
{
    private readonly string _apiKey = configuration["TwelveData:ApiKey"] ?? string.Empty;

    public async Task<List<TwelveDataListing>> GetListingsAsync(string kind, string exchange, CancellationToken ct)
    {
        try
        {
            var url = $"https://api.twelvedata.com/{kind}?exchange={Uri.EscapeDataString(exchange)}&apikey={_apiKey}";
            var response = await httpClient.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));

            // Twelve Data hatayı (limit, geçersiz anahtar) HTTP 200 + {"code","message"} ile döner.
            if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
            {
                logger.LogWarning("Twelve Data {Kind} list for {Exchange} returned no data: {Code} {Message}",
                    kind, exchange,
                    doc.RootElement.TryGetProperty("code", out var code) ? code.ToString() : string.Empty,
                    doc.RootElement.TryGetProperty("message", out var message) ? message.GetString() : string.Empty);
                return [];
            }

            var results = new List<TwelveDataListing>();
            foreach (var item in data.EnumerateArray())
            {
                results.Add(new TwelveDataListing(
                    Symbol: item.TryGetProperty("symbol", out var s) ? s.GetString() ?? string.Empty : string.Empty,
                    Name: item.TryGetProperty("name", out var n) ? n.GetString() ?? string.Empty : string.Empty,
                    Currency: item.TryGetProperty("currency", out var c) ? c.GetString() ?? string.Empty : string.Empty,
                    Exchange: item.TryGetProperty("exchange", out var e) ? e.GetString() ?? string.Empty : string.Empty,
                    Type: item.TryGetProperty("type", out var t) ? t.GetString() : null));
            }
            return results;
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // URL loglanmaz: API anahtarını içerir.
            logger.LogError(ex, "Failed to fetch Twelve Data {Kind} list for {Exchange}", kind, exchange);
            return [];
        }
    }
}
