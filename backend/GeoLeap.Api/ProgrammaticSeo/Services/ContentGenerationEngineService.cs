using GeoLeap.Api.Models;
using GeoLeap.Api.ProgrammaticSeo.Models;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Advanced Content Generation Engine with NLP and AI capabilities
/// </summary>
public class ContentGenerationEngineService : IContentGenerationEngineService
{
    private readonly ILogger<ContentGenerationEngineService> _logger;
    private readonly IDistributedCache _cache;
    private readonly HttpClient _httpClient;
    private readonly IContentQualityValidatorService _qualityValidator;

    // NLP and content generation templates
    private readonly Dictionary<ContentType, string[]> _contentTemplates;
    private readonly Dictionary<string, string[]> _variationPatterns;
    private readonly string[] _transitionWords;
    private readonly Dictionary<string, double> _keywordWeights;

    public ContentGenerationEngineService(
        ILogger<ContentGenerationEngineService> logger,
        IDistributedCache cache,
        HttpClient httpClient,
        IContentQualityValidatorService qualityValidator)
    {
        _logger = logger;
        _cache = cache;
        _httpClient = httpClient;
        _qualityValidator = qualityValidator;

        _contentTemplates = InitializeContentTemplates();
        _variationPatterns = InitializeVariationPatterns();
        _transitionWords = new[] { "Furthermore", "Additionally", "Moreover", "However", "Nevertheless", "Consequently", "Therefore", "Meanwhile", "Subsequently", "Similarly" };
        _keywordWeights = new Dictionary<string, double>
        {
            { "primary", 2.5 },
            { "secondary", 1.5 },
            { "long-tail", 1.8 },
            { "brand", 2.0 }
        };
    }

