using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Azure.ServiceBus;
using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Infrastructure.Scaling
{
    /// <summary>
    /// Distributed page generation system for handling 50K+ programmatic SEO pages
    /// Targets 99.5% uptime with horizontal scaling capabilities
    /// </summary>
    public interface IPageGenerationService
    {
        Task<string> QueuePageGenerationAsync(PageGenerationRequest request);
        Task<PageGenerationStatus> GetGenerationStatusAsync(string jobId);
        Task<List<PageGenerationJob>> GetPendingJobsAsync(int limit = 100);
        Task<bool> ProcessPageGenerationBatchAsync(List<PageGenerationJob> jobs);
        Task<GenerationMetrics> GetSystemMetricsAsync();
    }

    public class PageGenerationRequest
    {
        public string ContentType { get; set; } = string.Empty; // "movie", "tv", "streaming"
        public string ContentId { get; set; } = string.Empty;
        public string Priority { get; set; } = "normal"; // "high", "normal", "low"
        public Dictionary<string, object> Metadata { get; set; } = new();
        public List<string> CountryCodes { get; set; } = new();
        public List<string> Languages { get; set; } = new();
        public DateTime RequestedBy { get; set; } = DateTime.UtcNow;
        public string CorrelationId { get; set; } = Guid.NewGuid().ToString();
    }

    public class PageGenerationJob
    {
        public string JobId { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public string ContentId { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = "pending"; // pending, processing, completed, failed
        public Dictionary<string, object> Metadata { get; set; } = new();
        public List<string> GeneratedUrls { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public int RetryCount { get; set; } = 0;
        public string WorkerId { get; set; } = string.Empty;
    }

    public class PageGenerationStatus
    {
        public string JobId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int PagesGenerated { get; set; }
        public int TotalPages { get; set; }
        public double ProgressPercentage => TotalPages > 0 ? (double)PagesGenerated / TotalPages * 100 : 0;
        public List<string> GeneratedUrls { get; set; } = new();
        public DateTime? EstimatedCompletion { get; set; }
        public TimeSpan ProcessingTime { get; set; }
    }

    public class GenerationMetrics
    {
        public int ActiveWorkers { get; set; }
        public int QueuedJobs { get; set; }
        public int ProcessingJobs { get; set; }
        public int CompletedJobsToday { get; set; }
        public int FailedJobsToday { get; set; }
        public double AverageProcessingTime { get; set; }
        public double SystemLoad { get; set; }
        public double MemoryUsage { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

    public class DistributedPageGenerationService : IPageGenerationService
    {
        private readonly IServiceBusClient _serviceBusClient;
        private readonly IDistributedCache _cache;
        private readonly ILogger<DistributedPageGenerationService> _logger;
        private readonly IConfiguration _configuration;
        private readonly ConcurrentDictionary<string, PageGenerationJob> _activeJobs;
        private readonly string _workerInstanceId;

        // Service Bus clients
        private ServiceBusSender? _normalQueueSender;
        private ServiceBusSender? _priorityQueueSender;
        private ServiceBusProcessor? _normalQueueProcessor;
        private ServiceBusProcessor? _priorityQueueProcessor;

        public DistributedPageGenerationService(
            IServiceBusClient serviceBusClient,
            IDistributedCache cache,
            ILogger<DistributedPageGenerationService> logger,
            IConfiguration configuration)
        {
            _serviceBusClient = serviceBusClient;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;
            _activeJobs = new ConcurrentDictionary<string, PageGenerationJob>();
            _workerInstanceId = Environment.MachineName + "-" + Environment.ProcessId;

            InitializeServiceBusClients();
        }

        private void InitializeServiceBusClients()
        {
            try
            {
                _normalQueueSender = _serviceBusClient.CreateSender("page-generation");
                _priorityQueueSender = _serviceBusClient.CreateSender("page-generation-priority");

                // Initialize processors for handling messages
                var processorOptions = new ServiceBusProcessorOptions
                {
                    MaxConcurrentCalls = _configuration.GetValue<int>("ProgrammaticSeo:GenerationWorkers", 8),
                    AutoCompleteMessages = false,
                    ReceiveMode = ServiceBusReceiveMode.PeekLock,
                    PrefetchCount = 10
                };

                _normalQueueProcessor = _serviceBusClient.CreateProcessor("page-generation", processorOptions);
                _priorityQueueProcessor = _serviceBusClient.CreateProcessor("page-generation-priority", processorOptions);

                _normalQueueProcessor.ProcessMessageAsync += ProcessNormalPriorityMessage;
                _normalQueueProcessor.ProcessErrorAsync += ProcessError;
                
                _priorityQueueProcessor.ProcessMessageAsync += ProcessHighPriorityMessage;
                _priorityQueueProcessor.ProcessErrorAsync += ProcessError;

                _logger.LogInformation("Service Bus clients initialized successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Service Bus clients");
                throw;
            }
        }

        public async Task<string> QueuePageGenerationAsync(PageGenerationRequest request)
        {
            var jobId = Guid.NewGuid().ToString();
            
            try
            {
                var job = new PageGenerationJob
                {
                    JobId = jobId,
                    ContentType = request.ContentType,
                    ContentId = request.ContentId,
                    Priority = request.Priority,
                    Metadata = request.Metadata,
                    CreatedAt = DateTime.UtcNow,
                    Status = "queued"
                };

                // Store job in cache for tracking
                await _cache.SetStringAsync($"job:{jobId}", JsonSerializer.Serialize(job), 
                    new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
                    });

                // Send to appropriate queue based on priority
                var message = new ServiceBusMessage(JsonSerializer.Serialize(job))
                {
                    MessageId = jobId,
                    CorrelationId = request.CorrelationId,
                    Subject = $"{request.ContentType}-{request.ContentId}",
                    TimeToLive = TimeSpan.FromHours(24)
                };

                // Add custom properties for routing and filtering
                message.ApplicationProperties["ContentType"] = request.ContentType;
                message.ApplicationProperties["Priority"] = request.Priority;
                message.ApplicationProperties["CreatedAt"] = job.CreatedAt.ToString("O");

                ServiceBusSender sender = request.Priority == "high" ? _priorityQueueSender! : _normalQueueSender!;
                await sender.SendMessageAsync(message);

                _logger.LogInformation("Page generation job {JobId} queued with priority {Priority}", 
                    jobId, request.Priority);

                return jobId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to queue page generation job for content {ContentType}:{ContentId}", 
                    request.ContentType, request.ContentId);
                throw;
            }
        }

        public async Task<PageGenerationStatus> GetGenerationStatusAsync(string jobId)
        {
            try
            {
                var jobJson = await _cache.GetStringAsync($"job:{jobId}");
                if (string.IsNullOrEmpty(jobJson))
                {
                    throw new InvalidOperationException($"Job {jobId} not found");
                }

                var job = JsonSerializer.Deserialize<PageGenerationJob>(jobJson);
                if (job == null)
                {
                    throw new InvalidOperationException($"Invalid job data for {jobId}");
                }

                return new PageGenerationStatus
                {
                    JobId = job.JobId,
                    Status = job.Status,
                    PagesGenerated = job.GeneratedUrls.Count,
                    TotalPages = CalculateExpectedPages(job),
                    GeneratedUrls = job.GeneratedUrls,
                    EstimatedCompletion = EstimateCompletionTime(job),
                    ProcessingTime = job.CompletedAt.HasValue ? 
                        job.CompletedAt.Value - job.StartedAt.GetValueOrDefault() : 
                        DateTime.UtcNow - job.StartedAt.GetValueOrDefault()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get generation status for job {JobId}", jobId);
                throw;
            }
        }

        public async Task<List<PageGenerationJob>> GetPendingJobsAsync(int limit = 100)
        {
            // This would typically query a database or distributed cache
            // For now, return active jobs being tracked
            return _activeJobs.Values
                .Where(j => j.Status == "pending" || j.Status == "processing")
                .Take(limit)
                .ToList();
        }

        public async Task<bool> ProcessPageGenerationBatchAsync(List<PageGenerationJob> jobs)
        {
            var processedCount = 0;
            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = _configuration.GetValue<int>("ProgrammaticSeo:MaxParallelGeneration", 4)
            };

            await Parallel.ForEachAsync(jobs, parallelOptions, async (job, cancellationToken) =>
            {
                try
                {
                    await ProcessSinglePageGenerationJob(job);
                    Interlocked.Increment(ref processedCount);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process page generation job {JobId}", job.JobId);
                    
                    job.Status = "failed";
                    job.ErrorMessage = ex.Message;
                    job.RetryCount++;
                    
                    // Update job in cache
                    await _cache.SetStringAsync($"job:{job.JobId}", JsonSerializer.Serialize(job));
                }
            });

            _logger.LogInformation("Processed {ProcessedCount}/{TotalCount} page generation jobs", 
                processedCount, jobs.Count);

            return processedCount == jobs.Count;
        }

        private async Task ProcessSinglePageGenerationJob(PageGenerationJob job)
        {
            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            job.WorkerId = _workerInstanceId;

            _logger.LogInformation("Processing page generation job {JobId} for {ContentType}:{ContentId}", 
                job.JobId, job.ContentType, job.ContentId);

            // Update job status in cache
            await _cache.SetStringAsync($"job:{job.JobId}", JsonSerializer.Serialize(job));

            try
            {
                // Generate pages based on content type and metadata
                var generatedUrls = await GeneratePagesForContent(job);
                
                job.GeneratedUrls.AddRange(generatedUrls);
                job.Status = "completed";
                job.CompletedAt = DateTime.UtcNow;

                // Update final job status
                await _cache.SetStringAsync($"job:{job.JobId}", JsonSerializer.Serialize(job));

                // Update metrics
                await UpdateSystemMetrics("job_completed", 1);

                _logger.LogInformation("Successfully generated {PageCount} pages for job {JobId}", 
                    generatedUrls.Count, job.JobId);
            }
            catch (Exception ex)
            {
                job.Status = "failed";
                job.ErrorMessage = ex.Message;
                job.CompletedAt = DateTime.UtcNow;
                
                await _cache.SetStringAsync($"job:{job.JobId}", JsonSerializer.Serialize(job));
                await UpdateSystemMetrics("job_failed", 1);

                _logger.LogError(ex, "Failed to generate pages for job {JobId}", job.JobId);
                throw;
            }
        }

        private async Task<List<string>> GeneratePagesForContent(PageGenerationJob job)
        {
            var generatedUrls = new List<string>();

            // Generate pages based on content type
            switch (job.ContentType.ToLowerInvariant())
            {
                case "movie":
                    generatedUrls.AddRange(await GenerateMoviePages(job));
                    break;
                case "tv":
                    generatedUrls.AddRange(await GenerateTvPages(job));
                    break;
                case "streaming":
                    generatedUrls.AddRange(await GenerateStreamingPages(job));
                    break;
                default:
                    throw new NotSupportedException($"Content type {job.ContentType} not supported");
            }

            return generatedUrls;
        }

        private async Task<List<string>> GenerateMoviePages(PageGenerationJob job)
        {
            var urls = new List<string>();
            
            // Generate movie-specific pages
            var baseSlug = job.Metadata.TryGetValue("slug", out var slugObj) ? 
                slugObj?.ToString() ?? job.ContentId : job.ContentId;

            // Main movie page
            urls.Add($"/movie/{baseSlug}");
            
            // Streaming availability pages by country
            if (job.Metadata.TryGetValue("countries", out var countriesObj) && 
                countriesObj is List<string> countries)
            {
                foreach (var country in countries)
                {
                    urls.Add($"/movie/{baseSlug}/streaming/{country.ToLower()}");
                    urls.Add($"/movie/{baseSlug}/watch-online/{country.ToLower()}");
                }
            }

            // Genre-specific pages
            if (job.Metadata.TryGetValue("genres", out var genresObj) && 
                genresObj is List<string> genres)
            {
                foreach (var genre in genres)
                {
                    var genreSlug = genre.ToLower().Replace(" ", "-");
                    urls.Add($"/movie/{baseSlug}/genre/{genreSlug}");
                }
            }

            // Simulate page generation processing time
            await Task.Delay(100);

            return urls;
        }

        private async Task<List<string>> GenerateTvPages(PageGenerationJob job)
        {
            var urls = new List<string>();
            
            var baseSlug = job.Metadata.TryGetValue("slug", out var slugObj) ? 
                slugObj?.ToString() ?? job.ContentId : job.ContentId;

            // Main TV show page
            urls.Add($"/tv/{baseSlug}");
            
            // Season pages
            if (job.Metadata.TryGetValue("seasons", out var seasonsObj) && 
                seasonsObj is int seasonCount)
            {
                for (int season = 1; season <= seasonCount; season++)
                {
                    urls.Add($"/tv/{baseSlug}/season/{season}");
                }
            }

            // Streaming availability pages
            if (job.Metadata.TryGetValue("countries", out var countriesObj) && 
                countriesObj is List<string> countries)
            {
                foreach (var country in countries)
                {
                    urls.Add($"/tv/{baseSlug}/streaming/{country.ToLower()}");
                    urls.Add($"/tv/{baseSlug}/watch-online/{country.ToLower()}");
                }
            }

            await Task.Delay(150);

            return urls;
        }

        private async Task<List<string>> GenerateStreamingPages(PageGenerationJob job)
        {
            var urls = new List<string>();
            
            // Generate streaming service pages
            if (job.Metadata.TryGetValue("service", out var serviceObj) && 
                serviceObj is string service)
            {
                var serviceSlug = service.ToLower().Replace(" ", "-");
                
                urls.Add($"/streaming/{serviceSlug}");
                urls.Add($"/streaming/{serviceSlug}/movies");
                urls.Add($"/streaming/{serviceSlug}/tv-shows");
                
                // Country-specific streaming pages
                if (job.Metadata.TryGetValue("countries", out var countriesObj) && 
                    countriesObj is List<string> countries)
                {
                    foreach (var country in countries)
                    {
                        urls.Add($"/streaming/{serviceSlug}/{country.ToLower()}");
                    }
                }
            }

            await Task.Delay(80);

            return urls;
        }

        private int CalculateExpectedPages(PageGenerationJob job)
        {
            // Calculate expected number of pages based on content type and metadata
            int basePages = 1; // Main page
            int multiplier = 1;

            if (job.Metadata.TryGetValue("countries", out var countriesObj) && 
                countriesObj is List<string> countries)
            {
                multiplier = countries.Count;
            }

            return job.ContentType.ToLowerInvariant() switch
            {
                "movie" => basePages + (multiplier * 3), // Base + country streaming pages
                "tv" => basePages + (multiplier * 3) + GetSeasonCount(job),
                "streaming" => basePages + (multiplier * 2) + 2, // Base + countries + movies/tv
                _ => basePages
            };
        }

        private int GetSeasonCount(PageGenerationJob job)
        {
            return job.Metadata.TryGetValue("seasons", out var seasonsObj) && 
                   seasonsObj is int seasonCount ? seasonCount : 0;
        }

        private DateTime? EstimateCompletionTime(PageGenerationJob job)
        {
            if (job.Status == "completed" || job.Status == "failed")
                return job.CompletedAt;

            if (job.StartedAt.HasValue)
            {
                var expectedPages = CalculateExpectedPages(job);
                var avgTimePerPage = TimeSpan.FromMilliseconds(120); // Based on generation times
                var estimatedTotal = TimeSpan.FromTicks(avgTimePerPage.Ticks * expectedPages);
                
                return job.StartedAt.Value.Add(estimatedTotal);
            }

            return null;
        }

        public async Task<GenerationMetrics> GetSystemMetricsAsync()
        {
            try
            {
                var metricsJson = await _cache.GetStringAsync("system:metrics");
                if (!string.IsNullOrEmpty(metricsJson))
                {
                    var metrics = JsonSerializer.Deserialize<GenerationMetrics>(metricsJson);
                    if (metrics != null)
                        return metrics;
                }

                // Return default metrics if none cached
                return new GenerationMetrics
                {
                    ActiveWorkers = _activeJobs.Count(kv => kv.Value.Status == "processing"),
                    QueuedJobs = _activeJobs.Count(kv => kv.Value.Status == "pending"),
                    ProcessingJobs = _activeJobs.Count(kv => kv.Value.Status == "processing"),
                    CompletedJobsToday = await GetDailyCompletedJobs(),
                    FailedJobsToday = await GetDailyFailedJobs(),
                    AverageProcessingTime = await GetAverageProcessingTime(),
                    SystemLoad = GetCurrentSystemLoad(),
                    MemoryUsage = GetMemoryUsage()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get system metrics");
                throw;
            }
        }

        private async Task UpdateSystemMetrics(string metricType, double value)
        {
            try
            {
                var key = $"metrics:{metricType}:{DateTime.UtcNow:yyyy-MM-dd}";
                await _cache.SetStringAsync(key, value.ToString(), 
                    new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
                    });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to update system metrics for {MetricType}", metricType);
            }
        }

        private async Task<int> GetDailyCompletedJobs()
        {
            var key = $"metrics:job_completed:{DateTime.UtcNow:yyyy-MM-dd}";
            var valueStr = await _cache.GetStringAsync(key);
            return int.TryParse(valueStr, out var value) ? value : 0;
        }

        private async Task<int> GetDailyFailedJobs()
        {
            var key = $"metrics:job_failed:{DateTime.UtcNow:yyyy-MM-dd}";
            var valueStr = await _cache.GetStringAsync(key);
            return int.TryParse(valueStr, out var value) ? value : 0;
        }

        private async Task<double> GetAverageProcessingTime()
        {
            // Calculate from completed jobs - simplified for demo
            return 2.5; // seconds
        }

        private double GetCurrentSystemLoad()
        {
            // Return CPU usage percentage - simplified
            return (double)_activeJobs.Count / Environment.ProcessorCount * 100;
        }

        private double GetMemoryUsage()
        {
            // Return memory usage percentage - simplified
            var process = System.Diagnostics.Process.GetCurrentProcess();
            return (double)process.WorkingSet64 / (1024 * 1024 * 1024); // GB
        }

        private async Task ProcessNormalPriorityMessage(ProcessMessageEventArgs args)
        {
            await ProcessQueueMessage(args, "normal");
        }

        private async Task ProcessHighPriorityMessage(ProcessMessageEventArgs args)
        {
            await ProcessQueueMessage(args, "high");
        }

        private async Task ProcessQueueMessage(ProcessMessageEventArgs args, string priority)
        {
            try
            {
                var jobJson = args.Message.Body.ToString();
                var job = JsonSerializer.Deserialize<PageGenerationJob>(jobJson);
                
                if (job != null)
                {
                    _activeJobs.TryAdd(job.JobId, job);
                    await ProcessSinglePageGenerationJob(job);
                    _activeJobs.TryRemove(job.JobId, out _);
                }

                await args.CompleteMessageAsync(args.Message);

                _logger.LogInformation("Successfully processed {Priority} priority message {MessageId}", 
                    priority, args.Message.MessageId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process {Priority} priority message {MessageId}", 
                    priority, args.Message.MessageId);
                
                // Dead letter the message if max retry attempts reached
                await args.DeadLetterMessageAsync(args.Message, 
                    "ProcessingError", ex.Message);
            }
        }

        private Task ProcessError(ProcessErrorEventArgs args)
        {
            _logger.LogError(args.Exception, "Service Bus processing error: {ErrorSource}", 
                args.ErrorSource);
            return Task.CompletedTask;
        }

        public async Task StartProcessingAsync()
        {
            await _priorityQueueProcessor!.StartProcessingAsync();
            await _normalQueueProcessor!.StartProcessingAsync();
            
            _logger.LogInformation("Page generation service started processing messages");
        }

        public async Task StopProcessingAsync()
        {
            await _priorityQueueProcessor!.StopProcessingAsync();
            await _normalQueueProcessor!.StopProcessingAsync();
            
            _logger.LogInformation("Page generation service stopped processing messages");
        }
    }

    // Background service for processing page generation jobs
    public class PageGenerationHostedService : BackgroundService
    {
        private readonly DistributedPageGenerationService _pageGenerationService;
        private readonly ILogger<PageGenerationHostedService> _logger;

        public PageGenerationHostedService(
            DistributedPageGenerationService pageGenerationService,
            ILogger<PageGenerationHostedService> logger)
        {
            _pageGenerationService = pageGenerationService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Page Generation Hosted Service starting");

            await _pageGenerationService.StartProcessingAsync();

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    // Perform periodic health checks and metrics updates
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                    
                    var metrics = await _pageGenerationService.GetSystemMetricsAsync();
                    _logger.LogInformation("System Metrics: {ActiveWorkers} active, {QueuedJobs} queued, {ProcessingJobs} processing", 
                        metrics.ActiveWorkers, metrics.QueuedJobs, metrics.ProcessingJobs);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in Page Generation Hosted Service");
            }
            finally
            {
                await _pageGenerationService.StopProcessingAsync();
                _logger.LogInformation("Page Generation Hosted Service stopped");
            }
        }
    }
}