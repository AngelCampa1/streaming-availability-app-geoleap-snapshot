using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Advanced resource utilization monitor for comprehensive test performance analysis
    /// Tracks CPU, memory, I/O, and system resources during test execution
    /// </summary>
    public class ResourceUtilizationMonitor
    {
        private readonly ILogger<ResourceUtilizationMonitor> _logger;
        private readonly Timer _monitoringTimer;
        private readonly List<ResourceMeasurement> _measurements = new();
        private readonly object _measurementLock = new();
        private bool _isMonitoring = false;
        private readonly PerformanceCounter _cpuCounter;
        private readonly PerformanceCounter _memoryCounter;
        private readonly PerformanceCounter _diskCounter;
        private readonly PerformanceCounter _networkCounter;

        public ResourceUtilizationMonitor(ILogger<ResourceUtilizationMonitor> logger = null)
        {
            _logger = logger ?? CreateConsoleLogger();
            
            // Initialize performance counters
            _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            _memoryCounter = new PerformanceCounter("Memory", "Available MBytes");
            _diskCounter = new PerformanceCounter("PhysicalDisk", "% Disk Time", "_Total");
            _networkCounter = new PerformanceCounter("Network Interface", "Bytes Total/sec", "*");

            _monitoringTimer = new Timer(CollectResourceMetrics, null, Timeout.Infinite, Timeout.Infinite);
        }

        /// <summary>
        /// Start continuous resource monitoring
        /// </summary>
        public void StartMonitoring(int intervalMs = 1000)
        {
            if (_isMonitoring) return;

            _isMonitoring = true;
            _measurements.Clear();
            
            _logger.LogInformation($"Starting resource monitoring with {intervalMs}ms interval");
            _monitoringTimer.Change(0, intervalMs);
        }

        /// <summary>
        /// Stop resource monitoring and return collected data
        /// </summary>
        public ResourceMonitoringReport StopMonitoring()
        {
            if (!_isMonitoring) return new ResourceMonitoringReport();

            _isMonitoring = false;
            _monitoringTimer.Change(Timeout.Infinite, Timeout.Infinite);

            lock (_measurementLock)
            {
                var report = GenerateMonitoringReport(_measurements.ToList());
                _logger.LogInformation($"Resource monitoring stopped. Collected {_measurements.Count} measurements");
                return report;
            }
        }

        /// <summary>
        /// Collect real-time resource metrics
        /// </summary>
        private void CollectResourceMetrics(object state)
        {
            if (!_isMonitoring) return;

            try
            {
                var measurement = new ResourceMeasurement
                {
                    Timestamp = DateTime.UtcNow,
                    ProcessMetrics = CollectProcessMetrics(),
                    SystemMetrics = CollectSystemMetrics(),
                    MemoryMetrics = CollectMemoryMetrics(),
                    IoMetrics = CollectIoMetrics(),
                    NetworkMetrics = CollectNetworkMetrics(),
                    ThreadMetrics = CollectThreadMetrics()
                };

                lock (_measurementLock)
                {
                    _measurements.Add(measurement);
                    
                    // Keep only last 1000 measurements to prevent memory bloat
                    if (_measurements.Count > 1000)
                    {
                        _measurements.RemoveAt(0);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to collect resource metrics");
            }
        }

        /// <summary>
        /// Collect process-specific metrics
        /// </summary>
        private ProcessMetrics CollectProcessMetrics()
        {
            var process = Process.GetCurrentProcess();
            
            return new ProcessMetrics
            {
                ProcessId = process.Id,
                WorkingSet = process.WorkingSet64,
                PrivateMemorySize = process.PrivateMemorySize64,
                VirtualMemorySize = process.VirtualMemorySize64,
                PagedMemorySize = process.PagedMemorySize64,
                ThreadCount = process.Threads.Count,
                HandleCount = process.HandleCount,
                TotalProcessorTime = process.TotalProcessorTime,
                UserProcessorTime = process.UserProcessorTime,
                PrivilegedProcessorTime = process.PrivilegedProcessorTime,
                BasePriority = process.BasePriority,
                StartTime = process.StartTime
            };
        }

        /// <summary>
        /// Collect system-wide metrics
        /// </summary>
        private SystemMetrics CollectSystemMetrics()
        {
            return new SystemMetrics
            {
                CpuUsagePercent = GetCpuUsage(),
                AvailableMemoryMB = GetAvailableMemory(),
                DiskUsagePercent = GetDiskUsage(),
                NetworkThroughputBytesPerSec = GetNetworkThroughput(),
                SystemUptime = GetSystemUptime(),
                ProcessCount = Process.GetProcesses().Length,
                LoadAverage = GetLoadAverage()
            };
        }

        /// <summary>
        /// Collect detailed memory metrics
        /// </summary>
        private MemoryMetrics CollectMemoryMetrics()
        {
            var gcGen0 = GC.CollectionCount(0);
            var gcGen1 = GC.CollectionCount(1);
            var gcGen2 = GC.CollectionCount(2);
            var totalMemory = GC.GetTotalMemory(false);

            return new MemoryMetrics
            {
                GCGen0Collections = gcGen0,
                GCGen1Collections = gcGen1,
                GCGen2Collections = gcGen2,
                GCTotalMemory = totalMemory,
                MemoryPressure = GetMemoryPressure(),
                LargeObjectHeapSize = GetLargeObjectHeapSize(),
                Gen0HeapSize = GetGen0HeapSize(),
                Gen1HeapSize = GetGen1HeapSize(),
                Gen2HeapSize = GetGen2HeapSize()
            };
        }

        /// <summary>
        /// Collect I/O operation metrics
        /// </summary>
        private IoMetrics CollectIoMetrics()
        {
            var process = Process.GetCurrentProcess();
            
            return new IoMetrics
            {
                ReadOperationCount = GetProcessIoReadCount(process),
                WriteOperationCount = GetProcessIoWriteCount(process),
                ReadTransferCount = GetProcessIoReadBytes(process),
                WriteTransferCount = GetProcessIoWriteBytes(process),
                OtherOperationCount = GetProcessIoOtherCount(process),
                OtherTransferCount = GetProcessIoOtherBytes(process)
            };
        }

        /// <summary>
        /// Collect network metrics
        /// </summary>
        private NetworkMetrics CollectNetworkMetrics()
        {
            return new NetworkMetrics
            {
                BytesSent = GetNetworkBytesSent(),
                BytesReceived = GetNetworkBytesReceived(),
                PacketsSent = GetNetworkPacketsSent(),
                PacketsReceived = GetNetworkPacketsReceived(),
                ConnectionCount = GetActiveConnectionCount(),
                NetworkUtilization = GetNetworkUtilization()
            };
        }

        /// <summary>
        /// Collect thread-specific metrics
        /// </summary>
        private ThreadMetrics CollectThreadMetrics()
        {
            var process = Process.GetCurrentProcess();
            var threads = process.Threads;
            
            return new ThreadMetrics
            {
                TotalThreads = threads.Count,
                RunningThreads = threads.Cast<ProcessThread>().Count(t => t.ThreadState == ThreadState.Running),
                WaitingThreads = threads.Cast<ProcessThread>().Count(t => t.ThreadState == ThreadState.Wait),
                ThreadPoolThreads = GetThreadPoolThreadCount(),
                WorkerThreads = GetWorkerThreadCount(),
                CompletionPortThreads = GetCompletionPortThreadCount()
            };
        }

        /// <summary>
        /// Generate comprehensive monitoring report
        /// </summary>
        private ResourceMonitoringReport GenerateMonitoringReport(List<ResourceMeasurement> measurements)
        {
            if (!measurements.Any())
                return new ResourceMonitoringReport();

            var firstMeasurement = measurements.FirstOrDefault();
            var lastMeasurement = measurements.LastOrDefault();

            if (firstMeasurement == null || lastMeasurement == null)
                return new ResourceMonitoringReport();

            var report = new ResourceMonitoringReport
            {
                StartTime = firstMeasurement.Timestamp,
                EndTime = lastMeasurement.Timestamp,
                Duration = lastMeasurement.Timestamp - firstMeasurement.Timestamp,
                MeasurementCount = measurements.Count,
                SamplingInterval = CalculateAverageSamplingInterval(measurements)
            };

            // CPU Analysis
            report.CpuAnalysis = AnalyzeCpuUsage(measurements);
            
            // Memory Analysis
            report.MemoryAnalysis = AnalyzeMemoryUsage(measurements);
            
            // I/O Analysis
            report.IoAnalysis = AnalyzeIoUsage(measurements);
            
            // Network Analysis
            report.NetworkAnalysis = AnalyzeNetworkUsage(measurements);
            
            // Thread Analysis
            report.ThreadAnalysis = AnalyzeThreadUsage(measurements);
            
            // Performance bottlenecks
            report.Bottlenecks = IdentifyResourceBottlenecks(measurements);
            
            // Optimization recommendations
            report.Recommendations = GenerateOptimizationRecommendations(report);

            return report;
        }

        /// <summary>
        /// Analyze CPU usage patterns
        /// </summary>
        private CpuAnalysis AnalyzeCpuUsage(List<ResourceMeasurement> measurements)
        {
            var cpuUsages = measurements.Select(m => m.SystemMetrics.CpuUsagePercent).ToList();
            var processCpuTimes = measurements.Select(m => m.ProcessMetrics.TotalProcessorTime.TotalMilliseconds).ToList();
            
            return new CpuAnalysis
            {
                AverageCpuUsage = cpuUsages.Average(),
                PeakCpuUsage = cpuUsages.Max(),
                MinCpuUsage = cpuUsages.Min(),
                CpuUsageStandardDeviation = CalculateStandardDeviation(cpuUsages),
                AverageProcessCpuTime = processCpuTimes.Average(),
                PeakProcessCpuTime = processCpuTimes.Max(),
                CpuSpikes = IdentifyCpuSpikes(cpuUsages),
                CpuTrend = CalculateTrend(cpuUsages)
            };
        }

        /// <summary>
        /// Analyze memory usage patterns
        /// </summary>
        private MemoryAnalysis AnalyzeMemoryUsage(List<ResourceMeasurement> measurements)
        {
            var workingSets = measurements.Select(m => m.ProcessMetrics.WorkingSet).ToList();
            var privateMemories = measurements.Select(m => m.ProcessMetrics.PrivateMemorySize).ToList();
            var gcMemories = measurements.Select(m => m.MemoryMetrics.GCTotalMemory).ToList();
            
            return new MemoryAnalysis
            {
                AverageWorkingSet = workingSets.Average(),
                PeakWorkingSet = workingSets.Max(),
                MinWorkingSet = workingSets.Min(),
                AveragePrivateMemory = privateMemories.Average(),
                PeakPrivateMemory = privateMemories.Max(),
                AverageGCMemory = gcMemories.Average(),
                PeakGCMemory = gcMemories.Max(),
                MemoryGrowthRate = CalculateGrowthRate(workingSets),
                GCPressure = CalculateGCPressure(measurements),
                MemoryLeaks = DetectMemoryLeaks(workingSets)
            };
        }

        /// <summary>
        /// Identify resource bottlenecks
        /// </summary>
        private List<ResourceBottleneck> IdentifyResourceBottlenecks(List<ResourceMeasurement> measurements)
        {
            var bottlenecks = new List<ResourceBottleneck>();
            
            // CPU bottlenecks
            var avgCpu = measurements.Average(m => m.SystemMetrics.CpuUsagePercent);
            if (avgCpu > 80)
            {
                bottlenecks.Add(new ResourceBottleneck
                {
                    Type = "CPU",
                    Severity = avgCpu > 95 ? "CRITICAL" : "HIGH",
                    Description = $"High CPU usage: {avgCpu:F1}%",
                    Impact = "May slow down test execution significantly",
                    Recommendation = "Consider reducing test parallelism or optimizing CPU-intensive operations"
                });
            }
            
            // Memory bottlenecks
            var memoryGrowth = CalculateMemoryGrowthRate(measurements);
            if (memoryGrowth > 1024 * 1024) // 1MB/s
            {
                bottlenecks.Add(new ResourceBottleneck
                {
                    Type = "MEMORY",
                    Severity = "MEDIUM",
                    Description = $"High memory growth rate: {memoryGrowth / 1024 / 1024:F2} MB/s",
                    Impact = "Potential memory leak or excessive allocation",
                    Recommendation = "Review object disposal patterns and consider object pooling"
                });
            }
            
            // I/O bottlenecks
            var avgIoTime = measurements.Average(m => m.SystemMetrics.DiskUsagePercent);
            if (avgIoTime > 70)
            {
                bottlenecks.Add(new ResourceBottleneck
                {
                    Type = "IO",
                    Severity = "MEDIUM",
                    Description = $"High disk usage: {avgIoTime:F1}%",
                    Impact = "I/O operations may be blocking test execution",
                    Recommendation = "Use in-memory alternatives or mock file operations"
                });
            }
            
            return bottlenecks;
        }

        // Helper methods for system metrics collection
        private double GetCpuUsage()
        {
            try
            {
                return _cpuCounter.NextValue();
            }
            catch
            {
                return 0;
            }
        }

        private double GetAvailableMemory()
        {
            try
            {
                return _memoryCounter.NextValue();
            }
            catch
            {
                return 0;
            }
        }

        private double GetDiskUsage()
        {
            try
            {
                return _diskCounter.NextValue();
            }
            catch
            {
                return 0;
            }
        }

        private double GetNetworkThroughput()
        {
            try
            {
                return _networkCounter.NextValue();
            }
            catch
            {
                return 0;
            }
        }

        private TimeSpan GetSystemUptime()
        {
            return TimeSpan.FromMilliseconds(Environment.TickCount64);
        }

        private double GetLoadAverage()
        {
            // Simplified load average calculation for Windows
            return Environment.ProcessorCount * GetCpuUsage() / 100.0;
        }

        private long GetMemoryPressure()
        {
            return GC.GetTotalMemory(false);
        }

        private long GetLargeObjectHeapSize()
        {
            // Approximation - actual LOH size requires more complex calculation
            return GC.GetTotalMemory(false) / 10; // Rough estimate
        }

        private long GetGen0HeapSize()
        {
            return GC.GetTotalMemory(false) / 4; // Rough estimate
        }

        private long GetGen1HeapSize()
        {
            return GC.GetTotalMemory(false) / 8; // Rough estimate
        }

        private long GetGen2HeapSize()
        {
            return GC.GetTotalMemory(false) / 2; // Rough estimate
        }

        // Process I/O methods (platform-specific implementations would go here)
        private long GetProcessIoReadCount(Process process) => 0; // Placeholder
        private long GetProcessIoWriteCount(Process process) => 0; // Placeholder
        private long GetProcessIoReadBytes(Process process) => 0; // Placeholder
        private long GetProcessIoWriteBytes(Process process) => 0; // Placeholder
        private long GetProcessIoOtherCount(Process process) => 0; // Placeholder
        private long GetProcessIoOtherBytes(Process process) => 0; // Placeholder

        // Network metrics methods
        private long GetNetworkBytesSent() => 0; // Placeholder
        private long GetNetworkBytesReceived() => 0; // Placeholder
        private long GetNetworkPacketsSent() => 0; // Placeholder
        private long GetNetworkPacketsReceived() => 0; // Placeholder
        private int GetActiveConnectionCount() => 0; // Placeholder
        private double GetNetworkUtilization() => 0; // Placeholder

        // Thread metrics methods
        private int GetThreadPoolThreadCount()
        {
            ThreadPool.GetAvailableThreads(out int workerThreads, out int completionPortThreads);
            ThreadPool.GetMaxThreads(out int maxWorkerThreads, out int maxCompletionPortThreads);
            return maxWorkerThreads - workerThreads;
        }

        private int GetWorkerThreadCount()
        {
            ThreadPool.GetAvailableThreads(out int workerThreads, out _);
            ThreadPool.GetMaxThreads(out int maxWorkerThreads, out _);
            return maxWorkerThreads - workerThreads;
        }

        private int GetCompletionPortThreadCount()
        {
            ThreadPool.GetAvailableThreads(out _, out int completionPortThreads);
            ThreadPool.GetMaxThreads(out _, out int maxCompletionPortThreads);
            return maxCompletionPortThreads - completionPortThreads;
        }

        // Analysis helper methods
        private double CalculateStandardDeviation(List<double> values)
        {
            if (!values.Any()) return 0;
            
            var mean = values.Average();
            var squaredDifferences = values.Select(v => Math.Pow(v - mean, 2));
            var variance = squaredDifferences.Average();
            return Math.Sqrt(variance);
        }

        private double CalculateGrowthRate(List<long> values)
        {
            if (values.Count < 2) return 0;

            var firstValue = values.FirstOrDefault();
            var lastValue = values.LastOrDefault();
            var timeSpan = values.Count; // Simplified - should use actual time differences

            return (double)(lastValue - firstValue) / timeSpan;
        }

        private double CalculateMemoryGrowthRate(List<ResourceMeasurement> measurements)
        {
            if (measurements.Count < 2) return 0;

            var firstMeasurement = measurements.FirstOrDefault();
            var lastMeasurement = measurements.LastOrDefault();

            if (firstMeasurement == null || lastMeasurement == null) return 0;

            var firstMemory = firstMeasurement.ProcessMetrics.WorkingSet;
            var lastMemory = lastMeasurement.ProcessMetrics.WorkingSet;
            var timeSpan = (lastMeasurement.Timestamp - firstMeasurement.Timestamp).TotalSeconds;

            return timeSpan > 0 ? (lastMemory - firstMemory) / timeSpan : 0;
        }

        private TimeSpan CalculateAverageSamplingInterval(List<ResourceMeasurement> measurements)
        {
            if (measurements.Count < 2) return TimeSpan.Zero;
            
            var intervals = new List<TimeSpan>();
            for (int i = 1; i < measurements.Count; i++)
            {
                intervals.Add(measurements[i].Timestamp - measurements[i - 1].Timestamp);
            }
            
            var avgTicks = intervals.Average(i => i.Ticks);
            return new TimeSpan((long)avgTicks);
        }

        private string CalculateTrend(List<double> values)
        {
            if (values.Count < 2) return "STABLE";
            
            var slope = CalculateLinearRegressionSlope(values);
            
            return slope switch
            {
                > 0.1 => "INCREASING",
                < -0.1 => "DECREASING",
                _ => "STABLE"
            };
        }

        private double CalculateLinearRegressionSlope(List<double> values)
        {
            var n = values.Count;
            var sumX = Enumerable.Range(0, n).Sum();
            var sumY = values.Sum();
            var sumXY = values.Select((y, x) => x * y).Sum();
            var sumXX = Enumerable.Range(0, n).Select(x => x * x).Sum();
            
            return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        }

        private List<CpuSpike> IdentifyCpuSpikes(List<double> cpuUsages)
        {
            var spikes = new List<CpuSpike>();
            var threshold = cpuUsages.Average() + 2 * CalculateStandardDeviation(cpuUsages);
            
            for (int i = 0; i < cpuUsages.Count; i++)
            {
                if (cpuUsages[i] > threshold)
                {
                    spikes.Add(new CpuSpike
                    {
                        Index = i,
                        Value = cpuUsages[i],
                        Threshold = threshold
                    });
                }
            }
            
            return spikes;
        }

        private double CalculateGCPressure(List<ResourceMeasurement> measurements)
        {
            if (measurements.Count < 2) return 0;

            var firstMeasurement = measurements.FirstOrDefault();
            var lastMeasurement = measurements.LastOrDefault();

            if (firstMeasurement == null || lastMeasurement == null) return 0;
            
            var gen0Delta = lastMeasurement.MemoryMetrics.GCGen0Collections - firstMeasurement.MemoryMetrics.GCGen0Collections;
            var gen1Delta = lastMeasurement.MemoryMetrics.GCGen1Collections - firstMeasurement.MemoryMetrics.GCGen1Collections;
            var gen2Delta = lastMeasurement.MemoryMetrics.GCGen2Collections - firstMeasurement.MemoryMetrics.GCGen2Collections;
            
            var timeSpan = (lastMeasurement.Timestamp - firstMeasurement.Timestamp).TotalMinutes;
            
            return timeSpan > 0 ? (gen0Delta + gen1Delta * 2 + gen2Delta * 4) / timeSpan : 0;
        }

        private bool DetectMemoryLeaks(List<long> workingSets)
        {
            if (workingSets.Count < 10) return false;
            
            var trend = CalculateLinearRegressionSlope(workingSets.Select(w => (double)w).ToList());
            var growthRate = CalculateGrowthRate(workingSets);
            
            // Simple leak detection: consistent upward trend with significant growth
            return trend > 0.5 && growthRate > 1024 * 1024; // 1MB growth
        }

        private IoAnalysis AnalyzeIoUsage(List<ResourceMeasurement> measurements)
        {
            var readCounts = measurements.Select(m => m.IoMetrics.ReadOperationCount).ToList();
            var writeCounts = measurements.Select(m => m.IoMetrics.WriteOperationCount).ToList();
            
            return new IoAnalysis
            {
                AverageReadOperations = readCounts.Average(),
                AverageWriteOperations = writeCounts.Average(),
                TotalReadBytes = measurements.Sum(m => m.IoMetrics.ReadTransferCount),
                TotalWriteBytes = measurements.Sum(m => m.IoMetrics.WriteTransferCount),
                IoIntensity = CalculateIoIntensity(measurements)
            };
        }

        private NetworkAnalysis AnalyzeNetworkUsage(List<ResourceMeasurement> measurements)
        {
            return new NetworkAnalysis
            {
                TotalBytesSent = measurements.Sum(m => m.NetworkMetrics.BytesSent),
                TotalBytesReceived = measurements.Sum(m => m.NetworkMetrics.BytesReceived),
                AverageConnections = measurements.Average(m => m.NetworkMetrics.ConnectionCount),
                NetworkUtilization = measurements.Average(m => m.NetworkMetrics.NetworkUtilization)
            };
        }

        private ThreadAnalysis AnalyzeThreadUsage(List<ResourceMeasurement> measurements)
        {
            var threadCounts = measurements.Select(m => m.ThreadMetrics.TotalThreads).ToList();
            
            return new ThreadAnalysis
            {
                AverageThreadCount = threadCounts.Average(),
                PeakThreadCount = threadCounts.Max(),
                MinThreadCount = threadCounts.Min(),
                ThreadCountVariability = CalculateStandardDeviation(threadCounts.Select(t => (double)t).ToList())
            };
        }

        private double CalculateIoIntensity(List<ResourceMeasurement> measurements)
        {
            var totalOps = measurements.Sum(m => m.IoMetrics.ReadOperationCount + m.IoMetrics.WriteOperationCount);
            var timeSpan = measurements.Count; // Simplified
            return timeSpan > 0 ? (double)totalOps / timeSpan : 0;
        }

        private List<string> GenerateOptimizationRecommendations(ResourceMonitoringReport report)
        {
            var recommendations = new List<string>();
            
            if (report.CpuAnalysis.AverageCpuUsage > 70)
                recommendations.Add("Consider reducing CPU-intensive operations or test parallelism");
            
            if (report.MemoryAnalysis.MemoryGrowthRate > 1024 * 1024)
                recommendations.Add("Investigate potential memory leaks and improve object disposal");
            
            if (report.IoAnalysis.IoIntensity > 100)
                recommendations.Add("Consider using in-memory alternatives for file operations");
            
            if (report.ThreadAnalysis.PeakThreadCount > Environment.ProcessorCount * 4)
                recommendations.Add("Thread count is high - consider reducing concurrent operations");
            
            return recommendations;
        }

        private ILogger<ResourceUtilizationMonitor> CreateConsoleLogger()
        {
            using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            return loggerFactory.CreateLogger<ResourceUtilizationMonitor>();
        }

        public void Dispose()
        {
            _monitoringTimer?.Dispose();
            _cpuCounter?.Dispose();
            _memoryCounter?.Dispose();
            _diskCounter?.Dispose();
            _networkCounter?.Dispose();
        }
    }
}