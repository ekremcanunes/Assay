using market_service.Data;
using Microsoft.EntityFrameworkCore;

namespace market_service.Services;

// Endeks üyeliğinin bellekteki kopyası (singleton). Piyasa özeti buradan okur; her istekte veritabanına
// gidilmez. Açılışta ve her başarılı senkrondan sonra ReloadAsync ile yenilenir.
// InstrumentCatalog'dan ayrıdır: iki listenin kaynağı ve senkronu farklıdır.
public class IndexMembership(ILogger<IndexMembership> logger)
{
    // Liste ve tarih tek nesnede; yenilemede tek atamayla değişir, okuyan yarım liste görmez.
    private sealed record Snapshot(IReadOnlyDictionary<string, IReadOnlyList<string>> ByIndex, DateOnly? AsOf);

    private volatile Snapshot _snapshot = new(new Dictionary<string, IReadOnlyList<string>>(), null);

    public IReadOnlyList<string> Symbols(string indexCode) =>
        _snapshot.ByIndex.TryGetValue(indexCode, out var symbols) ? symbols : [];

    // Listenin geçerli olduğu gün; tablo boşsa null.
    public DateOnly? AsOf => _snapshot.AsOf;

    public async Task ReloadAsync(MarketDbContext db, CancellationToken ct)
    {
        var rows = await db.IndexConstituents.AsNoTracking().ToListAsync(ct);

        var byIndex = rows.GroupBy(r => r.IndexCode)
            .ToDictionary(g => g.Key,
                g => (IReadOnlyList<string>)g.Select(r => r.Symbol).Order(StringComparer.Ordinal).ToList());
        _snapshot = new Snapshot(byIndex, rows.Count > 0 ? rows.Max(r => r.AsOf) : null);

        logger.LogInformation("Index membership loaded: {Counts}, as of {AsOf}",
            string.Join(", ", byIndex.Select(kv => $"{kv.Key} {kv.Value.Count}")), _snapshot.AsOf);
    }
}
