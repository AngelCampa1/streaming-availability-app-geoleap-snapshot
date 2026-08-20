using System;
using System.Collections.Generic;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Data models for parallel execution safety assessment
    /// </summary>

    public class TestSafetyProfile
    {
        public string TestClass { get; set; } = string.Empty;
        public string TestMethod { get; set; } = string.Empty;
        public string FullTestName { get; set; } = string.Empty;
        public DateTime AssessmentTime { get; set; }
        public double SafetyScore { get; set; }
        public ParallelExecutionPotential ParallelExecutionPotential { get; set; }
        public Exception? Exception { get; set; }
        
        public TestIsolationAnalysis IsolationAnalysis { get; set; } = new();
        public ThreadSafetyAnalysis ThreadSafetyAnalysis { get; set; } = new();
        public SharedResourceAnalysis SharedResourceAnalysis { get; set; } = new();
        public TestDependencyAnalysis DependencyAnalysis { get; set; } = new();
        public StaticStateAnalysis StaticStateAnalysis { get; set; } = new();
        public List<string> ParallelizationRecommendations { get; set; } = new();
    }

    public class TestIsolationAnalysis
    {
        public double IsolationScore { get; set; }
        public bool HasSetup { get; set; }
        public bool HasTeardown { get; set; }
        public bool RequiresIsolation { get; set; }
        public bool UsesDatabase { get; set; }
        public bool UsesFileSystem { get; set; }
        public bool UsesNetwork { get; set; }
        public bool UsesStaticState { get; set; }
        public bool UsesWebApplicationFactory { get; set; }
        public List<string> IsolationBlockers { get; set; } = new();
        public List<string> IsolationRecommendations { get; set; } = new();
    }

    public class ThreadSafetyAnalysis
    {
        public double ThreadSafetyScore { get; set; }
        public bool IsAsync { get; set; }
        public bool UsesConcurrentCollections { get; set; }
        public bool UsesLocking { get; set; }
        public bool UsesThreadUnsafeCollections { get; set; }
        public bool HasRaceConditionRisk { get; set; }
        public bool HasVolatileFields { get; set; }
        public bool HasThreadStaticFields { get; set; }
        public List<string> ThreadSafetyIssues { get; set; } = new();
        public List<string> ThreadSafetyRecommendations { get; set; } = new();
    }

    public class SharedResourceAnalysis
    {
        public double SharedResourceRisk { get; set; }
        public List<string> DatabaseResources { get; set; } = new();
        public List<string> FileSystemResources { get; set; } = new();
        public List<string> NetworkResources { get; set; } = new();
        public List<string> EnvironmentVariables { get; set; } = new();
        public List<string> GlobalStateAccess { get; set; } = new();
        public List<string> SharedResourceConflicts { get; set; } = new();
    }

    public class TestDependencyAnalysis
    {
        public List<string> ConstructorDependencies { get; set; } = new();
        public List<string> MethodDependencies { get; set; } = new();
        public bool HasSingletonDependencies { get; set; }
        public bool HasExternalDependencies { get; set; }
        public List<string> DependencyConflicts { get; set; } = new();
        public double DependencyComplexity { get; set; }
    }

    public class StaticStateAnalysis
    {
        public double StaticStateRisk { get; set; }
        public List<string> StaticFields { get; set; } = new();
        public List<string> StaticProperties { get; set; } = new();
        public List<string> StaticMethodCalls { get; set; } = new();
        public List<string> SingletonUsage { get; set; } = new();
        public List<string> StaticStateModifications { get; set; } = new();
    }

    public class ParallelExecutionReport
    {
        public DateTime GeneratedAt { get; set; }
        public int TotalTestsAssessed { get; set; }
        public double AverageSafetyScore { get; set; }
        
        public List<TestSafetyProfile> SafeForParallel { get; set; } = new();
        public List<TestSafetyProfile> ConditionallyParallel { get; set; } = new();
        public List<TestSafetyProfile> UnsafeForParallel { get; set; } = new();
        
        public double SafeForParallelPercentage { get; set; }
        public double ConditionallyParallelPercentage { get; set; }
        public double UnsafeForParallelPercentage { get; set; }
        
        public List<string> CommonIssues { get; set; } = new();
        public List<string> OptimizationRecommendations { get; set; } = new();
        public double EstimatedPerformanceImprovement { get; set; }
        
        public ParallelExecutionConfiguration RecommendedConfiguration { get; set; } = new();
    }

    public class ParallelExecutionConfiguration
    {
        public bool EnableParallelExecution { get; set; }
        public int MaxDegreeOfParallelism { get; set; }
        public List<string> ParallelCollections { get; set; } = new();
        public List<string> SerialCollections { get; set; } = new();
        public Dictionary<string, string> TestClassSettings { get; set; } = new();
    }

    public enum ParallelExecutionPotential
    {
        Unsafe = 0,
        NotRecommended = 1,
        ConditionallyRecommended = 2,
        Recommended = 3,
        HighlyRecommended = 4
    }

    /// <summary>
    /// Static state analyzer for detecting parallel execution blockers
    /// </summary>
    public class StaticStateAnalyzer
    {
        public StaticStateReport AnalyzeStaticState(Type testClass)
        {
            var report = new StaticStateReport
            {
                ClassName = testClass.Name,
                AnalysisTime = DateTime.UtcNow
            };

            // Analyze static fields
            var staticFields = testClass.GetFields(System.Reflection.BindingFlags.Static | 
                                                  System.Reflection.BindingFlags.Public | 
                                                  System.Reflection.BindingFlags.NonPublic);
            
            foreach (var field in staticFields)
            {
                report.StaticFields.Add(new StaticFieldInfo
                {
                    Name = field.Name,
                    Type = field.FieldType.Name,
                    IsReadOnly = field.IsInitOnly,
                    IsVolatile = field.IsVolatile,
                    RiskLevel = CalculateFieldRiskLevel(field)
                });
            }

            // Analyze static properties
            var staticProperties = testClass.GetProperties(System.Reflection.BindingFlags.Static | 
                                                          System.Reflection.BindingFlags.Public | 
                                                          System.Reflection.BindingFlags.NonPublic);
            
            foreach (var property in staticProperties)
            {
                report.StaticProperties.Add(new StaticPropertyInfo
                {
                    Name = property.Name,
                    Type = property.PropertyType.Name,
                    HasSetter = property.CanWrite,
                    HasGetter = property.CanRead,
                    RiskLevel = CalculatePropertyRiskLevel(property)
                });
            }

            // Calculate overall risk
            report.OverallRisk = CalculateOverallStaticStateRisk(report);
            
            return report;
        }

        private RiskLevel CalculateFieldRiskLevel(System.Reflection.FieldInfo field)
        {
            if (field.IsInitOnly) return RiskLevel.Low;
            if (field.IsVolatile) return RiskLevel.Medium;
            if (field.FieldType.IsValueType) return RiskLevel.Medium;
            return RiskLevel.High;
        }

        private RiskLevel CalculatePropertyRiskLevel(System.Reflection.PropertyInfo property)
        {
            if (!property.CanWrite) return RiskLevel.Low;
            if (property.PropertyType.IsValueType) return RiskLevel.Medium;
            return RiskLevel.High;
        }

        private RiskLevel CalculateOverallStaticStateRisk(StaticStateReport report)
        {
            var highRiskCount = report.StaticFields.Count(f => f.RiskLevel == RiskLevel.High) +
                               report.StaticProperties.Count(p => p.RiskLevel == RiskLevel.High);
            
            var mediumRiskCount = report.StaticFields.Count(f => f.RiskLevel == RiskLevel.Medium) +
                                 report.StaticProperties.Count(p => p.RiskLevel == RiskLevel.Medium);

            if (highRiskCount > 0) return RiskLevel.High;
            if (mediumRiskCount > 2) return RiskLevel.Medium;
            return RiskLevel.Low;
        }
    }

    public class StaticStateReport
    {
        public string ClassName { get; set; } = string.Empty;
        public DateTime AnalysisTime { get; set; }
        public List<StaticFieldInfo> StaticFields { get; set; } = new();
        public List<StaticPropertyInfo> StaticProperties { get; set; } = new();
        public RiskLevel OverallRisk { get; set; }
        public List<string> Recommendations { get; set; } = new();
    }

    public class StaticFieldInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool IsReadOnly { get; set; }
        public bool IsVolatile { get; set; }
        public RiskLevel RiskLevel { get; set; }
    }

    public class StaticPropertyInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool HasSetter { get; set; }
        public bool HasGetter { get; set; }
        public RiskLevel RiskLevel { get; set; }
    }

    public enum RiskLevel
    {
        Low = 0,
        Medium = 1,
        High = 2,
        Critical = 3
    }

    /// <summary>
    /// Dependency analyzer for identifying parallel execution conflicts
    /// </summary>
    public class DependencyAnalyzer
    {
        public DependencyReport AnalyzeDependencies(Type testClass)
        {
            var report = new DependencyReport
            {
                ClassName = testClass.Name,
                AnalysisTime = DateTime.UtcNow
            };

            // Analyze constructor dependencies
            var constructors = testClass.GetConstructors();
            foreach (var constructor in constructors)
            {
                var constructorInfo = new ConstructorDependencyInfo
                {
                    ParameterCount = constructor.GetParameters().Length
                };

                foreach (var parameter in constructor.GetParameters())
                {
                    constructorInfo.Dependencies.Add(new DependencyInfo
                    {
                        Name = parameter.Name ?? "unknown",
                        Type = parameter.ParameterType.Name,
                        IsInterface = parameter.ParameterType.IsInterface,
                        RiskLevel = CalculateDependencyRiskLevel(parameter.ParameterType)
                    });
                }

                report.ConstructorDependencies.Add(constructorInfo);
            }

            // Calculate overall dependency risk
            report.OverallRisk = CalculateOverallDependencyRisk(report);

            return report;
        }

        private RiskLevel CalculateDependencyRiskLevel(Type dependencyType)
        {
            var typeName = dependencyType.Name;
            
            // High risk dependencies
            if (typeName.Contains("Singleton") || typeName.Contains("Static"))
                return RiskLevel.High;
            
            if (typeName.Contains("Database") || typeName.Contains("DbContext"))
                return RiskLevel.High;
            
            // Medium risk dependencies
            if (typeName.Contains("HttpClient") || typeName.Contains("FileSystem"))
                return RiskLevel.Medium;
            
            if (typeName.Contains("Configuration") || typeName.Contains("Options"))
                return RiskLevel.Medium;
            
            // Low risk dependencies
            if (dependencyType.IsInterface && typeName.StartsWith("I"))
                return RiskLevel.Low;
            
            return RiskLevel.Medium;
        }

        private RiskLevel CalculateOverallDependencyRisk(DependencyReport report)
        {
            var allDependencies = report.ConstructorDependencies
                .SelectMany(c => c.Dependencies);
            
            var highRiskCount = allDependencies.Count(d => d.RiskLevel == RiskLevel.High);
            var mediumRiskCount = allDependencies.Count(d => d.RiskLevel == RiskLevel.Medium);
            
            if (highRiskCount > 0) return RiskLevel.High;
            if (mediumRiskCount > 3) return RiskLevel.Medium;
            return RiskLevel.Low;
        }
    }

    public class DependencyReport
    {
        public string ClassName { get; set; } = string.Empty;
        public DateTime AnalysisTime { get; set; }
        public List<ConstructorDependencyInfo> ConstructorDependencies { get; set; } = new();
        public RiskLevel OverallRisk { get; set; }
        public List<string> Recommendations { get; set; } = new();
    }

    public class ConstructorDependencyInfo
    {
        public int ParameterCount { get; set; }
        public List<DependencyInfo> Dependencies { get; set; } = new();
    }

    public class DependencyInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool IsInterface { get; set; }
        public RiskLevel RiskLevel { get; set; }
    }

    /// <summary>
    /// Comprehensive test safety analysis wrapper
    /// </summary>
    public class TestSafetyAnalysis
    {
        public TestIsolationAnalysis IsolationAnalysis { get; set; } = new();
        public ThreadSafetyAnalysis ThreadSafetyAnalysis { get; set; } = new();
        public SharedResourceAnalysis SharedResourceAnalysis { get; set; } = new();
        public StaticStateAnalysis StaticStateAnalysis { get; set; } = new();
        public DependencyReport DependencyReport { get; set; } = new();
        
        public double OverallSafetyScore { get; set; }
        public List<string> SafetyRecommendations { get; set; } = new();
        public ParallelExecutionPotential ParallelExecutionPotential { get; set; }
    }
}