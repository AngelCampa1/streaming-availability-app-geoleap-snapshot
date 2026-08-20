using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit.Abstractions;

namespace GeoLeap.Tests.ValidationProtocol
{
    /// <summary>
    /// 📊 Test Conversion Validation Reporter
    /// 
    /// Generates comprehensive reports for test conversion validation:
    /// - Pre/Post conversion comparison
    /// - Quality gate status
    /// - Performance regression analysis
    /// - US82 pattern compliance metrics
    /// - Detailed validation findings
    /// </summary>
    public class ValidationReporter
    {
        private readonly ITestOutputHelper _output;
        private readonly string _reportsDirectory;

        public ValidationReporter(ITestOutputHelper output)
        {
            _output = output;
            _reportsDirectory = Path.Combine("/home/angel/GeoLeap", "tests", "validation-reports");
            
            // Ensure reports directory exists
            Directory.CreateDirectory(_reportsDirectory);
        }

        /// <summary>
        /// Generates comprehensive validation report for test conversion
        /// </summary>
        public void GenerateValidationReport(ConversionValidationResult result)
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd_HH-mm-ss");
            var reportFileName = $"Conversion_Validation_{result.Category}_{timestamp}.md";
            var reportPath = Path.Combine(_reportsDirectory, reportFileName);

            var report = GenerateMarkdownReport(result);
            
            // Write to file
            File.WriteAllText(reportPath, report);
            
            // Output to test console
            OutputToConsole(result);
            
            _output.WriteLine($"📊 Validation report generated: {reportPath}");
        }

        /// <summary>
        /// Generates executive summary report across all categories
        /// </summary>
        public void GenerateExecutiveSummary(List<ConversionValidationResult> results)
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd_HH-mm-ss");
            var reportFileName = $"Executive_Summary_{timestamp}.md";
            var reportPath = Path.Combine(_reportsDirectory, reportFileName);

            var report = GenerateExecutiveSummaryReport(results);
            
            File.WriteAllText(reportPath, report);
            
