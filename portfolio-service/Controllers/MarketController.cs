using Microsoft.AspNetCore.Mvc;
using portfolio_service.Services;

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
