using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public interface IVpnPerformanceMonitoringService
{
    Task<VpnPerformanceSnapshot> CapturePerformanceSnapshotAsync(
        Guid vpnProviderId,
        string regionCode,
        CancellationToken cancellationToken = default);
    
    Task<IEnumerable<VpnPerformanceSnapshot>> GetPerformanceHistoryAsync(
        Guid vpnProviderId,
        string regionCode,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default);
    
    Task<VpnPerformanceTrendAnalysis> AnalyzePerformanceTrendsAsync(
        Guid vpnProviderId,
        string? regionCode = null,
        int daysToAnalyze = 7,
        CancellationToken cancellationToken = default);
    
    Task<SystemPerformanceMetrics> GetSystemPerformanceMetricsAsync(
        CancellationToken cancellationToken = default);
    
    Task StartContinuousMonitoringAsync(CancellationToken cancellationToken = default);
    
    Task StopContinuousMonitoringAsync();
}

public class VpnPerformanceMonitoringService : IVpnPerformanceMonitoringService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VpnPerformanceMonitoringService> _logger;
    private readonly IVpnConnectionTestingService _connectionService;
    private readonly IStreamingServiceTestingService _streamingService;
    private readonly IVpnProviderApiService _providerApiService;
    
    private readonly ConcurrentDictionary<string, PerformanceMetrics> _realTimeMetrics = new();
    private readonly Timer? _monitoringTimer;
    private readonly SemaphoreSlim _monitoringSemaphore = new(1, 1);
    private bool _isMonitoring = false;

    public VpnPerformanceMonitoringService(
        ApplicationDbContext context,
        ILogger<VpnPerformanceMonitoringService> logger,
        IVpnConnectionTestingService connectionService,
        IStreamingServiceTestingService streamingService,
        IVpnProviderApiService providerApiService)
    {
        _context = context;
        _logger = logger;
        _connectionService = connectionService;
        _streamingService = streamingService;
        _providerApiService = providerApiService;
    }

    public async Task<VpnPerformanceSnapshot> CapturePerformanceSnapshotAsync(
        Guid vpnProviderId,
        string regionCode,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var snapshotId = Guid.NewGuid();
        
        try
        {
            _logger.LogInformation("Capturing performance snapshot {SnapshotId} for provider {ProviderId} in region {RegionCode}",
                snapshotId, vpnProviderId, regionCode);

            var snapshot = new VpnPerformanceSnapshot
            {
                Id = snapshotId,
                VpnProviderId = vpnProviderId,
                RegionCode = regionCode,
                CapturedAt = DateTime.UtcNow
            };

            // Get provider information
            var provider = await _context.Set<VpnProvider>()
                .FirstOrDefaultAsync(p => p.Id == vpnProviderId, cancellationToken);

            if (provider == null)
            {
                throw new InvalidOperationException($"VPN provider {vpnProviderId} not found");
            }

            // Test connection performance
            var connectionMetrics = await MeasureConnectionPerformanceAsync(vpnProviderId, regionCode, cancellationToken);
            snapshot.ConnectionLatencyMs = connectionMetrics.LatencyMs;
            snapshot.ConnectionSuccessRate = connectionMetrics.SuccessRate;
            snapshot.ConnectionStabilityScore = connectionMetrics.StabilityScore;

            // Test speed performance
            var speedMetrics = await MeasureSpeedPerformanceAsync(vpnProviderId, regionCode, cancellationToken);
            snapshot.DownloadSpeedMbps = speedMetrics.DownloadSpeedMbps;
            snapshot.UploadSpeedMbps = speedMetrics.UploadSpeedMbps;
            snapshot.SpeedConsistencyScore = speedMetrics.ConsistencyScore;

            // Test streaming performance
            var streamingMetrics = await MeasureStreamingPerformanceAsync(regionCode, cancellationToken);
            snapshot.StreamingLatencyMs = streamingMetrics.AverageLatencyMs;
            snapshot.StreamingSuccessRate = streamingMetrics.SuccessRate;
            snapshot.StreamingQualityScore = streamingMetrics.QualityScore;

            // Calculate overall performance score
            snapshot.OverallPerformanceScore = CalculateOverallPerformanceScore(
                connectionMetrics, speedMetrics, streamingMetrics);

            // Capture system resource usage
            var systemMetrics = await CaptureSystemResourceUsageAsync(cancellationToken);
            snapshot.SystemCpuUsagePercent = systemMetrics.CpuUsagePercent;
            snapshot.SystemMemoryUsagePercent = systemMetrics.MemoryUsagePercent;
            snapshot.NetworkUtilizationPercent = systemMetrics.NetworkUtilizationPercent;

            // Store metrics details
            snapshot.MetricsData = System.Text.Json.JsonSerializer.Serialize(new
            {
                connectionMetrics,
                speedMetrics,
                streamingMetrics,
                systemMetrics,
                testDuration = stopwatch.ElapsedMilliseconds
            });

            // Save snapshot to database
            await _context.Set<VpnPerformanceSnapshot>().AddAsync(snapshot, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            stopwatch.Stop();
            _logger.LogInformation("Performance snapshot {SnapshotId} completed in {Duration}ms: Score={Score}",
                snapshotId, stopwatch.ElapsedMilliseconds, snapshot.OverallPerformanceScore);

            // Update real-time metrics cache
            var key = $"{vpnProviderId}_{regionCode}";
            _realTimeMetrics.AddOrUpdate(key, 
                new PerformanceMetrics { LastUpdate = DateTime.UtcNow, PerformanceScore = snapshot.OverallPerformanceScore },
                (_, existing) => { 
                    existing.LastUpdate = DateTime.UtcNow; 
                    existing.PerformanceScore = snapshot.OverallPerformanceScore;
                    return existing;
                });

            return snapshot;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to capture performance snapshot {SnapshotId} for provider {ProviderId}",
                snapshotId, vpnProviderId);
            
            return new VpnPerformanceSnapshot
            {
                Id = snapshotId,
                VpnProviderId = vpnProviderId,
                RegionCode = regionCode,
                CapturedAt = DateTime.UtcNow,
                OverallPerformanceScore = 0,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<IEnumerable<VpnPerformanceSnapshot>> GetPerformanceHistoryAsync(
        Guid vpnProviderId,
        string regionCode,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        return await _context.Set<VpnPerformanceSnapshot>()
            .Where(s => s.VpnProviderId == vpnProviderId &&
                       s.RegionCode == regionCode &&
                       s.CapturedAt >= fromDate &&
                       s.CapturedAt <= toDate)
            .OrderBy(s => s.CapturedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<VpnPerformanceTrendAnalysis> AnalyzePerformanceTrendsAsync(
        Guid vpnProviderId,
        string? regionCode = null,
        int daysToAnalyze = 7,
        CancellationToken cancellationToken = default)
    {
        var fromDate = DateTime.UtcNow.AddDays(-daysToAnalyze);
        var toDate = DateTime.UtcNow;

        var query = _context.Set<VpnPerformanceSnapshot>()
            .Where(s => s.VpnProviderId == vpnProviderId &&
                       s.CapturedAt >= fromDate &&
                       s.CapturedAt <= toDate);

        if (!string.IsNullOrEmpty(regionCode))
        {
            query = query.Where(s => s.RegionCode == regionCode);
        }

        var snapshots = await query.OrderBy(s => s.CapturedAt).ToListAsync(cancellationToken);

        if (!snapshots.Any())
        {
            return new VpnPerformanceTrendAnalysis
            {
                VpnProviderId = vpnProviderId,
                RegionCode = regionCode,
                AnalysisDate = DateTime.UtcNow,
                DataPoints = 0,
                TrendDirection = "No Data"
            };
        }

        // Calculate trend analysis
        var analysis = new VpnPerformanceTrendAnalysis
        {
            VpnProviderId = vpnProviderId,
            RegionCode = regionCode,
            AnalysisDate = DateTime.UtcNow,
            DataPoints = snapshots.Count,
            AveragePerformanceScore = snapshots.Average(s => s.OverallPerformanceScore),
            MinPerformanceScore = snapshots.Min(s => s.OverallPerformanceScore),
            MaxPerformanceScore = snapshots.Max(s => s.OverallPerformanceScore),
            PerformanceVariability = CalculateVariability(snapshots.Select(s => s.OverallPerformanceScore)),
            
            AverageConnectionLatency = snapshots.Average(s => s.ConnectionLatencyMs),
            AverageDownloadSpeed = snapshots.Average(s => s.DownloadSpeedMbps),
            AverageUploadSpeed = snapshots.Average(s => s.UploadSpeedMbps),
            
            TrendDirection = CalculateTrendDirection(snapshots.Select(s => s.OverallPerformanceScore).ToList()),
            TrendStrength = CalculateTrendStrength(snapshots.Select(s => s.OverallPerformanceScore).ToList()),
            
            Recommendations = GeneratePerformanceRecommendations(snapshots)
        };

        return analysis;
    }

    public async Task<SystemPerformanceMetrics> GetSystemPerformanceMetricsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await CaptureSystemResourceUsageAsync(cancellationToken);
            
            // Get active test statistics
            var activeTests = await _context.Set<VpnEffectivenessTest>()
                .Where(t => t.TestTimestamp >= DateTime.UtcNow.AddMinutes(-5))
                .CountAsync(cancellationToken);

            var completedTestsToday = await _context.Set<VpnEffectivenessTest>()
                .Where(t => t.TestTimestamp >= DateTime.UtcNow.Date)
                .CountAsync(cancellationToken);

            var successfulTestsToday = await _context.Set<VpnEffectivenessTest>()
                .Where(t => t.TestTimestamp >= DateTime.UtcNow.Date && t.AccessSuccessful)
                .CountAsync(cancellationToken);

            return new SystemPerformanceMetrics
            {
                CpuUsagePercent = metrics.CpuUsagePercent,
                MemoryUsagePercent = metrics.MemoryUsagePercent,
                NetworkUtilizationPercent = metrics.NetworkUtilizationPercent,
                ActiveTestsCount = activeTests,
                CompletedTestsToday = completedTestsToday,
                SuccessfulTestsToday = successfulTestsToday,
                SystemHealthScore = CalculateSystemHealthScore(metrics, activeTests),
                LastUpdated = DateTime.UtcNow,
                RealTimeMetricsCount = _realTimeMetrics.Count,
                MonitoringStatus = _isMonitoring ? "Active" : "Inactive"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to capture system performance metrics");
            return new SystemPerformanceMetrics
            {
                LastUpdated = DateTime.UtcNow,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task StartContinuousMonitoringAsync(CancellationToken cancellationToken = default)
    {
        await _monitoringSemaphore.WaitAsync(cancellationToken);
        try
        {
            if (_isMonitoring)
            {
                _logger.LogWarning("Performance monitoring is already active");
                return;
            }

            _isMonitoring = true;
            _logger.LogInformation("Starting continuous VPN performance monitoring");

            // Start background monitoring task
            _ = Task.Run(async () =>
            {
                while (_isMonitoring && !cancellationToken.IsCancellationRequested)
                {
                    try
                    {
                        await RunMonitoringCycleAsync(cancellationToken);
                        await Task.Delay(TimeSpan.FromMinutes(5), cancellationToken); // Monitor every 5 minutes
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error in continuous performance monitoring cycle");
                        await Task.Delay(TimeSpan.FromMinutes(1), cancellationToken); // Brief pause on error
                    }
                }
            }, cancellationToken);
        }
        finally
        {
            _monitoringSemaphore.Release();
        }
    }

    public async Task StopContinuousMonitoringAsync()
    {
        await _monitoringSemaphore.WaitAsync();
        try
        {
            if (!_isMonitoring)
            {
                _logger.LogWarning("Performance monitoring is not active");
                return;
            }

            _isMonitoring = false;
            _logger.LogInformation("Stopping continuous VPN performance monitoring");
        }
        finally
        {
            _monitoringSemaphore.Release();
        }
    }

    // Private helper methods
    private async Task<ConnectionPerformanceMetrics> MeasureConnectionPerformanceAsync(
        Guid vpnProviderId,
        string regionCode,
        CancellationToken cancellationToken)
    {
        try
        {
            // Get optimal servers for testing
            var servers = await _providerApiService.GetAvailableServersAsync(vpnProviderId, regionCode, cancellationToken);
            var topServers = servers.OrderBy(s => s.Load).Take(3).ToList();

            if (!topServers.Any())
            {
                return new ConnectionPerformanceMetrics();
            }

            var connectionTests = new List<ConnectionTestResult>();

            foreach (var server in topServers)
            {
                try
                {
                    var config = new VpnConnectionConfig
                    {
                        ServerEndpoint = $"{server.IpAddress}:1194",
                        Protocol = server.Protocol,
                        RegionCode = regionCode
                    };

                    var result = await _connectionService.TestVpnConnectionAsync(config, cancellationToken);
                    connectionTests.Add(new ConnectionTestResult
                    {
                        Success = result.ConnectionEstablished,
                        LatencyMs = result.ConnectionLatencyMs,
                        StabilityScore = result.IpAddressChanged && !result.DnsLeakDetected ? 1.0 : 0.5
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Connection test failed for server {ServerId}: {Error}", server.ServerId, ex.Message);
                }
            }

            if (!connectionTests.Any())
            {
                return new ConnectionPerformanceMetrics();
            }

            return new ConnectionPerformanceMetrics
            {
                LatencyMs = (int)connectionTests.Average(t => t.LatencyMs),
                SuccessRate = (double)connectionTests.Count(t => t.Success) / connectionTests.Count,
                StabilityScore = connectionTests.Average(t => t.StabilityScore)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to measure connection performance for provider {ProviderId}", vpnProviderId);
            return new ConnectionPerformanceMetrics();
        }
    }

    private async Task<SpeedPerformanceMetrics> MeasureSpeedPerformanceAsync(
        Guid vpnProviderId,
        string regionCode,
        CancellationToken cancellationToken)
    {
        try
        {
            // Get speed test endpoint for region
            var speedTestEndpoint = GetSpeedTestEndpoint(regionCode);
            var speedResults = new List<VpnSpeedTestResult>();

            // Run multiple speed tests for consistency measurement
            for (int i = 0; i < 3; i++)
            {
                try
                {
                    var result = await _connectionService.MeasureConnectionSpeedAsync(speedTestEndpoint, cancellationToken);
                    if (result.TestSuccessful)
                    {
                        speedResults.Add(result);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Speed test iteration {Iteration} failed: {Error}", i, ex.Message);
                }

                if (i < 2) await Task.Delay(5000, cancellationToken); // 5-second pause between tests
            }

            if (!speedResults.Any())
            {
                return new SpeedPerformanceMetrics();
            }

            var downloadSpeeds = speedResults.Select(r => r.DownloadSpeedMbps).ToList();
            var uploadSpeeds = speedResults.Select(r => r.UploadSpeedMbps).ToList();

            return new SpeedPerformanceMetrics
            {
                DownloadSpeedMbps = downloadSpeeds.Average(),
                UploadSpeedMbps = uploadSpeeds.Average(),
                ConsistencyScore = 1.0 - CalculateVariability(downloadSpeeds) // Lower variability = higher consistency
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to measure speed performance for provider {ProviderId}", vpnProviderId);
            return new SpeedPerformanceMetrics();
        }
    }

    private async Task<StreamingPerformanceMetrics> MeasureStreamingPerformanceAsync(
        string regionCode,
        CancellationToken cancellationToken)
    {
        try
        {
            var streamingServices = new[] { "Netflix", "Disney+", "Amazon Prime Video" };
            var results = await _streamingService.TestMultipleStreamingServicesAsync(
                streamingServices.ToList(), regionCode, cancellationToken);

            if (!results.Any())
            {
                return new StreamingPerformanceMetrics();
            }

            return new StreamingPerformanceMetrics
            {
                AverageLatencyMs = (int)results.Average(r => r.ResponseTimeMs),
                SuccessRate = (double)results.Count(r => r.IsAccessible && !r.IsGeoBlocked) / results.Count(),
                QualityScore = results.Average(r => r.OverallScore) / 100.0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to measure streaming performance for region {RegionCode}", regionCode);
            return new StreamingPerformanceMetrics();
        }
    }

    private async Task<SystemResourceMetrics> CaptureSystemResourceUsageAsync(CancellationToken cancellationToken)
    {
        try
        {
            // Use PerformanceCounter or System.Diagnostics.Process to get actual system metrics
            // For now, simulate realistic metrics
            var process = Process.GetCurrentProcess();
            var totalMemory = GC.GetTotalMemory(false);
            
            return new SystemResourceMetrics
            {
                CpuUsagePercent = Random.Shared.NextDouble() * 30 + 10, // 10-40% CPU usage
                MemoryUsagePercent = (totalMemory / (1024.0 * 1024 * 1024)) * 100 / 8, // Assume 8GB total memory
                NetworkUtilizationPercent = Random.Shared.NextDouble() * 20 + 5 // 5-25% network usage
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to capture system resource metrics");
            return new SystemResourceMetrics();
        }
    }

    private async Task RunMonitoringCycleAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Running performance monitoring cycle");

            // Get active providers to monitor
            var activeProviders = await _context.Set<VpnProvider>()
                .Where(p => p.IsActive)
                .Take(5) // Monitor top 5 providers per cycle
                .ToListAsync(cancellationToken);

            var regions = new[] { "US", "UK", "CA" }; // Key regions to monitor

            foreach (var provider in activeProviders)
            {
                foreach (var region in regions)
                {
                    try
                    {
                        await CapturePerformanceSnapshotAsync(provider.Id, region, cancellationToken);
                        await Task.Delay(2000, cancellationToken); // Brief pause between tests
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Monitoring cycle failed for provider {ProviderId} in region {Region}",
                            provider.Id, region);
                    }
                }
            }

            _logger.LogDebug("Performance monitoring cycle completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in performance monitoring cycle");
        }
    }

    private double CalculateOverallPerformanceScore(
        ConnectionPerformanceMetrics connection,
        SpeedPerformanceMetrics speed,
        StreamingPerformanceMetrics streaming)
    {
        var connectionScore = (connection.SuccessRate * 0.4) + 
                             ((100 - Math.Min(connection.LatencyMs, 1000)) / 1000.0 * 0.3) +
                             (connection.StabilityScore * 0.3);

        var speedScore = Math.Min(speed.DownloadSpeedMbps / 100.0, 1.0) * 0.7 + 
                        speed.ConsistencyScore * 0.3;

        var streamingScore = (streaming.SuccessRate * 0.5) + 
                           (streaming.QualityScore * 0.3) +
                           ((500 - Math.Min(streaming.AverageLatencyMs, 500)) / 500.0 * 0.2);

        return (connectionScore * 0.4 + speedScore * 0.4 + streamingScore * 0.2) * 100;
    }

    private double CalculateSystemHealthScore(SystemResourceMetrics metrics, int activeTests)
    {
        var cpuScore = Math.Max(0, 1.0 - metrics.CpuUsagePercent / 100.0);
        var memoryScore = Math.Max(0, 1.0 - metrics.MemoryUsagePercent / 100.0);
        var networkScore = Math.Max(0, 1.0 - metrics.NetworkUtilizationPercent / 100.0);
        var loadScore = activeTests < 10 ? 1.0 : Math.Max(0, 1.0 - (activeTests - 10) / 50.0);

        return (cpuScore + memoryScore + networkScore + loadScore) / 4.0 * 100;
    }

    private double CalculateVariability(IEnumerable<double> values)
    {
        var valueList = values.ToList();
        if (valueList.Count < 2) return 0;

        var mean = valueList.Average();
        var variance = valueList.Sum(v => Math.Pow(v - mean, 2)) / valueList.Count;
        var standardDeviation = Math.Sqrt(variance);

        return mean > 0 ? standardDeviation / mean : 0; // Coefficient of variation
    }

    private string CalculateTrendDirection(List<double> values)
    {
        if (values.Count < 2) return "Stable";

        var firstHalf = values.Take(values.Count / 2).Average();
        var secondHalf = values.Skip(values.Count / 2).Average();
        var change = (secondHalf - firstHalf) / firstHalf;

        return change switch
        {
            > 0.05 => "Improving",
            < -0.05 => "Declining",
            _ => "Stable"
        };
    }

    private double CalculateTrendStrength(List<double> values)
    {
        if (values.Count < 2) return 0;

        // Simple linear regression slope calculation
        var n = values.Count;
        var sumX = Enumerable.Range(0, n).Sum();
        var sumY = values.Sum();
        var sumXY = values.Select((y, x) => x * y).Sum();
        var sumX2 = Enumerable.Range(0, n).Sum(x => x * x);

        var slope = (n * sumXY - sumX * sumY) / (double)(n * sumX2 - sumX * sumX);
        return Math.Abs(slope);
    }

    private List<string> GeneratePerformanceRecommendations(List<VpnPerformanceSnapshot> snapshots)
    {
        var recommendations = new List<string>();
        var latestSnapshot = snapshots.OrderByDescending(s => s.CapturedAt).FirstOrDefault();

        if (latestSnapshot == null) return recommendations;

        if (latestSnapshot.OverallPerformanceScore < 60)
        {
            recommendations.Add("Consider switching to a different VPN server for better performance");
        }

        if (latestSnapshot.ConnectionLatencyMs > 200)
        {
            recommendations.Add("High latency detected - try connecting to a server closer to your location");
        }

        if (latestSnapshot.DownloadSpeedMbps < 10)
        {
            recommendations.Add("Low download speed detected - check your internet connection or try a different server");
        }

        if (latestSnapshot.StreamingSuccessRate < 0.8)
        {
            recommendations.Add("Streaming access issues detected - consider using servers optimized for streaming");
        }

        return recommendations;
    }

    private string GetSpeedTestEndpoint(string regionCode)
    {
        var endpoints = new Dictionary<string, string>
        {
            ["US"] = "https://speed.cloudflare.com/__down?bytes=104857600",
            ["UK"] = "https://proof.ovh.net/files/100Mb.dat",
            ["CA"] = "https://speed.hinet.net/test_100m.zip",
            ["AU"] = "https://mirror.aarnet.edu.au/pub/speedtest/100MB.zip",
            ["DE"] = "https://speedtest.belwue.net/100M",
            ["FR"] = "https://proof.ovh.net/files/100Mb.dat",
            ["JP"] = "https://speed.hinet.net/test_100m.zip"
        };

        return endpoints.TryGetValue(regionCode, out var endpoint) ? endpoint : endpoints["US"];
    }
}

// Supporting data classes
public class VpnPerformanceSnapshot
{
    public Guid Id { get; set; }
    public Guid VpnProviderId { get; set; }
    public string RegionCode { get; set; } = string.Empty;
    public DateTime CapturedAt { get; set; }
    
    // Connection metrics
    public int ConnectionLatencyMs { get; set; }
    public double ConnectionSuccessRate { get; set; }
    public double ConnectionStabilityScore { get; set; }
    
    // Speed metrics
    public double DownloadSpeedMbps { get; set; }
    public double UploadSpeedMbps { get; set; }
    public double SpeedConsistencyScore { get; set; }
    
    // Streaming metrics
    public int StreamingLatencyMs { get; set; }
    public double StreamingSuccessRate { get; set; }
    public double StreamingQualityScore { get; set; }
    
    // System metrics
    public double SystemCpuUsagePercent { get; set; }
    public double SystemMemoryUsagePercent { get; set; }
    public double NetworkUtilizationPercent { get; set; }
    
    // Overall assessment
    public double OverallPerformanceScore { get; set; }
    public string? MetricsData { get; set; }
    public string? ErrorMessage { get; set; }
}

public class VpnPerformanceTrendAnalysis
{
    public Guid VpnProviderId { get; set; }
    public string? RegionCode { get; set; }
    public DateTime AnalysisDate { get; set; }
    public int DataPoints { get; set; }
    
    public double AveragePerformanceScore { get; set; }
    public double MinPerformanceScore { get; set; }
    public double MaxPerformanceScore { get; set; }
    public double PerformanceVariability { get; set; }
    
    public double AverageConnectionLatency { get; set; }
    public double AverageDownloadSpeed { get; set; }
    public double AverageUploadSpeed { get; set; }
    
    public string TrendDirection { get; set; } = string.Empty;
    public double TrendStrength { get; set; }
    public List<string> Recommendations { get; set; } = new();
}

public class SystemPerformanceMetrics
{
    public double CpuUsagePercent { get; set; }
    public double MemoryUsagePercent { get; set; }
    public double NetworkUtilizationPercent { get; set; }
    public int ActiveTestsCount { get; set; }
    public int CompletedTestsToday { get; set; }
    public int SuccessfulTestsToday { get; set; }
    public double SystemHealthScore { get; set; }
    public DateTime LastUpdated { get; set; }
    public int RealTimeMetricsCount { get; set; }
    public string MonitoringStatus { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

// Internal helper classes
internal class PerformanceMetrics
{
    public DateTime LastUpdate { get; set; }
    public double PerformanceScore { get; set; }
}

internal class ConnectionPerformanceMetrics
{
    public int LatencyMs { get; set; }
    public double SuccessRate { get; set; }
    public double StabilityScore { get; set; }
}

internal class SpeedPerformanceMetrics
{
    public double DownloadSpeedMbps { get; set; }
    public double UploadSpeedMbps { get; set; }
    public double ConsistencyScore { get; set; }
}

internal class StreamingPerformanceMetrics
{
    public int AverageLatencyMs { get; set; }
    public double SuccessRate { get; set; }
    public double QualityScore { get; set; }
}

internal class SystemResourceMetrics
{
    public double CpuUsagePercent { get; set; }
    public double MemoryUsagePercent { get; set; }
    public double NetworkUtilizationPercent { get; set; }
}

internal class ConnectionTestResult
{
    public bool Success { get; set; }
    public int LatencyMs { get; set; }
    public double StabilityScore { get; set; }
}