using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing advanced filtering capabilities in search operations
/// </summary>
public interface IAdvancedFilterService
{
    /// <summary>
    /// Validates a global search request's filter parameters
    /// </summary>
    /// <param name="request">The search request to validate</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    /// <returns>Validation result with errors and warnings</returns>
    Task<FilterValidationResult> ValidateFiltersAsync(GlobalSearchRequest request, string correlationId);
    
    /// <summary>
    /// Gets available filter options based on current search context
    /// </summary>
    /// <param name="request">Filter options request</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    /// <returns>Available filter options with counts</returns>
    Task<FilterOptionsResponse> GetFilterOptionsAsync(FilterOptionsRequest request, string correlationId);
    
    /// <summary>
    /// Applies advanced filters to a search query
    /// </summary>
    /// <param name="query">Base search query</param>
    /// <param name="request">Search request with filters</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    /// <returns>Modified query with filters applied</returns>
    Task<IQueryable<SearchableContent>> ApplyAdvancedFiltersAsync(
        IQueryable<SearchableContent> query, 
        GlobalSearchRequest request, 
        string correlationId);
    
    /// <summary>
    /// Generates filter suggestions to improve search results
    /// </summary>
    /// <param name="request">Search request</param>
    /// <param name="resultCount">Current result count</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    /// <returns>List of filter suggestions</returns>
    Task<List<FilterSuggestion>> GenerateFilterSuggestionsAsync(
        GlobalSearchRequest request, 
        int resultCount, 
        string correlationId);
    
    /// <summary>
    /// Analyzes applied filters and generates summary information
    /// </summary>
    /// <param name="request">Search request with filters</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    /// <returns>Applied filters analysis</returns>
    Task<AppliedFiltersInfo> AnalyzeAppliedFiltersAsync(GlobalSearchRequest request, string correlationId);
    
    /// <summary>
    /// Optimizes filter combinations for better performance
    /// </summary>
    /// <param name="request">Search request with filters</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    /// <returns>Optimized search request</returns>
    Task<GlobalSearchRequest> OptimizeFiltersAsync(GlobalSearchRequest request, string correlationId);
    
    /// <summary>
    /// Tracks filter usage analytics for optimization
    /// </summary>
    /// <param name="request">Search request with filters</param>
    /// <param name="resultCount">Number of results returned</param>
    /// <param name="executionTime">Query execution time</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    Task TrackFilterUsageAsync(
        GlobalSearchRequest request, 
        int resultCount, 
        TimeSpan executionTime, 
        string correlationId);
    
    /// <summary>
    /// Clears cached filter options
    /// </summary>
    /// <param name="cacheKeys">Specific cache keys to clear, or null for all</param>
    /// <param name="correlationId">Correlation ID for logging</param>
    Task InvalidateFilterCacheAsync(List<string>? cacheKeys, string correlationId);
}