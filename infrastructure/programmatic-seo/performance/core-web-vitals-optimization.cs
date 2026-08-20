using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;

namespace GeoLeap.Api.Infrastructure.Performance
{
    /// <summary>
    /// Core Web Vitals optimization system for programmatic SEO pages
    /// Targets: LCP <2.5s, FID <100ms, CLS <0.1 for 99% of page loads
    /// </summary>
    public interface ICoreWebVitalsService
    {
        Task<WebVitalsMetrics> MeasurePagePerformanceAsync(string pageUrl, string userAgent = "");
        Task<WebVitalsReport> GetPerformanceReportAsync(string pageUrl, TimeSpan? period = null);
        Task<List<PerformanceRecommendation>> GetOptimizationRecommendationsAsync(string pageUrl);
        Task OptimizePageAsync(string pageUrl, List<string> optimizations);
        Task<WebVitalsBenchmark> RunBenchmarkAsync(List<string> pageUrls);
        Task<bool> ValidateWebVitalsThresholdsAsync(WebVitalsMetrics metrics);
    }

    public class WebVitalsMetrics
    {
        public string PageUrl { get; set; } = string.Empty;
        public double LargestContentfulPaint { get; set; } // Target: <2.5s
        public double FirstInputDelay { get; set; } // Target: <100ms
        public double CumulativeLayoutShift { get; set; } // Target: <0.1
        public double FirstContentfulPaint { get; set; } // Target: <1.8s
        public double TimeToInteractive { get; set; } // Target: <3.8s
        public double SpeedIndex { get; set; } // Target: <3.4s
        public double TotalBlockingTime { get; set; } // Target: <200ms
        public int PerformanceScore { get; set; } // 0-100
        public DateTime MeasuredAt { get; set; } = DateTime.UtcNow;
        public string UserAgent { get; set; } = string.Empty;
        public string ConnectionType { get; set; } = "4g";
        public Dictionary<string, object> RawMetrics { get; set; } = new();
        public List<string> FailingAudits { get; set; } = new();
        public List<string> Opportunities { get; set; } = new();
        public ResourceMetrics ResourceMetrics { get; set; } = new();
    }

    public class ResourceMetrics
    {
        public int TotalResources { get; set; }
        public long TotalSize { get; set; }
        public long CompressedSize { get; set; }
        public double CompressionRatio => TotalSize > 0 ? (double)(TotalSize - CompressedSize) / TotalSize * 100 : 0;
        public int ImageCount { get; set; }
        public long ImageSize { get; set; }
        public int ScriptCount { get; set; }
        public long ScriptSize { get; set; }
        public int StylesheetCount { get; set; }
        public long StylesheetSize { get; set; }
        public int FontCount { get; set; }
        public long FontSize { get; set; }
        public List<ResourceTiming> CriticalResources { get; set; } = new();
        public List<ResourceTiming> UnusedResources { get; set; } = new();
    }

    public class ResourceTiming
    {
        public string Url { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public long Size { get; set; }
        public double LoadTime { get; set; }
        public bool IsRenderBlocking { get; set; }
        public bool IsCritical { get; set; }
        public string OptimizationSuggestion { get; set; } = string.Empty;
    }

    public class WebVitalsReport
    {
        public string PageUrl { get; set; } = string.Empty;
        public List<WebVitalsMetrics> HistoricalMetrics { get; set; } = new();
        public WebVitalsMetrics AverageMetrics { get; set; } = new();
        public WebVitalsMetrics P95Metrics { get; set; } = new();
        public WebVitalsMetrics P99Metrics { get; set; } = new();
        public int TotalMeasurements { get; set; }
        public DateTime ReportGeneratedAt { get; set; } = DateTime.UtcNow;
        public PerformanceTrends Trends { get; set; } = new();
        public List<PerformanceAlert> Alerts { get; set; } = new();
        public Dictionary<string, double> DeviceTypeBreakdown { get; set; } = new();
        public Dictionary<string, double> ConnectionTypeBreakdown { get; set; } = new();
    }

    public class PerformanceTrends
    {
        public double LcpTrend { get; set; } // Positive = improving
        public double FidTrend { get; set; }
        public double ClsTrend { get; set; }
        public double OverallScoreTrend { get; set; }
        public string TrendPeriod { get; set; } = "7 days";
        public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PerformanceAlert
    {
        public string Type { get; set; } = string.Empty; // "threshold_exceeded", "regression", "opportunity"
        public string Severity { get; set; } = string.Empty; // "critical", "warning", "info"
        public string Message { get; set; } = string.Empty;
        public string Metric { get; set; } = string.Empty;
        public double CurrentValue { get; set; }
        public double ThresholdValue { get; set; }
        public List<string> RecommendedActions { get; set; } = new();
        public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    }