            _output.WriteLine($"📈 Executive summary generated: {reportPath}");
        }

        /// <summary>
        /// Generates detailed performance analysis report
        /// </summary>
        public void GeneratePerformanceReport(List<ConversionValidationResult> results)
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd_HH-mm-ss");
            var reportFileName = $"Performance_Analysis_{timestamp}.md";
            var reportPath = Path.Combine(_reportsDirectory, reportFileName);

            var report = GeneratePerformanceAnalysisReport(results);
            
            File.WriteAllText(reportPath, report);
            
            _output.WriteLine($"⚡ Performance report generated: {reportPath}");
        }

        #region Private Report Generation Methods

        private string GenerateMarkdownReport(ConversionValidationResult result)
        {
            var sb = new StringBuilder();
            
            // Header
            sb.AppendLine($"# 🧪 Test Conversion Validation Report");
            sb.AppendLine($"## {result.Category} Tests Conversion");
            sb.AppendLine();
            sb.AppendLine($"**Generated:** {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            sb.AppendLine($"**Category:** {result.Category}");
            sb.AppendLine($"**Success Rate:** {result.AchievedSuccessRate:F1}%");
            sb.AppendLine($"**Overall Status:** {(result.AllQualityGatesPassed ? "✅ PASSED" : "❌ FAILED")}");
            sb.AppendLine();

            // Executive Summary
            sb.AppendLine("## 🎯 Executive Summary");
            sb.AppendLine();
            if (result.AchievedSuccessRate >= 100.0)
            {
                sb.AppendLine($"🎉 **SUCCESS**: {result.Category} test conversion achieved 100% success rate target.");
                sb.AppendLine("All quality gates passed and US82 patterns implemented successfully.");
            }
            else
            {
                sb.AppendLine($"⚠️ **ATTENTION REQUIRED**: {result.Category} test conversion achieved {result.AchievedSuccessRate:F1}% success rate.");
                sb.AppendLine("Review quality gate failures and implement necessary fixes.");
            }
            sb.AppendLine();

            // Quality Gates Status
            sb.AppendLine("## 🚦 Quality Gates Status");
            sb.AppendLine();
            sb.AppendLine("| Gate | Status | Description |");
            sb.AppendLine("|------|--------|-------------|");
            
            foreach (var gate in result.QualityGates)
            {
                var status = gate.Value ? "✅ PASS" : "❌ FAIL";
                var description = GetQualityGateDescription(gate.Key);
                sb.AppendLine($"| {gate.Key} | {status} | {description} |");
            }
            sb.AppendLine();

            // US82 Pattern Analysis
            sb.AppendLine("## 🎯 US82 Pattern Analysis");
            sb.AppendLine();
            sb.AppendLine($"- **US82 Compliance:** {result.US82Compliance:F1}%");
            sb.AppendLine($"- **Factory Integration:** {result.FactoryIntegration:F1}%");
            sb.AppendLine($"- **Disposal Prevention:** {result.DisposalPrevention:F1}%");
            sb.AppendLine();

            // Performance Metrics
            if (result.PerformanceComparison != null)
            {
                sb.AppendLine("## ⚡ Performance Analysis");
                sb.AppendLine();
                sb.AppendLine($"- **Baseline Average:** {result.PerformanceComparison.BaselineAverage:F1}ms");
                sb.AppendLine($"- **Current Average:** {result.PerformanceComparison.CurrentAverage:F1}ms");
                sb.AppendLine($"- **Performance Change:** {result.PerformanceComparison.RegressionPercentage:F1}%");
                
                if (result.PerformanceComparison.RegressionPercentage > 0)
                {
                    sb.AppendLine($"- **Status:** ⚠️ Performance regression detected");
                }
                else
                {
                    sb.AppendLine($"- **Status:** ✅ Performance maintained or improved");
                }
                sb.AppendLine();
            }

            // Category-Specific Metrics
            AddCategorySpecificMetrics(sb, result);

            // Recommendations
            sb.AppendLine("## 💡 Recommendations");
            sb.AppendLine();
            AddRecommendations(sb, result);

            // Conclusion
            sb.AppendLine("## 🎯 Conclusion");
            sb.AppendLine();
            if (result.AllQualityGatesPassed && result.AchievedSuccessRate >= 100.0)
            {
                sb.AppendLine($"✅ **CONVERSION SUCCESSFUL**: {result.Category} tests have been successfully converted with 100% success rate.");
                sb.AppendLine("All quality gates passed and US82 patterns properly implemented.");
            }
            else
            {
                sb.AppendLine($"⚠️ **CONVERSION NEEDS ATTENTION**: {result.Category} tests require additional work to meet quality standards.");
                sb.AppendLine("Review failed quality gates and implement recommended fixes.");
            }
            sb.AppendLine();

            return sb.ToString();
        }

        private string GenerateExecutiveSummaryReport(List<ConversionValidationResult> results)
        {
            var sb = new StringBuilder();
            
            sb.AppendLine("# 📈 Test Conversion Executive Summary");
            sb.AppendLine();
            sb.AppendLine($"**Generated:** {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            sb.AppendLine($"**Categories Analyzed:** {results.Count}");
            sb.AppendLine();

            // Overall Statistics
            var overallSuccessRate = results.Average(r => r.AchievedSuccessRate);
            var passedCategories = results.Count(r => r.AllQualityGatesPassed);
            
            sb.AppendLine("## 🎯 Overall Results");
            sb.AppendLine();
            sb.AppendLine($"- **Overall Success Rate:** {overallSuccessRate:F1}%");
            sb.AppendLine($"- **Categories Passed:** {passedCategories}/{results.Count}");
            sb.AppendLine($"- **Quality Gate Success:** {(passedCategories * 100.0 / results.Count):F1}%");
            sb.AppendLine();

            // Category Breakdown
            sb.AppendLine("## 📊 Category Breakdown");
            sb.AppendLine();
            sb.AppendLine("| Category | Success Rate | Quality Gates | Status |");
            sb.AppendLine("|----------|--------------|---------------|--------|");
            
            foreach (var result in results.OrderByDescending(r => r.AchievedSuccessRate))
            {
                var gatesPassed = result.QualityGates.Values.Count(v => v);
                var totalGates = result.QualityGates.Count;
                var status = result.AllQualityGatesPassed ? "✅ PASS" : "❌ FAIL";
                
                sb.AppendLine($"| {result.Category} | {result.AchievedSuccessRate:F1}% | {gatesPassed}/{totalGates} | {status} |");
            }
            sb.AppendLine();

            // US82 Pattern Adoption
            sb.AppendLine("## 🎯 US82 Pattern Adoption");
            sb.AppendLine();
            var avgCompliance = results.Average(r => r.US82Compliance);
            var avgFactoryIntegration = results.Average(r => r.FactoryIntegration);
            var avgDisposalPrevention = results.Average(r => r.DisposalPrevention);
            
            sb.AppendLine($"- **Average US82 Compliance:** {avgCompliance:F1}%");
            sb.AppendLine($"- **Average Factory Integration:** {avgFactoryIntegration:F1}%");
            sb.AppendLine($"- **Average Disposal Prevention:** {avgDisposalPrevention:F1}%");
            sb.AppendLine();

            return sb.ToString();
        }

        private string GeneratePerformanceAnalysisReport(List<ConversionValidationResult> results)
        {
            var sb = new StringBuilder();
            
            sb.AppendLine("# ⚡ Performance Analysis Report");
            sb.AppendLine();
            sb.AppendLine($"**Generated:** {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            sb.AppendLine();

            // Performance Summary
            var resultsWithPerformance = results.Where(r => r.PerformanceComparison != null).ToList();
            
            if (resultsWithPerformance.Any())
            {
                sb.AppendLine("## 📊 Performance Summary");
                sb.AppendLine();
                
                var avgRegression = resultsWithPerformance.Average(r => r.PerformanceComparison.RegressionPercentage);
                var improvements = resultsWithPerformance.Count(r => r.PerformanceComparison.RegressionPercentage < 0);
                var regressions = resultsWithPerformance.Count(r => r.PerformanceComparison.RegressionPercentage > 10);
                
                sb.AppendLine($"- **Average Performance Change:** {avgRegression:F1}%");
                sb.AppendLine($"- **Performance Improvements:** {improvements}/{resultsWithPerformance.Count}");
                sb.AppendLine($"- **Significant Regressions (>10%):** {regressions}/{resultsWithPerformance.Count}");
                sb.AppendLine();

                // Detailed Performance Breakdown
                sb.AppendLine("## 📈 Detailed Performance Breakdown");
                sb.AppendLine();
                sb.AppendLine("| Category | Baseline (ms) | Current (ms) | Change (%) | Status |");
                sb.AppendLine("|----------|---------------|--------------|------------|--------|");
                
                foreach (var result in resultsWithPerformance)
                {
                    var perf = result.PerformanceComparison;
                    var status = perf.RegressionPercentage > 10 ? "⚠️ REGRESSION" : 
                                perf.RegressionPercentage < 0 ? "✅ IMPROVED" : "✅ STABLE";
                    
                    sb.AppendLine($"| {result.Category} | {perf.BaselineAverage:F1} | {perf.CurrentAverage:F1} | {perf.RegressionPercentage:F1}% | {status} |");
                }
                sb.AppendLine();
            }

            return sb.ToString();
        }

        private void AddCategorySpecificMetrics(StringBuilder sb, ConversionValidationResult result)
        {
            switch (result.Category.ToLower())
            {
                case "service":
                    sb.AppendLine("## 🔧 Service-Specific Metrics");
                    sb.AppendLine();
                    sb.AppendLine($"- **Factory Integration:** {result.FactoryIntegration:F1}%");
                    sb.AppendLine($"- **Disposal Prevention:** {result.DisposalPrevention:F1}%");
                    break;
                    
                case "integration":
                    sb.AppendLine("## 🔄 Integration-Specific Metrics");
                    sb.AppendLine();
                    sb.AppendLine($"- **E2E Workflow Validation:** {result.E2EWorkflowValidation:F1}%");
                    sb.AppendLine($"- **Database Operations:** {result.DatabaseOperationValidation:F1}%");
                    sb.AppendLine($"- **Async Operations:** {result.AsyncOperationValidation:F1}%");
                    sb.AppendLine($"- **Resource Management:** {result.ResourceManagementValidation:F1}%");
                    break;
                    
                case "controller":
                    sb.AppendLine("## 🎮 Controller-Specific Metrics");
                    sb.AppendLine();
                    sb.AppendLine($"- **Authentication Bypass:** {(result.QualityGates.GetValueOrDefault("NoAuthFailures", false) ? "✅ Working" : "❌ Issues")}");
                    sb.AppendLine($"- **Timeout Prevention:** {(result.QualityGates.GetValueOrDefault("NoTimeouts", false) ? "✅ Working" : "❌ Issues")}");
                    break;
            }
            sb.AppendLine();
        }

        private void AddRecommendations(StringBuilder sb, ConversionValidationResult result)
        {
            var recommendations = new List<string>();

            // Quality gate specific recommendations
            foreach (var gate in result.QualityGates.Where(g => !g.Value))
            {
                switch (gate.Key)
                {
                    case "SuccessRate":
                        recommendations.Add("🎯 **Improve Success Rate**: Review failing tests and apply US82 patterns consistently");
                        break;
                    case "ExecutionTime":
                        recommendations.Add("⚡ **Optimize Execution Time**: Review test setup and reduce unnecessary operations");
                        break;
                    case "NoDisposalExceptions":
                        recommendations.Add("🛡️ **Fix Disposal Issues**: Implement proper context lifecycle management and disposal prevention");
                        break;
                    case "NoAuthFailures":
                        recommendations.Add("🔐 **Fix Authentication**: Ensure proper authentication bypass patterns in tests");
                        break;
                    case "NoTimeouts":
                        recommendations.Add("⏰ **Prevent Timeouts**: Optimize test execution and reduce blocking operations");
                        break;
                }
            }

            // Pattern-specific recommendations
            if (result.US82Compliance < 80)
            {
                recommendations.Add("🎯 **Increase US82 Compliance**: Apply US82 patterns to more test methods for consistency");
            }

            if (result.FactoryIntegration < 70)
            {
                recommendations.Add("🏭 **Improve Factory Integration**: Use MinimalWorkingTestFactory for better test isolation");
            }

            // Performance recommendations
            if (result.PerformanceComparison?.RegressionPercentage > 10)
            {
                recommendations.Add("⚡ **Address Performance Regression**: Review conversion changes that may have impacted performance");
            }

            // Output recommendations
            if (recommendations.Any())
            {
                foreach (var recommendation in recommendations)
                {
                    sb.AppendLine($"- {recommendation}");
                }
            }
            else
            {
                sb.AppendLine("✅ **No specific recommendations**: All metrics are within acceptable ranges.");
            }
            sb.AppendLine();
        }

        private string GetQualityGateDescription(string gateName)
        {
            return gateName switch
            {
                "SuccessRate" => "100% test success rate requirement",
                "ExecutionTime" => "Tests complete within timeout limits",
                "NoDisposalExceptions" => "No ObjectDisposedException errors",
                "NoAuthFailures" => "No authentication failures (401 errors)",
                "NoTimeouts" => "No timeout-related failures",
                "DependencyInjection" => "Proper dependency injection resolution",
                "DatabaseOperations" => "Database operations work correctly",
                "AsyncHandling" => "Async operations handled properly",
                "PerformanceRegression" => "No significant performance regression",
                _ => "Quality gate validation"
            };
        }

        private void OutputToConsole(ConversionValidationResult result)
        {
            _output.WriteLine("");
            _output.WriteLine($"🧪 === {result.Category} TEST CONVERSION VALIDATION === 🧪");
            _output.WriteLine("");
            _output.WriteLine($"📊 Success Rate: {result.AchievedSuccessRate:F1}%");
            _output.WriteLine($"🚦 Quality Gates: {result.QualityGates.Values.Count(v => v)}/{result.QualityGates.Count} passed");
            _output.WriteLine($"🎯 Overall Status: {(result.AllQualityGatesPassed ? "✅ PASSED" : "❌ FAILED")}");
            _output.WriteLine("");
            
            // Quality Gates Summary
            _output.WriteLine("🚦 Quality Gates Detail:");
            foreach (var gate in result.QualityGates)
            {
                var status = gate.Value ? "✅ PASS" : "❌ FAIL";
                _output.WriteLine($"   {gate.Key}: {status}");
            }
            _output.WriteLine("");
            
            // US82 Metrics
            _output.WriteLine("🎯 US82 Pattern Metrics:");
            _output.WriteLine($"   Compliance: {result.US82Compliance:F1}%");
            _output.WriteLine($"   Factory Integration: {result.FactoryIntegration:F1}%");
            _output.WriteLine($"   Disposal Prevention: {result.DisposalPrevention:F1}%");
            _output.WriteLine("");
        }

        #endregion
    }
}