using market_service.Clients;
using market_service.Common;
using market_service.Data;
using market_service.Models;
using Microsoft.EntityFrameworkCore;

namespace market_service.Services;

// Enstrüman listesini Twelve Data'dan çekip tabloya yalnızca farkları yazar (spec §4.4 kurallar 1–8).
// Zamanlamayı bilmez; InstrumentSyncJob (ve ileride sync-once komutu) çağırır.
public class InstrumentSyncer(ITwelveDataClient twelveData, MarketDbContext db, InstrumentCatalog catalog,
    ILogger<InstrumentSyncer> logger)
{
    private const double MinRatio = 0.8;
    private const int SkippedSampleSize = 50;

    // Sabit sıra: aynı ABD sembolü iki kaynaktan gelirse ilk kaynağın exchange'i yazılır.
    private static readonly Source[] Sources =
    [
        new("stocks", "BIST", "BIST", "stock"),
        new("stocks", "NASDAQ", "US", "stock"),
        new("stocks", "NYSE", "US", "stock"),
        new("etfs", "NASDAQ", "US", "etf"),
        new("etfs", "NYSE", "US", "etf"),
    ];

    // NASDAQ'ta varant/imtiyazlı/unit sembolleri (ABCDW, ABCDP, ABCDU) biçim filtresinden geçtiği için tür de filtrelenir.
    private static readonly HashSet<string> AcceptedStockTypes = new(StringComparer.Ordinal)
    {
        "Common Stock", "REIT", "American Depositary Receipt", "Depositary Receipt",
    };

    private sealed record Source(string Kind, string Exchange, string Market, string Type)
    {
        public override string ToString() => $"{Exchange} {Type}";
    }

    private sealed record Candidate(Source Source, string Symbol, string Name, string Currency, string Category);

    public async Task SyncAsync(CancellationToken ct)
    {
        var existing = await db.Instruments.ToListAsync(ct);
        var activeBySource = existing.Where(i => i.IsActive)
            .ToLookup(i => (i.Exchange, i.Type));

        // 1–2) Çek, filtrele, kaynak bazında karar ver
        var succeeded = new List<(Source Source, List<Candidate> Items)>();
        var outcomes = new List<string>();
        foreach (var source in Sources)
        {
            var items = Filter(source, await twelveData.GetListingsAsync(source.Kind, source.Exchange, ct));
            var active = activeBySource[(source.Exchange, source.Type)].ToList();

            if (items.Count == 0)
            {
                logger.LogWarning("Instrument sync: source {Source} returned nothing; its rows are left untouched", source.ToString());
                outcomes.Add($"{source}: failed");
                continue;
            }

            if (items.Count < active.Count * MinRatio)
            {
                var incoming = items.Select(i => i.Symbol).ToHashSet(StringComparer.Ordinal);
                var missing = active.Select(i => i.Symbol).Where(s => !incoming.Contains(s))
                    .Order(StringComparer.Ordinal).ToList();
                logger.LogWarning(
                    "Instrument sync: source {Source} skipped, {Incoming} incoming < 80% of {Active} active; " +
                    "{MissingCount} missing today, first {SampleSize}: {MissingSample}",
                    source.ToString(), items.Count, active.Count, missing.Count, SkippedSampleSize,
                    string.Join(",", missing.Take(SkippedSampleSize)));
                outcomes.Add($"{source}: skipped");
                continue;
            }

            succeeded.Add((source, items));
            outcomes.Add($"{source}: ok({items.Count})");
        }

        // Hiçbir kaynak başarılı değilse (Twelve Data kapalı, limit, geçersiz anahtar) senkron tamamlanmış sayılmaz:
        // son senkron zamanı yazılmaz, bir sonraki açılışta ya da planlı zamanda yeniden denenir.
        if (succeeded.Count == 0)
        {
            logger.LogWarning("Instrument sync: no source succeeded; nothing written, will retry. Sources: {Outcomes}",
                string.Join("; ", outcomes));
            return;
        }

        // 3) Başarılı kaynakları (Market, Symbol) anahtarıyla birleştir
        var merged = new Dictionary<(string Market, string Symbol), Candidate>();
        var conflicts = new HashSet<(string Market, string Symbol)>();
        foreach (var item in succeeded.SelectMany(s => s.Items))
        {
            var key = (item.Source.Market, item.Symbol);
            if (conflicts.Contains(key)) continue;
            if (!merged.TryGetValue(key, out var first))
            {
                merged[key] = item;
            }
            else if (first.Source.Type != item.Source.Type)
            {
                // Hisse–ETF çakışması: hangisinin doğru olduğu bilinmiyor, sembol hiç sunulmaz (kural 7)
                merged.Remove(key);
                conflicts.Add(key);
                logger.LogWarning("Instrument sync: {Market}:{Symbol} is listed both as stock and ETF; excluded",
                    key.Market, key.Symbol);
            }
        }

        var okSources = succeeded.Select(s => (s.Source.Exchange, s.Source.Type)).ToHashSet();
        var now = DateTime.UtcNow;

        // 5) Başarılı bir kaynağa ait olup bugün gelmeyen aktif satırlar pasife çekilir.
        // Satırın kaynağı güncellemeden önceki (Exchange, Type) değeridir; bu yüzden upsert'ten önce hesaplanır.
        var deactivate = existing
            .Where(i => i.IsActive && okSources.Contains((i.Exchange, i.Type)) && !merged.ContainsKey((i.Market, i.Symbol)))
            .ToList();

        // 4) Ekle / değişeni güncelle / aynıysa dokunma
        var byKey = existing.ToDictionary(i => (i.Market, i.Symbol));
        int added = 0, updated = 0;
        foreach (var (key, c) in merged)
        {
            if (!byKey.TryGetValue(key, out var row))
            {
                db.Instruments.Add(new Instrument
                {
                    Market = c.Source.Market, Symbol = c.Symbol, Exchange = c.Source.Exchange, Name = c.Name,
                    Currency = c.Currency, Type = c.Source.Type, Category = c.Category, IsActive = true, UpdatedAt = now,
                });
                added++;
                continue;
            }

            // Satır bugün atlanan/başarısız bir kaynağa aitse dokunulmaz (kural 2)
            if (row.IsActive && !okSources.Contains((row.Exchange, row.Type))) continue;

            if (row.Exchange == c.Source.Exchange && row.Name == c.Name && row.Currency == c.Currency
                && row.Type == c.Source.Type && row.Category == c.Category && row.IsActive)
                continue;

            row.Exchange = c.Source.Exchange;
            row.Name = c.Name;
            row.Currency = c.Currency;
            row.Type = c.Source.Type;
            row.Category = c.Category;
            row.IsActive = true;
            row.UpdatedAt = now;
            updated++;
        }

        foreach (var row in deactivate)
        {
            row.IsActive = false;
            row.UpdatedAt = now;
        }

        // Kaybolanlar prod'da görünsün diye Warning (kural 8); kaynak başına tek satır
        foreach (var group in deactivate.GroupBy(i => (i.Exchange, i.Type)))
        {
            logger.LogWarning("Instrument sync: {Count} instruments deactivated from {Exchange} {Type}: {Symbols}",
                group.Count(), group.Key.Exchange, group.Key.Type,
                string.Join(",", group.Select(i => i.Symbol).Order(StringComparer.Ordinal)));
        }

        // 6) Tek kayıt, ardından son senkron zamanı ve bellek
        var state = await db.InstrumentSyncStates.FindAsync([InstrumentSyncState.SingletonId], ct);
        if (state is null)
            db.InstrumentSyncStates.Add(new InstrumentSyncState { LastCompletedAt = now });
        else
            state.LastCompletedAt = now;

        await db.SaveChangesAsync(ct);
        await catalog.ReloadAsync(db, ct);

        logger.LogInformation(
            "Instrument sync completed: {Added} added, {Updated} updated, {Deactivated} deactivated; sources: {Outcomes}",
            added, updated, deactivate.Count, string.Join("; ", outcomes));
    }

    // Kural 1 ve 6: tür filtresi (yalnız /stocks), biçim filtresi, aynı liste içindeki tekrarda ilki kalır.
    private static List<Candidate> Filter(Source source, List<TwelveDataListing> listings)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<Candidate>();
        foreach (var l in listings)
        {
            if (source.Kind == "stocks" && (l.Type is null || !AcceptedStockTypes.Contains(l.Type))) continue;

            var symbol = YahooSymbol.Normalize(l.Symbol);
            if (!YahooSymbol.IsSupportedSymbol(source.Market, symbol)) continue;
            if (!seen.Add(symbol)) continue;

            result.Add(new Candidate(source, symbol, l.Name, l.Currency,
                source.Kind == "stocks" ? l.Type! : "ETF"));
        }
        return result;
    }
}