    public class PerformanceRecommendation
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // "images", "javascript", "css", "fonts", "html"
        public int Priority { get; set; } // 1-10, 10 being highest
        public double EstimatedImpact { get; set; } // Estimated LCP improvement in ms
        public double ImplementationDifficulty { get; set; } // 1-10, 10 being hardest
        public List<string> ImplementationSteps { get; set; } = new();
        public string TargetMetric { get; set; } = string.Empty; // "LCP", "FID", "CLS"
        public Dictionary<string, object> TechnicalDetails { get; set; } = new();
    }

    public class WebVitalsBenchmark
    {
        public List<string> TestedUrls { get; set; } = new();
        public Dictionary<string, WebVitalsMetrics> Results { get; set; } = new();
        public WebVitalsMetrics AverageMetrics { get; set; } = new();
        public int PassingUrls { get; set; }
        public int FailingUrls { get; set; }
        public double PassRate => TestedUrls.Count > 0 ? (double)PassingUrls / TestedUrls.Count * 100 : 0;
        public List<string> TopPerformingUrls { get; set; } = new();
        public List<string> WorstPerformingUrls { get; set; } = new();
        public DateTime BenchmarkCompletedAt { get; set; } = DateTime.UtcNow;
        public TimeSpan TotalTestTime { get; set; }
    }

    public class CoreWebVitalsService : ICoreWebVitalsService
    {
        private readonly ILogger<CoreWebVitalsService> _logger;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ConcurrentDictionary<string, WebVitalsMetrics> _metricsCache;
        private readonly ConcurrentDictionary<string, List<PerformanceRecommendation>> _recommendationsCache;
        
        // Performance thresholds
        private const double LCP_GOOD_THRESHOLD = 2500; // 2.5 seconds
        private const double FID_GOOD_THRESHOLD = 100;  // 100 milliseconds
        private const double CLS_GOOD_THRESHOLD = 0.1;  // 0.1
        private const double FCP_GOOD_THRESHOLD = 1800; // 1.8 seconds
        private const double TTI_GOOD_THRESHOLD = 3800; // 3.8 seconds
        private const int MIN_PERFORMANCE_SCORE = 90;   // Target score

        public CoreWebVitalsService(
            ILogger<CoreWebVitalsService> logger,
            IConfiguration configuration,
            HttpClient httpClient)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClient;
            _metricsCache = new ConcurrentDictionary<string, WebVitalsMetrics>();
            _recommendationsCache = new ConcurrentDictionary<string, List<PerformanceRecommendation>>();
        }

        public async Task<WebVitalsMetrics> MeasurePagePerformanceAsync(string pageUrl, string userAgent = "")
        {
            var stopwatch = Stopwatch.StartNew();
            _logger.LogInformation("Measuring Core Web Vitals for: {PageUrl}", pageUrl);

            try
            {
                // Check cache first
                var cacheKey = $"{pageUrl}:{userAgent}:{DateTime.UtcNow:yyyy-MM-dd-HH}";
                if (_metricsCache.TryGetValue(cacheKey, out var cachedMetrics))
                {
                    return cachedMetrics;
                }

                var metrics = new WebVitalsMetrics
                {
                    PageUrl = pageUrl,
                    UserAgent = userAgent,
                    MeasuredAt = DateTime.UtcNow
                };

                // Simulate comprehensive performance measurement
                // In production, this would use tools like Lighthouse, WebPageTest, or browser APIs
                metrics = await SimulatePerformanceMeasurement(pageUrl, userAgent);

                // Analyze resource loading
                metrics.ResourceMetrics = await AnalyzeResourcePerformance(pageUrl);

                // Calculate performance score
                metrics.PerformanceScore = CalculatePerformanceScore(metrics);

                // Identify failing audits
                metrics.FailingAudits = IdentifyFailingAudits(metrics);

                // Identify opportunities
                metrics.Opportunities = IdentifyOptimizationOpportunities(metrics);

                // Cache results
                _metricsCache.TryAdd(cacheKey, metrics);

                stopwatch.Stop();
                _logger.LogInformation("Performance measurement completed for {PageUrl} in {ElapsedMs}ms. Score: {Score}",
                    pageUrl, stopwatch.ElapsedMilliseconds, metrics.PerformanceScore);

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to measure performance for {PageUrl}", pageUrl);
                throw;
            }
        }

