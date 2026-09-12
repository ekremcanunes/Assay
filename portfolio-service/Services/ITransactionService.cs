using portfolio_service.DTOs;

namespace portfolio_service.Services;

public interface ITransactionService
{
    Task<PagedResultDto<TransactionDto>> GetAllAsync(TransactionFilterDto filter, string userId);
    Task<TransactionDto?> GetByIdAsync(Guid id, string userId);
    Task<bool> DeleteAsync(Guid id, string userId);
}
