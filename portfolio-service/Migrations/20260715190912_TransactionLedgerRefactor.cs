using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace portfolio_service.Migrations
{
    /// <inheritdoc />
    public partial class TransactionLedgerRefactor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) Önce yeni kolonları ekle
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Assets",
                type: "text",
                nullable: false,
                defaultValue: "TRY");

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Assets",
                type: "text",
                nullable: false,
                defaultValue: "");

            // 2) Sahiplik bilgisini Portfolios'tan taşı
            migrationBuilder.Sql("""
                UPDATE "Assets" a SET "UserId" = p."UserId"
                FROM "Portfolios" p WHERE a."PortfolioId" = p."Id";
                """);

            // 3) Aynı (UserId, Symbol) çiftlerini birleştir: miktarları topla, en eski kaydı tut
            migrationBuilder.Sql("""
                UPDATE "Assets" k SET "Quantity" = s.total
                FROM (
                    SELECT "UserId", "Symbol", SUM("Quantity") AS total, MIN("CreatedAt") AS first_created
                    FROM "Assets" GROUP BY "UserId", "Symbol"
                ) s
                WHERE k."UserId" = s."UserId" AND k."Symbol" = s."Symbol" AND k."CreatedAt" = s.first_created;

                DELETE FROM "Assets" a USING "Assets" b
                WHERE a."UserId" = b."UserId" AND a."Symbol" = b."Symbol" AND a."CreatedAt" > b."CreatedAt";
                """);

            // 4) Artık Portfolio katmanını kaldırabiliriz
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Portfolios_PortfolioId",
                table: "Assets");

            migrationBuilder.DropTable(
                name: "Portfolios");

            migrationBuilder.DropIndex(
                name: "IX_Assets_PortfolioId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "PortfolioId",
                table: "Assets");

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Transactions",
                type: "numeric(18,8)",
                precision: 18,
                scale: 8,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RealizedProfitLoss",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Symbol",
                table: "Transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Transactions",
                type: "numeric(18,8)",
                precision: 18,
                scale: 8,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_UserId",
                table: "Assets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_UserId_Symbol",
                table: "Assets",
                columns: new[] { "UserId", "Symbol" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_UserId",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_UserId_Symbol",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "RealizedProfitLoss",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Symbol",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Assets");

            migrationBuilder.AddColumn<Guid>(
                name: "PortfolioId",
                table: "Assets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Portfolios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Portfolios", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assets_PortfolioId",
                table: "Assets",
                column: "PortfolioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Portfolios_PortfolioId",
                table: "Assets",
                column: "PortfolioId",
                principalTable: "Portfolios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