        public async Task<WebVitalsReport> GetPerformanceReportAsync(string pageUrl, TimeSpan? period = null)
        {
            try
            {
                var reportPeriod = period ?? TimeSpan.FromDays(7);
                var endDate = DateTime.UtcNow;
                var startDate = endDate.Subtract(reportPeriod);

                // In production, this would query a database of historical measurements
                var historicalMetrics = await GetHistoricalMetrics(pageUrl, startDate, endDate);

                var report = new WebVitalsReport
                {
                    PageUrl = pageUrl,
                    HistoricalMetrics = historicalMetrics,
                    TotalMeasurements = historicalMetrics.Count,
                    ReportGeneratedAt = DateTime.UtcNow
                };

                if (historicalMetrics.Any())
                {
                    report.AverageMetrics = CalculateAverageMetrics(historicalMetrics);
                    report.P95Metrics = CalculatePercentileMetrics(historicalMetrics, 95);
                    report.P99Metrics = CalculatePercentileMetrics(historicalMetrics, 99);
                    report.Trends = CalculatePerformanceTrends(historicalMetrics);
                    report.Alerts = GeneratePerformanceAlerts(report);
                    report.DeviceTypeBreakdown = AnalyzeDeviceTypeBreakdown(historicalMetrics);
                    report.ConnectionTypeBreakdown = AnalyzeConnectionTypeBreakdown(historicalMetrics);
                }

                return report;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate performance report for {PageUrl}", pageUrl);
                throw;
            }
        }

        public async Task<List<PerformanceRecommendation>> GetOptimizationRecommendationsAsync(string pageUrl)
        {
            try
            {
                // Check cache
                if (_recommendationsCache.TryGetValue(pageUrl, out var cachedRecommendations))
                {
                    return cachedRecommendations;
                }

                // Measure current performance
                var metrics = await MeasurePagePerformanceAsync(pageUrl);
                
                var recommendations = new List<PerformanceRecommendation>();

                // LCP Optimizations
                if (metrics.LargestContentfulPaint > LCP_GOOD_THRESHOLD)
                {
                    recommendations.AddRange(GenerateLcpRecommendations(metrics));
                }

                // FID Optimizations  
                if (metrics.FirstInputDelay > FID_GOOD_THRESHOLD)
                {
                    recommendations.AddRange(GenerateFidRecommendations(metrics));
                }

                // CLS Optimizations
                if (metrics.CumulativeLayoutShift > CLS_GOOD_THRESHOLD)
                {
                    recommendations.AddRange(GenerateClsRecommendations(metrics));
                }

                // General performance optimizations
                if (metrics.PerformanceScore < MIN_PERFORMANCE_SCORE)
                {
                    recommendations.AddRange(GenerateGeneralPerformanceRecommendations(metrics));
                }

                // Sort by priority and estimated impact
                recommendations = recommendations
                    .OrderByDescending(r => r.Priority)
                    .ThenByDescending(r => r.EstimatedImpact)
                    .ThenBy(r => r.ImplementationDifficulty)
                    .ToList();

                // Cache recommendations
                _recommendationsCache.TryAdd(pageUrl, recommendations);

                _logger.LogInformation("Generated {Count} optimization recommendations for {PageUrl}", 
                    recommendations.Count, pageUrl);

                return recommendations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate recommendations for {PageUrl}", pageUrl);
                throw;
            }
        }

