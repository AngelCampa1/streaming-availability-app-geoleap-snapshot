using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Tests.Performance
{
    /// <summary>
    /// Advanced parallel execution safety assessment for test optimization
    /// Analyzes test isolation, thread safety, and parallel execution potential
    /// </summary>
    public class ParallelExecutionSafetyAssessment
    {
        private readonly ILogger<ParallelExecutionSafetyAssessment> _logger;
        private readonly List<TestSafetyProfile> _safetyProfiles = new();
        private readonly Dictionary<string, List<string>> _sharedResourcePatterns = new();
        private readonly StaticStateAnalyzer _staticStateAnalyzer = new();
        private readonly DependencyAnalyzer _dependencyAnalyzer = new();

        public ParallelExecutionSafetyAssessment(ILogger<ParallelExecutionSafetyAssessment> logger = null)
        {
            _logger = logger ?? CreateConsoleLogger();
            InitializeResourcePatterns();
        }

        /// <summary>
        /// Assess parallel execution safety for a test method
        /// </summary>
        public async Task<TestSafetyProfile> AssessTestSafety(
            Type testClass, 
            MethodInfo testMethod, 
            string testCode = null)
        {
            var profile = new TestSafetyProfile
            {
                TestClass = testClass.Name,
                TestMethod = testMethod.Name,
                FullTestName = $"{testClass.Name}.{testMethod.Name}",
                AssessmentTime = DateTime.UtcNow
            };

            try
            {
                // Analyze test isolation
                profile.IsolationAnalysis = await AnalyzeTestIsolation(testClass, testMethod, testCode);
                
                // Analyze thread safety
                profile.ThreadSafetyAnalysis = await AnalyzeThreadSafety(testClass, testMethod, testCode);
                
                // Analyze shared resource usage
                profile.SharedResourceAnalysis = await AnalyzeSharedResources(testClass, testMethod, testCode);
                
                // Analyze dependencies
                profile.DependencyAnalysis = await AnalyzeDependencies(testClass, testMethod);
                
                // Analyze static state usage
                profile.StaticStateAnalysis = await AnalyzeStaticState(testClass, testMethod, testCode);
                
                // Calculate overall safety score
                profile.SafetyScore = CalculateOverallSafetyScore(profile);
                
                // Generate recommendations
                profile.ParallelizationRecommendations = GenerateParallelizationRecommendations(profile);
                
                // Determine parallel execution potential
                profile.ParallelExecutionPotential = DetermineParallelExecutionPotential(profile);

                _safetyProfiles.Add(profile);
                
                _logger.LogInformation($"Safety assessment completed for {profile.FullTestName}: {profile.SafetyScore:F1}/100");
                
                return profile;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to assess safety for {profile.FullTestName}");
                profile.Exception = ex;
                profile.SafetyScore = 0;
                return profile;
            }
        }

        /// <summary>
        /// Analyze test isolation characteristics
        /// </summary>
        private async Task<TestIsolationAnalysis> AnalyzeTestIsolation(Type testClass, MethodInfo testMethod, string testCode)
        {
            var analysis = new TestIsolationAnalysis();
            
            // Check for setup/teardown methods
            analysis.HasSetup = testClass.GetMethods().Any(m => 
                m.GetCustomAttributes().Any(a => a.GetType().Name.Contains("Setup") || a.GetType().Name.Contains("Initialize")));
            
            analysis.HasTeardown = testClass.GetMethods().Any(m => 
                m.GetCustomAttributes().Any(a => a.GetType().Name.Contains("Teardown") || a.GetType().Name.Contains("Cleanup")));
            
            // Analyze method attributes for isolation hints
            var attributes = testMethod.GetCustomAttributes().ToList();
            analysis.RequiresIsolation = attributes.Any(a => 
                a.GetType().Name.Contains("Collection") || 
                a.GetType().Name.Contains("Serial") ||
                a.GetType().Name.Contains("NonParallel"));
            
            // Check for database usage patterns
            if (testCode != null)
            {
                analysis.UsesDatabase = ContainsDatabasePatterns(testCode);
                analysis.UsesFileSystem = ContainsFileSystemPatterns(testCode);
                analysis.UsesNetwork = ContainsNetworkPatterns(testCode);
                analysis.UsesStaticState = ContainsStaticStatePatterns(testCode);
            }
            
            // Check for WebApplicationFactory usage
            analysis.UsesWebApplicationFactory = testClass.GetFields(BindingFlags.NonPublic | BindingFlags.Instance)
                .Any(f => f.FieldType.Name.Contains("WebApplicationFactory")) ||
                (testCode?.Contains("WebApplicationFactory") == true);
            
            // Isolation score calculation
            analysis.IsolationScore = CalculateIsolationScore(analysis);
            
            return analysis;
        }

        /// <summary>
        /// Analyze thread safety characteristics
        /// </summary>
        private async Task<ThreadSafetyAnalysis> AnalyzeThreadSafety(Type testClass, MethodInfo testMethod, string testCode)
        {
            var analysis = new ThreadSafetyAnalysis();
            
            // Check for async patterns
            analysis.IsAsync = testMethod.ReturnType == typeof(Task) || 
                              testMethod.ReturnType.IsGenericType && 
                              testMethod.ReturnType.GetGenericTypeDefinition() == typeof(Task<>);
            
            // Analyze concurrent collection usage
            if (testCode != null)
            {
                analysis.UsesConcurrentCollections = ContainsConcurrentCollectionPatterns(testCode);
                analysis.UsesLocking = ContainsLockingPatterns(testCode);
                analysis.UsesThreadUnsafeCollections = ContainsThreadUnsafePatterns(testCode);
                analysis.HasRaceConditionRisk = HasRaceConditionRisk(testCode);
            }
            
            // Check for volatile fields or thread-static attributes
            var fields = testClass.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance);
            analysis.HasVolatileFields = fields.Any(f => f.IsVolatile);
            analysis.HasThreadStaticFields = fields.Any(f => f.GetCustomAttributes(typeof(ThreadStaticAttribute), false).Any());
            
            // Thread safety score calculation
            analysis.ThreadSafetyScore = CalculateThreadSafetyScore(analysis);
            
            return analysis;
        }

        /// <summary>
        /// Analyze shared resource usage
        /// </summary>
        private async Task<SharedResourceAnalysis> AnalyzeSharedResources(Type testClass, MethodInfo testMethod, string testCode)
        {
            var analysis = new SharedResourceAnalysis();
            
            if (testCode != null)
            {
                // Database resources
                analysis.DatabaseResources = ExtractDatabaseResources(testCode);
                
                // File system resources
                analysis.FileSystemResources = ExtractFileSystemResources(testCode);
                
                // Network resources
                analysis.NetworkResources = ExtractNetworkResources(testCode);
                
                // Environment variables
                analysis.EnvironmentVariables = ExtractEnvironmentVariables(testCode);
                
                // Global state
                analysis.GlobalStateAccess = ExtractGlobalStateAccess(testCode);
            }
            
            // Shared resource risk assessment
            analysis.SharedResourceRisk = CalculateSharedResourceRisk(analysis);
            
            return analysis;
        }

        /// <summary>
        /// Analyze test dependencies
        /// </summary>
        private async Task<TestDependencyAnalysis> AnalyzeDependencies(Type testClass, MethodInfo testMethod)
        {
            var analysis = new TestDependencyAnalysis();
            
            // Analyze constructor dependencies
            var constructors = testClass.GetConstructors();
            analysis.ConstructorDependencies = constructors
                .SelectMany(c => c.GetParameters())
                .Select(p => p.ParameterType.Name)
                .Distinct()
                .ToList();
            
            // Analyze method parameter dependencies
            analysis.MethodDependencies = testMethod.GetParameters()
                .Select(p => p.ParameterType.Name)
                .ToList();
            
            // Check for service dependencies that might not be thread-safe
            analysis.HasSingletonDependencies = analysis.ConstructorDependencies
                .Any(d => IsSingletonService(d));
            
            // Check for external service dependencies
            analysis.HasExternalDependencies = analysis.ConstructorDependencies
                .Any(d => IsExternalService(d));
            
            return analysis;
        }

        /// <summary>
        /// Analyze static state usage
        /// </summary>
        private async Task<StaticStateAnalysis> AnalyzeStaticState(Type testClass, MethodInfo testMethod, string testCode)
        {
            var analysis = new StaticStateAnalysis();
            
            // Static fields in test class
            var staticFields = testClass.GetFields(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            analysis.StaticFields = staticFields.Select(f => f.Name).ToList();
            
            // Static properties in test class
            var staticProperties = testClass.GetProperties(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            analysis.StaticProperties = staticProperties.Select(p => p.Name).ToList();
            
            if (testCode != null)
            {
                // Static method calls
                analysis.StaticMethodCalls = ExtractStaticMethodCalls(testCode);
                
                // Singleton pattern usage
                analysis.SingletonUsage = ExtractSingletonUsage(testCode);
            }
            
            // Static state risk calculation
            analysis.StaticStateRisk = CalculateStaticStateRisk(analysis);
            
            return analysis;
        }

        /// <summary>
        /// Calculate overall safety score for parallel execution
        /// </summary>
        private double CalculateOverallSafetyScore(TestSafetyProfile profile)
        {
            var weights = new Dictionary<string, double>
            {
                ["Isolation"] = 0.3,
                ["ThreadSafety"] = 0.25,
                ["SharedResources"] = 0.25,
                ["StaticState"] = 0.2
            };

            var score = 0.0;
            score += profile.IsolationAnalysis.IsolationScore * weights["Isolation"];
            score += profile.ThreadSafetyAnalysis.ThreadSafetyScore * weights["ThreadSafety"];
            score += (100 - profile.SharedResourceAnalysis.SharedResourceRisk) * weights["SharedResources"];
            score += (100 - profile.StaticStateAnalysis.StaticStateRisk) * weights["StaticState"];
            
            return Math.Max(0, Math.Min(100, score));
        }

        /// <summary>
        /// Generate parallelization recommendations
        /// </summary>
        private List<string> GenerateParallelizationRecommendations(TestSafetyProfile profile)
        {
            var recommendations = new List<string>();
            
            if (profile.SafetyScore >= 80)
            {
                recommendations.Add("✅ SAFE FOR PARALLEL EXECUTION - No significant risks detected");
            }
            else if (profile.SafetyScore >= 60)
            {
                recommendations.Add("⚠️ CONDITIONAL PARALLEL EXECUTION - Address minor issues first");
            }
            else
            {
                recommendations.Add("❌ NOT SAFE FOR PARALLEL EXECUTION - Significant risks detected");
            }
            
            // Specific recommendations based on analysis
            if (profile.IsolationAnalysis.UsesDatabase)
                recommendations.Add("🔧 Use separate database schemas or in-memory databases for isolation");
            
            if (profile.SharedResourceAnalysis.FileSystemResources.Any())
                recommendations.Add("🔧 Mock file system operations or use unique temporary directories");
            
            if (profile.StaticStateAnalysis.StaticFields.Any())
                recommendations.Add("🔧 Remove or minimize static state usage");
            
            if (profile.ThreadSafetyAnalysis.UsesThreadUnsafeCollections)
                recommendations.Add("🔧 Replace thread-unsafe collections with concurrent alternatives");
            
            if (profile.IsolationAnalysis.UsesWebApplicationFactory)
                recommendations.Add("🔧 Consider using separate WebApplicationFactory instances or implement proper disposal");
            
            return recommendations;
        }

        /// <summary>
        /// Determine parallel execution potential
        /// </summary>
        private ParallelExecutionPotential DetermineParallelExecutionPotential(TestSafetyProfile profile)
        {
            return profile.SafetyScore switch
            {
                >= 90 => ParallelExecutionPotential.HighlyRecommended,
                >= 75 => ParallelExecutionPotential.Recommended,
                >= 60 => ParallelExecutionPotential.ConditionallyRecommended,
                >= 40 => ParallelExecutionPotential.NotRecommended,
                _ => ParallelExecutionPotential.Unsafe
            };
        }

        /// <summary>
        /// Generate comprehensive parallel execution report
        /// </summary>
        public ParallelExecutionReport GenerateParallelExecutionReport()
        {
            var report = new ParallelExecutionReport
            {
                GeneratedAt = DateTime.UtcNow,
                TotalTestsAssessed = _safetyProfiles.Count,
                AverageSafetyScore = _safetyProfiles.Any() ? _safetyProfiles.Average(p => p.SafetyScore) : 0
            };

            // Categorize tests by safety level
            report.SafeForParallel = _safetyProfiles.Where(p => p.SafetyScore >= 75).ToList();
            report.ConditionallyParallel = _safetyProfiles.Where(p => p.SafetyScore >= 60 && p.SafetyScore < 75).ToList();
            report.UnsafeForParallel = _safetyProfiles.Where(p => p.SafetyScore < 60).ToList();

            // Calculate percentages
            if (_safetyProfiles.Any())
            {
                report.SafeForParallelPercentage = (double)report.SafeForParallel.Count / _safetyProfiles.Count * 100;
                report.ConditionallyParallelPercentage = (double)report.ConditionallyParallel.Count / _safetyProfiles.Count * 100;
                report.UnsafeForParallelPercentage = (double)report.UnsafeForParallel.Count / _safetyProfiles.Count * 100;
            }

            // Common issues analysis
            report.CommonIssues = AnalyzeCommonIssues();
            
            // Optimization recommendations
            report.OptimizationRecommendations = GenerateGlobalOptimizationRecommendations();
            
            // Estimated performance improvement
            report.EstimatedPerformanceImprovement = CalculateEstimatedPerformanceImprovement(report);

            return report;
        }

        // Helper methods for pattern detection
        private bool ContainsDatabasePatterns(string code)
        {
            var patterns = new[]
            {
                @"\.Database\.",
                @"DbContext",
                @"SqlConnection",
                @"\.Query\(",
                @"\.Execute\(",
                @"\.Insert\(",
                @"\.Update\(",
                @"\.Delete\("
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool ContainsFileSystemPatterns(string code)
        {
            var patterns = new[]
            {
                @"File\.",
                @"Directory\.",
                @"Path\.",
                @"FileStream",
                @"StreamWriter",
                @"StreamReader"
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool ContainsNetworkPatterns(string code)
        {
            var patterns = new[]
            {
                @"HttpClient",
                @"WebRequest",
                @"TcpClient",
                @"UdpClient",
                @"Socket\."
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool ContainsStaticStatePatterns(string code)
        {
            var patterns = new[]
            {
                @"static\s+\w+\s+\w+\s*=",
                @"\w+\.\w+\s*=.*static",
                @"Singleton\.",
                @"\.Instance\."
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool ContainsConcurrentCollectionPatterns(string code)
        {
            var patterns = new[]
            {
                @"ConcurrentQueue",
                @"ConcurrentStack",
                @"ConcurrentDictionary",
                @"ConcurrentBag"
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool ContainsLockingPatterns(string code)
        {
            var patterns = new[]
            {
                @"lock\s*\(",
                @"Monitor\.",
                @"Mutex\.",
                @"Semaphore\.",
                @"ReaderWriterLock"
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool ContainsThreadUnsafePatterns(string code)
        {
            var patterns = new[]
            {
                @"List<",
                @"Dictionary<",
                @"HashSet<",
                @"ArrayList",
                @"Hashtable"
            };
            
            return patterns.Any(pattern => Regex.IsMatch(code, pattern, RegexOptions.IgnoreCase));
        }

        private bool HasRaceConditionRisk(string code)
        {
            // Simple heuristic for race condition risk
            var asyncOperations = Regex.Matches(code, @"async\s+\w+", RegexOptions.IgnoreCase).Count;
            var sharedState = Regex.Matches(code, @"static\s+\w+", RegexOptions.IgnoreCase).Count;
            
            return asyncOperations > 0 && sharedState > 0;
        }

        // Calculation methods
        private double CalculateIsolationScore(TestIsolationAnalysis analysis)
        {
            double score = 100;
            
            if (analysis.UsesDatabase) score -= 20;
            if (analysis.UsesFileSystem) score -= 15;
            if (analysis.UsesNetwork) score -= 10;
            if (analysis.UsesStaticState) score -= 25;
            if (analysis.UsesWebApplicationFactory) score -= 15;
            if (analysis.RequiresIsolation) score -= 30;
            
            return Math.Max(0, score);
        }

        private double CalculateThreadSafetyScore(TestSafetyAnalysis analysis)
        {
            double score = 100;
            
            if (analysis.ThreadSafetyAnalysis.UsesThreadUnsafeCollections) score -= 30;
            if (analysis.ThreadSafetyAnalysis.HasRaceConditionRisk) score -= 25;
            if (!analysis.ThreadSafetyAnalysis.UsesConcurrentCollections && analysis.ThreadSafetyAnalysis.IsAsync) score -= 15;
            if (!analysis.ThreadSafetyAnalysis.UsesLocking && analysis.ThreadSafetyAnalysis.UsesThreadUnsafeCollections) score -= 20;
            
            // Bonus for good practices
            if (analysis.ThreadSafetyAnalysis.UsesConcurrentCollections) score += 10;
            if (analysis.ThreadSafetyAnalysis.UsesLocking) score += 5;
            
            return Math.Max(0, Math.Min(100, score));
        }

        private double CalculateSharedResourceRisk(SharedResourceAnalysis analysis)
        {
            double risk = 0;
            
            risk += analysis.DatabaseResources.Count * 20;
            risk += analysis.FileSystemResources.Count * 15;
            risk += analysis.NetworkResources.Count * 10;
            risk += analysis.EnvironmentVariables.Count * 5;
            risk += analysis.GlobalStateAccess.Count * 25;
            
            return Math.Min(100, risk);
        }

        private double CalculateStaticStateRisk(StaticStateAnalysis analysis)
        {
            double risk = 0;
            
            risk += analysis.StaticFields.Count * 15;
            risk += analysis.StaticProperties.Count * 10;
            risk += analysis.StaticMethodCalls.Count * 5;
            risk += analysis.SingletonUsage.Count * 20;
            
            return Math.Min(100, risk);
        }

        // Resource extraction methods
        private List<string> ExtractDatabaseResources(string code)
        {
            var resources = new List<string>();
            var patterns = new Dictionary<string, string>
            {
                ["Tables"] = @"FROM\s+(\w+)",
                ["Entities"] = @"\.(\w+)\.Add\(",
                ["Queries"] = @"\.Query<(\w+)>"
            };
            
            foreach (var pattern in patterns)
            {
                var matches = Regex.Matches(code, pattern.Value, RegexOptions.IgnoreCase);
                resources.AddRange(matches.Cast<Match>().Select(m => m.Groups[1].Value));
            }
            
            return resources.Distinct().ToList();
        }

        private List<string> ExtractFileSystemResources(string code)
        {
            var resources = new List<string>();
            var patterns = new[]
            {
                @"""([^""]*\.(txt|json|xml|csv)[^""]*)""",
                @"@""([^""]*\.(txt|json|xml|csv)[^""]*)""",
                @"Path\.Combine\([^)]*\)"
            };
            
            foreach (var pattern in patterns)
            {
                var matches = Regex.Matches(code, pattern, RegexOptions.IgnoreCase);
                resources.AddRange(matches.Cast<Match>().Select(m => m.Groups[1].Value));
            }
            
            return resources.Distinct().ToList();
        }

        private List<string> ExtractNetworkResources(string code)
        {
            var resources = new List<string>();
            var patterns = new[]
            {
                @"https?://[^\s""']+",
                @"new\s+Uri\(""([^""]+)""",
                @"\.GetAsync\(""([^""]+)""",
                @"\.PostAsync\(""([^""]+)"""
            };
            
            foreach (var pattern in patterns)
            {
                var matches = Regex.Matches(code, pattern, RegexOptions.IgnoreCase);
                resources.AddRange(matches.Cast<Match>().Select(m => m.Groups[1].Value));
            }
            
            return resources.Distinct().ToList();
        }

        private List<string> ExtractEnvironmentVariables(string code)
        {
            var variables = new List<string>();
            var pattern = @"Environment\.GetEnvironmentVariable\(""([^""]+)""";
            
            var matches = Regex.Matches(code, pattern, RegexOptions.IgnoreCase);
            variables.AddRange(matches.Cast<Match>().Select(m => m.Groups[1].Value));
            
            return variables.Distinct().ToList();
        }

        private List<string> ExtractGlobalStateAccess(string code)
        {
            var accesses = new List<string>();
            var patterns = new[]
            {
                @"(\w+)\.Instance\.",
                @"static\s+(\w+)\s+\w+",
                @"(\w+)\.Current\."
            };
            
            foreach (var pattern in patterns)
            {
                var matches = Regex.Matches(code, pattern, RegexOptions.IgnoreCase);
                accesses.AddRange(matches.Cast<Match>().Select(m => m.Groups[1].Value));
            }
            
            return accesses.Distinct().ToList();
        }

        private List<string> ExtractStaticMethodCalls(string code)
        {
            var calls = new List<string>();
            var pattern = @"(\w+)\.(\w+)\(";
            
            var matches = Regex.Matches(code, pattern, RegexOptions.IgnoreCase);
            foreach (Match match in matches)
            {
                var className = match.Groups[1].Value;
                var methodName = match.Groups[2].Value;
                
                // Check if it's likely a static call (starts with uppercase)
                if (char.IsUpper(className[0]) && char.IsUpper(methodName[0]))
                {
                    calls.Add($"{className}.{methodName}");
                }
            }
            
            return calls.Distinct().ToList();
        }

        private List<string> ExtractSingletonUsage(string code)
        {
            var singletons = new List<string>();
            var patterns = new[]
            {
                @"(\w+)\.Instance",
                @"(\w+)\.Current",
                @"(\w+)\.Default"
            };
            
            foreach (var pattern in patterns)
            {
                var matches = Regex.Matches(code, pattern, RegexOptions.IgnoreCase);
                singletons.AddRange(matches.Cast<Match>().Select(m => m.Groups[1].Value));
            }
            
            return singletons.Distinct().ToList();
        }

        private bool IsSingletonService(string serviceName)
        {
            var singletonPatterns = new[]
            {
                "ILogger", "IConfiguration", "IHostEnvironment", "IMemoryCache",
                "Singleton", "Cache", "Manager", "Provider"
            };
            
            return singletonPatterns.Any(pattern => serviceName.Contains(pattern));
        }

        private bool IsExternalService(string serviceName)
        {
            var externalPatterns = new[]
            {
                "HttpClient", "Database", "FileSystem", "Network", "Email", "Sms"
            };
            
            return externalPatterns.Any(pattern => serviceName.Contains(pattern));
        }

        private List<string> AnalyzeCommonIssues()
        {
            var issues = new List<string>();
            
            var databaseUsage = _safetyProfiles.Count(p => p.IsolationAnalysis.UsesDatabase);
            if (databaseUsage > 0)
                issues.Add($"{databaseUsage} tests use database - consider in-memory alternatives");
            
            var staticStateUsage = _safetyProfiles.Count(p => p.StaticStateAnalysis.StaticFields.Any());
            if (staticStateUsage > 0)
                issues.Add($"{staticStateUsage} tests use static state - major parallelization blocker");
            
            var webAppFactoryUsage = _safetyProfiles.Count(p => p.IsolationAnalysis.UsesWebApplicationFactory);
            if (webAppFactoryUsage > 0)
                issues.Add($"{webAppFactoryUsage} tests use WebApplicationFactory - may need isolation");
            
            return issues;
        }

        private List<string> GenerateGlobalOptimizationRecommendations()
        {
            var recommendations = new List<string>();
            
            var safeCount = _safetyProfiles.Count(p => p.SafetyScore >= 75);
            var totalCount = _safetyProfiles.Count;
            
            if (safeCount > totalCount * 0.7)
            {
                recommendations.Add("🚀 Enable parallel execution for high-scoring tests");
                recommendations.Add("📊 Configure xUnit with appropriate parallelization settings");
            }
            
            if (safeCount < totalCount * 0.5)
            {
                recommendations.Add("🔧 Focus on improving test isolation before enabling parallelization");
                recommendations.Add("🏗️ Refactor tests to reduce shared state dependencies");
            }
            
            recommendations.Add("📈 Monitor test execution times to validate improvements");
            recommendations.Add("🧪 Gradually increase parallelization based on safety scores");
            
            return recommendations;
        }

        private double CalculateEstimatedPerformanceImprovement(ParallelExecutionReport report)
        {
            var safePercentage = report.SafeForParallelPercentage / 100.0;
            var coreCount = Environment.ProcessorCount;
            
            // Conservative estimate: safe tests can benefit from parallelization
            // Assuming 70% efficiency with parallel execution
            return safePercentage * Math.Min(coreCount, 4) * 0.7;
        }

        private void InitializeResourcePatterns()
        {
            _sharedResourcePatterns["Database"] = new List<string>
            {
                "DbContext", "SqlConnection", "Database", "Repository", "Entity"
            };
            
            _sharedResourcePatterns["FileSystem"] = new List<string>
            {
                "File", "Directory", "Path", "Stream", "FileInfo"
            };
            
            _sharedResourcePatterns["Network"] = new List<string>
            {
                "HttpClient", "WebRequest", "TcpClient", "Socket"
            };
        }

        private ILogger<ParallelExecutionSafetyAssessment> CreateConsoleLogger()
        {
            using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            return loggerFactory.CreateLogger<ParallelExecutionSafetyAssessment>();
        }
    }
}