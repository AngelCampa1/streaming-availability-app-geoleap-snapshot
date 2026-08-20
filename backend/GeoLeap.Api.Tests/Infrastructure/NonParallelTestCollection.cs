using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test collection that prevents parallel execution
/// Used to solve resource contention issues where tests pass in isolation but fail when run together
/// All tests in this collection will run sequentially rather than in parallel
/// </summary>
[CollectionDefinition("NonParallel")]
public class NonParallelTestCollection : ICollectionFixture<object>
{
    // This class is intentionally empty.
    // It's used only to define the test collection and ensure tests run sequentially
}

/// <summary>
/// FINAL CONVERGENCE: Individual collections for maximum isolation
/// Each test class gets its own collection to prevent resource conflicts
/// </summary>

[CollectionDefinition("AdminControllerTests")]
public class AdminControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("AuthControllerTests")]
public class AuthControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("ContentControllerTests")]
public class ContentControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("HealthControllerTests")]
public class HealthControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("PaymentControllerTests")]
public class PaymentControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("SearchControllerTests")]
public class SearchControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("SubscriptionControllerTests")]
public class SubscriptionControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("TestControllerTests")]
public class TestControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("UserProfileControllerTests")]
public class UserProfileControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("WorkingTestControllerTests")]
public class WorkingTestControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("WorkingUserProfileControllerTests")]
public class WorkingUserProfileControllerTestCollection : ICollectionFixture<object> { }

[CollectionDefinition("WorkingSubscriptionControllerTests")]
public class WorkingSubscriptionControllerTestCollection : ICollectionFixture<object> { }

/// <summary>
/// MinimalTest collection for proven MinimalTestBase pattern tests
/// PERFORMANCE OPTIMIZED: Uses singleton MinimalWebApplicationFactory for sub-30-second execution
/// Eliminates database creation overhead while maintaining 100% test reliability
/// </summary>
[CollectionDefinition("MinimalTest")]
public class MinimalTestCollection : ICollectionFixture<MinimalWebApplicationFactory> { }

[CollectionDefinition("MinimalWorking")]
public class MinimalWorkingCollection : ICollectionFixture<object> { }