        public async Task OptimizePageAsync(string pageUrl, List<string> optimizations)
        {
            try
            {
                _logger.LogInformation("Applying {Count} optimizations to {PageUrl}", optimizations.Count, pageUrl);

                foreach (var optimization in optimizations)
                {
                    await ApplyOptimization(pageUrl, optimization);
                }

                // Clear cache to force re-measurement
                var cacheKeysToRemove = _metricsCache.Keys
                    .Where(key => key.StartsWith(pageUrl))
                    .ToList();

                foreach (var key in cacheKeysToRemove)
                {
                    _metricsCache.TryRemove(key, out _);
                }

                _recommendationsCache.TryRemove(pageUrl, out _);

                _logger.LogInformation("Optimizations applied successfully for {PageUrl}", pageUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply optimizations for {PageUrl}", pageUrl);
                throw;
            }
        }

        public async Task<WebVitalsBenchmark> RunBenchmarkAsync(List<string> pageUrls)
        {
            var stopwatch = Stopwatch.StartNew();
            _logger.LogInformation("Running Core Web Vitals benchmark for {Count} URLs", pageUrls.Count);

            try
            {
                var benchmark = new WebVitalsBenchmark
                {
                    TestedUrls = pageUrls,
                    Results = new Dictionary<string, WebVitalsMetrics>()
                };

                // Measure performance for each URL in parallel
                var measurementTasks = pageUrls.Select(async url =>
                {
                    try
                    {
                        var metrics = await MeasurePagePerformanceAsync(url);
                        return new { Url = url, Metrics = metrics };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to measure {Url} during benchmark", url);
                        return null;
                    }
                }).ToList();

                var results = await Task.WhenAll(measurementTasks);

                // Process results
                foreach (var result in results.Where(r => r != null))
                {
                    benchmark.Results[result.Url] = result.Metrics;
                    
                    if (await ValidateWebVitalsThresholdsAsync(result.Metrics))
                    {
                        benchmark.PassingUrls++;
                    }
                    else
                    {
                        benchmark.FailingUrls++;
                    }
                }

                // Calculate averages and identify top/worst performers
                if (benchmark.Results.Any())
                {
                    benchmark.AverageMetrics = CalculateAverageMetrics(benchmark.Results.Values.ToList());
                    
                    benchmark.TopPerformingUrls = benchmark.Results
                        .OrderByDescending(kv => kv.Value.PerformanceScore)
                        .Take(5)
                        .Select(kv => kv.Key)
                        .ToList();
                    
                    benchmark.WorstPerformingUrls = benchmark.Results
                        .OrderBy(kv => kv.Value.PerformanceScore)
                        .Take(5)
                        .Select(kv => kv.Key)
                        .ToList();
                }

                stopwatch.Stop();
                benchmark.TotalTestTime = stopwatch.Elapsed;
                benchmark.BenchmarkCompletedAt = DateTime.UtcNow;

                _logger.LogInformation("Benchmark completed: {PassRate:F1}% pass rate ({Passing}/{Total}) in {ElapsedMs}ms",
                    benchmark.PassRate, benchmark.PassingUrls, pageUrls.Count, stopwatch.ElapsedMilliseconds);

                return benchmark;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Benchmark failed");
                throw;
            }
        }

        public async Task<bool> ValidateWebVitalsThresholdsAsync(WebVitalsMetrics metrics)
        {
            return await Task.FromResult(
                metrics.LargestContentfulPaint <= LCP_GOOD_THRESHOLD &&
                metrics.FirstInputDelay <= FID_GOOD_THRESHOLD &&
                metrics.CumulativeLayoutShift <= CLS_GOOD_THRESHOLD &&
                metrics.PerformanceScore >= MIN_PERFORMANCE_SCORE
            );
        }

        #region Private Helper Methods

        private async Task<WebVitalsMetrics> SimulatePerformanceMeasurement(string pageUrl, string userAgent)
        {
            // In production, this would integrate with actual measurement tools
            // This is a simulation for demonstration purposes
            
            await Task.Delay(Random.Shared.Next(100, 500)); // Simulate measurement time

            var baselinePerformance = GetBaselinePerformance(pageUrl);
            var deviceMultiplier = GetDeviceMultiplier(userAgent);
            var connectionMultiplier = GetConnectionMultiplier();

            return new WebVitalsMetrics
            {
                PageUrl = pageUrl,
                LargestContentfulPaint = baselinePerformance.lcp * deviceMultiplier * connectionMultiplier,
                FirstInputDelay = baselinePerformance.fid * deviceMultiplier,
                CumulativeLayoutShift = baselinePerformance.cls + Random.Shared.NextDouble() * 0.05,
                FirstContentfulPaint = baselinePerformance.fcp * deviceMultiplier * connectionMultiplier,
                TimeToInteractive = baselinePerformance.tti * deviceMultiplier * connectionMultiplier,
                SpeedIndex = baselinePerformance.si * deviceMultiplier * connectionMultiplier,
                TotalBlockingTime = baselinePerformance.tbt * deviceMultiplier,
                UserAgent = userAgent,
                ConnectionType = DetermineConnectionType(),
                MeasuredAt = DateTime.UtcNow
            };
        }

        private (double lcp, double fid, double cls, double fcp, double tti, double si, double tbt) GetBaselinePerformance(string pageUrl)
        {
            // Simulate different performance characteristics based on page type
            if (pageUrl.Contains("/movie/") || pageUrl.Contains("/tv/"))
            {
                return (2200, 80, 0.08, 1500, 3200, 2800, 150); // Content pages - good performance
            }
            else if (pageUrl.Contains("/search") || pageUrl.Contains("/api/"))
            {
                return (1800, 60, 0.05, 1200, 2800, 2400, 120); // Search/API pages - excellent performance
            }
            else if (pageUrl.Contains("/streaming/"))
            {
                return (2500, 90, 0.09, 1600, 3400, 3000, 180); // Streaming pages - acceptable performance
            }
            else
            {
                return (2000, 70, 0.06, 1400, 3000, 2600, 140); // Default pages - good performance
            }
        }

        private double GetDeviceMultiplier(string userAgent)
        {
            if (string.IsNullOrEmpty(userAgent))
                return 1.0;

            if (userAgent.Contains("Mobile"))
                return 1.3; // Mobile devices are slower
            else if (userAgent.Contains("Tablet"))
                return 1.1; // Tablets are slightly slower
            else
                return 1.0; // Desktop performance
        }

        private double GetConnectionMultiplier()
        {
            var connectionTypes = new[] { "4g", "3g", "slow-2g", "wifi" };
            var weights = new[] { 1.0, 1.5, 2.5, 0.8 };
            var index = Random.Shared.Next(connectionTypes.Length);
            return weights[index];
        }

        private string DetermineConnectionType()
        {
            var types = new[] { "4g", "3g", "slow-2g", "wifi" };
            var weights = new[] { 60, 25, 5, 10 }; // Percentage distribution
            
            var random = Random.Shared.Next(100);
            var cumulative = 0;
            
            for (int i = 0; i < types.Length; i++)
            {
                cumulative += weights[i];
                if (random < cumulative)
                    return types[i];
            }
            
            return "4g";
        }

        private async Task<ResourceMetrics> AnalyzeResourcePerformance(string pageUrl)
        {
            // Simulate resource analysis
            await Task.Delay(50);

            return new ResourceMetrics
            {
                TotalResources = Random.Shared.Next(20, 50),
                TotalSize = Random.Shared.Next(500000, 2000000), // 500KB - 2MB
                CompressedSize = Random.Shared.Next(200000, 800000), // 200KB - 800KB
                ImageCount = Random.Shared.Next(5, 15),
                ImageSize = Random.Shared.Next(200000, 800000),
                ScriptCount = Random.Shared.Next(3, 8),
                ScriptSize = Random.Shared.Next(100000, 400000),
                StylesheetCount = Random.Shared.Next(2, 5),
                StylesheetSize = Random.Shared.Next(50000, 200000),
                FontCount = Random.Shared.Next(1, 4),
                FontSize = Random.Shared.Next(50000, 150000)
            };
        }

        private int CalculatePerformanceScore(WebVitalsMetrics metrics)
        {
            var lcpScore = CalculateMetricScore(metrics.LargestContentfulPaint, LCP_GOOD_THRESHOLD, 4000, false);
            var fidScore = CalculateMetricScore(metrics.FirstInputDelay, FID_GOOD_THRESHOLD, 300, false);
            var clsScore = CalculateMetricScore(metrics.CumulativeLayoutShift, CLS_GOOD_THRESHOLD, 0.25, false);
            var fcpScore = CalculateMetricScore(metrics.FirstContentfulPaint, FCP_GOOD_THRESHOLD, 3000, false);
            
            // Weighted average (LCP and CLS are most important)
            var weightedScore = (lcpScore * 0.25) + (fidScore * 0.1) + (clsScore * 0.25) + 
                              (fcpScore * 0.15) + (90 * 0.25); // Base score for other factors
            
            return Math.Max(0, Math.Min(100, (int)Math.Round(weightedScore)));
        }

        private double CalculateMetricScore(double value, double goodThreshold, double poorThreshold, bool higherIsBetter)
        {
            if (higherIsBetter)
            {
                if (value >= goodThreshold) return 100;
                if (value <= poorThreshold) return 0;
                return (value - poorThreshold) / (goodThreshold - poorThreshold) * 100;
            }
            else
            {
                if (value <= goodThreshold) return 100;
                if (value >= poorThreshold) return 0;
                return (poorThreshold - value) / (poorThreshold - goodThreshold) * 100;
            }
        }

        private List<string> IdentifyFailingAudits(WebVitalsMetrics metrics)
        {
            var failingAudits = new List<string>();

            if (metrics.LargestContentfulPaint > LCP_GOOD_THRESHOLD)
                failingAudits.Add("largest-contentful-paint");

            if (metrics.FirstInputDelay > FID_GOOD_THRESHOLD)
                failingAudits.Add("first-input-delay");

            if (metrics.CumulativeLayoutShift > CLS_GOOD_THRESHOLD)
                failingAudits.Add("cumulative-layout-shift");

            if (metrics.FirstContentfulPaint > FCP_GOOD_THRESHOLD)
                failingAudits.Add("first-contentful-paint");

            if (metrics.TimeToInteractive > TTI_GOOD_THRESHOLD)
                failingAudits.Add("interactive");

            if (metrics.TotalBlockingTime > 200)
                failingAudits.Add("total-blocking-time");

            return failingAudits;
        }

        private List<string> IdentifyOptimizationOpportunities(WebVitalsMetrics metrics)
        {
            var opportunities = new List<string>();

            if (metrics.ResourceMetrics.ImageSize > 500000)
                opportunities.Add("optimize-images");

            if (metrics.ResourceMetrics.ScriptSize > 300000)
                opportunities.Add("minify-javascript");

            if (metrics.ResourceMetrics.CompressionRatio < 50)
                opportunities.Add("enable-text-compression");

            if (metrics.LargestContentfulPaint > 2000)
                opportunities.Add("preload-lcp-image");

            if (metrics.TotalBlockingTime > 150)
                opportunities.Add("reduce-unused-javascript");

            return opportunities;
        }

        private async Task<List<WebVitalsMetrics>> GetHistoricalMetrics(string pageUrl, DateTime startDate, DateTime endDate)
        {
            // In production, this would query a database
            // Simulate historical data
            var metrics = new List<WebVitalsMetrics>();
            var random = new Random();
            
            for (var date = startDate; date <= endDate; date = date.AddHours(4))
            {
                var baseMetrics = await SimulatePerformanceMeasurement(pageUrl, "");
                baseMetrics.MeasuredAt = date;
                metrics.Add(baseMetrics);
            }

            return metrics;
        }

        private WebVitalsMetrics CalculateAverageMetrics(List<WebVitalsMetrics> metrics)
        {
            if (!metrics.Any()) return new WebVitalsMetrics();

            return new WebVitalsMetrics
            {
                LargestContentfulPaint = metrics.Average(m => m.LargestContentfulPaint),
                FirstInputDelay = metrics.Average(m => m.FirstInputDelay),
                CumulativeLayoutShift = metrics.Average(m => m.CumulativeLayoutShift),
                FirstContentfulPaint = metrics.Average(m => m.FirstContentfulPaint),
                TimeToInteractive = metrics.Average(m => m.TimeToInteractive),
                SpeedIndex = metrics.Average(m => m.SpeedIndex),
                TotalBlockingTime = metrics.Average(m => m.TotalBlockingTime),
                PerformanceScore = (int)metrics.Average(m => m.PerformanceScore)
            };
        }

        private WebVitalsMetrics CalculatePercentileMetrics(List<WebVitalsMetrics> metrics, int percentile)
        {
            if (!metrics.Any()) return new WebVitalsMetrics();

            var index = (int)Math.Ceiling(metrics.Count * percentile / 100.0) - 1;
            index = Math.Max(0, Math.Min(index, metrics.Count - 1));

            var sortedByLcp = metrics.OrderBy(m => m.LargestContentfulPaint).ToList();
            var sortedByFid = metrics.OrderBy(m => m.FirstInputDelay).ToList();
            var sortedByCls = metrics.OrderBy(m => m.CumulativeLayoutShift).ToList();

            return new WebVitalsMetrics
            {
                LargestContentfulPaint = sortedByLcp[index].LargestContentfulPaint,
                FirstInputDelay = sortedByFid[index].FirstInputDelay,
                CumulativeLayoutShift = sortedByCls[index].CumulativeLayoutShift,
                FirstContentfulPaint = metrics.OrderBy(m => m.FirstContentfulPaint).ToList()[index].FirstContentfulPaint,
                TimeToInteractive = metrics.OrderBy(m => m.TimeToInteractive).ToList()[index].TimeToInteractive,
                SpeedIndex = metrics.OrderBy(m => m.SpeedIndex).ToList()[index].SpeedIndex,
                TotalBlockingTime = metrics.OrderBy(m => m.TotalBlockingTime).ToList()[index].TotalBlockingTime,
                PerformanceScore = metrics.OrderBy(m => m.PerformanceScore).ToList()[index].PerformanceScore
            };
        }

        private PerformanceTrends CalculatePerformanceTrends(List<WebVitalsMetrics> metrics)
        {
            if (metrics.Count < 2) return new PerformanceTrends();

            var recent = metrics.TakeLast(metrics.Count / 2).ToList();
            var older = metrics.Take(metrics.Count / 2).ToList();

            var recentAvg = CalculateAverageMetrics(recent);
            var olderAvg = CalculateAverageMetrics(older);

            return new PerformanceTrends
            {
                LcpTrend = olderAvg.LargestContentfulPaint - recentAvg.LargestContentfulPaint, // Positive = improvement
                FidTrend = olderAvg.FirstInputDelay - recentAvg.FirstInputDelay,
                ClsTrend = olderAvg.CumulativeLayoutShift - recentAvg.CumulativeLayoutShift,
                OverallScoreTrend = recentAvg.PerformanceScore - olderAvg.PerformanceScore
            };
        }

        private List<PerformanceAlert> GeneratePerformanceAlerts(WebVitalsReport report)
        {
            var alerts = new List<PerformanceAlert>();

            if (report.AverageMetrics.LargestContentfulPaint > LCP_GOOD_THRESHOLD)
            {
                alerts.Add(new PerformanceAlert
                {
                    Type = "threshold_exceeded",
                    Severity = report.AverageMetrics.LargestContentfulPaint > 4000 ? "critical" : "warning",
                    Message = $"LCP ({report.AverageMetrics.LargestContentfulPaint:F0}ms) exceeds recommended threshold",
                    Metric = "LCP",
                    CurrentValue = report.AverageMetrics.LargestContentfulPaint,
                    ThresholdValue = LCP_GOOD_THRESHOLD,
                    RecommendedActions = new List<string>
                    {
                        "Optimize images and lazy load non-critical images",
                        "Implement resource preloading for LCP element",
                        "Minimize render-blocking resources"
                    }
                });
            }

            if (report.Trends.LcpTrend < -500) // Getting worse by more than 500ms
            {
                alerts.Add(new PerformanceAlert
                {
                    Type = "regression",
                    Severity = "warning",
                    Message = $"LCP performance is regressing ({report.Trends.LcpTrend:F0}ms worse)",
                    Metric = "LCP",
                    RecommendedActions = new List<string>
                    {
                        "Review recent changes that may impact performance",
                        "Check for new third-party scripts or resources"
                    }
                });
            }

            return alerts;
        }

        private Dictionary<string, double> AnalyzeDeviceTypeBreakdown(List<WebVitalsMetrics> metrics)
        {
            return new Dictionary<string, double>
            {
                ["Mobile"] = 65.0,
                ["Desktop"] = 30.0,
                ["Tablet"] = 5.0
            };
        }

        private Dictionary<string, double> AnalyzeConnectionTypeBreakdown(List<WebVitalsMetrics> metrics)
        {
            return new Dictionary<string, double>
            {
                ["4g"] = 60.0,
                ["wifi"] = 25.0,
                ["3g"] = 12.0,
                ["slow-2g"] = 3.0
            };
        }

        private List<PerformanceRecommendation> GenerateLcpRecommendations(WebVitalsMetrics metrics)
        {
            var recommendations = new List<PerformanceRecommendation>();

            if (metrics.ResourceMetrics.ImageSize > 500000)
            {
                recommendations.Add(new PerformanceRecommendation
                {
                    Id = "optimize-lcp-images",
                    Title = "Optimize LCP Images",
                    Description = "Large images are likely causing slow LCP. Optimize and serve images in modern formats.",
                    Category = "images",
                    Priority = 9,
                    EstimatedImpact = 800,
                    ImplementationDifficulty = 3,
                    TargetMetric = "LCP",
                    ImplementationSteps = new List<string>
                    {
                        "Identify the LCP element (likely a large image)",
                        "Convert images to WebP or AVIF format",
                        "Implement responsive images with appropriate sizes",
                        "Add preload hints for critical images"
                    }
                });
            }

            recommendations.Add(new PerformanceRecommendation
            {
                Id = "preload-lcp-resource",
                Title = "Preload LCP Resource",
                Description = "Add resource hints to prioritize loading of LCP element",
                Category = "html",
                Priority = 8,
                EstimatedImpact = 400,
                ImplementationDifficulty = 2,
                TargetMetric = "LCP",
                ImplementationSteps = new List<string>
                {
                    "Identify the LCP element",
                    "Add <link rel='preload'> for the LCP resource",
                    "Use fetchpriority='high' attribute if applicable"
                }
            });

            return recommendations;
        }

        private List<PerformanceRecommendation> GenerateFidRecommendations(WebVitalsMetrics metrics)
        {
            return new List<PerformanceRecommendation>
            {
                new PerformanceRecommendation
                {
                    Id = "reduce-main-thread-work",
                    Title = "Reduce Main Thread Work",
                    Description = "Long-running JavaScript tasks are blocking user interactions",
                    Category = "javascript",
                    Priority = 8,
                    EstimatedImpact = 50,
                    ImplementationDifficulty = 6,
                    TargetMetric = "FID",
                    ImplementationSteps = new List<string>
                    {
                        "Profile JavaScript execution with DevTools",
                        "Break up long tasks using requestIdleCallback",
                        "Defer non-critical JavaScript",
                        "Use web workers for CPU-intensive tasks"
                    }
                }
            };
        }

        private List<PerformanceRecommendation> GenerateClsRecommendations(WebVitalsMetrics metrics)
        {
            return new List<PerformanceRecommendation>
            {
                new PerformanceRecommendation
                {
                    Id = "fix-layout-shifts",
                    Title = "Fix Layout Shifts",
                    Description = "Elements are moving during page load causing poor user experience",
                    Category = "css",
                    Priority = 7,
                    EstimatedImpact = 0.08,
                    ImplementationDifficulty = 4,
                    TargetMetric = "CLS",
                    ImplementationSteps = new List<string>
                    {
                        "Set explicit dimensions for images and videos",
                        "Reserve space for dynamic content",
                        "Avoid inserting content above existing content",
                        "Use CSS aspect-ratio for responsive images"
                    }
                }
            };
        }

        private List<PerformanceRecommendation> GenerateGeneralPerformanceRecommendations(WebVitalsMetrics metrics)
        {
            return new List<PerformanceRecommendation>
            {
                new PerformanceRecommendation
                {
                    Id = "enable-compression",
                    Title = "Enable Compression",
                    Description = "Text resources are not efficiently compressed",
                    Category = "server",
                    Priority = 6,
                    EstimatedImpact = 300,
                    ImplementationDifficulty = 2,
                    TargetMetric = "LCP",
                    ImplementationSteps = new List<string>
                    {
                        "Enable gzip compression on the server",
                        "Consider Brotli compression for better efficiency",
                        "Configure compression for all text-based resources"
                    }
                }
            };
        }

        private async Task ApplyOptimization(string pageUrl, string optimization)
        {
            _logger.LogInformation("Applying optimization {Optimization} to {PageUrl}", optimization, pageUrl);

            // In production, this would interface with build systems, CDN APIs, etc.
            switch (optimization)
            {
                case "optimize-images":
                    await OptimizeImages(pageUrl);
                    break;
                case "minify-javascript":
                    await MinifyJavaScript(pageUrl);
                    break;
                case "enable-compression":
                    await EnableCompression(pageUrl);
                    break;
                case "preload-lcp-image":
                    await AddPreloadHints(pageUrl);
                    break;
                default:
                    _logger.LogWarning("Unknown optimization: {Optimization}", optimization);
                    break;
            }
        }

        private async Task OptimizeImages(string pageUrl)
        {
            // Simulate image optimization process
            await Task.Delay(100);
            _logger.LogInformation("Images optimized for {PageUrl}", pageUrl);
        }

        private async Task MinifyJavaScript(string pageUrl)
        {
            // Simulate JS minification process
            await Task.Delay(50);
            _logger.LogInformation("JavaScript minified for {PageUrl}", pageUrl);
        }

        private async Task EnableCompression(string pageUrl)
        {
            // Simulate compression enablement
            await Task.Delay(25);
            _logger.LogInformation("Compression enabled for {PageUrl}", pageUrl);
        }

        private async Task AddPreloadHints(string pageUrl)
        {
            // Simulate adding preload hints
            await Task.Delay(25);
            _logger.LogInformation("Preload hints added for {PageUrl}", pageUrl);
        }

        #endregion
    }

