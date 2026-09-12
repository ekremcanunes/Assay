using System.Text.Json;

namespace market_service.Services;

public class FrankfurterClient : IFrankfurterClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FrankfurterClient> _logger;

    public FrankfurterClient(HttpClient httpClient, ILogger<FrankfurterClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<decimal?> GetExchangeRateAsync(string baseCurrency)
    {
        try
        {
            var response = await _httpClient.GetAsync($"https://api.frankfurter.dev/v2/rates?base={baseCurrency}&quotes=TRY");
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.ValueKind == JsonValueKind.Array &&
                doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                if (first.TryGetProperty("rate", out var rate))
                    return rate.GetDecimal();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get exchange rate for {BaseCurrency}", LogSanitizer.ForLog(baseCurrency));
            return null;
        }
    }

    // v1 zaman serisi: {"rates":{"2026-08-07":{"TRY":47.706}, ...}} — hafta sonları atlanır.
    public async Task<List<decimal>> GetSeriesAsync(string baseCurrency, int days)
    {
        try
        {
            var end = DateTime.UtcNow.Date;
            var start = end.AddDays(-days);
            var url = $"https://api.frankfurter.dev/v1/{start:yyyy-MM-dd}..{end:yyyy-MM-dd}?base={baseCurrency}&symbols=TRY";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("rates", out var rates))
                return [];

            return rates.EnumerateObject()
                .OrderBy(p => p.Name, StringComparer.Ordinal)   // tarih ISO → sıralama kronolojik
                .Where(p => p.Value.TryGetProperty("TRY", out _))
                .Select(p => p.Value.GetProperty("TRY").GetDecimal())
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get series for {BaseCurrency}", LogSanitizer.ForLog(baseCurrency));
            return [];
        }
    }

    public async Task<SortedDictionary<DateOnly, decimal>> GetRateSeriesAsync(
        string baseCurrency, DateOnly from, DateOnly to)
    {
        var map = new SortedDictionary<DateOnly, decimal>();
        try
        {
            var url = $"https://api.frankfurter.dev/v1/{from:yyyy-MM-dd}..{to:yyyy-MM-dd}"
                    + $"?base={Uri.EscapeDataString(baseCurrency)}&symbols=TRY";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("rates", out var rates)) return map;

            foreach (var day in rates.EnumerateObject())
            {
                if (!DateOnly.TryParseExact(day.Name, "yyyy-MM-dd", out var d)) continue;
                if (day.Value.TryGetProperty("TRY", out var v) && v.ValueKind == JsonValueKind.Number)
                    map[d] = v.GetDecimal();
            }
            return map;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get rate series for {BaseCurrency}", LogSanitizer.ForLog(baseCurrency));
            return map;
        }
    }
}
