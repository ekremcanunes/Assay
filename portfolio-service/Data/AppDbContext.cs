using Microsoft.EntityFrameworkCore;
using portfolio_service.Models;

namespace portfolio_service.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<WatchlistItem> WatchlistItems => Set<WatchlistItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Asset>(entity =>
        {
            entity.Property(a => a.Quantity).HasPrecision(18, 8);
            entity.Property(a => a.AvgCostBasis).HasPrecision(18, 8);
            entity.Property(a => a.AssetType).HasConversion<string>();
            entity.HasIndex(a => a.UserId);
            entity.Property(a => a.Market).HasDefaultValue(string.Empty);
            entity.HasIndex(a => new { a.UserId, a.Symbol, a.Market }).IsUnique();
            entity.HasMany(a => a.Transactions)
                .WithOne(t => t.Asset)
                .HasForeignKey(t => t.AssetId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Quantity).HasPrecision(18, 8);
            entity.Property(t => t.UnitPrice).HasPrecision(18, 8);
            entity.Property(t => t.RealizedProfitLoss).HasPrecision(18, 2);
            entity.Property(t => t.Type).HasConversion<string>();
            entity.Property(t => t.Market).HasDefaultValue(string.Empty);
            entity.Property(t => t.UsdTryRate).HasPrecision(18, 8);
            entity.Property(t => t.PriceSource).HasConversion<string>();
            entity.HasIndex(t => t.UserId);
            entity.HasIndex(t => t.Date);
            entity.HasIndex(t => t.Type);
        });

        modelBuilder.Entity<WatchlistItem>(entity =>
        {
            entity.Property(w => w.AssetType).HasConversion<string>();
            entity.Property(w => w.Market).HasDefaultValue(string.Empty);
            entity.Property(w => w.PriceAtAdd).HasPrecision(18, 8);
            entity.HasIndex(w => new { w.UserId, w.Market, w.Symbol }).IsUnique();
        });
    }
}
