using Microsoft.EntityFrameworkCore;
using portfolio_service.Data;

namespace portfolio_service.Services;

public class SmsUsageCounter(AppDbContext db)
{
    // Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok); tzdata bağımlılığına gerek yok.
    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));

    // Tek SQL ile artırıp yeni değeri döner: eşzamanlı iki istek tavanı delemez.
    // ToListAsync: SingleAsync sorguyu alt sorguya sarar, INSERT ... RETURNING alt sorguda çalışmaz.
    public async Task<int> IncrementAsync(CancellationToken ct)
    {
        var rows = await db.Database.SqlQuery<int>($"""
            INSERT INTO "SmsDailyUsage" ("Date", "Count") VALUES ({Today()}, 1)
            ON CONFLICT ("Date") DO UPDATE SET "Count" = "SmsDailyUsage"."Count" + 1
            RETURNING "Count" AS "Value"
            """).ToListAsync(ct);
        return rows.Single();
    }

    public Task DecrementAsync(CancellationToken ct) =>
        db.Database.ExecuteSqlAsync(
            $"""UPDATE "SmsDailyUsage" SET "Count" = "Count" - 1 WHERE "Date" = {Today()}""", ct);
}
