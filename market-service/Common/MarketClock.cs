namespace market_service.Common;

// Piyasanın "bugün"ü — BIST İstanbul'da işlem görür, İstanbul UTC+3'te sabit
// (Türkiye 2016'dan beri yaz saati uygulamıyor). Sunucu UTC çalışır; "bugün"ü
// UTC'den hesaplayan her yer bu sabiti kullanmalı ki gece 00:00-03:00 arası
// iki tanım birbirinden kaymasın (bkz. final-review.md #1).
public static class MarketClock
{
    private static readonly TimeSpan IstanbulOffset = TimeSpan.FromHours(3);

    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow.Add(IstanbulOffset));

    // Zamanlanmış işler (cron) için aynı sabit ofset; container'daki tz veritabanına bağlı kalmaz.
    public static readonly TimeZoneInfo Istanbul =
        TimeZoneInfo.CreateCustomTimeZone("Istanbul+03", IstanbulOffset, "Istanbul", "Istanbul");
}
