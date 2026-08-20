using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public class RefreshQueue : IRefreshQueue
    {
        private readonly IDistributedCache _distributedCache;
        private readonly ILogger<RefreshQueue> _logger;
        private readonly SemaphoreSlim _queueSemaphore;
        private readonly RefreshConfiguration _config;

        public RefreshQueue(
            IDistributedCache distributedCache, 
            ILogger<RefreshQueue> logger,
            IOptionsMonitor<RefreshConfiguration> config)
        {
            _distributedCache = distributedCache;
            _logger = logger;
            _queueSemaphore = new SemaphoreSlim(1, 1);
            _config = config.CurrentValue;
        }

        public async Task EnqueueAsync(RefreshOperation operation, bool immediate = false)
        {
            await _queueSemaphore.WaitAsync();
            
            try
            {
                var queueKey = GetQueueKey(operation.Priority);
                var serializedOperation = JsonSerializer.Serialize(operation, GetJsonOptions());
                
                // Store individual operation for tracking
                var operationKey = GetOperationKey(operation.Id);
                await _distributedCache.SetStringAsync(operationKey, serializedOperation, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) // Operations expire after 24 hours
                });

                // Add to priority queue
                var queueList = await GetQueueListAsync(queueKey);
                
                if (immediate)
                {
                    queueList.Insert(0, operation.Id); // Add to front
                }
                else
                {
                    queueList.Add(operation.Id); // Add to back
                }

                await SetQueueListAsync(queueKey, queueList);

                _logger.LogDebug("Enqueued refresh operation {OperationId} for content {ContentId} with priority {Priority}",
                    operation.Id, operation.ContentId, operation.Priority);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to enqueue refresh operation {OperationId}", operation.Id);
                throw;
            }
            finally
            {
                _queueSemaphore.Release();
            }
        }

        public async Task<RefreshOperation?> DequeueAsync(CancellationToken cancellationToken = default)
        {
            // Process delayed operations first
            await ProcessDelayedOperationsAsync();

            // Process queues in priority order
            var priorities = Enum.GetValues<RefreshPriority>().OrderByDescending(p => p);
            
            foreach (var priority in priorities)
            {
                var queueKey = GetQueueKey(priority);
                var queueList = await GetQueueListAsync(queueKey);

                // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when dequeuing operations
                if (queueList.Any())
                {
                    var operationId = queueList.FirstOrDefault();
                    if (string.IsNullOrEmpty(operationId))
                        continue;

                    queueList.RemoveAt(0);
                    await SetQueueListAsync(queueKey, queueList);

                    var operationKey = GetOperationKey(operationId);
                    var serializedOperation = await _distributedCache.GetStringAsync(operationKey);
                    
                    if (!string.IsNullOrEmpty(serializedOperation))
                    {
                        var operation = JsonSerializer.Deserialize<RefreshOperation>(serializedOperation, GetJsonOptions());
                        if (operation != null)
                        {
                            _logger.LogDebug("Dequeued refresh operation {OperationId} with priority {Priority}",
                                operation.Id, priority);
                            return operation;
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Operation {OperationId} not found in cache, skipping", operationId);
                    }
                }
            }

            return null; // No operations available
        }

        public async Task<int> GetQueueLengthAsync(RefreshPriority? priority = null)
        {
            if (priority.HasValue)
            {
                var queueKey = GetQueueKey(priority.Value);
                var queueList = await GetQueueListAsync(queueKey);
                return queueList.Count;
            }

            var totalLength = 0;
            var priorities = Enum.GetValues<RefreshPriority>();
            
            foreach (var p in priorities)
            {
                var queueKey = GetQueueKey(p);
                var queueList = await GetQueueListAsync(queueKey);
                totalLength += queueList.Count;
            }

            return totalLength;
        }

        public async Task RemoveAsync(string operationId)
        {
            try
            {
                // Remove from all priority queues
                var priorities = Enum.GetValues<RefreshPriority>();
                
                foreach (var priority in priorities)
                {
                    var queueKey = GetQueueKey(priority);
                    var queueList = await GetQueueListAsync(queueKey);
                    
                    if (queueList.Remove(operationId))
                    {
                        await SetQueueListAsync(queueKey, queueList);
                        break; // Operation found and removed
                    }
                }

                // Remove the operation data
                var operationKey = GetOperationKey(operationId);
                await _distributedCache.RemoveAsync(operationKey);

                _logger.LogDebug("Removed refresh operation {OperationId} from queue", operationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to remove operation {OperationId} from queue", operationId);
                throw;
            }
        }

        public async Task RequeueAsync(RefreshOperation operation, TimeSpan delay)
        {
            try
            {
                operation.RetryCount++;
                operation.Status = RefreshStatus.Scheduled;
                
                // Use delayed queue for requeue
                var delayedQueueKey = "refresh:delayed";
                var executeAt = DateTimeOffset.UtcNow.Add(delay).ToUnixTimeSeconds();
                
                var delayedEntry = new DelayedRefreshEntry
                {
                    OperationId = operation.Id,
                    ExecuteAt = executeAt,
                    Priority = operation.Priority
                };

                var serializedDelayedEntry = JsonSerializer.Serialize(delayedEntry, GetJsonOptions());
                var delayedKey = $"{delayedQueueKey}:{executeAt}:{operation.Id}";
                
                await _distributedCache.SetStringAsync(delayedKey, serializedDelayedEntry, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = delay.Add(TimeSpan.FromHours(1)) // Give extra time
                });

                // Update the operation data
                var operationKey = GetOperationKey(operation.Id);
                var serializedOperation = JsonSerializer.Serialize(operation, GetJsonOptions());
                await _distributedCache.SetStringAsync(operationKey, serializedOperation, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
                });
                
                _logger.LogInformation("Requeued operation {OperationId} for retry #{RetryCount} after {Delay}",
                    operation.Id, operation.RetryCount, delay);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to requeue operation {OperationId}", operation.Id);
                throw;
            }
        }

        public async Task<List<RefreshOperation>> GetActiveOperationsAsync()
        {
            var activeOperations = new List<RefreshOperation>();

            try
            {
                var priorities = Enum.GetValues<RefreshPriority>();
                
                foreach (var priority in priorities)
                {
                    var queueKey = GetQueueKey(priority);
                    var queueList = await GetQueueListAsync(queueKey);
                    
                    foreach (var operationId in queueList)
                    {
                        var operationKey = GetOperationKey(operationId);
                        var serializedOperation = await _distributedCache.GetStringAsync(operationKey);
                        
                        if (!string.IsNullOrEmpty(serializedOperation))
                        {
                            var operation = JsonSerializer.Deserialize<RefreshOperation>(serializedOperation, GetJsonOptions());
                            if (operation != null)
                            {
                                activeOperations.Add(operation);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get active operations");
                throw;
            }

            return activeOperations;
        }

        public async Task ClearQueueAsync(RefreshPriority? priority = null)
        {
            try
            {
                var priorities = priority.HasValue ? new[] { priority.Value } : Enum.GetValues<RefreshPriority>();
                
                foreach (var p in priorities)
                {
                    var queueKey = GetQueueKey(p);
                    var queueList = await GetQueueListAsync(queueKey);
                    
                    // Remove all operations
                    foreach (var operationId in queueList)
                    {
                        var operationKey = GetOperationKey(operationId);
                        await _distributedCache.RemoveAsync(operationKey);
                    }
                    
                    // Clear the queue list
                    await _distributedCache.RemoveAsync(queueKey);
                }

                _logger.LogInformation("Cleared refresh queue for priority {Priority}", priority?.ToString() ?? "All");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to clear refresh queue for priority {Priority}", priority);
                throw;
            }
        }

        private async Task ProcessDelayedOperationsAsync()
        {
            try
            {
                // Note: delayedQueuePattern would be used for Redis SCAN in production
                // var delayedQueuePattern = "refresh:delayed:*";
                var currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                // Note: This is a simplified approach. In production, you might want to use Redis SCAN
                // or maintain a separate index for delayed operations for better performance

                var keys = new List<string>(); // Would need to implement key scanning based on your Redis client
                
                foreach (var key in keys)
                {
                    var serializedEntry = await _distributedCache.GetStringAsync(key);
                    if (!string.IsNullOrEmpty(serializedEntry))
                    {
                        var delayedEntry = JsonSerializer.Deserialize<DelayedRefreshEntry>(serializedEntry, GetJsonOptions());
                        
                        if (delayedEntry != null && delayedEntry.ExecuteAt <= currentTime)
                        {
                            // Move back to regular queue
                            var operationKey = GetOperationKey(delayedEntry.OperationId);
                            var operationData = await _distributedCache.GetStringAsync(operationKey);
                            
                            if (!string.IsNullOrEmpty(operationData))
                            {
                                var operation = JsonSerializer.Deserialize<RefreshOperation>(operationData, GetJsonOptions());
                                if (operation != null)
                                {
                                    await EnqueueAsync(operation);
                                }
                            }
                            
                            // Remove from delayed queue
                            await _distributedCache.RemoveAsync(key);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing delayed operations");
            }
        }

        private async Task<List<string>> GetQueueListAsync(string queueKey)
        {
            var serializedList = await _distributedCache.GetStringAsync(queueKey);
            if (string.IsNullOrEmpty(serializedList))
            {
                return new List<string>();
            }
            
            return JsonSerializer.Deserialize<List<string>>(serializedList, GetJsonOptions()) ?? new List<string>();
        }

        private async Task SetQueueListAsync(string queueKey, List<string> queueList)
        {
            var serializedList = JsonSerializer.Serialize(queueList, GetJsonOptions());
            await _distributedCache.SetStringAsync(queueKey, serializedList, new DistributedCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromHours(24)
            });
        }

        private static string GetQueueKey(RefreshPriority priority) => $"refresh:queue:{priority}";
        private static string GetOperationKey(string operationId) => $"refresh:operation:{operationId}";

        private static JsonSerializerOptions GetJsonOptions() => new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    internal class DelayedRefreshEntry
    {
        public string OperationId { get; set; } = string.Empty;
        public long ExecuteAt { get; set; }
        public RefreshPriority Priority { get; set; }
    }
}