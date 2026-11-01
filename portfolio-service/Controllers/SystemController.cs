using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using portfolio_service.Data;

namespace portfolio_service.Controllers;

// Panelin üst durum şeridi: nerede çalışıyoruz ve veritabanı ne kadar hızlı cevap veriyor.
// Değerler gerçek: ortam/bölge/sürüm env'den, DB süresi her istekte ölçülür. Host adı dışarı verilmez.
[ApiController]
[Route("api/system")]
public class SystemController(AppDbContext db, IConfiguration configuration, ILogger<SystemController> logger) : ControllerBase
{
    [HttpGet("status")]
    public async Task<ActionResult<SystemStatusResponse>> Status(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        bool dbOk;
        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT 1", ct);
            dbOk = true;
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException or TimeoutException)
        {
            // Şerit DB'nin düştüğünü göstermek için var: hata cevabı değil, "ok=false" döner (hata loglanır)
            logger.LogWarning(ex, "Status check: database ping failed");
            dbOk = false;
        }
        sw.Stop();

        var version = configuration["APP_VERSION"];
        return Ok(new SystemStatusResponse(
            Environment: configuration["DEPLOY_ENV"] ?? "local",
            Region: string.IsNullOrWhiteSpace(configuration["DEPLOY_REGION"]) ? null : configuration["DEPLOY_REGION"],
            Version: string.IsNullOrWhiteSpace(version) ? "dev" : version[..Math.Min(7, version.Length)],
            DatabaseProvider: ProviderOf(db.Database.GetConnectionString()),
            DatabaseOk: dbOk,
            DatabaseMs: dbOk ? (int)sw.ElapsedMilliseconds : null));
    }

    // Yalnız sağlayıcı adı: Neon host'ları "*.neon.tech" ile biter
    private static string ProviderOf(string? connectionString)
    {
        if (string.IsNullOrEmpty(connectionString)) return "PostgreSQL";
        var host = new NpgsqlConnectionStringBuilder(connectionString).Host ?? string.Empty;
        return host.EndsWith(".neon.tech", StringComparison.OrdinalIgnoreCase) ? "Neon Postgres" : "PostgreSQL";
    }
}

public record SystemStatusResponse(
    string Environment,
    string? Region,
    string Version,
    string DatabaseProvider,
    bool DatabaseOk,
    int? DatabaseMs);
