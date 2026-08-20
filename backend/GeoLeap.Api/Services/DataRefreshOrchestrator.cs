using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public class DataRefreshOrchestrator : IDataRefreshOrchestrator
    {
        private readonly IRefreshQueue _refreshQueue;
        private readonly IContentDataService _contentDataService;
        private readonly ICacheService _cacheService;
        private readonly IPopularContentService _popularContentService;
        private readonly ILogger<DataRefreshOrchestrator> _logger;
        private readonly IOptionsMonitor<RefreshConfiguration> _config;

        public DataRefreshOrchestrator(
            IRefreshQueue refreshQueue,
            IContentDataService contentDataService,
            ICacheService cacheService,
            IPopularContentService popularContentService,
            ILogger<DataRefreshOrchestrator> logger,
            IOptionsMonitor<RefreshConfiguration> config)
        {
            _refreshQueue = refreshQueue;
            _contentDataService = contentDataService;
            _cacheService = cacheService;
            _popularContentService = popularContentService;
            _logger = logger;
            _config = config;
        }

        public async Task ScheduleRefreshAsync(RefreshRequest request)
        {
            try
            {
                // Determine refresh priority based on content popularity and staleness
                var priority = await DetermineRefreshPriorityAsync(request.ContentId, request.ContentType);
                
                // Override priority if specified in request
                if (request.Priority != RefreshPriority.Standard)
                {
                    priority = request.Priority;
                }

                // Check if content needs refresh (unless forced)
                if (!request.ForceRefresh)
                {
                    var needsRefresh = await CheckIfRefreshNeededAsync(request.ContentId, priority);
                    
                    if (!needsRefresh)
                    {
                        _logger.LogDebug("Refresh not needed for content {ContentId}", request.ContentId);
                        return;
                    }
                }

                var refreshOperation = new RefreshOperation
                {
                    Id = Guid.NewGuid().ToString(),
                    ContentId = request.ContentId,
                    ContentType = request.ContentType,
                    Priority = priority,
                    ScheduledAt = DateTime.UtcNow,
                    DataSources = request.DataSources?.Any() == true ? request.DataSources : GetDefaultDataSources(),
                    RetryCount = 0,
                    Status = RefreshStatus.Scheduled,
                    CorrelationId = GetCorrelationId()
                };

                await _refreshQueue.EnqueueAsync(refreshOperation);
                
                _logger.LogInformation("Scheduled refresh for content {ContentId} with priority {Priority} (CorrelationId: {CorrelationId})", 
                    request.ContentId, priority, refreshOperation.CorrelationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to schedule refresh for content {ContentId}", request.ContentId);
                throw;
            }
        }

        public async Task<RefreshStatus> GetRefreshStatusAsync(string contentId)
        {
            try
            {
                var activeOperations = await _refreshQueue.GetActiveOperationsAsync();
                var operation = activeOperations.FirstOrDefault(op => op.ContentId == contentId);
                
                if (operation != null)
                {
                    return operation.Status;
                }

                // Check if recently completed
                var lastRefreshKey = GetLastRefreshKey(contentId);
                var lastRefreshData = await _cacheService.GetAsync<string>(lastRefreshKey);
                
                if (!string.IsNullOrEmpty(lastRefreshData))
                {
                    return RefreshStatus.Completed;
                }

                return RefreshStatus.Scheduled; // Default to scheduled if no information available
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get refresh status for content {ContentId}", contentId);
                throw;
            }
        }

        public async Task TriggerImmediateRefreshAsync(string contentId, RefreshPriority priority = RefreshPriority.Standard)
        {
            try
            {
                var refreshOperation = new RefreshOperation
                {
                    Id = Guid.NewGuid().ToString(),
                    ContentId = contentId,
                    ContentType = ContentType.Unknown, // Will be determined during processing
                    Priority = priority,
                    ScheduledAt = DateTime.UtcNow,
                    Status = RefreshStatus.Scheduled,
                    IsImmediate = true,
                    DataSources = GetDefaultDataSources(),
                    CorrelationId = GetCorrelationId()
                };

                await _refreshQueue.EnqueueAsync(refreshOperation, immediate: true);
                
                _logger.LogInformation("Triggered immediate refresh for content {ContentId} with priority {Priority} (CorrelationId: {CorrelationId})", 
                    contentId, priority, refreshOperation.CorrelationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to trigger immediate refresh for content {ContentId}", contentId);
                throw;
            }
        }

        public async Task<List<RefreshOperation>> GetActiveRefreshOperationsAsync()
        {
            try
            {
                return await _refreshQueue.GetActiveOperationsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get active refresh operations");
                throw;
            }
        }

        public async Task CancelRefreshAsync(string operationId)
        {
            try
            {
                await _refreshQueue.RemoveAsync(operationId);
                
                _logger.LogInformation("Cancelled refresh operation {OperationId}", operationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to cancel refresh operation {OperationId}", operationId);
                throw;
            }
        }

        public async Task<RefreshStatistics> GetRefreshStatisticsAsync(TimeSpan period)
        {
            try
            {
                var statistics = new RefreshStatistics
                {
                    CalculatedAt = DateTime.UtcNow
                };

                // Get active operations
                var activeOperations = await _refreshQueue.GetActiveOperationsAsync();
                statistics.InProgressOperations = activeOperations.Count(op => op.Status == RefreshStatus.InProgress);
                statistics.TotalOperations = activeOperations.Count;

                // Calculate operations by priority
                statistics.OperationsByPriority = activeOperations
                    .GroupBy(op => op.Priority)
                    .ToDictionary(g => g.Key, g => g.Count());

                // Calculate operations by data source
                foreach (var operation in activeOperations)
                {
                    foreach (var source in operation.DataSources)
                    {
                        statistics.OperationsBySource.TryGetValue(source, out var count);
                        statistics.OperationsBySource[source] = count + 1;
                    }
                }

                // Note: For completed/failed operations, you might want to implement
                // a separate audit log or use a more permanent storage mechanism
                
                return statistics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get refresh statistics");
                throw;
            }
        }

        public async Task<bool> IsContentStaleAsync(string contentId, ContentType contentType)
        {
            try
            {
                var lastRefreshTime = await GetLastRefreshTimeAsync(contentId);
                if (!lastRefreshTime.HasValue)
                {
                    return true; // Never refreshed
                }

                var priority = await DetermineRefreshPriorityAsync(contentId, contentType);
                var refreshInterval = GetRefreshInterval(priority);
                var stalenessThreshold = _config.CurrentValue.StalenessThresholds.Alert;
                
                var timeSinceRefresh = DateTime.UtcNow - lastRefreshTime.Value;
                
                // Content is stale if it hasn't been refreshed within the alert threshold
                return timeSinceRefresh > stalenessThreshold;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check staleness for content {ContentId}", contentId);
                return true; // Assume stale if we can't determine
            }
        }

        public async Task<List<string>> GetStaleContentAsync(int maxCount = 100)
        {
            try
            {
                var staleContent = new List<string>();
                
                // This is a simplified implementation. In production, you might want to
                // maintain a separate index of content with their last refresh times
                
                var activeOperations = await _refreshQueue.GetActiveOperationsAsync();
                var recentlyProcessedContent = activeOperations
                    .Where(op => op.CompletedAt > DateTime.UtcNow.AddHours(-24))
                    .Select(op => op.ContentId)
                    .ToHashSet();

                // Here you would typically query your content database to find
                // content that hasn't been refreshed recently and isn't currently being processed
                
                _logger.LogDebug("Found {StaleCount} stale content items", staleContent.Count);
                
                return staleContent.Take(maxCount).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get stale content");
                throw;
            }
        }

        private async Task<RefreshPriority> DetermineRefreshPriorityAsync(string contentId, ContentType contentType)
        {
            try
            {
                // Get content popularity metrics
                var popularity = await GetContentPopularityAsync(contentId);
                var lastAccessTime = await GetLastAccessTimeAsync(contentId);
                var releaseDate = await GetContentReleaseDateAsync(contentId);

                // High priority for popular content accessed recently
                if (popularity > 80.0 && lastAccessTime > DateTime.UtcNow.AddHours(-24))
                {
                    return RefreshPriority.High;
                }

                // High priority for recent releases
                if (releaseDate > DateTime.UtcNow.AddDays(-30))
                {
                    return RefreshPriority.High;
                }

                // Medium priority for moderately popular content
                if (popularity > 40.0 && lastAccessTime > DateTime.UtcNow.AddDays(-7))
                {
                    return RefreshPriority.Medium;
                }

                return RefreshPriority.Standard;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to determine refresh priority for content {ContentId}, using standard priority", contentId);
                return RefreshPriority.Standard;
            }
        }

        private async Task<bool> CheckIfRefreshNeededAsync(string contentId, RefreshPriority priority)
        {
            var lastRefresh = await GetLastRefreshTimeAsync(contentId);
            if (!lastRefresh.HasValue) return true; // Never refreshed

            var refreshInterval = GetRefreshInterval(priority);
            var timeSinceRefresh = DateTime.UtcNow - lastRefresh.Value;

            return timeSinceRefresh >= refreshInterval;
        }

        private async Task<DateTime?> GetLastRefreshTimeAsync(string contentId)
        {
            try
            {
                var cacheKey = GetLastRefreshKey(contentId);
                var lastRefreshStr = await _cacheService.GetAsync<string>(cacheKey);
                
                if (DateTime.TryParse(lastRefreshStr, out var lastRefresh))
                {
                    return lastRefresh;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to get last refresh time for content {ContentId}", contentId);
            }

            return null;
        }

        private async Task<double> GetContentPopularityAsync(string contentId)
        {
            try
            {
                // Use the popular content service to get popularity metrics
                var popularContent = await _popularContentService.GetPopularContentAsync(1000);
                var content = popularContent.FirstOrDefault(c => c.Id == contentId);
                
                return content?.Popularity ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to get popularity for content {ContentId}", contentId);
                return 0;
            }
        }

        private async Task<DateTime> GetLastAccessTimeAsync(string contentId)
        {
            try
            {
                var cacheKey = $"content:last_access:{contentId}";
                var lastAccessStr = await _cacheService.GetAsync<string>(cacheKey);
                
                if (DateTime.TryParse(lastAccessStr, out var lastAccess))
                {
                    return lastAccess;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to get last access time for content {ContentId}", contentId);
            }

            return DateTime.MinValue;
        }

        private async Task<DateTime> GetContentReleaseDateAsync(string contentId)
        {
            try
            {
                var cacheKey = $"content:release_date:{contentId}";
                var releaseDateStr = await _cacheService.GetAsync<string>(cacheKey);
                
                if (DateTime.TryParse(releaseDateStr, out var releaseDate))
                {
                    return releaseDate;
                }
                
                // Fallback: try to get from content data service
                // This would depend on your content data structure
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to get release date for content {ContentId}", contentId);
            }

            return DateTime.MinValue;
        }

        private TimeSpan GetRefreshInterval(RefreshPriority priority)
        {
            var intervals = _config.CurrentValue.RefreshIntervals;
            var key = priority.ToString();
            
            if (intervals.TryGetValue(key, out var interval))
            {
                return interval;
            }

            return priority switch
            {
                RefreshPriority.Critical => TimeSpan.FromHours(2),
                RefreshPriority.High => TimeSpan.FromHours(4),
                RefreshPriority.Medium => TimeSpan.FromHours(12),
                RefreshPriority.Standard => TimeSpan.FromHours(24),
                RefreshPriority.Low => TimeSpan.FromDays(3),
                _ => TimeSpan.FromHours(24)
            };
        }

        private List<RefreshDataSource> GetDefaultDataSources()
        {
            return new List<RefreshDataSource> { RefreshDataSource.All };
        }

        private static string GetLastRefreshKey(string contentId) => $"refresh:last:{contentId}";

        private static string GetCorrelationId()
        {
            return Guid.NewGuid().ToString("N")[..8]; // Short correlation ID
        }
    }
}