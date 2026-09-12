using portfolio_service.Models;

namespace portfolio_service.DTOs;

public class TransactionFilterDto
{
    public TransactionType? Type { get; set; }
    public string? Symbol { get; set; }
    public string? Category { get; set; }
    public string? Tag { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