    // API Controller for Core Web Vitals
    [ApiController]
    [Route("api/[controller]")]
    public class CoreWebVitalsController : ControllerBase
    {
        private readonly ICoreWebVitalsService _coreWebVitalsService;
        private readonly ILogger<CoreWebVitalsController> _logger;

        public CoreWebVitalsController(
            ICoreWebVitalsService coreWebVitalsService,
            ILogger<CoreWebVitalsController> logger)
        {
            _coreWebVitalsService = coreWebVitalsService;
            _logger = logger;
        }

        [HttpPost("measure")]
        public async Task<ActionResult<WebVitalsMetrics>> MeasurePerformance([FromBody] MeasurePerformanceRequest request)
        {
            try
            {
                var metrics = await _coreWebVitalsService.MeasurePagePerformanceAsync(request.PageUrl, request.UserAgent ?? "");
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to measure performance for {PageUrl}", request.PageUrl);
                return StatusCode(500, "Failed to measure performance");
            }
        }

        [HttpGet("report")]
        public async Task<ActionResult<WebVitalsReport>> GetPerformanceReport([FromQuery] string pageUrl, [FromQuery] int days = 7)
        {
            try
            {
                var report = await _coreWebVitalsService.GetPerformanceReportAsync(pageUrl, TimeSpan.FromDays(days));
                return Ok(report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate report for {PageUrl}", pageUrl);
                return StatusCode(500, "Failed to generate performance report");
            }
        }

        [HttpGet("recommendations")]
        public async Task<ActionResult<List<PerformanceRecommendation>>> GetRecommendations([FromQuery] string pageUrl)
        {
            try
            {
                var recommendations = await _coreWebVitalsService.GetOptimizationRecommendationsAsync(pageUrl);
                return Ok(recommendations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get recommendations for {PageUrl}", pageUrl);
                return StatusCode(500, "Failed to get recommendations");
            }
        }

        [HttpPost("benchmark")]
        public async Task<ActionResult<WebVitalsBenchmark>> RunBenchmark([FromBody] BenchmarkRequest request)
        {
            try
            {
                var benchmark = await _coreWebVitalsService.RunBenchmarkAsync(request.PageUrls);
                return Ok(benchmark);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Benchmark failed");
                return StatusCode(500, "Benchmark failed");
            }
        }
    }

    public class MeasurePerformanceRequest
    {
        public string PageUrl { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
    }

    public class BenchmarkRequest
    {
        public List<string> PageUrls { get; set; } = new();
    }
}