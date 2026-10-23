namespace market_service.Caching;

// Redis anahtarlarının tek kaynağı. Kural: önek ve varlık tipi küçük harf; market ve sembol
// standart yazımda (YahooSymbol.Normalize / NormalizeMarket). Altın ve dövizde market boştur, anahtara girmez.
public static class CacheKeys
{
    public static string Price(string assetType, string market, string symbol) =>
        Build(assetType.ToLowerInvariant(), market, symbol);

    public static string History(string assetType, string market, string symbol, string range) =>
        Build("history", assetType.ToLowerInvariant(), market, symbol, range.ToLowerInvariant());

    public static string PriceOn(string assetType, string market, string symbol, DateOnly date) =>
        Build("priceon", assetType.ToLowerInvariant(), market, symbol, date.ToString("yyyy-MM-dd"));

    // Sparkline serisi (endeks, döviz, altın ons). Kaynak sembolüyle anahtarlanır: spark:XU100.IS, spark:USD
    public static string Spark(string sourceSymbol) =>
        Build("spark", sourceSymbol);

    private static string Build(params string[] parts) =>
        string.Join(':', parts.Where(p => p.Length > 0));
}
