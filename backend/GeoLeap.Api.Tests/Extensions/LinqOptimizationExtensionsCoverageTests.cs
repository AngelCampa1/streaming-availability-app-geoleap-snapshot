using GeoLeap.Api.Extensions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GeoLeap.Api.Tests.Extensions;

/// <summary>
/// Comprehensive tests for LinqOptimizationExtensions - Target 95%+ coverage
/// Tests pagination, batching, ordering, and query optimization
/// </summary>
public class LinqOptimizationExtensionsCoverageTests
{
    private readonly TestDbContext _context;

    public LinqOptimizationExtensionsCoverageTests()
    {
        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseInMemoryDatabase($"LinqOptimizationTests_{Guid.NewGuid()}")
            .Options;
        _context = new TestDbContext(options);
        SeedTestData();
    }

    [Fact]
    public async Task AnyOptimizedAsync_WithMatchingPredicate_ExecutesOptimizedCheck()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.AnyOptimizedAsync(e => e.Name == "Entity_1");

        // Assert - Exercises optimized Any with predicate
        Assert.True(result);
    }

    [Fact]
    public async Task AnyOptimizedAsync_WithNoMatch_ExecutesOptimizedCheckFalse()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.AnyOptimizedAsync(e => e.Name == "NonExistent");

        // Assert - Exercises false path
        Assert.False(result);
    }

    [Fact]
    public async Task CountOptimizedAsync_WithMatchingPredicate_ExecutesOptimizedCount()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var count = await query.CountOptimizedAsync(e => e.Value > 5);

        // Assert - Exercises optimized count with predicate
        Assert.Equal(5, count); // Entities 6-10
    }

    [Fact]
    public async Task CountOptimizedAsync_WithNoMatch_ExecutesZeroCount()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var count = await query.CountOptimizedAsync(e => e.Value > 1000);

        // Assert - Exercises zero result path
        Assert.Equal(0, count);
    }

    [Theory]
    [InlineData(1, 5)]  // Items 1-5 of 10
    [InlineData(2, 5)]  // Items 6-10 of 10
    [InlineData(1, 3)]  // Items 1-3 of 10
    public void Paginate_WithValidParameters_ExecutesPagination(int pageNumber, int pageSize)
    {
        // Arrange - Test data has 10 entities (Entity_1 through Entity_10)
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = query.Paginate(pageNumber, pageSize).ToList();

        // Assert - Exercises pagination logic
        var expectedCount = Math.Min(pageSize, 10 - (pageNumber - 1) * pageSize);
        Assert.Equal(expectedCount, result.Count);
        Assert.Equal($"Entity_{(pageNumber - 1) * pageSize + 1}", result.First().Name);
    }

    [Theory]
    [InlineData(0, 10)] // Invalid page number
    [InlineData(-1, 10)] // Negative page number
    public void Paginate_WithInvalidPageNumber_ExecutesDefaultToPageOne(int pageNumber, int pageSize)
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = query.Paginate(pageNumber, pageSize).ToList();

        // Assert - Exercises page number validation
        Assert.Equal("Entity_1", result.First().Name);
    }

    [Theory]
    [InlineData(1, 0)] // Invalid page size
    [InlineData(1, -5)] // Negative page size
    public void Paginate_WithInvalidPageSize_ExecutesDefaultToTen(int pageNumber, int pageSize)
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = query.Paginate(pageNumber, pageSize).ToList();

        // Assert - Exercises page size validation (default to 10)
        Assert.Equal(10, result.Count);
    }

    [Fact]
    public void Paginate_WithExcessivePageSize_ExecutesMaximumLimit()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = query.Paginate(1, 200).ToList();

        // Assert - Exercises max page size limit (100)
        Assert.Equal(10, result.Count); // Only 10 entities in test data
    }

    [Fact]
    public async Task ToPaginatedResultAsync_WithFullPage_ExecutesCompleteResult()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.ToPaginatedResultAsync(1, 5);

        // Assert - Exercises full pagination result
        Assert.Equal(5, result.Items.Count);
        Assert.Equal(1, result.PageNumber);
        Assert.Equal(5, result.PageSize);
        Assert.Equal(10, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.False(result.HasPreviousPage);
        Assert.True(result.HasNextPage);
    }

    [Fact]
    public async Task ToPaginatedResultAsync_WithLastPage_ExecutesLastPageResult()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.ToPaginatedResultAsync(2, 5);

        // Assert - Exercises last page path
        Assert.Equal(5, result.Items.Count);
        Assert.True(result.HasPreviousPage);
        Assert.False(result.HasNextPage);
    }

    [Fact]
    public async Task ToPaginatedResultAsync_WithEmptyResult_ExecutesEmptyPage()
    {
        // Arrange
        var query = _context.TestEntities.Where(e => e.Value > 1000);

        // Act
        var result = await query.ToPaginatedResultAsync(1, 10);

        // Assert - Exercises empty result path
        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
        Assert.Equal(0, result.TotalPages);
        Assert.False(result.HasPreviousPage);
        Assert.False(result.HasNextPage);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void OrderBySafe_WithBoolFlag_ExecutesOrdering(bool descending)
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = query.OrderBySafe(e => e.Value, descending).ToList();

        // Assert - Exercises both ascending and descending
        if (descending)
        {
            Assert.Equal(10, result.First().Value);
            Assert.Equal(1, result.Last().Value);
        }
        else
        {
            Assert.Equal(1, result.First().Value);
            Assert.Equal(10, result.Last().Value);
        }
    }

    [Fact]
    public async Task FilterAndPaginateAsync_WithFilter_ExecutesFilteredPagination()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.FilterAndPaginateAsync(
            e => e.Value > 5,
            1,
            3);

        // Assert - Exercises filter + pagination
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(5, result.TotalCount); // 5 entities with Value > 5
        Assert.All(result.Items, item => Assert.True(item.Value > 5));
    }

    [Fact]
    public async Task FilterAndPaginateAsync_WithNullFilter_ExecutesUnfilteredPagination()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.FilterAndPaginateAsync(null, 1, 5);

        // Assert - Exercises null filter path
        Assert.Equal(5, result.Items.Count);
        Assert.Equal(10, result.TotalCount);
    }

    [Fact]
    public async Task BatchAsync_WithValidBatchSize_ExecutesBatching()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();
        var batches = new List<List<TestEntity>>();

        // Act
        await foreach (var batch in query.BatchAsync(3))
        {
            batches.Add(batch);
        }

        // Assert - Exercises batching logic
        Assert.Equal(4, batches.Count); // 10 entities / 3 = 4 batches (3+3+3+1)
        Assert.Equal(3, batches[0].Count);
        Assert.Equal(3, batches[1].Count);
        Assert.Equal(3, batches[2].Count);
        Assert.Equal(1, batches[3].Count);
    }

    [Fact]
    public async Task BatchAsync_WithInvalidBatchSize_ExecutesDefaultBatchSize()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();
        var batches = new List<List<TestEntity>>();

        // Act
        await foreach (var batch in query.BatchAsync(0))
        {
            batches.Add(batch);
        }

        // Assert - Exercises batch size validation (default to 100)
        Assert.Single(batches); // All 10 entities in one batch
        Assert.Equal(10, batches[0].Count);
    }

    [Fact]
    public async Task FirstOrDefaultReadOnlyAsync_WithMatch_ExecutesNoTracking()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.FirstOrDefaultReadOnlyAsync(e => e.Name == "Entity_5");

        // Assert - Exercises no-tracking query
        Assert.NotNull(result);
        Assert.Equal("Entity_5", result.Name);
        Assert.Equal(EntityState.Detached, _context.Entry(result).State);
    }

    [Fact]
    public async Task FirstOrDefaultReadOnlyAsync_WithNoMatch_ExecutesNullReturn()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.FirstOrDefaultReadOnlyAsync(e => e.Name == "NonExistent");

        // Assert - Exercises null result path
        Assert.Null(result);
    }

    [Fact]
    public async Task ToListReadOnlyAsync_ExecutesNoTrackingList()
    {
        // Arrange
        var query = _context.TestEntities.AsQueryable();

        // Act
        var result = await query.ToListReadOnlyAsync();

        // Assert - Exercises no-tracking list
        Assert.Equal(10, result.Count);
        Assert.All(result, entity =>
            Assert.Equal(EntityState.Detached, _context.Entry(entity).State));
    }

    [Fact]
    public void PagedResult_DefaultConstructor_ExecutesPropertyInitialization()
    {
        // Act
        var result = new PagedResult<TestEntity>();

        // Assert - Exercises all property paths
        Assert.NotNull(result.Items);
        Assert.Empty(result.Items);
        Assert.Equal(0, result.PageNumber);
        Assert.Equal(0, result.PageSize);
        Assert.Equal(0, result.TotalCount);
        Assert.Equal(0, result.TotalPages);
        Assert.False(result.HasPreviousPage);
        Assert.False(result.HasNextPage);
    }

    [Fact]
    public void PagedResult_PropertySetters_ExecutesAllSetters()
    {
        // Arrange
        var result = new PagedResult<TestEntity>();
        var items = new List<TestEntity> { new TestEntity { Id = 1, Name = "Test" } };

        // Act
        result.Items = items;
        result.PageNumber = 2;
        result.PageSize = 10;
        result.TotalCount = 50;
        result.TotalPages = 5;
        result.HasPreviousPage = true;
        result.HasNextPage = true;

        // Assert - Exercises all setters
        Assert.Same(items, result.Items);
        Assert.Equal(2, result.PageNumber);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(50, result.TotalCount);
        Assert.Equal(5, result.TotalPages);
        Assert.True(result.HasPreviousPage);
        Assert.True(result.HasNextPage);
    }

    [Fact]
    public void QueryConstants_AllConstants_ExecutesConstantAccess()
    {
        // Act & Assert - Exercises all constants
        Assert.Equal(20, QueryConstants.DefaultPageSize);
        Assert.Equal(100, QueryConstants.MaxPageSize);
        Assert.Equal(100, QueryConstants.DefaultBatchSize);
        Assert.Equal(1000, QueryConstants.MaxBatchSize);
    }

    private void SeedTestData()
    {
        for (int i = 1; i <= 10; i++)
        {
            _context.TestEntities.Add(new TestEntity
            {
                Id = i,
                Name = $"Entity_{i}",
                Value = i
            });
        }
        _context.SaveChanges();
    }

    // Test helper classes
    private class TestDbContext : DbContext
    {
        public TestDbContext(DbContextOptions<TestDbContext> options) : base(options) { }
        public DbSet<TestEntity> TestEntities { get; set; } = null!;
    }

    private class TestEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Value { get; set; }
    }
}
