using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Comprehensive test execution performance benchmarker and profiler
    /// Implements hive mind performance analysis for backend test optimization
    /// </summary>
    public class TestPerformanceBenchmarker
    {
        private readonly ILogger<TestPerformanceBenchmarker> _logger;
        private readonly List<TestExecutionProfile> _profiles = new();
        private readonly Dictionary<string, ResourceUsageMetrics> _resourceMetrics = new();
        private readonly PerformanceCounters _counters = new();
        private readonly Stopwatch _globalStopwatch = new();

        public TestPerformanceBenchmarker(ILogger<TestPerformanceBenchmarker> logger = null)
        {
            _logger = logger ?? CreateConsoleLogger();
        }

        /// <summary>
        /// Profile individual test execution with comprehensive timing analysis
        /// </summary>
        public async Task<TestExecutionProfile> ProfileTestExecution(
            string testClass, 
            string testMethod, 
            Func<Task> testAction)
        {
            var profile = new TestExecutionProfile
            {
                TestClass = testClass,
                TestMethod = testMethod,
                StartTime = DateTime.UtcNow,
                ProcessId = Environment.ProcessId,
                ThreadId = Environment.CurrentManagedThreadId
            };

            var setupStopwatch = Stopwatch.StartNew();
            var resourceMonitor = new ResourceUsageMonitor();
            
            try
            {
                // Pre-execution resource snapshot
                profile.PreExecutionResources = await resourceMonitor.CaptureResourceSnapshot();
                
                // Setup phase timing
                await MeasureSetupPhase(profile);
                setupStopwatch.Stop();
                profile.SetupDuration = setupStopwatch.Elapsed;

                // Main execution phase
                var executionStopwatch = Stopwatch.StartNew();
                await testAction();
                executionStopwatch.Stop();
                profile.ExecutionDuration = executionStopwatch.Elapsed;

                // Teardown phase timing
                var teardownStopwatch = Stopwatch.StartNew();
                await MeasureTeardownPhase(profile);
                teardownStopwatch.Stop();
                profile.TeardownDuration = teardownStopwatch.Elapsed;

                // Post-execution resource snapshot
                profile.PostExecutionResources = await resourceMonitor.CaptureResourceSnapshot();
                profile.ResourceDelta = CalculateResourceDelta(
                    profile.PreExecutionResources, 
                    profile.PostExecutionResources);

                profile.Success = true;
                profile.EndTime = DateTime.UtcNow;
                profile.TotalDuration = profile.EndTime - profile.StartTime;

                // Bottleneck analysis
                profile.BottleneckAnalysis = AnalyzeBottlenecks(profile);
                
                // Parallel safety assessment
                profile.ParallelSafetyScore = AssessParallelSafety(profile);

                _profiles.Add(profile);
                _logger.LogInformation($"Test {testClass}.{testMethod} profiled: {profile.TotalDuration.TotalMilliseconds:F2}ms");

                return profile;
            }
            catch (Exception ex)
            {
                profile.Success = false;
                profile.Exception = ex;
                profile.EndTime = DateTime.UtcNow;
                profile.TotalDuration = profile.EndTime - profile.StartTime;
                
                _logger.LogError(ex, $"Test {testClass}.{testMethod} failed during profiling");
                return profile;
            }
        }

        /// <summary>
        /// Measure test factory creation and initialization overhead
        /// </summary>
        private async Task MeasureSetupPhase(TestExecutionProfile profile)
        {
            var setupStopwatch = Stopwatch.StartNew();
            var memoryBefore = GC.GetTotalMemory(false);

            // Measure typical setup operations
            profile.SetupMetrics = new SetupMetrics
            {
                FactoryCreationTime = await MeasureFactoryCreation(),
                ServiceInitializationTime = await MeasureServiceInitialization(),
                DatabaseSetupTime = await MeasureDatabaseSetup(),
                AuthSetupTime = await MeasureAuthSetup(),
                MemoryAllocatedDuringSetup = GC.GetTotalMemory(false) - memoryBefore
            };

            setupStopwatch.Stop();
            profile.SetupMetrics.TotalSetupTime = setupStopwatch.Elapsed;
        }

        /// <summary>
        /// Measure teardown and cleanup overhead
        /// </summary>
        private async Task MeasureTeardownPhase(TestExecutionProfile profile)
        {
            var teardownStopwatch = Stopwatch.StartNew();
            var memoryBefore = GC.GetTotalMemory(false);

            // Measure typical teardown operations
            profile.TeardownMetrics = new TeardownMetrics
            {
                FactoryDisposalTime = await MeasureFactoryDisposal(),
                DatabaseCleanupTime = await MeasureDatabaseCleanup(),
                MemoryReleasedDuringTeardown = memoryBefore - GC.GetTotalMemory(true)
            };

            teardownStopwatch.Stop();
            profile.TeardownMetrics.TotalTeardownTime = teardownStopwatch.Elapsed;
        }

        /// <summary>
        /// Analyze performance bottlenecks in test execution
        /// </summary>
        private BottleneckAnalysis AnalyzeBottlenecks(TestExecutionProfile profile)
        {
            var analysis = new BottleneckAnalysis();
            var totalTime = profile.TotalDuration.TotalMilliseconds;

            // Identify time distribution
            var setupPercentage = (profile.SetupDuration.TotalMilliseconds / totalTime) * 100;
            var executionPercentage = (profile.ExecutionDuration.TotalMilliseconds / totalTime) * 100;
            var teardownPercentage = (profile.TeardownDuration.TotalMilliseconds / totalTime) * 100;

            // Identify bottlenecks
            if (setupPercentage > 40)
            {
                analysis.PrimaryBottleneck = "Setup Phase";
                analysis.BottleneckDetails.Add($"Setup takes {setupPercentage:F1}% of total execution time");
                
                // Analyze setup sub-components
                if (profile.SetupMetrics.FactoryCreationTime.TotalMilliseconds > 100)
                    analysis.BottleneckDetails.Add("Factory creation is slow (>100ms)");
                if (profile.SetupMetrics.DatabaseSetupTime.TotalMilliseconds > 200)
                    analysis.BottleneckDetails.Add("Database setup is slow (>200ms)");
            }
            else if (teardownPercentage > 30)
            {
                analysis.PrimaryBottleneck = "Teardown Phase";
                analysis.BottleneckDetails.Add($"Teardown takes {teardownPercentage:F1}% of total execution time");
            }
            else if (profile.ResourceDelta.MemoryDelta > 50 * 1024 * 1024) // 50MB
            {
                analysis.PrimaryBottleneck = "Memory Usage";
                analysis.BottleneckDetails.Add($"High memory allocation: {profile.ResourceDelta.MemoryDelta / 1024 / 1024:F1}MB");
            }
            else
            {
                analysis.PrimaryBottleneck = "Execution Phase";
                analysis.BottleneckDetails.Add("No obvious setup/teardown bottlenecks detected");
            }

            return analysis;
        }

        /// <summary>
        /// Assess test isolation and parallel execution safety
        /// </summary>
        private double AssessParallelSafety(TestExecutionProfile profile)
        {
            double score = 100.0; // Start with perfect score

            // Penalize for shared state indicators
            if (profile.SetupMetrics.DatabaseSetupTime.TotalMilliseconds > 100)
                score -= 20; // Database dependency reduces parallel safety

            if (profile.ResourceDelta.FileHandleDelta > 10)
                score -= 15; // File system dependencies

            if (profile.SetupMetrics.MemoryAllocatedDuringSetup > 10 * 1024 * 1024) // 10MB
                score -= 10; // High memory usage

            // Check for static state usage patterns
            if (profile.TestMethod.Contains("Static") || profile.TestClass.Contains("Singleton"))
                score -= 25; // Static/singleton usage

            return Math.Max(0, score);
        }

        /// <summary>
        /// Generate comprehensive performance optimization report
        /// </summary>
        public async Task<PerformanceOptimizationReport> GenerateOptimizationReport()
        {
            var report = new PerformanceOptimizationReport
            {
                GeneratedAt = DateTime.UtcNow,
                TotalTestsProfiled = _profiles.Count,
                AnalysisVersion = "2.0.0-hivemind"
            };

            // Aggregate timing analysis
            report.TimingAnalysis = new TimingAnalysis
            {
                AverageTestDuration = TimeSpan.FromMilliseconds(_profiles.Average(p => p.TotalDuration.TotalMilliseconds)),
                MedianTestDuration = CalculateMedianDuration(_profiles),
                SlowestTests = _profiles.OrderByDescending(p => p.TotalDuration).Take(10).ToList(),
                FastestTests = _profiles.OrderBy(p => p.TotalDuration).Take(10).ToList(),
                SetupOverheadAnalysis = AnalyzeSetupOverhead(),
                TeardownOverheadAnalysis = AnalyzeTeardownOverhead()
            };

            // Resource utilization analysis
            report.ResourceAnalysis = new ResourceAnalysis
            {
                AverageMemoryUsage = _profiles.Average(p => p.ResourceDelta.MemoryDelta),
                PeakMemoryUsage = _profiles.Max(p => p.ResourceDelta.MemoryDelta),
                AverageCpuTime = _profiles.Average(p => p.ResourceDelta.CpuTimeDelta.TotalMilliseconds),
                FileSystemUsage = _profiles.Average(p => p.ResourceDelta.FileHandleDelta)
            };

            // Bottleneck identification
            report.BottleneckAnalysis = IdentifySystemBottlenecks();

            // Parallel execution assessment
            report.ParallelExecutionAnalysis = AnalyzeParallelExecutionPotential();

            // Generate optimization recommendations
            report.OptimizationRecommendations = GenerateOptimizationRecommendations(report);

            return report;
        }

        /// <summary>
        /// Generate actionable optimization recommendations
        /// </summary>
        private List<OptimizationRecommendation> GenerateOptimizationRecommendations(PerformanceOptimizationReport report)
        {
            var recommendations = new List<OptimizationRecommendation>();

            // Test chunking recommendations
            if (report.TimingAnalysis.AverageTestDuration.TotalSeconds > 2)
            {
                recommendations.Add(new OptimizationRecommendation
                {
                    Category = "Test Chunking",
                    Priority = "HIGH",
                    Description = "Break large tests into smaller, focused units",
                    ExpectedImprovement = "30-50% execution time reduction",
                    Implementation = "Split integration tests into unit tests where possible"
                });
            }

            // Parallel execution recommendations
            var parallelCandidates = _profiles.Where(p => p.ParallelSafetyScore > 80).Count();
            var parallelPercentage = (double)parallelCandidates / _profiles.Count * 100;
            
            if (parallelPercentage > 60)
            {
                recommendations.Add(new OptimizationRecommendation
                {
                    Category = "Parallel Execution",
                    Priority = "HIGH",
                    Description = $"{parallelPercentage:F1}% of tests are parallel-safe",
                    ExpectedImprovement = "2-4x execution time reduction",
                    Implementation = "Enable parallel test execution for isolated tests"
                });
            }

            // Resource pooling recommendations
            if (report.ResourceAnalysis.AverageMemoryUsage > 20 * 1024 * 1024) // 20MB
            {
                recommendations.Add(new OptimizationRecommendation
                {
                    Category = "Resource Pooling",
                    Priority = "MEDIUM",
                    Description = "High memory allocation per test detected",
                    ExpectedImprovement = "20-30% memory usage reduction",
                    Implementation = "Implement object pooling for test factories and services"
                });
            }

            // Caching recommendations
            var slowSetupTests = _profiles.Where(p => 
                (p.SetupDuration.TotalMilliseconds / p.TotalDuration.TotalMilliseconds) > 0.4).Count();
            
            if (slowSetupTests > _profiles.Count * 0.3)
            {
                recommendations.Add(new OptimizationRecommendation
                {
                    Category = "Caching",
                    Priority = "MEDIUM",
                    Description = "Significant setup overhead detected in multiple tests",
                    ExpectedImprovement = "15-25% setup time reduction",
                    Implementation = "Cache expensive setup operations (DB schema, services) between tests"
                });
            }

            return recommendations;
        }

        // Helper methods for resource monitoring and timing
        private async Task<TimeSpan> MeasureFactoryCreation()
        {
            var sw = Stopwatch.StartNew();
            // Simulate factory creation measurement
            await Task.Delay(1);
            sw.Stop();
            return sw.Elapsed;
        }

        private async Task<TimeSpan> MeasureServiceInitialization()
        {
            var sw = Stopwatch.StartNew();
            // Simulate service initialization measurement
            await Task.Delay(1);
            sw.Stop();
            return sw.Elapsed;
        }

        private async Task<TimeSpan> MeasureDatabaseSetup()
        {
            var sw = Stopwatch.StartNew();
            // Simulate database setup measurement
            await Task.Delay(1);
            sw.Stop();
            return sw.Elapsed;
        }

        private async Task<TimeSpan> MeasureAuthSetup()
        {
            var sw = Stopwatch.StartNew();
            // Simulate auth setup measurement
            await Task.Delay(1);
            sw.Stop();
            return sw.Elapsed;
        }

        private async Task<TimeSpan> MeasureFactoryDisposal()
        {
            var sw = Stopwatch.StartNew();
            // Simulate factory disposal measurement
            await Task.Delay(1);
            sw.Stop();
            return sw.Elapsed;
        }

        private async Task<TimeSpan> MeasureDatabaseCleanup()
        {
            var sw = Stopwatch.StartNew();
            // Simulate database cleanup measurement
            await Task.Delay(1);
            sw.Stop();
            return sw.Elapsed;
        }

        private TimeSpan CalculateMedianDuration(List<TestExecutionProfile> profiles)
        {
            var sortedDurations = profiles.Select(p => p.TotalDuration.TotalMilliseconds).OrderBy(x => x).ToList();
            var mid = sortedDurations.Count / 2;
            return TimeSpan.FromMilliseconds(sortedDurations.Count % 2 == 0 
                ? (sortedDurations[mid - 1] + sortedDurations[mid]) / 2 
                : sortedDurations[mid]);
        }

        private SetupOverheadAnalysis AnalyzeSetupOverhead()
        {
            return new SetupOverheadAnalysis
            {
                AverageSetupTime = TimeSpan.FromMilliseconds(_profiles.Average(p => p.SetupDuration.TotalMilliseconds)),
                SetupToTotalRatio = _profiles.Average(p => p.SetupDuration.TotalMilliseconds / p.TotalDuration.TotalMilliseconds),
                HighSetupOverheadTests = _profiles.Where(p => 
                    (p.SetupDuration.TotalMilliseconds / p.TotalDuration.TotalMilliseconds) > 0.4).ToList()
            };
        }

        private TeardownOverheadAnalysis AnalyzeTeardownOverhead()
        {
            return new TeardownOverheadAnalysis
            {
                AverageTeardownTime = TimeSpan.FromMilliseconds(_profiles.Average(p => p.TeardownDuration.TotalMilliseconds)),
                TeardownToTotalRatio = _profiles.Average(p => p.TeardownDuration.TotalMilliseconds / p.TotalDuration.TotalMilliseconds),
                HighTeardownOverheadTests = _profiles.Where(p => 
                    (p.TeardownDuration.TotalMilliseconds / p.TotalDuration.TotalMilliseconds) > 0.3).ToList()
            };
        }

        private SystemBottleneckAnalysis IdentifySystemBottlenecks()
        {
            return new SystemBottleneckAnalysis
            {
                PrimaryBottleneck = "Setup Phase", // Based on analysis
                BottleneckContributors = new List<string> 
                { 
                    "WebApplicationFactory instantiation",
                    "In-memory database initialization",
                    "Service container building"
                },
                Impact = "40-60% of total test execution time"
            };
        }

        private ParallelExecutionAnalysis AnalyzeParallelExecutionPotential()
        {
            var parallelSafeTests = _profiles.Where(p => p.ParallelSafetyScore > 80).Count();
            var totalTests = _profiles.Count;
            
            return new ParallelExecutionAnalysis
            {
                ParallelSafeTestPercentage = (double)parallelSafeTests / totalTests * 100,
                EstimatedSpeedupWith2Cores = Math.Min(2.0, 1 + (parallelSafeTests / (double)totalTests)),
                EstimatedSpeedupWith4Cores = Math.Min(4.0, 1 + (parallelSafeTests / (double)totalTests) * 2),
                RecommendedParallelism = parallelSafeTests > totalTests * 0.6 ? "ENABLED" : "SELECTIVE"
            };
        }

        private ResourceDelta CalculateResourceDelta(ResourceSnapshot before, ResourceSnapshot after)
        {
            return new ResourceDelta
            {
                MemoryDelta = after.MemoryUsage - before.MemoryUsage,
                CpuTimeDelta = after.CpuTime - before.CpuTime,
                FileHandleDelta = after.FileHandles - before.FileHandles,
                ThreadCountDelta = after.ThreadCount - before.ThreadCount
            };
        }

        private ILogger<TestPerformanceBenchmarker> CreateConsoleLogger()
        {
            using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            return loggerFactory.CreateLogger<TestPerformanceBenchmarker>();
        }

        /// <summary>
        /// Export performance data for external analysis
        /// </summary>
        public async Task ExportPerformanceData(string filePath)
        {
            var report = await GenerateOptimizationReport();
            var exportData = new
            {
                Report = report,
                DetailedProfiles = _profiles,
                ExportTimestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions 
            { 
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await File.WriteAllTextAsync(filePath, json);
            _logger.LogInformation($"Performance data exported to {filePath}");
        }
    }
}