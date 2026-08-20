using System;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// TEST CHUNKING STRATEGY: Strategic test categories for systematic execution
/// Allows running specific test subsets to identify working patterns and build confidence
/// </summary>

/// <summary>
/// PHASE 1: Infrastructure tests - Minimal dependencies, highest success probability
/// Tests basic application setup, database context, and core services
/// </summary>
public class InfrastructureTestAttribute : Attribute { }

/// <summary>
/// PHASE 2: Authentication tests - Isolated auth functionality
/// Tests authentication/authorization patterns in isolation
/// </summary>
public class AuthenticationTestAttribute : Attribute { }

/// <summary>
/// PHASE 3: Controller tests - API endpoint functionality
/// Tests controller logic with mocked dependencies
/// </summary>
public class ControllerTestAttribute : Attribute { }

/// <summary>
/// PHASE 4: Service tests - Business logic validation
/// Tests service layer functionality with controlled dependencies
/// </summary>
public class ServiceTestAttribute : Attribute { }

/// <summary>
/// PHASE 5: Integration tests - End-to-end functionality
/// Tests complete workflows across multiple components
/// </summary>
public class IntegrationTestAttribute : Attribute { }

/// <summary>
/// PHASE 6: Performance tests - Timing and optimization
/// Tests that measure performance characteristics
/// </summary>
public class PerformanceTestAttribute : Attribute { }

/// <summary>
/// Quick validation tests - Ultra-fast execution
/// Tests that complete in under 1 second for rapid feedback
/// </summary>
public class QuickTestAttribute : Attribute { }

/// <summary>
/// Working pattern tests - Known stable tests
/// Tests that have been validated to work consistently
/// </summary>
public class WorkingPatternAttribute : Attribute { }

/// <summary>
/// Critical path tests - Must-pass functionality
/// Tests covering essential user journeys and core business logic
/// </summary>
public class CriticalPathAttribute : Attribute { }

/// <summary>
/// Isolated tests - No external dependencies
/// Tests that run completely in isolation without network/file system access
/// </summary>
public class IsolatedTestAttribute : Attribute { }

/// <summary>
/// Critical path tests - Must-pass functionality
/// Tests covering essential user journeys and core business logic
/// </summary>
public class CriticalPathTestAttribute : Attribute { }