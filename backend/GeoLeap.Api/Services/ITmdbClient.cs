using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Interface for The Movie Database (TMDb) API client
/// </summary>
public interface ITmdbClient
{
    /// <summary>
    /// Search for movies, TV shows, and people using multi-search endpoint
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="language">Language code (e.g., "en-US")</param>
    /// <param name="includeAdult">Include adult content in results</param>
    /// <returns>Search response containing mixed results</returns>
    Task<SearchResponse<ContentMetadata>> SearchMultiAsync(
        string query, 
        int page = 1, 
        string language = "en-US", 
        bool includeAdult = false);
    
    /// <summary>
    /// Search specifically for movies
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="language">Language code</param>
    /// <param name="year">Release year filter</param>
    /// <param name="primaryReleaseYear">Primary release year filter</param>
    /// <param name="includeAdult">Include adult content</param>
    /// <returns>Movie search results</returns>
    Task<SearchResponse<ContentMetadata>> SearchMoviesAsync(
        string query, 
        int page = 1, 
        string language = "en-US", 
        int? year = null,
        int? primaryReleaseYear = null,
        bool includeAdult = false);
    
    /// <summary>
    /// Search specifically for TV shows
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="language">Language code</param>
    /// <param name="firstAirDateYear">First air date year filter</param>
    /// <param name="includeAdult">Include adult content</param>
    /// <returns>TV show search results</returns>
    Task<SearchResponse<ContentMetadata>> SearchTvShowsAsync(
        string query, 
        int page = 1, 
        string language = "en-US", 
        int? firstAirDateYear = null,
        bool includeAdult = false);
    
    /// <summary>
    /// Get detailed information about a movie
    /// </summary>
    /// <param name="movieId">TMDb movie ID</param>
    /// <param name="language">Language code</param>
    /// <param name="appendToResponse">Additional data to include (credits, external_ids, etc.)</param>
    /// <returns>Detailed movie information</returns>
    Task<ContentMetadata?> GetMovieDetailsAsync(
        int movieId, 
        string language = "en-US", 
        string? appendToResponse = "credits,external_ids");
    
    /// <summary>
    /// Get detailed information about a TV show
    /// </summary>
    /// <param name="tvId">TMDb TV show ID</param>
    /// <param name="language">Language code</param>
    /// <param name="appendToResponse">Additional data to include</param>
    /// <returns>Detailed TV show information</returns>
    Task<ContentMetadata?> GetTvShowDetailsAsync(
        int tvId, 
        string language = "en-US", 
        string? appendToResponse = "credits,external_ids");
    
    /// <summary>
    /// Get detailed information about a person
    /// </summary>
    /// <param name="personId">TMDb person ID</param>
    /// <param name="language">Language code</param>
    /// <param name="appendToResponse">Additional data to include</param>
    /// <returns>Person details</returns>
    Task<PersonDetails?> GetPersonDetailsAsync(
        int personId, 
        string language = "en-US", 
        string? appendToResponse = "external_ids");
    
    /// <summary>
    /// Get list of movie genres
    /// </summary>
    /// <param name="language">Language code</param>
    /// <returns>List of movie genres</returns>
    Task<List<Genre>> GetMovieGenresAsync(string language = "en-US");
    
    /// <summary>
    /// Get list of TV show genres
    /// </summary>
    /// <param name="language">Language code</param>
    /// <returns>List of TV genres</returns>
    Task<List<Genre>> GetTvGenresAsync(string language = "en-US");
    
    /// <summary>
    /// Generate optimized image URL for TMDb images
    /// </summary>
    /// <param name="imagePath">Image path from TMDb (includes leading slash)</param>
    /// <param name="size">Image size</param>
    /// <returns>Complete image URL</returns>
    string GetImageUrl(string? imagePath, ImageSize size = ImageSize.Original);
    
    /// <summary>
    /// Get configuration information including image base URLs and available sizes
    /// </summary>
    /// <returns>TMDb configuration</returns>
    Task<TmdbConfiguration?> GetConfigurationAsync();

    /// <summary>
    /// Get popular movies
    /// </summary>
    /// <param name="page">Page number</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of popular movies</returns>
    Task<List<ContentMetadata>> GetPopularMoviesAsync(int page = 1, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get popular TV shows
    /// </summary>
    /// <param name="page">Page number</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of popular TV shows</returns>
    Task<List<ContentMetadata>> GetPopularTvShowsAsync(int page = 1, CancellationToken cancellationToken = default);
}

/// <summary>
/// TMDb API configuration response
/// </summary>
public class TmdbConfiguration
{
    public TmdbImageConfiguration? Images { get; set; }
    public List<string> ChangeKeys { get; set; } = new();
}

/// <summary>
/// TMDb image configuration
/// </summary>
public class TmdbImageConfiguration
{
    public string BaseUrl { get; set; } = string.Empty;
    public string SecureBaseUrl { get; set; } = string.Empty;
    public List<string> BackdropSizes { get; set; } = new();
    public List<string> LogoSizes { get; set; } = new();
    public List<string> PosterSizes { get; set; } = new();
    public List<string> ProfileSizes { get; set; } = new();
    public List<string> StillSizes { get; set; } = new();
}
