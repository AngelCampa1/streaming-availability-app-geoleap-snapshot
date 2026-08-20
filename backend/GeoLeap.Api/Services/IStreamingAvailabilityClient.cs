using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IStreamingAvailabilityClient
{
    Task<StreamingAvailabilityResponse> GetAvailabilityAsync(string contentId, ContentType contentType, CancellationToken cancellationToken = default);
    Task<SearchResponse<GlobalSearchResult>> SearchContentAsync(string query, ContentType? contentType = null, string[]? countries = null, int page = 1, int pageSize = 10, CancellationToken cancellationToken = default);
    Task<List<StreamingService>> GetSupportedServicesAsync(CancellationToken cancellationToken = default);
    Task<List<Country>> GetSupportedCountriesAsync(CancellationToken cancellationToken = default);
    Task<ApiUsageStats> GetUsageStatsAsync(CancellationToken cancellationToken = default);
    Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get detailed streaming availability for a show across all countries (VPN feature)
    /// </summary>
    Task<ShowStreamingDetails> GetShowDetailsAsync(string showId, List<string>? userServiceIds = null, string? userCountry = null, CancellationToken cancellationToken = default);
}