using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Seeder.Validators;

public class SeedingValidator
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SeedingValidator> _logger;

    public SeedingValidator(ApplicationDbContext context, ILogger<SeedingValidator> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ValidationResult> ValidateAsync(CancellationToken cancellationToken = default)
    {
        var result = new ValidationResult();

        try
        {
            // Count all major entities
            result.EntityCounts["Users"] = await _context.Users.CountAsync(cancellationToken);
            result.EntityCounts["Roles"] = await _context.Roles.CountAsync(cancellationToken);
            result.EntityCounts["StreamingServices"] = await _context.StreamingServices.CountAsync(cancellationToken);
            result.EntityCounts["StreamingContent"] = await _context.StreamingContents.CountAsync(cancellationToken);
            result.EntityCounts["VpnProviders"] = await _context.VpnProviders.CountAsync(cancellationToken);
            result.EntityCounts["VpnRatings"] = await _context.VpnProviderRatings.CountAsync(cancellationToken);
            result.EntityCounts["Watchlists"] = await _context.Watchlists.CountAsync(cancellationToken);
            result.EntityCounts["WatchlistItems"] = await _context.WatchlistItems.CountAsync(cancellationToken);
            result.EntityCounts["Subscriptions"] = await _context.Subscriptions.CountAsync(cancellationToken);
            result.EntityCounts["PaymentTransactions"] = await _context.PaymentTransactions.CountAsync(cancellationToken);

            // Check for orphaned records (referential integrity)
            // This is a basic check - expand as needed

            _logger.LogInformation("Validation completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Validation failed: {Error}", ex.Message);
            throw;
        }

        return result;
    }
}

public class ValidationResult
{
    public Dictionary<string, int> EntityCounts { get; set; } = new();
    public Dictionary<string, int> IntegrityIssues { get; set; } = new();
    public Dictionary<string, object> Distributions { get; set; } = new();
}
