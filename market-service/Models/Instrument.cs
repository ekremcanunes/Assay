namespace market_service.Models;

// Desteklenen enstrüman listesinin bir satırı. Kimlik (Market, Symbol); kaynağı Twelve Data,
// günlük senkronla güncellenir (bkz. spec §4.3–4.4).
public class Instrument
{
    // BIST veya US
    public string Market { get; set; } = string.Empty;
    // Standart yazım (YahooSymbol.Normalize): BRK.B
    public string Symbol { get; set; } = string.Empty;
    // Gerçek borsa (BIST, NASDAQ, NYSE) — yalnızca gösterim için
    public string Exchange { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    // stock veya etf
    public string Type { get; set; } = string.Empty;
    // Twelve Data türü olduğu gibi: Common Stock, REIT, American Depositary Receipt, Depositary Receipt, ETF
    public string Category { get; set; } = string.Empty;
    // Listeden düşünce false olur; satır silinmez
    public bool IsActive { get; set; }
    // Satırın içeriğinin en son değiştiği an (UTC). Son senkron zamanı değildir (bkz. InstrumentSyncState).
    public DateTime UpdatedAt { get; set; }
}
