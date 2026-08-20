using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoLeap.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileSubscriptionReplayIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            NullDuplicateReceiptIdentifiers(migrationBuilder, "TransactionId");
            NullDuplicateReceiptIdentifiers(migrationBuilder, "OriginalTransactionId");
            NullDuplicateReceiptIdentifiers(migrationBuilder, "PurchaseToken");

            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "IX_MobileSubscriptions_TransactionId"
                ON "MobileSubscriptions" ("TransactionId")
                WHERE "TransactionId" IS NOT NULL;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "IX_MobileSubscriptions_OriginalTransactionId"
                ON "MobileSubscriptions" ("OriginalTransactionId")
                WHERE "OriginalTransactionId" IS NOT NULL;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "IX_MobileSubscriptions_PurchaseToken"
                ON "MobileSubscriptions" ("PurchaseToken")
                WHERE "PurchaseToken" IS NOT NULL;
                """,
                suppressTransaction: true);
        }

        private static void NullDuplicateReceiptIdentifiers(MigrationBuilder migrationBuilder, string columnName)
        {
            migrationBuilder.Sql(
                $$"""
                WITH ranked AS (
                    SELECT
                        "Id",
                        ROW_NUMBER() OVER (
                            PARTITION BY "{{columnName}}"
                            ORDER BY
                                CASE WHEN "Status" = 'active' THEN 0 ELSE 1 END,
                                COALESCE("LastVerified", "UpdatedAt", "CreatedAt") DESC,
                                "Id" DESC
                        ) AS duplicate_rank
                    FROM "MobileSubscriptions"
                    WHERE "{{columnName}}" IS NOT NULL
                )
                UPDATE "MobileSubscriptions" subscription
                SET "{{columnName}}" = NULL,
                    "UpdatedAt" = NOW()
                FROM ranked
                WHERE subscription."Id" = ranked."Id"
                  AND ranked.duplicate_rank > 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """DROP INDEX CONCURRENTLY IF EXISTS "IX_MobileSubscriptions_TransactionId";""",
                suppressTransaction: true);

            migrationBuilder.Sql(
                """DROP INDEX CONCURRENTLY IF EXISTS "IX_MobileSubscriptions_OriginalTransactionId";""",
                suppressTransaction: true);

            migrationBuilder.Sql(
                """DROP INDEX CONCURRENTLY IF EXISTS "IX_MobileSubscriptions_PurchaseToken";""",
                suppressTransaction: true);
        }
    }
}
