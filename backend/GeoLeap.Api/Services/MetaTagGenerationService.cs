using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

public class MetaTagGenerationService : IMetaTagGenerationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public MetaTagGenerationService(
        ApplicationDbContext context,
        ILoggerService logger,
        IConfiguration configuration,
        HttpClient httpClient)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
    }

    public async Task<OpenGraphData> GenerateOpenGraphDataAsync(ContentMetadata content, string? customMessage = null)
    {
        try
        {
            var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
            var shareImageUrl = content.PosterUrl ?? GetDefaultShareImage("facebook");

            var description = customMessage ?? content.Overview ?? "Discover where to watch this content on GeoLeap";

            var openGraphData = new OpenGraphData
            {
                Title = OptimizeTitle(content.Title, 60), // Facebook recommends 60 chars max
                Description = OptimizeDescription(description, 155), // Meta description best practice
                ImageUrl = shareImageUrl,
                Url = $"{baseUrl}/shared/{content.Type.ToString().ToLower()}/{content.ExternalId}",
                Type = content.Type == TmdbContentType.Movie ? "video.movie" : "video.tv_show",
                SiteName = "GeoLeap",
                AdditionalProperties = new Dictionary<string, string>
                {
                    ["og:locale"] = "en_US",
                    ["og:video:type"] = "text/html",
                    ["og:video:width"] = "1200",
                    ["og:video:height"] = "630",
                    ["fb:app_id"] = _configuration["Facebook:AppId"] ?? "",
                    ["article:author"] = "GeoLeap",
                    ["article:publisher"] = "https://www.facebook.com/geoleap"
                }
            };

            // Add additional properties based on content type
            if (content.Type == TmdbContentType.Movie)
            {
                if (content.Year.HasValue)
                {
                    openGraphData.AdditionalProperties["video:release_date"] = $"{content.Year}-01-01";
                }
                if (content.Genres?.Any() == true)
                {
                    openGraphData.AdditionalProperties["video:genre"] = string.Join(", ", content.Genres);
                }
            }

            _logger.LogBusinessEvent("OpenGraphGenerated", new { ContentId = content.ExternalId });

            return openGraphData;
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("OpenGraphGenerationError", new { ContentId = content.ExternalId, Error = ex.Message });
            throw;
        }
    }

    public async Task<TwitterCardData> GenerateTwitterCardDataAsync(ContentMetadata content, string? customMessage = null)
    {
        try
        {
            var shareImageUrl = content.PosterUrl ?? GetDefaultShareImage("twitter");
            var description = customMessage ?? content.Overview ?? "Discover where to watch this content on GeoLeap";

            var twitterCardData = new TwitterCardData
            {
                Card = "summary_large_image",
                Title = OptimizeTitle(content.Title, 70), // Twitter recommends 70 chars max
                Description = OptimizeDescription(description, 200), // Twitter allows up to 200 chars
                ImageUrl = shareImageUrl,
                Site = _configuration["Twitter:Handle"] ?? "@geoleap",
                AdditionalProperties = new Dictionary<string, string>
                {
                    ["twitter:creator"] = _configuration["Twitter:Handle"] ?? "@geoleap",
                    ["twitter:domain"] = "geoleap.com",
                    ["twitter:label1"] = content.Type == TmdbContentType.Movie ? "Genre" : "Year",
                    ["twitter:data1"] = content.Genres?.FirstOrDefault() ?? "Entertainment",
                    ["twitter:label2"] = content.Type == TmdbContentType.Movie ? "Year" : "Type",
                    ["twitter:data2"] = content.Year?.ToString() ?? "TV Series"
                }
            };

            // Add rating information if available
            if (content.Rating.HasValue && content.Rating > 0)
            {
                twitterCardData.AdditionalProperties["twitter:label3"] = "Rating";
                twitterCardData.AdditionalProperties["twitter:data3"] = $"{content.Rating:F1}/10";
            }

            _logger.LogBusinessEvent("TwitterCardGenerated", new { ContentId = content.ExternalId });

            return twitterCardData;
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("TwitterCardGenerationError", new { ContentId = content.ExternalId, Error = ex.Message });
            throw;
        }
    }

    public async Task<string> GenerateShareImageAsync(string contentId, string contentType, string platform, CancellationToken cancellationToken = default)
    {
        try
        {
            var content = await GetContentDetailsAsync(contentId, contentType, cancellationToken);
            if (content == null)
            {
                return GetDefaultShareImage(platform);
            }

            // If content has an existing high-quality image, use it
            if (!string.IsNullOrEmpty(content.ImageUrl) && await IsValidImageUrl(content.ImageUrl))
            {
                return content.ImageUrl;
            }

            // Generate a custom share image with branding
            var customImageUrl = await GenerateCustomShareImageAsync(content, platform, cancellationToken);
            return customImageUrl ?? GetDefaultShareImage(platform);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("ShareImageGenerationError", new
            {
                ContentId = contentId,
                Platform = platform,
                Error = ex.Message
            });
            
            return GetDefaultShareImage(platform);
        }
    }

    public async Task<string> GenerateMetaTagsHtmlAsync(string shareUrl, string contentId, string platform = "facebook")
    {
        try
        {
            // Parse share URL to extract content info
            var (extractedContentId, contentType) = ParseShareUrl(shareUrl);
            if (string.IsNullOrEmpty(extractedContentId) || string.IsNullOrEmpty(contentType))
            {
                return GenerateDefaultMetaTags();
            }

            // Get content details
            var content = await GetContentDetailsAsync(extractedContentId, contentType, CancellationToken.None);
            if (content == null)
            {
                return GenerateDefaultMetaTags();
            }

            var contentMetadata = new ContentMetadata
            {
                Title = content.Title,
                Overview = content.Overview,
                ImageUrl = content.ImageUrl,
                Genres = content.Genres,
                Year = content.Year,
                Rating = content.Rating,
                Type = contentType.ToLower() == "movie" ? TmdbContentType.Movie : TmdbContentType.TvSeries
            };

            var openGraphData = await GenerateOpenGraphDataAsync(contentMetadata);
            var twitterCardData = await GenerateTwitterCardDataAsync(contentMetadata);

            var html = new StringBuilder();

            // Open Graph tags
            html.AppendLine($"<meta property=\"og:title\" content=\"{EscapeHtml(openGraphData.Title)}\" />");
            html.AppendLine($"<meta property=\"og:description\" content=\"{EscapeHtml(openGraphData.Description)}\" />");
            html.AppendLine($"<meta property=\"og:image\" content=\"{EscapeHtml(openGraphData.ImageUrl)}\" />");
            html.AppendLine($"<meta property=\"og:url\" content=\"{EscapeHtml(openGraphData.Url)}\" />");
            html.AppendLine($"<meta property=\"og:type\" content=\"{EscapeHtml(openGraphData.Type)}\" />");
            html.AppendLine($"<meta property=\"og:site_name\" content=\"{EscapeHtml(openGraphData.SiteName)}\" />");

            // Additional Open Graph properties
            if (openGraphData.AdditionalProperties != null)
            {
                foreach (var prop in openGraphData.AdditionalProperties)
                {
                    if (!string.IsNullOrEmpty(prop.Value))
                    {
                        html.AppendLine($"<meta property=\"{EscapeHtml(prop.Key)}\" content=\"{EscapeHtml(prop.Value)}\" />");
                    }
                }
            }

            // Twitter Card tags
            html.AppendLine($"<meta name=\"twitter:card\" content=\"{EscapeHtml(twitterCardData.Card)}\" />");
            html.AppendLine($"<meta name=\"twitter:site\" content=\"{EscapeHtml(twitterCardData.Site)}\" />");
            html.AppendLine($"<meta name=\"twitter:title\" content=\"{EscapeHtml(twitterCardData.Title)}\" />");
            html.AppendLine($"<meta name=\"twitter:description\" content=\"{EscapeHtml(twitterCardData.Description)}\" />");
            html.AppendLine($"<meta name=\"twitter:image\" content=\"{EscapeHtml(twitterCardData.ImageUrl)}\" />");

            // Additional Twitter Card properties
            if (twitterCardData.AdditionalProperties != null)
            {
                foreach (var prop in twitterCardData.AdditionalProperties)
                {
                    if (!string.IsNullOrEmpty(prop.Value))
                    {
                        html.AppendLine($"<meta name=\"{EscapeHtml(prop.Key)}\" content=\"{EscapeHtml(prop.Value)}\" />");
                    }
                }
            }

            // Standard meta tags
            html.AppendLine($"<meta name=\"description\" content=\"{EscapeHtml(openGraphData.Description)}\" />");
            html.AppendLine($"<link rel=\"canonical\" href=\"{EscapeHtml(openGraphData.Url)}\" />");
            
            // Structured data for search engines
            html.AppendLine(GenerateStructuredData(openGraphData, contentType));

            return html.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("MetaTagsGenerationError", new
            {
                ShareUrl = shareUrl,
                Error = ex.Message
            });
            
            return GenerateDefaultMetaTags();
        }
    }

    // Helper methods
    private async Task<dynamic?> GetContentDetailsAsync(string contentId, string contentType, CancellationToken cancellationToken)
    {
        // This would query your content database
        // Mock implementation for now
        await Task.Delay(1, cancellationToken);
        
        return new
        {
            Title = "Sample Content Title",
            Description = "This is a sample description for the content being shared on social media.",
            Overview = "Detailed overview of the content that provides context for viewers.",
            ImageUrl = "/images/content-poster.jpg",
            Genres = new[] { "Drama", "Action", "Thriller" },
            Year = 2024,
            Rating = 8.5m,
            ReleaseDate = new DateTime(2024, 1, 15),
            Directors = new[] { "John Director", "Jane Director" },
            Cast = new[] { "Actor One", "Actor Two", "Actor Three" },
            EpisodeCount = 10
        };
    }

    private string OptimizeTitle(string title, int maxLength)
    {
        if (string.IsNullOrEmpty(title)) return "Discover Content on GeoLeap";
        
        if (title.Length <= maxLength) return title;
        
        // Try to truncate at word boundary
        var truncated = title.Substring(0, maxLength - 3);
        var lastSpace = truncated.LastIndexOf(' ');
        
        if (lastSpace > maxLength / 2)
        {
            return truncated.Substring(0, lastSpace) + "...";
        }
        
        return truncated + "...";
    }

    private string OptimizeDescription(string description, int maxLength)
    {
        if (string.IsNullOrEmpty(description))
        {
            return "Discover where to watch your favorite movies and TV shows with GeoLeap's comprehensive streaming guide.";
        }
        
        // Clean up description
        description = Regex.Replace(description, @"\s+", " ").Trim();
        
        if (description.Length <= maxLength) return description;
        
        // Truncate at sentence boundary if possible
        var sentences = description.Split('.', StringSplitOptions.RemoveEmptyEntries);
        var result = "";
        
        foreach (var sentence in sentences)
        {
            var potential = result + sentence + ".";
            if (potential.Length > maxLength - 3) break;
            result = potential;
        }
        
        if (!string.IsNullOrEmpty(result)) return result.TrimEnd('.');
        
        // Fall back to word boundary truncation
        var truncated = description.Substring(0, maxLength - 3);
        var lastSpace = truncated.LastIndexOf(' ');
        
        if (lastSpace > maxLength / 2)
        {
            return truncated.Substring(0, lastSpace) + "...";
        }
        
        return truncated + "...";
    }

    private async Task<string?> GenerateCustomShareImageAsync(dynamic content, string platform, CancellationToken cancellationToken)
    {
        // This would integrate with an image generation service
        // For now, return a placeholder that indicates custom generation
        await Task.Delay(1, cancellationToken);
        
        var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
        return $"{baseUrl}/api/images/share/{platform}/{content.Title?.GetHashCode()}";
    }

    private async Task<bool> IsValidImageUrl(string imageUrl)
    {
        try
        {
            var response = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Head, imageUrl));
            return response.IsSuccessStatusCode && 
                   response.Content.Headers.ContentType?.MediaType?.StartsWith("image/") == true;
        }
        catch
        {
            return false;
        }
    }

    private string GetDefaultShareImage(string platform)
    {
        var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
        var platformImages = new Dictionary<string, string>
        {
            ["facebook"] = $"{baseUrl}/images/share/geoleap-facebook-share.jpg",
            ["twitter"] = $"{baseUrl}/images/share/geoleap-twitter-share.jpg",
            ["instagram"] = $"{baseUrl}/images/share/geoleap-instagram-share.jpg",
            ["linkedin"] = $"{baseUrl}/images/share/geoleap-linkedin-share.jpg"
        };
        
        return platformImages.GetValueOrDefault(platform.ToLower(), $"{baseUrl}/images/share/geoleap-default-share.jpg");
    }

    private (string contentId, string contentType) ParseShareUrl(string shareUrl)
    {
        try
        {
            var match = Regex.Match(shareUrl, @"/shared/([^/]+)/([^/?]+)");
            if (match.Success)
            {
                return (match.Groups[2].Value, match.Groups[1].Value);
            }
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("ShareUrlParseError", new { ShareUrl = shareUrl, Error = ex.Message });
        }
        
        return (string.Empty, string.Empty);
    }

    private string GenerateDefaultMetaTags()
    {
        var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
        var defaultImage = GetDefaultShareImage("facebook");
        
        return $@"
<meta property=""og:title"" content=""Discover Content on GeoLeap"" />
<meta property=""og:description"" content=""Find out where to watch your favorite movies and TV shows across all streaming platforms."" />
<meta property=""og:image"" content=""{defaultImage}"" />
<meta property=""og:url"" content=""{baseUrl}"" />
<meta property=""og:type"" content=""website"" />
<meta property=""og:site_name"" content=""GeoLeap"" />
<meta name=""twitter:card"" content=""summary_large_image"" />
<meta name=""twitter:site"" content=""@geoleap"" />
<meta name=""twitter:title"" content=""Discover Content on GeoLeap"" />
<meta name=""twitter:description"" content=""Find out where to watch your favorite movies and TV shows across all streaming platforms."" />
<meta name=""twitter:image"" content=""{defaultImage}"" />
<meta name=""description"" content=""Find out where to watch your favorite movies and TV shows across all streaming platforms."" />";
    }

    private string GenerateStructuredData(OpenGraphData openGraphData, string contentType)
    {
        var structuredData = new
        {
            context = "https://schema.org",
            type = contentType.ToLower() == "movie" ? "Movie" : "TVSeries",
            name = openGraphData.Title,
            description = openGraphData.Description,
            image = openGraphData.ImageUrl,
            url = openGraphData.Url,
            publisher = new
            {
                type = "Organization",
                name = "GeoLeap",
                url = _configuration["BaseUrl"] ?? "https://geoleap.com"
            }
        };

        var json = System.Text.Json.JsonSerializer.Serialize(structuredData, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        return $"<script type=\"application/ld+json\">{json}</script>";
    }

    public async Task<string> GetMetaTagsHtmlAsync(string shareUrl, string contentId, string platform = "facebook")
    {
        // This method is an alias for GenerateMetaTagsHtmlAsync for backward compatibility
        return await GenerateMetaTagsHtmlAsync(shareUrl, contentId, platform);
    }

    private string EscapeHtml(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#x27;");
    }
}