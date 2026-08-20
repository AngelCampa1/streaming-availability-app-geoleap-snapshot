using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GeoLeap.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgresCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ABExperiments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActualStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TrafficPercentage = table.Column<double>(type: "double precision", nullable: false),
                    TrafficAllocation = table.Column<double>(type: "double precision", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VariantA = table.Column<string>(type: "text", nullable: false),
                    VariantB = table.Column<string>(type: "text", nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ABExperiments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AbTestAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExperimentId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbTestAssignments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AbTestExperiments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TrafficAllocation = table.Column<decimal>(type: "numeric", nullable: false),
                    ConversionEvents = table.Column<List<string>>(type: "text[]", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbTestExperiments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminConfigurationSetting",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    IsEncrypted = table.Column<bool>(type: "boolean", nullable: false),
                    IsReadOnly = table.Column<bool>(type: "boolean", nullable: false),
                    LastModified = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ValidationRule = table.Column<string>(type: "text", nullable: true),
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DataType = table.Column<string>(type: "text", nullable: false),
                    IsSecure = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultValue = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminConfigurationSetting", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "AdminDataExports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExportType = table.Column<string>(type: "text", nullable: false),
                    Format = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: true),
                    FilePath = table.Column<string>(type: "text", nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    RecordCount = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RequestedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    Parameters = table.Column<string>(type: "text", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminDataExports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    ActionUrl = table.Column<string>(type: "text", nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    DataJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CorrelationId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminNotifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserEmail = table.Column<string>(type: "text", nullable: false),
                    Roles = table.Column<List<string>>(type: "text[]", nullable: false),
                    Permissions = table.Column<List<string>>(type: "text[]", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastActivity = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: false),
                    UserAgent = table.Column<string>(type: "text", nullable: false),
                    SessionDataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApiUsageRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Endpoint = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    ResponseTimeMs = table.Column<int>(type: "integer", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    HttpStatusCode = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiUsageRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PreferredLanguage = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Timezone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    ProfileImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Bio = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    PaymentInformation = table.Column<string>(type: "text", nullable: true),
                    GoogleId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AppleId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsSuspended = table.Column<bool>(type: "boolean", nullable: false),
                    SuspendedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SuspensionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LastAdminAction = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastPasswordChangeDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubscriptionTier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FrozenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FrozenBy = table.Column<Guid>(type: "uuid", nullable: true),
                    FreezeReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UnfreezeAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AttributionModels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Configuration = table.Column<string>(type: "text", nullable: false),
                    LookbackWindowDays = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttributionModels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AvailabilityTestResults",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TestName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Location = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    ResponseTimeMs = table.Column<int>(type: "integer", nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TestTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResponseHeaders = table.Column<string>(type: "text", nullable: true),
                    ResponseBody = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AvailabilityTestResults", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AzureMonitorAlertRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetResourceId = table.Column<string>(type: "text", nullable: false),
                    MetricName = table.Column<string>(type: "text", nullable: false),
                    Operator = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Threshold = table.Column<double>(type: "double precision", nullable: false),
                    Aggregation = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WindowSizeMinutes = table.Column<int>(type: "integer", nullable: false),
                    EvaluationFrequencyMinutes = table.Column<int>(type: "integer", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    ActionGroupIds = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastModified = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastModifiedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AzureMonitorAlertRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BudgetAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Threshold = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    CurrentUtilization = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    CurrentCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BudgetLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProviderId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    IsProcessed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BudgetAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BudgetConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Limit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Period = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ProviderId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BudgetConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BusinessAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcknowledgedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsResolved = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    BusinessMetrics = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CachePersistenceEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsCompressed = table.Column<bool>(type: "boolean", nullable: false),
                    OriginalSize = table.Column<long>(type: "bigint", nullable: false),
                    CompressedSize = table.Column<long>(type: "bigint", nullable: false),
                    AccessCount = table.Column<int>(type: "integer", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachePersistenceEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CastMember",
                columns: table => new
                {
                    PersonId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Character = table.Column<string>(type: "text", nullable: true),
                    ProfilePath = table.Column<string>(type: "text", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreditId = table.Column<string>(type: "text", nullable: true),
                    Gender = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CastMember", x => x.PersonId);
                });

            migrationBuilder.CreateTable(
                name: "ConfigurationBackups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ConfigurationData = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfigurationBackups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ConfigurationChangeHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChangedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfigurationChangeHistory", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContentClusters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClusterName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ClusteringCriteria = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MaxPagesPerCluster = table.Column<int>(type: "integer", nullable: false),
                    CurrentPageCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TitleSimilarityThreshold = table.Column<float>(type: "real", nullable: false),
                    ContentSimilarityThreshold = table.Column<float>(type: "real", nullable: false),
                    KeywordOverlapThreshold = table.Column<float>(type: "real", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentClusters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContentMetadata",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TmdbId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    OriginalTitle = table.Column<string>(type: "text", nullable: true),
                    Overview = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ReleaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    VoteAverage = table.Column<double>(type: "double precision", nullable: true),
                    VoteCount = table.Column<int>(type: "integer", nullable: false),
                    Popularity = table.Column<double>(type: "double precision", nullable: true),
                    PosterPath = table.Column<string>(type: "text", nullable: true),
                    BackdropPath = table.Column<string>(type: "text", nullable: true),
                    Genres = table.Column<string>(type: "text", nullable: false),
                    Cast = table.Column<string>(type: "text", nullable: false),
                    Crew = table.Column<string>(type: "text", nullable: false),
                    ProductionCountries = table.Column<string>(type: "text", nullable: false),
                    OriginalLanguages = table.Column<string>(type: "text", nullable: false),
                    Runtime = table.Column<int>(type: "integer", nullable: true),
                    NumberOfSeasons = table.Column<int>(type: "integer", nullable: true),
                    NumberOfEpisodes = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: true),
                    ExternalIds = table.Column<string>(type: "text", nullable: false),
                    OriginalLanguage = table.Column<string>(type: "text", nullable: true),
                    Adult = table.Column<bool>(type: "boolean", nullable: false),
                    Budget = table.Column<long>(type: "bigint", nullable: true),
                    Revenue = table.Column<long>(type: "bigint", nullable: true),
                    Tagline = table.Column<string>(type: "text", nullable: true),
                    Homepage = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    Genre = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DataQuality = table.Column<int>(type: "integer", nullable: false),
                    ExternalId = table.Column<string>(type: "text", nullable: true),
                    Year = table.Column<int>(type: "integer", nullable: true),
                    Rating = table.Column<double>(type: "double precision", nullable: true),
                    PosterUrl = table.Column<string>(type: "text", nullable: true),
                    BackdropUrl = table.Column<string>(type: "text", nullable: true),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SourceProvider = table.Column<string>(type: "text", nullable: true),
                    Keywords = table.Column<string>(type: "text", nullable: false),
                    OpenGraphData = table.Column<string>(type: "text", nullable: false),
                    TwitterCardData = table.Column<string>(type: "text", nullable: false),
                    StructuredData = table.Column<string>(type: "text", nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentMetadata", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContentPopularityData",
                columns: table => new
                {
                    ContentId = table.Column<string>(type: "text", nullable: false),
                    TmdbPopularity = table.Column<decimal>(type: "numeric", nullable: false),
                    ImdbRating = table.Column<decimal>(type: "numeric", nullable: false),
                    SearchFrequency = table.Column<int>(type: "integer", nullable: false),
                    ClickCount = table.Column<int>(type: "integer", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TrendingCountries = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentPopularityData", x => x.ContentId);
                });

            migrationBuilder.CreateTable(
                name: "ContentSharePerformances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ShareCount = table.Column<long>(type: "bigint", nullable: false),
                    LastSharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PopularityScore = table.Column<double>(type: "double precision", nullable: false),
                    Genre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ReleaseYear = table.Column<int>(type: "integer", nullable: true),
                    Rating = table.Column<decimal>(type: "numeric", nullable: true),
                    TotalShares = table.Column<long>(type: "bigint", nullable: false),
                    TotalClicks = table.Column<long>(type: "bigint", nullable: false),
                    TotalConversions = table.Column<long>(type: "bigint", nullable: false),
                    ShareVelocity = table.Column<decimal>(type: "numeric", nullable: false),
                    TopSharingPlatform = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PlatformEngagementRate = table.Column<decimal>(type: "numeric", nullable: false),
                    FirstShareDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastShareDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentSharePerformances", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContentSharingMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TotalShares = table.Column<long>(type: "bigint", nullable: false),
                    TotalClicks = table.Column<long>(type: "bigint", nullable: false),
                    TotalViews = table.Column<long>(type: "bigint", nullable: false),
                    ShareToViewRatio = table.Column<decimal>(type: "numeric", nullable: false),
                    ClickThroughRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    ViralCoefficient = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    ConversionRate = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    TopSharingPlatform = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FirstSharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentSharingMetrics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContentVariables",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    VariableType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DataSource = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LastRefreshed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefreshIntervalHours = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentVariables", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ConversionFunnels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TimeWindowHours = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversionFunnels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "core_web_vitals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    LargestContentfulPaint = table.Column<double>(type: "double precision", nullable: true),
                    FirstInputDelay = table.Column<double>(type: "double precision", nullable: true),
                    CumulativeLayoutShift = table.Column<double>(type: "double precision", nullable: true),
                    FirstContentfulPaint = table.Column<double>(type: "double precision", nullable: true),
                    TimeToInteractive = table.Column<double>(type: "double precision", nullable: true),
                    PerformanceScore = table.Column<int>(type: "integer", nullable: true),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_core_web_vitals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CostOptimizationRecommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    EstimatedMonthlySavings = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ImplementationEffort = table.Column<int>(type: "integer", nullable: false),
                    Actions = table.Column<string>(type: "text", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsImplemented = table.Column<bool>(type: "boolean", nullable: false),
                    ImplementedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostOptimizationRecommendations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CrewMember",
                columns: table => new
                {
                    PersonId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Job = table.Column<string>(type: "text", nullable: false),
                    Department = table.Column<string>(type: "text", nullable: false),
                    ProfilePath = table.Column<string>(type: "text", nullable: true),
                    CreditId = table.Column<string>(type: "text", nullable: true),
                    Gender = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrewMember", x => x.PersonId);
                });

            migrationBuilder.CreateTable(
                name: "CustomPerformanceCounters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CounterName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Instance = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Value = table.Column<double>(type: "double precision", nullable: false),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Properties = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomPerformanceCounters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsSystemRole = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DataRetentionPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DataType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RetentionDays = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AutoPurge = table.Column<bool>(type: "boolean", nullable: false),
                    LegalBasis = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataRetentionPolicies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DunningCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TriggerType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CustomerSegment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    DelayAfterTrigger = table.Column<TimeSpan>(type: "interval", nullable: false),
                    SequenceInterval = table.Column<TimeSpan>(type: "interval", nullable: true),
                    MaxExecutions = table.Column<int>(type: "integer", nullable: false),
                    RequireGracePeriod = table.Column<bool>(type: "boolean", nullable: false),
                    StopOnPaymentSuccess = table.Column<bool>(type: "boolean", nullable: false),
                    StopOnAccountCancellation = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DunningCampaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DunningConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DataType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsEditable = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DunningConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Genre",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Genre", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GrowthAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metric = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Condition = table.Column<int>(type: "integer", nullable: false),
                    ThresholdValue = table.Column<decimal>(type: "numeric", nullable: false),
                    TimeWindow = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EvaluationFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NotificationChannels = table.Column<List<string>>(type: "text[]", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastEvaluatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Configuration = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GrowthAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GrowthEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeviceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ServerTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Properties = table.Column<string>(type: "text", nullable: false),
                    UtmSource = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UtmMedium = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UtmCampaign = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UtmTerm = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UtmContent = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LandingPage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ScreenResolution = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ViewportSize = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DeviceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OperatingSystem = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Browser = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EventValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SdkVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    HasConsent = table.Column<bool>(type: "boolean", nullable: false),
                    ConsentCategories = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GrowthEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TemplateType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    HtmlTemplate = table.Column<string>(type: "text", nullable: false),
                    CssStyles = table.Column<string>(type: "text", nullable: false),
                    Language = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MonitoringAlerts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AcknowledgedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AcknowledgedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ResolutionNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonitoringAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TemplateId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetCriteriaJson = table.Column<string>(type: "text", nullable: false),
                    TemplateDataJson = table.Column<string>(type: "text", nullable: false),
                    ScheduledFor = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TargetUserCount = table.Column<int>(type: "integer", nullable: false),
                    ProcessedCount = table.Column<int>(type: "integer", nullable: false),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false),
                    FailureCount = table.Column<int>(type: "integer", nullable: false),
                    SkippedCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationCampaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationTemplates",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Channel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Template = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Language = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultDataJson = table.Column<string>(type: "text", nullable: true),
                    ValidationRulesJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OAuthStates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StateValue = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RedirectUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    RequestedScopes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CodeVerifier = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CodeChallenge = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OAuthStates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OnboardingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionData = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OnboardingSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsSecure = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PerformanceThresholds",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MetricName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    WarningThreshold = table.Column<double>(type: "double precision", nullable: false),
                    CriticalThreshold = table.Column<double>(type: "double precision", nullable: false),
                    ComparisonOperator = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastModified = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastModifiedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerformanceThresholds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Resource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PersonDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Biography = table.Column<string>(type: "text", nullable: true),
                    Birthday = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Deathday = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Gender = table.Column<int>(type: "integer", nullable: true),
                    Homepage = table.Column<string>(type: "text", nullable: true),
                    PlaceOfBirth = table.Column<string>(type: "text", nullable: true),
                    ProfilePath = table.Column<string>(type: "text", nullable: true),
                    AlsoKnownAs = table.Column<List<string>>(type: "text[]", nullable: false),
                    Popularity = table.Column<double>(type: "double precision", nullable: true),
                    KnownForDepartment = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonDetails", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PreferenceCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ParentCategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IconClass = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreferenceCategories", x => x.Id);
                    table.UniqueConstraint("AK_PreferenceCategories_CategoryKey", x => x.CategoryKey);
                    table.ForeignKey(
                        name: "FK_PreferenceCategories_PreferenceCategories_ParentCategoryId",
                        column: x => x.ParentCategoryId,
                        principalTable: "PreferenceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Promotions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StripeCouponId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StripePromotionCodeId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MaxRedemptions = table.Column<int>(type: "integer", nullable: true),
                    CurrentRedemptions = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PercentOff = table.Column<int>(type: "integer", nullable: false),
                    AmountOff = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    AmountOffCurrency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    Duration = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DurationInMonths = table.Column<int>(type: "integer", nullable: true),
                    TargetPlanType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FirstTimeOnly = table.Column<bool>(type: "boolean", nullable: false),
                    AutoApply = table.Column<bool>(type: "boolean", nullable: false),
                    AvailableOnMobile = table.Column<bool>(type: "boolean", nullable: false),
                    AvailableOnWeb = table.Column<bool>(type: "boolean", nullable: false),
                    MinimumAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    MinimumAmountCurrency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Promotions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScheduledExports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CronExpression = table.Column<string>(type: "text", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastExecuted = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextExecution = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Recipients = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledExports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchableContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TmdbId = table.Column<int>(type: "integer", nullable: true),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OriginalTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SearchableTitle = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Overview = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    SearchableOverview = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: true),
                    Rating = table.Column<decimal>(type: "numeric(3,1)", nullable: true),
                    VoteCount = table.Column<int>(type: "integer", nullable: false),
                    Popularity = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    RuntimeMinutes = table.Column<int>(type: "integer", nullable: true),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ContentRating = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsAdult = table.Column<bool>(type: "boolean", nullable: false),
                    PosterUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BackdropUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    GenresJson = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SearchableGenres = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CastJson = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    SearchableCast = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    CrewJson = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    SearchableCrew = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    AvailableCountriesCount = table.Column<int>(type: "integer", nullable: false),
                    AvailableServicesCount = table.Column<int>(type: "integer", nullable: false),
                    SearchScore = table.Column<decimal>(type: "numeric(10,4)", nullable: false),
                    ClickThroughRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastAvailabilityUpdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchableContents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QueryHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SearchTerms = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ResultCount = table.Column<int>(type: "integer", nullable: false),
                    ExecutionTimeMs = table.Column<int>(type: "integer", nullable: false),
                    UsedCache = table.Column<bool>(type: "boolean", nullable: false),
                    CacheHitRate = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    HitCount = table.Column<int>(type: "integer", nullable: false),
                    EffectiveStrategy = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    HasClickthrough = table.Column<bool>(type: "boolean", nullable: false),
                    PerformanceTier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchAnalytics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchAnalyticsEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SessionId = table.Column<string>(type: "text", nullable: true),
                    AnonymousId = table.Column<string>(type: "text", nullable: false),
                    Query = table.Column<string>(type: "text", nullable: false),
                    NormalizedQuery = table.Column<string>(type: "text", nullable: true),
                    ContentType = table.Column<int>(type: "integer", nullable: true),
                    ResultCount = table.Column<int>(type: "integer", nullable: true),
                    ResponseTimeMs = table.Column<long>(type: "bigint", nullable: false),
                    UsedStrategy = table.Column<int>(type: "integer", nullable: true),
                    UsedCache = table.Column<bool>(type: "boolean", nullable: false),
                    DataSources = table.Column<List<string>>(type: "text[]", nullable: false),
                    ClickedResultId = table.Column<string>(type: "text", nullable: true),
                    ClickedPosition = table.Column<int>(type: "integer", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "text", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    UserAgent = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true),
                    Region = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchAnalyticsEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchJourneys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AnonymousId = table.Column<string>(type: "text", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Outcome = table.Column<int>(type: "integer", nullable: false),
                    TotalSearches = table.Column<int>(type: "integer", nullable: false),
                    TotalClicks = table.Column<int>(type: "integer", nullable: false),
                    FinalClickedContentId = table.Column<string>(type: "text", nullable: true),
                    TotalDuration = table.Column<TimeSpan>(type: "interval", nullable: false),
                    ConvertedToSubscription = table.Column<bool>(type: "boolean", nullable: false),
                    JourneyMetadata = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchJourneys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchPerformanceAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Metrics = table.Column<string>(type: "text", nullable: false),
                    TriggeredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RecommendedActions = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchPerformanceAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SearchTrends",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Query = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_DATE"),
                    SearchCount = table.Column<int>(type: "integer", nullable: false),
                    UniqueUsers = table.Column<int>(type: "integer", nullable: false),
                    TrendingScore = table.Column<decimal>(type: "numeric", nullable: false),
                    IsRising = table.Column<bool>(type: "boolean", nullable: false),
                    TimeWindowHours = table.Column<int>(type: "integer", nullable: false, defaultValue: 24),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchTrends", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SeoKeywords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Keyword = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SearchVolume = table.Column<int>(type: "integer", nullable: false),
                    CompetitionScore = table.Column<float>(type: "real", nullable: false),
                    KeywordDifficulty = table.Column<float>(type: "real", nullable: false),
                    CostPerClick = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    TrendingScore = table.Column<float>(type: "real", nullable: false),
                    TrendingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrendingReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastRankingUpdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RelatedKeywords = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    IsLongTail = table.Column<bool>(type: "boolean", nullable: false),
                    WordCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoKeywords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SeoMetadata",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Title = table.Column<string>(type: "character varying(70)", maxLength: 70, nullable: false),
                    Description = table.Column<string>(type: "character varying(170)", maxLength: 170, nullable: false),
                    Keywords = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CanonicalUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OgTitle = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OgDescription = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    OgImage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OgType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TwitterCardType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StructuredData = table.Column<string>(type: "text", nullable: true),
                    Priority = table.Column<decimal>(type: "numeric(3,2)", nullable: false),
                    ChangeFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsIndexable = table.Column<bool>(type: "boolean", nullable: false),
                    IsFollowable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    AlternateLanguages = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoMetadata", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SeoMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MetricType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    Metadata = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoMetrics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SeoTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Template = table.Column<string>(type: "text", nullable: false),
                    MetaTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MetaDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    H1Template = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UrlPattern = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Variables = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    Category = table.Column<string>(type: "text", nullable: false),
                    IndexPage = table.Column<bool>(type: "boolean", nullable: false),
                    FollowLinks = table.Column<bool>(type: "boolean", nullable: false),
                    CanonicalPattern = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RefreshIntervalHours = table.Column<int>(type: "integer", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: false),
                    SeoSettingsObject = table.Column<string>(type: "text", nullable: true),
                    AutoOptimization = table.Column<bool>(type: "boolean", nullable: false),
                    AveragePerformanceScore = table.Column<double>(type: "double precision", nullable: false),
                    UsageCount = table.Column<int>(type: "integer", nullable: false),
                    TotalPagesGenerated = table.Column<int>(type: "integer", nullable: false),
                    AverageSeoScore = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShareAbTests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TestName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    VariantName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ConfigurationJson = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    TrafficPercentage = table.Column<double>(type: "double precision", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareAbTests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShareLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShortCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OriginalUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ClickCount = table.Column<int>(type: "integer", nullable: false),
                    LastClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareLinks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SitemapEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    LastModified = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChangeFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Priority = table.Column<decimal>(type: "numeric(3,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SitemapEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SocialPlatformConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EncryptedClientId = table.Column<string>(type: "text", nullable: false),
                    EncryptedClientSecret = table.Column<string>(type: "text", nullable: false),
                    RedirectUri = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    AuthorizationEndpoint = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    TokenEndpoint = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UserInfoEndpoint = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RevokeEndpoint = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    DefaultScopes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OptionalScopes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    SupportsRefreshToken = table.Column<bool>(type: "boolean", nullable: false),
                    SupportsPosting = table.Column<bool>(type: "boolean", nullable: false),
                    SupportsFriendDiscovery = table.Column<bool>(type: "boolean", nullable: false),
                    TokenExpiryMinutes = table.Column<int>(type: "integer", nullable: false),
                    RateLimitPerHour = table.Column<int>(type: "integer", nullable: false),
                    PlatformName = table.Column<string>(type: "text", nullable: false),
                    CharacterLimit = table.Column<int>(type: "integer", nullable: false),
                    SupportsImages = table.Column<bool>(type: "boolean", nullable: false),
                    SupportsHashtags = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    ClientSecret = table.Column<string>(type: "text", nullable: false),
                    TokenUrl = table.Column<string>(type: "text", nullable: false),
                    UserInfoUrl = table.Column<string>(type: "text", nullable: false),
                    PlatformSpecificConfigJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialPlatformConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SocialShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ShareUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IsSuccessful = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShareClicks = table.Column<int>(type: "integer", nullable: false),
                    ClickCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialShares", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StreamingContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Genre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Rating = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ReleaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Director = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Duration = table.Column<int>(type: "integer", nullable: true),
                    PosterUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    StreamingUrls = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StreamingContents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StreamingServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    WebsiteUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsGlobal = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    AvailableRegions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    PopularRegions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StreamingServices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    BillingPeriod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    StripePriceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MaxSearchResultsPerQuery = table.Column<int>(type: "integer", nullable: false),
                    MaxDailySearches = table.Column<int>(type: "integer", nullable: false),
                    CanViewStreamingUrls = table.Column<bool>(type: "boolean", nullable: false),
                    CanViewPricing = table.Column<bool>(type: "boolean", nullable: false),
                    CanAccessAdvancedFilters = table.Column<bool>(type: "boolean", nullable: false),
                    Interval = table.Column<string>(type: "text", nullable: false),
                    Features = table.Column<List<string>>(type: "text[]", nullable: false),
                    BillingCycle = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsResolved = table.Column<bool>(type: "boolean", nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TypoCorrection",
                columns: table => new
                {
                    OriginalQuery = table.Column<string>(type: "text", nullable: false),
                    CorrectedQuery = table.Column<string>(type: "text", nullable: false),
                    Confidence = table.Column<decimal>(type: "numeric", nullable: false),
                    SuggestedAlternatives = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TypoCorrection", x => new { x.OriginalQuery, x.CorrectedQuery });
                });

            migrationBuilder.CreateTable(
                name: "UserBehaviorFunnels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalUsers = table.Column<int>(type: "integer", nullable: false),
                    CompletedUsers = table.Column<int>(type: "integer", nullable: false),
                    ConversionRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    AverageCompletionTime = table.Column<int>(type: "integer", nullable: true),
                    MedianCompletionTime = table.Column<int>(type: "integer", nullable: true),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBehaviorFunnels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserBehaviorInsights",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InsightType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Dimension = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DimensionValue = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MetricName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MetricValue = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    SampleSize = table.Column<int>(type: "integer", nullable: false),
                    ConfidenceLower = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    ConfidenceUpper = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    SignificanceLevel = table.Column<decimal>(type: "numeric(5,4)", nullable: true),
                    PeriodChange = table.Column<decimal>(type: "numeric(10,4)", nullable: true),
                    TrendDirection = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Recommendations = table.Column<string>(type: "text", nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    ImpactLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBehaviorInsights", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserBehaviorSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DeviceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    PageViews = table.Column<int>(type: "integer", nullable: false),
                    EventCount = table.Column<int>(type: "integer", nullable: false),
                    LandingPage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExitPage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UtmSource = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UtmMedium = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UtmCampaign = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    MaxScrollDepth = table.Column<decimal>(type: "numeric", nullable: true),
                    SearchCount = table.Column<int>(type: "integer", nullable: false),
                    ContentInteractions = table.Column<int>(type: "integer", nullable: false),
                    FormInteractions = table.Column<int>(type: "integer", nullable: false),
                    ErrorCount = table.Column<int>(type: "integer", nullable: false),
                    HasConversion = table.Column<bool>(type: "boolean", nullable: false),
                    ConversionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ConversionValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    IsBounce = table.Column<bool>(type: "boolean", nullable: false),
                    DeviceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OperatingSystem = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Browser = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExperimentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExperimentVariant = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    HasConsent = table.Column<bool>(type: "boolean", nullable: false),
                    IsReturningVisitor = table.Column<bool>(type: "boolean", nullable: false),
                    DaysSinceLastVisit = table.Column<int>(type: "integer", nullable: true),
                    QualityScore = table.Column<int>(type: "integer", nullable: false),
                    EngagementScore = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBehaviorSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserPreferences",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    PreferredGenres = table.Column<List<string>>(type: "text[]", nullable: false),
                    PreferredServices = table.Column<List<string>>(type: "text[]", nullable: false),
                    PreferredCountries = table.Column<List<string>>(type: "text[]", nullable: false),
                    PreferredContentType = table.Column<int>(type: "integer", nullable: false),
                    MinRating = table.Column<int>(type: "integer", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreferences", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "ViralMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MetricDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MetricType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Platform = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TotalShares = table.Column<long>(type: "bigint", nullable: false),
                    TotalClicks = table.Column<long>(type: "bigint", nullable: false),
                    TotalRegistrations = table.Column<long>(type: "bigint", nullable: false),
                    TotalSubscriptions = table.Column<long>(type: "bigint", nullable: false),
                    ViralCoefficient = table.Column<decimal>(type: "numeric", nullable: false),
                    ShareToClickRate = table.Column<decimal>(type: "numeric", nullable: false),
                    ClickToRegistrationRate = table.Column<decimal>(type: "numeric", nullable: false),
                    RegistrationToSubscriptionRate = table.Column<decimal>(type: "numeric", nullable: false),
                    AverageSharesPerUser = table.Column<decimal>(type: "numeric", nullable: false),
                    AverageClicksPerShare = table.Column<decimal>(type: "numeric", nullable: false),
                    UniqueSharers = table.Column<long>(type: "bigint", nullable: false),
                    UniqueClickers = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ViralMetrics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VpnBestPractices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    ImportanceLevel = table.Column<int>(type: "integer", nullable: false),
                    Tags = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    HelpfulnessRating = table.Column<double>(type: "double precision", nullable: true),
                    HelpfulnessVotes = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnBestPractices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VpnGuidanceAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuideId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventData = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    SessionId = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnGuidanceAnalytics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VpnLegalDisclaimers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpirationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AdminNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnLegalDisclaimers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VpnProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    WebsiteUrl = table.Column<string>(type: "text", nullable: false),
                    AffiliateUrl = table.Column<string>(type: "text", nullable: true),
                    LogoUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    MonthlyPrice = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    AnnualPrice = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    HasFreeTrial = table.Column<bool>(type: "boolean", nullable: false),
                    FreeTrialDays = table.Column<int>(type: "integer", nullable: true),
                    ServerCount = table.Column<int>(type: "integer", nullable: false),
                    CountryCount = table.Column<int>(type: "integer", nullable: false),
                    SupportsP2P = table.Column<bool>(type: "boolean", nullable: false),
                    SupportsStreaming = table.Column<bool>(type: "boolean", nullable: false),
                    HasKillSwitch = table.Column<bool>(type: "boolean", nullable: false),
                    HasNoLogsPolicy = table.Column<bool>(type: "boolean", nullable: false),
                    MaxSimultaneousConnections = table.Column<int>(type: "integer", nullable: true),
                    SupportedPlatforms = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    AverageSpeedRating = table.Column<double>(type: "double precision", nullable: true),
                    ReliabilityRating = table.Column<double>(type: "double precision", nullable: true),
                    EaseOfUseRating = table.Column<double>(type: "double precision", nullable: true),
                    CustomerSupportRating = table.Column<double>(type: "double precision", nullable: true),
                    OverallRating = table.Column<double>(type: "double precision", nullable: true),
                    TotalRatings = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    AdminNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WebhookEvent",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeEventId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EventData = table.Column<string>(type: "text", nullable: false),
                    ProcessingStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProcessingError = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ProcessingAttempts = table.Column<int>(type: "integer", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebhookEvent", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExperimentAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExperimentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedVariant = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperimentAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExperimentAssignments_ABExperiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "ABExperiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExperimentEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExperimentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedVariant = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EventName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Properties = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperimentEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExperimentEvents_ABExperiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "ABExperiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExperimentVariants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExperimentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Configuration = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    AllocationPercentage = table.Column<double>(type: "double precision", nullable: false),
                    TrafficPercentage = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperimentVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExperimentVariants_ABExperiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "ABExperiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AbTestConversions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversionEvent = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<decimal>(type: "numeric", nullable: true),
                    ConvertedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AbTestAssignmentId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbTestConversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbTestConversions_AbTestAssignments_AbTestAssignmentId",
                        column: x => x.AbTestAssignmentId,
                        principalTable: "AbTestAssignments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AbTestVariant",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TrafficSplit = table.Column<decimal>(type: "numeric", nullable: false),
                    Configuration = table.Column<string>(type: "text", nullable: false),
                    IsControl = table.Column<bool>(type: "boolean", nullable: false),
                    AbTestExperimentId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbTestVariant", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbTestVariant_AbTestExperiments_AbTestExperimentId",
                        column: x => x.AbTestExperimentId,
                        principalTable: "AbTestExperiments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AdminActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActionType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Details = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CorrelationId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdminActions_AspNetUsers_AdminUserId",
                        column: x => x.AdminUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AdminActions_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ApiCostRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Endpoint = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    ResponseTime = table.Column<int>(type: "integer", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    RequestSize = table.Column<int>(type: "integer", nullable: false),
                    ResponseSize = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiCostRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApiCostRecords_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "AppStoreListings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AppName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BundleId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AppStore = table.Column<int>(type: "integer", nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Subtitle = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Keywords = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PromotionalText = table.Column<string>(type: "character varying(170)", maxLength: 170, nullable: false),
                    ReleaseNotes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Screenshots = table.Column<string>(type: "text", nullable: false),
                    PreviewVideos = table.Column<string>(type: "text", nullable: false),
                    IconUrl = table.Column<string>(type: "text", nullable: true),
                    ConversionRate = table.Column<double>(type: "double precision", nullable: false),
                    Downloads = table.Column<int>(type: "integer", nullable: false),
                    Views = table.Column<int>(type: "integer", nullable: false),
                    Rating = table.Column<double>(type: "double precision", nullable: false),
                    ReviewCount = table.Column<int>(type: "integer", nullable: false),
                    IsTestVariant = table.Column<bool>(type: "boolean", nullable: false),
                    ParentListingId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppStoreListings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppStoreListings_AppStoreListings_ParentListingId",
                        column: x => x.ParentListingId,
                        principalTable: "AppStoreListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AppStoreListings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AsoKeywords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Keyword = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AppStore = table.Column<int>(type: "integer", nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SearchVolume = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Difficulty = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    Relevance = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    ConversionPotential = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    CurrentRank = table.Column<int>(type: "integer", nullable: true),
                    BestRank = table.Column<int>(type: "integer", nullable: true),
                    PreviousRank = table.Column<int>(type: "integer", nullable: true),
                    CompetitionDensity = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    TopCompetitors = table.Column<string>(type: "text", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastRanked = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsoKeywords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsoKeywords_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OldValues = table.Column<string>(type: "text", nullable: true),
                    NewValues = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BillingAddresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FullName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AddressLine1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AddressLine2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    TaxId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TaxIdType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingAddresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BillingAddresses_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ConsentRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Purpose = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ConsentGiven = table.Column<bool>(type: "boolean", nullable: false),
                    ConsentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConsentWithdrawnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConsentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ConsentText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsentRecords_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContentRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Review = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContentRatings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CrossBorderTransferRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetCountry = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    DataType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TransferDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LegalBasis = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Safeguards = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ComplianceStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RecipientEntity = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TransferPurpose = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AdditionalNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ReviewDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrossBorderTransferRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CrossBorderTransferRecords_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CustomerBillingAccessLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportAgentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccessType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AccessedResource = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DataMaskingLevel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Justification = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerBillingAccessLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerBillingAccessLogs_AspNetUsers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomerBillingAccessLogs_AspNetUsers_SupportAgentId",
                        column: x => x.SupportAgentId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DataSubjectRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RequestDetails = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ProcessingNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DataExportPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VerificationMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IdentityVerified = table.Column<bool>(type: "boolean", nullable: false),
                    Deadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataSubjectRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DataSubjectRequests_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationDeliveryLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Channels = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    NotificationType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeliveryMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Metadata = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDeliveryLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDeliveryLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    PushNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    SmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    SystemAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    BusinessAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    UserActionAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    SecurityAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    PaymentAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    UpdateNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    MarketingEmails = table.Column<bool>(type: "boolean", nullable: false),
                    MarketingNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    WeeklyDigest = table.Column<bool>(type: "boolean", nullable: false),
                    WatchlistUpdates = table.Column<bool>(type: "boolean", nullable: false),
                    NewContentAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    PriceDropAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId1 = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_AspNetUsers_UserId1",
                        column: x => x.UserId1,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NotificationRateLimits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TimeWindow = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WindowStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    WindowEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Count = table.Column<int>(type: "integer", nullable: false),
                    Limit = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationRateLimits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationRateLimits_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GloballyEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    GlobalDisabledUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EmailEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    PushEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    SmsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    InAppEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationTypesJson = table.Column<string>(type: "text", nullable: false),
                    DefaultFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MaxNotificationsPerHour = table.Column<int>(type: "integer", nullable: false),
                    MaxNotificationsPerDay = table.Column<int>(type: "integer", nullable: false),
                    QuietHoursStart = table.Column<TimeSpan>(type: "interval", nullable: true),
                    QuietHoursEnd = table.Column<TimeSpan>(type: "interval", nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    QuietDaysJson = table.Column<string>(type: "text", nullable: false),
                    ContentFiltersJson = table.Column<string>(type: "text", nullable: false),
                    MinimumRating = table.Column<decimal>(type: "numeric", nullable: true),
                    AggregateNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    AggregationWindowMinutes = table.Column<int>(type: "integer", nullable: false),
                    EnableSmartTiming = table.Column<bool>(type: "boolean", nullable: false),
                    EnablePredictiveFiltering = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationTone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DailyDigestEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    WeeklyDigestEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    MonthlyDigestEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    DigestDeliveryTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    WeeklyDigestDay = table.Column<int>(type: "integer", nullable: false),
                    MonthlyDigestDay = table.Column<int>(type: "integer", nullable: false),
                    AllowDataProcessing = table.Column<bool>(type: "boolean", nullable: false),
                    AllowProfileAnalysis = table.Column<bool>(type: "boolean", nullable: false),
                    UnsubscribedTypesJson = table.Column<string>(type: "text", nullable: false),
                    UnsubscribedFromAllAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UnsubscribeReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationSettings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PasswordHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordHistory_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PasswordResetTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordResetTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordResetTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PaymentAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    FailureCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FailureMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ProcessingTimeMs = table.Column<int>(type: "integer", nullable: false),
                    Country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentAnalytics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentAnalytics_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PaywallAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    UserTier = table.Column<int>(type: "integer", nullable: false),
                    SearchQuery = table.Column<string>(type: "text", nullable: true),
                    ResultsShown = table.Column<int>(type: "integer", nullable: true),
                    TotalAvailableResults = table.Column<int>(type: "integer", nullable: true),
                    MessageIntensity = table.Column<int>(type: "integer", nullable: true),
                    UpgradeAction = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaywallAnalytics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaywallAnalytics_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaywallEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Event = table.Column<int>(type: "integer", nullable: false),
                    EventData = table.Column<string>(type: "text", nullable: false),
                    Region = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaywallEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaywallEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PreferenceHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PreferenceKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OldValue = table.Column<string>(type: "json", nullable: true),
                    NewValue = table.Column<string>(type: "json", nullable: false),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ChangeSource = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Metadata = table.Column<string>(type: "json", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreferenceHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreferenceHistory_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PrivacyComplianceReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReportPeriod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TotalConsents = table.Column<int>(type: "integer", nullable: false),
                    ActiveConsents = table.Column<int>(type: "integer", nullable: false),
                    RevokedConsents = table.Column<int>(type: "integer", nullable: false),
                    ExpiredConsents = table.Column<int>(type: "integer", nullable: false),
                    DataSubjectRequests = table.Column<int>(type: "integer", nullable: false),
                    PendingRequests = table.Column<int>(type: "integer", nullable: false),
                    CompletedRequests = table.Column<int>(type: "integer", nullable: false),
                    OverdueRequests = table.Column<int>(type: "integer", nullable: false),
                    PrivacyImpactAssessments = table.Column<int>(type: "integer", nullable: false),
                    HighRiskProcessing = table.Column<int>(type: "integer", nullable: false),
                    PendingPIAReviews = table.Column<int>(type: "integer", nullable: false),
                    CrossBorderTransfers = table.Column<int>(type: "integer", nullable: false),
                    NonAdequateTransfers = table.Column<int>(type: "integer", nullable: false),
                    TransfersRequiringReview = table.Column<int>(type: "integer", nullable: false),
                    DataRetentionViolations = table.Column<int>(type: "integer", nullable: false),
                    AutoDeletedRecords = table.Column<int>(type: "integer", nullable: false),
                    DataBreachIncidents = table.Column<int>(type: "integer", nullable: false),
                    UnauthorizedAccessAttempts = table.Column<int>(type: "integer", nullable: false),
                    SuccessfulAuditEvents = table.Column<int>(type: "integer", nullable: false),
                    OverallComplianceScore = table.Column<double>(type: "double precision", nullable: false),
                    ConsentComplianceScore = table.Column<double>(type: "double precision", nullable: false),
                    DataProcessingComplianceScore = table.Column<double>(type: "double precision", nullable: false),
                    SecurityComplianceScore = table.Column<double>(type: "double precision", nullable: false),
                    ComplianceNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RecommendedActions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    GeneratedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivacyComplianceReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivacyComplianceReports_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PrivacyImpactAssessments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcessingType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AssessmentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RiskLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MitigationMeasures = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ComplianceStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ReviewDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AssessmentNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AssessedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivacyImpactAssessments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivacyImpactAssessments_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PrivacySettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EnableDataProcessing = table.Column<bool>(type: "boolean", nullable: false),
                    AllowPersonalization = table.Column<bool>(type: "boolean", nullable: false),
                    AllowThirdPartySharing = table.Column<bool>(type: "boolean", nullable: false),
                    AllowMarketingCommunications = table.Column<bool>(type: "boolean", nullable: false),
                    AllowAnalytics = table.Column<bool>(type: "boolean", nullable: false),
                    PreferredRetentionDays = table.Column<int>(type: "integer", nullable: true),
                    PreferredExportFormat = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IncludeMetadataInExports = table.Column<bool>(type: "boolean", nullable: false),
                    MinimalDataProcessing = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivacySettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivacySettings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EnableRecommendations = table.Column<bool>(type: "boolean", nullable: false),
                    ShowTrendingContent = table.Column<bool>(type: "boolean", nullable: false),
                    ShowSimilarContent = table.Column<bool>(type: "boolean", nullable: false),
                    ShowPopularContent = table.Column<bool>(type: "boolean", nullable: false),
                    IncludeMovies = table.Column<bool>(type: "boolean", nullable: false),
                    IncludeTvShows = table.Column<bool>(type: "boolean", nullable: false),
                    IncludeDocumentaries = table.Column<bool>(type: "boolean", nullable: false),
                    IncludeAnime = table.Column<bool>(type: "boolean", nullable: false),
                    MinimumRating = table.Column<decimal>(type: "numeric", nullable: false),
                    IncludeAdultContent = table.Column<bool>(type: "boolean", nullable: false),
                    PreferredLanguages = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PreferredGenres = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ExcludedGenres = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    UseCollaborativeFiltering = table.Column<bool>(type: "boolean", nullable: false),
                    UseContentBasedFiltering = table.Column<bool>(type: "boolean", nullable: false),
                    UseTrendingBoost = table.Column<bool>(type: "boolean", nullable: false),
                    DismissedContentIds = table.Column<string>(type: "character varying(10000)", maxLength: 10000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationSettings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SearchHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Query = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SearchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    ResultCount = table.Column<int>(type: "integer", nullable: false),
                    ExecutionTimeMs = table.Column<int>(type: "integer", nullable: false),
                    SearchType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "General"),
                    Region = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SearchHistories_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SecurityEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    RiskScore = table.Column<int>(type: "integer", nullable: false),
                    Details = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecurityEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SecurityPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailSecurityAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    EmailLoginNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    SecurityQuestionEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecurityPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialAccount",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SocialUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    ProfileImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Bio = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    FollowersCount = table.Column<long>(type: "bigint", nullable: false),
                    FollowingCount = table.Column<long>(type: "bigint", nullable: false),
                    PostsCount = table.Column<long>(type: "bigint", nullable: false),
                    EngagementRate = table.Column<double>(type: "double precision", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    IsBusiness = table.Column<bool>(type: "boolean", nullable: false),
                    IsCreator = table.Column<bool>(type: "boolean", nullable: false),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Website = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsPrivate = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSyncAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastActivityAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InfluenceScore = table.Column<double>(type: "double precision", nullable: false),
                    ContentQualityScore = table.Column<double>(type: "double precision", nullable: false),
                    NetworkReachScore = table.Column<double>(type: "double precision", nullable: false),
                    PlatformDataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialAccount", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialAccount_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TargetUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialActivities_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SocialActivities_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialContentShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ShareType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShareContent = table.Column<string>(type: "text", nullable: false),
                    MediaUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LikesCount = table.Column<int>(type: "integer", nullable: false),
                    CommentsCount = table.Column<int>(type: "integer", nullable: false),
                    SharesCount = table.Column<int>(type: "integer", nullable: false),
                    ClicksCount = table.Column<int>(type: "integer", nullable: false),
                    EngagementRate = table.Column<double>(type: "double precision", nullable: false),
                    PlatformPostId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PostUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialContentShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialContentShares_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialGraphConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FromUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ConnectionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Strength = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    EstablishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastInteractionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectionDataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialGraphConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialGraphConnections_AspNetUsers_FromUserId",
                        column: x => x.FromUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SocialGraphConnections_AspNetUsers_ToUserId",
                        column: x => x.ToUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SocialPrivacyConsents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AllowSocialDataCollection = table.Column<bool>(type: "boolean", nullable: false),
                    AllowFriendDiscovery = table.Column<bool>(type: "boolean", nullable: false),
                    AllowSocialRecommendations = table.Column<bool>(type: "boolean", nullable: false),
                    AllowActivityTracking = table.Column<bool>(type: "boolean", nullable: false),
                    AllowProfileMatching = table.Column<bool>(type: "boolean", nullable: false),
                    AllowSocialAnalytics = table.Column<bool>(type: "boolean", nullable: false),
                    ShareDataWithThirdParties = table.Column<bool>(type: "boolean", nullable: false),
                    SpecificPlatformConsents = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ConsentGivenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConsentRevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsGdprCompliant = table.Column<bool>(type: "boolean", nullable: false),
                    ConsentVersion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    GdprLawfulBasis = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastConsentUpdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId1 = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialPrivacyConsents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialPrivacyConsents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SocialPrivacyConsents_AspNetUsers_UserId1",
                        column: x => x.UserId1,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SocialProofScores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OverallScore = table.Column<double>(type: "double precision", nullable: false),
                    InfluenceScore = table.Column<double>(type: "double precision", nullable: false),
                    EngagementScore = table.Column<double>(type: "double precision", nullable: false),
                    ContentQualityScore = table.Column<double>(type: "double precision", nullable: false),
                    NetworkScore = table.Column<double>(type: "double precision", nullable: false),
                    ActivityScore = table.Column<double>(type: "double precision", nullable: false),
                    TotalFollowers = table.Column<long>(type: "bigint", nullable: false),
                    TotalConnections = table.Column<long>(type: "bigint", nullable: false),
                    AverageEngagementRate = table.Column<double>(type: "double precision", nullable: false),
                    PostsLast30Days = table.Column<int>(type: "integer", nullable: false),
                    InteractionsLast30Days = table.Column<int>(type: "integer", nullable: false),
                    GlobalRank = table.Column<int>(type: "integer", nullable: false),
                    Percentile = table.Column<double>(type: "double precision", nullable: false),
                    InfluenceTier = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ScoreBreakdownJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialProofScores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialProofScores_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialRecommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Score = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SourcePlatforms = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RecommendationDataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialRecommendations_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialShareEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentDescription = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ShareMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShareUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CustomMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Hashtags = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    UtmCampaign = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UtmSource = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UtmMedium = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UtmContent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsSuccessful = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ErrorCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DeviceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShareMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false),
                    ClickCount = table.Column<int>(type: "integer", nullable: false),
                    ShareId = table.Column<string>(type: "text", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialShareEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialShareEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SocialSharingPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EnableAnalyticsTracking = table.Column<bool>(type: "boolean", nullable: false),
                    ShareUserInfo = table.Column<bool>(type: "boolean", nullable: false),
                    EnableLocationTracking = table.Column<bool>(type: "boolean", nullable: false),
                    PreferredPlatforms = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    DefaultHashtags = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    EnableCustomMessages = table.Column<bool>(type: "boolean", nullable: false),
                    EnableViralIncentives = table.Column<bool>(type: "boolean", nullable: false),
                    AllowSocialSharing = table.Column<bool>(type: "boolean", nullable: false),
                    ShareWithPersonalInfo = table.Column<bool>(type: "boolean", nullable: false),
                    AllowShareAnalytics = table.Column<bool>(type: "boolean", nullable: false),
                    AutoGenerateHashtags = table.Column<bool>(type: "boolean", nullable: false),
                    PlatformPreferences = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CustomShareTemplates = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialSharingPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialSharingPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StripeCustomers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeCustomerId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StripeCustomers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StripeCustomers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserActivityLog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserActivityLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserActivityLog_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserContentInteractions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InteractionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    InteractionValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserContentInteractions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserContentInteractions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserContentPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserContentPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserContentPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserImpersonationSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImpersonatedUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionToken = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EndReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserImpersonationSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserImpersonationSessions_AspNetUsers_AdminUserId",
                        column: x => x.AdminUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserImpersonationSessions_AspNetUsers_ImpersonatedUserId",
                        column: x => x.ImpersonatedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActionUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    MetadataJson = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserNotifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserOnboardings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CurrentStep = table.Column<int>(type: "integer", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SkippedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserOnboardings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserOnboardings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserRegionPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRegionPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRegionPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSearchUsages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SearchCount = table.Column<int>(type: "integer", nullable: false),
                    ResultsViewed = table.Column<int>(type: "integer", nullable: false),
                    LastSearchAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSearchUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSearchUsages_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    SessionToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DeviceInfo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeviceName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OperatingSystem = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Browser = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsCurrentSession = table.Column<bool>(type: "boolean", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserId1 = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSessions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserSessions_AspNetUsers_UserId1",
                        column: x => x.UserId1,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserStreamingSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubscriptionTier = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStreamingSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserStreamingSubscriptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastPayment = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubscriptionId = table.Column<string>(type: "text", nullable: true),
                    PaymentProvider = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SubscriptionType = table.Column<string>(type: "text", nullable: false),
                    AutoRenew = table.Column<bool>(type: "boolean", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PlanId = table.Column<string>(type: "text", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CurrentPeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CurrentPeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StripeSubscriptionId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CanceledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancellationReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSubscriptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserVpnPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PrefersNoLogsPolicy = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresKillSwitch = table.Column<bool>(type: "boolean", nullable: false),
                    NeedsStreamingSupport = table.Column<bool>(type: "boolean", nullable: false),
                    NeedsP2PSupport = table.Column<bool>(type: "boolean", nullable: false),
                    MaxMonthlyBudget = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    MaxAnnualBudget = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    RequiredPlatforms = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PreferredServerCountries = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MinServerCount = table.Column<int>(type: "integer", nullable: true),
                    MinCountryCount = table.Column<int>(type: "integer", nullable: true),
                    RequiredSimultaneousConnections = table.Column<int>(type: "integer", nullable: true),
                    ImportantStreamingServices = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserVpnPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserVpnPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistCategories_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistNotificationSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GloballyEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnAvailabilityChange = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnNewReleases = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnPriceDrops = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnSharedWatchlist = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnRecommendations = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnLeavingPlatform = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnRegionalChanges = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyOnContentExpiring = table.Column<bool>(type: "boolean", nullable: false),
                    WeeklyDigest = table.Column<bool>(type: "boolean", nullable: false),
                    MonthlyDigest = table.Column<bool>(type: "boolean", nullable: false),
                    PreferredNotificationMethod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DigestNotificationMethod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UrgentNotificationMethod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EnableEmailNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    EnableSmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    EnablePushNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    EnableInAppNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    SmsPhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EnableRetries = table.Column<bool>(type: "boolean", nullable: false),
                    MaxRetryAttempts = table.Column<int>(type: "integer", nullable: false),
                    RetryDelayMinutes = table.Column<int>(type: "integer", nullable: false),
                    AvailabilityChangeFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PriceDropFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RecommendationFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    QuietHoursStart = table.Column<TimeSpan>(type: "interval", nullable: true),
                    QuietHoursEnd = table.Column<TimeSpan>(type: "interval", nullable: true),
                    DigestDeliveryTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    WeeklyDigestDay = table.Column<int>(type: "integer", nullable: false),
                    MonthlyDigestDay = table.Column<int>(type: "integer", nullable: false),
                    NotificationGenresJson = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ExcludedGenresJson = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    PreferredServicesJson = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    MinimumRating = table.Column<decimal>(type: "numeric", nullable: true),
                    AggregateNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    MaxNotificationsPerHour = table.Column<int>(type: "integer", nullable: false),
                    MaxNotificationsPerDay = table.Column<int>(type: "integer", nullable: false),
                    EnableSmartTiming = table.Column<bool>(type: "boolean", nullable: false),
                    EnablePredictiveNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationTone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IncludeImages = table.Column<bool>(type: "boolean", nullable: false),
                    IncludePreviews = table.Column<bool>(type: "boolean", nullable: false),
                    AllowUnsubscribeFromAll = table.Column<bool>(type: "boolean", nullable: false),
                    UnsubscribeFromAllDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EnableDataProcessing = table.Column<bool>(type: "boolean", nullable: false),
                    AllowPersonalization = table.Column<bool>(type: "boolean", nullable: false),
                    AllowThirdPartySharing = table.Column<bool>(type: "boolean", nullable: false),
                    UnsubscribedNotificationTypesJson = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UnsubscribeReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistNotificationSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistNotificationSettings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistViews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FilterJson = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: true),
                    Color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistViews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistViews_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FunnelSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FunnelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    EventNames = table.Column<string>(type: "text", nullable: false),
                    Filters = table.Column<string>(type: "text", nullable: true),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    TargetRate = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunnelSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunnelSteps_ConversionFunnels_FunnelId",
                        column: x => x.FunnelId,
                        principalTable: "ConversionFunnels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CustomUserRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevokedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomUserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomUserRoles_AspNetUsers_AssignedBy",
                        column: x => x.AssignedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CustomUserRoles_AspNetUsers_RevokedBy",
                        column: x => x.RevokedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CustomUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomUserRoles_CustomRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CustomRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DunningSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    StepNumber = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NotificationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MessageTemplate = table.Column<string>(type: "text", nullable: false),
                    DelayFromPrevious = table.Column<TimeSpan>(type: "interval", nullable: false),
                    UrgencyLevel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RequiresResponse = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TestVariant = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TrafficAllocation = table.Column<int>(type: "integer", nullable: false),
                    TemplateVariables = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DunningSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DunningSteps_DunningCampaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "DunningCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlertTriggers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AlertId = table.Column<Guid>(type: "uuid", nullable: false),
                    TriggerValue = table.Column<decimal>(type: "numeric", nullable: false),
                    ThresholdValue = table.Column<decimal>(type: "numeric", nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Context = table.Column<string>(type: "text", nullable: false),
                    TriggeredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NotificationsSent = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertTriggers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertTriggers_GrowthAlerts_AlertId",
                        column: x => x.AlertId,
                        principalTable: "GrowthAlerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    ActionUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DataJson = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ScheduledFor = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CampaignId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TemplateId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TemplateDataJson = table.Column<string>(type: "text", nullable: true),
                    NotificationCampaignId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Notifications_NotificationCampaigns_NotificationCampaignId",
                        column: x => x.NotificationCampaignId,
                        principalTable: "NotificationCampaigns",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    GrantedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_CustomRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CustomRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Resource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Details = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<string>(type: "text", nullable: false),
                    NewValues = table.Column<string>(type: "text", nullable: true),
                    OldValues = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "text", nullable: true),
                    AffectedUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: true),
                    PermissionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAuditLogs_AspNetUsers_AffectedUserId",
                        column: x => x.AffectedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserAuditLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserAuditLogs_CustomRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CustomRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserAuditLogs_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TmdbExternalId",
                columns: table => new
                {
                    Source = table.Column<string>(type: "text", nullable: false),
                    ExternalIdValue = table.Column<string>(type: "text", nullable: false),
                    PersonDetailsId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TmdbExternalId", x => new { x.Source, x.ExternalIdValue });
                    table.ForeignKey(
                        name: "FK_TmdbExternalId_PersonDetails_PersonDetailsId",
                        column: x => x.PersonDetailsId,
                        principalTable: "PersonDetails",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DefaultPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    PreferenceKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DefaultValue = table.Column<string>(type: "json", nullable: false),
                    DataType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ValidationSchema = table.Column<string>(type: "json", nullable: true),
                    IsUserConfigurable = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresRestart = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Scope = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DefaultPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DefaultPreferences_PreferenceCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "PreferenceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserPreference",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PreferenceKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PreferenceValue = table.Column<string>(type: "json", nullable: false),
                    DataType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsUserOverride = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreference", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPreference_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPreference_PreferenceCategories_CategoryKey",
                        column: x => x.CategoryKey,
                        principalTable: "PreferenceCategories",
                        principalColumn: "CategoryKey",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MobileSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tier = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Platform = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ProductId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TransactionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    OriginalTransactionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ReceiptData = table.Column<string>(type: "text", nullable: true),
                    PurchaseToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AutoRenew = table.Column<bool>(type: "boolean", nullable: false),
                    LastVerified = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PromotionId = table.Column<Guid>(type: "uuid", nullable: true),
                    PromotionalAccessStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PromotionalAccessEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsPromotionalAccess = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobileSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MobileSubscriptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MobileSubscriptions_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PromotionRedemptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PromotionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RedeemedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    Platform = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StripeSubscriptionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionRedemptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PromotionRedemptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PromotionRedemptions_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContentAlternativeTitles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SearchableTitle = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    TitleType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentAlternativeTitles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContentAlternativeTitles_SearchableContents_ContentId",
                        column: x => x.ContentId,
                        principalTable: "SearchableContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContentStreamingOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    ServiceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ServiceLogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    StreamingType = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    VideoQualityJson = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AudioLanguagesJson = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SubtitleLanguagesJson = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StreamingUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentStreamingOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContentStreamingOptions_SearchableContents_ContentId",
                        column: x => x.ContentId,
                        principalTable: "SearchableContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SearchSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JourneyId = table.Column<Guid>(type: "uuid", nullable: false),
                    StepNumber = table.Column<int>(type: "integer", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    Query = table.Column<string>(type: "text", nullable: true),
                    ContentId = table.Column<string>(type: "text", nullable: true),
                    Position = table.Column<int>(type: "integer", nullable: true),
                    ActionMetadata = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TimeFromPrevious = table.Column<TimeSpan>(type: "interval", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SearchSteps_SearchJourneys_JourneyId",
                        column: x => x.JourneyId,
                        principalTable: "SearchJourneys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SeoBatchJobs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JobName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TemplateId = table.Column<int>(type: "integer", nullable: false),
                    TotalPages = table.Column<int>(type: "integer", nullable: false),
                    CompletedPages = table.Column<int>(type: "integer", nullable: false),
                    FailedPages = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ErrorLog = table.Column<string>(type: "text", nullable: true),
                    Configuration = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    BatchSize = table.Column<int>(type: "integer", nullable: false),
                    ConcurrencyLimit = table.Column<int>(type: "integer", nullable: false),
                    EstimatedDuration = table.Column<TimeSpan>(type: "interval", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoBatchJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeoBatchJobs_SeoTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "SeoTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SeoPages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TemplateId = table.Column<int>(type: "integer", nullable: false),
                    Slug = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    MetaTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MetaDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    H1 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CanonicalUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VariableValues = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    LastViewed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastIndexed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SearchRanking = table.Column<float>(type: "real", nullable: true),
                    PrimaryKeyword = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    KeywordDensity = table.Column<int>(type: "integer", nullable: false),
                    WordCount = table.Column<int>(type: "integer", nullable: false),
                    ReadingTimeMinutes = table.Column<int>(type: "integer", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    GenerationTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    GenerationLog = table.Column<string>(type: "text", nullable: true),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SeoScore = table.Column<double>(type: "double precision", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Keywords = table.Column<string>(type: "text", nullable: false),
                    MetaKeywords = table.Column<string>(type: "text", nullable: false),
                    SchemaMarkup = table.Column<string>(type: "text", nullable: false),
                    ReadabilityScore = table.Column<double>(type: "double precision", nullable: false),
                    KeywordDensityScore = table.Column<double>(type: "double precision", nullable: false),
                    Author = table.Column<string>(type: "text", nullable: false),
                    ContentClusterId = table.Column<int>(type: "integer", nullable: true),
                    SeoTemplateId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeoPages_ContentClusters_ContentClusterId",
                        column: x => x.ContentClusterId,
                        principalTable: "ContentClusters",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SeoPages_SeoTemplates_SeoTemplateId",
                        column: x => x.SeoTemplateId,
                        principalTable: "SeoTemplates",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SeoPages_SeoTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "SeoTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareAbTestParticipations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TestId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantAssigned = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HasShared = table.Column<bool>(type: "boolean", nullable: false),
                    FirstShareAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalShares = table.Column<int>(type: "integer", nullable: false),
                    TotalClicks = table.Column<int>(type: "integer", nullable: false),
                    TotalConversions = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareAbTestParticipations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareAbTestParticipations_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShareAbTestParticipations_ShareAbTests_TestId",
                        column: x => x.TestId,
                        principalTable: "ShareAbTests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OAuthToken",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlatformConfigId = table.Column<Guid>(type: "uuid", nullable: true),
                    EncryptedAccessToken = table.Column<string>(type: "text", nullable: false),
                    EncryptedRefreshToken = table.Column<string>(type: "text", nullable: true),
                    Scope = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastRefreshed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUsed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TokenType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsValid = table.Column<bool>(type: "boolean", nullable: false),
                    EncryptionKeyId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OAuthToken", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OAuthToken_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OAuthToken_SocialPlatformConfigurations_PlatformConfigId",
                        column: x => x.PlatformConfigId,
                        principalTable: "SocialPlatformConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SocialActivityFeeds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlatformConfigId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActivityTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActivityDescription = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TargetUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetUserDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActivityTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    EngagementCount = table.Column<int>(type: "integer", nullable: false),
                    ImportanceScore = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    Priority = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActivityDataJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsBookmarked = table.Column<bool>(type: "boolean", nullable: false),
                    BookmarkedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsHidden = table.Column<bool>(type: "boolean", nullable: false),
                    HiddenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RelevanceScore = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    IsRecommended = table.Column<bool>(type: "boolean", nullable: false),
                    RecommendationReason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialActivityFeeds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialActivityFeeds_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SocialActivityFeeds_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SocialActivityFeeds_SocialPlatformConfigurations_PlatformCo~",
                        column: x => x.PlatformConfigId,
                        principalTable: "SocialPlatformConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SocialAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlatformConfigId = table.Column<Guid>(type: "uuid", nullable: true),
                    TotalConnections = table.Column<int>(type: "integer", nullable: false),
                    ActiveConnections = table.Column<int>(type: "integer", nullable: false),
                    TotalFriends = table.Column<int>(type: "integer", nullable: false),
                    TotalFollowers = table.Column<int>(type: "integer", nullable: false),
                    TotalFollowing = table.Column<int>(type: "integer", nullable: false),
                    TotalPosts = table.Column<int>(type: "integer", nullable: false),
                    TotalShares = table.Column<int>(type: "integer", nullable: false),
                    TotalLikes = table.Column<int>(type: "integer", nullable: false),
                    TotalComments = table.Column<int>(type: "integer", nullable: false),
                    TotalInteractions = table.Column<int>(type: "integer", nullable: false),
                    TotalContentRecommendations = table.Column<int>(type: "integer", nullable: false),
                    AcceptedRecommendations = table.Column<int>(type: "integer", nullable: false),
                    RecommendationAcceptanceRate = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    AverageEngagementRate = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    InfluenceScore = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    ReachScore = table.Column<double>(type: "double precision", precision: 5, scale: 4, nullable: false),
                    FirstActivityAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastActivity = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastActivityAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DaysActive = table.Column<int>(type: "integer", nullable: false),
                    AverageSessionDuration = table.Column<double>(type: "double precision", precision: 10, scale: 2, nullable: false),
                    DataExportRequests = table.Column<int>(type: "integer", nullable: false),
                    DataDeletionRequests = table.Column<int>(type: "integer", nullable: false),
                    LastPrivacyUpdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PlatformBreakdownJson = table.Column<string>(type: "text", nullable: false),
                    ActivityByTypeJson = table.Column<string>(type: "text", nullable: false),
                    RawAnalyticsJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialAnalytics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialAnalytics_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SocialAnalytics_SocialPlatformConfigurations_PlatformConfig~",
                        column: x => x.PlatformConfigId,
                        principalTable: "SocialPlatformConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SocialConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlatformConfigId = table.Column<Guid>(type: "uuid", nullable: true),
                    SocialUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ProfileImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Bio = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastTokenRefresh = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsTokenValid = table.Column<bool>(type: "boolean", nullable: false),
                    GrantedScopes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FollowersCount = table.Column<int>(type: "integer", nullable: false),
                    FollowingCount = table.Column<int>(type: "integer", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    ProfileDataJson = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialConnections_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SocialConnections_SocialPlatformConfigurations_PlatformConf~",
                        column: x => x.PlatformConfigId,
                        principalTable: "SocialPlatformConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "UserStreamingServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StreamingServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PrioritizeInResults = table.Column<bool>(type: "boolean", nullable: false),
                    ShowInRecommendations = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStreamingServices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserStreamingServices_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserStreamingServices_StreamingServices_StreamingServiceId",
                        column: x => x.StreamingServiceId,
                        principalTable: "StreamingServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserBehaviorFunnelSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FunnelId = table.Column<Guid>(type: "uuid", nullable: false),
                    StepOrder = table.Column<int>(type: "integer", nullable: false),
                    StepName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FilterConditions = table.Column<string>(type: "text", nullable: true),
                    UserCount = table.Column<int>(type: "integer", nullable: false),
                    DropoffCount = table.Column<int>(type: "integer", nullable: false),
                    ConversionRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    DropoffRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    AverageTimeOnStep = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBehaviorFunnelSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserBehaviorFunnelSteps_UserBehaviorFunnels_FunnelId",
                        column: x => x.FunnelId,
                        principalTable: "UserBehaviorFunnels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserBehaviorEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeviceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ServerTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ElementSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ElementText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TimeOnPage = table.Column<int>(type: "integer", nullable: true),
                    ScrollDepth = table.Column<decimal>(type: "numeric", nullable: true),
                    MouseX = table.Column<int>(type: "integer", nullable: true),
                    MouseY = table.Column<int>(type: "integer", nullable: true),
                    SearchQuery = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SearchResultCount = table.Column<int>(type: "integer", nullable: true),
                    ContentId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ContentCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InteractionDuration = table.Column<int>(type: "integer", nullable: true),
                    FormCompletionPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    FormFieldName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ErrorCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Properties = table.Column<string>(type: "text", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ScreenResolution = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ViewportSize = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DeviceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OperatingSystem = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Browser = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EventValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ExperimentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExperimentVariant = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ProcessingError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SdkVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    HasConsent = table.Column<bool>(type: "boolean", nullable: false),
                    ConsentCategories = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SessionSequence = table.Column<int>(type: "integer", nullable: false),
                    IsSessionStart = table.Column<bool>(type: "boolean", nullable: false),
                    IsSessionEnd = table.Column<bool>(type: "boolean", nullable: false),
                    SessionDuration = table.Column<int>(type: "integer", nullable: true),
                    PageViewsInSession = table.Column<int>(type: "integer", nullable: true),
                    IsReturningVisitor = table.Column<bool>(type: "boolean", nullable: false),
                    DaysSinceLastVisit = table.Column<int>(type: "integer", nullable: true),
                    UserSessionCount = table.Column<int>(type: "integer", nullable: true),
                    UserBehaviorSessionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBehaviorEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserBehaviorEvents_UserBehaviorSessions_UserBehaviorSession~",
                        column: x => x.UserBehaviorSessionId,
                        principalTable: "UserBehaviorSessions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "VpnPerformanceSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegionCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CapturedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConnectionLatencyMs = table.Column<int>(type: "integer", nullable: false),
                    ConnectionSuccessRate = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    ConnectionStabilityScore = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    DownloadSpeedMbps = table.Column<double>(type: "numeric(10,2)", nullable: false),
                    UploadSpeedMbps = table.Column<double>(type: "numeric(10,2)", nullable: false),
                    SpeedConsistencyScore = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    StreamingLatencyMs = table.Column<int>(type: "integer", nullable: false),
                    StreamingSuccessRate = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    StreamingQualityScore = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    SystemCpuUsagePercent = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    SystemMemoryUsagePercent = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    NetworkUtilizationPercent = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    OverallPerformanceScore = table.Column<double>(type: "numeric(5,2)", nullable: false),
                    MetricsData = table.Column<string>(type: "text", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnPerformanceSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VpnPerformanceSnapshots_VpnProviders_VpnProviderId",
                        column: x => x.VpnProviderId,
                        principalTable: "VpnProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VpnProviderRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RatingType = table.Column<int>(type: "integer", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Review = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SpeedRating = table.Column<int>(type: "integer", nullable: true),
                    ReliabilityRating = table.Column<int>(type: "integer", nullable: true),
                    EaseOfUseRating = table.Column<int>(type: "integer", nullable: true),
                    CustomerSupportRating = table.Column<int>(type: "integer", nullable: true),
                    ValueForMoneyRating = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    IsHelpful = table.Column<bool>(type: "boolean", nullable: false),
                    HelpfulVotes = table.Column<int>(type: "integer", nullable: false),
                    UnhelpfulVotes = table.Column<int>(type: "integer", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnProviderRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VpnProviderRatings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VpnProviderRatings_VpnProviders_VpnProviderId",
                        column: x => x.VpnProviderId,
                        principalTable: "VpnProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VpnServerLocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ServerCount = table.Column<int>(type: "integer", nullable: false),
                    IsOptimizedForStreaming = table.Column<bool>(type: "boolean", nullable: false),
                    IsP2PFriendly = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnServerLocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VpnServerLocations_VpnProviders_VpnProviderId",
                        column: x => x.VpnProviderId,
                        principalTable: "VpnProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VpnSetupGuides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Platform = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    StepCount = table.Column<int>(type: "integer", nullable: false),
                    EstimatedTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    Difficulty = table.Column<int>(type: "integer", nullable: false),
                    Prerequisites = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TroubleshootingTips = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    HelpfulnessRating = table.Column<double>(type: "double precision", nullable: true),
                    HelpfulnessVotes = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnSetupGuides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VpnSetupGuides_VpnProviders_VpnProviderId",
                        column: x => x.VpnProviderId,
                        principalTable: "VpnProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VpnStreamingCompatibilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VpnProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    StreamingServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LastTested = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    CompatibleRegions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnStreamingCompatibilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VpnStreamingCompatibilities_StreamingServices_StreamingServ~",
                        column: x => x.StreamingServiceId,
                        principalTable: "StreamingServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VpnStreamingCompatibilities_VpnProviders_VpnProviderId",
                        column: x => x.VpnProviderId,
                        principalTable: "VpnProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppStoreReviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReviewId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ListingId = table.Column<int>(type: "integer", nullable: false),
                    ReviewerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ReviewDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SentimentScore = table.Column<double>(type: "double precision", nullable: false),
                    SentimentLabel = table.Column<int>(type: "integer", nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    Topics = table.Column<string>(type: "text", nullable: false),
                    Issues = table.Column<string>(type: "text", nullable: false),
                    Compliments = table.Column<string>(type: "text", nullable: false),
                    HasDeveloperResponse = table.Column<bool>(type: "boolean", nullable: false),
                    DeveloperResponse = table.Column<string>(type: "text", nullable: true),
                    ResponseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsHelpful = table.Column<bool>(type: "boolean", nullable: false),
                    IsVerifiedPurchase = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppStoreReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppStoreReviews_AppStoreListings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "AppStoreListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AsoAnalytics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ListingId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Granularity = table.Column<int>(type: "integer", nullable: false),
                    Views = table.Column<int>(type: "integer", nullable: false),
                    Downloads = table.Column<int>(type: "integer", nullable: false),
                    ConversionRate = table.Column<double>(type: "double precision", nullable: false),
                    OrganicViews = table.Column<int>(type: "integer", nullable: false),
                    SearchViews = table.Column<int>(type: "integer", nullable: false),
                    BrowseViews = table.Column<int>(type: "integer", nullable: false),
                    ReferralViews = table.Column<int>(type: "integer", nullable: false),
                    KeywordViews = table.Column<string>(type: "text", nullable: false),
                    KeywordConversions = table.Column<string>(type: "text", nullable: false),
                    AverageRating = table.Column<double>(type: "double precision", nullable: false),
                    TotalReviews = table.Column<int>(type: "integer", nullable: false),
                    NewReviews = table.Column<int>(type: "integer", nullable: false),
                    SentimentScore = table.Column<double>(type: "double precision", nullable: false),
                    CategoryRankings = table.Column<string>(type: "text", nullable: false),
                    KeywordRankings = table.Column<string>(type: "text", nullable: false),
                    CompetitorData = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsoAnalytics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsoAnalytics_AppStoreListings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "AppStoreListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AsoAbTests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ControlListingId = table.Column<int>(type: "integer", nullable: false),
                    VariantListingId = table.Column<int>(type: "integer", nullable: false),
                    TrafficSplit = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.5),
                    ControlMetrics = table.Column<string>(type: "text", nullable: false),
                    VariantMetrics = table.Column<string>(type: "text", nullable: false),
                    StatisticalSignificance = table.Column<double>(type: "double precision", nullable: true),
                    ConfidenceLevel = table.Column<double>(type: "double precision", nullable: true, defaultValue: 0.94999999999999996),
                    IsStatisticallySignificant = table.Column<bool>(type: "boolean", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    KeywordIds = table.Column<string>(type: "text", nullable: false),
                    AsoKeywordId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsoAbTests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsoAbTests_AppStoreListings_ControlListingId",
                        column: x => x.ControlListingId,
                        principalTable: "AppStoreListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AsoAbTests_AppStoreListings_VariantListingId",
                        column: x => x.VariantListingId,
                        principalTable: "AppStoreListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AsoAbTests_AsoKeywords_AsoKeywordId",
                        column: x => x.AsoKeywordId,
                        principalTable: "AsoKeywords",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AsoAbTests_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KeywordRankings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    KeywordId = table.Column<int>(type: "integer", nullable: false),
                    ListingId = table.Column<int>(type: "integer", nullable: false),
                    Rank = table.Column<int>(type: "integer", nullable: false),
                    PreviousRank = table.Column<int>(type: "integer", nullable: true),
                    RankedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    CategoryRank = table.Column<int>(type: "integer", nullable: true),
                    Category = table.Column<string>(type: "text", nullable: true),
                    VisibilityScore = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KeywordRankings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KeywordRankings_AppStoreListings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "AppStoreListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KeywordRankings_AsoKeywords_KeywordId",
                        column: x => x.KeywordId,
                        principalTable: "AsoKeywords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialInteraction",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocialAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    InteractionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TargetPostId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TargetUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TargetUsername = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    InteractionContent = table.Column<string>(type: "text", nullable: true),
                    InteractionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsInbound = table.Column<bool>(type: "boolean", nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialInteraction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialInteraction_SocialAccount_SocialAccountId",
                        column: x => x.SocialAccountId,
                        principalTable: "SocialAccount",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocialAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlatformPostId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PostType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    MediaUrls = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Hashtags = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Mentions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PostedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LikesCount = table.Column<long>(type: "bigint", nullable: false),
                    CommentsCount = table.Column<long>(type: "bigint", nullable: false),
                    SharesCount = table.Column<long>(type: "bigint", nullable: false),
                    ViewsCount = table.Column<long>(type: "bigint", nullable: false),
                    EngagementRate = table.Column<double>(type: "double precision", nullable: false),
                    ReachEstimate = table.Column<double>(type: "double precision", nullable: false),
                    SentimentScore = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TopicsJson = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialPosts_SocialAccount_SocialAccountId",
                        column: x => x.SocialAccountId,
                        principalTable: "SocialAccount",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialRelationship",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocialAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelatedUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RelatedUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RelatedDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RelatedProfileImage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RelationshipType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EstablishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastInteractionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RelationshipStrength = table.Column<double>(type: "double precision", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    GeoLeapUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialRelationship", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialRelationship_AspNetUsers_GeoLeapUserId",
                        column: x => x.GeoLeapUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SocialRelationship_SocialAccount_SocialAccountId",
                        column: x => x.SocialAccountId,
                        principalTable: "SocialAccount",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareClickEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShareEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClickerUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ReferrerUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Platform = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeviceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsNewUser = table.Column<bool>(type: "boolean", nullable: false),
                    ResultedInRegistration = table.Column<bool>(type: "boolean", nullable: false),
                    ResultedInSubscription = table.Column<bool>(type: "boolean", nullable: false),
                    RegistrationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubscriptionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareClickEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareClickEvents_AspNetUsers_ClickerUserId",
                        column: x => x.ClickerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShareClickEvents_SocialShareEvents_ShareEventId",
                        column: x => x.ShareEventId,
                        principalTable: "SocialShareEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareLinkClicks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShareEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Referer = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResultedInRegistration = table.Column<bool>(type: "boolean", nullable: false),
                    RegistrationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    RefererUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ConvertedToRegistration = table.Column<bool>(type: "boolean", nullable: false),
                    ConvertedUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConversionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShareLinkId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareLinkClicks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareLinkClicks_AspNetUsers_ConvertedUserId",
                        column: x => x.ConvertedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ShareLinkClicks_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShareLinkClicks_ShareLinks_ShareLinkId",
                        column: x => x.ShareLinkId,
                        principalTable: "ShareLinks",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShareLinkClicks_SocialShareEvents_ShareEventId",
                        column: x => x.ShareEventId,
                        principalTable: "SocialShareEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareLinkMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShortCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OriginalUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ShareEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClickCount = table.Column<long>(type: "bigint", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareLinkMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareLinkMappings_SocialShareEvents_ShareEventId",
                        column: x => x.ShareEventId,
                        principalTable: "SocialShareEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentMethods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripePaymentMethodId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Last4 = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    Brand = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ExpiryMonth = table.Column<int>(type: "integer", nullable: true),
                    ExpiryYear = table.Column<int>(type: "integer", nullable: true),
                    Fingerprint = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    Nickname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StripeCustomerId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentMethods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentMethods_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PaymentMethods_StripeCustomers_StripeCustomerId",
                        column: x => x.StripeCustomerId,
                        principalTable: "StripeCustomers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeCustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeSubscriptionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StripePriceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlanType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Interval = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IntervalCount = table.Column<int>(type: "integer", nullable: false),
                    CurrentPeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CurrentPeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CanceledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelAtPeriodEnd = table.Column<bool>(type: "boolean", nullable: false),
                    IsCanceled = table.Column<bool>(type: "boolean", nullable: false),
                    PausedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResumeAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrialStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrialEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BillingCycle = table.Column<string>(type: "text", nullable: true),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subscriptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Subscriptions_StripeCustomers_StripeCustomerId",
                        column: x => x.StripeCustomerId,
                        principalTable: "StripeCustomers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Watchlists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsFavorite = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SortDirection = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Watchlists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Watchlists_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Watchlists_WatchlistCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "WatchlistCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DunningAnalytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FailureType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: true),
                    StepId = table.Column<Guid>(type: "uuid", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    NotificationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    WasSuccessful = table.Column<bool>(type: "boolean", nullable: false),
                    DaysSinceFailure = table.Column<int>(type: "integer", nullable: false),
                    RecoveryAttempt = table.Column<int>(type: "integer", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AnalyticsMetadata = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DunningAnalytics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DunningAnalytics_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DunningAnalytics_DunningCampaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "DunningCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DunningAnalytics_DunningSteps_StepId",
                        column: x => x.StepId,
                        principalTable: "DunningSteps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "NotificationDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Channel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AttemptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExternalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    LastRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDeliveries_Notifications_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "Notifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationInteractions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    InteractionType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InteractionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InteractionUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DeviceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ContextJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationInteractions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationInteractions_Notifications_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "Notifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationQueues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    QueuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ScheduledFor = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ProcessorId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationQueues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationQueues_Notifications_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "Notifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SeoPerformanceMetrics",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PageId = table.Column<long>(type: "bigint", nullable: false),
                    DailyViews = table.Column<int>(type: "integer", nullable: false),
                    WeeklyViews = table.Column<int>(type: "integer", nullable: false),
                    MonthlyViews = table.Column<int>(type: "integer", nullable: false),
                    UniqueVisitors = table.Column<int>(type: "integer", nullable: false),
                    BounceRate = table.Column<float>(type: "real", nullable: false),
                    AverageTimeOnPage = table.Column<TimeSpan>(type: "interval", nullable: false),
                    SearchImpressions = table.Column<int>(type: "integer", nullable: false),
                    SearchClicks = table.Column<int>(type: "integer", nullable: false),
                    AveragePosition = table.Column<float>(type: "real", nullable: false),
                    BacklinkCount = table.Column<int>(type: "integer", nullable: false),
                    InternalLinkCount = table.Column<int>(type: "integer", nullable: false),
                    SocialShares = table.Column<int>(type: "integer", nullable: false),
                    ContentQualityScore = table.Column<float>(type: "real", nullable: false),
                    MetricDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeoPerformanceMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeoPerformanceMetrics_SeoPages_PageId",
                        column: x => x.PageId,
                        principalTable: "SeoPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentTransaction",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripePaymentIntentId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PaymentMethodId = table.Column<Guid>(type: "uuid", nullable: true),
                    StripeCustomerId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StripeSubscriptionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StripeCustomerId1 = table.Column<Guid>(type: "uuid", nullable: true),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransaction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentTransaction_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentTransaction_PaymentMethods_PaymentMethodId",
                        column: x => x.PaymentMethodId,
                        principalTable: "PaymentMethods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PaymentTransaction_StripeCustomers_StripeCustomerId1",
                        column: x => x.StripeCustomerId1,
                        principalTable: "StripeCustomers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PaymentTransaction_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WatchlistItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchlistId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ContentId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TmdbId = table.Column<int>(type: "integer", nullable: true),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Overview = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PosterUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BackdropUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ReleaseYear = table.Column<int>(type: "integer", nullable: true),
                    Rating = table.Column<decimal>(type: "numeric", nullable: true),
                    Runtime = table.Column<int>(type: "integer", nullable: true),
                    Genres = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    StreamingServices = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    IsWatched = table.Column<bool>(type: "boolean", nullable: false),
                    WatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserRating = table.Column<decimal>(type: "numeric", nullable: true),
                    UserNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Tags = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AddedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsCurrentlyAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    LastAvailabilityCheck = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AvailabilityData = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistItems_Watchlists_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchlistId = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackActivity = table.Column<bool>(type: "boolean", nullable: false),
                    AllowNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistSettings_Watchlists_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchlistId = table.Column<Guid>(type: "uuid", nullable: false),
                    SharedWithUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SharedWithEmail = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PermissionLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ShareToken = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistShares_AspNetUsers_SharedWithUserId",
                        column: x => x.SharedWithUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WatchlistShares_Watchlists_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FailedPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentTransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: true),
                    FailureType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StripeDeclineCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    RecoveryStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    MaxRetryAttempts = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsRetriable = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresAction = table.Column<bool>(type: "boolean", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FailedPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FailedPayments_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FailedPayments_PaymentTransaction_PaymentTransactionId",
                        column: x => x.PaymentTransactionId,
                        principalTable: "PaymentTransaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FailedPayments_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeCustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaymentTransactionId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: true),
                    StripeInvoiceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    IssueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    BillingAddressId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceTemplate = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Language = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    IsPdfGenerated = table.Column<bool>(type: "boolean", nullable: false),
                    PdfGeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsEmailSent = table.Column<bool>(type: "boolean", nullable: false),
                    EmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoices_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Invoices_BillingAddresses_BillingAddressId",
                        column: x => x.BillingAddressId,
                        principalTable: "BillingAddresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Invoices_PaymentTransaction_PaymentTransactionId",
                        column: x => x.PaymentTransactionId,
                        principalTable: "PaymentTransaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Invoices_StripeCustomers_StripeCustomerId",
                        column: x => x.StripeCustomerId,
                        principalTable: "StripeCustomers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Invoices_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchlistId = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchlistItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Metadata = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistActivities_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WatchlistActivities_WatchlistItems_WatchlistItemId",
                        column: x => x.WatchlistItemId,
                        principalTable: "WatchlistItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WatchlistActivities_Watchlists_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistItemAvailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchlistItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    AvailabilityType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    StreamingUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AvailableFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AvailableUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AdditionalData = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastChecked = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistItemAvailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistItemAvailabilities_WatchlistItems_WatchlistItemId",
                        column: x => x.WatchlistItemId,
                        principalTable: "WatchlistItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DunningCampaignExecutions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    FailedPaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CurrentStepNumber = table.Column<int>(type: "integer", nullable: false),
                    TotalExecutions = table.Column<int>(type: "integer", nullable: false),
                    NextExecutionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletionReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExecutionMetadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DunningCampaignExecutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DunningCampaignExecutions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DunningCampaignExecutions_DunningCampaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "DunningCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DunningCampaignExecutions_FailedPayments_FailedPaymentId",
                        column: x => x.FailedPaymentId,
                        principalTable: "FailedPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GracePeriods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FailedPaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    GracePeriodType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    GracePeriodDays = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LimitFeatures = table.Column<bool>(type: "boolean", nullable: false),
                    RestrictedFeatures = table.Column<string>(type: "text", nullable: false),
                    ShowGracePeriodWarnings = table.Column<bool>(type: "boolean", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GracePeriods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GracePeriods_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GracePeriods_FailedPayments_FailedPaymentId",
                        column: x => x.FailedPaymentId,
                        principalTable: "FailedPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GracePeriods_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PaymentRecoverySessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FailedPaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionToken = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RecoveryUrl = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SessionMetadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentRecoverySessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentRecoverySessions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentRecoverySessions_FailedPayments_FailedPaymentId",
                        column: x => x.FailedPaymentId,
                        principalTable: "FailedPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentRetryAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FailedPaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentTransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StripeDeclineCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AttemptNumber = table.Column<int>(type: "integer", nullable: false),
                    DelayFromPrevious = table.Column<TimeSpan>(type: "interval", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AttemptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentRetryAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentRetryAttempts_FailedPayments_FailedPaymentId",
                        column: x => x.FailedPaymentId,
                        principalTable: "FailedPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PaymentRetryAttempts_PaymentTransaction_PaymentTransactionId",
                        column: x => x.PaymentTransactionId,
                        principalTable: "PaymentTransaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeliveryMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeliveryAddress = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MessageId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeliveryTrackingId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeliveryMetadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceDeliveries_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    ServicePeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ServicePeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StripePriceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StripeProductId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Metadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceLineItems_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupportActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActionType = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    SupportAgentId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PaymentTransactionId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    RefundId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovalNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportActions_AspNetUsers_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupportActions_AspNetUsers_RejectedBy",
                        column: x => x.RejectedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupportActions_AspNetUsers_SupportAgentId",
                        column: x => x.SupportAgentId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupportActions_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupportActions_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupportActions_PaymentTransaction_PaymentTransactionId",
                        column: x => x.PaymentTransactionId,
                        principalTable: "PaymentTransaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupportActions_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TaxCalculations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TaxName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    StateProvince = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Jurisdiction = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TaxServiceProvider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExternalTaxId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TaxDetails = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxCalculations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaxCalculations_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DunningNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignExecutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StepId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExternalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeliveryMetadata = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DunningNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DunningNotifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DunningNotifications_DunningCampaignExecutions_CampaignExec~",
                        column: x => x.CampaignExecutionId,
                        principalTable: "DunningCampaignExecutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DunningNotifications_DunningSteps_StepId",
                        column: x => x.StepId,
                        principalTable: "DunningSteps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupportActionAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportActionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Event = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OldValues = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NewValues = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportActionAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportActionAuditLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupportActionAuditLogs_SupportActions_SupportActionId",
                        column: x => x.SupportActionId,
                        principalTable: "SupportActions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupportRefunds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportActionId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentTransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefundAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    OriginalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RefundMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StripeRefundId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    InternalNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CustomerNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProcessedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ProcessingError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportRefunds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportRefunds_AspNetUsers_ProcessedBy",
                        column: x => x.ProcessedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupportRefunds_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupportRefunds_PaymentTransaction_PaymentTransactionId",
                        column: x => x.PaymentTransactionId,
                        principalTable: "PaymentTransaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupportRefunds_SupportActions_SupportActionId",
                        column: x => x.SupportActionId,
                        principalTable: "SupportActions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ABExperiments_IsActive",
                table: "ABExperiments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ABExperiments_Status",
                table: "ABExperiments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AbTestConversions_AbTestAssignmentId",
                table: "AbTestConversions",
                column: "AbTestAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AbTestVariant_AbTestExperimentId",
                table: "AbTestVariant",
                column: "AbTestExperimentId");

            migrationBuilder.CreateIndex(
                name: "IX_AdminActions_ActionType",
                table: "AdminActions",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_AdminActions_AdminUserId_CreatedAt",
                table: "AdminActions",
                columns: new[] { "AdminUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminActions_CorrelationId",
                table: "AdminActions",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_AdminActions_CreatedAt",
                table: "AdminActions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AdminActions_TargetUserId_CreatedAt",
                table: "AdminActions",
                columns: new[] { "TargetUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AlertTriggers_AlertId",
                table: "AlertTriggers",
                column: "AlertId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiCostRecords_CorrelationId",
                table: "ApiCostRecords",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiCostRecords_Endpoint_Timestamp",
                table: "ApiCostRecords",
                columns: new[] { "Endpoint", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ApiCostRecords_ProviderId_Timestamp",
                table: "ApiCostRecords",
                columns: new[] { "ProviderId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ApiCostRecords_Success_Timestamp",
                table: "ApiCostRecords",
                columns: new[] { "Success", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ApiCostRecords_Timestamp",
                table: "ApiCostRecords",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_ApiCostRecords_UserId_Timestamp",
                table: "ApiCostRecords",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ApiUsageRecords_CorrelationId",
                table: "ApiUsageRecords",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiUsageRecords_Endpoint",
                table: "ApiUsageRecords",
                column: "Endpoint");

            migrationBuilder.CreateIndex(
                name: "IX_ApiUsageRecords_Success_Timestamp",
                table: "ApiUsageRecords",
                columns: new[] { "Success", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ApiUsageRecords_Timestamp",
                table: "ApiUsageRecords",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_ApiUsageRecords_Timestamp_EstimatedCost",
                table: "ApiUsageRecords",
                columns: new[] { "Timestamp", "EstimatedCost" });

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreListings_BundleId",
                table: "AppStoreListings",
                column: "BundleId");

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreListings_ParentListingId",
                table: "AppStoreListings",
                column: "ParentListingId");

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreListings_UserId",
                table: "AppStoreListings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreListings_UserId_AppStore",
                table: "AppStoreListings",
                columns: new[] { "UserId", "AppStore" });

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreListings_UserId_Status",
                table: "AppStoreListings",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreReviews_ListingId",
                table: "AppStoreReviews",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreReviews_ListingId_ReviewDate",
                table: "AppStoreReviews",
                columns: new[] { "ListingId", "ReviewDate" });

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreReviews_ReviewDate",
                table: "AppStoreReviews",
                column: "ReviewDate");

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreReviews_ReviewId",
                table: "AppStoreReviews",
                column: "ReviewId");

            migrationBuilder.CreateIndex(
                name: "IX_AppStoreReviews_SentimentLabel",
                table: "AppStoreReviews",
                column: "SentimentLabel");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAbTests_AsoKeywordId",
                table: "AsoAbTests",
                column: "AsoKeywordId");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAbTests_ControlListingId",
                table: "AsoAbTests",
                column: "ControlListingId");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAbTests_Status",
                table: "AsoAbTests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAbTests_UserId",
                table: "AsoAbTests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAbTests_UserId_Status",
                table: "AsoAbTests",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AsoAbTests_VariantListingId",
                table: "AsoAbTests",
                column: "VariantListingId");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAnalytics_Date",
                table: "AsoAnalytics",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAnalytics_Granularity",
                table: "AsoAnalytics",
                column: "Granularity");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAnalytics_ListingId",
                table: "AsoAnalytics",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_AsoAnalytics_ListingId_Date_Granularity",
                table: "AsoAnalytics",
                columns: new[] { "ListingId", "Date", "Granularity" });

            migrationBuilder.CreateIndex(
                name: "IX_AsoKeywords_Keyword",
                table: "AsoKeywords",
                column: "Keyword");

            migrationBuilder.CreateIndex(
                name: "IX_AsoKeywords_Keyword_AppStore_Country",
                table: "AsoKeywords",
                columns: new[] { "Keyword", "AppStore", "Country" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AsoKeywords_UserId",
                table: "AsoKeywords",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AsoKeywords_UserId_AppStore",
                table: "AsoKeywords",
                columns: new[] { "UserId", "AppStore" });

            migrationBuilder.CreateIndex(
                name: "IX_AsoKeywords_UserId_Status",
                table: "AsoKeywords",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_AppleId",
                table: "AspNetUsers",
                column: "AppleId",
                unique: true,
                filter: "\"AppleId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_GoogleId",
                table: "AspNetUsers",
                column: "GoogleId",
                unique: true,
                filter: "\"GoogleId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_IsSuspended",
                table: "AspNetUsers",
                column: "IsSuspended");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_IsSuspended_SuspendedAt",
                table: "AspNetUsers",
                columns: new[] { "IsSuspended", "SuspendedAt" });

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingAddress_Country",
                table: "BillingAddresses",
                column: "Country");

            migrationBuilder.CreateIndex(
                name: "IX_BillingAddress_User_IsActive",
                table: "BillingAddresses",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BillingAddress_User_IsDefault",
                table: "BillingAddresses",
                columns: new[] { "UserId", "IsDefault" },
                filter: "\"IsDefault\" = true");

            migrationBuilder.CreateIndex(
                name: "IX_BudgetAlerts_ProviderId_Timestamp",
                table: "BudgetAlerts",
                columns: new[] { "ProviderId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_BudgetAlerts_Timestamp",
                table: "BudgetAlerts",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_BudgetAlerts_Type_IsProcessed",
                table: "BudgetAlerts",
                columns: new[] { "Type", "IsProcessed" });

            migrationBuilder.CreateIndex(
                name: "IX_BudgetConfigurations_Category_IsActive",
                table: "BudgetConfigurations",
                columns: new[] { "Category", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BudgetConfigurations_Period",
                table: "BudgetConfigurations",
                column: "Period");

            migrationBuilder.CreateIndex(
                name: "IX_BudgetConfigurations_ProviderId_IsActive",
                table: "BudgetConfigurations",
                columns: new[] { "ProviderId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessAlert_Active_Type",
                table: "BusinessAlerts",
                columns: new[] { "IsActive", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_CachePersistenceEntries_AccessCount",
                table: "CachePersistenceEntries",
                column: "AccessCount");

            migrationBuilder.CreateIndex(
                name: "IX_CachePersistenceEntries_Category_CreatedAt",
                table: "CachePersistenceEntries",
                columns: new[] { "Category", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CachePersistenceEntries_Category_LastAccessedAt",
                table: "CachePersistenceEntries",
                columns: new[] { "Category", "LastAccessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CachePersistenceEntries_ExpiresAt",
                table: "CachePersistenceEntries",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachePersistenceEntries_Key",
                table: "CachePersistenceEntries",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConsentRecords_UserId_Purpose",
                table: "ConsentRecords",
                columns: new[] { "UserId", "Purpose" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentAlternativeTitle_Content_Type",
                table: "ContentAlternativeTitles",
                columns: new[] { "ContentId", "TitleType" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentAlternativeTitle_SearchableTitle_Language",
                table: "ContentAlternativeTitles",
                columns: new[] { "SearchableTitle", "Language" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentAlternativeTitles_ContentId",
                table: "ContentAlternativeTitles",
                column: "ContentId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentAlternativeTitles_SearchableTitle",
                table: "ContentAlternativeTitles",
                column: "SearchableTitle");

            migrationBuilder.CreateIndex(
                name: "IX_ContentAlternativeTitles_Title_Language",
                table: "ContentAlternativeTitles",
                columns: new[] { "Title", "Language" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentClusters_ClusterName",
                table: "ContentClusters",
                column: "ClusterName");

            migrationBuilder.CreateIndex(
                name: "IX_ContentClusters_IsActive",
                table: "ContentClusters",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ContentRatings_UserId",
                table: "ContentRatings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOption_Content_Country_Type",
                table: "ContentStreamingOptions",
                columns: new[] { "ContentId", "CountryCode", "StreamingType" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOption_Country_Service_Updated",
                table: "ContentStreamingOptions",
                columns: new[] { "CountryCode", "ServiceId", "LastUpdated" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOption_ExpiresAt",
                table: "ContentStreamingOptions",
                column: "ExpiresAt",
                filter: "\"ExpiresAt\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOption_Service_Type_Price",
                table: "ContentStreamingOptions",
                columns: new[] { "ServiceId", "StreamingType", "Price" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOptions_ContentId_CountryCode_ServiceId",
                table: "ContentStreamingOptions",
                columns: new[] { "ContentId", "CountryCode", "ServiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOptions_LastUpdated",
                table: "ContentStreamingOptions",
                column: "LastUpdated");

            migrationBuilder.CreateIndex(
                name: "IX_ContentStreamingOptions_StreamingType_Price",
                table: "ContentStreamingOptions",
                columns: new[] { "StreamingType", "Price" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentVariables_Category",
                table: "ContentVariables",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_ContentVariables_IsActive",
                table: "ContentVariables",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ContentVariables_Name",
                table: "ContentVariables",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_CostOptimizationRecommendations_EstimatedMonthlySavings",
                table: "CostOptimizationRecommendations",
                column: "EstimatedMonthlySavings");

            migrationBuilder.CreateIndex(
                name: "IX_CostOptimizationRecommendations_GeneratedAt",
                table: "CostOptimizationRecommendations",
                column: "GeneratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CostOptimizationRecommendations_Type_IsImplemented",
                table: "CostOptimizationRecommendations",
                columns: new[] { "Type", "IsImplemented" });

            migrationBuilder.CreateIndex(
                name: "IX_CrossBorderTransferRecords_UserId",
                table: "CrossBorderTransferRecords",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerBillingAccessLog_AccessType_AccessedAt",
                table: "CustomerBillingAccessLogs",
                columns: new[] { "AccessType", "AccessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerBillingAccessLog_CorrelationId",
                table: "CustomerBillingAccessLogs",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerBillingAccessLog_Customer_AccessedAt",
                table: "CustomerBillingAccessLogs",
                columns: new[] { "CustomerId", "AccessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerBillingAccessLog_SupportAgent_AccessedAt",
                table: "CustomerBillingAccessLogs",
                columns: new[] { "SupportAgentId", "AccessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomRoles_Name",
                table: "CustomRoles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomUserRoles_AssignedBy",
                table: "CustomUserRoles",
                column: "AssignedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CustomUserRoles_RevokedBy",
                table: "CustomUserRoles",
                column: "RevokedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CustomUserRoles_RoleId",
                table: "CustomUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomUserRoles_UserId_RoleId",
                table: "CustomUserRoles",
                columns: new[] { "UserId", "RoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DataSubjectRequests_UserId",
                table: "DataSubjectRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DefaultPreferences_CategoryId_PreferenceKey",
                table: "DefaultPreferences",
                columns: new[] { "CategoryId", "PreferenceKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DefaultPreferences_IsUserConfigurable",
                table: "DefaultPreferences",
                column: "IsUserConfigurable");

            migrationBuilder.CreateIndex(
                name: "IX_DefaultPreferences_Scope",
                table: "DefaultPreferences",
                column: "Scope");

            migrationBuilder.CreateIndex(
                name: "IX_DunningAnalytics_CampaignId",
                table: "DunningAnalytics",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_DunningAnalytics_EventType_Timestamp",
                table: "DunningAnalytics",
                columns: new[] { "EventType", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningAnalytics_FailureType_Success",
                table: "DunningAnalytics",
                columns: new[] { "FailureType", "WasSuccessful" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningAnalytics_StepId",
                table: "DunningAnalytics",
                column: "StepId");

            migrationBuilder.CreateIndex(
                name: "IX_DunningAnalytics_User_Timestamp",
                table: "DunningAnalytics",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningCampaignExecution_FailedPayment_Campaign",
                table: "DunningCampaignExecutions",
                columns: new[] { "FailedPaymentId", "CampaignId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DunningCampaignExecution_Status_NextExecutionAt",
                table: "DunningCampaignExecutions",
                columns: new[] { "Status", "NextExecutionAt" },
                filter: "\"NextExecutionAt\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DunningCampaignExecution_User_Status",
                table: "DunningCampaignExecutions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningCampaignExecutions_CampaignId",
                table: "DunningCampaignExecutions",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_DunningCampaign_CustomerSegment_Priority",
                table: "DunningCampaigns",
                columns: new[] { "CustomerSegment", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningCampaign_TriggerType_IsActive",
                table: "DunningCampaigns",
                columns: new[] { "TriggerType", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningConfiguration_Category_IsActive",
                table: "DunningConfigurations",
                columns: new[] { "Category", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningConfiguration_Key",
                table: "DunningConfigurations",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DunningNotification_Status_NextRetryAt",
                table: "DunningNotifications",
                columns: new[] { "Status", "NextRetryAt" },
                filter: "\"Status\" = 'failed' AND \"NextRetryAt\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DunningNotification_Type_Status",
                table: "DunningNotifications",
                columns: new[] { "NotificationType", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningNotification_User_Status",
                table: "DunningNotifications",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DunningNotifications_CampaignExecutionId",
                table: "DunningNotifications",
                column: "CampaignExecutionId");

            migrationBuilder.CreateIndex(
                name: "IX_DunningNotifications_StepId",
                table: "DunningNotifications",
                column: "StepId");

            migrationBuilder.CreateIndex(
                name: "IX_DunningStep_Campaign_StepNumber",
                table: "DunningSteps",
                columns: new[] { "CampaignId", "StepNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DunningStep_NotificationType_IsActive",
                table: "DunningSteps",
                columns: new[] { "NotificationType", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentAssignments_ExperimentId_UserId",
                table: "ExperimentAssignments",
                columns: new[] { "ExperimentId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentAssignments_UserId",
                table: "ExperimentAssignments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentEvents_ExperimentId",
                table: "ExperimentEvents",
                column: "ExperimentId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentVariants_ExperimentId",
                table: "ExperimentVariants",
                column: "ExperimentId");

            migrationBuilder.CreateIndex(
                name: "IX_FailedPayment_CorrelationId",
                table: "FailedPayments",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_FailedPayment_FailureType_CreatedAt",
                table: "FailedPayments",
                columns: new[] { "FailureType", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_FailedPayment_RecoveryStatus_NextRetryAt",
                table: "FailedPayments",
                columns: new[] { "RecoveryStatus", "NextRetryAt" },
                filter: "\"NextRetryAt\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FailedPayment_User_RecoveryStatus",
                table: "FailedPayments",
                columns: new[] { "UserId", "RecoveryStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_FailedPayments_PaymentTransactionId",
                table: "FailedPayments",
                column: "PaymentTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FailedPayments_SubscriptionId",
                table: "FailedPayments",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_FunnelSteps_FunnelId",
                table: "FunnelSteps",
                column: "FunnelId");

            migrationBuilder.CreateIndex(
                name: "IX_GracePeriod_FailedPaymentId",
                table: "GracePeriods",
                column: "FailedPaymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GracePeriod_Status_ExpiresAt",
                table: "GracePeriods",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GracePeriod_User_Status",
                table: "GracePeriods",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_GracePeriods_SubscriptionId",
                table: "GracePeriods",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceDelivery_Invoice_Method",
                table: "InvoiceDeliveries",
                columns: new[] { "InvoiceId", "DeliveryMethod" });

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceDelivery_Status_NextRetryAt",
                table: "InvoiceDeliveries",
                columns: new[] { "Status", "NextRetryAt" },
                filter: "\"Status\" = 'failed' AND \"NextRetryAt\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceLineItem_Invoice_ItemType",
                table: "InvoiceLineItems",
                columns: new[] { "InvoiceId", "ItemType" });

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_CorrelationId",
                table: "Invoices",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_Period",
                table: "Invoices",
                columns: new[] { "PeriodStart", "PeriodEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_Status_DueDate",
                table: "Invoices",
                columns: new[] { "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Invoice_User_IssueDate",
                table: "Invoices",
                columns: new[] { "UserId", "IssueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_BillingAddressId",
                table: "Invoices",
                column: "BillingAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_PaymentTransactionId",
                table: "Invoices",
                column: "PaymentTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_StripeCustomerId",
                table: "Invoices",
                column: "StripeCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_StripeInvoiceId",
                table: "Invoices",
                column: "StripeInvoiceId",
                unique: true,
                filter: "\"StripeInvoiceId\" != ''");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_SubscriptionId",
                table: "Invoices",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTemplate_Type_IsActive",
                table: "InvoiceTemplates",
                columns: new[] { "TemplateType", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTemplates_Name_Language",
                table: "InvoiceTemplates",
                columns: new[] { "Name", "Language" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KeywordRankings_KeywordId",
                table: "KeywordRankings",
                column: "KeywordId");

            migrationBuilder.CreateIndex(
                name: "IX_KeywordRankings_KeywordId_ListingId_RankedAt",
                table: "KeywordRankings",
                columns: new[] { "KeywordId", "ListingId", "RankedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_KeywordRankings_ListingId",
                table: "KeywordRankings",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_KeywordRankings_RankedAt",
                table: "KeywordRankings",
                column: "RankedAt");

            migrationBuilder.CreateIndex(
                name: "IX_MobileSubscriptions_PromotionId",
                table: "MobileSubscriptions",
                column: "PromotionId");

            migrationBuilder.CreateIndex(
                name: "IX_MobileSubscriptions_UserId",
                table: "MobileSubscriptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveries_NotificationId",
                table: "NotificationDeliveries",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_UserId_DeliveredAt",
                table: "NotificationDeliveryLogs",
                columns: new[] { "UserId", "DeliveredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationInteractions_NotificationId",
                table: "NotificationInteractions",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_UserId",
                table: "NotificationPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_UserId1",
                table: "NotificationPreferences",
                column: "UserId1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationQueues_NotificationId",
                table: "NotificationQueues",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRateLimits_UserId",
                table: "NotificationRateLimits",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_NotificationCampaignId",
                table: "Notifications",
                column: "NotificationCampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationSettings_UserId",
                table: "NotificationSettings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OAuthStates_CreatedAt",
                table: "OAuthStates",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_OAuthStates_ExpiresAt",
                table: "OAuthStates",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_OAuthStates_UserId_IsUsed",
                table: "OAuthStates",
                columns: new[] { "UserId", "IsUsed" });

            migrationBuilder.CreateIndex(
                name: "IX_OAuthToken_ExpiresAt",
                table: "OAuthToken",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_OAuthToken_LastUsed",
                table: "OAuthToken",
                column: "LastUsed");

            migrationBuilder.CreateIndex(
                name: "IX_OAuthToken_Platform_IsValid",
                table: "OAuthToken",
                columns: new[] { "Platform", "IsValid" });

            migrationBuilder.CreateIndex(
                name: "IX_OAuthToken_PlatformConfigId",
                table: "OAuthToken",
                column: "PlatformConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_OAuthToken_UserId_IsValid",
                table: "OAuthToken",
                columns: new[] { "UserId", "IsValid" });

            migrationBuilder.CreateIndex(
                name: "IX_OAuthToken_UserId_Platform",
                table: "OAuthToken",
                columns: new[] { "UserId", "Platform" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordHistory_UserId_CreatedAt",
                table: "PasswordHistory",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_ExpiresAt",
                table: "PasswordResetTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_UserId_IsUsed",
                table: "PasswordResetTokens",
                columns: new[] { "UserId", "IsUsed" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAnalytics_CorrelationId",
                table: "PaymentAnalytics",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAnalytics_EventType_Timestamp",
                table: "PaymentAnalytics",
                columns: new[] { "EventType", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAnalytics_User_Timestamp",
                table: "PaymentAnalytics",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentConfiguration_Category_IsActive",
                table: "PaymentConfigurations",
                columns: new[] { "Category", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentConfigurations_Key",
                table: "PaymentConfigurations",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentMethod_User_IsActive",
                table: "PaymentMethods",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentMethod_User_IsDefault",
                table: "PaymentMethods",
                columns: new[] { "UserId", "IsDefault" },
                filter: "\"IsDefault\" = true");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentMethods_StripeCustomerId",
                table: "PaymentMethods",
                column: "StripeCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentMethods_StripePaymentMethodId",
                table: "PaymentMethods",
                column: "StripePaymentMethodId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecoverySession_SessionToken",
                table: "PaymentRecoverySessions",
                column: "SessionToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecoverySession_Status_ExpiresAt",
                table: "PaymentRecoverySessions",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecoverySession_User_Status",
                table: "PaymentRecoverySessions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecoverySessions_FailedPaymentId",
                table: "PaymentRecoverySessions",
                column: "FailedPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRetryAttempt_FailedPayment_AttemptNumber",
                table: "PaymentRetryAttempts",
                columns: new[] { "FailedPaymentId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRetryAttempt_Status_AttemptedAt",
                table: "PaymentRetryAttempts",
                columns: new[] { "Status", "AttemptedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRetryAttempts_PaymentTransactionId",
                table: "PaymentRetryAttempts",
                column: "PaymentTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_CorrelationId",
                table: "PaymentTransaction",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_NextRetryAt_Status",
                table: "PaymentTransaction",
                columns: new[] { "NextRetryAt", "Status" },
                filter: "\"NextRetryAt\" IS NOT NULL AND \"Status\" = 'pending'");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_PaymentMethodId",
                table: "PaymentTransaction",
                column: "PaymentMethodId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_Status_CreatedAt",
                table: "PaymentTransaction",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_StripeCustomerId1",
                table: "PaymentTransaction",
                column: "StripeCustomerId1");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_StripePaymentIntentId",
                table: "PaymentTransaction",
                column: "StripePaymentIntentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_SubscriptionId",
                table: "PaymentTransaction",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_User_CreatedAt",
                table: "PaymentTransaction",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaywallAnalytics_CorrelationId",
                table: "PaywallAnalytics",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_PaywallAnalytics_EventType",
                table: "PaywallAnalytics",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_PaywallAnalytics_UserId_Timestamp",
                table: "PaywallAnalytics",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_PaywallEvents_UserId",
                table: "PaywallEvents",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Name",
                table: "Permissions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Resource_Action",
                table: "Permissions",
                columns: new[] { "Resource", "Action" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceCategories_CategoryKey",
                table: "PreferenceCategories",
                column: "CategoryKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceCategories_ParentCategoryId",
                table: "PreferenceCategories",
                column: "ParentCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceCategories_SortOrder",
                table: "PreferenceCategories",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceHistory_CategoryKey",
                table: "PreferenceHistory",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceHistory_CreatedAt",
                table: "PreferenceHistory",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceHistory_UserId",
                table: "PreferenceHistory",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceHistory_UserId_CategoryKey_PreferenceKey",
                table: "PreferenceHistory",
                columns: new[] { "UserId", "CategoryKey", "PreferenceKey" });

            migrationBuilder.CreateIndex(
                name: "IX_PrivacyComplianceReports_UserId",
                table: "PrivacyComplianceReports",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivacyImpactAssessments_UserId",
                table: "PrivacyImpactAssessments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivacySettings_UserId",
                table: "PrivacySettings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionRedemptions_Platform",
                table: "PromotionRedemptions",
                column: "Platform");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionRedemptions_PromotionId",
                table: "PromotionRedemptions",
                column: "PromotionId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionRedemptions_RedeemedAt",
                table: "PromotionRedemptions",
                column: "RedeemedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionRedemptions_UserId",
                table: "PromotionRedemptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionRedemptions_UserId_PromotionId",
                table: "PromotionRedemptions",
                columns: new[] { "UserId", "PromotionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_Code",
                table: "Promotions",
                column: "Code",
                unique: true,
                filter: "\"Code\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_IsActive",
                table: "Promotions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_IsActive_ExpiresAt",
                table: "Promotions",
                columns: new[] { "IsActive", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_StripeCouponId",
                table: "Promotions",
                column: "StripeCouponId");

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_StripePromotionCodeId",
                table: "Promotions",
                column: "StripePromotionCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationSettings_UserId",
                table: "RecommendationSettings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_PermissionId",
                table: "RolePermissions",
                columns: new[] { "RoleId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_Availability",
                table: "SearchableContents",
                columns: new[] { "AvailableCountriesCount", "AvailableServicesCount" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_Filtering",
                table: "SearchableContents",
                columns: new[] { "Type", "IsAdult", "Language" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_Freshness",
                table: "SearchableContents",
                columns: new[] { "UpdatedAt", "LastAvailabilityUpdate" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_FullTextSearch",
                table: "SearchableContents",
                columns: new[] { "SearchableTitle", "SearchableOverview", "SearchableCast", "SearchableCrew", "SearchableGenres" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_Ranking",
                table: "SearchableContents",
                columns: new[] { "Rating", "Popularity", "ViewCount" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_SearchableText",
                table: "SearchableContents",
                columns: new[] { "SearchableTitle", "SearchableGenres" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContent_Title_Type_Year",
                table: "SearchableContents",
                columns: new[] { "Title", "Type", "Year" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContents_CreatedAt_UpdatedAt",
                table: "SearchableContents",
                columns: new[] { "CreatedAt", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContents_Rating_Popularity",
                table: "SearchableContents",
                columns: new[] { "Rating", "Popularity" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContents_SearchableTitle",
                table: "SearchableContents",
                column: "SearchableTitle");

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContents_Title_OriginalTitle",
                table: "SearchableContents",
                columns: new[] { "Title", "OriginalTitle" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContents_TmdbId",
                table: "SearchableContents",
                column: "TmdbId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchableContents_Type_Year",
                table: "SearchableContents",
                columns: new[] { "Type", "Year" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_Cache",
                table: "SearchAnalytics",
                columns: new[] { "UsedCache", "CacheHitRate" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_CreatedAt_HitCount",
                table: "SearchAnalytics",
                columns: new[] { "CreatedAt", "HitCount" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_CreatedAt_Tier",
                table: "SearchAnalytics",
                columns: new[] { "CreatedAt", "PerformanceTier" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_ExecutionTimeMs",
                table: "SearchAnalytics",
                column: "ExecutionTimeMs");

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_Performance",
                table: "SearchAnalytics",
                columns: new[] { "ExecutionTimeMs", "ResultCount" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_QueryHash",
                table: "SearchAnalytics",
                column: "QueryHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalytics_Usage",
                table: "SearchAnalytics",
                columns: new[] { "HitCount", "HasClickthrough" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalyticsEvent_EventType_Timestamp",
                table: "SearchAnalyticsEvents",
                columns: new[] { "EventType", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalyticsEvent_Query",
                table: "SearchAnalyticsEvents",
                column: "Query");

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalyticsEvent_User_Session",
                table: "SearchAnalyticsEvents",
                columns: new[] { "UserId", "SessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchAnalyticsEvents_UserId_Timestamp",
                table: "SearchAnalyticsEvents",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchHistory_Date",
                table: "SearchHistories",
                column: "SearchedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SearchHistory_Query_Date",
                table: "SearchHistories",
                columns: new[] { "Query", "SearchedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchHistory_User_Date",
                table: "SearchHistories",
                columns: new[] { "UserId", "SearchedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchJourney_Session_Outcome",
                table: "SearchJourneys",
                columns: new[] { "SessionId", "Outcome" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchJourney_User_StartedAt",
                table: "SearchJourneys",
                columns: new[] { "UserId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchPerformanceAlert_Active_Severity",
                table: "SearchPerformanceAlerts",
                columns: new[] { "IsActive", "Severity" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchStep_Journey_StepNumber",
                table: "SearchSteps",
                columns: new[] { "JourneyId", "StepNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchTrend_Date_Score",
                table: "SearchTrends",
                columns: new[] { "Date", "TrendingScore" });

            migrationBuilder.CreateIndex(
                name: "IX_SearchTrend_Query_Date_Unique",
                table: "SearchTrends",
                columns: new[] { "Query", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchTrend_Rising_Score",
                table: "SearchTrends",
                columns: new[] { "IsRising", "TrendingScore" });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_CreatedAt",
                table: "SecurityEvents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_EventType",
                table: "SecurityEvents",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_RiskScore",
                table: "SecurityEvents",
                column: "RiskScore");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_UserId_CreatedAt",
                table: "SecurityEvents",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_UserId_EventType",
                table: "SecurityEvents",
                columns: new[] { "UserId", "EventType" });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityPreferences_UserId",
                table: "SecurityPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeoBatchJobs_CreatedAt",
                table: "SeoBatchJobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SeoBatchJobs_Status",
                table: "SeoBatchJobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SeoBatchJobs_TemplateId",
                table: "SeoBatchJobs",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_SeoKeywords_CompetitionScore",
                table: "SeoKeywords",
                column: "CompetitionScore");

            migrationBuilder.CreateIndex(
                name: "IX_SeoKeywords_Keyword",
                table: "SeoKeywords",
                column: "Keyword",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeoKeywords_SearchVolume",
                table: "SeoKeywords",
                column: "SearchVolume");

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetadata_ContentId_ContentType",
                table: "SeoMetadata",
                columns: new[] { "ContentId", "ContentType" });

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetadata_IsActive",
                table: "SeoMetadata",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetadata_LastUpdated",
                table: "SeoMetadata",
                column: "LastUpdated");

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetadata_Slug",
                table: "SeoMetadata",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetrics_Date",
                table: "SeoMetrics",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetrics_MetricType",
                table: "SeoMetrics",
                column: "MetricType");

            migrationBuilder.CreateIndex(
                name: "IX_SeoMetrics_Url",
                table: "SeoMetrics",
                column: "Url");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_ContentClusterId",
                table: "SeoPages",
                column: "ContentClusterId");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_GeneratedAt",
                table: "SeoPages",
                column: "GeneratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_IsPublished",
                table: "SeoPages",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_SeoTemplateId",
                table: "SeoPages",
                column: "SeoTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_Slug",
                table: "SeoPages",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_TemplateId",
                table: "SeoPages",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPages_ViewCount",
                table: "SeoPages",
                column: "ViewCount");

            migrationBuilder.CreateIndex(
                name: "IX_SeoPerformanceMetrics_PageId",
                table: "SeoPerformanceMetrics",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_SeoTemplates_CreatedAt",
                table: "SeoTemplates",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SeoTemplates_IsActive",
                table: "SeoTemplates",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SeoTemplates_Type",
                table: "SeoTemplates",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_ShareAbTestParticipations_TestId",
                table: "ShareAbTestParticipations",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareAbTestParticipations_UserId",
                table: "ShareAbTestParticipations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareClickEvents_ClickerUserId",
                table: "ShareClickEvents",
                column: "ClickerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareClickEvents_ShareEventId",
                table: "ShareClickEvents",
                column: "ShareEventId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkClick_ConvertedToRegistration",
                table: "ShareLinkClicks",
                column: "ConvertedToRegistration");

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkClick_ShareEvent_ClickedAt",
                table: "ShareLinkClicks",
                columns: new[] { "ShareEventId", "ClickedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkClicks_ConvertedUserId",
                table: "ShareLinkClicks",
                column: "ConvertedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkClicks_ShareLinkId",
                table: "ShareLinkClicks",
                column: "ShareLinkId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkClicks_UserId",
                table: "ShareLinkClicks",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkMapping_CreatedAt_IsActive",
                table: "ShareLinkMappings",
                columns: new[] { "CreatedAt", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkMapping_ShortCode",
                table: "ShareLinkMappings",
                column: "ShortCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinkMappings_ShareEventId",
                table: "ShareLinkMappings",
                column: "ShareEventId");

            migrationBuilder.CreateIndex(
                name: "IX_SitemapEntries_ChangeFrequency_Priority",
                table: "SitemapEntries",
                columns: new[] { "ChangeFrequency", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_SitemapEntries_LastModified",
                table: "SitemapEntries",
                column: "LastModified");

            migrationBuilder.CreateIndex(
                name: "IX_SitemapEntries_Url",
                table: "SitemapEntries",
                column: "Url",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialAccount_UserId",
                table: "SocialAccount",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivities_CreatedAt",
                table: "SocialActivities",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivities_Platform_ActivityType",
                table: "SocialActivities",
                columns: new[] { "Platform", "ActivityType" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivities_TargetUserId_CreatedAt",
                table: "SocialActivities",
                columns: new[] { "TargetUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivities_UserId_CreatedAt",
                table: "SocialActivities",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_ActivityTimestamp",
                table: "SocialActivityFeeds",
                column: "ActivityTimestamp");

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_ImportanceScore",
                table: "SocialActivityFeeds",
                column: "ImportanceScore");

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_IsPublic_ActivityTimestamp",
                table: "SocialActivityFeeds",
                columns: new[] { "IsPublic", "ActivityTimestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_Platform_ActivityType",
                table: "SocialActivityFeeds",
                columns: new[] { "Platform", "ActivityType" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_PlatformConfigId",
                table: "SocialActivityFeeds",
                column: "PlatformConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_TargetUserId",
                table: "SocialActivityFeeds",
                column: "TargetUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_UserId_ActivityTimestamp",
                table: "SocialActivityFeeds",
                columns: new[] { "UserId", "ActivityTimestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialActivityFeeds_UserId_IsRead",
                table: "SocialActivityFeeds",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialAnalytics_CreatedAt",
                table: "SocialAnalytics",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialAnalytics_LastActivityAt",
                table: "SocialAnalytics",
                column: "LastActivityAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialAnalytics_Platform_PeriodType",
                table: "SocialAnalytics",
                columns: new[] { "Platform", "PeriodType" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialAnalytics_PlatformConfigId",
                table: "SocialAnalytics",
                column: "PlatformConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialAnalytics_UserId_PeriodStart_PeriodEnd",
                table: "SocialAnalytics",
                columns: new[] { "UserId", "PeriodStart", "PeriodEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialConnections_ConnectedAt",
                table: "SocialConnections",
                column: "ConnectedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialConnections_Platform_IsTokenValid",
                table: "SocialConnections",
                columns: new[] { "Platform", "IsTokenValid" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialConnections_PlatformConfigId",
                table: "SocialConnections",
                column: "PlatformConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialConnections_SocialUserId",
                table: "SocialConnections",
                column: "SocialUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialConnections_UserId_Platform",
                table: "SocialConnections",
                columns: new[] { "UserId", "Platform" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialContentShares_UserId",
                table: "SocialContentShares",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialGraphConnections_FromUserId_ConnectionType",
                table: "SocialGraphConnections",
                columns: new[] { "FromUserId", "ConnectionType" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialGraphConnections_FromUserId_ToUserId_Platform",
                table: "SocialGraphConnections",
                columns: new[] { "FromUserId", "ToUserId", "Platform" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialGraphConnections_LastInteractionAt",
                table: "SocialGraphConnections",
                column: "LastInteractionAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialGraphConnections_Platform_IsActive",
                table: "SocialGraphConnections",
                columns: new[] { "Platform", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialGraphConnections_Strength",
                table: "SocialGraphConnections",
                column: "Strength");

            migrationBuilder.CreateIndex(
                name: "IX_SocialGraphConnections_ToUserId_ConnectionType",
                table: "SocialGraphConnections",
                columns: new[] { "ToUserId", "ConnectionType" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialInteraction_SocialAccountId",
                table: "SocialInteraction",
                column: "SocialAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialPlatformConfigurations_IsEnabled",
                table: "SocialPlatformConfigurations",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_SocialPlatformConfigurations_Platform",
                table: "SocialPlatformConfigurations",
                column: "Platform",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialPlatformConfigurations_UpdatedAt",
                table: "SocialPlatformConfigurations",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialPosts_SocialAccountId",
                table: "SocialPosts",
                column: "SocialAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialPrivacyConsents_ConsentGivenAt",
                table: "SocialPrivacyConsents",
                column: "ConsentGivenAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialPrivacyConsents_IsActive_IsGdprCompliant",
                table: "SocialPrivacyConsents",
                columns: new[] { "IsActive", "IsGdprCompliant" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialPrivacyConsents_LastConsentUpdate",
                table: "SocialPrivacyConsents",
                column: "LastConsentUpdate");

            migrationBuilder.CreateIndex(
                name: "IX_SocialPrivacyConsents_UserId",
                table: "SocialPrivacyConsents",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialPrivacyConsents_UserId1",
                table: "SocialPrivacyConsents",
                column: "UserId1");

            migrationBuilder.CreateIndex(
                name: "IX_SocialProofScores_UserId",
                table: "SocialProofScores",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialRecommendations_ExpiresAt",
                table: "SocialRecommendations",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialRecommendations_GeneratedAt",
                table: "SocialRecommendations",
                column: "GeneratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocialRecommendations_RecommendationType_Score",
                table: "SocialRecommendations",
                columns: new[] { "RecommendationType", "Score" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialRecommendations_UserId_IsActive",
                table: "SocialRecommendations",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialRelationship_GeoLeapUserId",
                table: "SocialRelationship",
                column: "GeoLeapUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialRelationship_SocialAccountId",
                table: "SocialRelationship",
                column: "SocialAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialShareEvent_Content_Platform",
                table: "SocialShareEvents",
                columns: new[] { "ContentId", "Platform" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialShareEvent_Status",
                table: "SocialShareEvents",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SocialShareEvent_User_CreatedAt",
                table: "SocialShareEvents",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialSharingPreferences_UserId",
                table: "SocialSharingPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StreamingServices_Category",
                table: "StreamingServices",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_StreamingServices_IsActive_SortOrder",
                table: "StreamingServices",
                columns: new[] { "IsActive", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_StreamingServices_Name",
                table: "StreamingServices",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StripeCustomer_Email",
                table: "StripeCustomers",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_StripeCustomers_StripeCustomerId",
                table: "StripeCustomers",
                column: "StripeCustomerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StripeCustomers_UserId",
                table: "StripeCustomers",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subscription_Status_CurrentPeriodEnd",
                table: "Subscriptions",
                columns: new[] { "Status", "CurrentPeriodEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_Subscription_User_Status",
                table: "Subscriptions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_StripeCustomerId",
                table: "Subscriptions",
                column: "StripeCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_StripeSubscriptionId",
                table: "Subscriptions",
                column: "StripeSubscriptionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportActionAuditLog_Action_CreatedAt",
                table: "SupportActionAuditLogs",
                columns: new[] { "SupportActionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportActionAuditLog_CorrelationId",
                table: "SupportActionAuditLogs",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportActionAuditLog_User_CreatedAt",
                table: "SupportActionAuditLogs",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportAction_ActionType_Status",
                table: "SupportActions",
                columns: new[] { "ActionType", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportAction_CorrelationId",
                table: "SupportActions",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportAction_PendingActions",
                table: "SupportActions",
                columns: new[] { "Status", "CreatedAt" },
                filter: "\"Status\" IN (0, 5)");

            migrationBuilder.CreateIndex(
                name: "IX_SupportAction_Status_Priority",
                table: "SupportActions",
                columns: new[] { "Status", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportAction_SupportAgent_CreatedAt",
                table: "SupportActions",
                columns: new[] { "SupportAgentId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportAction_TargetUser_CreatedAt",
                table: "SupportActions",
                columns: new[] { "TargetUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportActions_ApprovedBy",
                table: "SupportActions",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SupportActions_InvoiceId",
                table: "SupportActions",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportActions_PaymentTransactionId",
                table: "SupportActions",
                column: "PaymentTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportActions_RejectedBy",
                table: "SupportActions",
                column: "RejectedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SupportActions_SubscriptionId",
                table: "SupportActions",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefund_CorrelationId",
                table: "SupportRefunds",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefund_Status_CreatedAt",
                table: "SupportRefunds",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefund_StripeRefundId",
                table: "SupportRefunds",
                column: "StripeRefundId",
                unique: true,
                filter: "\"StripeRefundId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefund_User_CreatedAt",
                table: "SupportRefunds",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefunds_PaymentTransactionId",
                table: "SupportRefunds",
                column: "PaymentTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefunds_ProcessedBy",
                table: "SupportRefunds",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SupportRefunds_SupportActionId",
                table: "SupportRefunds",
                column: "SupportActionId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAlerts_CreatedAt",
                table: "SystemAlerts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAlerts_IsResolved",
                table: "SystemAlerts",
                column: "IsResolved");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAlerts_Severity",
                table: "SystemAlerts",
                column: "Severity");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAlerts_Type",
                table: "SystemAlerts",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_TaxCalculation_Country_State",
                table: "TaxCalculations",
                columns: new[] { "Country", "StateProvince" });

            migrationBuilder.CreateIndex(
                name: "IX_TaxCalculation_Invoice_TaxType",
                table: "TaxCalculations",
                columns: new[] { "InvoiceId", "TaxType" });

            migrationBuilder.CreateIndex(
                name: "IX_TmdbExternalId_PersonDetailsId",
                table: "TmdbExternalId",
                column: "PersonDetailsId");

            migrationBuilder.CreateIndex(
                name: "IX_UserActivityLog_ActivityType",
                table: "UserActivityLog",
                column: "ActivityType");

            migrationBuilder.CreateIndex(
                name: "IX_UserActivityLog_CreatedAt",
                table: "UserActivityLog",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserActivityLog_UserId_CreatedAt",
                table: "UserActivityLog",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserAuditLogs_AffectedUserId",
                table: "UserAuditLogs",
                column: "AffectedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAuditLogs_PermissionId",
                table: "UserAuditLogs",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAuditLogs_Resource_Action",
                table: "UserAuditLogs",
                columns: new[] { "Resource", "Action" });

            migrationBuilder.CreateIndex(
                name: "IX_UserAuditLogs_RoleId",
                table: "UserAuditLogs",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAuditLogs_Timestamp",
                table: "UserAuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_UserAuditLogs_UserId_Timestamp",
                table: "UserAuditLogs",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorEvents_EventType_ServerTimestamp",
                table: "UserBehaviorEvents",
                columns: new[] { "EventType", "ServerTimestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorEvents_UserBehaviorSessionId",
                table: "UserBehaviorEvents",
                column: "UserBehaviorSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorEvents_UserId_ServerTimestamp",
                table: "UserBehaviorEvents",
                columns: new[] { "UserId", "ServerTimestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorFunnelSteps_FunnelId",
                table: "UserBehaviorFunnelSteps",
                column: "FunnelId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorInsights_InsightType_PeriodStart",
                table: "UserBehaviorInsights",
                columns: new[] { "InsightType", "PeriodStart" });

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorSessions_SessionId",
                table: "UserBehaviorSessions",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBehaviorSessions_UserId_StartTime",
                table: "UserBehaviorSessions",
                columns: new[] { "UserId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_UserContentInteractions_UserId",
                table: "UserContentInteractions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserContentPreferences_UserId_ContentType",
                table: "UserContentPreferences",
                columns: new[] { "UserId", "ContentType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserImpersonationSessions_AdminUserId_StartedAt",
                table: "UserImpersonationSessions",
                columns: new[] { "AdminUserId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserImpersonationSessions_ImpersonatedUserId_StartedAt",
                table: "UserImpersonationSessions",
                columns: new[] { "ImpersonatedUserId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserImpersonationSessions_IsActive",
                table: "UserImpersonationSessions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_UserImpersonationSessions_SessionToken",
                table: "UserImpersonationSessions",
                column: "SessionToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserNotifications_UserId",
                table: "UserNotifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserOnboardings_UserId",
                table: "UserOnboardings",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPreference_CategoryKey",
                table: "UserPreference",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_UserPreference_UpdatedAt",
                table: "UserPreference",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserPreference_UserId_CategoryKey_PreferenceKey",
                table: "UserPreference",
                columns: new[] { "UserId", "CategoryKey", "PreferenceKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRegionPreferences_UserId_CountryCode",
                table: "UserRegionPreferences",
                columns: new[] { "UserId", "CountryCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSearchUsages_Date",
                table: "UserSearchUsages",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_UserSearchUsages_UserId_Date",
                table: "UserSearchUsages",
                columns: new[] { "UserId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_ExpiresAt",
                table: "UserSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_LastAccessedAt",
                table: "UserSessions",
                column: "LastAccessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_RefreshToken",
                table: "UserSessions",
                column: "RefreshToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_UserId_IsActive",
                table: "UserSessions",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_UserId1",
                table: "UserSessions",
                column: "UserId1");

            migrationBuilder.CreateIndex(
                name: "IX_UserStreamingServices_StreamingServiceId",
                table: "UserStreamingServices",
                column: "StreamingServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_UserStreamingServices_UserId_IsActive",
                table: "UserStreamingServices",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_UserStreamingServices_UserId_StreamingServiceId",
                table: "UserStreamingServices",
                columns: new[] { "UserId", "StreamingServiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserStreamingSubscriptions_UserId",
                table: "UserStreamingSubscriptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_EndDate",
                table: "UserSubscriptions",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_UserId_IsActive",
                table: "UserSubscriptions",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_UserVpnPreferences_UserId",
                table: "UserVpnPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VpnBestPractices_Category",
                table: "VpnBestPractices",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_VpnBestPractices_DisplayOrder",
                table: "VpnBestPractices",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_VpnBestPractices_HelpfulnessRating",
                table: "VpnBestPractices",
                column: "HelpfulnessRating");

            migrationBuilder.CreateIndex(
                name: "IX_VpnBestPractices_ImportanceLevel",
                table: "VpnBestPractices",
                column: "ImportanceLevel");

            migrationBuilder.CreateIndex(
                name: "IX_VpnBestPractices_IsActive",
                table: "VpnBestPractices",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_EventType",
                table: "VpnGuidanceAnalytics",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_EventType_Timestamp",
                table: "VpnGuidanceAnalytics",
                columns: new[] { "EventType", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_GuideId",
                table: "VpnGuidanceAnalytics",
                column: "GuideId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_SessionId",
                table: "VpnGuidanceAnalytics",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_Timestamp",
                table: "VpnGuidanceAnalytics",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_UserId",
                table: "VpnGuidanceAnalytics",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_UserId_EventType_Timestamp",
                table: "VpnGuidanceAnalytics",
                columns: new[] { "UserId", "EventType", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_VpnGuidanceAnalytics_VpnProviderId",
                table: "VpnGuidanceAnalytics",
                column: "VpnProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnLegalDisclaimers_CountryCode",
                table: "VpnLegalDisclaimers",
                column: "CountryCode");

            migrationBuilder.CreateIndex(
                name: "IX_VpnLegalDisclaimers_DisplayOrder",
                table: "VpnLegalDisclaimers",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_VpnLegalDisclaimers_EffectiveDate",
                table: "VpnLegalDisclaimers",
                column: "EffectiveDate");

            migrationBuilder.CreateIndex(
                name: "IX_VpnLegalDisclaimers_IsActive",
                table: "VpnLegalDisclaimers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_VpnLegalDisclaimers_IsRequired",
                table: "VpnLegalDisclaimers",
                column: "IsRequired");

            migrationBuilder.CreateIndex(
                name: "IX_VpnLegalDisclaimers_Type",
                table: "VpnLegalDisclaimers",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_VpnPerformanceSnapshots_CapturedAt",
                table: "VpnPerformanceSnapshots",
                column: "CapturedAt");

            migrationBuilder.CreateIndex(
                name: "IX_VpnPerformanceSnapshots_RegionCode",
                table: "VpnPerformanceSnapshots",
                column: "RegionCode");

            migrationBuilder.CreateIndex(
                name: "IX_VpnPerformanceSnapshots_VpnProviderId",
                table: "VpnPerformanceSnapshots",
                column: "VpnProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnPerformanceSnapshots_VpnProviderId_RegionCode_CapturedAt",
                table: "VpnPerformanceSnapshots",
                columns: new[] { "VpnProviderId", "RegionCode", "CapturedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviderRatings_CreatedAt",
                table: "VpnProviderRatings",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviderRatings_Rating",
                table: "VpnProviderRatings",
                column: "Rating");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviderRatings_UserId",
                table: "VpnProviderRatings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviderRatings_UserId_VpnProviderId",
                table: "VpnProviderRatings",
                columns: new[] { "UserId", "VpnProviderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviderRatings_VpnProviderId",
                table: "VpnProviderRatings",
                column: "VpnProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviders_DisplayOrder",
                table: "VpnProviders",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviders_IsActive",
                table: "VpnProviders",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviders_IsFeatured",
                table: "VpnProviders",
                column: "IsFeatured");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviders_Name",
                table: "VpnProviders",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_VpnProviders_OverallRating",
                table: "VpnProviders",
                column: "OverallRating");

            migrationBuilder.CreateIndex(
                name: "IX_VpnServerLocations_Country",
                table: "VpnServerLocations",
                column: "Country");

            migrationBuilder.CreateIndex(
                name: "IX_VpnServerLocations_CountryCode",
                table: "VpnServerLocations",
                column: "CountryCode");

            migrationBuilder.CreateIndex(
                name: "IX_VpnServerLocations_IsOptimizedForStreaming",
                table: "VpnServerLocations",
                column: "IsOptimizedForStreaming");

            migrationBuilder.CreateIndex(
                name: "IX_VpnServerLocations_IsP2PFriendly",
                table: "VpnServerLocations",
                column: "IsP2PFriendly");

            migrationBuilder.CreateIndex(
                name: "IX_VpnServerLocations_VpnProviderId",
                table: "VpnServerLocations",
                column: "VpnProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnSetupGuides_Difficulty",
                table: "VpnSetupGuides",
                column: "Difficulty");

            migrationBuilder.CreateIndex(
                name: "IX_VpnSetupGuides_HelpfulnessRating",
                table: "VpnSetupGuides",
                column: "HelpfulnessRating");

            migrationBuilder.CreateIndex(
                name: "IX_VpnSetupGuides_IsActive",
                table: "VpnSetupGuides",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_VpnSetupGuides_Platform",
                table: "VpnSetupGuides",
                column: "Platform");

            migrationBuilder.CreateIndex(
                name: "IX_VpnSetupGuides_VpnProviderId",
                table: "VpnSetupGuides",
                column: "VpnProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnStreamingCompatibilities_LastTested",
                table: "VpnStreamingCompatibilities",
                column: "LastTested");

            migrationBuilder.CreateIndex(
                name: "IX_VpnStreamingCompatibilities_Status",
                table: "VpnStreamingCompatibilities",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_VpnStreamingCompatibilities_StreamingServiceId",
                table: "VpnStreamingCompatibilities",
                column: "StreamingServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnStreamingCompatibilities_VpnProviderId",
                table: "VpnStreamingCompatibilities",
                column: "VpnProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_VpnStreamingCompatibilities_VpnProviderId_StreamingServiceId",
                table: "VpnStreamingCompatibilities",
                columns: new[] { "VpnProviderId", "StreamingServiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistActivities_UserId",
                table: "WatchlistActivities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistActivities_WatchlistId",
                table: "WatchlistActivities",
                column: "WatchlistId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistActivities_WatchlistItemId",
                table: "WatchlistActivities",
                column: "WatchlistItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistCategories_UserId",
                table: "WatchlistCategories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistItemAvailabilities_WatchlistItemId",
                table: "WatchlistItemAvailabilities",
                column: "WatchlistItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistItems_ContentId",
                table: "WatchlistItems",
                column: "ContentId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistItems_WatchlistId_AddedAt",
                table: "WatchlistItems",
                columns: new[] { "WatchlistId", "AddedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistNotificationSettings_UserId",
                table: "WatchlistNotificationSettings",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Watchlists_CategoryId",
                table: "Watchlists",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Watchlists_UserId_IsDefault",
                table: "Watchlists",
                columns: new[] { "UserId", "IsDefault" });

            migrationBuilder.CreateIndex(
                name: "IX_Watchlists_UserId_IsFavorite",
                table: "Watchlists",
                columns: new[] { "UserId", "IsFavorite" });

            migrationBuilder.CreateIndex(
                name: "IX_Watchlists_UserId_UpdatedAt",
                table: "Watchlists",
                columns: new[] { "UserId", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistSettings_WatchlistId",
                table: "WatchlistSettings",
                column: "WatchlistId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistShares_SharedWithUserId",
                table: "WatchlistShares",
                column: "SharedWithUserId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistShares_WatchlistId",
                table: "WatchlistShares",
                column: "WatchlistId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistViews_UserId",
                table: "WatchlistViews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvent_CorrelationId",
                table: "WebhookEvent",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvent_EventType_CreatedAt",
                table: "WebhookEvent",
                columns: new[] { "EventType", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvent_ProcessingStatus_NextRetryAt",
                table: "WebhookEvent",
                columns: new[] { "ProcessingStatus", "NextRetryAt" },
                filter: "\"ProcessingStatus\" = 'pending' AND \"NextRetryAt\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvent_StripeEventId",
                table: "WebhookEvent",
                column: "StripeEventId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbTestConversions");

            migrationBuilder.DropTable(
                name: "AbTestVariant");

            migrationBuilder.DropTable(
                name: "AdminActions");

            migrationBuilder.DropTable(
                name: "AdminConfigurationSetting");

            migrationBuilder.DropTable(
                name: "AdminDataExports");

            migrationBuilder.DropTable(
                name: "AdminNotifications");

            migrationBuilder.DropTable(
                name: "AdminSessions");

            migrationBuilder.DropTable(
                name: "AlertTriggers");

            migrationBuilder.DropTable(
                name: "ApiCostRecords");

            migrationBuilder.DropTable(
                name: "ApiUsageRecords");

            migrationBuilder.DropTable(
                name: "AppStoreReviews");

            migrationBuilder.DropTable(
                name: "AsoAbTests");

            migrationBuilder.DropTable(
                name: "AsoAnalytics");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "AttributionModels");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "AvailabilityTestResults");

            migrationBuilder.DropTable(
                name: "AzureMonitorAlertRules");

            migrationBuilder.DropTable(
                name: "BudgetAlerts");

            migrationBuilder.DropTable(
                name: "BudgetConfigurations");

            migrationBuilder.DropTable(
                name: "BusinessAlerts");

            migrationBuilder.DropTable(
                name: "CachePersistenceEntries");

            migrationBuilder.DropTable(
                name: "CastMember");

            migrationBuilder.DropTable(
                name: "ConfigurationBackups");

            migrationBuilder.DropTable(
                name: "ConfigurationChangeHistory");

            migrationBuilder.DropTable(
                name: "ConsentRecords");

            migrationBuilder.DropTable(
                name: "ContentAlternativeTitles");

            migrationBuilder.DropTable(
                name: "ContentMetadata");

            migrationBuilder.DropTable(
                name: "ContentPopularityData");

            migrationBuilder.DropTable(
                name: "ContentRatings");

            migrationBuilder.DropTable(
                name: "ContentSharePerformances");

            migrationBuilder.DropTable(
                name: "ContentSharingMetrics");

            migrationBuilder.DropTable(
                name: "ContentStreamingOptions");

            migrationBuilder.DropTable(
                name: "ContentVariables");

            migrationBuilder.DropTable(
                name: "core_web_vitals");

            migrationBuilder.DropTable(
                name: "CostOptimizationRecommendations");

            migrationBuilder.DropTable(
                name: "CrewMember");

            migrationBuilder.DropTable(
                name: "CrossBorderTransferRecords");

            migrationBuilder.DropTable(
                name: "CustomerBillingAccessLogs");

            migrationBuilder.DropTable(
                name: "CustomPerformanceCounters");

            migrationBuilder.DropTable(
                name: "CustomUserRoles");

            migrationBuilder.DropTable(
                name: "DataRetentionPolicies");

            migrationBuilder.DropTable(
                name: "DataSubjectRequests");

            migrationBuilder.DropTable(
                name: "DefaultPreferences");

            migrationBuilder.DropTable(
                name: "DunningAnalytics");

            migrationBuilder.DropTable(
                name: "DunningConfigurations");

            migrationBuilder.DropTable(
                name: "DunningNotifications");

            migrationBuilder.DropTable(
                name: "ExperimentAssignments");

            migrationBuilder.DropTable(
                name: "ExperimentEvents");

            migrationBuilder.DropTable(
                name: "ExperimentVariants");

            migrationBuilder.DropTable(
                name: "FunnelSteps");

            migrationBuilder.DropTable(
                name: "Genre");

            migrationBuilder.DropTable(
                name: "GracePeriods");

            migrationBuilder.DropTable(
                name: "GrowthEvents");

            migrationBuilder.DropTable(
                name: "InvoiceDeliveries");

            migrationBuilder.DropTable(
                name: "InvoiceLineItems");

            migrationBuilder.DropTable(
                name: "InvoiceTemplates");

            migrationBuilder.DropTable(
                name: "KeywordRankings");

            migrationBuilder.DropTable(
                name: "MobileSubscriptions");

            migrationBuilder.DropTable(
                name: "MonitoringAlerts");

            migrationBuilder.DropTable(
                name: "NotificationDeliveries");

            migrationBuilder.DropTable(
                name: "NotificationDeliveryLogs");

            migrationBuilder.DropTable(
                name: "NotificationInteractions");

            migrationBuilder.DropTable(
                name: "NotificationPreferences");

            migrationBuilder.DropTable(
                name: "NotificationQueues");

            migrationBuilder.DropTable(
                name: "NotificationRateLimits");

            migrationBuilder.DropTable(
                name: "NotificationSettings");

            migrationBuilder.DropTable(
                name: "NotificationTemplates");

            migrationBuilder.DropTable(
                name: "OAuthStates");

            migrationBuilder.DropTable(
                name: "OAuthToken");

            migrationBuilder.DropTable(
                name: "OnboardingSessions");

            migrationBuilder.DropTable(
                name: "PasswordHistory");

            migrationBuilder.DropTable(
                name: "PasswordResetTokens");

            migrationBuilder.DropTable(
                name: "PaymentAnalytics");

            migrationBuilder.DropTable(
                name: "PaymentConfigurations");

            migrationBuilder.DropTable(
                name: "PaymentRecoverySessions");

            migrationBuilder.DropTable(
                name: "PaymentRetryAttempts");

            migrationBuilder.DropTable(
                name: "PaywallAnalytics");

            migrationBuilder.DropTable(
                name: "PaywallEvents");

            migrationBuilder.DropTable(
                name: "PerformanceThresholds");

            migrationBuilder.DropTable(
                name: "PreferenceHistory");

            migrationBuilder.DropTable(
                name: "PrivacyComplianceReports");

            migrationBuilder.DropTable(
                name: "PrivacyImpactAssessments");

            migrationBuilder.DropTable(
                name: "PrivacySettings");

            migrationBuilder.DropTable(
                name: "PromotionRedemptions");

            migrationBuilder.DropTable(
                name: "RecommendationSettings");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "ScheduledExports");

            migrationBuilder.DropTable(
                name: "SearchAnalytics");

            migrationBuilder.DropTable(
                name: "SearchAnalyticsEvents");

            migrationBuilder.DropTable(
                name: "SearchHistories");

            migrationBuilder.DropTable(
                name: "SearchPerformanceAlerts");

            migrationBuilder.DropTable(
                name: "SearchSteps");

            migrationBuilder.DropTable(
                name: "SearchTrends");

            migrationBuilder.DropTable(
                name: "SecurityEvents");

            migrationBuilder.DropTable(
                name: "SecurityPreferences");

            migrationBuilder.DropTable(
                name: "SeoBatchJobs");

            migrationBuilder.DropTable(
                name: "SeoKeywords");

            migrationBuilder.DropTable(
                name: "SeoMetadata");

            migrationBuilder.DropTable(
                name: "SeoMetrics");

            migrationBuilder.DropTable(
                name: "SeoPerformanceMetrics");

            migrationBuilder.DropTable(
                name: "ShareAbTestParticipations");

            migrationBuilder.DropTable(
                name: "ShareClickEvents");

            migrationBuilder.DropTable(
                name: "ShareLinkClicks");

            migrationBuilder.DropTable(
                name: "ShareLinkMappings");

            migrationBuilder.DropTable(
                name: "SitemapEntries");

            migrationBuilder.DropTable(
                name: "SocialActivities");

            migrationBuilder.DropTable(
                name: "SocialActivityFeeds");

            migrationBuilder.DropTable(
                name: "SocialAnalytics");

            migrationBuilder.DropTable(
                name: "SocialConnections");

            migrationBuilder.DropTable(
                name: "SocialContentShares");

            migrationBuilder.DropTable(
                name: "SocialGraphConnections");

            migrationBuilder.DropTable(
                name: "SocialInteraction");

            migrationBuilder.DropTable(
                name: "SocialPosts");

            migrationBuilder.DropTable(
                name: "SocialPrivacyConsents");

            migrationBuilder.DropTable(
                name: "SocialProofScores");

            migrationBuilder.DropTable(
                name: "SocialRecommendations");

            migrationBuilder.DropTable(
                name: "SocialRelationship");

            migrationBuilder.DropTable(
                name: "SocialShares");

            migrationBuilder.DropTable(
                name: "SocialSharingPreferences");

            migrationBuilder.DropTable(
                name: "StreamingContents");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "SupportActionAuditLogs");

            migrationBuilder.DropTable(
                name: "SupportRefunds");

            migrationBuilder.DropTable(
                name: "SystemAlerts");

            migrationBuilder.DropTable(
                name: "TaxCalculations");

            migrationBuilder.DropTable(
                name: "TmdbExternalId");

            migrationBuilder.DropTable(
                name: "TypoCorrection");

            migrationBuilder.DropTable(
                name: "UserActivityLog");

            migrationBuilder.DropTable(
                name: "UserAuditLogs");

            migrationBuilder.DropTable(
                name: "UserBehaviorEvents");

            migrationBuilder.DropTable(
                name: "UserBehaviorFunnelSteps");

            migrationBuilder.DropTable(
                name: "UserBehaviorInsights");

            migrationBuilder.DropTable(
                name: "UserContentInteractions");

            migrationBuilder.DropTable(
                name: "UserContentPreferences");

            migrationBuilder.DropTable(
                name: "UserImpersonationSessions");

            migrationBuilder.DropTable(
                name: "UserNotifications");

            migrationBuilder.DropTable(
                name: "UserOnboardings");

            migrationBuilder.DropTable(
                name: "UserPreference");

            migrationBuilder.DropTable(
                name: "UserPreferences");

            migrationBuilder.DropTable(
                name: "UserRegionPreferences");

            migrationBuilder.DropTable(
                name: "UserSearchUsages");

            migrationBuilder.DropTable(
                name: "UserSessions");

            migrationBuilder.DropTable(
                name: "UserStreamingServices");

            migrationBuilder.DropTable(
                name: "UserStreamingSubscriptions");

            migrationBuilder.DropTable(
                name: "UserSubscriptions");

            migrationBuilder.DropTable(
                name: "UserVpnPreferences");

            migrationBuilder.DropTable(
                name: "ViralMetrics");

            migrationBuilder.DropTable(
                name: "VpnBestPractices");

            migrationBuilder.DropTable(
                name: "VpnGuidanceAnalytics");

            migrationBuilder.DropTable(
                name: "VpnLegalDisclaimers");

            migrationBuilder.DropTable(
                name: "VpnPerformanceSnapshots");

            migrationBuilder.DropTable(
                name: "VpnProviderRatings");

            migrationBuilder.DropTable(
                name: "VpnServerLocations");

            migrationBuilder.DropTable(
                name: "VpnSetupGuides");

            migrationBuilder.DropTable(
                name: "VpnStreamingCompatibilities");

            migrationBuilder.DropTable(
                name: "WatchlistActivities");

            migrationBuilder.DropTable(
                name: "WatchlistItemAvailabilities");

            migrationBuilder.DropTable(
                name: "WatchlistNotificationSettings");

            migrationBuilder.DropTable(
                name: "WatchlistSettings");

            migrationBuilder.DropTable(
                name: "WatchlistShares");

            migrationBuilder.DropTable(
                name: "WatchlistViews");

            migrationBuilder.DropTable(
                name: "WebhookEvent");

            migrationBuilder.DropTable(
                name: "AbTestAssignments");

            migrationBuilder.DropTable(
                name: "AbTestExperiments");

            migrationBuilder.DropTable(
                name: "GrowthAlerts");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "SearchableContents");

            migrationBuilder.DropTable(
                name: "DunningCampaignExecutions");

            migrationBuilder.DropTable(
                name: "DunningSteps");

            migrationBuilder.DropTable(
                name: "ABExperiments");

            migrationBuilder.DropTable(
                name: "ConversionFunnels");

            migrationBuilder.DropTable(
                name: "AppStoreListings");

            migrationBuilder.DropTable(
                name: "AsoKeywords");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Promotions");

            migrationBuilder.DropTable(
                name: "SearchJourneys");

            migrationBuilder.DropTable(
                name: "SeoPages");

            migrationBuilder.DropTable(
                name: "ShareAbTests");

            migrationBuilder.DropTable(
                name: "ShareLinks");

            migrationBuilder.DropTable(
                name: "SocialShareEvents");

            migrationBuilder.DropTable(
                name: "SocialPlatformConfigurations");

            migrationBuilder.DropTable(
                name: "SocialAccount");

            migrationBuilder.DropTable(
                name: "SupportActions");

            migrationBuilder.DropTable(
                name: "PersonDetails");

            migrationBuilder.DropTable(
                name: "CustomRoles");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "UserBehaviorSessions");

            migrationBuilder.DropTable(
                name: "UserBehaviorFunnels");

            migrationBuilder.DropTable(
                name: "PreferenceCategories");

            migrationBuilder.DropTable(
                name: "StreamingServices");

            migrationBuilder.DropTable(
                name: "VpnProviders");

            migrationBuilder.DropTable(
                name: "WatchlistItems");

            migrationBuilder.DropTable(
                name: "FailedPayments");

            migrationBuilder.DropTable(
                name: "DunningCampaigns");

            migrationBuilder.DropTable(
                name: "NotificationCampaigns");

            migrationBuilder.DropTable(
                name: "ContentClusters");

            migrationBuilder.DropTable(
                name: "SeoTemplates");

            migrationBuilder.DropTable(
                name: "Invoices");

            migrationBuilder.DropTable(
                name: "Watchlists");

            migrationBuilder.DropTable(
                name: "BillingAddresses");

            migrationBuilder.DropTable(
                name: "PaymentTransaction");

            migrationBuilder.DropTable(
                name: "WatchlistCategories");

            migrationBuilder.DropTable(
                name: "PaymentMethods");

            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "StripeCustomers");

            migrationBuilder.DropTable(
                name: "AspNetUsers");
        }
    }
}
