using market_service.Data;
using market_service.Models;
using Microsoft.EntityFrameworkCore;

namespace market_service.Services;

// Aktif enstrüman listesinin bellekteki kopyası (singleton). Arama ve piyasa özeti buradan okur;
// her istekte veritabanına gidilmez. Açılışta ve her senkrondan sonra ReloadAsync ile yenilenir.
// Tek kopya varsayımı: başka bir kopyanın senkronundan haberi olmaz (bkz. spec §4.4 "Bilinen sınırlama").
public class InstrumentCatalog(ILogger<InstrumentCatalog> logger)
{
    // Liste ve anahtar sözlüğü tek nesnede; yenilemede tek atamayla değişir, arama yarım liste görmez.
    private sealed record Snapshot(IReadOnlyList<Instrument> All, IReadOnlyDictionary<string, Instrument> ByKey);

    private volatile Snapshot _snapshot =
        new([], new Dictionary<string, Instrument>(StringComparer.OrdinalIgnoreCase));

    public IReadOnlyList<Instrument> All => _snapshot.All;

    public Instrument? Find(string market, string symbol) =>
        _snapshot.ByKey.TryGetValue(Key(market, symbol), out var instrument) ? instrument : null;

    public string? FindName(string market, string symbol) => Find(market, symbol)?.Name;

    public async Task ReloadAsync(MarketDbContext db, CancellationToken ct)
    {
        var active = await db.Instruments.AsNoTracking()
            .Where(i => i.IsActive)
            .ToListAsync(ct);

        var byKey = active.ToDictionary(i => Key(i.Market, i.Symbol), StringComparer.OrdinalIgnoreCase);
        _snapshot = new Snapshot(active, byKey);

        logger.LogInformation("Instrument catalog loaded: {Count} active instruments", active.Count);
    }

    private static string Key(string market, string symbol) => $"{market}:{symbol}";
}
