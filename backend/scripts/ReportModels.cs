using System;
using System.Collections.Generic;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Data models for comprehensive performance optimization reports
    /// </summary>

    public class ComprehensivePerformanceReport
    {
        public string Title { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
        public string ReportVersion { get; set; } = string.Empty;
        public string AnalysisScope { get; set; } = string.Empty;
        public Exception? Exception { get; set; }
        
        public ExecutiveSummary ExecutiveSummary { get; set; } = new();
        public DetailedPerformanceAnalysis PerformanceAnalysis { get; set; } = new();
        public ResourceUtilizationAnalysis ResourceAnalysis { get; set; } = new();
        public ParallelExecutionAnalysisReport ParallelExecutionAnalysis { get; set; } = new();
        public BottleneckAnalysisReport BottleneckAnalysis { get; set; } = new();
        public OptimizationRecommendationsReport OptimizationRecommendations { get; set; } = new();
        public ImplementationRoadmap ImplementationRoadmap { get; set; } = new();
        public TestChunkingStrategy TestChunkingStrategy { get; set; } = new();
        public ResourcePoolingRecommendations ResourcePoolingRecommendations { get; set; } = new();
        public CachingOptimizationStrategy CachingOptimizationStrategy { get; set; } = new();
        public ParallelConfigurationRecommendations ParallelConfigurationRecommendations { get; set; } = new();
        public PerformanceMonitoringStrategy MonitoringStrategy { get; set; } = new();
        public RiskAssessment RiskAssessment { get; set; } = new();
        public SuccessMetrics SuccessMetrics { get; set; } = new();
    }

    public class ExecutiveSummary
    {
        public PerformanceBaseline CurrentPerformanceBaseline { get; set; } = new();
        public List<string> KeyFindings { get; set; } = new();
        public List<string> CriticalRecommendations { get; set; } = new();
        public ImpactEstimation EstimatedImpact { get; set; } = new();
        public ImplementationPriority ImplementationPriority { get; set; } = new();
    }

    public class PerformanceBaseline
    {
        public TimeSpan AverageTestExecutionTime { get; set; }
        public TimeSpan TotalTestSuiteTime { get; set; }
        public TimeSpan AverageSetupTime { get; set; }
        public TimeSpan AverageTeardownTime { get; set; }
        public double ParallelExecutionCapability { get; set; }
        public double ResourceUtilizationEfficiency { get; set; }
    }

    public class ImpactEstimation
    {
        public string SpeedImprovement { get; set; } = string.Empty;
        public string ResourceEfficiency { get; set; } = string.Empty;
        public string DeveloperProductivity { get; set; } = string.Empty;
        public string CostSavings { get; set; } = string.Empty;
        public string QualityImprovement { get; set; } = string.Empty;
    }

    public class ImplementationPriority
    {
        public List<string> Phase1_Critical { get; set; } = new();
        public List<string> Phase2_Important { get; set; } = new();
        public List<string> Phase3_Beneficial { get; set; } = new();
    }

    public class DetailedPerformanceAnalysis
    {
        public TestExecutionMetrics TestExecutionMetrics { get; set; } = new();
        public SetupTeardownMetrics SetupTeardownAnalysis { get; set; } = new();
        public FactoryPerformanceAnalysis FactoryPerformanceAnalysis { get; set; } = new();
        public DatabaseOperationAnalysis DatabaseOperationAnalysis { get; set; } = new();
        public ServiceInitializationAnalysisReport ServiceInitializationAnalysis { get; set; } = new();
    }

    public class TestExecutionMetrics
    {
        public int TotalTests { get; set; }
        public TimeSpan AverageExecutionTime { get; set; }
        public TimeSpan MedianExecutionTime { get; set; }
        public List<string> SlowestTests { get; set; } = new();
        public List<string> FastestTests { get; set; } = new();
        public double ExecutionTimeVariability { get; set; }
        public List<TestPerformanceCategory> PerformanceCategories { get; set; } = new();
    }

    public class TestPerformanceCategory
    {
        public string CategoryName { get; set; } = string.Empty;
        public int TestCount { get; set; }
        public TimeSpan AverageExecutionTime { get; set; }
        public string PerformanceCharacteristic { get; set; } = string.Empty;
    }

    public class SetupTeardownMetrics
    {
        public TimeSpan AverageSetupTime { get; set; }
        public TimeSpan AverageTeardownTime { get; set; }
        public double SetupOverheadPercentage { get; set; }
        public double TeardownOverheadPercentage { get; set; }
        public List<string> SetupBottlenecks { get; set; } = new();
        public List<string> TeardownBottlenecks { get; set; } = new();
    }

    public class ResourceUtilizationAnalysis
    {
        public CpuUtilizationPatterns CpuUtilizationPatterns { get; set; } = new();
        public MemoryUsagePatterns MemoryUsagePatterns { get; set; } = new();
        public IoPerformancePatterns IoPerformancePatterns { get; set; } = new();
        public NetworkUtilizationPatterns NetworkUtilizationPatterns { get; set; } = new();
        public List<ResourceBottleneck> ResourceBottlenecks { get; set; } = new();
        public List<string> OptimizationOpportunities { get; set; } = new();
    }

    public class CpuUtilizationPatterns
    {
        public double AverageCpuUsage { get; set; }
        public double PeakCpuUsage { get; set; }
        public List<CpuSpike> CpuSpikes { get; set; } = new();
        public string UsagePattern { get; set; } = string.Empty;
    }

    public class MemoryUsagePatterns
    {
        public long AverageMemoryUsage { get; set; }
        public long PeakMemoryUsage { get; set; }
        public double MemoryGrowthRate { get; set; }
        public bool HasMemoryLeaks { get; set; }
        public double GarbageCollectionPressure { get; set; }
    }

    public class IoPerformancePatterns
    {
        public double AverageIoOperationsPerSecond { get; set; }
        public long TotalBytesRead { get; set; }
        public long TotalBytesWritten { get; set; }
        public double IoWaitTime { get; set; }
    }

    public class NetworkUtilizationPatterns
    {
        public long TotalNetworkTraffic { get; set; }
        public double AverageLatency { get; set; }
        public int ConnectionCount { get; set; }
        public double Throughput { get; set; }
    }

    public class ParallelExecutionAnalysisReport
    {
        public ParallelExecutionReport SafetyAssessment { get; set; } = new();
        public ParallelizationPotential ParallelizationPotential { get; set; } = new();
        public TestIsolationAnalysisReport TestIsolationAnalysis { get; set; } = new();
        public List<string> SharedResourceConflicts { get; set; } = new();
        public ParallelConfiguration RecommendedParallelConfiguration { get; set; } = new();
    }

    public class ParallelizationPotential
    {
        public double OverallParallelizationScore { get; set; }
        public int SafeForParallelCount { get; set; }
        public int RequiresModificationCount { get; set; }
        public int UnsafeForParallelCount { get; set; }
        public double EstimatedSpeedupWith2Cores { get; set; }
        public double EstimatedSpeedupWith4Cores { get; set; }
    }

    public class TestIsolationAnalysisReport
    {
        public int TotalTestsAnalyzed { get; set; }
        public int FullyIsolatedTests { get; set; }
        public int PartiallyIsolatedTests { get; set; }
        public int NonIsolatedTests { get; set; }
        public List<string> CommonIsolationIssues { get; set; } = new();
    }

    public class ParallelConfiguration
    {
        public bool EnableParallelExecution { get; set; }
        public int RecommendedMaxParallelism { get; set; }
        public List<string> ParallelSafeCollections { get; set; } = new();
        public List<string> SerialOnlyCollections { get; set; } = new();
        public Dictionary<string, string> XUnitConfiguration { get; set; } = new();
    }

    public class BottleneckAnalysisReport
    {
        public List<Bottleneck> PrimaryBottlenecks { get; set; } = new();
        public List<Bottleneck> SecondaryBottlenecks { get; set; } = new();
        public BottleneckImpactAnalysis BottleneckImpactAnalysis { get; set; } = new();
        public List<string> ResolutionStrategies { get; set; } = new();
    }

    public class Bottleneck
    {
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double ImpactScore { get; set; }
        public string Severity { get; set; } = string.Empty;
        public List<string> AffectedTests { get; set; } = new();
        public string RecommendedResolution { get; set; } = string.Empty;
    }

    public class BottleneckImpactAnalysis
    {
        public double TotalPerformanceImpact { get; set; }
        public Dictionary<string, double> BottleneckContributions { get; set; } = new();
        public string PrimaryBottleneckCategory { get; set; } = string.Empty;
    }

    public class OptimizationRecommendationsReport
    {
        public List<OptimizationRecommendation> HighPriorityRecommendations { get; set; } = new();
        public List<OptimizationRecommendation> MediumPriorityRecommendations { get; set; } = new();
        public List<OptimizationRecommendation> LowPriorityRecommendations { get; set; } = new();
        public List<string> QuickWins { get; set; } = new();
        public List<string> LongTermImprovements { get; set; } = new();
    }

    public class ImplementationRoadmap
    {
        public RoadmapPhase Phase1_QuickWins { get; set; } = new();
        public RoadmapPhase Phase2_MediumTermImprovements { get; set; } = new();
        public RoadmapPhase Phase3_LongTermOptimizations { get; set; } = new();
        public ImplementationTimeline Timeline { get; set; } = new();
        public ResourceRequirements ResourceRequirements { get; set; } = new();
        public List<string> RiskMitigation { get; set; } = new();
    }

    public class RoadmapPhase
    {
        public string PhaseName { get; set; } = string.Empty;
        public TimeSpan EstimatedDuration { get; set; }
        public List<string> Objectives { get; set; } = new();
        public List<string> Deliverables { get; set; } = new();
        public List<string> Prerequisites { get; set; } = new();
        public double ExpectedImpact { get; set; }
    }

    public class ImplementationTimeline
    {
        public DateTime StartDate { get; set; }
        public DateTime Phase1Completion { get; set; }
        public DateTime Phase2Completion { get; set; }
        public DateTime Phase3Completion { get; set; }
        public List<Milestone> Milestones { get; set; } = new();
    }

    public class Milestone
    {
        public string Name { get; set; } = string.Empty;
        public DateTime TargetDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public List<string> SuccessCriteria { get; set; } = new();
    }

    public class ResourceRequirements
    {
        public int DeveloperDays { get; set; }
        public string SkillsRequired { get; set; } = string.Empty;
        public List<string> ToolsRequired { get; set; } = new();
        public string InfrastructureChanges { get; set; } = string.Empty;
    }

    public class TestChunkingStrategy
    {
        public List<TestChunk> RecommendedChunks { get; set; } = new();
        public string ChunkingCriteria { get; set; } = string.Empty;
        public double EstimatedImprovement { get; set; }
    }

    public class TestChunk
    {
        public string ChunkName { get; set; } = string.Empty;
        public List<string> IncludedTests { get; set; } = new();
        public string ChunkCharacteristics { get; set; } = string.Empty;
        public bool ParallelSafe { get; set; }
    }

    public class ResourcePoolingRecommendations
    {
        public List<PoolingStrategy> PoolingStrategies { get; set; } = new();
        public double EstimatedResourceSavings { get; set; }
        public string ImplementationComplexity { get; set; } = string.Empty;
    }

    public class PoolingStrategy
    {
        public string ResourceType { get; set; } = string.Empty;
        public string PoolingApproach { get; set; } = string.Empty;
        public string Benefits { get; set; } = string.Empty;
        public string ImplementationDetails { get; set; } = string.Empty;
    }

    public class CachingOptimizationStrategy
    {
        public List<CachingOpportunity> CachingOpportunities { get; set; } = new();
        public double EstimatedPerformanceGain { get; set; }
        public string RecommendedCachingFramework { get; set; } = string.Empty;
    }

    public class CachingOpportunity
    {
        public string CacheTarget { get; set; } = string.Empty;
        public string CacheType { get; set; } = string.Empty;
        public TimeSpan RecommendedTTL { get; set; }
        public string ExpectedBenefit { get; set; } = string.Empty;
    }

    public class ParallelConfigurationRecommendations
    {
        public XUnitConfiguration XUnitSettings { get; set; } = new();
        public List<string> TestCollectionStrategy { get; set; } = new();
        public string ResourceIsolationStrategy { get; set; } = string.Empty;
    }

    public class XUnitConfiguration
    {
        public bool ParallelizeTestCollections { get; set; }
        public bool ParallelizeAssembly { get; set; }
        public int MaxParallelThreads { get; set; }
        public Dictionary<string, string> AdditionalSettings { get; set; } = new();
    }

    public class PerformanceMonitoringStrategy
    {
        public List<string> KeyMetrics { get; set; } = new();
        public string MonitoringFramework { get; set; } = string.Empty;
        public List<AlertThreshold> AlertThresholds { get; set; } = new();
        public string ReportingStrategy { get; set; } = string.Empty;
    }

    public class AlertThreshold
    {
        public string MetricName { get; set; } = string.Empty;
        public double ThresholdValue { get; set; }
        public string AlertLevel { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
    }

    public class RiskAssessment
    {
        public List<PerformanceRisk> IdentifiedRisks { get; set; } = new();
        public string OverallRiskLevel { get; set; } = string.Empty;
        public List<string> MitigationStrategies { get; set; } = new();
    }

    public class PerformanceRisk
    {
        public string RiskType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Probability { get; set; } = string.Empty;
        public string Impact { get; set; } = string.Empty;
        public string MitigationPlan { get; set; } = string.Empty;
    }

    public class SuccessMetrics
    {
        public List<KPI> KeyPerformanceIndicators { get; set; } = new();
        public Dictionary<string, string> BaselineMetrics { get; set; } = new();
        public Dictionary<string, string> TargetMetrics { get; set; } = new();
        public string MeasurementStrategy { get; set; } = string.Empty;
    }

    public class KPI
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CurrentValue { get; set; } = string.Empty;
        public string TargetValue { get; set; } = string.Empty;
        public string MeasurementMethod { get; set; } = string.Empty;
    }

    // Additional specialized analysis models
    public class FactoryPerformanceAnalysis
    {
        public List<TestFactoryMetrics> FactoryMetrics { get; set; } = new();
        public double AverageCreationTime { get; set; }
        public double AverageDisposalTime { get; set; }
        public List<string> OptimizationOpportunities { get; set; } = new();
    }

    public class DatabaseOperationAnalysis
    {
        public DatabasePerformanceReport PerformanceReport { get; set; } = new();
        public List<string> SlowOperations { get; set; } = new();
        public double AverageOperationTime { get; set; }
        public List<string> OptimizationRecommendations { get; set; } = new();
    }

    public class ServiceInitializationAnalysisReport
    {
        public ServiceInitializationReport InitializationReport { get; set; } = new();
        public List<string> SlowServices { get; set; } = new();
        public double TotalInitializationOverhead { get; set; }
        public List<string> OptimizationStrategies { get; set; } = new();
    }
}