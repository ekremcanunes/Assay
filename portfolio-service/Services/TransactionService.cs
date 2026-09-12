using Microsoft.EntityFrameworkCore;
using portfolio_service.Data;
using portfolio_service.DTOs;
using portfolio_service.Models;

namespace portfolio_service.Services;

public class TransactionService(AppDbContext db) : ITransactionService
{
    public async Task<PagedResultDto<TransactionDto>> GetAllAsync(TransactionFilterDto filter, string userId)
    {
        var query = db.Transactions.Where(t => t.UserId == userId).AsQueryable();

        if (filter.Type.HasValue)
            query = query.Where(t => t.Type == filter.Type.Value);
        if (!string.IsNullOrWhiteSpace(filter.Symbol))
            query = query.Where(t => t.Symbol == filter.Symbol);
        if (!string.IsNullOrWhiteSpace(filter.Category))
            query = query.Where(t => t.Category == filter.Category);
        if (!string.IsNullOrWhiteSpace(filter.Tag))
            query = query.Where(t => t.Tags.Contains(filter.Tag));
        if (filter.From.HasValue)
            query = query.Where(t => t.Date >= filter.From.Value);
        if (filter.To.HasValue)
            query = query.Where(t => t.Date <= filter.To.Value);
        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(t =>
                (t.Description != null && t.Description.Contains(filter.Search)) ||
                t.Category.Contains(filter.Search));

        var total = await query.CountAsync();

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => MapToDto(t))
            .ToListAsync();

        return new PagedResultDto<TransactionDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<TransactionDto?> GetByIdAsync(Guid id, string userId)
    {
        var t = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        return t is null ? null : MapToDto(t);
    }

    public async Task<bool> DeleteAsync(Guid id, string userId)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (transaction is null) return false;

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync();
        return true;
    }

    private static TransactionDto MapToDto(Transaction t) => new()
    {
        Id = t.Id,
        Type = t.Type,
        Amount = t.Amount,
        Currency = t.Currency,
        Category = t.Category,
        Tags = t.Tags,
        Description = t.Description,
        Date = t.Date,
        Symbol = t.Symbol,
        Quantity = t.Quantity,
        UnitPrice = t.UnitPrice,
        RealizedProfitLoss = t.RealizedProfitLoss,
        AssetId = t.AssetId,
        CreatedAt = t.CreatedAt
    };
}
