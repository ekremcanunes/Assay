using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace market_service.Migrations
{
    /// <inheritdoc />
    public partial class AddInstrumentConflict : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsConflict",
                table: "Instruments",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsConflict",
                table: "Instruments");
        }
    }
}
