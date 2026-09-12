namespace market_service.Models;

// Tek mum. Time = Unix saniye (lightweight-charts bu formatı bekler).
public class Candle
{
    public long Time { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long? Volume { get; set; }
}

public class PriceHistory
{
    public string Symbol { get; set; } = string.Empty;
    public string Range { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public List<Candle> Candles { get; set; } = [];
}
