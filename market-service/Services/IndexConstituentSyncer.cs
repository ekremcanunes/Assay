using System.Globalization;
using market_service.Clients;
using market_service.Common;
using market_service.Data;
using market_service.Models;
using Microsoft.EntityFrameworkCore;

namespace market_service.Services;

// Endeks bileşen dosyasını okuyup BIST 30 ve BIST 100 üyeliğini tabloya yazar
// (bkz. docs/superpowers/specs/2026-11-16-bist30-resmi-liste-design.md).
// Zamanlamayı bilmez; IndexConstituentSyncJob çağırır.
public class IndexConstituentSyncer(IBorsaIstanbulClient client, MarketDbContext db, IndexMembership membership,
    InstrumentCatalog catalog, ILogger<IndexConstituentSyncer> logger)
{
    // Tutulan endeksler ve beklenen bileşen sayısı. Sayı tutmazsa dosya eksik/bozuk sayılır, tablo değişmez.
    private static readonly Dictionary<string, int> ExpectedCounts = new(StringComparer.Ordinal)
    {
        [IndexConstituent.Bist30] = 30,
        [IndexConstituent.Bist100] = 100,
    };

    // Haftalık senkronda bir çalışma kaçsa bile bu süre aşılmaz; aşılırsa kaynak okunamıyor
    // ya da Borsa İstanbul dosyayı güncellemiyor demektir.
    private const int StaleAfterDays = 10;

    public async Task SyncAsync(CancellationToken ct)
    {
        var csv = await client.GetConstituentsCsvAsync(ct);
        var rows = csv is null ? null : Parse(csv);
        if (rows is not null)
            await ReplaceAsync(rows, ct);

        if (membership.AsOf is not { } asOf || asOf.AddDays(StaleAfterDays) < MarketClock.Today)
            logger.LogError("Index constituents are stale: list as of {AsOf}, older than {Days} days; check BorsaIstanbul:ConstituentsSource",
                membership.AsOf, StaleAfterDays);
    }

    // Dosya: ";" ayraçlı, ilk iki satır başlık (TR + EN). Sütunlar:
    // BILESEN KODU;BULTEN_ADI;ENDEKS KODU;ENDEKS ADI;ENDEKS INGILIZCE ADI;TARIH(GG/AA/YYYY)
    // Örnek: AKBNK.E;AKBANK;XU030;BIST 30;BIST 30;16/11/2026
    private List<IndexConstituent>? Parse(string csv)
    {
        var rows = new List<IndexConstituent>();
        foreach (var line in csv.Split('\n'))
        {
            var fields = line.TrimEnd('\r').Split(';');
            // Başlık satırları ve tutulmayan endeksler burada elenir.
            if (fields.Length < 6 || !ExpectedCounts.ContainsKey(fields[2].Trim())) continue;

            if (!DateOnly.TryParseExact(fields[5].Trim(), "dd/MM/yyyy", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var asOf))
            {
                logger.LogWarning("Index constituent file rejected: unreadable date {Value}; table unchanged", fields[5]);
                return null;
            }

            var symbol = fields[0].Trim();
            if (symbol.EndsWith(".E", StringComparison.Ordinal)) symbol = symbol[..^2];
            rows.Add(new IndexConstituent { IndexCode = fields[2].Trim(), Symbol = symbol, AsOf = asOf });
        }

        rows = rows.DistinctBy(r => (r.IndexCode, r.Symbol)).ToList();
        foreach (var (code, expected) in ExpectedCounts)
        {
            var count = rows.Count(r => r.IndexCode == code);
            if (count != expected)
            {
                logger.LogWarning("Index constituent file rejected: {Index} has {Count} constituents, expected {Expected}; table unchanged",
                    code, count, expected);
                return null;
            }
        }
        return rows;
    }

    private async Task ReplaceAsync(List<IndexConstituent> rows, CancellationToken ct)
    {
        var codes = ExpectedCounts.Keys.ToList();
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            await db.IndexConstituents.Where(c => codes.Contains(c.IndexCode)).ExecuteDeleteAsync(ct);
            db.IndexConstituents.AddRange(rows);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        await membership.ReloadAsync(db, ct);

        // Üyeliğin otoritesi Borsa İstanbul: katalogda olmayan sembol de yazılır, yalnızca haber verilir.
        // Fiyat Yahoo'dan sembolle gelir; ad bulunamazsa ekranda sembol görünür.
        var missing = rows.Where(r => catalog.Find("BIST", r.Symbol) is null)
            .Select(r => r.Symbol).Distinct().Order(StringComparer.Ordinal).ToList();
        if (missing.Count > 0)
            logger.LogWarning("Index constituents not in the active instrument catalog (symbol may have changed): {Symbols}",
                string.Join(",", missing));

        logger.LogInformation("Index constituents updated: {Counts}, as of {AsOf}",
            string.Join(", ", ExpectedCounts.Keys.Select(c => $"{c} {membership.Symbols(c).Count}")), membership.AsOf);
    }
}
