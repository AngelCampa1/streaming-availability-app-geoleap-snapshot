using GeoLeap.Api.Data;
using GeoLeap.Seeder.Seeders.Base;
using GeoLeap.Seeder.Validators;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Seeder;

public class SeederOrchestrator
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SeederOrchestrator> _logger;
    private readonly List<ISeeder> _seeders;
    private readonly SeedingValidator _validator;

    public SeederOrchestrator(
        ApplicationDbContext context,
        IEnumerable<ISeeder> seeders,
        SeedingValidator validator,
        ILogger<SeederOrchestrator> logger)
    {
        _context = context;
        _logger = logger;
        _seeders = seeders.OrderBy(s => s.Order).ToList();
        _validator = validator;
    }

    public async Task<SeederResult> SeedAsync(
        SeederConfiguration config,
        CancellationToken cancellationToken = default)
    {
        var result = new SeederResult { StartTime = DateTime.UtcNow };

        try
        {
            _logger.LogInformation("=== GeoLeap Database Seeder ===");
            _logger.LogInformation("Profile: {Profile}", config.ProfileName);
            _logger.LogInformation("User Count: {UserCount}", config.UserCount);
            _logger.LogInformation("Content Count: {ContentCount}", config.ContentCount);
            _logger.LogInformation("Batch Size: {BatchSize}", config.BatchSize);
            _logger.LogInformation("================================");

            // 1. Database cleanup (if requested)
            if (config.CleanDatabase)
            {
                _logger.LogWarning("Cleaning database...");
                await CleanDatabaseAsync(cancellationToken);
                _logger.LogInformation("Database cleaned successfully");
            }

            // 2. Ensure database exists and migrations applied
            await _context.Database.MigrateAsync(cancellationToken);

            // 3. Disable change tracking for performance
            _context.ChangeTracker.AutoDetectChangesEnabled = false;
            _context.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;

            // 4. Run seeders in dependency order
            _logger.LogInformation("Running {Count} seeders in dependency order", _seeders.Count);

            foreach (var seeder in _seeders)
            {
                try
                {
                    _logger.LogInformation("--- {SeederName} ---", seeder.Name);
                    await seeder.SeedAsync(config, cancellationToken);
                    result.SuccessfulSeeders.Add(seeder.Name);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to seed {Seeder}: {Error}", seeder.Name, ex.Message);
                    result.FailedSeeders.Add((seeder.Name, ex.Message));

                    // Stop on critical failure (DB issues)
                    if (ex is DbUpdateException || ex is InvalidOperationException)
                    {
                        _logger.LogCritical("Critical failure detected, stopping seeding process");
                        throw;
                    }
                }
            }

            // 5. Re-enable change tracking
            _context.ChangeTracker.AutoDetectChangesEnabled = true;

            // 6. Verify referential integrity
            if (config.VerifyIntegrity)
            {
                _logger.LogInformation("--- Verification ---");
                var validationResult = await _validator.ValidateAsync(cancellationToken);

                result.Statistics = validationResult.EntityCounts;

                _logger.LogInformation("Validation Results:");
                foreach (var (entity, count) in result.Statistics.OrderBy(kv => kv.Key))
                {
                    _logger.LogInformation("  {Entity}: {Count}", entity, count);
                }

                if (validationResult.IntegrityIssues.Any())
                {
                    _logger.LogWarning("Integrity issues detected:");
                    foreach (var (issue, count) in validationResult.IntegrityIssues)
                    {
                        _logger.LogWarning("  {Issue}: {Count}", issue, count);
                    }
                }
            }

            result.EndTime = DateTime.UtcNow;
            result.Success = result.FailedSeeders.Count == 0;

            _logger.LogInformation("================================");
            _logger.LogInformation("Seeding completed in {Duration}s", result.Duration.TotalSeconds);
            _logger.LogInformation("Successful: {Success}/{Total}",
                result.SuccessfulSeeders.Count,
                _seeders.Count);

            if (result.FailedSeeders.Any())
            {
                _logger.LogWarning("Failed: {Failed}/{Total}",
                    result.FailedSeeders.Count,
                    _seeders.Count);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Seeding failed catastrophically: {Error}", ex.Message);
            result.Success = false;
            result.CriticalError = ex.Message;
            result.EndTime = DateTime.UtcNow;
            return result;
        }
    }

    private async Task CleanDatabaseAsync(CancellationToken cancellationToken)
    {
        // Delete all data in reverse dependency order
        // This is a simplified approach - in production, consider using database reset

        await _context.Database.ExecuteSqlRawAsync(
            "EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'",
            cancellationToken);

        // Get all table names
        var tables = await _context.Model.GetEntityTypes()
            .Select(t => t.GetTableName())
            .Where(n => n != null)
            .Distinct()
            .ToListAsync();

        foreach (var table in tables)
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(
                    $"DELETE FROM [{table}]",
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Could not clean table {Table}: {Error}", table, ex.Message);
            }
        }

        await _context.Database.ExecuteSqlRawAsync(
            "EXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL'",
            cancellationToken);
    }
}
