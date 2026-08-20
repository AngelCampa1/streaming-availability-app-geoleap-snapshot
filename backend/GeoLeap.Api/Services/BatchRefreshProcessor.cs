using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public class BatchRefreshProcessor : IBatchRefreshProcessor
    {
        private readonly IDataRefreshOrchestrator _orchestrator;
        private readonly ILogger<BatchRefreshProcessor> _logger;
        private readonly IOptionsMonitor<RefreshConfiguration> _config;

        public BatchRefreshProcessor(
            IDataRefreshOrchestrator orchestrator,
            ILogger<BatchRefreshProcessor> logger,
            IOptionsMonitor<RefreshConfiguration> config)
        {
            _orchestrator = orchestrator;
            _logger = logger;
            _config = config;
        }

        public async Task ProcessBatchRefreshAsync(BatchRefreshRequest request)
        {
            if (!_config.CurrentValue.EnableBatchProcessing)
            {
                _logger.LogWarning("Batch processing is disabled, processing items individually");
                
                foreach (var contentId in request.ContentIds)
                {
                    await _orchestrator.ScheduleRefreshAsync(new RefreshRequest
                    {
                        ContentId = contentId,
                        ContentType = request.ContentType,
                        Priority = request.Priority,
                        DataSources = request.DataSources
                    });
                }
                return;
            }

            var batchSize = _config.CurrentValue.BatchSize;
            var batchDelay = _config.CurrentValue.BatchDelay;
            var contentBatches = request.ContentIds.Chunk(batchSize);
            var totalBatches = (int)Math.Ceiling((double)request.ContentIds.Count / batchSize);
            var processedBatches = 0;

            _logger.LogInformation("Starting batch refresh for {TotalItems} content items in {TotalBatches} batches of {BatchSize}",
                request.ContentIds.Count, totalBatches, batchSize);

            foreach (var batch in contentBatches)
            {
                processedBatches++;
                
                try
                {
                    await ProcessSingleBatchAsync(batch.ToList(), request, processedBatches, totalBatches);
                    
                    // Rate limiting between batches (except for the last batch)
                    if (processedBatches < totalBatches)
                    {
                        _logger.LogDebug("Waiting {Delay} between batches", batchDelay);
                        await Task.Delay(batchDelay);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process batch {BatchNumber}/{TotalBatches}", 
                        processedBatches, totalBatches);
                    
                    // Continue with next batch even if current batch fails
                    continue;
                }
            }

            _logger.LogInformation("Completed batch refresh processing for {TotalItems} content items", 
                request.ContentIds.Count);
        }

        private async Task ProcessSingleBatchAsync(List<string> batchContentIds, BatchRefreshRequest request, int batchNumber, int totalBatches)
        {
            _logger.LogDebug("Processing batch {BatchNumber}/{TotalBatches} with {BatchSize} items", 
                batchNumber, totalBatches, batchContentIds.Count);

            var batchTasks = batchContentIds.Select(async contentId =>
            {
                try
                {
                    await _orchestrator.ScheduleRefreshAsync(new RefreshRequest
                    {
                        ContentId = contentId,
                        ContentType = request.ContentType,
                        Priority = request.Priority,
                        DataSources = request.DataSources
                    });
                    
                    _logger.LogTrace("Scheduled refresh for content {ContentId} in batch {BatchNumber}", 
                        contentId, batchNumber);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to schedule refresh for content {ContentId} in batch {BatchNumber}", 
                        contentId, batchNumber);
                }
            });

            await Task.WhenAll(batchTasks);
            
            _logger.LogDebug("Completed batch {BatchNumber}/{TotalBatches} with {BatchSize} items", 
                batchNumber, totalBatches, batchContentIds.Count);
        }

        public async Task ProcessStaleContentRefreshAsync(int maxCount = 1000, RefreshPriority priority = RefreshPriority.Standard)
        {
            try
            {
                _logger.LogInformation("Starting stale content refresh process for up to {MaxCount} items with priority {Priority}", 
                    maxCount, priority);

                var staleContentIds = await _orchestrator.GetStaleContentAsync(maxCount);
                
                if (!staleContentIds.Any())
                {
                    _logger.LogInformation("No stale content found");
                    return;
                }

                var batchRequest = new BatchRefreshRequest
                {
                    ContentIds = staleContentIds,
                    ContentType = ContentType.Unknown, // Will be determined during processing
                    Priority = priority,
                    DataSources = new List<RefreshDataSource> { RefreshDataSource.All }
                };

                await ProcessBatchRefreshAsync(batchRequest);
                
                _logger.LogInformation("Completed stale content refresh for {ProcessedCount} items", 
                    staleContentIds.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process stale content refresh");
                throw;
            }
        }

        public async Task ProcessPopularContentRefreshAsync(TimeSpan period, int maxCount = 500, RefreshPriority priority = RefreshPriority.High)
        {
            try
            {
                _logger.LogInformation("Starting popular content refresh for period {Period}, up to {MaxCount} items with priority {Priority}", 
                    period, maxCount, priority);

                // This would require integration with your popular content service
                // For now, we'll create a placeholder implementation
                var popularContentIds = new List<string>(); // await GetPopularContentIds(period, maxCount);
                
                if (!popularContentIds.Any())
                {
                    _logger.LogInformation("No popular content found for refresh");
                    return;
                }

                var batchRequest = new BatchRefreshRequest
                {
                    ContentIds = popularContentIds,
                    ContentType = ContentType.Unknown,
                    Priority = priority,
                    DataSources = new List<RefreshDataSource> { RefreshDataSource.All }
                };

                await ProcessBatchRefreshAsync(batchRequest);
                
                _logger.LogInformation("Completed popular content refresh for {ProcessedCount} items", 
                    popularContentIds.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process popular content refresh");
                throw;
            }
        }

        public async Task ProcessScheduledRefreshAsync()
        {
            try
            {
                _logger.LogInformation("Starting scheduled refresh process");

                // Process different priority levels with different batch sizes and frequencies
                await ProcessPriorityBasedRefreshAsync(RefreshPriority.Critical, maxCount: 100);
                await ProcessPriorityBasedRefreshAsync(RefreshPriority.High, maxCount: 500);
                await ProcessPriorityBasedRefreshAsync(RefreshPriority.Medium, maxCount: 1000);
                await ProcessPriorityBasedRefreshAsync(RefreshPriority.Standard, maxCount: 2000);

                _logger.LogInformation("Completed scheduled refresh process");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process scheduled refresh");
                throw;
            }
        }

        private async Task ProcessPriorityBasedRefreshAsync(RefreshPriority priority, int maxCount)
        {
            try
            {
                _logger.LogDebug("Processing {Priority} priority refresh for up to {MaxCount} items", 
                    priority, maxCount);

                // This would require implementation to identify content that needs refresh based on priority
                // For now, we'll focus on stale content
                var staleContentIds = await _orchestrator.GetStaleContentAsync(maxCount);
                
                if (staleContentIds.Any())
                {
                    var batchRequest = new BatchRefreshRequest
                    {
                        ContentIds = staleContentIds,
                        ContentType = ContentType.Unknown,
                        Priority = priority,
                        DataSources = new List<RefreshDataSource> { RefreshDataSource.All }
                    };

                    await ProcessBatchRefreshAsync(batchRequest);
                }

                _logger.LogDebug("Completed {Priority} priority refresh for {ProcessedCount} items", 
                    priority, staleContentIds.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process {Priority} priority refresh", priority);
                throw;
            }
        }

        public async Task<BatchRefreshStatus> GetBatchRefreshStatusAsync(string batchId)
        {
            try
            {
                // This would require implementing batch tracking
                // For now, return a placeholder status
                var status = new BatchRefreshStatus
                {
                    BatchId = batchId,
                    Status = "Completed", // This should be tracked properly
                    StartedAt = DateTime.UtcNow.AddHours(-1),
                    CompletedAt = DateTime.UtcNow,
                    TotalItems = 0,
                    ProcessedItems = 0,
                    FailedItems = 0,
                    SuccessRate = 100.0
                };

                return status;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get batch refresh status for batch {BatchId}", batchId);
                throw;
            }
        }

        public class BatchRefreshStatus
        {
            public string BatchId { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
            public DateTime StartedAt { get; set; }
            public DateTime? CompletedAt { get; set; }
            public int TotalItems { get; set; }
            public int ProcessedItems { get; set; }
            public int FailedItems { get; set; }
            public double SuccessRate { get; set; }
            public List<string> Errors { get; set; } = new();
        }
    }

    // Extension method to chunk lists (if not available in your .NET version)
    public static class ListExtensions
    {
        public static IEnumerable<IEnumerable<T>> Chunk<T>(this IEnumerable<T> source, int chunkSize)
        {
            var enumerator = source.GetEnumerator();
            while (enumerator.MoveNext())
            {
                yield return GetChunk(enumerator, chunkSize);
            }
        }

        private static IEnumerable<T> GetChunk<T>(IEnumerator<T> enumerator, int chunkSize)
        {
            var count = 0;
            do
            {
                yield return enumerator.Current;
                count++;
            } while (count < chunkSize && enumerator.MoveNext());
        }
    }
}