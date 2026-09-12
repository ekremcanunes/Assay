using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace portfolio_service.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIncomeExpenseAndCrypto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InstallmentCurrent",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "InstallmentMonthlyAmount",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "InstallmentTotal",
                table: "Transactions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InstallmentCurrent",
                table: "Transactions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InstallmentMonthlyAmount",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InstallmentTotal",
                table: "Transactions",
                type: "integer",
                nullable: true);
        }
    }
}
