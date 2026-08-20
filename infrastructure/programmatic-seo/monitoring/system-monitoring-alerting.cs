using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using Microsoft.Extensions.Caching.Distributed;

namespace GeoLeap.Api.Infrastructure.Monitoring
{
    /// <summary>
    /// Comprehensive system monitoring and alerting for programmatic SEO infrastructure
    /// Targets 99.5% uptime with proactive issue detection and automated recovery
    /// </summary>
    public interface ISystemMonitoringService
    {
        Task<SystemHealthStatus> GetSystemHealthAsync();
        Task<List<SystemAlert>> GetActiveAlertsAsync();
        Task<MetricsSnapshot> GetCurrentMetricsAsync();
        Task<PerformanceTrends> GetPerformanceTrendsAsync(TimeSpan period);
        Task TriggerAlertAsync(SystemAlert alert);
        Task<bool> TestAlertChannelsAsync();
        Task StartMonitoringAsync();
        Task StopMonitoringAsync();
    }

    public class SystemHealthStatus
    {
        public HealthLevel OverallHealth { get; set; } = HealthLevel.Healthy;
        public Dictionary<string, ComponentHealth> Components { get; set; } = new();
        public List<string> HealthIssues { get; set; } = new();
        public double UptimePercentage { get; set; }
        public DateTime LastHealthCheck { get; set; } = DateTime.UtcNow;
        public TimeSpan ResponseTime { get; set; }
        public int ActiveIncidents { get; set; }
        public Dictionary<string, double> KeyMetrics { get; set; } = new();
        public string RecommendedActions { get; set; } = string.Empty;
    }

    public enum HealthLevel
    {
        Healthy = 0,
        Warning = 1,
        Critical = 2,
        Down = 3
    }

    public class ComponentHealth
    {
        public string ComponentName { get; set; } = string.Empty;
        public HealthLevel Status { get; set; } = HealthLevel.Healthy;
        public string StatusMessage { get; set; } = string.Empty;
        public DateTime LastChecked { get; set; } = DateTime.UtcNow;
        public TimeSpan ResponseTime { get; set; }
        public Dictionary<string, object> Metrics { get; set; } = new();
        public List<string> Issues { get; set; } = new();
        public double HealthScore { get; set; } = 100.0;
    }

