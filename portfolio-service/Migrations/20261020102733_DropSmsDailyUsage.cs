using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace portfolio_service.Migrations
{
    /// <inheritdoc />
    public partial class DropSmsDailyUsage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SmsDailyUsage");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SmsDailyUsage",
                columns: table => new
                {
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmsDailyUsage", x => x.Date);
                });
        }
    }
}
