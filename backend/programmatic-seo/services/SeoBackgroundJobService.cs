using Hangfire;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.ProgrammaticSeo.Services;
using GeoLeap.Api.ProgrammaticSeo.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using Hangfire.Storage;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Background job service for SEO content updates and maintenance
/// Handles automated content freshness, keyword updates, and performance monitoring
/// </summary>
public class SeoBackgroundJobService : ISeoBackgroundJobService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SeoBackgroundJobService> _logger;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IRecurringJobManager _recurringJobManager;

    public SeoBackgroundJobService(
        IServiceProvider serviceProvider,
        ILogger<SeoBackgroundJobService> logger,
        IBackgroundJobClient backgroundJobClient,
        IRecurringJobManager recurringJobManager)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _backgroundJobClient = backgroundJobClient;
        _recurringJobManager = recurringJobManager;
    }

    #region Job Scheduling

    /// <summary>
    /// Initialize all recurring background jobs
    /// </summary>
    public async Task InitializeRecurringJobsAsync()
    {
        // Content freshness jobs
        _recurringJobManager.AddOrUpdate(
            "refresh-outdated-pages",
            () => RefreshOutdatedPagesAsync(),
            Cron.Hourly, // Every hour
            TimeZoneInfo.Utc);

        // Keyword research jobs
        _recurringJobManager.AddOrUpdate(
            "update-keyword-data",
            () => UpdateKeywordDataAsync(),
            Cron.Daily, // Daily at midnight
            TimeZoneInfo.Utc);

        // Content metadata jobs
        _recurringJobManager.AddOrUpdate(
            "sync-streaming-availability",
            () => SyncStreamingAvailabilityAsync(),
            "0 */6 * * *", // Every 6 hours
            TimeZoneInfo.Utc);

        // Performance monitoring jobs
        _recurringJobManager.AddOrUpdate(
            "collect-performance-metrics",
            () => CollectPerformanceMetricsAsync(),
            Cron.Hourly,
            TimeZoneInfo.Utc);

        // Internal linking jobs
        _recurringJobManager.AddOrUpdate(
            "update-internal-links",
            () => UpdateInternalLinksAsync(),
            Cron.Daily,
            TimeZoneInfo.Utc);

        // Trending content analysis
        _recurringJobManager.AddOrUpdate(
            "analyze-trending-content",
            () => AnalyzeTrendingContentAsync(),
            "0 */2 * * *", // Every 2 hours
            TimeZoneInfo.Utc);

        _logger.LogInformation("All SEO recurring background jobs initialized successfully");
        await Task.CompletedTask;
    }

    /// <summary>
    /// Schedule immediate page generation job
    /// </summary>
    public async Task<string> SchedulePageGenerationAsync(int templateId, Dictionary<string, object> variables)
    {
        var jobId = _backgroundJobClient.Enqueue<ISeoTemplateService>(
            service => service.GeneratePageAsync(new SeoGenerationRequest
            {
                TemplateId = templateId,
                Variables = variables,
                PublishImmediately = true
            }));

        _logger.LogInformation("Scheduled page generation job {JobId} for template {TemplateId}", jobId, templateId);
        return jobId;
    }

    /// <summary>
    /// Schedule batch page generation job
    /// </summary>
    public async Task<string> ScheduleBatchGenerationAsync(SeoBatchGenerationRequest request)
    {
        var jobId = _backgroundJobClient.Enqueue<ISeoTemplateService>(
            service => service.StartBatchJobAsync(request));

        _logger.LogInformation("Scheduled batch generation job {JobId} for template {TemplateId} with {PageCount} pages", 
            jobId, request.TemplateId, request.VariableSets.Count);
        
        return jobId;
    }

    #endregion

    #region Background Job Implementations

    /// <summary>
    /// Refresh outdated SEO pages
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task RefreshOutdatedPagesAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var templateService = scope.ServiceProvider.GetRequiredService<ISeoTemplateService>();

            var refreshedCount = await templateService.RefreshOutdatedPagesAsync(batchSize: 500);
            
            _logger.LogInformation("Refreshed {Count} outdated SEO pages", refreshedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh outdated pages");
            throw;
        }
    }

    /// <summary>
    /// Update keyword research data
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task UpdateKeywordDataAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var keywordService = scope.ServiceProvider.GetRequiredService<IKeywordResearchService>();

            var updatedCount = await keywordService.RefreshKeywordDataAsync(batchSize: 1000);
            
            _logger.LogInformation("Updated {Count} keywords", updatedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update keyword data");
            throw;
        }
    }

    /// <summary>
    /// Sync streaming availability data
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task SyncStreamingAvailabilityAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var contentService = scope.ServiceProvider.GetRequiredService<IContentMetadataService>();

            var countries = new[] { "US", "CA", "UK", "AU", "DE", "FR" };
            
            foreach (var country in countries)
            {
                var content = await contentService.ImportStreamingAvailabilityAsync(country);
                _logger.LogInformation("Synced {Count} content items for {Country}", content.Count, country);
                
                // Small delay between countries to avoid API rate limits
                await Task.Delay(TimeSpan.FromSeconds(10));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync streaming availability");
            throw;
        }
    }

    /// <summary>
    /// Collect performance metrics for SEO pages
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task CollectPerformanceMetricsAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var performanceService = scope.ServiceProvider.GetRequiredService<ISeoPerformanceService>();

            await performanceService.CollectMetricsAsync();
            _logger.LogInformation("Collected SEO performance metrics");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to collect performance metrics");
            throw;
        }
    }

    /// <summary>
    /// Update internal links between pages
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task UpdateInternalLinksAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var templateService = scope.ServiceProvider.GetRequiredService<ISeoTemplateService>();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var templates = await dbContext.SeoTemplates
                .Where(t => t.IsActive)
                .ToListAsync();

            foreach (var template in templates)
            {
                var links = await templateService.GenerateInternalLinksAsync(template.Id);
                
                // Update pages with new internal links
                foreach (var pageLinks in links)
                {
                    var page = await dbContext.SeoPages.FindAsync(pageLinks.Key);
                    if (page != null)
                    {
                        var updatedContent = await templateService.InjectInternalLinksAsync(page.Content, pageLinks.Value);
                        page.Content = updatedContent;
                        page.LastUpdated = DateTime.UtcNow;
                    }
                }
                
                await dbContext.SaveChangesAsync();
                _logger.LogInformation("Updated internal links for template {TemplateId}", template.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update internal links");
            throw;
        }
    }

    /// <summary>
    /// Analyze trending content and update scores
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task AnalyzeTrendingContentAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var keywordService = scope.ServiceProvider.GetRequiredService<IKeywordResearchService>();
            var contentService = scope.ServiceProvider.GetRequiredService<IContentMetadataService>();

            // Get trending keywords
            var trendingKeywords = await keywordService.GetTrendingKeywordsAsync("all", 7);
            _logger.LogInformation("Found {Count} trending keywords", trendingKeywords.Count);

            // Update content trending scores
            await contentService.UpdateContentTrendingScoresAsync();
            _logger.LogInformation("Updated content trending scores");

            // Generate opportunities for new content
            var opportunities = await keywordService.FindContentGapsAsync("streaming");
            _logger.LogInformation("Identified {Count} content opportunities", opportunities.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze trending content");
            throw;
        }
    }

    #endregion

    #region Utility Methods

    /// <summary>
    /// Schedule a delayed job
    /// </summary>
    public async Task<string> ScheduleDelayedJobAsync<T>(Expression<Func<T, Task>> methodCall, TimeSpan delay)
    {
        var jobId = _backgroundJobClient.Schedule(methodCall, delay);
        _logger.LogInformation("Scheduled delayed job {JobId} with delay {Delay}", jobId, delay);
        return jobId;
    }

    /// <summary>
    /// Cancel a background job
    /// </summary>
    public async Task<bool> CancelJobAsync(string jobId)
    {
        var result = _backgroundJobClient.Delete(jobId);
        _logger.LogInformation("Cancelled job {JobId}: {Success}", jobId, result);
        return result;
    }

    /// <summary>
    /// Get job status
    /// </summary>
    public async Task<string> GetJobStatusAsync(string jobId)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var connection = scope.ServiceProvider.GetRequiredService<IJobStorageConnection>();
            var jobData = connection.GetJobData(jobId);
            
            return jobData?.State ?? "Unknown";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get job status for {JobId}", jobId);
            return "Error";
        }
    }

    #endregion
}

/// <summary>
/// Interface for SEO background job service
/// </summary>
public interface ISeoBackgroundJobService
{
    Task InitializeRecurringJobsAsync();
    Task<string> SchedulePageGenerationAsync(int templateId, Dictionary<string, object> variables);
    Task<string> ScheduleBatchGenerationAsync(SeoBatchGenerationRequest request);
    Task RefreshOutdatedPagesAsync();
    Task UpdateKeywordDataAsync();
    Task SyncStreamingAvailabilityAsync();
    Task CollectPerformanceMetricsAsync();
    Task UpdateInternalLinksAsync();
    Task AnalyzeTrendingContentAsync();
    Task<string> ScheduleDelayedJobAsync<T>(Expression<Func<T, Task>> methodCall, TimeSpan delay);
    Task<bool> CancelJobAsync(string jobId);
    Task<string> GetJobStatusAsync(string jobId);
}