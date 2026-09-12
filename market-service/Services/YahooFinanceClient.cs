using System.Text.Json;
using market_service.Models;

namespace market_service.Services;

// Yahoo Finance chart meta'sından çekilen ham quote (native para biriminde)
public record YahooQuote(
    decimal Price,
    decimal? PreviousClose,
    decimal? DayHigh,
    decimal? DayLow,
    decimal? Week52High,
    decimal? Week52Low,
    long? Volume,
    string Currency,
    string Exchange);

// Tarihli günlük kapanış. Bilerek Candle DEĞİL: Candle bugün yalnızca grafik
// zincirinde kullanılıyor (GetCandlesAsync → PriceHistoryService → PriceChart).
public record DailyClose(DateOnly Date, decimal Close);

public interface IYahooFinanceClient
{
    Task<YahooQuote?> GetQuoteAsync(string yahooSymbol);

    // Kapanış serisi (sparkline). Quote ile aynı endpoint, yalnızca range farklı.
    Task<List<decimal>> GetCloseSeriesAsync(string yahooSymbol, string range);

    // OHLC + hacim serisi (grafik). Aynı endpoint; interval aralığa göre seçilir.
    Task<(List<Candle> Candles, string Currency)> GetCandlesAsync(string yahooSymbol, string range, string interval);

    // Belirli bir tarih penceresindeki günlük kapanışlar. GetCloseSeriesAsync'in
    // tarihli/pencereli kuzeni; range= bugüne göreli olduğu için eski tarihler
    // için period1/period2 kullanılır.
    Task<(List<DailyClose> Closes, string Currency)> GetDailyClosesAsync(
        string yahooSymbol, DateOnly from, DateOnly to);
}

public class YahooFinanceClient(HttpClient httpClient, ILogger<YahooFinanceClient> logger) : IYahooFinanceClient
{
    public async Task<YahooQuote?> GetQuoteAsync(string yahooSymbol)
    {
        try
        {
            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(yahooSymbol)}?interval=1d&range=1d";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            // Yahoo varsayılan istemcileri engeller; tarayıcı User-Agent gerekli
            request.Headers.Add("User-Agent", "Mozilla/5.0");

            var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var result = doc.RootElement.GetProperty("chart").GetProperty("result");
            if (result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                return null;

            var meta = result[0].GetProperty("meta");

            if (!TryGetDecimal(meta, "regularMarketPrice", out var price))
            {
                logger.LogWarning("No price in Yahoo response for {Symbol}", LogSanitizer.ForLog(yahooSymbol));
                return null;
            }

            // previousClose bazen null döner; chartPreviousClose yedek
            decimal? prevClose = TryGetDecimal(meta, "previousClose", out var pc) ? pc
                : TryGetDecimal(meta, "chartPreviousClose", out var cpc) ? cpc : null;

            return new YahooQuote(
                Price: price,
                PreviousClose: prevClose,
                DayHigh: TryGetDecimal(meta, "regularMarketDayHigh", out var dh) ? dh : null,
                DayLow: TryGetDecimal(meta, "regularMarketDayLow", out var dl) ? dl : null,
                Week52High: TryGetDecimal(meta, "fiftyTwoWeekHigh", out var wh) ? wh : null,
                Week52Low: TryGetDecimal(meta, "fiftyTwoWeekLow", out var wl) ? wl : null,
                Volume: meta.TryGetProperty("regularMarketVolume", out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt64() : null,
                Currency: meta.TryGetProperty("currency", out var c) ? c.GetString() ?? "USD" : "USD",
                Exchange: meta.TryGetProperty("exchangeName", out var e) ? e.GetString() ?? string.Empty : string.Empty);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get Yahoo quote for {Symbol}", LogSanitizer.ForLog(yahooSymbol));
            return null;
        }
    }

    public async Task<List<decimal>> GetCloseSeriesAsync(string yahooSymbol, string range)
    {
        try
        {
            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(yahooSymbol)}?interval=1d&range={Uri.EscapeDataString(range)}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Mozilla/5.0");

            var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var result = doc.RootElement.GetProperty("chart").GetProperty("result");
            if (result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                return [];

            var closes = result[0].GetProperty("indicators").GetProperty("quote")[0].GetProperty("close");

            // Tatil/durdurma günlerinde null gelir → atlanır
            return closes.EnumerateArray()
                .Where(c => c.ValueKind == JsonValueKind.Number)
                .Select(c => c.GetDecimal())
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get Yahoo series for {Symbol}", LogSanitizer.ForLog(yahooSymbol));
            return [];
        }
    }

    public async Task<(List<Candle> Candles, string Currency)> GetCandlesAsync(string yahooSymbol, string range, string interval)
    {
        try
        {
            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(yahooSymbol)}"
                    + $"?interval={Uri.EscapeDataString(interval)}&range={Uri.EscapeDataString(range)}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Mozilla/5.0");

            var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var result = doc.RootElement.GetProperty("chart").GetProperty("result");
            if (result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                return ([], string.Empty);

            var root = result[0];
            var stamps = root.GetProperty("timestamp");
            var q = root.GetProperty("indicators").GetProperty("quote")[0];
            var currency = root.GetProperty("meta").TryGetProperty("currency", out var c)
                ? c.GetString() ?? string.Empty : string.Empty;

            var opens = q.GetProperty("open");
            var highs = q.GetProperty("high");
            var lows = q.GetProperty("low");
            var closes = q.GetProperty("close");
            var volumes = q.TryGetProperty("volume", out var v) ? v : default;

            var candles = new List<Candle>(stamps.GetArrayLength());
            for (var i = 0; i < stamps.GetArrayLength(); i++)
            {
                // Tatil/durdurma barlarında OHLC null gelir → mum atlanır
                if (opens[i].ValueKind != JsonValueKind.Number || highs[i].ValueKind != JsonValueKind.Number ||
                    lows[i].ValueKind != JsonValueKind.Number || closes[i].ValueKind != JsonValueKind.Number)
                    continue;

                candles.Add(new Candle
                {
                    Time = stamps[i].GetInt64(),
                    Open = opens[i].GetDecimal(),
                    High = highs[i].GetDecimal(),
                    Low = lows[i].GetDecimal(),
                    Close = closes[i].GetDecimal(),
                    Volume = volumes.ValueKind == JsonValueKind.Array && volumes[i].ValueKind == JsonValueKind.Number
                        ? volumes[i].GetInt64() : null,
                });
            }

            return (candles, currency);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get Yahoo candles for {Symbol}", LogSanitizer.ForLog(yahooSymbol));
            return ([], string.Empty);
        }
    }

