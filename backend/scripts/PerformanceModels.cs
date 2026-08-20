using System;
using System.Collections.Generic;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Data models for comprehensive test performance analysis
    /// </summary>

    public class TestExecutionProfile
    {
        public string TestClass { get; set; } = string.Empty;
        public string TestMethod { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public TimeSpan TotalDuration { get; set; }
        public TimeSpan SetupDuration { get; set; }
        public TimeSpan ExecutionDuration { get; set; }
        public TimeSpan TeardownDuration { get; set; }
        public bool Success { get; set; }
        public Exception? Exception { get; set; }
        public int ProcessId { get; set; }
        public int ThreadId { get; set; }
        
        public ResourceSnapshot PreExecutionResources { get; set; } = new();
        public ResourceSnapshot PostExecutionResources { get; set; } = new();
        public ResourceDelta ResourceDelta { get; set; } = new();
        
        public SetupMetrics SetupMetrics { get; set; } = new();
        public TeardownMetrics TeardownMetrics { get; set; } = new();
        public BottleneckAnalysis BottleneckAnalysis { get; set; } = new();
        
        public double ParallelSafetyScore { get; set; }
        public List<string> Dependencies { get; set; } = new();
        public Dictionary<string, object> CustomMetrics { get; set; } = new();
    }

    public class ResourceSnapshot
    {
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public long MemoryUsage { get; set; }
        public TimeSpan CpuTime { get; set; }
        public int FileHandles { get; set; }
        public int ThreadCount { get; set; }
        public double CpuPercentage { get; set; }
        public long WorkingSetMemory { get; set; }
        public int GCCollectionCount { get; set; }
        public long GCTotalMemory { get; set; }
    }

    public class ResourceDelta
    {
        public long MemoryDelta { get; set; }
        public TimeSpan CpuTimeDelta { get; set; }
        public int FileHandleDelta { get; set; }
        public int ThreadCountDelta { get; set; }
        public double CpuPercentageDelta { get; set; }
        public int GCCollectionDelta { get; set; }
        public long GCMemoryDelta { get; set; }
    }

    public class SetupMetrics
    {
        public TimeSpan TotalSetupTime { get; set; }
        public TimeSpan FactoryCreationTime { get; set; }
        public TimeSpan ServiceInitializationTime { get; set; }
        public TimeSpan DatabaseSetupTime { get; set; }
        public TimeSpan AuthSetupTime { get; set; }
        public long MemoryAllocatedDuringSetup { get; set; }
        public int ServicesRegistered { get; set; }
        public int DatabaseTables { get; set; }
        public Dictionary<string, TimeSpan> ComponentTiming { get; set; } = new();
    }

    public class TeardownMetrics
    {
        public TimeSpan TotalTeardownTime { get; set; }
        public TimeSpan FactoryDisposalTime { get; set; }
        public TimeSpan DatabaseCleanupTime { get; set; }
        public long MemoryReleasedDuringTeardown { get; set; }
        public int ObjectsDisposed { get; set; }
        public bool GarbageCollectionTriggered { get; set; }
        public Dictionary<string, TimeSpan> CleanupTiming { get; set; } = new();
    }

    public class BottleneckAnalysis
    {
        public string PrimaryBottleneck { get; set; } = string.Empty;
        public List<string> BottleneckDetails { get; set; } = new();
        public double SetupOverheadPercentage { get; set; }
        public double ExecutionOverheadPercentage { get; set; }
        public double TeardownOverheadPercentage { get; set; }
        public List<string> RecommendedOptimizations { get; set; } = new();
        public double ImpactScore { get; set; } // 0-100, higher = more impactful
    }

    public class PerformanceOptimizationReport
    {
        public DateTime GeneratedAt { get; set; }
        public string AnalysisVersion { get; set; } = string.Empty;
        public int TotalTestsProfiled { get; set; }
        
        public TimingAnalysis TimingAnalysis { get; set; } = new();
        public ResourceAnalysis ResourceAnalysis { get; set; } = new();
        public SystemBottleneckAnalysis BottleneckAnalysis { get; set; } = new();
        public ParallelExecutionAnalysis ParallelExecutionAnalysis { get; set; } = new();
        public List<OptimizationRecommendation> OptimizationRecommendations { get; set; } = new();
        
        public TestCoverageAnalysis CoverageAnalysis { get; set; } = new();
        public PerformanceTrends Trends { get; set; } = new();
    }

    public class TimingAnalysis
    {
        public TimeSpan AverageTestDuration { get; set; }
        public TimeSpan MedianTestDuration { get; set; }
        public List<TestExecutionProfile> SlowestTests { get; set; } = new();
        public List<TestExecutionProfile> FastestTests { get; set; } = new();
        public SetupOverheadAnalysis SetupOverheadAnalysis { get; set; } = new();
        public TeardownOverheadAnalysis TeardownOverheadAnalysis { get; set; } = new();
        public TimeSpan TotalExecutionTime { get; set; }
        public double TestsPerSecond { get; set; }
    }

    public class ResourceAnalysis
    {
        public double AverageMemoryUsage { get; set; }
        public double PeakMemoryUsage { get; set; }
        public double AverageCpuTime { get; set; }
        public double FileSystemUsage { get; set; }
        public double ThreadPoolUtilization { get; set; }
        public double GarbageCollectionPressure { get; set; }
        public List<ResourceHotspot> ResourceHotspots { get; set; } = new();
    }

    public class SystemBottleneckAnalysis
    {
        public string PrimaryBottleneck { get; set; } = string.Empty;
        public List<string> BottleneckContributors { get; set; } = new();
        public string Impact { get; set; } = string.Empty;
        public double BottleneckSeverity { get; set; } // 0-100
        public List<BottleneckCategory> Categories { get; set; } = new();
    }

    public class ParallelExecutionAnalysis
    {
        public double ParallelSafeTestPercentage { get; set; }
        public double EstimatedSpeedupWith2Cores { get; set; }
        public double EstimatedSpeedupWith4Cores { get; set; }
        public string RecommendedParallelism { get; set; } = string.Empty;
        public List<string> ParallelizationBlockers { get; set; } = new();
        public int MaxRecommendedConcurrency { get; set; }
    }

    public class OptimizationRecommendation
    {
        public string Category { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty; // HIGH, MEDIUM, LOW
        public string Description { get; set; } = string.Empty;
        public string ExpectedImprovement { get; set; } = string.Empty;
        public string Implementation { get; set; } = string.Empty;
        public double ConfidenceScore { get; set; } // 0-100
        public List<string> Prerequisites { get; set; } = new();
        public string EstimatedEffort { get; set; } = string.Empty; // HOURS, DAYS, WEEKS
    }

    public class SetupOverheadAnalysis
    {
        public TimeSpan AverageSetupTime { get; set; }
        public double SetupToTotalRatio { get; set; }
        public List<TestExecutionProfile> HighSetupOverheadTests { get; set; } = new();
        public Dictionary<string, TimeSpan> ComponentSetupTimes { get; set; } = new();
        public List<string> OptimizationOpportunities { get; set; } = new();
    }

    public class TeardownOverheadAnalysis
    {
        public TimeSpan AverageTeardownTime { get; set; }
        public double TeardownToTotalRatio { get; set; }
        public List<TestExecutionProfile> HighTeardownOverheadTests { get; set; } = new();
        public Dictionary<string, TimeSpan> ComponentTeardownTimes { get; set; } = new();
        public List<string> OptimizationOpportunities { get; set; } = new();
    }

    public class TestCoverageAnalysis
    {
        public int TotalTestClasses { get; set; }
        public int TotalTestMethods { get; set; }
        public Dictionary<string, int> TestsByCategory { get; set; } = new();
        public List<string> MostTestedComponents { get; set; } = new();
        public List<string> LeastTestedComponents { get; set; } = new();
    }

    public class PerformanceTrends
    {
        public List<DateTime> MeasurementDates { get; set; } = new();
        public List<double> AverageExecutionTimes { get; set; } = new();
        public List<double> MemoryUsageTrends { get; set; } = new();
        public string TrendDirection { get; set; } = string.Empty; // IMPROVING, DEGRADING, STABLE
        public double TrendSlope { get; set; }
    }

    public class ResourceHotspot
    {
        public string TestName { get; set; } = string.Empty;
        public string ResourceType { get; set; } = string.Empty; // MEMORY, CPU, IO
        public double Usage { get; set; }
        public string Unit { get; set; } = string.Empty;
        public double Impact { get; set; } // Relative impact score
    }

    public class BottleneckCategory
    {
        public string Name { get; set; } = string.Empty;
        public double Severity { get; set; }
        public List<string> AffectedTests { get; set; } = new();
        public string Recommendation { get; set; } = string.Empty;
    }

    public class PerformanceCounters
    {
        public int TotalTestsExecuted { get; set; }
        public int TotalTestsProfiled { get; set; }
        public TimeSpan TotalProfilingTime { get; set; }
        public DateTime FirstProfiledTest { get; set; }
        public DateTime LastProfiledTest { get; set; }
        public Dictionary<string, int> TestsByClass { get; set; } = new();
        public Dictionary<string, double> AverageTimesByClass { get; set; } = new();
    }

    /// <summary>
    /// Real-time resource monitoring capabilities
    /// </summary>
    public class ResourceUsageMonitor
    {
        public async Task<ResourceSnapshot> CaptureResourceSnapshot()
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            
            return new ResourceSnapshot
            {
                Timestamp = DateTime.UtcNow,
                MemoryUsage = process.WorkingSet64,
                CpuTime = process.TotalProcessorTime,
                FileHandles = GetFileHandleCount(),
                ThreadCount = process.Threads.Count,
                WorkingSetMemory = process.WorkingSet64,
                GCCollectionCount = GC.CollectionCount(0) + GC.CollectionCount(1) + GC.CollectionCount(2),
                GCTotalMemory = GC.GetTotalMemory(false)
            };
        }

        private int GetFileHandleCount()
        {
            try
            {
                var process = System.Diagnostics.Process.GetCurrentProcess();
                return process.HandleCount;
            }
            catch
            {
                return 0; // Fallback if unable to get handle count
            }
        }
    }

    /// <summary>
    /// Test execution patterns and optimization suggestions
    /// </summary>
    public static class PerformancePatterns
    {
        public static readonly Dictionary<string, string> CommonBottlenecks = new()
        {
            ["HighSetupTime"] = "Consider caching expensive setup operations",
            ["HighMemoryUsage"] = "Review object lifecycle and disposal patterns",
            ["SlowDatabaseOperations"] = "Use in-memory database or mock data access",
            ["ExcessiveFileIO"] = "Mock file system operations or use in-memory alternatives",
            ["LongRunningOperations"] = "Mock external dependencies and async operations"
        };

        public static readonly Dictionary<string, List<string>> OptimizationStrategies = new()
        {
            ["ParallelExecution"] = new()
            {
                "Ensure test isolation and independence",
                "Remove shared static state",
                "Use separate database instances or schemas",
                "Configure xUnit collections appropriately"
            },
            ["ResourcePooling"] = new()
            {
                "Pool WebApplicationFactory instances",
                "Reuse expensive service configurations",
                "Cache authentication tokens and setup",
                "Share read-only test data"
            },
            ["TestChunking"] = new()
            {
                "Break integration tests into focused unit tests",
                "Separate happy path from edge case testing",
                "Group related tests into collections",
                "Use parameterized tests for similar scenarios"
            }
        };
    }
}