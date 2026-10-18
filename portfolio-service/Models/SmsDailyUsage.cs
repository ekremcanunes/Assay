namespace portfolio_service.Models;

// Günlük SMS sayacı — relay'in bütçe tavanı için (bkz. spec §7).
public class SmsDailyUsage
{
    public DateOnly Date { get; set; }
    public int Count { get; set; }
}
