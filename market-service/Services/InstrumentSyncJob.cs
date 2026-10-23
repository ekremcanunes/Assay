using Cronos;
using market_service.Common;
using market_service.Data;
using market_service.Models;
using Microsoft.EntityFrameworkCore;

namespace market_service.Services;

// Senkronu zamanlar: cron (InstrumentSync:Cron, Türkiye saati) geldiğinde ve açılışta yalnızca
// bir planlı çalışma kaçırıldıysa InstrumentSyncer'ı çağırır. İşin kendisi InstrumentSyncer'dadır.
public class InstrumentSyncJob(IServiceScopeFactory scopeFactory, IConfiguration configuration,
    ILogger<InstrumentSyncJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        CronExpression cron;
        try
        {
            cron = CronExpression.Parse(configuration["InstrumentSync:Cron"] ?? string.Empty);
        }
        catch (Exception ex)
        {
            // Servis çalışmaya devam eder; arama mevcut listeyle sürer, yalnızca liste güncellenmez.
            logger.LogError(ex, "Instrument sync disabled: invalid InstrumentSync:Cron value");
            return;
        }

        if (await MissedRunAsync(cron, stoppingToken))
            await RunSyncAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var next = cron.GetNextOccurrence(now, MarketClock.Istanbul);
            if (next is null) return;

            try
            {
                await Task.Delay(next.Value - now, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            await RunSyncAsync(stoppingToken);
        }
    }

    // Tablo boşsa, hiç senkron yapılmadıysa ya da son senkrondan sonraki planlı zaman geçtiyse true.
    private async Task<bool> MissedRunAsync(CronExpression cron, CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MarketDbContext>();

            var state = await db.InstrumentSyncStates.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == InstrumentSyncState.SingletonId, ct);
            if (state is null || !await db.Instruments.AnyAsync(ct)) return true;

            var due = cron.GetNextOccurrence(state.LastCompletedAt, MarketClock.Istanbul);
            if (due <= DateTime.UtcNow) return true;

            logger.LogInformation("Instrument sync on startup skipped: last completed {LastCompletedAt:o}, next {Next:o}",
                state.LastCompletedAt, due);
            return false;
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // Karar verilemiyorsa çalıştır: senkron kurallar gereği yanlış veri yazmaz, en kötü 5 kredi harcar.
            logger.LogError(ex, "Instrument sync startup check failed; running sync");
            return true;
        }
    }

    private async Task RunSyncAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            await scope.ServiceProvider.GetRequiredService<InstrumentSyncer>().SyncAsync(ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // BackgroundService'te yakalanmayan istisna host'u durdurur; senkron hatası servisi düşürmemeli.
            // Son senkron zamanı güncellenmedi; bir sonraki planlı zamanda yeniden denenir.
            logger.LogError(ex, "Instrument sync failed");
        }
    }
}
