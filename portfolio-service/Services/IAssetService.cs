using portfolio_service.DTOs;

namespace portfolio_service.Services;

public interface IAssetService
{
    Task<List<AssetHoldingDto>> GetHoldingsAsync(string userId);
    Task<AssetHoldingDto> BuyAsync(BuyAssetDto dto, string userId);
    Task<AssetHoldingDto?> SellAsync(Guid assetId, SellAssetDto dto, string userId);
    Task<AssetHoldingDto?> UpdateAsync(Guid assetId, UpdateAssetDto dto, string userId);
    Task<bool> DeleteAsync(Guid assetId, string userId);
    Task<DashboardDto> GetDashboardAsync(string userId);
}
