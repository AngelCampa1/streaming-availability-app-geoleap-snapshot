using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Background service that periodically cleans up expired password reset tokens.
/// Runs every 24 hours and removes tokens older than 30 days.
/// </summary>
public class TokenCleanupService : IHostedService, IDisposable
{
    private readonly ILogger<TokenCleanupService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private Timer? _timer;
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(24);
    private static readonly TimeSpan TokenRetentionPeriod = TimeSpan.FromDays(30);

    public TokenCleanupService(
        ILogger<TokenCleanupService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Token Cleanup Service is starting");

        // Delay first run by 10 minutes to avoid DB hit during startup, then every 24 hours
        _timer = new Timer(
            DoCleanup,
            null,
            TimeSpan.FromMinutes(10),
            CleanupInterval);

        return Task.CompletedTask;
    }

    private void DoCleanup(object? state)
    {
        // Timer callback must not be async void - use fire-and-forget with error handling
        _ = DoCleanupAsync().ContinueWith(t =>
        {
            if (t.IsFaulted)
            {
                _logger.LogError(t.Exception, "Error during token cleanup");
            }
        }, TaskScheduler.Default);
    }

    private async Task DoCleanupAsync()
    {
        _logger.LogInformation("Token cleanup job started at {Time}", DateTime.UtcNow);

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var cutoffDate = DateTime.UtcNow.AddDays(-TokenRetentionPeriod.Days);

            // Find all expired tokens older than retention period
            var expiredTokens = await dbContext.PasswordResetTokens
                .Where(t => t.ExpiresAt < cutoffDate)
                .ToListAsync();

            if (expiredTokens.Count > 0)
            {
                _logger.LogInformation(
                    "Found {TokenCount} expired tokens to delete (older than {CutoffDate:yyyy-MM-dd})",
                    expiredTokens.Count,
                    cutoffDate);

                dbContext.PasswordResetTokens.RemoveRange(expiredTokens);
                await dbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "Successfully deleted {TokenCount} expired password reset tokens",
                    expiredTokens.Count);

                // Log statistics
                var remainingTokens = await dbContext.PasswordResetTokens.CountAsync();
                var activeTokens = await dbContext.PasswordResetTokens
                    .Where(t => t.ExpiresAt > DateTime.UtcNow && !t.IsUsed)
                    .CountAsync();

                _logger.LogInformation(
                    "Token cleanup statistics: {RemainingTotal} total tokens, {ActiveCount} active tokens",
                    remainingTokens,
                    activeTokens);
            }
            else
            {
                _logger.LogInformation("No expired tokens found for cleanup");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during token cleanup");
        }

        _logger.LogInformation("Token cleanup job completed at {Time}", DateTime.UtcNow);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Token Cleanup Service is stopping");

        _timer?.Change(Timeout.Infinite, 0);

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _timer?.Dispose();
        GC.SuppressFinalize(this);
    }
}
