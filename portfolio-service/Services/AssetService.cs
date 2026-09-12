using Microsoft.EntityFrameworkCore;
using portfolio_service.Data;
using portfolio_service.DTOs;
using portfolio_service.Models;

namespace portfolio_service.Services;

public class AssetService(AppDbContext db, IMarketServiceClient marketClient) : IAssetService
{
    public async Task<List<AssetHoldingDto>> GetHoldingsAsync(string userId)
    {
        var assets = await db.Assets.Where(a => a.UserId == userId).OrderBy(a => a.Symbol).ToListAsync();
        var priceMap = await GetPriceMapAsync(assets.Select(a => a.Symbol));
        return assets.Select(a => MapToHolding(a, priceMap)).ToList();
    }

    public async Task<AssetHoldingDto> BuyAsync(BuyAssetDto dto, string userId)
    {
        var symbol = dto.Symbol.Trim().ToUpperInvariant();
        var currency = dto.Currency.Trim().ToUpperInvariant();
        var date = NormalizeDate(dto.Date);

        var asset = await db.Assets.FirstOrDefaultAsync(a => a.UserId == userId && a.Symbol == symbol);

        if (asset is null)
        {
            asset = new Asset
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Symbol = symbol,
                AssetType = dto.AssetType,
                Quantity = dto.Quantity,
                Currency = currency,
                AvgCostBasis = dto.UnitPrice,
                CreatedAt = DateTime.UtcNow
            };
            db.Assets.Add(asset);
        }
        else
        {
            if (asset.Currency != currency)
                throw new InvalidOperationException($"Bu varlık {asset.Currency} ile alınmış; {currency} ile karıştırılamaz.");

            // Ağırlıklı ortalama maliyet
            var oldCost = asset.AvgCostBasis ?? dto.UnitPrice;
            asset.AvgCostBasis = (asset.Quantity * oldCost + dto.Quantity * dto.UnitPrice)
                                 / (asset.Quantity + dto.Quantity);
            asset.Quantity += dto.Quantity;
        }