    public async Task<GeneratedContent> GenerateContentAsync(SeoTemplate template, Dictionary<string, object> variables, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Generating content for template {TemplateId}", template.Id);

            var cacheKey = $"content-generation:{template.Id}:{GetVariablesHash(variables)}";
            var cachedResult = await _cache.GetStringAsync(cacheKey, cancellationToken);
            
            if (!string.IsNullOrEmpty(cachedResult))
            {
                return JsonSerializer.Deserialize<GeneratedContent>(cachedResult) ?? new GeneratedContent();
            }

            // Process template variables
            var processedContent = await ProcessTemplateVariables(template.Template, variables);

            // Generate title from template pattern
            var seoSettings = template.SeoSettings ?? new SeoSettings();
            var title = GenerateTitle(seoSettings.TitlePattern ?? template.MetaTitle ?? string.Empty, variables);
            
            // Generate meta description
            var metaDescription = await GenerateMetaDescriptionAsync(title, processedContent, GetKeywordsFromVariables(variables), cancellationToken);
            
            // Generate schema markup
            var contentType = DetermineContentType(variables);
            var schemaMarkup = await GenerateSchemaMarkupAsync(contentType, variables, cancellationToken);
            
            // Extract headings
            var headings = ExtractHeadings(processedContent);
            
            // Validate content quality
            var qualityScore = await ValidateContentQualityAsync(processedContent, GetKeywordsFromVariables(variables), cancellationToken);

            var result = new GeneratedContent
            {
                Title = title,
                Content = processedContent,
                MetaDescription = metaDescription,
                MetaKeywords = string.Join(", ", GetKeywordsFromVariables(variables)),
                SchemaMarkup = schemaMarkup,
                Headings = headings,
                QualityScore = qualityScore,
                GenerationMetadata = new Dictionary<string, object>
                {
                    { "templateId", template.Id },
                    { "generatedAt", DateTime.UtcNow },
                    { "processingTime", DateTime.UtcNow },
                    { "contentLength", processedContent.Length },
                    { "wordCount", CountWords(processedContent) }
                }
            };

            // Cache the result
            var serializedResult = JsonSerializer.Serialize(result);
            await _cache.SetStringAsync(cacheKey, serializedResult, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
            }, cancellationToken);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating content for template {TemplateId}", template.Id);
            throw new InvalidOperationException($"Content generation failed: {ex.Message}", ex);
        }
    }

    public async Task<IEnumerable<GeneratedContent>> GenerateBatchContentAsync(SeoTemplate template, IEnumerable<Dictionary<string, object>> variableSets, CancellationToken cancellationToken = default)
    {
        var results = new List<GeneratedContent>();
        var semaphore = new SemaphoreSlim(Environment.ProcessorCount, Environment.ProcessorCount);

        var tasks = variableSets.Select(async variables =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                return await GenerateContentAsync(template, variables, cancellationToken);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var generatedContent = await Task.WhenAll(tasks);
        return generatedContent;
    }

    public async Task<GeneratedContent> GenerateSeoOptimizedContentAsync(SeoTemplate template, Dictionary<string, object> variables, IEnumerable<string> targetKeywords, CancellationToken cancellationToken = default)
    {
        // Enhanced generation with keyword optimization
        var enhancedVariables = new Dictionary<string, object>(variables)
        {
            ["target_keywords"] = targetKeywords.ToList(),
            ["seo_optimized"] = true
        };

        var baseContent = await GenerateContentAsync(template, enhancedVariables, cancellationToken);
        
        // Optimize content for target keywords
        var optimizedContent = await OptimizeContentForKeywords(baseContent.Content, targetKeywords);
        baseContent.Content = optimizedContent;

        return baseContent;
    }

    public async Task<IEnumerable<string>> GenerateContentVariationsAsync(string baseContent, int variationCount = 5, CancellationToken cancellationToken = default)
    {
        var variations = new List<string>();
        
        for (int i = 0; i < variationCount; i++)
        {
            var variation = await GenerateContentVariation(baseContent, i);
            variations.Add(variation);
        }

        return variations;
    }

    public Task<string> GenerateMetaDescriptionAsync(string title, string content, IEnumerable<string> keywords, CancellationToken cancellationToken = default)
    {
        var keywordList = keywords.ToList();
        var contentWords = content.Split(' ').Take(30).ToList();

        // Extract key sentences that contain target keywords
        var sentences = content.Split('.').Where(s => s.Trim().Length > 10).ToList();
        var keywordSentences = sentences.Where(s => keywordList.Any(k => s.Contains(k, StringComparison.OrdinalIgnoreCase))).ToList();

        var metaDescription = new StringBuilder();

        if (keywordSentences.Any())
        {
            var bestSentence = keywordSentences.First().Trim();
            metaDescription.Append(bestSentence.Length > 120 ? bestSentence.Substring(0, 117) + "..." : bestSentence);
        }
        else
        {
            // Fallback to first sentence with keyword injection
            var firstSentence = sentences.FirstOrDefault()?.Trim() ?? "";
            if (firstSentence.Length > 0)
            {
                var description = firstSentence.Length > 100 ? firstSentence.Substring(0, 97) + "..." : firstSentence;
                if (keywordList.Any())
                {
                    description = $"{keywordList.First()} - {description}";
                }
                metaDescription.Append(description);
            }
        }

        // Ensure meta description is within optimal length (150-160 characters)
        var result = metaDescription.ToString();
        if (result.Length > 160)
        {
            result = result.Substring(0, 157) + "...";
        }
        else if (result.Length < 120 && keywordList.Any())
        {
            // Add call-to-action if there's space
            var cta = " Discover more.";
            if (result.Length + cta.Length <= 160)
            {
                result += cta;
            }
        }

        return Task.FromResult(result);
    }

    public Task<string> GenerateSchemaMarkupAsync(ContentType contentType, Dictionary<string, object> properties, CancellationToken cancellationToken = default)
    {
        var schema = new
        {
            context = "https://schema.org",
            type = GetSchemaType(contentType),
            name = properties.GetValueOrDefault("title", "")?.ToString() ?? "",
            description = properties.GetValueOrDefault("description", "")?.ToString() ?? "",
            url = properties.GetValueOrDefault("url", "")?.ToString() ?? "",
            datePublished = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            dateModified = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            author = new
            {
                type = "Organization",
                name = "GeoLeap"
            },
            publisher = new
            {
                type = "Organization",
                name = "GeoLeap"
            }
        };

        // Add content-specific properties
        var enhancedSchema = EnhanceSchemaForContentType(schema, contentType, properties);

        return Task.FromResult(JsonSerializer.Serialize(enhancedSchema, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        }));
    }

    public async Task<ContentQualityScore> ValidateContentQualityAsync(string content, IEnumerable<string> keywords, CancellationToken cancellationToken = default)
    {
        var keywordList = keywords.ToList();
        var wordCount = CountWords(content);
        var readabilityScore = CalculateReadabilityScore(content);
        var keywordDensityScore = CalculateKeywordDensityScore(content, keywordList);
        var contentLengthScore = CalculateContentLengthScore(wordCount);
        var seoOptimizationScore = CalculateSeoOptimizationScore(content, keywordList);
        var uniquenessScore = await CalculateUniquenessScore(content);

        var overallScore = (readabilityScore + keywordDensityScore + contentLengthScore + seoOptimizationScore + uniquenessScore) / 5.0;

        var recommendations = GenerateRecommendations(readabilityScore, keywordDensityScore, contentLengthScore, seoOptimizationScore, uniquenessScore, wordCount);
        var issues = GenerateIssues(readabilityScore, keywordDensityScore, contentLengthScore, seoOptimizationScore, uniquenessScore);

        return new ContentQualityScore
        {
            OverallScore = overallScore,
            ReadabilityScore = readabilityScore,
            SeoOptimizationScore = seoOptimizationScore,
            KeywordDensityScore = keywordDensityScore,
            ContentLengthScore = contentLengthScore,
            UniquenessScore = uniquenessScore,
            Recommendations = recommendations,
            Issues = issues
        };
    }

    public Task<IEnumerable<InternalLinkSuggestion>> GenerateInternalLinksAsync(string content, IEnumerable<SeoPage> existingPages, CancellationToken cancellationToken = default)
    {
        var suggestions = new List<InternalLinkSuggestion>();
        var contentWords = content.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);

        foreach (var page in existingPages)
        {
            var pageKeywords = page.Keywords?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();
            var relevanceScore = CalculateRelevanceScore(contentWords, pageKeywords, page.Title);

            if (relevanceScore > 0.3)
            {
                var anchorText = FindBestAnchorText(content, page.Title, pageKeywords);
                if (!string.IsNullOrEmpty(anchorText))
                {
                    suggestions.Add(new InternalLinkSuggestion
                    {
                        AnchorText = anchorText,
                        TargetUrl = page.Url,
                        TargetPageTitle = page.Title,
                        RelevanceScore = relevanceScore,
                        Context = ExtractContext(content, anchorText)
                    });
                }
            }
        }

        return Task.FromResult<IEnumerable<InternalLinkSuggestion>>(suggestions.OrderByDescending(s => s.RelevanceScore).Take(5));
    }

    #region Private Helper Methods

    private Dictionary<ContentType, string[]> InitializeContentTemplates()
    {
        return new Dictionary<ContentType, string[]>
        {
            [ContentType.Movie] = new[]
            {
                "Discover {title}, a {genre} {type} that {description}. Stream on {platforms}.",
                "Watch {title} online - {description}. Available on {platforms}.",
                "{title} is a must-watch {genre} {type} featuring {cast}. Find where to stream."
            },
            [ContentType.TvShow] = new[]
            {
                "Stream {title}, the {genre} series that {description}. Watch on {platforms}.",
                "Binge-watch {title} - {description}. Available on {platforms}.",
                "{title} is the {genre} series everyone's talking about. Find where to stream."
            }
        };
    }

    private Dictionary<string, string[]> InitializeVariationPatterns()
    {
        return new Dictionary<string, string[]>
        {
            ["introduction"] = new[]
            {
                "Looking for", "Searching for", "Want to watch", "Interested in", "Curious about"
            },
            ["action"] = new[]
            {
                "stream", "watch", "view", "enjoy", "discover", "explore"
            },
            ["descriptors"] = new[]
            {
                "amazing", "incredible", "outstanding", "remarkable", "exceptional", "fascinating"
            }
        };
    }

    private async Task<string> ProcessTemplateVariables(string template, Dictionary<string, object> variables)
    {
        var processed = template;

        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            processed = processed.Replace(placeholder, value);
        }

        // Process any conditional logic or advanced templating
        processed = await ProcessAdvancedTemplating(processed, variables);

        return processed;
    }

    private Task<string> ProcessAdvancedTemplating(string content, Dictionary<string, object> variables)
    {
        // Handle conditional content based on variables
        var conditionalPattern = @"\{\{if\s+(\w+)\}\}(.*?)\{\{endif\}\}";
        var matches = Regex.Matches(content, conditionalPattern, RegexOptions.Singleline);

        foreach (Match match in matches)
        {
            var condition = match.Groups[1].Value;
            var conditionalContent = match.Groups[2].Value;

            if (variables.ContainsKey(condition) && !string.IsNullOrEmpty(variables[condition]?.ToString()))
            {
                content = content.Replace(match.Value, conditionalContent);
            }
            else
            {
                content = content.Replace(match.Value, "");
            }
        }

        return Task.FromResult(content);
    }

    private string GenerateTitle(string titlePattern, Dictionary<string, object> variables)
    {
        var title = titlePattern;
        
        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            title = title.Replace(placeholder, value);
        }

        return title;
    }

    private IEnumerable<string> GetKeywordsFromVariables(Dictionary<string, object> variables)
    {
        var keywords = new List<string>();
        
        if (variables.ContainsKey("keywords"))
        {
            if (variables["keywords"] is IEnumerable<string> keywordList)
            {
                keywords.AddRange(keywordList);
            }
            else if (variables["keywords"] is string keywordString)
            {
                keywords.AddRange(keywordString.Split(',').Select(k => k.Trim()));
            }
        }

        // Extract keywords from other variables
        if (variables.ContainsKey("title"))
        {
            keywords.Add(variables["title"].ToString() ?? "");
        }
        
        if (variables.ContainsKey("genre"))
        {
            keywords.Add(variables["genre"].ToString() ?? "");
        }

        return keywords.Where(k => !string.IsNullOrWhiteSpace(k));
    }

    private ContentType DetermineContentType(Dictionary<string, object> variables)
    {
        if (variables.ContainsKey("type"))
        {
            var type = variables["type"].ToString()?.ToLower();
            return type switch
            {
                "movie" => ContentType.Movie,
                "tv" or "series" => ContentType.TvShow,
                "actor" => ContentType.Actor,
                "director" => ContentType.Director,
                "genre" => ContentType.Genre,
                _ => ContentType.Movie
            };
        }

        return ContentType.Movie;
    }

    private IEnumerable<string> ExtractHeadings(string content)
    {
        var headingPattern = @"<h[1-6][^>]*>(.*?)</h[1-6]>";
        var matches = Regex.Matches(content, headingPattern, RegexOptions.IgnoreCase);
        
        return matches.Select(m => Regex.Replace(m.Groups[1].Value, @"<[^>]+>", "").Trim());
    }

    private int CountWords(string content)
    {
        var cleanContent = Regex.Replace(content, @"<[^>]+>", "");
        return cleanContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
    }

    private string GetVariablesHash(Dictionary<string, object> variables)
    {
        var serialized = JsonSerializer.Serialize(variables);
        return Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(serialized)))[..16];
    }

    private Task<string> OptimizeContentForKeywords(string content, IEnumerable<string> targetKeywords)
    {
        var optimized = content;
        var keywordList = targetKeywords.ToList();

        // Ensure primary keyword appears in first paragraph
        if (keywordList.Any())
        {
            var firstParagraph = GetFirstParagraph(optimized);
            var primaryKeyword = keywordList.First();

            if (!firstParagraph.Contains(primaryKeyword, StringComparison.OrdinalIgnoreCase))
            {
                optimized = InjectKeywordIntoFirstParagraph(optimized, primaryKeyword);
            }
        }

        return Task.FromResult(optimized);
    }

    private Task<string> GenerateContentVariation(string baseContent, int variationIndex)
    {
        var variation = baseContent;

        // Apply different variation strategies
        switch (variationIndex % 3)
        {
            case 0:
                variation = VariateSentenceStructure(variation);
                break;
            case 1:
                variation = VariateVocabulary(variation);
                break;
            case 2:
                variation = VariateParagraphOrder(variation);
                break;
        }

        return Task.FromResult(variation);
    }

    private string VariateSentenceStructure(string content)
    {
        // Implement sentence structure variation logic
        return content;
    }

    private string VariateVocabulary(string content)
    {
        // Implement vocabulary variation logic
        return content;
    }

    private string VariateParagraphOrder(string content)
    {
        // Implement paragraph reordering logic
        return content;
    }

    private string GetSchemaType(ContentType contentType)
    {
        return contentType switch
        {
            ContentType.Movie => "Movie",
            ContentType.TvShow => "TVSeries",
            ContentType.Actor => "Person",
            ContentType.Director => "Person",
            ContentType.Genre => "Thing",
            ContentType.Review => "Review",
            ContentType.ListPage => "ItemList",
            ContentType.ComparisonPage => "Article",
            ContentType.GuideArticle => "Article",
            _ => "Article"
        };
    }

    private object EnhanceSchemaForContentType(object baseSchema, ContentType contentType, Dictionary<string, object> properties)
    {
        // Enhance schema based on content type
        return baseSchema;
    }

    private double CalculateReadabilityScore(string content)
    {
        // Simplified readability calculation
        var words = CountWords(content);
        var sentences = content.Split('.', '!', '?').Length;
        var avgWordsPerSentence = words / (double)sentences;
        
        // Optimal range: 15-20 words per sentence
        if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20)
            return 100;
        else if (avgWordsPerSentence < 10 || avgWordsPerSentence > 30)
            return 50;
        else
            return 75;
    }

    private double CalculateKeywordDensityScore(string content, List<string> keywords)
    {
        if (!keywords.Any()) return 50;

        var words = CountWords(content);
        var totalKeywordOccurrences = 0;

        foreach (var keyword in keywords)
        {
            var occurrences = Regex.Matches(content, Regex.Escape(keyword), RegexOptions.IgnoreCase).Count;
            totalKeywordOccurrences += occurrences;
        }

        var density = (totalKeywordOccurrences / (double)words) * 100;
        
        // Optimal density: 1-3%
        if (density >= 1 && density <= 3)
            return 100;
        else if (density < 0.5 || density > 5)
            return 30;
        else
            return 70;
    }

    private double CalculateContentLengthScore(int wordCount)
    {
        // Optimal content length: 300-2000 words
        if (wordCount >= 300 && wordCount <= 2000)
            return 100;
        else if (wordCount < 150 || wordCount > 3000)
            return 30;
        else
            return 70;
    }

    private double CalculateSeoOptimizationScore(string content, List<string> keywords)
    {
        var score = 0.0;
        var checks = 0;

        // Check for keywords in headings
        var headings = ExtractHeadings(content);
        if (headings.Any() && keywords.Any(k => headings.Any(h => h.Contains(k, StringComparison.OrdinalIgnoreCase))))
        {
            score += 25;
        }
        checks++;

        // Check content structure (headings, paragraphs)
        if (headings.Count() >= 2)
        {
            score += 25;
        }
        checks++;

        // Check for internal links
        if (content.Contains("<a href"))
        {
            score += 25;
        }
        checks++;

        // Check for meta elements
        if (content.Contains("alt=") || content.Contains("title="))
        {
            score += 25;
        }
        checks++;

        return score / checks;
    }

    private async Task<double> CalculateUniquenessScore(string content)
    {
        // Simplified uniqueness check - in practice, would check against existing content
        var contentHash = GetContentHash(content);
        
        // Check cache for similar content hashes
        var cacheKey = $"uniqueness:{contentHash[..16]}";
        var existingContent = await _cache.GetStringAsync(cacheKey);
        
        if (string.IsNullOrEmpty(existingContent))
        {
            await _cache.SetStringAsync(cacheKey, "exists", new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30)
            });
            return 100; // Unique content
        }
        
        return 75; // Potentially similar content
    }

    private string GetContentHash(string content)
    {
        var hash = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToBase64String(hash);
    }

    private IEnumerable<string> GenerateRecommendations(double readability, double keywordDensity, double contentLength, double seoOptimization, double uniqueness, int wordCount)
    {
        var recommendations = new List<string>();

        if (readability < 70)
            recommendations.Add("Improve readability by using shorter sentences and simpler vocabulary");
        
        if (keywordDensity < 70)
            recommendations.Add("Increase keyword density by naturally incorporating target keywords");
        
        if (contentLength < 70)
        {
            if (wordCount < 300)
                recommendations.Add("Add more content to reach optimal length (300+ words)");
            else
                recommendations.Add("Consider reducing content length for better readability");
        }
        
        if (seoOptimization < 70)
            recommendations.Add("Add more headings, internal links, and optimize meta elements");
        
        if (uniqueness < 70)
            recommendations.Add("Ensure content is unique and not duplicated from other sources");

        return recommendations;
    }

    private IEnumerable<string> GenerateIssues(double readability, double keywordDensity, double contentLength, double seoOptimization, double uniqueness)
    {
        var issues = new List<string>();

        if (readability < 50)
            issues.Add("Content readability is poor - consider simplifying language");
        
        if (keywordDensity < 30)
            issues.Add("Keyword density is too low - target keywords may not rank well");
        else if (keywordDensity > 90)
            issues.Add("Keyword density is too high - risk of keyword stuffing");
        
        if (contentLength < 30)
            issues.Add("Content is too short for effective SEO");
        
        if (seoOptimization < 50)
            issues.Add("Content lacks basic SEO optimization elements");
        
        if (uniqueness < 50)
            issues.Add("Content may be duplicate or too similar to existing content");

        return issues;
    }

    private double CalculateRelevanceScore(string[] contentWords, List<string> pageKeywords, string pageTitle)
    {
        var score = 0.0;
        var titleWords = pageTitle.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        // Check title word matches
        var titleMatches = titleWords.Count(word => contentWords.Contains(word));
        score += (titleMatches / (double)titleWords.Length) * 0.5;
        
        // Check keyword matches
        if (pageKeywords.Any())
        {
            var keywordMatches = pageKeywords.Count(keyword => 
                contentWords.Any(word => word.Contains(keyword.ToLower())));
            score += (keywordMatches / (double)pageKeywords.Count) * 0.5;
        }

        return score;
    }

    private string FindBestAnchorText(string content, string pageTitle, List<string> pageKeywords)
    {
        // Try to find the most relevant anchor text
        var titleWords = pageTitle.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        // Look for exact matches first
        foreach (var word in titleWords)
        {
            if (content.Contains(word, StringComparison.OrdinalIgnoreCase))
            {
                return word;
            }
        }
        
        // Look for keyword matches
        foreach (var keyword in pageKeywords)
        {
            if (content.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                return keyword;
            }
        }

        return titleWords.FirstOrDefault() ?? pageTitle;
    }

    private string ExtractContext(string content, string anchorText)
    {
        var index = content.IndexOf(anchorText, StringComparison.OrdinalIgnoreCase);
        if (index == -1) return "";

        var start = Math.Max(0, index - 100);
        var length = Math.Min(200, content.Length - start);
        
        return content.Substring(start, length).Trim();
    }

    private string GetFirstParagraph(string content)
    {
        var paragraphs = content.Split(new[] { "</p>", "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
        return paragraphs.FirstOrDefault() ?? "";
    }

    private string InjectKeywordIntoFirstParagraph(string content, string keyword)
    {
        var firstParagraph = GetFirstParagraph(content);
        if (string.IsNullOrEmpty(firstParagraph)) return content;

        var enhancedParagraph = $"{keyword} - {firstParagraph}";
        return content.Replace(firstParagraph, enhancedParagraph);
    }

    #endregion
}