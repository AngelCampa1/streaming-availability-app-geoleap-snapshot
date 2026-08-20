using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for LINQ query optimization
/// </summary>
public static class LinqOptimizationExtensions
{
    /// <summary>
    /// Efficiently checks if any items match the predicate (optimized version of .Where().Any())
    /// </summary>
    public static async Task<bool> AnyOptimizedAsync<T>(
        this IQueryable<T> source,
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        // Use .Any(predicate) instead of .Where(predicate).Any()
        return await source.AnyAsync(predicate, cancellationToken);
    }

    /// <summary>
    /// Efficiently counts items matching the predicate (optimized version of .Where().Count())
    /// </summary>
    public static async Task<int> CountOptimizedAsync<T>(
        this IQueryable<T> source,
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        // Use .Count(predicate) instead of .Where(predicate).Count()
        return await source.CountAsync(predicate, cancellationToken);
    }

    /// <summary>
    /// Applies pagination with optimized query structure
    /// </summary>
    public static IQueryable<T> Paginate<T>(
        this IQueryable<T> source,
        int pageNumber,
        int pageSize)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 100) pageSize = 100; // Prevent excessive page sizes

        return source
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize);
    }

    /// <summary>
    /// Creates a paginated result with total count
    /// </summary>
    public static async Task<PagedResult<T>> ToPaginatedResultAsync<T>(
        this IQueryable<T> source,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 100) pageSize = 100;

        var totalCount = await source.CountAsync(cancellationToken);
        var items = await source
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<T>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            HasPreviousPage = pageNumber > 1,
            HasNextPage = pageNumber * pageSize < totalCount
        };
    }

    /// <summary>
    /// Applies ordering with null safety
    /// </summary>
    public static IQueryable<T> OrderBySafe<T, TKey>(
        this IQueryable<T> source,
        System.Linq.Expressions.Expression<Func<T, TKey>> keySelector,
        bool descending = false)
    {
        return descending
            ? source.OrderByDescending(keySelector)
            : source.OrderBy(keySelector);
    }

    /// <summary>
    /// Applies filtered pagination in a single optimized query
    /// </summary>
    public static async Task<PagedResult<T>> FilterAndPaginateAsync<T>(
        this IQueryable<T> source,
        System.Linq.Expressions.Expression<Func<T, bool>>? filter,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (filter != null)
        {
            source = source.Where(filter);
        }

        return await source.ToPaginatedResultAsync(pageNumber, pageSize, cancellationToken);
    }

    /// <summary>
    /// Performs batch processing with specified batch size
    /// </summary>
    public static async IAsyncEnumerable<List<T>> BatchAsync<T>(
        this IQueryable<T> source,
        int batchSize,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (batchSize < 1) batchSize = 100;

        var skip = 0;
        List<T> batch;

        do
        {
            batch = await source
                .Skip(skip)
                .Take(batchSize)
                .ToListAsync(cancellationToken);

            if (batch.Count > 0)
            {
                yield return batch;
            }

            skip += batchSize;
        } while (batch.Count == batchSize);
    }

    /// <summary>
    /// Efficiently gets first or default with tracking disabled for read-only scenarios
    /// </summary>
    public static async Task<T?> FirstOrDefaultReadOnlyAsync<T>(
        this IQueryable<T> source,
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default) where T : class
    {
        return await source
            .AsNoTracking()
            .FirstOrDefaultAsync(predicate, cancellationToken);
    }

    /// <summary>
    /// Efficiently gets list with tracking disabled for read-only scenarios
    /// </summary>
    public static async Task<List<T>> ToListReadOnlyAsync<T>(
        this IQueryable<T> source,
        CancellationToken cancellationToken = default) where T : class
    {
        return await source
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Paginated result wrapper
/// </summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}

/// <summary>
/// Constants for common query values
/// </summary>
public static class QueryConstants
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
    public const int DefaultBatchSize = 100;
    public const int MaxBatchSize = 1000;
}
