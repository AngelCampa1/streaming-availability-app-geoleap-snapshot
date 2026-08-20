using System.Text;
using System.Text.Json;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for generating Schema.org structured data markup using JSON-LD format
/// </summary>
public class StructuredDataService : IStructuredDataService
{
    private readonly ILogger<StructuredDataService> _logger;
    private readonly IConfiguration _configuration;

    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public StructuredDataService(ILogger<StructuredDataService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<string> GenerateMovieStructuredDataAsync(ContentDetails movie, List<ContentStreamingOption>? streamingOptions = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "Movie",
                Name = movie.Title,
                AlternateName = movie.OriginalTitle,
                Description = movie.Overview,
                DatePublished = movie.ReleaseDate?.ToString("yyyy-MM-dd"),
                Genre = movie.Genres.ToArray(),
                Duration = movie.Runtime.HasValue ? $"PT{movie.Runtime}M" : null,
                Image = GetImageUrl(movie.PosterPath),
                Url = GetContentUrl("movie", movie.Title, movie.Id.ToString()),
                AggregateRating = movie.VoteAverage.HasValue ? new
                {
                    Type = "AggregateRating",
                    RatingValue = movie.VoteAverage,
                    RatingCount = movie.VoteCount,
                    BestRating = 10,
                    WorstRating = 0
                } : null,
                Director = GetDirectors(movie.Crew),
                Actor = GetMainActors(movie.Cast),
                ProductionCountry = movie.ProductionCountries.Select(pc => new
                {
                    Type = "Country",
                    Name = pc
                }).ToArray(),
                InLanguage = movie.OriginalLanguages.FirstOrDefault(),
                Keywords = string.Join(", ", movie.Genres.Concat(new[] { "movie", "film", "streaming", "watch online" })),
                Offers = streamingOptions?.Any() == true ? GenerateOffers(movie, streamingOptions) : null,
                SameAs = GenerateExternalUrls(new List<TmdbExternalId>()),
                ContentRating = GetContentRating(movie),
                Review = GenerateReviewSnippets(movie),
                Trailer = GetTrailerUrl(movie)
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating movie structured data for: {Title}", movie.Title);
            return string.Empty;
        }
    }

