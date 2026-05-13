using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplyChainScopeToOperationalData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SupplyChainId",
                table: "Suppliers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplyChainId",
                table: "PurchaseRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplyChainId",
                table: "Products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplyChainId",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "PurchaseRequests" AS r
                SET "SupplyChainId" = COALESCE(
                    (SELECT u."SupplyChainId" FROM "Users" AS u WHERE u."Id" = r."UserId"),
                    (SELECT c."Id" FROM "Chains" AS c ORDER BY c."CreatedAt", c."Id" LIMIT 1)
                )
                WHERE r."SupplyChainId" IS NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE "Orders" AS o
                SET "SupplyChainId" = COALESCE(
                    (SELECT r."SupplyChainId" FROM "PurchaseRequests" AS r WHERE r."RequestId" = o."RequestId"),
                    (SELECT c."Id" FROM "Chains" AS c ORDER BY c."CreatedAt", c."Id" LIMIT 1)
                )
                WHERE o."SupplyChainId" IS NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE "Products" AS p
                SET "SupplyChainId" = (SELECT c."Id" FROM "Chains" AS c ORDER BY c."CreatedAt", c."Id" LIMIT 1)
                WHERE p."SupplyChainId" IS NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE "Suppliers" AS s
                SET "SupplyChainId" = (SELECT c."Id" FROM "Chains" AS c ORDER BY c."CreatedAt", c."Id" LIMIT 1)
                WHERE s."SupplyChainId" IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_SupplyChainId",
                table: "Suppliers",
                column: "SupplyChainId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequests_SupplyChainId",
                table: "PurchaseRequests",
                column: "SupplyChainId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_SupplyChainId",
                table: "Products",
                column: "SupplyChainId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_SupplyChainId",
                table: "Orders",
                column: "SupplyChainId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Chains_SupplyChainId",
                table: "Orders",
                column: "SupplyChainId",
                principalTable: "Chains",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Chains_SupplyChainId",
                table: "Products",
                column: "SupplyChainId",
                principalTable: "Chains",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequests_Chains_SupplyChainId",
                table: "PurchaseRequests",
                column: "SupplyChainId",
                principalTable: "Chains",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Suppliers_Chains_SupplyChainId",
                table: "Suppliers",
                column: "SupplyChainId",
                principalTable: "Chains",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Chains_SupplyChainId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_Chains_SupplyChainId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequests_Chains_SupplyChainId",
                table: "PurchaseRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_Suppliers_Chains_SupplyChainId",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_Suppliers_SupplyChainId",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequests_SupplyChainId",
                table: "PurchaseRequests");

            migrationBuilder.DropIndex(
                name: "IX_Products_SupplyChainId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Orders_SupplyChainId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SupplyChainId",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "SupplyChainId",
                table: "PurchaseRequests");

            migrationBuilder.DropColumn(
                name: "SupplyChainId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SupplyChainId",
                table: "Orders");
        }
    }
}
