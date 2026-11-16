using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace market_service.Migrations
{
    /// <inheritdoc />
    public partial class AddIndexConstituents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IndexConstituents",
                columns: table => new
                {
                    IndexCode = table.Column<string>(type: "text", nullable: false),
                    Symbol = table.Column<string>(type: "text", nullable: false),
                    AsOf = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IndexConstituents", x => new { x.IndexCode, x.Symbol });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IndexConstituents");
        }
    }
}
