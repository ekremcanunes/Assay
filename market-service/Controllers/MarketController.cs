using market_service.Models;
using market_service.Services;
using Microsoft.AspNetCore.Mvc;

namespace market_service.Controllers;

[ApiController]
[Route("api/market")]
public class MarketController : ControllerBase
{
    private readonly IMarketService _marketService;
    private readonly ISymbolSearchService _searchService;
    private readonly IMarketOverviewService _overviewService;
    private readonly IPriceHistoryService _historyService;
    private readonly IPriceOnDateService _priceOnDateService;

    public MarketController(IMarketService marketService, ISymbolSearchService searchService,
        IMarketOverviewService overviewService, IPriceHistoryService historyService,
        IPriceOnDateService priceOnDateService)
    {
        _marketService = marketService;
        _searchService = searchService;
        _overviewService = overviewService;
        _historyService = historyService;
        _priceOnDateService = priceOnDateService;
    }

    [HttpGet("prices")]
    public async Task<ActionResult<List<MarketPrice>>> GetPrices([FromQuery] string? symbols)
    {
        if (string.IsNullOrWhiteSpace(symbols)) return Ok(new List<MarketPrice>());
        var symbolList = symbols.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var prices = await _marketService.GetPricesAsync(symbolList);
        return Ok(prices);
    }

    [HttpGet("price/{symbol}")]
    public async Task<ActionResult<MarketPrice>> GetPrice(string symbol)
    {
        var price = await _marketService.GetPriceAsync(symbol);
        if (price == null) return NotFound();
        return Ok(price);
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<SymbolSearchResult>>> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new List<SymbolSearchResult>());
        var results = await _searchService.SearchAsync(q.Trim());
        return Ok(results);
    }

    [HttpGet("overview")]
    public async Task<ActionResult<MarketOverview>> Overview()
    {
        return Ok(await _overviewService.GetOverviewAsync());
    }

    // Grafik serisi. range beyaz listeye karşı doğrulanır (bkz. PriceHistoryService.Ranges).
    [HttpGet("history/{symbol}")]
    public async Task<ActionResult<PriceHistory>> History(string symbol,
        [FromQuery] string assetType = "Stock", [FromQuery] string range = "1mo")
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest();
        if (!PriceHistoryService.IsValidRange(range)) return BadRequest(new { error = "Unsupported range" });

        return Ok(await _historyService.GetHistoryAsync(symbol.Trim(), assetType, range));
    }

    // Tek günün fiyatı. date ham geçmez: katı yyyy-MM-dd parse edilir.
    // Veri yoksa 404 değil, Available=false döner — "veri yok" bir hata değil.
    [HttpGet("price-on/{symbol}")]
    public async Task<ActionResult<PriceOnDate>> PriceOn(string symbol,
        [FromQuery] string assetType = "Stock", [FromQuery] string? date = null)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest();

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var parsed))
            return BadRequest(new { error = "date must be yyyy-MM-dd" });

        if (parsed > MarketClock.Today)
            return BadRequest(new { error = "date cannot be in the future" });

        if (!PriceOnDateService.IsValidAssetType(assetType))
            return BadRequest(new { error = "Unsupported assetType" });

        return Ok(await _priceOnDateService.GetPriceOnAsync(symbol.Trim(), assetType, parsed));
    }
}
