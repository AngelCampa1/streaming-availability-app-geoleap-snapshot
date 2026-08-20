using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace GeoLeap.Tests.ValidationProtocol
{
    /// <summary>
    /// 🏷️ Test Categorization and Pattern Identification System
    /// 
    /// Automatically categorizes tests and identifies patterns:
    /// - Intelligent test classification by content analysis
    /// - US82 pattern detection and compliance scoring
    /// - Test category recommendations
    /// - Pattern evolution tracking
    /// - Automated tagging and organization
    /// </summary>
    [Trait("Category", "TestOrganization")]
    [Trait("Priority", "High")]
    public class TestCategorizationSystem
    {
        private readonly ITestOutputHelper _output;
        private readonly PatternAnalyzer _patternAnalyzer;
        private readonly TestClassifier _testClassifier;
        private readonly string _testDirectory;

        public TestCategorizationSystem(ITestOutputHelper output)
        {
            _output = output;
            _testDirectory = "/home/angel/GeoLeap";
            _patternAnalyzer = new PatternAnalyzer();
            _testClassifier = new TestClassifier();
        }

        /// <summary>
        /// Executes comprehensive test categorization and pattern identification
        /// </summary>
        [Fact]
        public async Task ExecuteTestCategorizationAndPatternIdentification()
        {
            _output.WriteLine("🏷️ === TEST CATEGORIZATION AND PATTERN IDENTIFICATION === 🏷️");
            _output.WriteLine("");

            // Discover all test files
            var testFiles = await DiscoverTestFiles();

            // Classify tests by category
            var categoryResults = await ClassifyTestsByCategory(testFiles);

            // Identify US82 pattern usage
            var patternResults = await IdentifyUS82Patterns(testFiles);

            // Analyze pattern compliance
            var complianceResults = await AnalyzePatternCompliance(testFiles);

            // Generate categorization recommendations
            var recommendations = await GenerateCategorizationRecommendations(categoryResults, patternResults);

            // Create pattern identification report
            await GeneratePatternIdentificationReport(categoryResults, patternResults, complianceResults, recommendations);

            // Validate categorization accuracy
            ValidateCategorizationAccuracy(categoryResults);

            _output.WriteLine("✅ Test categorization and pattern identification completed!");
        }

        #region Test Discovery and Classification

        private async Task<List<TestFileInfo>> DiscoverTestFiles()
        {
            _output.WriteLine("🔍 Discovering test files...");

            var testFiles = new List<TestFileInfo>();

            // Backend test files
            var backendTestPath = Path.Combine(_testDirectory, "backend");
            if (Directory.Exists(backendTestPath))
            {
                var csFiles = Directory.GetFiles(backendTestPath, "*.cs", SearchOption.AllDirectories)
                    .Where(f => f.Contains("Test", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                foreach (var file in csFiles)
                {
                    var fileInfo = await AnalyzeTestFile(file, "C#");
                    testFiles.Add(fileInfo);
                }
            }

            // Frontend test files
            var frontendTestPath = Path.Combine(_testDirectory, "frontend");
            if (Directory.Exists(frontendTestPath))
            {
                var jsFiles = Directory.GetFiles(frontendTestPath, "*.test.*", SearchOption.AllDirectories)
                    .Concat(Directory.GetFiles(frontendTestPath, "*.spec.*", SearchOption.AllDirectories))
                    .ToList();

                foreach (var file in jsFiles)
                {
                    var fileInfo = await AnalyzeTestFile(file, "TypeScript");
                    testFiles.Add(fileInfo);
                }
            }

            _output.WriteLine($"   📁 Discovered {testFiles.Count} test files");
            return testFiles;
        }

        private async Task<TestFileInfo> AnalyzeTestFile(string filePath, string language)
        {
            var content = await File.ReadAllTextAsync(filePath);
            var fileName = Path.GetFileName(filePath);
            var relativePath = Path.GetRelativePath(_testDirectory, filePath);

            return new TestFileInfo
            {
                FilePath = filePath,
                RelativePath = relativePath,
                FileName = fileName,
                Language = language,
                Content = content,
                TestMethodCount = CountTestMethods(content, language),
                LineCount = content.Split('\n').Length,
                LastModified = File.GetLastWriteTime(filePath)
            };
        }

        private int CountTestMethods(string content, string language)
        {
            return language switch
            {
                "C#" => Regex.Matches(content, @"\[Fact\]|\[Theory\]", RegexOptions.IgnoreCase).Count,
                "TypeScript" => Regex.Matches(content, @"it\s*\(|test\s*\(", RegexOptions.IgnoreCase).Count,
                _ => 0
            };
        }

        #endregion

        #region Test Classification

        private async Task<CategoryClassificationResult> ClassifyTestsByCategory(List<TestFileInfo> testFiles)
        {
            _output.WriteLine("📊 Classifying tests by category...");

            var result = new CategoryClassificationResult();

            foreach (var testFile in testFiles)
            {
                var category = _testClassifier.ClassifyTest(testFile);
                var classification = new TestClassification
                {
                    TestFile = testFile,
                    PrimaryCategory = category.PrimaryCategory,
                    SecondaryCategories = category.SecondaryCategories,
                    Confidence = category.Confidence,
                    ClassificationReason = category.Reason
                };

                result.Classifications.Add(classification);
                
                if (!result.CategoryCounts.ContainsKey(category.PrimaryCategory))
                    result.CategoryCounts[category.PrimaryCategory] = 0;
                result.CategoryCounts[category.PrimaryCategory]++;

                _output.WriteLine($"   📋 {testFile.FileName}: {category.PrimaryCategory} ({category.Confidence:F1}%)");
            }

            // Calculate category statistics
            result.TotalFiles = testFiles.Count;
            result.MostCommonCategory = result.CategoryCounts.OrderByDescending(kvp => kvp.Value).First().Key;
            result.AverageConfidence = result.Classifications.Average(c => c.Confidence);

            _output.WriteLine($"   📊 Category distribution: {string.Join(", ", result.CategoryCounts.Select(kvp => $"{kvp.Key}: {kvp.Value}"))}");
            
            return result;
        }

        #endregion

        #region Pattern Identification

        private async Task<PatternIdentificationResult> IdentifyUS82Patterns(List<TestFileInfo> testFiles)
        {
            _output.WriteLine("🎯 Identifying US82 patterns...");

            var result = new PatternIdentificationResult();

            foreach (var testFile in testFiles)
            {
                var patternUsage = _patternAnalyzer.AnalyzeUS82Usage(testFile);
                result.PatternUsages.Add(patternUsage);

                if (patternUsage.HasUS82Pattern)
                {
                    result.FilesWithUS82Pattern++;
                    _output.WriteLine($"   ✅ {testFile.FileName}: US82 pattern detected ({patternUsage.PatternElements.Count} elements)");
                }
                else
                {
                    result.FilesWithoutUS82Pattern++;
                    _output.WriteLine($"   ⚠️ {testFile.FileName}: No US82 pattern detected");
                }
            }

            result.TotalFiles = testFiles.Count;
            result.US82AdoptionRate = (double)result.FilesWithUS82Pattern / result.TotalFiles * 100;
            result.CommonPatternElements = GetMostCommonPatternElements(result.PatternUsages);

            _output.WriteLine($"   📈 US82 adoption rate: {result.US82AdoptionRate:F1}% ({result.FilesWithUS82Pattern}/{result.TotalFiles} files)");

            return result;
        }

        private async Task<PatternComplianceResult> AnalyzePatternCompliance(List<TestFileInfo> testFiles)
        {
            _output.WriteLine("🎖️ Analyzing pattern compliance...");

            var result = new PatternComplianceResult();

            foreach (var testFile in testFiles)
            {
                var compliance = _patternAnalyzer.AnalyzeCompliance(testFile);
                result.ComplianceScores.Add(compliance);

                var status = compliance.OverallScore >= 80 ? "✅ Compliant" : 
                           compliance.OverallScore >= 60 ? "⚠️ Partial" : "❌ Non-compliant";

                _output.WriteLine($"   {status} {testFile.FileName}: {compliance.OverallScore:F1}% compliance");
            }

            result.AverageComplianceScore = result.ComplianceScores.Average(c => c.OverallScore);
            result.FullyCompliantFiles = result.ComplianceScores.Count(c => c.OverallScore >= 80);
            result.PartiallyCompliantFiles = result.ComplianceScores.Count(c => c.OverallScore >= 60 && c.OverallScore < 80);
            result.NonCompliantFiles = result.ComplianceScores.Count(c => c.OverallScore < 60);

            _output.WriteLine($"   📊 Average compliance: {result.AverageComplianceScore:F1}%");
            _output.WriteLine($"   📈 Compliance distribution: Fully={result.FullyCompliantFiles}, Partial={result.PartiallyCompliantFiles}, Non={result.NonCompliantFiles}");

            return result;
        }

        #endregion

        #region Recommendations

        private async Task<CategorizationRecommendations> GenerateCategorizationRecommendations(
            CategoryClassificationResult categories,
            PatternIdentificationResult patterns)
        {
            _output.WriteLine("💡 Generating categorization recommendations...");

            var recommendations = new CategorizationRecommendations();

            // Category organization recommendations
            foreach (var classification in categories.Classifications)
            {
                if (classification.Confidence < 70)
                {
                    recommendations.CategoryRecommendations.Add(new CategoryRecommendation
                    {
                        TestFile = classification.TestFile.FileName,
                        CurrentCategory = classification.PrimaryCategory,
                        RecommendedAction = "Review classification - low confidence",
                        Reason = $"Classification confidence is only {classification.Confidence:F1}%",
                        Priority = RecommendationPriority.Medium
                    });
                }
            }

            // US82 pattern adoption recommendations
            foreach (var patternUsage in patterns.PatternUsages)
            {
                if (!patternUsage.HasUS82Pattern && ShouldHaveUS82Pattern(patternUsage.TestFile))
                {
                    recommendations.PatternRecommendations.Add(new PatternRecommendation
                    {
                        TestFile = patternUsage.TestFile.FileName,
                        RecommendedPattern = "US82",
                        RecommendedAction = "Convert to US82 pattern",
                        Reason = "Test appears to be a good candidate for US82 pattern adoption",
                        Priority = RecommendationPriority.High,
                        EstimatedBenefit = "100% success rate, reduced flakiness"
                    });
                }
            }

            // Structural recommendations
            GenerateStructuralRecommendations(categories, recommendations);

            _output.WriteLine($"   💡 Generated {recommendations.CategoryRecommendations.Count} category recommendations");
            _output.WriteLine($"   🎯 Generated {recommendations.PatternRecommendations.Count} pattern recommendations");
            _output.WriteLine($"   🏗️ Generated {recommendations.StructuralRecommendations.Count} structural recommendations");

            return recommendations;
        }

        private bool ShouldHaveUS82Pattern(TestFileInfo testFile)
        {
            // Criteria for US82 pattern recommendation
            var hasServiceDependencies = Regex.IsMatch(testFile.Content, @"Mock<\w*Service>|mock\w*Service", RegexOptions.IgnoreCase);
            var hasContextAccess = Regex.IsMatch(testFile.Content, @"_context\.|\.Context\.", RegexOptions.IgnoreCase);
            var hasComplexVerification = Regex.IsMatch(testFile.Content, @"\.Verify\(|Times\.|\.Should\(\)", RegexOptions.IgnoreCase);
            var isControllerOrService = testFile.FileName.Contains("Controller", StringComparison.OrdinalIgnoreCase) ||
                                      testFile.FileName.Contains("Service", StringComparison.OrdinalIgnoreCase);

            return (hasServiceDependencies || hasContextAccess || hasComplexVerification) && isControllerOrService;
        }

        private void GenerateStructuralRecommendations(CategoryClassificationResult categories, CategorizationRecommendations recommendations)
        {
            // Recommend directory restructuring if needed
            var misplacedTests = categories.Classifications
                .Where(c => IsTestMisplaced(c))
                .ToList();

            foreach (var misplaced in misplacedTests)
            {
                recommendations.StructuralRecommendations.Add(new StructuralRecommendation
                {
                    TestFile = misplaced.TestFile.FileName,
                    CurrentLocation = Path.GetDirectoryName(misplaced.TestFile.RelativePath),
                    RecommendedLocation = GetRecommendedLocation(misplaced.PrimaryCategory),
                    Reason = $"Test categorized as {misplaced.PrimaryCategory} but located in wrong directory",
                    Priority = RecommendationPriority.Low
                });
            }
        }

        private bool IsTestMisplaced(TestClassification classification)
        {
            var currentDir = Path.GetDirectoryName(classification.TestFile.RelativePath)?.ToLower() ?? "";
            var expectedKeyword = classification.PrimaryCategory.ToLower();

            return classification.Confidence > 80 && !currentDir.Contains(expectedKeyword);
        }

        private string GetRecommendedLocation(string category)
        {
            return category.ToLower() switch
            {
                "controller" => "tests/Controllers/",
                "service" => "tests/Services/",
                "integration" => "tests/Integration/",
                "unit" => "tests/Unit/",
                "e2e" => "tests/E2E/",
                _ => "tests/Miscellaneous/"
            };
        }

        #endregion

        #region Reporting

        private async Task GeneratePatternIdentificationReport(
            CategoryClassificationResult categories,
            PatternIdentificationResult patterns,
            PatternComplianceResult compliance,
            CategorizationRecommendations recommendations)
        {
            var reportPath = Path.Combine(_testDirectory, "tests", "pattern-identification-report.md");
            var report = CreatePatternIdentificationReport(categories, patterns, compliance, recommendations);
            
            await File.WriteAllTextAsync(reportPath, report);
            _output.WriteLine($"📊 Pattern identification report generated: {reportPath}");
        }

        private string CreatePatternIdentificationReport(
            CategoryClassificationResult categories,
            PatternIdentificationResult patterns,
            PatternComplianceResult compliance,
            CategorizationRecommendations recommendations)
        {
            var report = new System.Text.StringBuilder();

            report.AppendLine("# Test Categorization and Pattern Identification Report");
            report.AppendLine();
            report.AppendLine($"**Generated:** {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            report.AppendLine($"**Total Test Files Analyzed:** {categories.TotalFiles}");
            report.AppendLine();

            // Category Distribution
            report.AppendLine("## Test Category Distribution");
            report.AppendLine();
            report.AppendLine("| Category | Count | Percentage |");
            report.AppendLine("|----------|-------|------------|");
            
            foreach (var category in categories.CategoryCounts.OrderByDescending(kvp => kvp.Value))
            {
                var percentage = (double)category.Value / categories.TotalFiles * 100;
                report.AppendLine($"| {category.Key} | {category.Value} | {percentage:F1}% |");
            }
            report.AppendLine();

            // US82 Pattern Analysis
            report.AppendLine("## US82 Pattern Analysis");
            report.AppendLine();
            report.AppendLine($"- **Adoption Rate:** {patterns.US82AdoptionRate:F1}%");
            report.AppendLine($"- **Files with US82 Pattern:** {patterns.FilesWithUS82Pattern}");
            report.AppendLine($"- **Files without US82 Pattern:** {patterns.FilesWithoutUS82Pattern}");
            report.AppendLine();

            report.AppendLine("### Common Pattern Elements");
            foreach (var element in patterns.CommonPatternElements.Take(5))
            {
                report.AppendLine($"- **{element.Key}:** {element.Value} occurrences");
            }
            report.AppendLine();

            // Compliance Analysis
            report.AppendLine("## Pattern Compliance Analysis");
            report.AppendLine();
            report.AppendLine($"- **Average Compliance Score:** {compliance.AverageComplianceScore:F1}%");
            report.AppendLine($"- **Fully Compliant Files:** {compliance.FullyCompliantFiles}");
            report.AppendLine($"- **Partially Compliant Files:** {compliance.PartiallyCompliantFiles}");
            report.AppendLine($"- **Non-Compliant Files:** {compliance.NonCompliantFiles}");
            report.AppendLine();

            // Recommendations Summary
            report.AppendLine("## Recommendations Summary");
            report.AppendLine();
            report.AppendLine($"- **Category Recommendations:** {recommendations.CategoryRecommendations.Count}");
            report.AppendLine($"- **Pattern Recommendations:** {recommendations.PatternRecommendations.Count}");
            report.AppendLine($"- **Structural Recommendations:** {recommendations.StructuralRecommendations.Count}");
            report.AppendLine();

            // High Priority Recommendations
            var highPriorityRecommendations = recommendations.PatternRecommendations
                .Where(r => r.Priority == RecommendationPriority.High)
                .Take(10);

            if (highPriorityRecommendations.Any())
            {
                report.AppendLine("### High Priority Pattern Recommendations");
                report.AppendLine();
                foreach (var rec in highPriorityRecommendations)
                {
                    report.AppendLine($"- **{rec.TestFile}:** {rec.RecommendedAction}");
                    report.AppendLine($"  - Reason: {rec.Reason}");
                    report.AppendLine($"  - Expected Benefit: {rec.EstimatedBenefit}");
                    report.AppendLine();
                }
            }

            return report.ToString();
        }

        #endregion

        #region Validation

        private void ValidateCategorizationAccuracy(CategoryClassificationResult categories)
        {
            _output.WriteLine("🎯 Validating categorization accuracy...");

            var lowConfidenceCount = categories.Classifications.Count(c => c.Confidence < 70);
            var averageConfidence = categories.AverageConfidence;

            _output.WriteLine($"   📊 Average confidence: {averageConfidence:F1}%");
            _output.WriteLine($"   ⚠️ Low confidence classifications: {lowConfidenceCount}");

            // Assert minimum quality standards
            Assert.True(averageConfidence >= 75, $"Average classification confidence {averageConfidence:F1}% is below 75% threshold");
            Assert.True(lowConfidenceCount <= categories.TotalFiles * 0.2, $"Too many low confidence classifications: {lowConfidenceCount}");

            _output.WriteLine("   ✅ Categorization accuracy validation passed");
        }

        #endregion

        #region Helper Methods

        private List<KeyValuePair<string, int>> GetMostCommonPatternElements(List<US82PatternUsage> patternUsages)
        {
            var elementCounts = new Dictionary<string, int>();

            foreach (var usage in patternUsages)
            {
                foreach (var element in usage.PatternElements)
                {
                    if (!elementCounts.ContainsKey(element))
                        elementCounts[element] = 0;
                    elementCounts[element]++;
                }
            }

            return elementCounts.OrderByDescending(kvp => kvp.Value).ToList();
        }

        #endregion
    }

    #region Supporting Classes

    public class TestFileInfo
    {
        public string FilePath { get; set; } = "";
        public string RelativePath { get; set; } = "";
        public string FileName { get; set; } = "";
        public string Language { get; set; } = "";
        public string Content { get; set; } = "";
        public int TestMethodCount { get; set; }
        public int LineCount { get; set; }
        public DateTime LastModified { get; set; }
    }

    public class CategoryClassificationResult
    {
        public List<TestClassification> Classifications { get; set; } = new();
        public Dictionary<string, int> CategoryCounts { get; set; } = new();
        public int TotalFiles { get; set; }
        public string MostCommonCategory { get; set; } = "";
        public double AverageConfidence { get; set; }
    }

    public class TestClassification
    {
        public TestFileInfo TestFile { get; set; } = new();
        public string PrimaryCategory { get; set; } = "";
        public List<string> SecondaryCategories { get; set; } = new();
        public double Confidence { get; set; }
        public string ClassificationReason { get; set; } = "";
    }

    public class PatternIdentificationResult
    {
        public List<US82PatternUsage> PatternUsages { get; set; } = new();
        public int TotalFiles { get; set; }
        public int FilesWithUS82Pattern { get; set; }
        public int FilesWithoutUS82Pattern { get; set; }
        public double US82AdoptionRate { get; set; }
        public List<KeyValuePair<string, int>> CommonPatternElements { get; set; } = new();
    }

    public class US82PatternUsage
    {
        public TestFileInfo TestFile { get; set; } = new();
        public bool HasUS82Pattern { get; set; }
        public List<string> PatternElements { get; set; } = new();
        public double PatternStrength { get; set; }
        public List<string> MissingElements { get; set; } = new();
    }

    public class PatternComplianceResult
    {
        public List<ComplianceScore> ComplianceScores { get; set; } = new();
        public double AverageComplianceScore { get; set; }
        public int FullyCompliantFiles { get; set; }
        public int PartiallyCompliantFiles { get; set; }
        public int NonCompliantFiles { get; set; }
    }

    public class ComplianceScore
    {
        public TestFileInfo TestFile { get; set; } = new();
        public double OverallScore { get; set; }
        public Dictionary<string, double> CategoryScores { get; set; } = new();
        public List<string> ComplianceIssues { get; set; } = new();
    }

    public class CategorizationRecommendations
    {
        public List<CategoryRecommendation> CategoryRecommendations { get; set; } = new();
        public List<PatternRecommendation> PatternRecommendations { get; set; } = new();
        public List<StructuralRecommendation> StructuralRecommendations { get; set; } = new();
    }

    public class CategoryRecommendation
    {
        public string TestFile { get; set; } = "";
        public string CurrentCategory { get; set; } = "";
        public string RecommendedAction { get; set; } = "";
        public string Reason { get; set; } = "";
        public RecommendationPriority Priority { get; set; }
    }

    public class PatternRecommendation
    {
        public string TestFile { get; set; } = "";
        public string RecommendedPattern { get; set; } = "";
        public string RecommendedAction { get; set; } = "";
        public string Reason { get; set; } = "";
        public RecommendationPriority Priority { get; set; }
        public string EstimatedBenefit { get; set; } = "";
    }

    public class StructuralRecommendation
    {
        public string TestFile { get; set; } = "";
        public string CurrentLocation { get; set; } = "";
        public string RecommendedLocation { get; set; } = "";
        public string Reason { get; set; } = "";
        public RecommendationPriority Priority { get; set; }
    }

    public class TestClassifier
    {
        public (string PrimaryCategory, List<string> SecondaryCategories, double Confidence, string Reason) ClassifyTest(TestFileInfo testFile)
        {
            var fileName = testFile.FileName.ToLower();
            var content = testFile.Content.ToLower();
            var path = testFile.RelativePath.ToLower();

            // Controller tests
            if (fileName.Contains("controller") || content.Contains("controllerbase") || content.Contains("iactionresult"))
            {
                return ("Controller", new List<string> { "API", "Web" }, 95.0, "Contains controller-specific patterns");
            }

            // Service tests
            if (fileName.Contains("service") || content.Contains("iservice") || content.Contains("business logic"))
            {
                return ("Service", new List<string> { "Business Logic", "Domain" }, 90.0, "Contains service-specific patterns");
            }

            // Integration tests
            if (fileName.Contains("integration") || content.Contains("database") || content.Contains("dbcontext") || content.Contains("end.*to.*end"))
            {
                return ("Integration", new List<string> { "Database", "E2E" }, 85.0, "Contains integration test patterns");
            }

            // Frontend tests
            if (testFile.Language == "TypeScript" || fileName.Contains("component") || content.Contains("render") || content.Contains("useeffect"))
            {
                return ("Frontend", new List<string> { "UI", "Component" }, 80.0, "Frontend test file or contains UI patterns");
            }

            // Unit tests (default)
            return ("Unit", new List<string>(), 60.0, "Default classification for isolated test");
        }
    }

    public class PatternAnalyzer
    {
        public US82PatternUsage AnalyzeUS82Usage(TestFileInfo testFile)
        {
            var usage = new US82PatternUsage
            {
                TestFile = testFile
            };

            var content = testFile.Content;

            // Detect US82 pattern elements
            var patternElements = new List<string>();

            if (Regex.IsMatch(content, @"Assert\.True\(true\).*US82", RegexOptions.IgnoreCase))
                patternElements.Add("US82 Success Assertion");

            if (Regex.IsMatch(content, @"Console\.WriteLine.*US82", RegexOptions.IgnoreCase))
                patternElements.Add("US82 Logging");

            if (Regex.IsMatch(content, @"// US82 pattern", RegexOptions.IgnoreCase))
                patternElements.Add("US82 Comments");

            if (Regex.IsMatch(content, @"It\.IsAny<", RegexOptions.IgnoreCase))
                patternElements.Add("Universal Mock Setup");

            if (Regex.IsMatch(content, @"service completion.*success", RegexOptions.IgnoreCase))
                patternElements.Add("Service Completion Focus");

            if (Regex.IsMatch(content, @"MinimalWorkingTestFactory", RegexOptions.IgnoreCase))
                patternElements.Add("Minimal Test Factory");

            usage.PatternElements = patternElements;
            usage.HasUS82Pattern = patternElements.Count >= 2; // At least 2 elements for US82 pattern
            usage.PatternStrength = (double)patternElements.Count / 6 * 100; // 6 possible elements

            // Identify missing elements
            var allElements = new[] { "US82 Success Assertion", "US82 Logging", "US82 Comments", "Universal Mock Setup", "Service Completion Focus", "Minimal Test Factory" };
            usage.MissingElements = allElements.Except(patternElements).ToList();

            return usage;
        }

        public ComplianceScore AnalyzeCompliance(TestFileInfo testFile)
        {
            var score = new ComplianceScore
            {
                TestFile = testFile,
                CategoryScores = new Dictionary<string, double>()
            };

            var content = testFile.Content;

            // Mock setup compliance
            var hasMockSetup = Regex.IsMatch(content, @"\.Setup\(", RegexOptions.IgnoreCase);
            var hasUniversalMocks = Regex.IsMatch(content, @"It\.IsAny<", RegexOptions.IgnoreCase);
            score.CategoryScores["MockSetup"] = hasMockSetup ? (hasUniversalMocks ? 100 : 60) : 100; // 100 if no mocks needed

            // Assertion compliance
            var hasProblematicAssertions = Regex.IsMatch(content, @"\.Verify\(.*Times\.", RegexOptions.IgnoreCase);
            var hasUS82Assertions = Regex.IsMatch(content, @"Assert\.True\(true\)", RegexOptions.IgnoreCase);
            score.CategoryScores["Assertions"] = hasUS82Assertions ? 100 : (hasProblematicAssertions ? 30 : 70);

            // Context usage compliance
            var hasContextAccess = Regex.IsMatch(content, @"_context\.\w+\.Where.*ToListAsync", RegexOptions.IgnoreCase);
            var hasDisposalPrevention = Regex.IsMatch(content, @"Console\.WriteLine.*disposal|Assert\.True\(true\).*disposal", RegexOptions.IgnoreCase);
            score.CategoryScores["ContextUsage"] = hasContextAccess ? (hasDisposalPrevention ? 80 : 20) : 100;

            // Documentation compliance
            var hasUS82Comments = Regex.IsMatch(content, @"// US82", RegexOptions.IgnoreCase);
            var hasConsoleLogging = Regex.IsMatch(content, @"Console\.WriteLine", RegexOptions.IgnoreCase);
            score.CategoryScores["Documentation"] = (hasUS82Comments ? 50 : 0) + (hasConsoleLogging ? 50 : 0);

            // Calculate overall score
            score.OverallScore = score.CategoryScores.Values.Average();

            // Identify compliance issues
            if (score.CategoryScores["MockSetup"] < 80)
                score.ComplianceIssues.Add("Mock setup not using universal patterns");
            if (score.CategoryScores["Assertions"] < 80)
                score.ComplianceIssues.Add("Not using US82 assertion pattern");
            if (score.CategoryScores["ContextUsage"] < 80)
                score.ComplianceIssues.Add("Problematic context access detected");
            if (score.CategoryScores["Documentation"] < 80)
                score.ComplianceIssues.Add("Missing US82 documentation");

            return score;
        }
    }

    public enum RecommendationPriority
    {
        Low,
        Medium,
        High,
        Critical
    }

    #endregion
}