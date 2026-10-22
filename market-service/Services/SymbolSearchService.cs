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

    // Global aramadan yalnızca ABD borsaları kabul edilir; BIST'in tek kaynağı BIST listesidir.
    private static readonly HashSet<string> UsExchanges = new(StringComparer.OrdinalIgnoreCase) { "NASDAQ", "NYSE" };
    private static readonly HashSet<string> SupportedTypes = new(StringComparer.OrdinalIgnoreCase) { "Common Stock", "ETF" };

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

        // Tekrar eleme kimliğe göre: LINK · BIST ve LINK · US iki ayrı sonuçtur.
        var merged = new List<SymbolSearchResult>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void TryAdd(SymbolSearchResult r)
        {
            if (merged.Count < MaxResults && seen.Add($"{r.Market}:{r.Symbol}")) merged.Add(r);
        }

        // BIST: sembol, isim veya Türkçe takma ad üzerinde diakritik-duyarsız eşleşme
        foreach (var s in bist.Where(s => YahooSymbol.IsSupportedSymbol("BIST", s.Symbol)
                    && (Normalize(s.Symbol).Contains(q)
                        || Normalize(s.Name).Contains(q)
                        || (TurkishAliases.TryGetValue(s.Symbol, out var alias) && Normalize(alias).Contains(q)))))
            TryAdd(s);

        // Global arama: yalnızca NASDAQ/NYSE, normal hisse veya ETF, desteklenen sembol biçimi → US
        foreach (var g in await _twelveDataClient.SearchSymbolsAsync(query))
        {
            if (!UsExchanges.Contains(g.Exchange)) continue;
            if (!SupportedTypes.Contains(g.InstrumentType)) continue;
            if (!YahooSymbol.IsSupportedSymbol("US", g.Symbol)) continue;

            g.Symbol = YahooSymbol.Normalize(g.Symbol);
            g.Market = "US";
            TryAdd(g);
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