    public async Task<(List<DailyClose> Closes, string Currency)> GetDailyClosesAsync(
        string yahooSymbol, DateOnly from, DateOnly to)
    {
        try
        {
            var p1 = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds();
            // +1 gün: period2 dışlayıcı davranabiliyor, hedef gün pencerede kalsın
            var p2 = new DateTimeOffset(to.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds();

            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(yahooSymbol)}"
                    + $"?interval=1d&period1={p1}&period2={p2}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Mozilla/5.0");

            var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var result = doc.RootElement.GetProperty("chart").GetProperty("result");
            if (result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                return ([], string.Empty);

            var root = result[0];
            var stamps = root.GetProperty("timestamp");
            var closes = root.GetProperty("indicators").GetProperty("quote")[0].GetProperty("close");
            var currency = root.GetProperty("meta").TryGetProperty("currency", out var c)
                ? c.GetString() ?? string.Empty : string.Empty;

            var list = new List<DailyClose>(stamps.GetArrayLength());
            for (var i = 0; i < stamps.GetArrayLength(); i++)
            {
                // Tatil/durdurma günlerinde close null gelir → atlanır
                if (closes[i].ValueKind != JsonValueKind.Number) continue;

                var date = DateOnly.FromDateTime(
                    DateTimeOffset.FromUnixTimeSeconds(stamps[i].GetInt64()).UtcDateTime);
                list.Add(new DailyClose(date, closes[i].GetDecimal()));
            }

            return (list, currency);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get Yahoo daily closes for {Symbol}", LogSanitizer.ForLog(yahooSymbol));
            return ([], string.Empty);
        }
    }

    private static bool TryGetDecimal(JsonElement el, string prop, out decimal value)
    {
        value = 0m;
        if (el.TryGetProperty(prop, out var p) && p.ValueKind == JsonValueKind.Number)
        {
            value = p.GetDecimal();
            return true;
        }
        return false;
    }
}
