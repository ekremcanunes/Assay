namespace portfolio_service.DTOs;

public class DashboardDto
{
    public decimal TotalValueInTry { get; set; }
    public int AssetCount { get; set; }
    public decimal CashValueInTry { get; set; }
    public decimal StockValueInTry { get; set; }
}
