using GeoLeap.Api.Models;
using Hangfire;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public class RefreshProcessor : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<RefreshProcessor> _logger;
        private readonly SemaphoreSlim _processingThrottle;
        private readonly RefreshConfiguration _config;

        public RefreshProcessor(
            IServiceProvider serviceProvider,
            ILogger<RefreshProcessor> logger,
            IOptionsMonitor<RefreshConfiguration> config)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _config = config.CurrentValue;
            _processingThrottle = new SemaphoreSlim(_config.MaxConcurrentRefreshes);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Refresh processor started with {MaxConcurrent} max concurrent operations", 
                _config.MaxConcurrentRefreshes);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var refreshQueue = scope.ServiceProvider.GetRequiredService<IRefreshQueue>();
                    
                    var operation = await refreshQueue.DequeueAsync(stoppingToken);
                    
                    if (operation != null)
                    {
                        // Process operation in background without waiting
                        // FIXED: Week 1 Day 5 - Use Hangfire for reliable refresh operations
                        BackgroundJob.Enqueue(() => ProcessRefreshOperationAsync(operation, CancellationToken.None));
                    }
                    else
                    {
                        // No operations available, wait before checking again
                        await Task.Delay(TimeSpan.FromSeconds(_config.IdlePollIntervalSeconds), stoppingToken);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Refresh processor is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in refresh processor main loop");
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                }
            }
        }

        private async Task ProcessRefreshOperationAsync(RefreshOperation operation, CancellationToken cancellationToken)
        {
            await _processingThrottle.WaitAsync(cancellationToken);
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var contentDataService = scope.ServiceProvider.GetRequiredService<IContentDataService>();
                var changeDetector = scope.ServiceProvider.GetRequiredService<IChangeDetector>();
                var dataValidationService = scope.ServiceProvider.GetRequiredService<IDataValidationService>();
                var cacheService = scope.ServiceProvider.GetRequiredService<ICacheService>();
                var refreshQueue = scope.ServiceProvider.GetRequiredService<IRefreshQueue>();

                _logger.LogInformation("Processing refresh operation {OperationId} for content {ContentId} (CorrelationId: {CorrelationId})",
                    operation.Id, operation.ContentId, operation.CorrelationId);

                operation.Status = RefreshStatus.InProgress;
                operation.StartedAt = DateTime.UtcNow;

                var refreshResult = await ExecuteRefreshAsync(
                    operation, 
                    contentDataService, 
                    changeDetector, 
                    dataValidationService, 
                    cacheService, 
                    cancellationToken);
                
                if (refreshResult.Success)
                {
                    operation.Status = RefreshStatus.Completed;
                    operation.CompletedAt = DateTime.UtcNow;
                    
                    // Record successful refresh time
                    var lastRefreshKey = $"refresh:last:{operation.ContentId}";
                    await cacheService.SetAsync(lastRefreshKey, DateTime.UtcNow.ToString("O"), TimeSpan.FromDays(30));
                    
                    _logger.LogInformation(
                        "Refresh operation {OperationId} completed successfully in {Duration}ms. Changes detected: {HasChanges} (CorrelationId: {CorrelationId})", 
                        operation.Id, stopwatch.ElapsedMilliseconds, refreshResult.HasChanges, operation.CorrelationId);
                }
                else
                {
                    await HandleRefreshFailureAsync(operation, refreshResult.Error ?? "Unknown error", refreshQueue);
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Refresh operation {OperationId} was cancelled", operation.Id);
                operation.Status = RefreshStatus.Cancelled;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Refresh operation {OperationId} failed with exception (CorrelationId: {CorrelationId})", 
                    operation.Id, operation.CorrelationId);
                
                using var scope = _serviceProvider.CreateScope();
                var refreshQueue = scope.ServiceProvider.GetRequiredService<IRefreshQueue>();
                await HandleRefreshFailureAsync(operation, ex.Message, refreshQueue);
            }
            finally
            {
                stopwatch.Stop();
                _processingThrottle.Release();
            }
        }

        private async Task<RefreshResult> ExecuteRefreshAsync(
            RefreshOperation operation,
            IContentDataService contentDataService,
            IChangeDetector changeDetector,
            IDataValidationService dataValidationService,
            ICacheService cacheService,
            CancellationToken cancellationToken)
        {
            try
            {
                var currentData = await GetCurrentDataAsync(operation.ContentId, operation.ContentType, cacheService);
                
                // Fetch fresh data from external sources
                var freshData = await FetchFreshDataAsync(operation, contentDataService, cancellationToken);
                
                // Detect changes to avoid unnecessary updates
                if (_config.EnableChangeDetection)
                {
                    var hasChanges = await changeDetector.HasChangesAsync(currentData, freshData);
                    
                    if (!hasChanges && !operation.IsImmediate)
                    {
                        _logger.LogDebug("No changes detected for content {ContentId}, skipping update", operation.ContentId);
                        return new RefreshResult { Success = true, HasChanges = false };
                    }
                }

                // Validate fresh data
                var validationResult = await dataValidationService.ValidateAsync(freshData, new ValidationContext
                {
                    ContentType = operation.ContentType
                });

                if (!validationResult.IsValid)
                {
                    return new RefreshResult 
                    { 
                        Success = false, 
                        Error = $"Data validation failed: {string.Join(", ", validationResult.Errors)}" 
                    };
                }

                // Update cache and storage
                await UpdateDataAsync(operation.ContentId, freshData, cacheService);
                
                return new RefreshResult { Success = true, HasChanges = true };
            }
            catch (Exception ex)
            {
                return new RefreshResult { Success = false, Error = ex.Message };
            }
        }

        private async Task<object?> GetCurrentDataAsync(string contentId, ContentType contentType, ICacheService cacheService)
        {
            try
            {
                var cacheKey = $"content:unified:{contentId}";
                return await cacheService.GetAsync<UnifiedContentResponse>(cacheKey);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to get current data for content {ContentId}", contentId);
                return null;
            }
        }

        private async Task<object> FetchFreshDataAsync(RefreshOperation operation, IContentDataService contentDataService, CancellationToken cancellationToken)
        {
            try
            {
                // Determine what data sources to fetch based on operation requirements
                if (operation.DataSources.Contains(RefreshDataSource.All))
                {
                    // Get unified content by fetching from multiple sources
                    var contentDetails = await contentDataService.GetContentDetailsAsync(operation.ContentId, operation.ContentType);
                    var streamingData = await contentDataService.GetStreamingAvailabilityAsync(operation.ContentId);
                    
                    return new UnifiedContentResponse
                    {
                        ContentData = contentDetails,
                        StreamingData = streamingData,
                        LastUpdated = DateTime.UtcNow
                    };
                }

                // Handle specific data sources
                var tasks = new List<Task<object>>();

                if (operation.DataSources.Contains(RefreshDataSource.StreamingAvailability))
                {
                    tasks.Add(FetchStreamingDataAsync(operation.ContentId, contentDataService));
                }

                if (operation.DataSources.Contains(RefreshDataSource.ContentMetadata))
                {
                    tasks.Add(FetchMetadataAsync(operation.ContentId, operation.ContentType, contentDataService));
                }

                if (operation.DataSources.Contains(RefreshDataSource.Images))
                {
                    tasks.Add(FetchImageDataAsync(operation.ContentId, contentDataService));
                }

                var results = await Task.WhenAll(tasks);
                
                // Combine results based on operation requirements
                return CombineDataResults(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch fresh data for content {ContentId}", operation.ContentId);
                throw;
            }
        }

        private async Task<object> FetchStreamingDataAsync(string contentId, IContentDataService contentDataService)
        {
            try
            {
                return await contentDataService.GetStreamingAvailabilityAsync(contentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch streaming data for content {ContentId}", contentId);
                throw;
            }
        }

        private async Task<object> FetchMetadataAsync(string contentId, ContentType contentType, IContentDataService contentDataService)
        {
            try
            {
                return await contentDataService.GetContentDetailsAsync(contentId, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch metadata for content {ContentId}", contentId);
                throw;
            }
        }

        private async Task<object> FetchImageDataAsync(string contentId, IContentDataService contentDataService)
        {
            try
            {
                // This would depend on your image service implementation
                return new { Images = "placeholder" };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch image data for content {ContentId}", contentId);
                throw;
            }
        }

        private object CombineDataResults(object[] results)
        {
            // Combine different data source results into a unified response
            // This is a simplified implementation - you'd want to properly merge the data
            if (results.Length == 1)
            {
                return results[0];
            }

            return new
            {
                CombinedResults = results,
                CombinedAt = DateTime.UtcNow
            };
        }

        private async Task UpdateDataAsync(string contentId, object freshData, ICacheService cacheService)
        {
            try
            {
                var cacheKey = $"content:unified:{contentId}";
                var ttl = TimeSpan.FromHours(24); // Cache for 24 hours
                
                await cacheService.SetAsync(cacheKey, freshData, ttl);
                
                _logger.LogDebug("Updated cached data for content {ContentId}", contentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update data for content {ContentId}", contentId);
                throw;
            }
        }

        private async Task HandleRefreshFailureAsync(RefreshOperation operation, string error, IRefreshQueue refreshQueue)
        {
            operation.Status = RefreshStatus.Failed;
            operation.ErrorMessage = error;
            operation.CompletedAt = DateTime.UtcNow;

            var maxRetries = GetMaxRetries(operation.Priority);
            
            if (operation.RetryCount < maxRetries)
            {
                var retryDelay = CalculateRetryDelay(operation.RetryCount);
                await refreshQueue.RequeueAsync(operation, retryDelay);
                
                _logger.LogWarning(
                    "Refresh operation {OperationId} failed, will retry #{RetryCount} after {Delay}. Error: {Error} (CorrelationId: {CorrelationId})",
                    operation.Id, operation.RetryCount + 1, retryDelay, error, operation.CorrelationId);
            }
            else
            {
                _logger.LogError(
                    "Refresh operation {OperationId} failed permanently after {RetryCount} retries. Error: {Error} (CorrelationId: {CorrelationId})",
                    operation.Id, operation.RetryCount, error, operation.CorrelationId);
            }
        }

        private int GetMaxRetries(RefreshPriority priority)
        {
            var retryConfig = _config.RetryConfiguration;
            var key = priority.ToString();
            
            if (retryConfig.MaxRetries.TryGetValue(key, out var maxRetries))
            {
                return maxRetries;
            }

            return priority switch
            {
                RefreshPriority.Critical => 5,
                RefreshPriority.High => 3,
                RefreshPriority.Medium => 2,
                RefreshPriority.Standard => 1,
                RefreshPriority.Low => 0,
                _ => 1
            };
        }

        private TimeSpan CalculateRetryDelay(int retryCount)
        {
            var baseDelay = _config.RetryConfiguration.BaseRetryDelay;
            var multiplier = _config.RetryConfiguration.BackoffMultiplier;
            var maxDelayMinutes = _config.RetryConfiguration.MaxRetryDelayMinutes;
            
            // Exponential backoff with jitter
            var delayMinutes = baseDelay.TotalMinutes * Math.Pow(multiplier, retryCount);
            delayMinutes = Math.Min(delayMinutes, maxDelayMinutes);
            
            // Add some jitter to prevent thundering herd
            var random = new Random();
            var jitter = random.NextDouble() * 0.1; // Up to 10% jitter
            delayMinutes *= (1 + jitter);
            
            return TimeSpan.FromMinutes(delayMinutes);
        }

        public override void Dispose()
        {
            _processingThrottle?.Dispose();
            base.Dispose();
        }
    }
}