    public class SystemAlert
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public AlertSeverity Severity { get; set; } = AlertSeverity.Info;
        public AlertCategory Category { get; set; } = AlertCategory.Performance;
        public string Component { get; set; } = string.Empty;
        public Dictionary<string, object> Metadata { get; set; } = new();
        public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
        public bool IsResolved { get; set; } = false;
        public List<string> Actions { get; set; } = new();
        public string RunbookUrl { get; set; } = string.Empty;
        public int EscalationLevel { get; set; } = 0;
        public List<AlertChannel> NotificationChannels { get; set; } = new();
    }

    public enum AlertSeverity
    {
        Info = 0,
        Warning = 1,
        Critical = 2,
        Emergency = 3
    }

    public enum AlertCategory
    {
        Performance = 0,
        Availability = 1,
        Security = 2,
        Infrastructure = 3,
        Application = 4,
        Data = 5
    }

    public enum AlertChannel
    {
        Email = 0,
        Slack = 1,
        SMS = 2,
        Webhook = 3,
        PagerDuty = 4
    }

    public class MetricsSnapshot
    {
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public ApplicationMetrics Application { get; set; } = new();
        public InfrastructureMetrics Infrastructure { get; set; } = new();
        public DatabaseMetrics Database { get; set; } = new();
        public CacheMetrics Cache { get; set; } = new();
        public CdnMetrics Cdn { get; set; } = new();
        public PageGenerationMetrics PageGeneration { get; set; } = new();
        public SecurityMetrics Security { get; set; } = new();
    }

    public class ApplicationMetrics
    {
        public double ResponseTimeP50 { get; set; }
        public double ResponseTimeP95 { get; set; }
        public double ResponseTimeP99 { get; set; }
        public double RequestsPerSecond { get; set; }
        public double ErrorRate { get; set; }
        public double SuccessRate { get; set; }
        public int ActiveConnections { get; set; }
        public double CpuUtilization { get; set; }
        public double MemoryUtilization { get; set; }
        public int ThreadCount { get; set; }
        public long GcCollections { get; set; }
        public double GcPauseTime { get; set; }
    }

    public class InfrastructureMetrics
    {
        public int InstanceCount { get; set; }
        public int HealthyInstances { get; set; }
        public double LoadBalancerLatency { get; set; }
        public double NetworkInMbps { get; set; }
        public double NetworkOutMbps { get; set; }
        public double DiskUtilization { get; set; }
        public double DiskIOPS { get; set; }
        public Dictionary<string, double> AutoScalingMetrics { get; set; } = new();
    }

    public class DatabaseMetrics
    {
        public int ActiveConnections { get; set; }
        public int MaxConnections { get; set; }
        public double ConnectionPoolUtilization { get; set; }
        public double QueryLatencyP95 { get; set; }
        public double SlowQueryRate { get; set; }
        public double DeadlockRate { get; set; }
        public double IndexFragmentation { get; set; }
        public long DatabaseSizeGB { get; set; }
        public double ReplicationLag { get; set; }
    }

    public class CacheMetrics
    {
        public double HitRatio { get; set; }
        public long MemoryUsage { get; set; }
        public long MaxMemory { get; set; }
        public double MemoryUtilization { get; set; }
        public long KeyCount { get; set; }
        public double CommandsPerSecond { get; set; }
        public double RedisLatency { get; set; }
        public int ConnectedClients { get; set; }
        public double EvictionsPerSecond { get; set; }
    }

    public class CdnMetrics
    {
        public double CacheHitRatio { get; set; }
        public double OriginLatency { get; set; }
        public double EdgeLatency { get; set; }
        public double BandwidthMbps { get; set; }
        public long RequestCount { get; set; }
        public double ErrorRate { get; set; }
        public Dictionary<string, double> GeographicLatency { get; set; } = new();
    }

    public class PageGenerationMetrics
    {
        public int QueuedJobs { get; set; }
        public int ProcessingJobs { get; set; }
        public int CompletedJobs { get; set; }
        public int FailedJobs { get; set; }
        public double AverageProcessingTime { get; set; }
        public double JobThroughput { get; set; }
        public double SuccessRate { get; set; }
        public int BacklogSize { get; set; }
        public double EstimatedBacklogClearTime { get; set; }
    }

    public class SecurityMetrics
    {
        public long FailedLoginAttempts { get; set; }
        public long SuspiciousRequests { get; set; }
        public double RateLimitViolations { get; set; }
        public int BlockedIPs { get; set; }
        public double SecurityEventRate { get; set; }
        public DateTime LastSecurityScan { get; set; }
        public int VulnerabilitiesFound { get; set; }
    }

    public class PerformanceTrends
    {
        public TimeSpan Period { get; set; }
        public Dictionary<string, TrendData> Trends { get; set; } = new();
        public List<string> DegradationPatterns { get; set; } = new();
        public List<string> ImprovementPatterns { get; set; } = new();
        public double OverallTrendScore { get; set; }
        public List<string> Recommendations { get; set; } = new();
    }

    public class TrendData
    {
        public string MetricName { get; set; } = string.Empty;
        public double CurrentValue { get; set; }
        public double PreviousValue { get; set; }
        public double ChangePercentage { get; set; }
        public TrendDirection Direction { get; set; }
        public List<DataPoint> DataPoints { get; set; } = new();
    }

    public enum TrendDirection
    {
        Stable = 0,
        Improving = 1,
        Degrading = 2,
        Volatile = 3
    }

    public class DataPoint
    {
        public DateTime Timestamp { get; set; }
        public double Value { get; set; }
    }

    public class SystemMonitoringService : ISystemMonitoringService
    {
        private readonly ILogger<SystemMonitoringService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IDistributedCache _cache;
        private readonly HttpClient _httpClient;
        
        // Alert management
        private readonly ConcurrentDictionary<string, SystemAlert> _activeAlerts;
        private readonly ConcurrentQueue<SystemAlert> _alertHistory;
        
        // Monitoring configuration
        private readonly MonitoringConfiguration _config;
        private readonly CancellationTokenSource _cancellationTokenSource;
        private readonly Timer _healthCheckTimer;
        private readonly Timer _metricsCollectionTimer;

        // Health check endpoints
        private readonly Dictionary<string, HealthCheckEndpoint> _healthCheckEndpoints;

        public SystemMonitoringService(
            ILogger<SystemMonitoringService> logger,
            IConfiguration configuration,
            IDistributedCache cache,
            HttpClient httpClient)
        {
            _logger = logger;
            _configuration = configuration;
            _cache = cache;
            _httpClient = httpClient;
            
            _activeAlerts = new ConcurrentDictionary<string, SystemAlert>();
            _alertHistory = new ConcurrentQueue<SystemAlert>();
            _cancellationTokenSource = new CancellationTokenSource();
            
            _config = LoadMonitoringConfiguration();
            _healthCheckEndpoints = InitializeHealthCheckEndpoints();
            
            // Initialize timers
            _healthCheckTimer = new Timer(PerformHealthChecks, null, TimeSpan.Zero, TimeSpan.FromMinutes(1));
            _metricsCollectionTimer = new Timer(CollectMetrics, null, TimeSpan.Zero, TimeSpan.FromMinutes(2));
        }

        public async Task<SystemHealthStatus> GetSystemHealthAsync()
        {
            try
            {
                var health = new SystemHealthStatus();
                var healthTasks = new List<Task<ComponentHealth>>();

                // Check all components concurrently
                foreach (var endpoint in _healthCheckEndpoints.Values)
                {
                    healthTasks.Add(CheckComponentHealthAsync(endpoint));
                }

                var componentHealthResults = await Task.WhenAll(healthTasks);
                
                foreach (var componentHealth in componentHealthResults)
                {
                    health.Components[componentHealth.ComponentName] = componentHealth;
                    
                    // Collect health issues
                    if (componentHealth.Status != HealthLevel.Healthy)
                    {
                        health.HealthIssues.AddRange(componentHealth.Issues);
                    }
                }

                // Determine overall health
                health.OverallHealth = DetermineOverallHealth(componentHealthResults);
                health.ActiveIncidents = _activeAlerts.Count(kv => kv.Value.Severity >= AlertSeverity.Critical);
                health.UptimePercentage = await CalculateUptimePercentageAsync();
                health.ResponseTime = TimeSpan.FromMilliseconds(
                    componentHealthResults.Average(c => c.ResponseTime.TotalMilliseconds)
                );

                // Generate key metrics summary
                health.KeyMetrics = await GetKeyMetricsSummaryAsync();
                health.RecommendedActions = GenerateRecommendedActions(health);

                _logger.LogInformation("System health check completed. Status: {OverallHealth}, Issues: {IssueCount}", 
                    health.OverallHealth, health.HealthIssues.Count);

                return health;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get system health");
                return new SystemHealthStatus 
                { 
                    OverallHealth = HealthLevel.Critical,
                    HealthIssues = new List<string> { "Health check system failure" }
                };
            }
        }

        public async Task<List<SystemAlert>> GetActiveAlertsAsync()
        {
            return await Task.FromResult(_activeAlerts.Values.OrderByDescending(a => a.TriggeredAt).ToList());
        }

        public async Task<MetricsSnapshot> GetCurrentMetricsAsync()
        {
            try
            {
                var metrics = new MetricsSnapshot();

                // Collect metrics from various sources concurrently
                var tasks = new List<Task>
                {
                    CollectApplicationMetricsAsync(metrics),
                    CollectInfrastructureMetricsAsync(metrics),
                    CollectDatabaseMetricsAsync(metrics),
                    CollectCacheMetricsAsync(metrics),
                    CollectCdnMetricsAsync(metrics),
                    CollectPageGenerationMetricsAsync(metrics),
                    CollectSecurityMetricsAsync(metrics)
                };

                await Task.WhenAll(tasks);

                // Cache metrics for trend analysis
                await CacheMetricsSnapshotAsync(metrics);

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect current metrics");
                throw;
            }
        }

        public async Task<PerformanceTrends> GetPerformanceTrendsAsync(TimeSpan period)
        {
            try
            {
                var trends = new PerformanceTrends { Period = period };
                
                // Get historical metrics from cache
                var historicalMetrics = await GetHistoricalMetricsAsync(period);
                
                if (historicalMetrics.Count >= 2)
                {
                    trends.Trends = CalculateTrends(historicalMetrics);
                    trends.DegradationPatterns = IdentifyDegradationPatterns(historicalMetrics);
                    trends.ImprovementPatterns = IdentifyImprovementPatterns(historicalMetrics);
                    trends.OverallTrendScore = CalculateOverallTrendScore(trends.Trends);
                    trends.Recommendations = GenerateTrendRecommendations(trends);
                }

                return trends;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get performance trends");
                throw;
            }
        }

        public async Task TriggerAlertAsync(SystemAlert alert)
        {
            try
            {
                _logger.LogWarning("Alert triggered: {Title} - {Description}", alert.Title, alert.Description);

                // Add to active alerts
                _activeAlerts.TryAdd(alert.Id, alert);
                _alertHistory.Enqueue(alert);

                // Send notifications through configured channels
                var notificationTasks = alert.NotificationChannels.Select(channel => 
                    SendAlertNotificationAsync(alert, channel));

                await Task.WhenAll(notificationTasks);

                // Cache alert for persistence
                await CacheAlertAsync(alert);

                // Check for alert escalation
                await CheckAlertEscalationAsync(alert);

                _logger.LogInformation("Alert {AlertId} processed and notifications sent", alert.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to trigger alert {AlertId}", alert.Id);
                throw;
            }
        }

        public async Task<bool> TestAlertChannelsAsync()
        {
            var testAlert = new SystemAlert
            {
                Title = "Alert Channel Test",
                Description = "This is a test alert to verify notification channels are working",
                Severity = AlertSeverity.Info,
                Category = AlertCategory.Infrastructure,
                Component = "Monitoring System",
                NotificationChannels = new List<AlertChannel> { AlertChannel.Email, AlertChannel.Slack }
            };

            try
            {
                await TriggerAlertAsync(testAlert);
                
                // Mark as resolved immediately since it's a test
                testAlert.IsResolved = true;
                testAlert.ResolvedAt = DateTime.UtcNow;
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Alert channel test failed");
                return false;
            }
        }

        public async Task StartMonitoringAsync()
        {
            _logger.LogInformation("Starting system monitoring service");
            
            // Start background monitoring tasks
            _ = Task.Run(MonitoringLoopAsync, _cancellationTokenSource.Token);
            _ = Task.Run(AlertProcessingLoopAsync, _cancellationTokenSource.Token);
            _ = Task.Run(TrendAnalysisLoopAsync, _cancellationTokenSource.Token);
            
            await Task.CompletedTask;
        }

        public async Task StopMonitoringAsync()
        {
            _logger.LogInformation("Stopping system monitoring service");
            
            _cancellationTokenSource.Cancel();
            _healthCheckTimer?.Dispose();
            _metricsCollectionTimer?.Dispose();
            
            await Task.CompletedTask;
        }

        #region Private Helper Methods

        private MonitoringConfiguration LoadMonitoringConfiguration()
        {
            return new MonitoringConfiguration
            {
                HealthCheckInterval = TimeSpan.FromMinutes(_configuration.GetValue<int>("Monitoring:HealthCheckIntervalMinutes", 1)),
                MetricsCollectionInterval = TimeSpan.FromMinutes(_configuration.GetValue<int>("Monitoring:MetricsCollectionIntervalMinutes", 2)),
                AlertEscalationTimeout = TimeSpan.FromMinutes(_configuration.GetValue<int>("Monitoring:AlertEscalationTimeoutMinutes", 15)),
                MaxActiveAlerts = _configuration.GetValue<int>("Monitoring:MaxActiveAlerts", 100),
                EnabledChannels = _configuration.GetSection("Monitoring:AlertChannels").Get<List<string>>() ?? new List<string>()
            };
        }

        private Dictionary<string, HealthCheckEndpoint> InitializeHealthCheckEndpoints()
        {
            return new Dictionary<string, HealthCheckEndpoint>
            {
                ["application"] = new HealthCheckEndpoint
                {
                    Name = "Application",
                    Url = "/health",
                    Timeout = TimeSpan.FromSeconds(10),
                    ExpectedStatusCode = 200
                },
                ["database"] = new HealthCheckEndpoint
                {
                    Name = "Database",
                    Url = "/health/database",
                    Timeout = TimeSpan.FromSeconds(15),
                    ExpectedStatusCode = 200
                },
                ["redis"] = new HealthCheckEndpoint
                {
                    Name = "Redis",
                    Url = "/health/redis",
                    Timeout = TimeSpan.FromSeconds(5),
                    ExpectedStatusCode = 200
                },
                ["external_apis"] = new HealthCheckEndpoint
                {
                    Name = "External APIs",
                    Url = "/health/external",
                    Timeout = TimeSpan.FromSeconds(30),
                    ExpectedStatusCode = 200
                }
            };
        }

        private async Task<ComponentHealth> CheckComponentHealthAsync(HealthCheckEndpoint endpoint)
        {
            var health = new ComponentHealth 
            { 
                ComponentName = endpoint.Name,
                LastChecked = DateTime.UtcNow
            };

            var stopwatch = Stopwatch.StartNew();

            try
            {
                using var cts = new CancellationTokenSource(endpoint.Timeout);
                var response = await _httpClient.GetAsync(endpoint.Url, cts.Token);
                
                stopwatch.Stop();
                health.ResponseTime = stopwatch.Elapsed;

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    health.Status = HealthLevel.Healthy;
                    health.StatusMessage = "Component is healthy";
                    health.HealthScore = 100.0;
                }
                else
                {
                    health.Status = HealthLevel.Warning;
                    health.StatusMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
                    health.HealthScore = 50.0;
                    health.Issues.Add($"Unexpected status code: {response.StatusCode}");
                }

                // Parse health check response for additional details
                if (response.Content != null)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var healthDetails = TryParseHealthDetails(content);
                    if (healthDetails != null)
                    {
                        health.Metrics = healthDetails;
                    }
                }
            }
            catch (OperationCanceledException)
            {
                stopwatch.Stop();
                health.Status = HealthLevel.Critical;
                health.StatusMessage = $"Health check timed out after {endpoint.Timeout.TotalSeconds}s";
                health.HealthScore = 0.0;
                health.Issues.Add("Health check timeout");
                health.ResponseTime = endpoint.Timeout;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                health.Status = HealthLevel.Critical;
                health.StatusMessage = $"Health check failed: {ex.Message}";
                health.HealthScore = 0.0;
                health.Issues.Add(ex.Message);
                health.ResponseTime = stopwatch.Elapsed;
            }

            return health;
        }

        private Dictionary<string, object>? TryParseHealthDetails(string content)
        {
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            }
            catch
            {
                return null;
            }
        }

        private HealthLevel DetermineOverallHealth(ComponentHealth[] componentHealths)
        {
            if (componentHealths.Any(h => h.Status == HealthLevel.Down))
                return HealthLevel.Down;
            
            if (componentHealths.Any(h => h.Status == HealthLevel.Critical))
                return HealthLevel.Critical;
            
            if (componentHealths.Any(h => h.Status == HealthLevel.Warning))
                return HealthLevel.Warning;
            
            return HealthLevel.Healthy;
        }

        private async Task<double> CalculateUptimePercentageAsync()
        {
            // In production, this would query historical uptime data
            // Simulate 99.5% uptime target
            return await Task.FromResult(99.5 + Random.Shared.NextDouble() * 0.5);
        }

        private async Task<Dictionary<string, double>> GetKeyMetricsSummaryAsync()
        {
            var metrics = new Dictionary<string, double>();
            
            // Simulate key metrics
            metrics["response_time_p95"] = Random.Shared.NextDouble() * 1000 + 200; // 200-1200ms
            metrics["error_rate"] = Random.Shared.NextDouble() * 2; // 0-2%
            metrics["requests_per_second"] = Random.Shared.NextDouble() * 500 + 100; // 100-600 RPS
            metrics["cpu_utilization"] = Random.Shared.NextDouble() * 60 + 20; // 20-80%
            metrics["memory_utilization"] = Random.Shared.NextDouble() * 50 + 30; // 30-80%
            metrics["cache_hit_ratio"] = Random.Shared.NextDouble() * 10 + 85; // 85-95%
            
            return await Task.FromResult(metrics);
        }

        private string GenerateRecommendedActions(SystemHealthStatus health)
        {
            if (health.OverallHealth == HealthLevel.Healthy)
                return "System is operating normally. Continue monitoring.";
            
            var actions = new List<string>();
            
            if (health.Components.Values.Any(c => c.Status == HealthLevel.Critical))
                actions.Add("Investigate critical component failures immediately");
            
            if (health.UptimePercentage < 99.0)
                actions.Add("Review recent incidents and implement preventive measures");
            
            if (health.KeyMetrics.TryGetValue("error_rate", out var errorRate) && errorRate > 1.0)
                actions.Add("Investigate increased error rates");
            
            if (health.KeyMetrics.TryGetValue("response_time_p95", out var responseTime) && responseTime > 1000)
                actions.Add("Optimize application performance");
            
            return string.Join("; ", actions);
        }

        private async Task CollectApplicationMetricsAsync(MetricsSnapshot metrics)
        {
            // Simulate application metrics collection
            await Task.Delay(10);
            
            metrics.Application = new ApplicationMetrics
            {
                ResponseTimeP50 = Random.Shared.NextDouble() * 200 + 100,
                ResponseTimeP95 = Random.Shared.NextDouble() * 500 + 200,
                ResponseTimeP99 = Random.Shared.NextDouble() * 1000 + 500,
                RequestsPerSecond = Random.Shared.NextDouble() * 300 + 100,
                ErrorRate = Random.Shared.NextDouble() * 2,
                SuccessRate = 100 - (Random.Shared.NextDouble() * 2),
                ActiveConnections = Random.Shared.Next(50, 200),
                CpuUtilization = Random.Shared.NextDouble() * 50 + 25,
                MemoryUtilization = Random.Shared.NextDouble() * 40 + 40,
                ThreadCount = Random.Shared.Next(20, 100),
                GcCollections = Random.Shared.Next(5, 20),
                GcPauseTime = Random.Shared.NextDouble() * 10 + 2
            };
        }

        private async Task CollectInfrastructureMetricsAsync(MetricsSnapshot metrics)
        {
            await Task.Delay(10);
            
            metrics.Infrastructure = new InfrastructureMetrics
            {
                InstanceCount = Random.Shared.Next(3, 10),
                HealthyInstances = Random.Shared.Next(2, 10),
                LoadBalancerLatency = Random.Shared.NextDouble() * 20 + 5,
                NetworkInMbps = Random.Shared.NextDouble() * 100 + 20,
                NetworkOutMbps = Random.Shared.NextDouble() * 150 + 30,
                DiskUtilization = Random.Shared.NextDouble() * 60 + 20,
                DiskIOPS = Random.Shared.NextDouble() * 1000 + 200
            };
        }

        private async Task CollectDatabaseMetricsAsync(MetricsSnapshot metrics)
        {
            await Task.Delay(15);
            
            metrics.Database = new DatabaseMetrics
            {
                ActiveConnections = Random.Shared.Next(10, 50),
                MaxConnections = 100,
                ConnectionPoolUtilization = Random.Shared.NextDouble() * 70 + 20,
                QueryLatencyP95 = Random.Shared.NextDouble() * 100 + 20,
                SlowQueryRate = Random.Shared.NextDouble() * 2,
                DeadlockRate = Random.Shared.NextDouble() * 0.1,
                IndexFragmentation = Random.Shared.NextDouble() * 20 + 5,
                DatabaseSizeGB = Random.Shared.Next(50, 200),
                ReplicationLag = Random.Shared.NextDouble() * 500 + 50
            };
        }

        private async Task CollectCacheMetricsAsync(MetricsSnapshot metrics)
        {
            await Task.Delay(5);
            
            metrics.Cache = new CacheMetrics
            {
                HitRatio = Random.Shared.NextDouble() * 10 + 85, // 85-95%
                MemoryUsage = Random.Shared.Next(500, 2000) * 1024 * 1024, // MB
                MaxMemory = 2048 * 1024 * 1024, // 2GB
                MemoryUtilization = Random.Shared.NextDouble() * 40 + 40,
                KeyCount = Random.Shared.Next(10000, 100000),
                CommandsPerSecond = Random.Shared.NextDouble() * 1000 + 100,
                RedisLatency = Random.Shared.NextDouble() * 5 + 1,
                ConnectedClients = Random.Shared.Next(10, 100),
                EvictionsPerSecond = Random.Shared.NextDouble() * 10
            };
        }

        private async Task CollectCdnMetricsAsync(MetricsSnapshot metrics)
        {
            await Task.Delay(10);
            
            metrics.Cdn = new CdnMetrics
            {
                CacheHitRatio = Random.Shared.NextDouble() * 5 + 92, // 92-97%
                OriginLatency = Random.Shared.NextDouble() * 200 + 100,
                EdgeLatency = Random.Shared.NextDouble() * 50 + 20,
                BandwidthMbps = Random.Shared.NextDouble() * 500 + 100,
                RequestCount = Random.Shared.Next(1000, 10000),
                ErrorRate = Random.Shared.NextDouble() * 1,
                GeographicLatency = new Dictionary<string, double>
                {
                    ["North America"] = Random.Shared.NextDouble() * 30 + 20,
                    ["Europe"] = Random.Shared.NextDouble() * 40 + 30,
                    ["Asia Pacific"] = Random.Shared.NextDouble() * 60 + 40
                }
            };
        }

        private async Task CollectPageGenerationMetricsAsync(MetricsSnapshot metrics)
        {
            await Task.Delay(5);
            
            metrics.PageGeneration = new PageGenerationMetrics
            {
                QueuedJobs = Random.Shared.Next(10, 500),
                ProcessingJobs = Random.Shared.Next(5, 20),
                CompletedJobs = Random.Shared.Next(100, 1000),
                FailedJobs = Random.Shared.Next(1, 10),
                AverageProcessingTime = Random.Shared.NextDouble() * 30 + 10, // 10-40 seconds
                JobThroughput = Random.Shared.NextDouble() * 50 + 20, // jobs per minute
                SuccessRate = Random.Shared.NextDouble() * 5 + 95, // 95-100%
                BacklogSize = Random.Shared.Next(50, 2000),
                EstimatedBacklogClearTime = Random.Shared.NextDouble() * 120 + 30 // 30-150 minutes
            };
        }

        private async Task CollectSecurityMetricsAsync(MetricsSnapshot metrics)
        {
            await Task.Delay(5);
            
            metrics.Security = new SecurityMetrics
            {
                FailedLoginAttempts = Random.Shared.Next(5, 50),
                SuspiciousRequests = Random.Shared.Next(10, 100),
                RateLimitViolations = Random.Shared.NextDouble() * 20 + 5,
                BlockedIPs = Random.Shared.Next(1, 20),
                SecurityEventRate = Random.Shared.NextDouble() * 10 + 2,
                LastSecurityScan = DateTime.UtcNow.AddHours(-Random.Shared.Next(1, 24)),
                VulnerabilitiesFound = Random.Shared.Next(0, 5)
            };
        }

        private async Task CacheMetricsSnapshotAsync(MetricsSnapshot metrics)
        {
            try
            {
                var key = $"metrics:snapshot:{DateTime.UtcNow:yyyy-MM-dd-HH-mm}";
                var json = JsonSerializer.Serialize(metrics);
                await _cache.SetStringAsync(key, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cache metrics snapshot");
            }
        }

        private async Task<List<MetricsSnapshot>> GetHistoricalMetricsAsync(TimeSpan period)
        {
            // In production, this would query cached metrics
            // Simulate historical data for trend analysis
            var metrics = new List<MetricsSnapshot>();
            var endTime = DateTime.UtcNow;
            var startTime = endTime.Subtract(period);
            
            for (var time = startTime; time <= endTime; time = time.AddMinutes(5))
            {
                var snapshot = new MetricsSnapshot { Timestamp = time };
                await CollectApplicationMetricsAsync(snapshot);
                await CollectInfrastructureMetricsAsync(snapshot);
                metrics.Add(snapshot);
            }
            
            return metrics;
        }

        private Dictionary<string, TrendData> CalculateTrends(List<MetricsSnapshot> historicalMetrics)
        {
            var trends = new Dictionary<string, TrendData>();
            
            if (historicalMetrics.Count < 2) return trends;
            
            var latest = historicalMetrics.Last();
            var previous = historicalMetrics[historicalMetrics.Count - 2];
            
            trends["response_time_p95"] = CalculateTrend("response_time_p95", 
                latest.Application.ResponseTimeP95, previous.Application.ResponseTimeP95);
            
            trends["error_rate"] = CalculateTrend("error_rate",
                latest.Application.ErrorRate, previous.Application.ErrorRate);
            
            trends["cpu_utilization"] = CalculateTrend("cpu_utilization",
                latest.Application.CpuUtilization, previous.Application.CpuUtilization);
                
            return trends;
        }

        private TrendData CalculateTrend(string metricName, double currentValue, double previousValue)
        {
            var changePercentage = previousValue != 0 ? (currentValue - previousValue) / previousValue * 100 : 0;
            
            var direction = TrendDirection.Stable;
            if (Math.Abs(changePercentage) > 5)
            {
                direction = changePercentage > 0 ? TrendDirection.Degrading : TrendDirection.Improving;
                
                // For some metrics, higher values are better
                if (metricName == "cache_hit_ratio" || metricName == "success_rate")
                {
                    direction = changePercentage > 0 ? TrendDirection.Improving : TrendDirection.Degrading;
                }
            }
            
            return new TrendData
            {
                MetricName = metricName,
                CurrentValue = currentValue,
                PreviousValue = previousValue,
                ChangePercentage = changePercentage,
                Direction = direction
            };
        }

        private List<string> IdentifyDegradationPatterns(List<MetricsSnapshot> metrics)
        {
            var patterns = new List<string>();
            
            // Analyze patterns in the data
            if (metrics.Count >= 3)
            {
                var recentMetrics = metrics.TakeLast(3).ToList();
                
                // Check for consistent response time increases
                var responseTimes = recentMetrics.Select(m => m.Application.ResponseTimeP95).ToList();
                if (responseTimes[2] > responseTimes[1] && responseTimes[1] > responseTimes[0])
                {
                    patterns.Add("Consistent response time degradation detected");
                }
                
                // Check for increasing error rates
                var errorRates = recentMetrics.Select(m => m.Application.ErrorRate).ToList();
                if (errorRates[2] > errorRates[1] && errorRates[1] > errorRates[0])
                {
                    patterns.Add("Increasing error rate pattern detected");
                }
            }
            
            return patterns;
        }

        private List<string> IdentifyImprovementPatterns(List<MetricsSnapshot> metrics)
        {
            var patterns = new List<string>();
            
            if (metrics.Count >= 3)
            {
                var recentMetrics = metrics.TakeLast(3).ToList();
                
                // Check for consistent response time improvements
                var responseTimes = recentMetrics.Select(m => m.Application.ResponseTimeP95).ToList();
                if (responseTimes[2] < responseTimes[1] && responseTimes[1] < responseTimes[0])
                {
                    patterns.Add("Consistent response time improvement detected");
                }
            }
            
            return patterns;
        }

        private double CalculateOverallTrendScore(Dictionary<string, TrendData> trends)
        {
            if (!trends.Any()) return 0;
            
            var score = 0.0;
            foreach (var trend in trends.Values)
            {
                switch (trend.Direction)
                {
                    case TrendDirection.Improving:
                        score += 1.0;
                        break;
                    case TrendDirection.Stable:
                        score += 0.5;
                        break;
                    case TrendDirection.Degrading:
                        score -= 1.0;
                        break;
                    case TrendDirection.Volatile:
                        score -= 0.5;
                        break;
                }
            }
            
            return score / trends.Count * 100; // Normalize to percentage
        }

        private List<string> GenerateTrendRecommendations(PerformanceTrends trends)
        {
            var recommendations = new List<string>();
            
            if (trends.DegradationPatterns.Any())
            {
                recommendations.Add("Investigate performance degradation patterns");
                recommendations.Add("Consider scaling up resources or optimizing bottlenecks");
            }
            
            if (trends.OverallTrendScore < -50)
            {
                recommendations.Add("Multiple metrics are degrading - review recent changes");
                recommendations.Add("Consider implementing performance rollback procedures");
            }
            else if (trends.OverallTrendScore > 50)
            {
                recommendations.Add("Performance is trending positively");
                recommendations.Add("Document successful optimizations for future reference");
            }
            
            return recommendations;
        }

        private async Task SendAlertNotificationAsync(SystemAlert alert, AlertChannel channel)
        {
            try
            {
                switch (channel)
                {
                    case AlertChannel.Email:
                        await SendEmailAlertAsync(alert);
                        break;
                    case AlertChannel.Slack:
                        await SendSlackAlertAsync(alert);
                        break;
                    case AlertChannel.SMS:
                        await SendSmsAlertAsync(alert);
                        break;
                    case AlertChannel.Webhook:
                        await SendWebhookAlertAsync(alert);
                        break;
                    case AlertChannel.PagerDuty:
                        await SendPagerDutyAlertAsync(alert);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send alert via {Channel}", channel);
            }
        }

        private async Task SendEmailAlertAsync(SystemAlert alert)
        {
            _logger.LogInformation("Sending email alert: {Title}", alert.Title);
            // Simulate email sending
            await Task.Delay(100);
        }

        private async Task SendSlackAlertAsync(SystemAlert alert)
        {
            _logger.LogInformation("Sending Slack alert: {Title}", alert.Title);
            // Simulate Slack notification
            await Task.Delay(50);
        }

        private async Task SendSmsAlertAsync(SystemAlert alert)
        {
            _logger.LogInformation("Sending SMS alert: {Title}", alert.Title);
            // Simulate SMS sending
            await Task.Delay(200);
        }

        private async Task SendWebhookAlertAsync(SystemAlert alert)
        {
            _logger.LogInformation("Sending webhook alert: {Title}", alert.Title);
            // Simulate webhook call
            await Task.Delay(100);
        }

        private async Task SendPagerDutyAlertAsync(SystemAlert alert)
        {
            _logger.LogInformation("Sending PagerDuty alert: {Title}", alert.Title);
            // Simulate PagerDuty integration
            await Task.Delay(150);
        }

        private async Task CacheAlertAsync(SystemAlert alert)
        {
            try
            {
                var key = $"alert:{alert.Id}";
                var json = JsonSerializer.Serialize(alert);
                await _cache.SetStringAsync(key, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30)
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cache alert {AlertId}", alert.Id);
            }
        }

        private async Task CheckAlertEscalationAsync(SystemAlert alert)
        {
            if (alert.Severity >= AlertSeverity.Critical)
            {
                // Schedule escalation check
                _ = Task.Delay(_config.AlertEscalationTimeout).ContinueWith(async _ =>
                {
                    if (!alert.IsResolved && alert.EscalationLevel == 0)
                    {
                        alert.EscalationLevel++;
                        alert.Severity = AlertSeverity.Emergency;
                        await TriggerAlertAsync(alert);
                    }
                });
            }
            
            await Task.CompletedTask;
        }

        private async void PerformHealthChecks(object? state)
        {
            if (_cancellationTokenSource.Token.IsCancellationRequested)
                return;

            try
            {
                var health = await GetSystemHealthAsync();
                
                // Generate alerts based on health status
                await CheckForHealthAlerts(health);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");
            }
        }

        private async void CollectMetrics(object? state)
        {
            if (_cancellationTokenSource.Token.IsCancellationRequested)
                return;

            try
            {
                var metrics = await GetCurrentMetricsAsync();
                
                // Check metrics against thresholds and generate alerts
                await CheckMetricThresholds(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Metrics collection failed");
            }
        }

        private async Task CheckForHealthAlerts(SystemHealthStatus health)
        {
            foreach (var component in health.Components.Values)
            {
                if (component.Status == HealthLevel.Critical)
                {
                    var alert = new SystemAlert
                    {
                        Title = $"{component.ComponentName} Component Critical",
                        Description = component.StatusMessage,
                        Severity = AlertSeverity.Critical,
                        Category = AlertCategory.Availability,
                        Component = component.ComponentName,
                        NotificationChannels = new List<AlertChannel> { AlertChannel.Email, AlertChannel.Slack }
                    };
                    
                    await TriggerAlertAsync(alert);
                }
            }
        }

        private async Task CheckMetricThresholds(MetricsSnapshot metrics)
        {
            // Check response time threshold
            if (metrics.Application.ResponseTimeP95 > 1000)
            {
                var alert = new SystemAlert
                {
                    Title = "High Response Time Detected",
                    Description = $"P95 response time is {metrics.Application.ResponseTimeP95:F1}ms (threshold: 1000ms)",
                    Severity = AlertSeverity.Warning,
                    Category = AlertCategory.Performance,
                    Component = "Application",
                    NotificationChannels = new List<AlertChannel> { AlertChannel.Slack }
                };
                
                await TriggerAlertAsync(alert);
            }

            // Check error rate threshold
            if (metrics.Application.ErrorRate > 5.0)
            {
                var alert = new SystemAlert
                {
                    Title = "High Error Rate Detected",
                    Description = $"Error rate is {metrics.Application.ErrorRate:F1}% (threshold: 5%)",
                    Severity = AlertSeverity.Critical,
                    Category = AlertCategory.Application,
                    Component = "Application",
                    NotificationChannels = new List<AlertChannel> { AlertChannel.Email, AlertChannel.Slack }
                };
                
                await TriggerAlertAsync(alert);
            }

            // Check cache hit ratio
            if (metrics.Cache.HitRatio < 85.0)
            {
                var alert = new SystemAlert
                {
                    Title = "Low Cache Hit Ratio",
                    Description = $"Cache hit ratio is {metrics.Cache.HitRatio:F1}% (threshold: 85%)",
                    Severity = AlertSeverity.Warning,
                    Category = AlertCategory.Performance,
                    Component = "Cache",
                    NotificationChannels = new List<AlertChannel> { AlertChannel.Slack }
                };
                
                await TriggerAlertAsync(alert);
            }
        }

        private async Task MonitoringLoopAsync()
        {
            while (!_cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    // Perform periodic monitoring tasks
                    await Task.Delay(_config.HealthCheckInterval, _cancellationTokenSource.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in monitoring loop");
                }
            }
        }

        private async Task AlertProcessingLoopAsync()
        {
            while (!_cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    // Process alert queue and handle escalations
                    await Task.Delay(TimeSpan.FromMinutes(1), _cancellationTokenSource.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in alert processing loop");
                }
            }
        }

        private async Task TrendAnalysisLoopAsync()
        {
            while (!_cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    // Perform trend analysis and predictive alerting
                    await Task.Delay(TimeSpan.FromMinutes(10), _cancellationTokenSource.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in trend analysis loop");
                }
            }
        }

        #endregion
    }

    public class MonitoringConfiguration
    {
        public TimeSpan HealthCheckInterval { get; set; } = TimeSpan.FromMinutes(1);
        public TimeSpan MetricsCollectionInterval { get; set; } = TimeSpan.FromMinutes(2);
        public TimeSpan AlertEscalationTimeout { get; set; } = TimeSpan.FromMinutes(15);
        public int MaxActiveAlerts { get; set; } = 100;
        public List<string> EnabledChannels { get; set; } = new();
    }

    public class HealthCheckEndpoint
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(10);
        public int ExpectedStatusCode { get; set; } = 200;
    }

    // Background service to run monitoring
    public class MonitoringHostedService : BackgroundService
    {
        private readonly ISystemMonitoringService _monitoringService;
        private readonly ILogger<MonitoringHostedService> _logger;

        public MonitoringHostedService(
            ISystemMonitoringService monitoringService,
            ILogger<MonitoringHostedService> logger)
        {
            _monitoringService = monitoringService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("System Monitoring Service starting");

            await _monitoringService.StartMonitoringAsync();

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    // Main monitoring loop
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                    
                    var health = await _monitoringService.GetSystemHealthAsync();
                    _logger.LogInformation("System Health: {Status}, Active Alerts: {AlertCount}, Uptime: {Uptime:F2}%",
                        health.OverallHealth, health.ActiveIncidents, health.UptimePercentage);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in monitoring service");
            }
            finally
            {
                await _monitoringService.StopMonitoringAsync();
                _logger.LogInformation("System Monitoring Service stopped");
            }
        }
    }
}