using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for generating and managing SEO metadata with keyword optimization
/// </summary>
public partial class SeoMetadataService : ISeoMetadataService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SeoMetadataService> _logger;
    private readonly ISearchAnalyticsService _searchAnalytics;
    private readonly IConfiguration _configuration;

    private static readonly Dictionary<string, List<string>> GenreKeywords = new()
    {
        { "action", new() { "action movies", "action films", "thriller", "adventure", "explosions", "fight scenes" } },
        { "comedy", new() { "comedy movies", "funny films", "humor", "laughs", "entertainment", "family fun" } },
        { "drama", new() { "drama movies", "dramatic films", "emotional", "character-driven", "award-winning" } },
        { "horror", new() { "horror movies", "scary films", "thriller", "suspense", "supernatural", "frightening" } },
        { "romance", new() { "romantic movies", "love stories", "romantic comedy", "date night", "relationships" } },
        { "sci-fi", new() { "science fiction", "sci-fi movies", "futuristic", "space", "technology", "aliens" } },
        { "fantasy", new() { "fantasy movies", "magical", "adventure", "mythical", "supernatural powers" } },
        { "documentary", new() { "documentaries", "real stories", "educational", "factual", "non-fiction" } }
    };

    private static readonly Dictionary<string, decimal> ContentTypePriority = new()
    {
        { "movie", 0.8m },
        { "tv-show", 0.8m },
        { "genre", 0.6m },
        { "search", 0.4m },
        { "home", 1.0m },
        { "about", 0.3m },
        { "privacy", 0.2m },
        { "terms", 0.2m }
    };

    [GeneratedRegex(@"[^\w\s-]", RegexOptions.Compiled)]
    private static partial Regex NonAlphanumericRegex();

    [GeneratedRegex(@"\s+", RegexOptions.Compiled)]
    private static partial Regex WhitespaceRegex();

    [GeneratedRegex(@"-+", RegexOptions.Compiled)]
    private static partial Regex DashRegex();

    public SeoMetadataService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<SeoMetadataService> logger,
        ISearchAnalyticsService searchAnalytics,
        IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _searchAnalytics = searchAnalytics;
        _configuration = configuration;
    }

    public async Task<SeoMetadataResponse> GenerateMetadataAsync(SeoMetadataRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = new SeoMetadataResponse();
            var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";

            // Generate optimized title
            response.Title = await GenerateOptimizedTitleAsync(request.Title, request.ContentType, request.Keywords);

            // Generate meta description
            response.Description = await GenerateOptimizedDescriptionAsync(
                request.Description ?? request.Title,
                request.ContentType,
                request.Keywords);

            // Optimize keywords
            var optimizedKeywords = await OptimizeKeywordsAsync(
                $"{request.Title} {request.Description}",
                request.Keywords);
            response.Keywords = string.Join(", ", optimizedKeywords);

            // Set canonical URL
            response.CanonicalUrl = request.CanonicalUrl ?? 
                GenerateCanonicalUrl(request.ContentType, request.Slug, request.Language);

            // Generate Open Graph metadata
            response.OpenGraphData = GenerateOpenGraphMetadata(response.Title, response.Description, request.ContentType, baseUrl);

            // Generate Twitter metadata
            response.TwitterCardData = GenerateTwitterMetadata(response.Title, response.Description);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating SEO metadata for {ContentType}: {Title}", 
                request.ContentType, request.Title);
            throw;
        }
    }

    public async Task<SeoMetadataResponse> GenerateContentMetadataAsync(ContentDetails content, string? language = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new SeoMetadataRequest
            {
                ContentId = content.Id != 0 ? Guid.NewGuid() : null,
                ContentType = content.Type.ToString().ToLower(),
                Title = content.Title,
                Description = content.Overview,
                Keywords = ExtractContentKeywords(content),
                Language = language ?? "en-US"
            };

            // Generate slug from title
            request.Slug = GenerateSlug(content.Title);

            var response = await GenerateMetadataAsync(request, cancellationToken);

            // Add structured data for content
            response.StructuredData = await GenerateStructuredDataAsync(content, cancellationToken);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating content metadata for {ContentId}: {Title}", 
                content.Id, content.Title);
            throw;
        }
    }

    public async Task<SeoMetadataResponse> GenerateSearchMetadataAsync(string query, string? genre = null, int? year = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var titleParts = new List<string> { $"Watch {query}" };
            var keywords = new List<string> { query.ToLower() };

            if (!string.IsNullOrEmpty(genre))
            {
                titleParts.Add($"{genre} movies");
                keywords.AddRange(GenreKeywords.GetValueOrDefault(genre.ToLower(), new()));
            }

            if (year.HasValue)
            {
                titleParts.Add($"({year.Value})");
                keywords.Add(year.Value.ToString());
            }

            titleParts.Add("| GeoLeap");

            var title = string.Join(" ", titleParts);
            var description = $"Find where to watch {query}";
            
            if (!string.IsNullOrEmpty(genre))
                description += $" {genre}";
            
            if (year.HasValue)
                description += $" from {year.Value}";
                
            description += " online. Compare streaming services and find the best deals.";

            var request = new SeoMetadataRequest
            {
                ContentType = "search",
                Title = title,
                Description = description,
                Keywords = keywords,
                Slug = GenerateSlug($"search-{query}-{genre}-{year}")
            };

            return await GenerateMetadataAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating search metadata for query: {Query}", query);
            throw;
        }
    }

    public async Task<SeoMetadataResponse> GenerateGenreMetadataAsync(string genre, string? language = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var title = $"Best {CultureInfo.CurrentCulture.TextInfo.ToTitleCase(genre.ToLower())} Movies & TV Shows to Watch | GeoLeap";
            var description = $"Discover the best {genre.ToLower()} movies and TV shows. Find where to watch your favorite {genre.ToLower()} content across all streaming platforms.";
            
            var keywords = new List<string> 
            { 
                $"{genre.ToLower()} movies",
                $"{genre.ToLower()} tv shows",
                $"best {genre.ToLower()}",
                "streaming",
                "watch online"
            };

            if (GenreKeywords.TryGetValue(genre.ToLower(), out var genreSpecificKeywords))
            {
                keywords.AddRange(genreSpecificKeywords);
            }

            var request = new SeoMetadataRequest
            {
                ContentType = "genre",
                Title = title,
                Description = description,
                Keywords = keywords,
                Slug = GenerateSlug($"genre-{genre}"),
                Language = language ?? "en-US"
            };

            return await GenerateMetadataAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating genre metadata for: {Genre}", genre);
            throw;
        }
    }

    public async Task<List<string>> OptimizeKeywordsAsync(string content, List<string>? existingKeywords = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var keywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            
            // Add existing keywords
            if (existingKeywords?.Any() == true)
            {
                foreach (var keyword in existingKeywords)
                {
                    keywords.Add(keyword.Trim().ToLower());
                }
            }

            // Extract keywords from content
            var extractedKeywords = await ExtractKeywordsFromTextAsync(content);
            foreach (var keyword in extractedKeywords)
            {
                keywords.Add(keyword);
            }

            // Get trending keywords from search analytics
            try
            {
                var trendingKeywords = await GetTrendingKeywordsAsync(cancellationToken);
                foreach (var keyword in trendingKeywords.Take(5))
                {
                    if (content.Contains(keyword.Key, StringComparison.OrdinalIgnoreCase))
                    {
                        keywords.Add(keyword.Key);
                    }
                }
            }
            catch
            {
                // If search analytics is not available, continue without trending keywords
            }

            // Add streaming-related keywords
            var streamingKeywords = new[] 
            { 
                "streaming", "watch online", "free movies", "tv shows", 
                "netflix", "amazon prime", "hulu", "disney plus" 
            };

            foreach (var keyword in streamingKeywords)
            {
                if (content.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    keywords.Add(keyword);
                }
            }

            // Limit to top 15 keywords
            return keywords.Take(15).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing keywords for content");
            return existingKeywords ?? new List<string>();
        }
    }

    public string GenerateCanonicalUrl(string contentType, string slug, string? language = null)
    {
        var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
        var urlBuilder = new StringBuilder(baseUrl.TrimEnd('/'));

        // Always include language if provided (test expects this format)
        if (!string.IsNullOrEmpty(language))
        {
            urlBuilder.Append($"/{language}");
        }

        urlBuilder.Append($"/{contentType}/{slug}");

        return urlBuilder.ToString();
    }

    public async Task<SeoMetadata> SaveMetadataAsync(SeoMetadataRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var metadata = new SeoMetadata
            {
                ContentId = request.ContentId,
                ContentType = request.ContentType,
                Slug = request.Slug,
                Title = request.Title,
                Description = request.Description ?? string.Empty,
                Keywords = request.Keywords?.Any() == true ? string.Join(", ", request.Keywords) : string.Empty,
                CanonicalUrl = request.CanonicalUrl,
                Language = request.Language,
                Priority = ContentTypePriority.GetValueOrDefault(request.ContentType, 0.5m),
                ChangeFrequency = GetChangeFrequency(request.ContentType)
            };

            _context.SeoMetadata.Add(metadata);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("SEO metadata saved for {ContentType}: {Slug}", 
                request.ContentType, request.Slug);

            return metadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving SEO metadata for {ContentType}: {Slug}", 
                request.ContentType, request.Slug);
            throw;
        }
    }

    public async Task<SeoMetadata?> UpdateMetadataAsync(Guid id, SeoMetadataRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var metadata = await _context.SeoMetadata.FindAsync(new object[] { id }, cancellationToken);
            if (metadata == null)
                return null;

            metadata.Title = request.Title;
            metadata.Description = request.Description ?? string.Empty;
            metadata.Keywords = request.Keywords?.Any() == true ? string.Join(", ", request.Keywords) : string.Empty;
            metadata.CanonicalUrl = request.CanonicalUrl;
            metadata.Language = request.Language;
            metadata.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("SEO metadata updated for {ContentType}: {Slug}", 
                metadata.ContentType, metadata.Slug);

            return metadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating SEO metadata {Id}", id);
            throw;
        }
    }

    public async Task<SeoMetadata?> GetMetadataBySlugAsync(string slug, string? language = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"seo_metadata_{slug}_{language ?? "en-US"}";
            
            if (_cache.TryGetValue(cacheKey, out SeoMetadata? cachedMetadata))
                return cachedMetadata;

            var query = _context.SeoMetadata.Where(m => m.Slug == slug && m.IsActive);
            
            if (!string.IsNullOrEmpty(language))
                query = query.Where(m => m.Language == language);

            var metadata = await query.FirstOrDefaultAsync(cancellationToken);

            if (metadata != null)
            {
                _cache.Set(cacheKey, metadata, TimeSpan.FromMinutes(30));
            }

            return metadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving SEO metadata by slug: {Slug}", slug);
            return null;
        }
    }

    public async Task<SeoMetadata?> GetMetadataByContentIdAsync(Guid contentId, string? language = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.SeoMetadata.Where(m => m.ContentId == contentId && m.IsActive);
            
            if (!string.IsNullOrEmpty(language))
                query = query.Where(m => m.Language == language);

            return await query.FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving SEO metadata by content ID: {ContentId}", contentId);
            return null;
        }
    }

    public async Task<int> BulkUpdateMetadataAsync(string contentType, CancellationToken cancellationToken = default)
    {
        try
        {
            var metadata = await _context.SeoMetadata
                .Where(m => m.ContentType == contentType && m.IsActive)
                .ToListAsync(cancellationToken);

            int updated = 0;

            foreach (var item in metadata)
            {
                // Regenerate metadata based on current content
                var request = new SeoMetadataRequest
                {
                    ContentId = item.ContentId,
                    ContentType = item.ContentType,
                    Title = item.Title,
                    Description = item.Description,
                    Keywords = item.Keywords.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                    Slug = item.Slug,
                    Language = item.Language
                };

                var newMetadata = await GenerateMetadataAsync(request, cancellationToken);
                
                item.Title = newMetadata.Title;
                item.Description = newMetadata.Description;
                item.Keywords = newMetadata.Keywords;
                item.LastUpdated = DateTime.UtcNow;
                
                updated++;
            }

            if (updated > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Bulk updated {Count} SEO metadata entries for content type: {ContentType}", 
                    updated, contentType);
            }

            return updated;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk updating SEO metadata for content type: {ContentType}", contentType);
            throw;
        }
    }

    public async Task<List<SeoIssue>> ValidateMetadataAsync(SeoMetadata metadata, CancellationToken cancellationToken = default)
    {
        var issues = new List<SeoIssue>();

        try
        {
            // Title validation
            if (string.IsNullOrEmpty(metadata.Title))
            {
                issues.Add(new SeoIssue
                {
                    Type = "missing_title",
                    Severity = "critical",
                    Description = "Missing page title",
                    Url = metadata.CanonicalUrl ?? "",
                    Recommendation = "Add a descriptive page title (50-60 characters)"
                });
            }
            else if (metadata.Title.Length > 70)
            {
                issues.Add(new SeoIssue
                {
                    Type = "long_title",
                    Severity = "medium",
                    Description = "Page title too long",
                    Url = metadata.CanonicalUrl ?? "",
                    Recommendation = "Shorten title to under 60 characters"
                });
            }

            // Description validation
            if (string.IsNullOrEmpty(metadata.Description))
            {
                issues.Add(new SeoIssue
                {
                    Type = "missing_description",
                    Severity = "high",
                    Description = "Missing meta description",
                    Url = metadata.CanonicalUrl ?? "",
                    Recommendation = "Add a compelling meta description (150-160 characters)"
                });
            }
            else if (metadata.Description.Length > 170)
            {
                issues.Add(new SeoIssue
                {
                    Type = "long_description",
                    Severity = "medium",
                    Description = "Meta description too long",
                    Url = metadata.CanonicalUrl ?? "",
                    Recommendation = "Shorten description to under 160 characters"
                });
            }

            // Keywords validation
            if (string.IsNullOrEmpty(metadata.Keywords))
            {
                issues.Add(new SeoIssue
                {
                    Type = "missing_keywords",
                    Severity = "low",
                    Description = "No keywords defined",
                    Url = metadata.CanonicalUrl ?? "",
                    Recommendation = "Add relevant keywords for better targeting"
                });
            }

            // Canonical URL validation
            if (string.IsNullOrEmpty(metadata.CanonicalUrl))
            {
                issues.Add(new SeoIssue
                {
                    Type = "missing_canonical",
                    Severity = "medium",
                    Description = "Missing canonical URL",
                    Url = metadata.CanonicalUrl ?? "",
                    Recommendation = "Add canonical URL to prevent duplicate content issues"
                });
            }

            return issues;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating SEO metadata for {Slug}", metadata.Slug);
            return issues;
        }
    }

    private async Task<string> GenerateOptimizedTitleAsync(string baseTitle, string contentType, List<string>? keywords)
    {
        try
        {
            var titleBuilder = new StringBuilder();

            // Clean base title
            var cleanTitle = baseTitle.Trim();
            
            // Add content type context if needed
            switch (contentType.ToLower())
            {
                case "movie":
                    if (!cleanTitle.Contains("movie", StringComparison.OrdinalIgnoreCase) && 
                        !cleanTitle.Contains("film", StringComparison.OrdinalIgnoreCase))
                    {
                        titleBuilder.Append($"Watch {cleanTitle}");
                    }
                    else
                    {
                        titleBuilder.Append(cleanTitle);
                    }
                    break;
                case "tv-show":
                    if (!cleanTitle.Contains("series", StringComparison.OrdinalIgnoreCase) && 
                        !cleanTitle.Contains("show", StringComparison.OrdinalIgnoreCase))
                    {
                        titleBuilder.Append($"Watch {cleanTitle} TV Series");
                    }
                    else
                    {
                        titleBuilder.Append($"Watch {cleanTitle}");
                    }
                    break;
                default:
                    titleBuilder.Append(cleanTitle);
                    break;
            }

            // Add brand
            if (!cleanTitle.Contains("GeoLeap"))
            {
                titleBuilder.Append(" | GeoLeap");
            }

            var title = titleBuilder.ToString();

            // Ensure title doesn't exceed 70 characters
            if (title.Length > 70)
            {
                var maxLength = 70 - " | GeoLeap".Length;
                var truncated = title.Substring(0, Math.Min(maxLength, title.IndexOf(" | GeoLeap")));
                title = $"{truncated} | GeoLeap";
            }

            return title;
        }
        catch (Exception)
        {
            return $"{baseTitle} | GeoLeap";
        }
    }

    private async Task<string> GenerateOptimizedDescriptionAsync(string baseDescription, string contentType, List<string>? keywords)
    {
        try
        {
            var descBuilder = new StringBuilder();

            // Start with action-oriented language
            switch (contentType.ToLower())
            {
                case "movie":
                    descBuilder.Append($"Watch {baseDescription}. ");
                    break;
                case "tv-show":
                    descBuilder.Append($"Stream {baseDescription}. ");
                    break;
                case "search":
                    descBuilder.Append($"Find where to watch {baseDescription}. ");
                    break;
                default:
                    descBuilder.Append($"{baseDescription}. ");
                    break;
            }

            // Add value proposition
            descBuilder.Append("Compare streaming services, find the best deals, and discover where to watch online.");

            var description = descBuilder.ToString();

            // Ensure description doesn't exceed 170 characters
            if (description.Length > 170)
            {
                description = description.Substring(0, 167) + "...";
            }

            return description;
        }
        catch (Exception)
        {
            return baseDescription.Length > 170 
                ? baseDescription.Substring(0, 167) + "..."
                : baseDescription;
        }
    }

    private Dictionary<string, string> GenerateOpenGraphMetadata(string title, string description, string contentType, string baseUrl)
    {
        return new Dictionary<string, string>
        {
            { "og:title", title },
            { "og:description", description },
            { "og:type", GetOpenGraphType(contentType) },
            { "og:site_name", "GeoLeap" },
            { "og:locale", "en_US" }
        };
    }

    private Dictionary<string, string> GenerateTwitterMetadata(string title, string description)
    {
        return new Dictionary<string, string>
        {
            { "twitter:card", "summary_large_image" },
            { "twitter:title", title },
            { "twitter:description", description },
            { "twitter:site", "@GeoLeap" }
        };
    }

    private async Task<string> GenerateStructuredDataAsync(ContentDetails content, CancellationToken cancellationToken)
    {
        try
        {
            var structuredData = new
            {
                context = "https://schema.org",
                type = content.Type == TmdbContentType.Movie ? "Movie" : "TVSeries",
                name = content.Title,
                description = content.Overview,
                datePublished = content.ReleaseDate?.ToString("yyyy-MM-dd"),
                genre = content.Genres,
                aggregateRating = content.VoteAverage.HasValue ? new
                {
                    type = "AggregateRating",
                    ratingValue = content.VoteAverage,
                    ratingCount = content.VoteCount,
                    bestRating = 10,
                    worstRating = 0
                } : null,
                image = !string.IsNullOrEmpty(content.PosterPath) 
                    ? $"https://image.tmdb.org/t/p/w500{content.PosterPath}"
                    : null
            };

            return JsonSerializer.Serialize(structuredData, new JsonSerializerOptions { WriteIndented = false });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured data for content: {Title}", content.Title);
            return string.Empty;
        }
    }

    private List<string> ExtractContentKeywords(ContentDetails content)
    {
        var keywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add title words
        var titleWords = content.Title.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3)
            .Take(5);
        foreach (var word in titleWords)
        {
            keywords.Add(word.ToLower());
        }

        // Add genres
        foreach (var genre in content.Genres.Take(3))
        {
            keywords.Add(genre.ToLower());
        }

        // Add content type
        keywords.Add(content.Type.ToString().ToLower());

        // Add year if available
        if (content.ReleaseDate.HasValue)
        {
            keywords.Add(content.ReleaseDate.Value.Year.ToString());
        }

        return keywords.ToList();
    }

    private async Task<List<string>> ExtractKeywordsFromTextAsync(string text)
    {
        var keywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        
        // Simple keyword extraction - split by spaces and common punctuation
        var words = text.Split(new[] { ' ', ',', '.', '!', '?', ';', ':' }, 
            StringSplitOptions.RemoveEmptyEntries);

        foreach (var word in words)
        {
            var cleanWord = word.Trim().ToLower();
            
            // Filter out common stop words and short words
            if (cleanWord.Length > 3 && !IsStopWord(cleanWord))
            {
                keywords.Add(cleanWord);
            }
        }

        return keywords.Take(10).ToList();
    }

    private async Task<Dictionary<string, int>> GetTrendingKeywordsAsync(CancellationToken cancellationToken)
    {
        try
        {
            // This would integrate with search analytics
            // For now, return placeholder trending keywords
            return new Dictionary<string, int>
            {
                { "streaming", 1000 },
                { "movies", 800 },
                { "tv shows", 600 },
                { "watch online", 400 },
                { "netflix", 300 }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving trending keywords");
            return new Dictionary<string, int>();
        }
    }

    private string GenerateSlug(string text)
    {
        if (string.IsNullOrEmpty(text))
            return string.Empty;

        // Convert to lowercase and replace spaces with hyphens
        var slug = text.ToLowerInvariant();
        
        // Remove non-alphanumeric characters (except spaces and hyphens)
        slug = NonAlphanumericRegex().Replace(slug, "");
        
        // Replace multiple spaces with single hyphen
        slug = WhitespaceRegex().Replace(slug, "-");
        
        // Replace multiple hyphens with single hyphen
        slug = DashRegex().Replace(slug, "-");
        
        // Trim hyphens from start and end
        slug = slug.Trim('-');

        // Limit length
        if (slug.Length > 100)
        {
            slug = slug.Substring(0, 100).Trim('-');
        }

        return slug;
    }

    private string GetChangeFrequency(string contentType)
    {
        return contentType.ToLower() switch
        {
            "movie" => "monthly",
            "tv-show" => "weekly",
            "genre" => "weekly",
            "search" => "daily",
            "home" => "daily",
            _ => "monthly"
        };
    }

    private string GetOpenGraphType(string contentType)
    {
        return contentType.ToLower() switch
        {
            "movie" => "video.movie",
            "tv-show" => "video.tv_show",
            _ => "website"
        };
    }

    private bool IsStopWord(string word)
    {
        var stopWords = new HashSet<string>
        {
            "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
            "from", "up", "about", "into", "through", "during", "before", "after", "above",
            "below", "between", "among", "within", "without", "under", "over", "is", "are",
            "was", "were", "been", "being", "have", "has", "had", "do", "does", "did",
            "will", "would", "could", "should", "may", "might", "must", "shall", "can"
        };

        return stopWords.Contains(word);
    }
}