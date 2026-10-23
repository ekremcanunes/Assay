using System.Globalization;
using System.Text;
using market_service.Common;
using market_service.Models;

namespace market_service.Services;

// Arama bellekteki enstrüman listesinde yapılır (spec §4.5); Twelve Data'ya ve veritabanına gidilmez.
public class SymbolSearchService(InstrumentCatalog catalog) : ISymbolSearchService
{
    private const int MaxResults = 15;

    // Twelve Data'nın İngilizce isimle döndürdüğü BIST hisseleri için Türkçe arama takma adı
    private static readonly Dictionary<string, string> TurkishAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["THYAO"] = "Türk Hava Yolları",
    };

    public Task<List<SymbolSearchResult>> SearchAsync(string query)
    {
        // Sembol standart yazımla karşılaştırılır (brk-b → BRK.B); isim ve takma ad diakritik-duyarsız.
        var symbolQuery = YahooSymbol.Normalize(query);
        var textQuery = Normalize(query);

        // Sıra: 0 = sembol tam eşit, 1 = sembol sorguyla başlıyor, 2 = isim veya takma ad sorguyu içeriyor.
        // Grup içinde hisse ETF'ten önce, kısa sembol önce: "apple" → Apple Inc. kaldıraçlı ETF'lerden önce gelir.
        var results = catalog.All
            .Select(i => (Instrument: i, Rank: Rank(i, symbolQuery, textQuery)))
            .Where(x => x.Rank >= 0)
            .OrderBy(x => x.Rank)
            .ThenBy(x => x.Instrument.Type == "stock" ? 0 : 1)
            .ThenBy(x => x.Instrument.Symbol.Length)
            .ThenBy(x => x.Instrument.Symbol, StringComparer.Ordinal)
            .Take(MaxResults)
            .Select(x => new SymbolSearchResult
            {
                Symbol = x.Instrument.Symbol,
                Market = x.Instrument.Market,
                Name = x.Instrument.Name,
                Exchange = x.Instrument.Exchange,
                Currency = x.Instrument.Currency,
            })
            .ToList();

        return Task.FromResult(results);
    }

    private static int Rank(Instrument i, string symbolQuery, string textQuery)
    {
        if (i.Symbol == symbolQuery) return 0;
        if (i.Symbol.StartsWith(symbolQuery, StringComparison.Ordinal)) return 1;
        if (Normalize(i.Name).Contains(textQuery)) return 2;
        if (TurkishAliases.TryGetValue(i.Symbol, out var alias) && Normalize(alias).Contains(textQuery)) return 2;
        return -1;
    }

    // Diakritik-duyarsız normalize: NFD ile ayrıştır, birleşik işaretleri at, küçük harfe çevir.
    // "Türk Hava" == "turk hava", "Koç" == "koc", "Şişe" == "sise" olur.
    private static string Normalize(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        var decomposed = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                continue;
            // Türkçe noktasız ı ve İ'nin ayrıştırmasından gelen I → i
            sb.Append(ch is 'ı' or 'I' ? 'i' : char.ToLowerInvariant(ch));
        }
        return sb.ToString();
    }
}
