namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Interface for database seeding operations
/// </summary>
public interface IDatabaseSeederService
{
    Task SeedAsync(CancellationToken cancellationToken = default);
    Task SeedUsersAsync(CancellationToken cancellationToken = default);
    Task SeedRolesAsync(CancellationToken cancellationToken = default);
    Task SeedContentAsync(CancellationToken cancellationToken = default);
    Task SeedTestDataAsync(CancellationToken cancellationToken = default);
    Task<bool> IsDataSeededAsync(CancellationToken cancellationToken = default);
}