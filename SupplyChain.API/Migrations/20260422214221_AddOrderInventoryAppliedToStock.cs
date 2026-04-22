using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderInventoryAppliedToStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "InventoryAppliedToStock",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("""
                UPDATE "Orders"
                SET "InventoryAppliedToStock" = TRUE
                WHERE "Status" = 'Delivered';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InventoryAppliedToStock",
                table: "Orders");
        }
    }
}
