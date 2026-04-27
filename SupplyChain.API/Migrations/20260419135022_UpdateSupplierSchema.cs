using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SupplyChain.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSupplierSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    SupplierId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierName = table.Column<string>(type: "text", nullable: false),
                    SupplierCategory = table.Column<string>(type: "text", nullable: false),
                    SupplierRating = table.Column<string>(type: "text", nullable: false),
                    SupplierSupplies = table.Column<string>(type: "text", nullable: false),
                    SupplierAvrLatency = table.Column<double>(type: "double precision", nullable: false),
                    SupplierStatus = table.Column<string>(type: "text", nullable: false),
                    SupplierContactPerson = table.Column<string>(type: "text", nullable: false),
                    SupplierContactEmail = table.Column<string>(type: "text", nullable: false),
                    SupplierContactPhone = table.Column<string>(type: "text", nullable: false),
                    SupplierAddress = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.SupplierId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Suppliers");
        }
    }
}
