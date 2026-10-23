namespace market_service.Models;

// Tek satırlık kayıt: son tamamlanan senkronun zamanı. Açılışta "planlı çalışma kaçırıldı mı?"
// kararı buna göre verilir. Instrument.UpdatedAt bu iş için kullanılamaz: değişiklik olmayan
// günlerde ilerlemez.
public class InstrumentSyncState
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;
    public DateTime LastCompletedAt { get; set; }
}
