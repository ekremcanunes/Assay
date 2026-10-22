using Microsoft.AspNetCore.Mvc;
using portfolio_service.DTOs;
using portfolio_service.Models;
using portfolio_service.Services;

namespace portfolio_service.Controllers;

[ApiController]
[Route("api/assets")]
public class AssetController(IAssetService assetService) : ControllerBase
{
    private static readonly string[] AllowedCurrencies = ["TRY", "USD"];
    // market-service YahooSymbol kurallarıyla aynı: hisse BIST/US ister, altın ve döviz market almaz
    private static readonly string[] AllowedStockMarkets = ["BIST", "US"];

    private string UserId => HttpContext.Items["UserId"]?.ToString()!;

    [HttpGet]
    public async Task<ActionResult<List<AssetHoldingDto>>> GetAll()
    {
        return Ok(await assetService.GetHoldingsAsync(UserId));
    }

    [HttpPost("buy")]
    public async Task<ActionResult<AssetHoldingDto>> Buy(BuyAssetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Symbol))
            return BadRequest(ValidationError("Symbol is required"));
        if (dto.Quantity <= 0)
            return BadRequest(ValidationError("Quantity must be greater than zero"));
        if (dto.UnitPrice <= 0)
            return BadRequest(ValidationError("Unit price must be greater than zero"));
        if (!AllowedCurrencies.Contains(dto.Currency.Trim().ToUpperInvariant()))
            return BadRequest(ValidationError("Currency must be TRY or USD"));

        var market = (dto.Market ?? string.Empty).Trim().ToUpperInvariant();
        if (dto.AssetType == AssetType.Stock ? !AllowedStockMarkets.Contains(market) : market.Length > 0)
            return BadRequest(ValidationError("Market must be BIST or US for stocks and empty otherwise"));
        if (dto.PriceSource is null)
            return BadRequest(ValidationError("PriceSource is required"));

        try
        {
            var result = await assetService.BuyAsync(dto, UserId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ValidationError(ex.Message));
        }
    }

    [HttpPost("{id:guid}/sell")]
    public async Task<ActionResult<AssetHoldingDto>> Sell(Guid id, SellAssetDto dto)
    {
        if (dto.Quantity <= 0)
            return BadRequest(ValidationError("Quantity must be greater than zero"));
        if (dto.UnitPrice <= 0)
            return BadRequest(ValidationError("Unit price must be greater than zero"));

        try
        {
            var result = await assetService.SellAsync(id, dto, UserId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ValidationError(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AssetHoldingDto>> Update(Guid id, UpdateAssetDto dto)
    {
        if (dto.Quantity is <= 0)
            return BadRequest(ValidationError("Quantity must be greater than zero"));
        if (dto.PurchasePrice is < 0)
            return BadRequest(ValidationError("Purchase price cannot be negative"));

        var result = await assetService.UpdateAsync(id, dto, UserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await assetService.DeleteAsync(id, UserId);
        return deleted ? NoContent() : NotFound();
    }

    private static object ValidationError(string message) =>
        new { error = new { code = "VALIDATION_ERROR", message } };
}
