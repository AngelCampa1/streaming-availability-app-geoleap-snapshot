using Xunit;

/// <summary>
/// Assembly-level configuration - DISABLED during timeout debugging
/// Custom orderers were causing test discovery timeouts
/// </summary>
// TEMPORARILY DISABLED: These custom orderers were causing test discovery to hang
// [assembly: TestCollectionOrderer(
//     "GeoLeap.Api.Tests.Infrastructure.ResourceOptimizedTestCollectionOrderer", 
//     "GeoLeap.Api.Tests")]

// [assembly: TestCaseOrderer(
//     "GeoLeap.Api.Tests.Infrastructure.ResourceOptimizedTestCaseOrderer", 
//     "GeoLeap.Api.Tests")]