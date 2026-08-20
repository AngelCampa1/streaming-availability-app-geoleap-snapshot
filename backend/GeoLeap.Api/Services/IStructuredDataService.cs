using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for generating Schema.org structured data markup using JSON-LD format
/// </summary>
public interface IStructuredDataService
{
    /// <summary>
    /// Generate structured data for movie content
    /// </summary>
    Task<string> GenerateMovieStructuredDataAsync(ContentDetails movie, List<ContentStreamingOption>? streamingOptions = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for TV series content
    /// </summary>
    Task<string> GenerateTvSeriesStructuredDataAsync(ContentDetails tvSeries, List<ContentStreamingOption>? streamingOptions = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for search results page
    /// </summary>
    Task<string> GenerateSearchResultsStructuredDataAsync(ContentSearchResult searchResults, string searchQuery, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for website/organization
    /// </summary>
    Task<string> GenerateOrganizationStructuredDataAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for website navigation
    /// </summary>
    Task<string> GenerateWebsiteNavigationStructuredDataAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for FAQ pages
    /// </summary>
    Task<string> GenerateFaqStructuredDataAsync(List<FaqItem> faqItems, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for review/rating aggregate
    /// </summary>
    Task<string> GenerateAggregateRatingStructuredDataAsync(ContentDetails content, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate breadcrumb structured data
    /// </summary>
    Task<string> GenerateBreadcrumbStructuredDataAsync(List<BreadcrumbItem> breadcrumbs, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for streaming service availability
    /// </summary>
    Task<string> GenerateOfferStructuredDataAsync(ContentDetails content, List<ContentStreamingOption> streamingOptions, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate structured data for video object
    /// </summary>
    Task<string> GenerateVideoStructuredDataAsync(ContentDetails content, string? embedUrl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate structured data JSON-LD
    /// </summary>
    Task<StructuredDataValidationResult> ValidateStructuredDataAsync(string jsonLd, CancellationToken cancellationToken = default);

    /// <summary>
    /// Combine multiple structured data objects into single JSON-LD
    /// </summary>
    Task<string> CombineStructuredDataAsync(params string[] jsonLdObjects);
}

/// <summary>
/// FAQ item for structured data
/// </summary>
public class FaqItem
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}

/// <summary>
/// Breadcrumb item for structured data
/// </summary>
public class BreadcrumbItem
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int Position { get; set; }
}

/// <summary>
/// Structured data validation result
/// </summary>
public class StructuredDataValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public string? SchemaType { get; set; }
}