        db.Transactions.Add(new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = TransactionType.AssetBuy,
            Amount = dto.Quantity * dto.UnitPrice,
            Currency = currency,
            Category = dto.AssetType.ToString(),
            Symbol = symbol,
            Quantity = dto.Quantity,
            UnitPrice = dto.UnitPrice,
            Description = $"{symbol} alış: {dto.Quantity} x {dto.UnitPrice} {currency}",
            Date = date,
            AssetId = asset.Id
        });

        await db.SaveChangesAsync();

        var priceMap = await GetPriceMapAsync([symbol]);
        return MapToHolding(asset, priceMap);
    }

    public async Task<AssetHoldingDto?> SellAsync(Guid assetId, SellAssetDto dto, string userId)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.UserId == userId);
        if (asset is null) return null;

        if (dto.Quantity > asset.Quantity)
            throw new InvalidOperationException($"Elinizde {asset.Quantity} adet var; {dto.Quantity} satılamaz.");

        var date = NormalizeDate(dto.Date);
        decimal? realized = asset.AvgCostBasis.HasValue
            ? (dto.UnitPrice - asset.AvgCostBasis.Value) * dto.Quantity
            : null;

        db.Transactions.Add(new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = TransactionType.AssetSell,
            Amount = dto.Quantity * dto.UnitPrice,
            Currency = asset.Currency,
            Category = asset.AssetType.ToString(),
            Symbol = asset.Symbol,
            Quantity = dto.Quantity,
            UnitPrice = dto.UnitPrice,
            RealizedProfitLoss = realized,
            Description = $"{asset.Symbol} satış: {dto.Quantity} x {dto.UnitPrice} {asset.Currency}",
            Date = date,
            AssetId = asset.Id
        });

        asset.Quantity -= dto.Quantity;
        if (asset.Quantity == 0)
            db.Assets.Remove(asset); // işlem geçmişi durur (AssetId -> null)

        await db.SaveChangesAsync();

        if (asset.Quantity == 0) return MapToHolding(asset, new Dictionary<string, MarketPriceResponse>());

        var priceMap = await GetPriceMapAsync([asset.Symbol]);
        return MapToHolding(asset, priceMap);
    }

    public async Task<AssetHoldingDto?> UpdateAsync(Guid assetId, UpdateAssetDto dto, string userId)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.UserId == userId);
        if (asset is null) return null;

        if (dto.Quantity.HasValue) asset.Quantity = dto.Quantity.Value;
        if (dto.PurchasePrice.HasValue) asset.AvgCostBasis = dto.PurchasePrice.Value;

        await db.SaveChangesAsync();

        var priceMap = await GetPriceMapAsync([asset.Symbol]);
        return MapToHolding(asset, priceMap);
    }

    public async Task<bool> DeleteAsync(Guid assetId, string userId)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.UserId == userId);
        if (asset is null) return false;

        db.Assets.Remove(asset);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DashboardDto> GetDashboardAsync(string userId)
    {
        var holdings = await GetHoldingsAsync(userId);

        return new DashboardDto
        {
            TotalValueInTry = holdings.Sum(h => h.ValueInTry),
            AssetCount = holdings.Count,
            CashValueInTry = holdings.Where(h => h.AssetType == AssetType.Currency).Sum(h => h.ValueInTry),
            StockValueInTry = holdings.Where(h => h.AssetType == AssetType.Stock).Sum(h => h.ValueInTry)
        };
    }

    private async Task<Dictionary<string, MarketPriceResponse>> GetPriceMapAsync(IEnumerable<string> symbols)
    {
        var list = symbols.Distinct().ToList();
        if (list.Count == 0) return new();
        try
        {
            var prices = await marketClient.GetPricesAsync(list);
            return prices.ToDictionary(p => p.Symbol, p => p);
        }
        catch
        {
            // Market servisi düşükse fiyatsız devam et; holding'ler PriceAvailable=false döner
            return new();
        }
    }

    private static AssetHoldingDto MapToHolding(Asset a, Dictionary<string, MarketPriceResponse> priceMap)
    {
        var price = priceMap.GetValueOrDefault(a.Symbol);
        var priceInTry = price?.PriceInTry ?? 0m;

        // Güncel birim fiyatı varlığın alış para biriminde bul (P&L kıyaslaması için)
        decimal? currentUnitPrice = a.Currency == "USD" ? price?.PriceInUsd : price?.PriceInTry;

        decimal? totalCost = a.AvgCostBasis.HasValue ? a.Quantity * a.AvgCostBasis.Value : null;
        decimal? unrealized = (a.AvgCostBasis.HasValue && currentUnitPrice.HasValue)
            ? (currentUnitPrice.Value - a.AvgCostBasis.Value) * a.Quantity
            : null;
        decimal? unrealizedPercent = (unrealized.HasValue && totalCost is > 0)
            ? unrealized.Value / totalCost.Value * 100
            : null;

        // Native fiyat: BIST için TRY, US için USD (detay kartı istatistikleri bu birimde)
        decimal? nativePrice = price is null ? null
            : price.NativeCurrency == "USD" ? price.PriceInUsd : price.PriceInTry;

        return new AssetHoldingDto
        {
            Id = a.Id,
            Symbol = a.Symbol,
            AssetType = a.AssetType,
            Quantity = a.Quantity,
            Currency = a.Currency,
            AvgCostBasis = a.AvgCostBasis,
            TotalCost = totalCost,
            PriceInUsd = price?.PriceInUsd,
            PriceInTry = priceInTry,
            ValueInTry = a.Quantity * priceInTry,
            UnrealizedProfitLoss = unrealized,
            UnrealizedProfitLossPercent = unrealizedPercent,
            PriceAvailable = price is not null,
            CreatedAt = a.CreatedAt,
            NativeCurrency = price?.NativeCurrency ?? string.Empty,
            NativePrice = nativePrice,
            PreviousClose = price?.PreviousClose,
            DayHigh = price?.DayHigh,
            DayLow = price?.DayLow,
            Week52High = price?.Week52High,
            Week52Low = price?.Week52Low,
            Volume = price?.Volume,
            Exchange = price?.Exchange ?? string.Empty
        };
    }

    private static DateTime NormalizeDate(DateTime? date)
    {
        if (!date.HasValue) return DateTime.UtcNow;
        return date.Value.Kind switch
        {
            DateTimeKind.Utc => date.Value,
            DateTimeKind.Local => date.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(date.Value, DateTimeKind.Utc)
        };
    }
}
