using Cronos;
using market_service.Common;

namespace market_service.Services;

// Endeks bileşen senkronunu zamanlar: cron (BorsaIstanbul:Cron, Türkiye saati) geldiğinde, ve açılışta
// tablo boşsa ya da liste bir haftadan eskiyse (planlı çalışma kaçırılmış) IndexConstituentSyncer'ı çağırır.
// Twelve Data senkronundan (InstrumentSyncJob) bağımsızdır: ayrı zamanlama, ayrı hata.
public class IndexConstituentSyncJob(IServiceScopeFactory scopeFactory, IConfiguration configuration,
    IndexMembership membership, ILogger<IndexConstituentSyncJob> logger) : BackgroundService
{
    private static readonly TimeSpan MaxDelayStep = TimeSpan.FromDays(1);
    private const int StartupRunAfterDays = 7;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Servis çalışmaya devam eder; piyasa özeti tablodaki son listeyle sürer, yalnızca liste güncellenmez.
        if (string.IsNullOrWhiteSpace(configuration["BorsaIstanbul:ConstituentsSource"]))
        {
            logger.LogError("Index constituent sync disabled: BorsaIstanbul:ConstituentsSource is empty");
            return;
        }

        CronExpression cron;
        try
        {
            cron = CronExpression.Parse(configuration["BorsaIstanbul:Cron"] ?? string.Empty);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Index constituent sync disabled: invalid BorsaIstanbul:Cron value");
            return;
        }

        if (membership.AsOf is not { } asOf || asOf.AddDays(StartupRunAfterDays) < MarketClock.Today)
            await RunSyncAsync(stoppingToken);
        else
            logger.LogInformation("Index constituent sync on startup skipped: list as of {AsOf}", asOf);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var next = cron.GetNextOccurrence(now, MarketClock.Istanbul);
            if (next is null) return;

            try
            {
                // Task.Delay ~49 günden uzun süreyi kabul etmez; uzun cron aralıklarında host çökmesin diye parça parça beklenir.
                for (var remaining = next.Value - now; remaining > TimeSpan.Zero; remaining = next.Value - DateTime.UtcNow)
                    await Task.Delay(remaining < MaxDelayStep ? remaining : MaxDelayStep, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            await RunSyncAsync(stoppingToken);
        }
    }

    private async Task RunSyncAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            await scope.ServiceProvider.GetRequiredService<IndexConstituentSyncer>().SyncAsync(ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // BackgroundService'te yakalanmayan istisna host'u durdurur; senkron hatası servisi düşürmemeli.
            // Tablo değişmedi; bir sonraki planlı zamanda yeniden denenir.
            logger.LogError(ex, "Index constituent sync failed");
        }
    }
}
