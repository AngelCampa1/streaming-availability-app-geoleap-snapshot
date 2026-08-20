using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoLeap.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAffiliatePartnerSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TrialPeriodDays",
                table: "SubscriptionPlans",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AffiliatePartners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LogoUrl = table.Column<string>(type: "text", nullable: true),
                    AffiliateUrlTemplate = table.Column<string>(type: "text", nullable: false),
                    TemplateParameters = table.Column<string>(type: "text", nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CommissionRate = table.Column<decimal>(type: "numeric", nullable: true),
                    CommissionType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FlatCommission = table.Column<decimal>(type: "numeric", nullable: true),
                    TargetCountries = table.Column<string>(type: "text", nullable: true),
                    TargetStreamingServices = table.Column<string>(type: "text", nullable: true),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AffiliatePartners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AffiliateClicks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AffiliatePartnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AnonymousId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CountryCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    StreamingService = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Platform = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    GeneratedUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AffiliateClicks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AffiliateClicks_AffiliatePartners_AffiliatePartnerId",
                        column: x => x.AffiliatePartnerId,
                        principalTable: "AffiliatePartners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AffiliateConversions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AffiliatePartnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AffiliateClickId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExternalConversionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Revenue = table.Column<decimal>(type: "numeric", nullable: false),
                    Commission = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ConvertedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AffiliateConversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AffiliateConversions_AffiliateClicks_AffiliateClickId",
                        column: x => x.AffiliateClickId,
                        principalTable: "AffiliateClicks",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AffiliateConversions_AffiliatePartners_AffiliatePartnerId",
                        column: x => x.AffiliatePartnerId,
                        principalTable: "AffiliatePartners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateClicks_AffiliatePartnerId",
                table: "AffiliateClicks",
                column: "AffiliatePartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateClicks_ClickedAt",
                table: "AffiliateClicks",
                column: "ClickedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateClicks_ContentId_CountryCode",
                table: "AffiliateClicks",
                columns: new[] { "ContentId", "CountryCode" });

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateConversions_AffiliateClickId",
                table: "AffiliateConversions",
                column: "AffiliateClickId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AffiliateConversions_AffiliatePartnerId",
                table: "AffiliateConversions",
                column: "AffiliatePartnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AffiliateConversions");

            migrationBuilder.DropTable(
                name: "AffiliateClicks");

            migrationBuilder.DropTable(
                name: "AffiliatePartners");

            migrationBuilder.DropColumn(
                name: "TrialPeriodDays",
                table: "SubscriptionPlans");
        }
    }
}