    public async Task<string> GenerateTvSeriesStructuredDataAsync(ContentDetails tvSeries, List<ContentStreamingOption>? streamingOptions = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "TVSeries",
                Name = tvSeries.Title,
                AlternateName = tvSeries.OriginalTitle,
                Description = tvSeries.Overview,
                StartDate = tvSeries.ReleaseDate?.ToString("yyyy-MM-dd"),
                Genre = tvSeries.Genres.ToArray(),
                NumberOfSeasons = tvSeries.NumberOfSeasons,
                NumberOfEpisodes = tvSeries.NumberOfEpisodes,
                Image = GetImageUrl(tvSeries.PosterPath),
                Url = GetContentUrl("tv-show", tvSeries.Title, tvSeries.Id.ToString()),
                AggregateRating = tvSeries.VoteAverage.HasValue ? new
                {
                    Type = "AggregateRating",
                    RatingValue = tvSeries.VoteAverage,
                    RatingCount = tvSeries.VoteCount,
                    BestRating = 10,
                    WorstRating = 0
                } : null,
                Creator = GetCreators(tvSeries.Crew),
                Actor = GetMainActors(tvSeries.Cast),
                ProductionCountry = tvSeries.ProductionCountries.Select(pc => new
                {
                    Type = "Country",
                    Name = pc
                }).ToArray(),
                InLanguage = tvSeries.OriginalLanguages.FirstOrDefault(),
                Keywords = string.Join(", ", tvSeries.Genres.Concat(new[] { "tv series", "television", "streaming", "watch online" })),
                Offers = streamingOptions?.Any() == true ? GenerateOffers(tvSeries, streamingOptions) : null,
                SameAs = GenerateExternalUrls(new List<TmdbExternalId>()),
                ContentRating = GetContentRating(tvSeries),
                Review = GenerateReviewSnippets(tvSeries)
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating TV series structured data for: {Title}", tvSeries.Title);
            return string.Empty;
        }
    }

    public async Task<string> GenerateSearchResultsStructuredDataAsync(ContentSearchResult searchResults, string searchQuery, CancellationToken cancellationToken = default)
    {
        try
        {
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "SearchResultsPage",
                MainEntity = new
                {
                    Type = "ItemList",
                    Name = $"Search results for '{searchQuery}'",
                    Description = $"Find where to watch '{searchQuery}' online across streaming platforms",
                    NumberOfItems = searchResults.TotalResults,
                    ItemListElement = searchResults.Results.Select((result, index) => new
                    {
                        Type = "ListItem",
                        Position = index + 1,
                        Item = new
                        {
                            Type = result.Type.ToString().ToLower() == "movie" ? "Movie" : "TVSeries",
                            Name = result.Title,
                            Description = result.Overview,
                            Image = GetImageUrl(result.ImageUrl),
                            Url = GetContentUrl(result.Type.ToString().ToLower(), result.Title, result.Id),
                            AggregateRating = result.Rating.HasValue ? new
                            {
                                Type = "AggregateRating",
                                RatingValue = result.Rating,
                                BestRating = 10,
                                WorstRating = 0
                            } : null
                        }
                    }).ToArray()
                },
                PotentialAction = new
                {
                    Type = "SearchAction",
                    Target = new
                    {
                        Type = "EntryPoint",
                        UrlTemplate = GetBaseUrl() + "/search?q={search_term_string}"
                    },
                    QueryInput = "required name=search_term_string"
                }
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating search results structured data for query: {Query}", searchQuery);
            return string.Empty;
        }
    }

    public async Task<string> GenerateOrganizationStructuredDataAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = GetBaseUrl();
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "Organization",
                Name = "GeoLeap",
                Description = "Find where to watch movies and TV shows across all streaming platforms. Compare streaming services and discover new content.",
                Url = baseUrl,
                Logo = $"{baseUrl}/images/logo.png",
                SameAs = new[]
                {
                    "https://twitter.com/geoleapapp",
                    "https://facebook.com/GeoLeap",
                    "https://instagram.com/GeoLeap"
                },
                ContactPoint = new
                {
                    Type = "ContactPoint",
                    ContactType = "customer service",
                    Email = "support@geoleap.com",
                    Url = $"{baseUrl}/support"
                },
                FoundingDate = "2024",
                KnowsAbout = new[]
                {
                    "Movie streaming",
                    "TV show streaming",
                    "Streaming services comparison",
                    "Digital entertainment",
                    "Video on demand"
                },
                ServiceType = new[]
                {
                    "Streaming service aggregation",
                    "Content discovery",
                    "Price comparison"
                }
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating organization structured data");
            return string.Empty;
        }
    }

    public async Task<string> GenerateWebsiteNavigationStructuredDataAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = GetBaseUrl();
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "WebSite",
                Name = "GeoLeap",
                Url = baseUrl,
                PotentialAction = new
                {
                    Type = "SearchAction",
                    Target = new
                    {
                        Type = "EntryPoint",
                        UrlTemplate = $"{baseUrl}/search?q={{search_term_string}}"
                    },
                    QueryInput = "required name=search_term_string"
                },
                MainEntity = new
                {
                    Type = "WebPage",
                    Name = "Home",
                    Url = baseUrl,
                    Description = "Discover where to watch your favorite movies and TV shows across all streaming platforms"
                }
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating website navigation structured data");
            return string.Empty;
        }
    }

    public async Task<string> GenerateFaqStructuredDataAsync(List<FaqItem> faqItems, CancellationToken cancellationToken = default)
    {
        try
        {
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "FAQPage",
                MainEntity = faqItems.Select(faq => new
                {
                    Type = "Question",
                    Name = faq.Question,
                    AcceptedAnswer = new
                    {
                        Type = "Answer",
                        Text = faq.Answer
                    }
                }).ToArray()
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating FAQ structured data");
            return string.Empty;
        }
    }

    public async Task<string> GenerateAggregateRatingStructuredDataAsync(ContentDetails content, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!content.VoteAverage.HasValue)
                return string.Empty;

            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "AggregateRating",
                ItemReviewed = new
                {
                    Type = content.Type == TmdbContentType.Movie ? "Movie" : "TVSeries",
                    Name = content.Title
                },
                RatingValue = content.VoteAverage,
                RatingCount = content.VoteCount,
                BestRating = 10,
                WorstRating = 0,
                ReviewCount = content.VoteCount
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating aggregate rating structured data for: {Title}", content.Title);
            return string.Empty;
        }
    }

    public async Task<string> GenerateBreadcrumbStructuredDataAsync(List<BreadcrumbItem> breadcrumbs, CancellationToken cancellationToken = default)
    {
        try
        {
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "BreadcrumbList",
                ItemListElement = breadcrumbs.Select(breadcrumb => new
                {
                    Type = "ListItem",
                    Position = breadcrumb.Position,
                    Name = breadcrumb.Name,
                    Item = breadcrumb.Url
                }).ToArray()
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating breadcrumb structured data");
            return string.Empty;
        }
    }

    public async Task<string> GenerateOfferStructuredDataAsync(ContentDetails content, List<ContentStreamingOption> streamingOptions, CancellationToken cancellationToken = default)
    {
        try
        {
            var offers = GenerateOffers(content, streamingOptions);
            
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "Product",
                Name = content.Title,
                Description = content.Overview,
                Image = GetImageUrl(content.PosterPath),
                Offers = offers
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating offer structured data for: {Title}", content.Title);
            return string.Empty;
        }
    }

    public async Task<string> GenerateVideoStructuredDataAsync(ContentDetails content, string? embedUrl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var structuredData = new
            {
                Context = "https://schema.org",
                Type = "VideoObject",
                Name = content.Title,
                Description = content.Overview,
                ThumbnailUrl = GetImageUrl(content.PosterPath),
                UploadDate = content.ReleaseDate?.ToString("yyyy-MM-dd"),
                Duration = content.Runtime.HasValue ? $"PT{content.Runtime}M" : null,
                ContentUrl = embedUrl,
                EmbedUrl = embedUrl,
                InteractionStatistic = new
                {
                    Type = "InteractionCounter",
                    InteractionType = new { Type = "WatchAction" },
                    UserInteractionCount = content.Popularity
                }
            };

            return JsonSerializer.Serialize(structuredData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating video structured data for: {Title}", content.Title);
            return string.Empty;
        }
    }

    public async Task<StructuredDataValidationResult> ValidateStructuredDataAsync(string jsonLd, CancellationToken cancellationToken = default)
    {
        var result = new StructuredDataValidationResult();

        try
        {
            // Basic JSON validation
            var jsonDocument = JsonDocument.Parse(jsonLd);
            result.IsValid = true;

            // Extract schema type
            if (jsonDocument.RootElement.TryGetProperty("@type", out var typeProperty) ||
                jsonDocument.RootElement.TryGetProperty("type", out typeProperty))
            {
                result.SchemaType = typeProperty.GetString();
            }

            // Basic schema validation
            if (!jsonDocument.RootElement.TryGetProperty("@context", out var contextProperty) &&
                !jsonDocument.RootElement.TryGetProperty("context", out contextProperty))
            {
                result.Warnings.Add("Missing @context property");
            }
            else if (contextProperty.GetString() != "https://schema.org")
            {
                result.Warnings.Add("@context should be 'https://schema.org'");
            }

            // Type-specific validation
            ValidateByType(jsonDocument.RootElement, result);

            return result;
        }
        catch (JsonException ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Invalid JSON: {ex.Message}");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating structured data");
            result.IsValid = false;
            result.Errors.Add("Validation error occurred");
            return result;
        }
    }

    public async Task<string> CombineStructuredDataAsync(params string[] jsonLdObjects)
    {
        try
        {
            var validObjects = jsonLdObjects
                .Where(obj => !string.IsNullOrWhiteSpace(obj))
                .ToList();

            if (!validObjects.Any())
                return string.Empty;

            if (validObjects.Count == 1)
                return validObjects[0];

            // Combine multiple JSON-LD objects into a single array
            var combinedData = new
            {
                Context = "https://schema.org",
                Graph = validObjects.Select(obj => JsonSerializer.Deserialize<object>(obj)).ToArray()
            };

            return JsonSerializer.Serialize(combinedData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error combining structured data objects");
            return string.Empty;
        }
    }

    private object[] GenerateOffers(ContentDetails content, List<ContentStreamingOption> streamingOptions)
    {
        return streamingOptions.Select(option => new
        {
            Type = "Offer",
            Price = option.Price?.ToString("F2") ?? "0",
            PriceCurrency = option.Currency ?? "USD",
            Availability = "https://schema.org/InStock",
            Seller = new
            {
                Type = "Organization",
                Name = option.ServiceName
            },
            Url = option.StreamingUrl ?? GetBaseUrl(),
            Category = option.StreamingType.ToString()
        }).ToArray();
    }

    private object[]? GetDirectors(List<CrewMember> crew)
    {
        var directors = crew.Where(c => c.Job.Equals("Director", StringComparison.OrdinalIgnoreCase))
            .Take(3)
            .Select(d => new
            {
                Type = "Person",
                Name = d.Name
            })
            .ToArray();

        return directors.Any() ? directors : null;
    }

    private object[]? GetCreators(List<CrewMember> crew)
    {
        var creators = crew.Where(c => 
                c.Job.Equals("Creator", StringComparison.OrdinalIgnoreCase) ||
                c.Job.Equals("Executive Producer", StringComparison.OrdinalIgnoreCase))
            .Take(3)
            .Select(c => new
            {
                Type = "Person",
                Name = c.Name
            })
            .ToArray();

        return creators.Any() ? creators : null;
    }

    private object[]? GetMainActors(List<CastMember> cast)
    {
        var actors = cast.OrderBy(c => c.Order)
            .Take(5)
            .Select(a => new
            {
                Type = "Person",
                Name = a.Name
            })
            .ToArray();

        return actors.Any() ? actors : null;
    }

    private string[] GenerateExternalUrls(List<TmdbExternalId> externalIds)
    {
        var urls = new List<string>();

        foreach (var id in externalIds)
        {
            switch (id.Source.ToLower())
            {
                case "imdb":
                    urls.Add($"https://www.imdb.com/title/{id.ExternalIdValue}");
                    break;
                case "tvdb":
                    urls.Add($"https://thetvdb.com/series/{id.ExternalIdValue}");
                    break;
            }
        }

        return urls.ToArray();
    }

    private string? GetContentRating(ContentDetails content)
    {
        // This would typically come from content metadata
        // For now, return null if not available
        return null;
    }

    private object[]? GenerateReviewSnippets(ContentDetails content)
    {
        // This would typically generate review snippets from user reviews
        // For now, return null as we don't have review data
        return null;
    }

    private string? GetTrailerUrl(ContentDetails content)
    {
        // This would typically return a trailer URL if available
        return null;
    }

    private string? GetImageUrl(string? imagePath)
    {
        if (string.IsNullOrEmpty(imagePath))
            return null;

        if (imagePath.StartsWith("http"))
            return imagePath;

        return $"https://image.tmdb.org/t/p/w500{imagePath}";
    }

    private string GetContentUrl(string contentType, string title, string id)
    {
        var slug = GenerateSlug(title);
        var baseUrl = GetBaseUrl();
        return $"{baseUrl}/{contentType}/{slug}";
    }

    private string GetBaseUrl()
    {
        return _configuration["BaseUrl"] ?? "https://geoleap.com";
    }

    private string GenerateSlug(string title)
    {
        if (string.IsNullOrEmpty(title))
            return string.Empty;

        return title.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("'", "")
            .Replace("\"", "")
            .Replace(":", "")
            .Replace("?", "")
            .Replace("!", "")
            .Replace(",", "")
            .Replace(".", "");
    }

    private void ValidateByType(JsonElement element, StructuredDataValidationResult result)
    {
        if (!element.TryGetProperty("@type", out var typeProperty) &&
            !element.TryGetProperty("type", out typeProperty))
        {
            result.Errors.Add("Missing @type property");
            return;
        }

        var schemaType = typeProperty.GetString();

        switch (schemaType?.ToLower())
        {
            case "movie":
            case "tvseries":
                ValidateVideoContent(element, result);
                break;
            case "organization":
                ValidateOrganization(element, result);
                break;
            case "website":
                ValidateWebsite(element, result);
                break;
        }
    }

    private void ValidateVideoContent(JsonElement element, StructuredDataValidationResult result)
    {
        if (!element.TryGetProperty("name", out _))
            result.Errors.Add("Missing required 'name' property");

        if (!element.TryGetProperty("description", out _))
            result.Warnings.Add("Missing recommended 'description' property");

        if (!element.TryGetProperty("image", out _))
            result.Warnings.Add("Missing recommended 'image' property");
    }

    private void ValidateOrganization(JsonElement element, StructuredDataValidationResult result)
    {
        if (!element.TryGetProperty("name", out _))
            result.Errors.Add("Missing required 'name' property");

        if (!element.TryGetProperty("url", out _))
            result.Warnings.Add("Missing recommended 'url' property");
    }

    private void ValidateWebsite(JsonElement element, StructuredDataValidationResult result)
    {
        if (!element.TryGetProperty("name", out _))
            result.Errors.Add("Missing required 'name' property");

        if (!element.TryGetProperty("url", out _))
            result.Errors.Add("Missing required 'url' property");
    }
}