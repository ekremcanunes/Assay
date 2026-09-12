namespace market_service.Models;

// Tek bir günün fiyatı. PriceHistory bir SERİ döndürür, bu TEK GÜN döndürür.
public class PriceOnDate
{
    public string Symbol { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;

    public DateOnly RequestedDate { get; set; }

    // Gerçekte kullanılan işlem günü. İstenen gün tatilse önceki iş gününe düşülür;
    // frontend "14 Mart istedin, 13 Mart kapanışı alındı" mesajını bu ikisinden kurar.
    public DateOnly? EffectiveDate { get; set; }

    public bool Available { get; set; }

    // "close" = kapanış, "live" = bugün seçildi, kapanış henüz yok
    public string PriceKind { get; set; } = "close";

    public decimal? PriceInNative { get; set; }
    public decimal? PriceInUsd { get; set; }
    public decimal? PriceInTry { get; set; }
    public string NativeCurrency { get; set; } = string.Empty;
}
