using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Data transformation service for normalizing provider-specific data to unified models
/// </summary>
public interface IDataTransformationService
{
    /// <summary>
    /// Transform provider search result to unified format
    /// </summary>
    Task<ContentSearchResult> TransformSearchResultAsync(ProviderSearchResult providerResult, ProviderType providerType, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Transform provider content details to unified format
    /// </summary>
    Task<ContentDetails> TransformContentDetailsAsync(ProviderContentDetails providerDetails, ProviderType providerType, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Transform provider streaming availability to unified format
    /// </summary>
    Task<StreamingAvailabilityResponse> TransformStreamingAvailabilityAsync(ProviderStreamingAvailability providerAvailability, ProviderType providerType, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Transform provider person details to unified format
    /// </summary>
    Task<PersonDetails> TransformPersonDetailsAsync(ProviderPersonDetails providerPerson, ProviderType providerType, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Merge multiple search results from different providers
    /// </summary>
    Task<ContentSearchResult> MergeSearchResultsAsync(List<ContentSearchResult> searchResults, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Merge streaming availability from multiple providers
    /// </summary>
    Task<StreamingAvailabilityResponse> MergeStreamingAvailabilityAsync(List<StreamingAvailabilityResponse> availabilityResults, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Normalize and deduplicate content results
    /// </summary>
    Task<List<ContentSummary>> DeduplicateContentAsync(List<ContentSummary> content, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Calculate confidence score for content matching between providers
    /// </summary>
    Task<double> CalculateContentMatchConfidenceAsync(ContentSummary content1, ContentSummary content2, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Enrich content data by combining information from multiple providers
    /// </summary>
    Task<ContentDetails> EnrichContentDetailsAsync(List<ContentDetails> contentDetails, CancellationToken cancellationToken = default);
}