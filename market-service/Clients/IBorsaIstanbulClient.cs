namespace market_service.Clients;

public interface IBorsaIstanbulClient
{
    // Endeks bileşen dosyasının (hisse_endeks_ds.csv) metni. Kaynak ayarı http ile başlıyorsa indirilir,
    // değilse diskten okunur (lokal geliştirme). Okunamazsa null döner; hata loglanmıştır.
    Task<string?> GetConstituentsCsvAsync(CancellationToken ct);
}
