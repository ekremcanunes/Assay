using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using portfolio_service.Clients;
using portfolio_service.Data;
using portfolio_service.DTOs;
using portfolio_service.Models;

namespace portfolio_service.Controllers;

// İzleme listesi: varlığı almadan takip. Kimlik (Market, Symbol); hisse BIST/US, altın XAU, döviz USD/EUR/GBP.
[ApiController]
[Route("api/watchlist")]
public class WatchlistController(AppDbContext db, IMarketServiceClient marketClient,
    ILogger<WatchlistController> logger) : ControllerBase
{
    private static readonly string[] AllowedStockMarkets = ["BIST", "US"];
    private static readonly string[] AllowedCurrencies = ["USD", "EUR", "GBP"];
    private const string GoldSymbol = "XAU";

    private string UserId => HttpContext.Items["UserId"]?.ToString()!;

    [HttpGet]
    public async Task<ActionResult<List<WatchlistItemDto>>> GetAll()
    {
        var items = await db.WatchlistItems.Where(w => w.UserId == UserId)
            .OrderByDescending(w => w.CreatedAt).ToListAsync();
        var prices = await PriceMapAsync(items.Select(w => (w.Market, w.Symbol)));
        return Ok(items.Select(w => ToDto(w, prices.GetValueOrDefault(Key(w.Market, w.Symbol)))).ToList());
    }

    // Aynı kalem zaten varsa onu döner (idempotent): çift tıklama ikinci satır açmaz.
    [HttpPost]
    public async Task<ActionResult<WatchlistItemDto>> Add(AddWatchlistDto dto)
    {
        var market = (dto.Market ?? string.Empty).Trim().ToUpperInvariant();
        var symbol = dto.Symbol.Trim().ToUpperInvariant();
        if (symbol.Length == 0)
            return BadRequest(Error("VALIDATION_ERROR", "Symbol is required"));

        var name = string.Empty;
        switch (dto.AssetType)
        {
            case AssetType.Stock:
                if (!AllowedStockMarkets.Contains(market))
                    return BadRequest(Error("VALIDATION_ERROR", "Market must be BIST or US for stocks"));
                // Alımdaki kilit gibi: hisse aktif listede olmalı; doğrulanamazsa reddedilir (fail closed).
                SymbolSearchResponse? instrument;
                try
                {
                    instrument = await marketClient.GetInstrumentAsync(market, symbol);
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                {
                    logger.LogWarning(ex, "Instrument check unavailable for {Market}:{Symbol}; watchlist add rejected", market, symbol);
                    return StatusCode(StatusCodes.Status503ServiceUnavailable,
                        Error("INSTRUMENT_CHECK_UNAVAILABLE", "Instrument could not be verified right now"));
                }
                if (instrument is null)
                    return BadRequest(Error("INSTRUMENT_NOT_SUPPORTED", "Instrument is not supported"));
                (market, symbol, name) = (instrument.Market, instrument.Symbol, instrument.Name);
                break;
            case AssetType.Gold:
                if (market.Length > 0 || symbol != GoldSymbol)
                    return BadRequest(Error("VALIDATION_ERROR", "Gold symbol must be XAU with empty market"));
                break;
            case AssetType.Currency:
                if (market.Length > 0 || !AllowedCurrencies.Contains(symbol))
                    return BadRequest(Error("VALIDATION_ERROR", "Currency must be USD, EUR or GBP with empty market"));
                break;
        }

        var existing = await db.WatchlistItems.FirstOrDefaultAsync(w => w.UserId == UserId && w.Market == market && w.Symbol == symbol);
        var prices = await PriceMapAsync([(market, symbol)]);
        var price = prices.GetValueOrDefault(Key(market, symbol));
        if (existing is not null) return Ok(ToDto(existing, price));

        var item = new WatchlistItem
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Market = market,
            Symbol = symbol,
            AssetType = dto.AssetType,
            Name = name,
            Currency = price?.NativeCurrency is { Length: > 0 } c ? c : "TRY",
            PriceAtAdd = NativePrice(price),
        };
        db.WatchlistItems.Add(item);
        await db.SaveChangesAsync();
        return Ok(ToDto(item, price));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id)
    {
        var item = await db.WatchlistItems.FirstOrDefaultAsync(w => w.Id == id && w.UserId == UserId);
        if (item is null) return NotFound();
        db.WatchlistItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static string Key(string market, string symbol) => $"{market}:{symbol}";

    private static decimal? NativePrice(MarketPriceResponse? p) =>
        p is null ? null : p.NativeCurrency == "USD" ? p.PriceInUsd : p.PriceInTry;

    // market-service düşükse liste fiyatsız döner; kalemler yine görünür (AssetService ile aynı tutum).
    private async Task<Dictionary<string, MarketPriceResponse>> PriceMapAsync(IEnumerable<(string Market, string Symbol)> ids)
    {
        var list = ids.Select(i => i.Market.Length > 0 ? $"{i.Market}:{i.Symbol}" : i.Symbol).Distinct().ToList();
        if (list.Count == 0) return new();
        try
        {
            var prices = await marketClient.GetPricesAsync(list);
            return prices.GroupBy(p => Key(p.Market, p.Symbol)).ToDictionary(g => g.Key, g => g.First());
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Watchlist prices unavailable for {Count} items", list.Count);
            return new();
        }
    }

    private static WatchlistItemDto ToDto(WatchlistItem w, MarketPriceResponse? p)
    {
        var price = NativePrice(p);
        decimal? Change(decimal? from) => price is { } now && from is > 0 ? (now - from.Value) / from.Value * 100 : null;
        return new WatchlistItemDto
        {
            Id = w.Id,
            Market = w.Market,
            Symbol = w.Symbol,
            AssetType = w.AssetType,
            Name = w.Name,
            Currency = w.Currency,
            Price = price,
            ChangePercent = Change(p?.PreviousClose),
            PriceAtAdd = w.PriceAtAdd,
            SinceAddedPercent = Change(w.PriceAtAdd),
            CreatedAt = w.CreatedAt,
        };
    }

    // AssetController ile aynı biçim: web error.code'u çevirir; message yalnız teşhis için.
    private static object Error(string code, string message) => new { error = new { code, message } };
}
