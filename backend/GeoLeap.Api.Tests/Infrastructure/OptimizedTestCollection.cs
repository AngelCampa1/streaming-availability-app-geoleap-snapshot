using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// PERFORMANCE OPTIMIZED: Test collection configuration for singleton factory pattern
/// Ensures proper parallel execution while maintaining test isolation
/// Uses shared MinimalWebApplicationFactory instance for maximum performance
/// </summary>
[CollectionDefinition("OptimizedMinimalTest")]
public class OptimizedTestCollection : ICollectionFixture<MinimalWebApplicationFactory>
{
    // This class has no code, and is never created. Its purpose is simply
    // to be the place to apply [CollectionDefinition] and all the
    // ICollectionFixture<> interfaces.
    
    // The MinimalWebApplicationFactory singleton will be shared across 
    // all tests in this collection for maximum performance
}

