using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Seeder.Seeders.Base;

public abstract class BaseSeeder<T> : ISeeder where T : class
{
    protected readonly ApplicationDbContext _context;
    protected readonly ILogger<BaseSeeder<T>> _logger;
    protected readonly int _batchSize;

    protected BaseSeeder(
        ApplicationDbContext context,
        ILogger<BaseSeeder<T>> logger,
        int batchSize = 1000)
    {
        _context = context;
        _logger = logger;
        _batchSize = batchSize;
    }

    public abstract string Name { get; }
    public abstract int Order { get; }

    public virtual async Task SeedAsync(
        SeederConfiguration config,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if already seeded (idempotency)
            if (await IsAlreadySeededAsync(cancellationToken))
            {
                _logger.LogInformation("{SeederName} already seeded, skipping", Name);
                return;
            }

            _logger.LogInformation("Starting {SeederName}", Name);
            var startTime = DateTime.UtcNow;

            // Generate entities
            var entities = await GenerateEntitiesAsync(config, cancellationToken);
            var entityList = entities.ToList();

            if (entityList.Count == 0)
            {
                _logger.LogWarning("{SeederName} generated 0 entities, skipping", Name);
                return;
            }

            // Batch insert for performance
            var totalBatches = (int)Math.Ceiling((double)entityList.Count / _batchSize);
            var currentBatch = 0;

            foreach (var batch in entityList.Chunk(_batchSize))
            {
                await _context.Set<T>().AddRangeAsync(batch, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                currentBatch++;
                _logger.LogInformation(
                    "{SeederName}: Seeded batch {CurrentBatch}/{TotalBatches} ({Count} items)",
                    Name, currentBatch, totalBatches, batch.Length);
            }

            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "{SeederName} completed successfully. Total items: {Count}, Duration: {Duration}ms",
                Name, entityList.Count, duration.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{SeederName} failed with error: {Error}", Name, ex.Message);
            throw;
        }
    }

    public abstract Task<bool> IsAlreadySeededAsync(CancellationToken cancellationToken = default);

    protected abstract Task<IEnumerable<T>> GenerateEntitiesAsync(
        SeederConfiguration config,
        CancellationToken cancellationToken = default);

    protected int GetOptimalBatchSize<TEntity>()
    {
        return typeof(TEntity).Name switch
        {
            "User" => 500,
            "StreamingContent" => 1000,
            "UserBehaviorEvent" => 5000,
            "SearchAnalyticsEvent" => 5000,
            "ContentRating" => 2000,
            _ => 1000
        };
    }
}
