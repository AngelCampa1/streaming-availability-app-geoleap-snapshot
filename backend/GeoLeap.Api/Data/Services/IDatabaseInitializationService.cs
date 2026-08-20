namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Service interface for database initialization and migration operations
/// </summary>
public interface IDatabaseInitializationService
{
    Task<bool> EnsureDatabaseCreatedAsync(CancellationToken cancellationToken = default);
    Task<bool> ApplyPendingMigrationsAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<string>> GetPendingMigrationsAsync(CancellationToken cancellationToken = default);
    Task<bool> DatabaseExistsAsync(CancellationToken cancellationToken = default);
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
    Task<string> GetDatabaseVersionAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<string, object>> GetDatabaseInfoAsync(CancellationToken cancellationToken = default);
    Task SeedInitialDataAsync(CancellationToken cancellationToken = default);
    Task ValidateDatabaseIntegrityAsync(CancellationToken cancellationToken = default);
}