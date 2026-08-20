using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test collection optimizer to prevent parallel execution issues
/// Forces all tests to run sequentially to eliminate resource contention
/// </summary>
[CollectionDefinition("NonParallel", DisableParallelization = true)]
public class NonParallelCollection
{
    // This class is just used as a marker for the collection definition
    // All tests marked with [Collection("NonParallel")] will run sequentially
}

/// <summary>
/// Fast collection for lightweight tests that can run quickly in sequence
/// </summary>
[CollectionDefinition("Fast", DisableParallelization = true)]
public class FastCollection
{
    // Collection for tests that should complete in under 5 seconds each
}

/// <summary>
/// Database collection for tests that use database operations
/// </summary>
[CollectionDefinition("Database", DisableParallelization = true)]
public class DatabaseCollection
{
    // Collection for tests that interact with the database
    // Prevents database locking issues in parallel execution
}