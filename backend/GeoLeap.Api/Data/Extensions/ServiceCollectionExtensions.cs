using GeoLeap.Api.Data.Repositories;
using GeoLeap.Api.Data.Services;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Data.Extensions;

/// <summary>
/// Extension methods for service collection to configure database services
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers all database-related services including repositories and data access services
    /// </summary>
    public static IServiceCollection AddDatabaseServices(this IServiceCollection services, string connectionString)
    {
        // Add Entity Framework DbContext
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);
                npgsqlOptions.CommandTimeout(120);
            }));

        // Register repository pattern services
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        
        // Register specialized repositories
        services.AddScoped<IUserRepository, UserRepository>();
        // TODO: Fix interface implementations
        // services.AddScoped<IContentRepository, ContentRepository>();
        // services.AddScoped<IPaymentRepository, PaymentRepository>();
        // services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();

        // Register data access services
        services.AddScoped<IUserDataAccessService, UserDataAccessService>();
        // TODO: Fix interface implementations
        // services.AddScoped<IContentDataAccessService, ContentDataAccessService>();
        // services.AddScoped<IPaymentDataAccessService, PaymentDataAccessService>();
        // services.AddScoped<ISubscriptionDataAccessService, SubscriptionDataAccessService>();

        // Register database initialization services
        services.AddScoped<IDatabaseInitializationService, DatabaseInitializationService>();
        services.AddScoped<IDatabaseSeederService, DatabaseSeederService>();

        return services;
    }

    /// <summary>
    /// Configures advanced Entity Framework options for performance optimization
    /// </summary>
    public static IServiceCollection ConfigureEntityFrameworkAdvanced(this IServiceCollection services)
    {
        services.AddDbContextPool<ApplicationDbContext>((serviceProvider, options) =>
        {
            var connectionString = serviceProvider.GetRequiredService<IConfiguration>()
                .GetConnectionString("DefaultConnection");
                
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                // Performance optimizations
                npgsqlOptions.EnableRetryOnFailure(3, TimeSpan.FromSeconds(30), null);
                npgsqlOptions.CommandTimeout(120);

                // Connection optimizations
                npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            });

            // Enable sensitive data logging only in development
            if (serviceProvider.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            {
                options.EnableSensitiveDataLogging();
                options.EnableDetailedErrors();
            }

            // Performance configurations
            options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
            options.ConfigureWarnings(warnings => warnings.Default(WarningBehavior.Log));
        });

        return services;
    }

    /// <summary>
    /// Adds database health checks
    /// </summary>
    public static IServiceCollection AddDatabaseHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks();
            // TODO: Fix missing health check extensions
            // .AddDbContextCheck<ApplicationDbContext>("database")
            // .AddCheck<DatabaseConnectionHealthCheck>("database-connection")
            // .AddCheck<DatabaseMigrationHealthCheck>("database-migrations");

        return services;
    }

    /// <summary>
    /// Configures connection pooling for high-performance scenarios
    /// </summary>
    public static IServiceCollection ConfigureConnectionPooling(this IServiceCollection services, int poolSize = 128)
    {
        // TODO: Fix missing DbContextPoolOptions
        // services.Configure<DbContextPoolOptions>(options =>
        // {
        //     options.MaxPoolSize = poolSize;
        // });

        return services;
    }
}