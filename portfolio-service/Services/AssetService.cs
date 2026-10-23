using Microsoft.EntityFrameworkCore;
using portfolio_service.Clients;
using portfolio_service.Data;
using portfolio_service.DTOs;
using portfolio_service.Models;

namespace portfolio_service.Services;

public class AssetService(AppDbContext db, IMarketServiceClient marketClient, ILogger<AssetService> logger) : IAssetService
{
    public async Task<List<AssetHoldingDto>> GetHoldingsAsync(string userId)
    {
        var assets = await db.Assets.Where(a => a.UserId == userId).OrderBy(a => a.Symbol).ToListAsync();
        var priceMap = await GetPriceMapAsync(assets);
        return assets.Select(a => MapToHolding(a, priceMap)).ToList();
    }

    public async Task<AssetHoldingDto> BuyAsync(BuyAssetDto dto, string userId)
    {
        // market-service ile aynı standart yazım: "brk-b" → "BRK.B"
        var symbol = dto.Symbol.Trim().ToUpperInvariant().Replace('-', '.');
        var market = (dto.Market ?? string.Empty).Trim().ToUpperInvariant();
        var currency = dto.Currency.Trim().ToUpperInvariant();
        var date = NormalizeDate(dto.Date);

        // Kimlik (Market, Symbol): LINK · US alımı LINK · BIST satırına eklenmez
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.UserId == userId && a.Symbol == symbol && a.Market == market);

        if (asset is null)
        {
            asset = new Asset
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Symbol = symbol,
                Market = market,
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
            Market = market,
            Quantity = dto.Quantity,
            UnitPrice = dto.UnitPrice,
            UsdTryRate = await GetUsdTryRateAsync(date),
            PriceSource = dto.PriceSource,
            Description = $"{symbol} alış: {dto.Quantity} x {dto.UnitPrice} {currency}",
            Date = date,
            AssetId = asset.Id
        });

        await db.SaveChangesAsync();

        var priceMap = await GetPriceMapAsync([asset]);
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
            Market = asset.Market,
            Quantity = dto.Quantity,
            UnitPrice = dto.UnitPrice,
            UsdTryRate = await GetUsdTryRateAsync(date),
            // Satış formu fiyatı boş başlatır (otomatik doldurma yok) → fiyat her zaman kullanıcıdan
            PriceSource = PriceSource.Manual,
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

        var priceMap = await GetPriceMapAsync([asset]);
        return MapToHolding(asset, priceMap);
    }

    public async Task<AssetHoldingDto?> UpdateAsync(Guid assetId, UpdateAssetDto dto, string userId)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.UserId == userId);
        if (asset is null) return null;

        if (dto.Quantity.HasValue) asset.Quantity = dto.Quantity.Value;
        if (dto.PurchasePrice.HasValue) asset.AvgCostBasis = dto.PurchasePrice.Value;

        await db.SaveChangesAsync();

        var priceMap = await GetPriceMapAsync([asset]);
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

    // Fiyatlar (Market, Symbol) kimliğiyle istenir ve eşlenir: LINK · BIST ve LINK · US ayrı fiyatlanır.
    private async Task<Dictionary<string, MarketPriceResponse>> GetPriceMapAsync(IEnumerable<Asset> assets)
    {
        // Hisse "BIST:THYAO", altın/döviz "XAU". Market'i henüz boş hisse (eski kayıt) market-service'te atlanır → fiyatsız.
        var list = assets.Select(a => a.Market.Length > 0 ? $"{a.Market}:{a.Symbol}" : a.Symbol).Distinct().ToList();
        if (list.Count == 0) return new();
        try
        {
            var prices = await marketClient.GetPricesAsync(list);
            return prices.ToDictionary(p => PriceKey(p.Market, p.Symbol), p => p);
        }
        catch
        {
            // Market servisi düşükse fiyatsız devam et; holding'ler PriceAvailable=false döner
            return new();
        }
    }

    private static string PriceKey(string market, string symbol) => $"{market}:{symbol}";

    // İşlem tarihindeki 1 USD'nin TL karşılığı. Alınamazsa null; işlem engellenmez, sonradan doldurulabilir.
    private async Task<decimal?> GetUsdTryRateAsync(DateTime date)
    {
        var day = DateOnly.FromDateTime(date).ToString("yyyy-MM-dd");
        try
        {
            var rate = await marketClient.GetPriceOnAsync(string.Empty, "USD", "Currency", day);
            if (rate.Available) return rate.PriceInTry;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "İşlem kuru alınamadı {Date}", day);
            return null;
        }
        logger.LogWarning("İşlem kuru alınamadı {Date}", day);
        return null;
    }

    private static AssetHoldingDto MapToHolding(Asset a, Dictionary<string, MarketPriceResponse> priceMap)
    {
        var price = priceMap.GetValueOrDefault(PriceKey(a.Market, a.Symbol));
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
            Market = a.Market,
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
