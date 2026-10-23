using market_service.Models;
using Microsoft.EntityFrameworkCore;

namespace market_service.Data;

public class MarketDbContext(DbContextOptions<MarketDbContext> options) : DbContext(options)
{
    public DbSet<Instrument> Instruments => Set<Instrument>();
    public DbSet<InstrumentSyncState> InstrumentSyncStates => Set<InstrumentSyncState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Instrument>(entity =>
        {
            entity.HasKey(i => new { i.Market, i.Symbol });
        });

        modelBuilder.Entity<InstrumentSyncState>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).ValueGeneratedNever();
        });
    }
}
