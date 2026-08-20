using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Disabled TMDb client - returns empty results for all operations.
/// TMDb has been removed in favor of using RapidAPI Streaming Availability only.
/// </summary>
public class DisabledTmdbClient : ITmdbClient
{
    private readonly ILogger<DisabledTmdbClient> _logger;

    public DisabledTmdbClient(ILogger<DisabledTmdbClient> logger)
    {
        _logger = logger;
    }

    public Task<SearchResponse<ContentMetadata>> SearchMultiAsync(
        string query,
        int page = 1,
        string language = "en-US",
        bool includeAdult = false)
    {
        _logger.LogDebug("TMDb disabled - SearchMultiAsync returning empty results for query: {Query}", query);
        return Task.FromResult(new SearchResponse<ContentMetadata>());
    }

    public Task<SearchResponse<ContentMetadata>> SearchMoviesAsync(
        string query,
        int page = 1,
        string language = "en-US",
        int? year = null,
        int? primaryReleaseYear = null,
        bool includeAdult = false)
    {
        _logger.LogDebug("TMDb disabled - SearchMoviesAsync returning empty results for query: {Query}", query);
        return Task.FromResult(new SearchResponse<ContentMetadata>());
    }

    public Task<SearchResponse<ContentMetadata>> SearchTvShowsAsync(
        string query,
        int page = 1,
        string language = "en-US",
        int? firstAirDateYear = null,
        bool includeAdult = false)
    {
        _logger.LogDebug("TMDb disabled - SearchTvShowsAsync returning empty results for query: {Query}", query);
        return Task.FromResult(new SearchResponse<ContentMetadata>());
    }

    public Task<ContentMetadata?> GetMovieDetailsAsync(
        int movieId,
        string language = "en-US",
        string? appendToResponse = "credits,external_ids")
    {
        _logger.LogDebug("TMDb disabled - GetMovieDetailsAsync returning null for movieId: {MovieId}", movieId);
        return Task.FromResult<ContentMetadata?>(null);
    }

    public Task<ContentMetadata?> GetTvShowDetailsAsync(
        int tvId,
        string language = "en-US",
        string? appendToResponse = "credits,external_ids")
    {
        _logger.LogDebug("TMDb disabled - GetTvShowDetailsAsync returning null for tvId: {TvId}", tvId);
        return Task.FromResult<ContentMetadata?>(null);
    }

    public Task<PersonDetails?> GetPersonDetailsAsync(
        int personId,
        string language = "en-US",
        string? appendToResponse = "external_ids")
    {
        _logger.LogDebug("TMDb disabled - GetPersonDetailsAsync returning null for personId: {PersonId}", personId);
        return Task.FromResult<PersonDetails?>(null);
    }

    public Task<List<Genre>> GetMovieGenresAsync(string language = "en-US")
    {
        _logger.LogDebug("TMDb disabled - GetMovieGenresAsync returning empty list");
        return Task.FromResult(new List<Genre>());
    }

    public Task<List<Genre>> GetTvGenresAsync(string language = "en-US")
    {
        _logger.LogDebug("TMDb disabled - GetTvGenresAsync returning empty list");
        return Task.FromResult(new List<Genre>());
    }

    public string GetImageUrl(string? imagePath, ImageSize size = ImageSize.Original)
    {
        // Return placeholder for any image requests
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return "/images/placeholder-poster.jpg";
        }

        // If the image path is already a full URL (from RapidAPI), return as-is
        if (imagePath.StartsWith("http://") || imagePath.StartsWith("https://"))
        {
            return imagePath;
        }

        return "/images/placeholder-poster.jpg";
    }

    public Task<TmdbConfiguration?> GetConfigurationAsync()
    {
        _logger.LogDebug("TMDb disabled - GetConfigurationAsync returning null");
        return Task.FromResult<TmdbConfiguration?>(null);
    }

    public Task<List<ContentMetadata>> GetPopularMoviesAsync(int page = 1, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("TMDb disabled - GetPopularMoviesAsync returning empty list");
        return Task.FromResult(new List<ContentMetadata>());
    }

    public Task<List<ContentMetadata>> GetPopularTvShowsAsync(int page = 1, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("TMDb disabled - GetPopularTvShowsAsync returning empty list");
        return Task.FromResult(new List<ContentMetadata>());
    }
}
