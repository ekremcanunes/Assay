using System.Text.RegularExpressions;

namespace market_service.Common;

// Hisse kimliği (Market, Symbol) → Yahoo sembolü. Yahoo'ya giden ek/yazım farkları
// yalnızca burada üretilir; başka yerde ".IS" eklenmez, borsa tahmin edilmez.
public static class YahooSymbol
{
    // ToYahoo: standart sembol → Yahoo yazımı. Format: desteklenen sembol biçimi;
    // uymayanlar (imtiyazlı hisse BAC.PR.S, varant AAC.WT, unit AAC.UN) aramaya alınmaz.
    private record MarketRule(Func<string, string> ToYahoo, Regex Format);

    // Yeni borsa = yeni satır. Girdi Normalize edilmiş semboldür.
    private static readonly Dictionary<string, MarketRule> Rules = new(StringComparer.OrdinalIgnoreCase)
    {
        ["BIST"] = new(s => $"{s}.IS", new Regex("^[A-Z0-9]+$")),
        ["US"] = new(s => s.Replace('.', '-'), new Regex(@"^[A-Z0-9]+(\.[A-Z])?$")),   // BRK.B → BRK-B
    };

    // Standart yazım: "brk-b", " BRK.B " ve "BRK-B" → "BRK.B". Cache anahtarı bu yazımdan üretilir.
    public static string Normalize(string symbol) =>
        symbol.Trim().ToUpperInvariant().Replace('-', '.');

    public static string NormalizeMarket(string? market) =>
        (market ?? string.Empty).Trim().ToUpperInvariant();

    public static bool IsSupportedMarket(string? market) =>
        !string.IsNullOrWhiteSpace(market) && Rules.ContainsKey(market.Trim());

    public static bool IsSupportedSymbol(string market, string symbol) =>
        Rules.TryGetValue(market.Trim(), out var rule) && rule.Format.IsMatch(Normalize(symbol));

    // Hisse desteklenen bir market ister; altın ve döviz market almaz (boş olmalı).
    public static bool IsValidMarketFor(string assetType, string market) =>
        assetType.Equals("Stock", StringComparison.OrdinalIgnoreCase)
            ? IsSupportedMarket(market)
            : market.Length == 0;

    // Bilinmeyen market için tahmin yapılmaz, hata fırlatılır (controller kontrolü atlanmışsa son emniyet).
    public static string ToYahoo(string market, string symbol)
    {
        if (!Rules.TryGetValue(market.Trim(), out var rule))
            throw new ArgumentException($"Unsupported market: {market}", nameof(market));

        return rule.ToYahoo(Normalize(symbol));
    }
}
