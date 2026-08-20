using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for handling localized content from TMDb API
/// </summary>
public interface ILocalizedContentService
{
    /// <summary>
    /// Get localized content metadata with fallback to English
    /// </summary>
    /// <param name="tmdbId">TMDb content ID</param>
    /// <param name="type">Content type (movie or TV)</param>
    /// <param name="language">Preferred language code</param>
    /// <param name="fallbackToEnglish">Whether to fallback to English if localized version is incomplete</param>
    /// <returns>Localized content metadata</returns>
    Task<ContentMetadata?> GetLocalizedContentAsync(
        int tmdbId, 
        TmdbContentType type, 
        string language = "en-US", 
        bool fallbackToEnglish = true);
    
    /// <summary>
    /// Get person details with localization support
    /// </summary>
    /// <param name="personId">TMDb person ID</param>
    /// <param name="language">Preferred language code</param>
    /// <param name="fallbackToEnglish">Whether to fallback to English</param>
    /// <returns>Localized person details</returns>
    Task<PersonDetails?> GetLocalizedPersonAsync(
        int personId, 
        string language = "en-US", 
        bool fallbackToEnglish = true);
    
    /// <summary>
    /// Search content with language preference
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="language">Preferred language</param>
    /// <param name="page">Page number</param>
    /// <param name="includeAdult">Include adult content</param>
    /// <returns>Localized search results</returns>
    Task<SearchResponse<ContentMetadata>> SearchLocalizedContentAsync(
        string query, 
        string language = "en-US", 
        int page = 1, 
        bool includeAdult = false);
    
    /// <summary>
    /// Get available languages for a specific content item
    /// </summary>
    /// <param name="tmdbId">TMDb content ID</param>
    /// <param name="type">Content type</param>
    /// <returns>List of available language codes</returns>
    Task<List<string>> GetAvailableLanguagesAsync(int tmdbId, TmdbContentType type);
    
    /// <summary>
    /// Get localized genres
    /// </summary>
    /// <param name="type">Content type (movie or TV)</param>
    /// <param name="language">Language code</param>
    /// <returns>Localized genre list</returns>
    Task<List<Genre>> GetLocalizedGenresAsync(TmdbContentType type, string language = "en-US");
    
    /// <summary>
    /// Merge localized content with English fallback for incomplete data
    /// </summary>
    /// <param name="localizedContent">Content in requested language</param>
    /// <param name="englishContent">English version as fallback</param>
    /// <returns>Merged content with best available data</returns>
    ContentMetadata MergeLocalizedContent(ContentMetadata? localizedContent, ContentMetadata? englishContent);
}

public class LocalizedContentService : ILocalizedContentService
{
    private readonly ITmdbClient _tmdbClient;
    private readonly ILogger<LocalizedContentService> _logger;
    
    // Languages that commonly have incomplete translations
    private static readonly HashSet<string> LanguagesWithLimitedData = new()
    {
        "ar", "hi", "ja", "ko", "ru", "th", "tr", "vi", "zh"
    };
    
    // Fields that are critical and should fallback to English if missing
    private static readonly string[] CriticalFields = 
    {
        nameof(ContentMetadata.Title),
        nameof(ContentMetadata.Overview)
    };

    public LocalizedContentService(ITmdbClient tmdbClient, ILogger<LocalizedContentService> logger)
    {
        _tmdbClient = tmdbClient;
        _logger = logger;
    }

