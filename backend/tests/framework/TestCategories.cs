using System;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Test categorization constants for organizing test execution
    /// </summary>
    public static class TestCategories
    {
        /// <summary>
        /// Fast unit tests with no external dependencies (target: <50ms each)
        /// - Pure business logic
        /// - Value objects
        /// - Utility functions
        /// - Validation rules
        /// </summary>
        public const string Unit = "Unit";

        /// <summary>
        /// Integration tests with controlled dependencies (target: <500ms each)
        /// - Database operations (in-memory)
        /// - Service interactions
        /// - Repository patterns
        /// - Middleware components
        /// </summary>
        public const string Integration = "Integration";

        /// <summary>
        /// End-to-end tests with full application stack (target: <5s each)
        /// - Complete API workflows
        /// - Authentication flows
        /// - Business scenarios
        /// - Cross-service interactions
        /// </summary>
        public const string E2E = "E2E";

        /// <summary>
        /// Performance and load tests (run separately)
        /// - Load testing
        /// - Stress testing
        /// - Memory profiling
        /// - Concurrency tests
        /// </summary>
        public const string Performance = "Performance";

        /// <summary>
        /// Security-focused tests
        /// - Authentication bypass attempts
        /// - Authorization validations
        /// - Input sanitization
        /// - Data protection
        /// </summary>
        public const string Security = "Security";

        /// <summary>
        /// Smoke tests for quick validation
        /// - Basic connectivity
        /// - Essential endpoints
        /// - Configuration validation
        /// </summary>
        public const string Smoke = "Smoke";
    }

    /// <summary>
    /// Test priority levels for execution ordering
    /// </summary>
    public static class TestPriority
    {
        public const string Critical = "Critical";   // Must pass for deployment
        public const string High = "High";           // Important features
        public const string Medium = "Medium";       // Standard functionality
        public const string Low = "Low";             // Nice-to-have features
    }

    /// <summary>
    /// Test execution timeout policies
    /// </summary>
    public static class TestTimeouts
    {
        public static readonly TimeSpan Unit = TimeSpan.FromMilliseconds(100);
        public static readonly TimeSpan Integration = TimeSpan.FromSeconds(2);
        public static readonly TimeSpan E2E = TimeSpan.FromSeconds(10);
        public static readonly TimeSpan Performance = TimeSpan.FromMinutes(2);
        public static readonly TimeSpan Security = TimeSpan.FromSeconds(5);
        public static readonly TimeSpan Smoke = TimeSpan.FromSeconds(1);
    }
}