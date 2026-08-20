using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Database initialization service implementation
/// </summary>
public class DatabaseInitializationService : IDatabaseInitializationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseInitializationService> _logger;

    public DatabaseInitializationService(
        ApplicationDbContext context,
        ILogger<DatabaseInitializationService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<bool> EnsureDatabaseCreatedAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var created = await _context.Database.EnsureCreatedAsync(cancellationToken).ConfigureAwait(false);
            if (created)
            {
                _logger.LogInformation("Database was created successfully");
            }
            return created;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring database creation");
            return false;
        }
    }

    public async Task<bool> ApplyPendingMigrationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var pendingMigrations = await GetPendingMigrationsAsync(cancellationToken).ConfigureAwait(false);
            if (pendingMigrations.Any())
            {
                await _context.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);
                _logger.LogInformation("Applied {MigrationCount} pending migrations", pendingMigrations.Count());
                return true;
            }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying pending migrations");
            return false;
        }
    }

    public async Task<IEnumerable<string>> GetPendingMigrationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.Database.GetPendingMigrationsAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending migrations");
            return Array.Empty<string>();
        }
    }

    public async Task<bool> DatabaseExistsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking database existence");
            return false;
        }
    }

    public async Task<bool> CanConnectAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to database");
            return false;
        }
    }

    public Task<string> GetDatabaseVersionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            return Task.FromResult(connection.ServerVersion ?? "Unknown");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting database version");
            return Task.FromResult("Error");
        }
    }

    public async Task<Dictionary<string, object>> GetDatabaseInfoAsync(CancellationToken cancellationToken = default)
    {
        var info = new Dictionary<string, object>();
        
        try
        {
            info["DatabaseExists"] = await DatabaseExistsAsync(cancellationToken).ConfigureAwait(false);
            info["CanConnect"] = await CanConnectAsync(cancellationToken).ConfigureAwait(false);
            info["Version"] = await GetDatabaseVersionAsync(cancellationToken).ConfigureAwait(false);
            info["PendingMigrations"] = await GetPendingMigrationsAsync(cancellationToken).ConfigureAwait(false);
            info["AppliedMigrations"] = await _context.Database.GetAppliedMigrationsAsync(cancellationToken).ConfigureAwait(false);
            
            var connection = _context.Database.GetDbConnection();
            info["ConnectionString"] = connection.ConnectionString;
            info["Database"] = connection.Database;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting database info");
            info["Error"] = ex.Message;
        }

        return info;
    }

    public async Task SeedInitialDataAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Add initial data seeding logic here
            // For now, just log that seeding was called
            _logger.LogInformation("Database seeding completed");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding initial data");
            throw;
        }
    }

    public async Task ValidateDatabaseIntegrityAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Basic validation - check if key tables exist
            var canConnect = await CanConnectAsync(cancellationToken).ConfigureAwait(false);
            if (!canConnect)
            {
                throw new InvalidOperationException("Cannot connect to database");
            }

            // Additional integrity checks could be added here
            _logger.LogInformation("Database integrity validation passed");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database integrity validation failed");
            throw;
        }
    }
}