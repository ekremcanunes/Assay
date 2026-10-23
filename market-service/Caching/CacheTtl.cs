namespace market_service.Caching;

// Veri sınıfına göre tek süre tablosu. Aynı sınıftaki veri hangi sayfada gösterilirse gösterilsin
// aynı tazelikte olur. Frontend süre tutmaz; kalan ömrü X-Cache-Expires-In header'ından okur.
public static class CacheTtl
{
    public static readonly TimeSpan Live = TimeSpan.FromMinutes(5);       // anlık fiyat, endeks, gün içi grafik
    public static readonly TimeSpan Daily = TimeSpan.FromHours(1);        // günlük grafik, sparkline serileri
    public static readonly TimeSpan Permanent = TimeSpan.FromDays(30);    // geçmiş günün kapanışı (bir daha değişmez)
    public static readonly TimeSpan Failure = TimeSpan.FromMinutes(5);    // başarısız cevap: kalıcı değil, geçici durum
}
