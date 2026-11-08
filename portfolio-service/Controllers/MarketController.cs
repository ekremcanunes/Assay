using Microsoft.AspNetCore.Mvc;
using portfolio_service.Clients;

namespace portfolio_service.Controllers;

// Tarayıcının market-service'e giden istekleri bu proxy'den geçer (nginx tüm /api/'yi buraya yönlendirir).
[ApiController]
[Route("api/market")]
public class MarketController(IMarketServiceClient marketServiceClient) : ControllerBase
{
    [HttpGet("search")]
    public async Task<ActionResult<List<SymbolSearchResponse>>> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new List<SymbolSearchResponse>());
        return await ForwardAsync(() => marketServiceClient.SearchAsync(q.Trim()));
    }

    [HttpGet("overview")]
    public async Task<ActionResult<MarketOverviewResponse>> Overview()
    {
        return await ForwardAsync(() => marketServiceClient.GetOverviewAsync());
    }

    // Varlık sayfası: tek varlığın anlık fiyatı ve gün/52H istatistikleri. Kimlik (market, symbol);
    // hisse "BIST:THYAO", altın/döviz market boş ("XAU", "USD"). Fiyat bulunamazsa 404.
    [HttpGet("quote")]
    public async Task<ActionResult<MarketPriceResponse>> Quote([FromQuery] string? market, [FromQuery] string? symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest();
        var entry = string.IsNullOrWhiteSpace(market) ? symbol.Trim() : $"{market.Trim()}:{symbol.Trim()}";
        var prices = await marketServiceClient.GetPricesAsync([entry]);
        return prices.Count > 0 ? Ok(prices[0]) : NotFound();
    }

    // Varlık sayfası: enstrümanın adı, borsası, para birimi. Katalogda yoksa 404.
    [HttpGet("instrument")]
    public async Task<ActionResult<SymbolSearchResponse>> Instrument([FromQuery] string? market, [FromQuery] string? symbol)
    {
        if (string.IsNullOrWhiteSpace(market) || string.IsNullOrWhiteSpace(symbol)) return BadRequest();
        var instrument = await marketServiceClient.GetInstrumentAsync(market.Trim(), symbol.Trim());
        return instrument is null ? NotFound() : Ok(instrument);
    }

    // Grafik serisi
    [HttpGet("history/{symbol}")]
    public async Task<ActionResult<PriceHistoryResponse>> History(string symbol,
        [FromQuery] string assetType = "Stock", [FromQuery] string range = "1mo", [FromQuery] string? market = null)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest();
        return await ForwardAsync(() => marketServiceClient.GetHistoryAsync(market ?? string.Empty, symbol.Trim(), assetType, range));
    }

    // Tarihe göre fiyat
    [HttpGet("price-on/{symbol}")]
    public async Task<ActionResult<PriceOnDateResponse>> PriceOn(string symbol,
        [FromQuery] string assetType = "Stock", [FromQuery] string? date = null, [FromQuery] string? market = null)
    {
        if (string.IsNullOrWhiteSpace(symbol) || string.IsNullOrWhiteSpace(date)) return BadRequest();
        return await ForwardAsync(() => marketServiceClient.GetPriceOnAsync(market ?? string.Empty, symbol.Trim(), assetType, date));
    }

    // market-service'in 4xx cevabı (ör. geçersiz market/range → 400) aynen iletilir; aksi halde
    // yakalanmayan istisna 500'e dönüşür ve istek hatası sunucu arızası gibi görünür.
    // 5xx ve bağlantı hataları yakalanmaz: gerçekten sunucu tarafı sorundur, 500 kalır.
    private async Task<ActionResult<T>> ForwardAsync<T>(Func<Task<T>> call)
    {
        try
        {
            return Ok(await call());
        }
        catch (HttpRequestException ex) when (ex.StatusCode is { } code && (int)code is >= 400 and < 500)
        {
            return StatusCode((int)code);
        }
    }
}
