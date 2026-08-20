using System;
using System.Collections.Generic;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Data models for comprehensive resource monitoring and analysis
    /// </summary>

    public class ResourceMeasurement
    {
        public DateTime Timestamp { get; set; }
        public ProcessMetrics ProcessMetrics { get; set; } = new();
        public SystemMetrics SystemMetrics { get; set; } = new();
        public MemoryMetrics MemoryMetrics { get; set; } = new();
        public IoMetrics IoMetrics { get; set; } = new();
        public NetworkMetrics NetworkMetrics { get; set; } = new();
        public ThreadMetrics ThreadMetrics { get; set; } = new();
    }

    public class ProcessMetrics
    {
        public int ProcessId { get; set; }
        public long WorkingSet { get; set; }
        public long PrivateMemorySize { get; set; }
        public long VirtualMemorySize { get; set; }
        public long PagedMemorySize { get; set; }
        public int ThreadCount { get; set; }
        public int HandleCount { get; set; }
        public TimeSpan TotalProcessorTime { get; set; }
        public TimeSpan UserProcessorTime { get; set; }
        public TimeSpan PrivilegedProcessorTime { get; set; }
        public int BasePriority { get; set; }
        public DateTime StartTime { get; set; }
    }

    public class SystemMetrics
    {
        public double CpuUsagePercent { get; set; }
        public double AvailableMemoryMB { get; set; }
        public double DiskUsagePercent { get; set; }
        public double NetworkThroughputBytesPerSec { get; set; }
        public TimeSpan SystemUptime { get; set; }
        public int ProcessCount { get; set; }
        public double LoadAverage { get; set; }
    }

    public class MemoryMetrics
    {
        public int GCGen0Collections { get; set; }
        public int GCGen1Collections { get; set; }
        public int GCGen2Collections { get; set; }
        public long GCTotalMemory { get; set; }
        public long MemoryPressure { get; set; }
        public long LargeObjectHeapSize { get; set; }
        public long Gen0HeapSize { get; set; }
        public long Gen1HeapSize { get; set; }
        public long Gen2HeapSize { get; set; }
    }

    public class IoMetrics
    {
        public long ReadOperationCount { get; set; }
        public long WriteOperationCount { get; set; }
        public long ReadTransferCount { get; set; }
        public long WriteTransferCount { get; set; }
        public long OtherOperationCount { get; set; }
        public long OtherTransferCount { get; set; }
    }

    public class NetworkMetrics
    {
        public long BytesSent { get; set; }
        public long BytesReceived { get; set; }
        public long PacketsSent { get; set; }
        public long PacketsReceived { get; set; }
        public int ConnectionCount { get; set; }
        public double NetworkUtilization { get; set; }
    }

    public class ThreadMetrics
    {
        public int TotalThreads { get; set; }
        public int RunningThreads { get; set; }
        public int WaitingThreads { get; set; }
        public int ThreadPoolThreads { get; set; }
        public int WorkerThreads { get; set; }
        public int CompletionPortThreads { get; set; }
    }

    public class ResourceMonitoringReport
    {
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public TimeSpan Duration { get; set; }
        public int MeasurementCount { get; set; }
        public TimeSpan SamplingInterval { get; set; }
        
        public CpuAnalysis CpuAnalysis { get; set; } = new();
        public MemoryAnalysis MemoryAnalysis { get; set; } = new();
        public IoAnalysis IoAnalysis { get; set; } = new();
        public NetworkAnalysis NetworkAnalysis { get; set; } = new();
        public ThreadAnalysis ThreadAnalysis { get; set; } = new();
        public List<ResourceBottleneck> Bottlenecks { get; set; } = new();
        public List<string> Recommendations { get; set; } = new();
    }

    public class CpuAnalysis
    {
        public double AverageCpuUsage { get; set; }
        public double PeakCpuUsage { get; set; }
        public double MinCpuUsage { get; set; }
        public double CpuUsageStandardDeviation { get; set; }
        public double AverageProcessCpuTime { get; set; }
        public double PeakProcessCpuTime { get; set; }
        public List<CpuSpike> CpuSpikes { get; set; } = new();
        public string CpuTrend { get; set; } = string.Empty;
    }

    public class MemoryAnalysis
    {
        public double AverageWorkingSet { get; set; }
        public long PeakWorkingSet { get; set; }
        public long MinWorkingSet { get; set; }
        public double AveragePrivateMemory { get; set; }
        public long PeakPrivateMemory { get; set; }
        public double AverageGCMemory { get; set; }
        public long PeakGCMemory { get; set; }
        public double MemoryGrowthRate { get; set; }
        public double GCPressure { get; set; }
        public bool MemoryLeaks { get; set; }
    }

    public class IoAnalysis
    {
        public double AverageReadOperations { get; set; }
        public double AverageWriteOperations { get; set; }
        public long TotalReadBytes { get; set; }
        public long TotalWriteBytes { get; set; }
        public double IoIntensity { get; set; }
    }

    public class NetworkAnalysis
    {
        public long TotalBytesSent { get; set; }
        public long TotalBytesReceived { get; set; }
        public double AverageConnections { get; set; }
        public double NetworkUtilization { get; set; }
    }

    public class ThreadAnalysis
    {
        public double AverageThreadCount { get; set; }
        public int PeakThreadCount { get; set; }
        public int MinThreadCount { get; set; }
        public double ThreadCountVariability { get; set; }
    }

    public class ResourceBottleneck
    {
        public string Type { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Impact { get; set; } = string.Empty;
        public string Recommendation { get; set; } = string.Empty;
        public double Value { get; set; }
        public double Threshold { get; set; }
    }

    public class CpuSpike
    {
        public int Index { get; set; }
        public double Value { get; set; }
        public double Threshold { get; set; }
        public DateTime Timestamp { get; set; }
        public TimeSpan Duration { get; set; }
    }

    /// <summary>
    /// Test factory performance analysis
    /// </summary>
    public class TestFactoryPerformanceAnalyzer
    {
        public TestFactoryMetrics AnalyzeFactoryPerformance<TFactory>(Func<TFactory> factoryCreator)
        {
            var metrics = new TestFactoryMetrics
            {
                FactoryType = typeof(TFactory).Name,
                StartTime = DateTime.UtcNow
            };

            var sw = System.Diagnostics.Stopwatch.StartNew();
            var memoryBefore = GC.GetTotalMemory(false);

            try
            {
                // Measure factory creation
                var factory = factoryCreator();
                sw.Stop();
                
                metrics.CreationTime = sw.Elapsed;
                metrics.MemoryAllocated = GC.GetTotalMemory(false) - memoryBefore;
                metrics.Success = true;

                // Measure disposal if disposable
                if (factory is IDisposable disposable)
                {
                    var disposalSw = System.Diagnostics.Stopwatch.StartNew();
                    disposable.Dispose();
                    disposalSw.Stop();
                    metrics.DisposalTime = disposalSw.Elapsed;
                }

                metrics.EndTime = DateTime.UtcNow;
                return metrics;
            }
            catch (Exception ex)
            {
                sw.Stop();
                metrics.Exception = ex;
                metrics.Success = false;
                metrics.EndTime = DateTime.UtcNow;
                return metrics;
            }
        }
    }

    public class TestFactoryMetrics
    {
        public string FactoryType { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public TimeSpan CreationTime { get; set; }
        public TimeSpan DisposalTime { get; set; }
        public long MemoryAllocated { get; set; }
        public bool Success { get; set; }
        public Exception? Exception { get; set; }
        
        public double CreationOverheadMs => CreationTime.TotalMilliseconds;
        public double DisposalOverheadMs => DisposalTime.TotalMilliseconds;
        public double TotalOverheadMs => CreationTime.TotalMilliseconds + DisposalTime.TotalMilliseconds;
        public double MemoryOverheadMB => MemoryAllocated / 1024.0 / 1024.0;
    }

    /// <summary>
    /// Database operations performance profiler
    /// </summary>
    public class DatabasePerformanceProfiler
    {
        private readonly List<DatabaseOperation> _operations = new();

        public void RecordOperation(string operationType, TimeSpan duration, bool success, string? errorMessage = null)
        {
            _operations.Add(new DatabaseOperation
            {
                OperationType = operationType,
                Duration = duration,
                Success = success,
                ErrorMessage = errorMessage,
                Timestamp = DateTime.UtcNow
            });
        }

        public DatabasePerformanceReport GenerateReport()
        {
            var report = new DatabasePerformanceReport
            {
                TotalOperations = _operations.Count,
                SuccessfulOperations = _operations.Count(o => o.Success),
                FailedOperations = _operations.Count(o => !o.Success),
                AverageOperationTime = TimeSpan.FromMilliseconds(_operations.Average(o => o.Duration.TotalMilliseconds)),
                SlowestOperation = _operations.OrderByDescending(o => o.Duration).FirstOrDefault(),
                FastestOperation = _operations.OrderBy(o => o.Duration).FirstOrDefault()
            };

            // Group by operation type
            report.OperationsByType = _operations
                .GroupBy(o => o.OperationType)
                .ToDictionary(g => g.Key, g => new OperationTypeMetrics
                {
                    Count = g.Count(),
                    AverageDuration = TimeSpan.FromMilliseconds(g.Average(o => o.Duration.TotalMilliseconds)),
                    SuccessRate = (double)g.Count(o => o.Success) / g.Count() * 100
                });

            return report;
        }
    }

    public class DatabaseOperation
    {
        public string OperationType { get; set; } = string.Empty;
        public TimeSpan Duration { get; set; }
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class DatabasePerformanceReport
    {
        public int TotalOperations { get; set; }
        public int SuccessfulOperations { get; set; }
        public int FailedOperations { get; set; }
        public TimeSpan AverageOperationTime { get; set; }
        public DatabaseOperation? SlowestOperation { get; set; }
        public DatabaseOperation? FastestOperation { get; set; }
        public Dictionary<string, OperationTypeMetrics> OperationsByType { get; set; } = new();
        
        public double SuccessRate => TotalOperations > 0 ? (double)SuccessfulOperations / TotalOperations * 100 : 0;
    }

    public class OperationTypeMetrics
    {
        public int Count { get; set; }
        public TimeSpan AverageDuration { get; set; }
        public double SuccessRate { get; set; }
    }

    /// <summary>
    /// Service initialization overhead analyzer
    /// </summary>
    public class ServiceInitializationAnalyzer
    {
        private readonly List<ServiceInitializationMetric> _metrics = new();

        public void RecordServiceInitialization(string serviceName, TimeSpan initializationTime, long memoryUsed)
        {
            _metrics.Add(new ServiceInitializationMetric
            {
                ServiceName = serviceName,
                InitializationTime = initializationTime,
                MemoryUsed = memoryUsed,
                Timestamp = DateTime.UtcNow
            });
        }

        public ServiceInitializationReport GenerateReport()
        {
            return new ServiceInitializationReport
            {
                TotalServices = _metrics.Count,
                TotalInitializationTime = TimeSpan.FromMilliseconds(_metrics.Sum(m => m.InitializationTime.TotalMilliseconds)),
                AverageInitializationTime = TimeSpan.FromMilliseconds(_metrics.Average(m => m.InitializationTime.TotalMilliseconds)),
                TotalMemoryUsed = _metrics.Sum(m => m.MemoryUsed),
                SlowestService = _metrics.OrderByDescending(m => m.InitializationTime).FirstOrDefault(),
                FastestService = _metrics.OrderBy(m => m.InitializationTime).FirstOrDefault(),
                ServiceMetrics = _metrics.ToList()
            };
        }
    }

    public class ServiceInitializationMetric
    {
        public string ServiceName { get; set; } = string.Empty;
        public TimeSpan InitializationTime { get; set; }
        public long MemoryUsed { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class ServiceInitializationReport
    {
        public int TotalServices { get; set; }
        public TimeSpan TotalInitializationTime { get; set; }
        public TimeSpan AverageInitializationTime { get; set; }
        public long TotalMemoryUsed { get; set; }
        public ServiceInitializationMetric? SlowestService { get; set; }
        public ServiceInitializationMetric? FastestService { get; set; }
        public List<ServiceInitializationMetric> ServiceMetrics { get; set; } = new();
    }
}