    public async Task<ContentMetadata?> GetLocalizedContentAsync(
        int tmdbId, 
        TmdbContentType type, 
        string language = "en-US", 
        bool fallbackToEnglish = true)
    {
        try
        {
            ContentMetadata? localizedContent = null;
            ContentMetadata? englishContent = null;
            
            // Get English version (either as fallback or as the requested language)
            if (fallbackToEnglish || IsEnglish(language))
            {
                englishContent = type == TmdbContentType.Movie 
                    ? await _tmdbClient.GetMovieDetailsAsync(tmdbId, "en-US", "credits,external_ids")
                    : await _tmdbClient.GetTvShowDetailsAsync(tmdbId, "en-US", "credits,external_ids");
            }
            
            // Get localized version if not English
            if (!IsEnglish(language))
            {
                localizedContent = type == TmdbContentType.Movie
                    ? await _tmdbClient.GetMovieDetailsAsync(tmdbId, language, "credits,external_ids")
                    : await _tmdbClient.GetTvShowDetailsAsync(tmdbId, language, "credits,external_ids");
            }
            else
            {
                // If requested language is English, use the English content
                localizedContent = englishContent;
            }
            
            // Return merged content or fallback
            var result = fallbackToEnglish 
                ? MergeLocalizedContent(localizedContent, englishContent)
                : localizedContent ?? englishContent;
            
            if (result != null)
            {
                _logger.LogDebug("Retrieved localized content for TMDb ID {TmdbId} in language {Language}", 
                    tmdbId, language);
            }
            else
            {
                _logger.LogWarning("No content found for TMDb ID {TmdbId} in language {Language}", 
                    tmdbId, language);
            }
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving localized content for TMDb ID {TmdbId} in language {Language}", 
                tmdbId, language);
            return null;
        }
    }

    public async Task<PersonDetails?> GetLocalizedPersonAsync(
        int personId, 
        string language = "en-US", 
        bool fallbackToEnglish = true)
    {
        try
        {
            PersonDetails? localizedPerson = null;
            PersonDetails? englishPerson = null;
            
            // Always get English version for fallback
            if (fallbackToEnglish && !IsEnglish(language))
            {
                englishPerson = await _tmdbClient.GetPersonDetailsAsync(personId, "en-US", "external_ids");
            }
            
            // Get localized version if not English
            if (!IsEnglish(language))
            {
                localizedPerson = await _tmdbClient.GetPersonDetailsAsync(personId, language, "external_ids");
            }
            else
            {
                localizedPerson = englishPerson;
            }
            
            // Merge person details with fallback
            var result = fallbackToEnglish 
                ? MergeLocalizedPersonDetails(localizedPerson, englishPerson)
                : localizedPerson ?? englishPerson;
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving localized person for ID {PersonId} in language {Language}", 
                personId, language);
            return null;
        }
    }

    public async Task<SearchResponse<ContentMetadata>> SearchLocalizedContentAsync(
        string query, 
        string language = "en-US", 
        int page = 1, 
        bool includeAdult = false)
    {
        try
        {
            var searchResults = await _tmdbClient.SearchMultiAsync(query, page, language, includeAdult);
            
            _logger.LogDebug("Localized search completed for query '{Query}' in language {Language}, found {ResultCount} results", 
                query, language, searchResults.Results.Count);
            
            return searchResults;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in localized search for query '{Query}' in language {Language}", 
                query, language);
            return new SearchResponse<ContentMetadata>();
        }
    }

    public async Task<List<string>> GetAvailableLanguagesAsync(int tmdbId, TmdbContentType type)
    {
        // This would typically call a TMDb endpoint that returns translation info
        // For now, we'll return common languages as TMDb doesn't have a direct endpoint for this
        try
        {
            // Try to get content in a few common languages to see what's available
            var commonLanguages = new[] { "en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "ja-JP", "ko-KR", "zh-CN" };
            var availableLanguages = new List<string>();
            
            foreach (var lang in commonLanguages)
            {
                try
                {
                    var content = type == TmdbContentType.Movie
                        ? await _tmdbClient.GetMovieDetailsAsync(tmdbId, lang, "credits,external_ids")
                        : await _tmdbClient.GetTvShowDetailsAsync(tmdbId, lang, "credits,external_ids");
                    
                    if (content != null && !string.IsNullOrWhiteSpace(content.Title))
                    {
                        availableLanguages.Add(lang);
                    }
                }
                catch
                {
                    // Language not available, continue
                }
            }
            
            _logger.LogDebug("Found {LanguageCount} available languages for TMDb ID {TmdbId}", 
                availableLanguages.Count, tmdbId);
            
            return availableLanguages;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available languages for TMDb ID {TmdbId}", tmdbId);
            return new List<string> { "en-US" }; // Default to English
        }
    }

    public async Task<List<Genre>> GetLocalizedGenresAsync(TmdbContentType type, string language = "en-US")
    {
        try
        {
            var genres = type == TmdbContentType.Movie
                ? await _tmdbClient.GetMovieGenresAsync(language)
                : await _tmdbClient.GetTvGenresAsync(language);
            
            _logger.LogDebug("Retrieved {GenreCount} {Type} genres in language {Language}", 
                genres.Count, type, language);
            
            return genres;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving localized genres for type {Type} in language {Language}", 
                type, language);
            
            // Fallback to English if localized genres fail
            if (!IsEnglish(language))
            {
                return await GetLocalizedGenresAsync(type, "en-US");
            }
            
            return new List<Genre>();
        }
    }

    public ContentMetadata MergeLocalizedContent(ContentMetadata? localizedContent, ContentMetadata? englishContent)
    {
        // If no localized content, return English
        if (localizedContent == null)
        {
            return englishContent ?? new ContentMetadata();
        }
        
        // If no English content, return localized
        if (englishContent == null)
        {
            return localizedContent;
        }
        
        // Merge localized with English fallback
        var merged = new ContentMetadata
        {
            TmdbId = localizedContent.TmdbId,
            Type = localizedContent.Type,
            
            // Use localized title if available, otherwise English
            Title = !string.IsNullOrWhiteSpace(localizedContent.Title) 
                ? localizedContent.Title 
                : englishContent.Title,
            
            // Original title should remain consistent
            OriginalTitle = localizedContent.OriginalTitle ?? englishContent.OriginalTitle,
            
            // Use localized overview if available and substantial
            Overview = (!string.IsNullOrWhiteSpace(localizedContent.Overview) && localizedContent.Overview.Length > 50)
                ? localizedContent.Overview 
                : englishContent.Overview,
            
            // Technical details should be the same across languages
            ReleaseDate = localizedContent.ReleaseDate ?? englishContent.ReleaseDate,
            Runtime = localizedContent.Runtime ?? englishContent.Runtime,
            NumberOfSeasons = localizedContent.NumberOfSeasons ?? englishContent.NumberOfSeasons,
            NumberOfEpisodes = localizedContent.NumberOfEpisodes ?? englishContent.NumberOfEpisodes,
            
            // Ratings and popularity should be consistent
            VoteAverage = localizedContent.VoteAverage ?? englishContent.VoteAverage,
            VoteCount = localizedContent.VoteCount > 0 ? localizedContent.VoteCount : englishContent.VoteCount,
            Popularity = localizedContent.Popularity ?? englishContent.Popularity,
            
            // Image paths should be consistent
            PosterPath = localizedContent.PosterPath ?? englishContent.PosterPath,
            BackdropPath = localizedContent.BackdropPath ?? englishContent.BackdropPath,
            
            // Use localized genres if available
            Genres = localizedContent.Genres.Any() ? localizedContent.Genres : englishContent.Genres,
            
            // Production info might vary by language
            ProductionCountries = localizedContent.ProductionCountries.Any() 
                ? localizedContent.ProductionCountries 
                : englishContent.ProductionCountries,
            
            OriginalLanguages = localizedContent.OriginalLanguages.Any() 
                ? localizedContent.OriginalLanguages 
                : englishContent.OriginalLanguages,
            
            OriginalLanguage = localizedContent.OriginalLanguage ?? englishContent.OriginalLanguage,
            
            // Technical details
            Adult = localizedContent.Adult || englishContent.Adult,
            Budget = localizedContent.Budget ?? englishContent.Budget,
            Revenue = localizedContent.Revenue ?? englishContent.Revenue,
            Status = localizedContent.Status ?? englishContent.Status,
            
            // Use localized tagline if available
            Tagline = !string.IsNullOrWhiteSpace(localizedContent.Tagline) 
                ? localizedContent.Tagline 
                : englishContent.Tagline,
            
            Homepage = localizedContent.Homepage ?? englishContent.Homepage,
            
            // Cast and crew should be merged carefully
            Cast = MergeCastAndCrew(localizedContent.Cast, englishContent.Cast),
            Crew = MergeCastAndCrew(localizedContent.Crew, englishContent.Crew),
            
            // External IDs should be consistent
            ExternalIds = localizedContent.ExternalIds.Any() ? localizedContent.ExternalIds : englishContent.ExternalIds
        };
        
        return merged;
    }

    #region Private Helper Methods

    private bool IsEnglish(string language)
    {
        return language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
    }

    private bool IsContentComplete(ContentMetadata content)
    {
        // Check if content has essential fields filled
        return !string.IsNullOrWhiteSpace(content.Title) &&
               !string.IsNullOrWhiteSpace(content.Overview) &&
               content.Overview.Length > 50 && // Substantial overview
               content.Genres.Any();
    }

    private PersonDetails? MergeLocalizedPersonDetails(PersonDetails? localized, PersonDetails? english)
    {
        if (localized == null) return english;
        if (english == null) return localized;
        
        return new PersonDetails
        {
            Id = localized.Id,
            Name = !string.IsNullOrWhiteSpace(localized.Name) ? localized.Name : english.Name,
            Biography = (!string.IsNullOrWhiteSpace(localized.Biography) && localized.Biography.Length > 100)
                ? localized.Biography
                : english.Biography,
            Birthday = localized.Birthday ?? english.Birthday,
            Deathday = localized.Deathday ?? english.Deathday,
            Gender = localized.Gender ?? english.Gender,
            Homepage = localized.Homepage ?? english.Homepage,
            PlaceOfBirth = localized.PlaceOfBirth ?? english.PlaceOfBirth,
            ProfilePath = localized.ProfilePath ?? english.ProfilePath,
            AlsoKnownAs = localized.AlsoKnownAs.Any() ? localized.AlsoKnownAs : english.AlsoKnownAs,
            Popularity = localized.Popularity ?? english.Popularity,
            KnownForDepartment = localized.KnownForDepartment ?? english.KnownForDepartment,
            ExternalIds = localized.ExternalIds.Any() ? localized.ExternalIds : english.ExternalIds
        };
    }

    private List<T> MergeCastAndCrew<T>(List<T> localized, List<T> english) where T : class
    {
        // For cast and crew, prefer the version with more complete data
        if (localized.Any())
        {
            return localized;
        }
        
        return english;
    }

    #endregion
}