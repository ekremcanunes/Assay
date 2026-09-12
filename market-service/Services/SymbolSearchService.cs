using System.Globalization;
using System.Text;
using market_service.Models;

namespace market_service.Services;

public interface ISymbolSearchService
{
    Task<List<SymbolSearchResult>> SearchAsync(string query);
}

public class SymbolSearchService : ISymbolSearchService
{
    private const int MaxResults = 15;

    // Twelve Data'nın İngilizce isimle döndürdüğü BIST hisseleri için Türkçe arama takma adı
    private static readonly Dictionary<string, string> TurkishAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["THYAO"] = "Türk Hava Yolları",
    };

    private readonly ITwelveDataClient _twelveDataClient;
    private readonly IBistCatalog _bistCatalog;

    public SymbolSearchService(ITwelveDataClient twelveDataClient, IBistCatalog bistCatalog)
    {
        _twelveDataClient = twelveDataClient;
        _bistCatalog = bistCatalog;
    }

    public async Task<List<SymbolSearchResult>> SearchAsync(string query)
    {
        var q = Normalize(query);
        var bist = await _bistCatalog.GetAllAsync();

        // BIST: sembol, isim veya Türkçe takma ad üzerinde diakritik-duyarsız eşleşme
        var merged = bist
            .Where(s => Normalize(s.Symbol).Contains(q)
                        || Normalize(s.Name).Contains(q)
                        || (TurkishAliases.TryGetValue(s.Symbol, out var alias) && Normalize(alias).Contains(q)))
            .Take(MaxResults)
            .ToList();

        // Global arama (US/diğer borsalar) — BIST'te olmayan sonuçları tekrarsız ekle
        var seen = new HashSet<string>(merged.Select(m => m.Symbol), StringComparer.OrdinalIgnoreCase);
        foreach (var g in await _twelveDataClient.SearchSymbolsAsync(query))
        {
            if (merged.Count >= MaxResults) break;
            if (seen.Add(g.Symbol)) merged.Add(g);
        }

        return merged;
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
