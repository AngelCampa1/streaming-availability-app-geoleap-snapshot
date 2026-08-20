using CommandLine;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Seeder;
using GeoLeap.Seeder.Seeders;
using GeoLeap.Seeder.Seeders.Base;
using GeoLeap.Seeder.Validators;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;

// Build configuration
var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .Build();

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(configuration)
    .CreateLogger();

try
{
    Log.Information("GeoLeap Database Seeder starting...");

    // Parse command line arguments
    var parserResult = Parser.Default.ParseArguments<CommandLineOptions>(args);

    await parserResult.WithParsedAsync(async options =>
    {
        // Build service provider
        var services = new ServiceCollection();

        // Configuration
        services.AddSingleton<IConfiguration>(configuration);

        // Logging
        services.AddLogging(builder =>
        {
            builder.ClearProviders();
            builder.AddSerilog();
        });

        // Database context
        var connectionString = options.ConnectionString
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not configured");

        services.AddDbContext<ApplicationDbContext>(opts =>
        {
            opts.UseNpgsql(connectionString);
            opts.EnableSensitiveDataLogging(false);
        });

        // Identity services for UserManager/RoleManager
        services.AddIdentity<User, IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        // Load seeder configuration
        var seederConfig = LoadConfiguration(configuration, options);

        services.AddSingleton(seederConfig);

        // Register seeders
        services.AddTransient<ISeeder, UserSeeder>();
        services.AddTransient<ISeeder, ContentSeeder>();
        services.AddTransient<ISeeder, VpnSeeder>();
        // Add more seeders here as they are implemented

        // Register validators and orchestrator
        services.AddTransient<SeedingValidator>();
        services.AddTransient<SeederOrchestrator>();

        var serviceProvider = services.BuildServiceProvider();

        // Run seeding
        var orchestrator = serviceProvider.GetRequiredService<SeederOrchestrator>();
        var result = await orchestrator.SeedAsync(seederConfig);

        // Exit with appropriate code
        Environment.ExitCode = result.Success ? 0 : 1;
    });

    await parserResult.WithNotParsedAsync(errors =>
    {
        Environment.ExitCode = 1;
        return Task.CompletedTask;
    });
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    Environment.ExitCode = 1;
}
finally
{
    Log.CloseAndFlush();
}

static SeederConfiguration LoadConfiguration(IConfiguration configuration, CommandLineOptions options)
{
    var profileName = options.Profile ?? configuration["Seeding:DefaultProfile"] ?? "Standard";
    var profileSection = configuration.GetSection($"Seeding:Profiles:{profileName}");

    if (!profileSection.Exists())
    {
        throw new InvalidOperationException($"Profile '{profileName}' not found in configuration");
    }

    var profile = profileSection.Get<SeederProfile>()
        ?? throw new InvalidOperationException($"Failed to load profile '{profileName}'");

    var config = new SeederConfiguration
    {
        ProfileName = profileName,
        ConnectionString = options.ConnectionString
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? string.Empty,
        CleanDatabase = options.Clean,
        VerifyIntegrity = !options.SkipVerification,
        BatchSize = options.BatchSize ?? configuration.GetValue<int>("Seeding:BatchSize", 1000),
        RandomSeed = configuration.GetValue<int>("Seeding:RandomSeed", 12345),

        // Load profile values
        UserCount = options.UserCount ?? profile.UserCount,
        AdminCount = profile.AdminCount,
        ContentCount = options.ContentCount ?? profile.ContentCount,
        MoviesCount = profile.MoviesCount,
        TvShowsCount = profile.TvShowsCount,
        StreamingServicesCount = profile.StreamingServicesCount,
        VpnProviderCount = profile.VpnProviderCount,
        RatingsPerUser = profile.RatingsPerUser,
        SearchEventsPerUser = profile.SearchEventsPerUser,
        BehaviorEventsPerUser = profile.BehaviorEventsPerUser,
        WatchlistsPerUser = profile.WatchlistsPerUser,
        ItemsPerWatchlist = profile.ItemsPerWatchlist
    };

    return config;
}

class CommandLineOptions
{
    [Option('p', "profile", Required = false, HelpText = "Seeding profile (Minimal, Standard, Large)")]
    public string? Profile { get; set; }

    [Option('c', "connection", Required = false, HelpText = "Database connection string")]
    public string? ConnectionString { get; set; }

    [Option("clean", Required = false, HelpText = "Clean database before seeding")]
    public bool Clean { get; set; }

    [Option("skip-verification", Required = false, HelpText = "Skip post-seeding verification")]
    public bool SkipVerification { get; set; }

    [Option("users", Required = false, HelpText = "Override user count")]
    public int? UserCount { get; set; }

    [Option("content", Required = false, HelpText = "Override content count")]
    public int? ContentCount { get; set; }

    [Option("batch-size", Required = false, HelpText = "Batch size for inserts")]
    public int? BatchSize { get; set; }
}
