using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

/// <summary>
/// Service for calculating language compatibility scores and ranking VPN recommendations based on language preferences
/// </summary>
public interface IVpnLanguageRecommendationService
{
    /// <summary>
    /// Calculates a language compatibility score (0.0-1.0) based on audio and subtitle availability
    /// </summary>
    /// <param name="availableAudio">List of available audio languages for the content</param>
    /// <param name="availableSubs">List of available subtitle languages for the content</param>
    /// <param name="preferredAudio">User's preferred audio languages (ordered by priority)</param>
    /// <param name="preferredSubs">User's preferred subtitle languages (ordered by priority)</param>
    /// <returns>Score from 0.0 (no match) to 1.0 (perfect match)</returns>
    double CalculateLanguageScore(
        List<string> availableAudio,
        List<string> availableSubs,
        List<string> preferredAudio,
        List<string> preferredSubs);

    /// <summary>
    /// Ranks VPN recommendations by combining language compatibility with VPN quality scores
    /// </summary>
    /// <param name="recommendations">List of VPN recommendations to rank</param>
    /// <param name="contentId">ID of the content being accessed</param>
    /// <param name="preferredAudio">User's preferred audio languages</param>
    /// <param name="preferredSubs">User's preferred subtitle languages</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Reordered list of recommendations ranked by language+VPN score</returns>
    Task<List<VpnRecommendationDto>> RankVpnRecommendationsByLanguageAsync(
        List<VpnRecommendationDto> recommendations,
        string contentId,
        List<string> preferredAudio,
        List<string> preferredSubs,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates user-friendly warning messages about language availability
    /// </summary>
    /// <param name="availableAudio">Available audio languages</param>
    /// <param name="availableSubs">Available subtitle languages</param>
    /// <param name="preferredAudio">Preferred audio languages</param>
    /// <param name="preferredSubs">Preferred subtitle languages</param>
    /// <returns>List of warning messages (empty if no issues)</returns>
    List<string> GetLanguageAvailabilityWarnings(
        List<string> availableAudio,
        List<string> availableSubs,
        List<string> preferredAudio,
        List<string> preferredSubs);

    /// <summary>
    /// Gets content-specific VPN recommendations with language compatibility
    /// </summary>
    /// <param name="contentId">ID of the content to access</param>
    /// <param name="audioLanguages">Preferred audio languages</param>
    /// <param name="subtitleLanguages">Preferred subtitle languages</param>
    /// <param name="contentType">Type of content (movie/tv)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Content-specific VPN recommendations with language scores</returns>
    Task<ContentVpnRecommendationDto?> GetContentVpnRecommendationsAsync(
        string contentId,
        List<string>? audioLanguages,
        List<string>? subtitleLanguages,
        string? contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets country recommendations for content with VPN providers as secondary information (NEW: country-first approach)
    /// </summary>
    /// <param name="contentId">ID of the content to access</param>
    /// <param name="audioLanguages">Preferred audio languages</param>
    /// <param name="subtitleLanguages">Preferred subtitle languages</param>
    /// <param name="streamingService">Optional filter for specific streaming service</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Countries ranked by language match with available VPN providers</returns>
    Task<ContentCountryRecommendationsDto?> GetCountryRecommendationsForContentAsync(
        string contentId,
        List<string>? audioLanguages,
        List<string>? subtitleLanguages,
        string? streamingService = null,
        CancellationToken cancellationToken = default);
}
