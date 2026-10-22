using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace portfolio_service.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_UserId_Symbol",
                table: "Assets");

            migrationBuilder.AddColumn<string>(
                name: "Market",
                table: "Transactions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PriceSource",
                table: "Transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UsdTryRate",
                table: "Transactions",
                type: "numeric(18,8)",
                precision: 18,
                scale: 8,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Market",
                table: "Assets",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_UserId_Symbol_Market",
                table: "Assets",
                columns: new[] { "UserId", "Symbol", "Market" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_UserId_Symbol_Market",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Market",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "PriceSource",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UsdTryRate",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Market",
                table: "Assets");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_UserId_Symbol",
                table: "Assets",
                columns: new[] { "UserId", "Symbol" },
                unique: true);
        }
    }
}
