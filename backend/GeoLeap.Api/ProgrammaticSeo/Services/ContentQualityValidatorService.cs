using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Content quality validator for programmatic SEO system
/// Enforces 85% uniqueness requirement and comprehensive quality checks
/// </summary>
public class ContentQualityValidatorService : IContentQualityValidatorService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ContentQualityValidatorService> _logger;
    private readonly IConfiguration _configuration;

    // Content similarity thresholds
    private const float UNIQUENESS_THRESHOLD = 0.85f;
    private const float PLAGIARISM_THRESHOLD = 0.75f;
    private const float READABILITY_THRESHOLD = 60.0f;
    private const int MIN_WORD_COUNT = 300;
    private const int MAX_WORD_COUNT = 3000;

    public ContentQualityValidatorService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<ContentQualityValidatorService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
    }

    #region Content Uniqueness Validation

    /// <summary>
    /// Check if content meets 85% uniqueness requirement
    /// </summary>
    public async Task<ContentUniquenessResult> ValidateContentUniquenessAsync(string content, string? excludePageSlug = null)
    {
        try
        {
            var result = new ContentUniquenessResult
            {
                Content = content,
                UniquenessThreshold = UNIQUENESS_THRESHOLD,
                ValidationDate = DateTime.UtcNow
            };

            // Generate content fingerprint
            var contentFingerprint = GenerateContentFingerprint(content);
            result.ContentFingerprint = contentFingerprint;

            // Check against existing content
            var similarContent = await FindSimilarContentAsync(content, excludePageSlug);
            result.SimilarContent = similarContent;

            // Calculate uniqueness score
            result.UniquenessScore = CalculateUniquenessScore(content, similarContent);
            result.IsUnique = result.UniquenessScore >= UNIQUENESS_THRESHOLD;

            // Detailed analysis
            if (!result.IsUnique)
            {
                result.ViolationReasons = await AnalyzeUniquenessViolationsAsync(content, similarContent);
                result.RecommendedActions = GenerateUniquenessRecommendations(result.ViolationReasons);
            }

            _logger.LogInformation("Content uniqueness validation: {Score:F2}% unique", result.UniquenessScore * 100);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate content uniqueness");
            throw;
        }
    }

    /// <summary>
    /// Detect duplicate content across all pages
    /// </summary>
    public async Task<List<DuplicateContentGroup>> DetectDuplicateContentAsync(float similarityThreshold = PLAGIARISM_THRESHOLD)
    {
        try
        {
            var duplicateGroups = new List<DuplicateContentGroup>();
            
            var allPages = await _context.SeoPages
                .Where(p => p.IsPublished)
                .Select(p => new { p.Id, p.Slug, p.Content, p.MetaTitle })
                .ToListAsync();

            var processedPairs = new HashSet<(long, long)>();

            foreach (var page1 in allPages)
            {
                var duplicates = new List<SimilarContentItem>();
                
                foreach (var page2 in allPages)
                {
                    if (page1.Id >= page2.Id) continue; // Avoid duplicates and self-comparison
                    
                    var pairKey = (Math.Min(page1.Id, page2.Id), Math.Max(page1.Id, page2.Id));
                    if (processedPairs.Contains(pairKey)) continue;
                    
                    var similarity = CalculateContentSimilarity(page1.Content, page2.Content);
                    
                    if (similarity >= similarityThreshold)
                    {
                        duplicates.Add(new SimilarContentItem
                        {
                            PageId = page2.Id,
                            Slug = page2.Slug,
                            Title = page2.MetaTitle,
                            SimilarityScore = similarity,
                            SimilarityType = DetermineSimilarityType(page1.Content, page2.Content)
                        });
                        
                        processedPairs.Add(pairKey);
                    }
                }

                if (duplicates.Any())
                {
                    duplicateGroups.Add(new DuplicateContentGroup
                    {
                        MasterPage = new SimilarContentItem
                        {
                            PageId = page1.Id,
                            Slug = page1.Slug,
                            Title = page1.MetaTitle,
                            SimilarityScore = 1.0f
                        },
                        DuplicatePages = duplicates,
                        GroupSimilarityScore = duplicates.Average(d => d.SimilarityScore),
                        DetectedAt = DateTime.UtcNow
                    });
                }
            }

            _logger.LogInformation("Detected {Count} duplicate content groups", duplicateGroups.Count);
            
            return duplicateGroups.OrderByDescending(g => g.GroupSimilarityScore).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to detect duplicate content");
            return new List<DuplicateContentGroup>();
        }
    }

    /// <summary>
    /// Generate content variations to improve uniqueness
    /// </summary>
    public async Task<List<ContentVariation>> GenerateContentVariationsAsync(string originalContent, int variationCount = 5)
    {
        try
        {
            var variations = new List<ContentVariation>();
            
            for (int i = 0; i < variationCount; i++)
            {
                var variation = new ContentVariation
                {
                    VariationIndex = i + 1,
                    OriginalContent = originalContent,
                    CreatedAt = DateTime.UtcNow
                };

                // Apply different variation techniques
                variation.ModifiedContent = i switch
                {
                    0 => await ApplySynonymReplacementAsync(originalContent),
                    1 => await ApplySentenceRestructuringAsync(originalContent),
                    2 => await ApplyParagraphReorderingAsync(originalContent),
                    3 => await ApplyContentExpansionAsync(originalContent),
                    4 => await ApplyCombinedVariationsAsync(originalContent),
                    _ => originalContent
                };

                // Validate uniqueness of variation
                var uniquenessResult = await ValidateContentUniquenessAsync(variation.ModifiedContent);
                variation.UniquenessScore = uniquenessResult.UniquenessScore;
                variation.IsAcceptable = uniquenessResult.IsUnique;
                
                // Calculate readability
                variation.ReadabilityScore = CalculateReadabilityScore(variation.ModifiedContent);
                
                variations.Add(variation);
            }

            return variations.Where(v => v.IsAcceptable).OrderByDescending(v => v.UniquenessScore).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate content variations");
            return new List<ContentVariation>();
        }
    }

    #endregion

    #region Helper Methods

    private string GenerateContentFingerprint(string content)
    {
        // Create a unique fingerprint for content based on key phrases and structure
        var normalizedContent = NormalizeContentForComparison(content);
        var keyPhrases = ExtractKeyPhrases(normalizedContent);
        var structuralElements = ExtractStructuralElements(content);
        
        var fingerprint = string.Join("|", keyPhrases.Take(20)) + "|" + string.Join("|", structuralElements);
        
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(fingerprint));
        return Convert.ToBase64String(hashBytes);
    }

    private async Task<List<SimilarContentItem>> FindSimilarContentAsync(string content, string? excludePageSlug)
    {
        var similarContent = new List<SimilarContentItem>();
        
        var existingPages = await _context.SeoPages
            .Where(p => p.IsPublished && (excludePageSlug == null || p.Slug != excludePageSlug))
            .Select(p => new { p.Id, p.Slug, p.Content, p.MetaTitle })
            .ToListAsync();

        foreach (var page in existingPages)
        {
            var similarity = CalculateContentSimilarity(content, page.Content);
            
            if (similarity > 0.1f) // Only consider content with some similarity
            {
                similarContent.Add(new SimilarContentItem
                {
                    PageId = page.Id,
                    Slug = page.Slug,
                    Title = page.MetaTitle,
                    SimilarityScore = similarity,
                    SimilarityType = DetermineSimilarityType(content, page.Content)
                });
            }
        }

        return similarContent.OrderByDescending(s => s.SimilarityScore).Take(10).ToList();
    }

    private float CalculateUniquenessScore(string content, List<SimilarContentItem> similarContent)
    {
        if (!similarContent.Any())
        {
            return 1.0f; // 100% unique
        }

        // Calculate uniqueness based on highest similarity
        var highestSimilarity = similarContent.Max(s => s.SimilarityScore);
        return 1.0f - highestSimilarity;
    }

    private float CalculateContentSimilarity(string content1, string content2)
    {
        // Normalize content for comparison
        var normalized1 = NormalizeContentForComparison(content1);
        var normalized2 = NormalizeContentForComparison(content2);

        // Extract key phrases
        var phrases1 = ExtractKeyPhrases(normalized1);
        var phrases2 = ExtractKeyPhrases(normalized2);

        // Calculate Jaccard similarity
        var intersection = phrases1.Intersect(phrases2).Count();
        var union = phrases1.Union(phrases2).Count();
        
        if (union == 0) return 0f;
        
        var jaccardSimilarity = (float)intersection / union;

        // Apply additional similarity measures
        var structuralSimilarity = CalculateStructuralSimilarity(content1, content2);
        var semanticSimilarity = CalculateSemanticSimilarity(phrases1, phrases2);

        // Weighted average
        return (jaccardSimilarity * 0.5f) + (structuralSimilarity * 0.25f) + (semanticSimilarity * 0.25f);
    }

    private string NormalizeContentForComparison(string content)
    {
        // Remove HTML tags
        var withoutHtml = Regex.Replace(content, @"<[^>]*>", " ");
        
        // Convert to lowercase and remove extra whitespace
        var normalized = Regex.Replace(withoutHtml.ToLowerInvariant(), @"\s+", " ").Trim();
        
        // Remove common stop words and punctuation
        var stopWords = new HashSet<string> { "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those" };
        
        var words = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => Regex.Replace(w, @"[^\w]", ""))
            .Where(w => !string.IsNullOrEmpty(w) && !stopWords.Contains(w))
            .ToArray();
        
        return string.Join(" ", words);
    }

    private List<string> ExtractKeyPhrases(string normalizedContent)
    {
        var phrases = new List<string>();
        var words = normalizedContent.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        // Extract 1-grams (individual words)
        phrases.AddRange(words.Where(w => w.Length > 3));
        
        // Extract 2-grams (word pairs)
        for (int i = 0; i < words.Length - 1; i++)
        {
            var phrase = $"{words[i]} {words[i + 1]}";
            if (phrase.Length > 6)
                phrases.Add(phrase);
        }
        
        // Extract 3-grams (word triplets)
        for (int i = 0; i < words.Length - 2; i++)
        {
            var phrase = $"{words[i]} {words[i + 1]} {words[i + 2]}";
            if (phrase.Length > 10)
                phrases.Add(phrase);
        }
        
        return phrases.Distinct().ToList();
    }

    private List<string> ExtractStructuralElements(string content)
    {
        var elements = new List<string>();
        
        // Extract HTML structure
        var headings = Regex.Matches(content, @"<h[1-6][^>]*>(.*?)</h[1-6]>", RegexOptions.IgnoreCase);
        elements.AddRange(headings.Cast<Match>().Select(m => $"heading:{m.Groups[1].Value.ToLowerInvariant()}"));
        
        var lists = Regex.Matches(content, @"<(ul|ol)[^>]*>", RegexOptions.IgnoreCase);
        elements.Add($"lists:{lists.Count}");
        
        var paragraphs = content.Split("</p>", StringSplitOptions.RemoveEmptyEntries).Length;
        elements.Add($"paragraphs:{paragraphs}");
        
        return elements;
    }

    private float CalculateStructuralSimilarity(string content1, string content2)
    {
        var structure1 = ExtractStructuralElements(content1);
        var structure2 = ExtractStructuralElements(content2);
        
        var intersection = structure1.Intersect(structure2).Count();
        var union = structure1.Union(structure2).Count();
        
        return union > 0 ? (float)intersection / union : 0f;
    }

    private float CalculateSemanticSimilarity(List<string> phrases1, List<string> phrases2)
    {
        // Simplified semantic similarity based on common word roots and synonyms
        var semanticMatches = 0;
        
        foreach (var phrase1 in phrases1)
        {
            foreach (var phrase2 in phrases2)
            {
                if (AreSemanticallySimilar(phrase1, phrase2))
                {
                    semanticMatches++;
                    break;
                }
            }
        }
        
        var totalPhrases = Math.Max(phrases1.Count, phrases2.Count);
        return totalPhrases > 0 ? (float)semanticMatches / totalPhrases : 0f;
    }

    private bool AreSemanticallySimilar(string phrase1, string phrase2)
    {
        // Simple semantic similarity check
        var words1 = phrase1.Split(' ');
        var words2 = phrase2.Split(' ');
        
        // Check for common roots (simplified)
        foreach (var word1 in words1)
        {
            foreach (var word2 in words2)
            {
                if (word1.Length > 4 && word2.Length > 4)
                {
                    var root1 = word1.Substring(0, Math.Min(4, word1.Length));
                    var root2 = word2.Substring(0, Math.Min(4, word2.Length));
                    
                    if (root1 == root2)
                        return true;
                }
            }
        }
        
        return false;
    }

    private string DetermineSimilarityType(string content1, string content2)
    {
        var similarity = CalculateContentSimilarity(content1, content2);
        
        return similarity switch
        {
            >= 0.9f => "Near Duplicate",
            >= 0.7f => "High Similarity",
            >= 0.5f => "Moderate Similarity",
            >= 0.3f => "Low Similarity",
            _ => "Minor Similarity"
        };
    }

    private async Task<List<string>> AnalyzeUniquenessViolationsAsync(string content, List<SimilarContentItem> similarContent)
    {
        var violations = new List<string>();
        
        foreach (var similar in similarContent.Where(s => s.SimilarityScore > PLAGIARISM_THRESHOLD))
        {
            violations.Add($"Content is {similar.SimilarityScore:P1} similar to page '{similar.Slug}'");
        }
        
        if (similarContent.Any(s => s.SimilarityScore > 0.95f))
        {
            violations.Add("Content appears to be nearly identical to existing content");
        }
        
        return violations;
    }

    private List<string> GenerateUniquenessRecommendations(List<string> violations)
    {
        var recommendations = new List<string>();
        
        if (violations.Any(v => v.Contains("similar to page")))
        {
            recommendations.Add("Rewrite content to use different phrasing and structure");
            recommendations.Add("Add unique insights or perspectives not found in similar content");
            recommendations.Add("Use synonyms and alternative expressions");
        }
        
        if (violations.Any(v => v.Contains("identical")))
        {
            recommendations.Add("Content requires complete rewriting - current version is too similar");
            recommendations.Add("Consider a different angle or approach to the topic");
        }
        
        return recommendations;
    }

    private async Task<string> ApplySynonymReplacementAsync(string content)
    {
        var synonymMap = new Dictionary<string, string[]>
        {
            ["best"] = ["top", "finest", "excellent", "outstanding", "premier"],
            ["watch"] = ["view", "see", "stream", "enjoy", "experience"],
            ["movie"] = ["film", "cinema", "picture", "motion picture"],
            ["show"] = ["series", "program", "production", "presentation"],
            ["great"] = ["excellent", "fantastic", "amazing", "wonderful", "superb"]
        };
        
        var modifiedContent = content;
        
        foreach (var kvp in synonymMap)
        {
            var word = kvp.Key;
            var synonyms = kvp.Value;
            var synonym = synonyms[new Random(word.GetHashCode()).Next(synonyms.Length)];
            
            modifiedContent = Regex.Replace(modifiedContent, @"\b" + word + @"\b", 
                synonym, RegexOptions.IgnoreCase);
        }
        
        return modifiedContent;
    }

    private async Task<string> ApplySentenceRestructuringAsync(string content)
    {
        // Simple sentence restructuring by changing passive to active voice and vice versa
        var sentences = content.Split('.', StringSplitOptions.RemoveEmptyEntries);
        var modifiedSentences = new List<string>();
        
        foreach (var sentence in sentences)
        {
            var trimmed = sentence.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;
            
            // Simple restructuring - add variety to sentence beginnings
            if (trimmed.StartsWith("The"))
            {
                modifiedSentences.Add("In this comprehensive guide, " + trimmed.Substring(3).ToLower());
            }
            else if (trimmed.StartsWith("This"))
            {
                modifiedSentences.Add("Here we explore " + trimmed.Substring(4).ToLower());
            }
            else
            {
                modifiedSentences.Add(trimmed);
            }
        }
        
        return string.Join(". ", modifiedSentences) + ".";
    }

    private async Task<string> ApplyParagraphReorderingAsync(string content)
    {
        var paragraphs = content.Split(new[] { "</p>", "<p>" }, StringSplitOptions.RemoveEmptyEntries)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();
        
        if (paragraphs.Count <= 2) return content;

        // Keep first and last paragraphs, shuffle middle ones
        var firstParagraph = paragraphs.FirstOrDefault();
        var lastParagraph = paragraphs.LastOrDefault();

        if (firstParagraph == null || lastParagraph == null) return content;
        var middleParagraphs = paragraphs.Skip(1).Take(paragraphs.Count - 2).ToList();
        
        var random = new Random();
        middleParagraphs = middleParagraphs.OrderBy(x => random.Next()).ToList();
        
        var reorderedParagraphs = new List<string> { firstParagraph };
        reorderedParagraphs.AddRange(middleParagraphs);
        reorderedParagraphs.Add(lastParagraph);
        
        return "<p>" + string.Join("</p><p>", reorderedParagraphs) + "</p>";
    }

    private async Task<string> ApplyContentExpansionAsync(string content)
    {
        // Add transitional phrases and expanded explanations
        var transitions = new[]
        {
            "Furthermore, ", "Additionally, ", "Moreover, ", "In addition, ",
            "It's worth noting that ", "What's more, ", "Importantly, "
        };
        
        // Add transitions to some sentences
        var sentences = content.Split('.', StringSplitOptions.RemoveEmptyEntries);
        var expandedSentences = new List<string>();
        
        for (int i = 0; i < sentences.Length; i++)
        {
            var sentence = sentences[i].Trim();
            if (string.IsNullOrEmpty(sentence)) continue;
            
            expandedSentences.Add(sentence);
            
            // Occasionally add transitional content
            if (i > 0 && i % 3 == 0 && i < sentences.Length - 1)
            {
                var transition = transitions[new Random(i).Next(transitions.Length)];
                expandedSentences.Add($" {transition}this aspect becomes particularly relevant when considering the broader context");
            }
        }
        
        return string.Join(". ", expandedSentences) + ".";
    }

    private async Task<string> ApplyCombinedVariationsAsync(string content)
    {
        // Apply multiple variation techniques
        var varied = await ApplySynonymReplacementAsync(content);
        varied = await ApplyContentExpansionAsync(varied);
        return await ApplySentenceRestructuringAsync(varied);
    }

    private float CalculateReadabilityScore(string content)
    {
        return CalculateFleschReadingEase(content);
    }

    private float CalculateFleschReadingEase(string content)
    {
        var sentences = CountSentences(content);
        var words = CountWords(content);
        var syllables = EstimateSyllables(content);

        if (sentences == 0 || words == 0) return 0;

        var avgWordsPerSentence = (float)words / sentences;
        var avgSyllablesPerWord = (float)syllables / words;

        return 206.835f - (1.015f * avgWordsPerSentence) - (84.6f * avgSyllablesPerWord);
    }

    private int CountWords(string content)
    {
        var plainText = Regex.Replace(content, @"<[^>]*>", " ");
        var words = plainText.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        return words.Length;
    }

    private int CountSentences(string content)
    {
        var plainText = Regex.Replace(content, @"<[^>]*>", " ");
        return plainText.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries).Length;
    }

    private int EstimateSyllables(string content)
    {
        var plainText = Regex.Replace(content, @"<[^>]*>", " ");
        var words = plainText.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        var totalSyllables = 0;

        foreach (var word in words)
        {
            var vowels = word.Count(c => "aeiouAEIOU".Contains(c));
            totalSyllables += Math.Max(1, vowels);
        }

        return totalSyllables;
    }

    #endregion
}

#region Supporting Models and Interfaces

/// <summary>
/// Interface for content quality validator service
/// </summary>
public interface IContentQualityValidatorService
{
    Task<ContentUniquenessResult> ValidateContentUniquenessAsync(string content, string? excludePageSlug = null);
    Task<List<DuplicateContentGroup>> DetectDuplicateContentAsync(float similarityThreshold = 0.75f);
    Task<List<ContentVariation>> GenerateContentVariationsAsync(string originalContent, int variationCount = 5);
}

/// <summary>
/// Content uniqueness validation result
/// </summary>
public class ContentUniquenessResult
{
    public string Content { get; set; } = string.Empty;
    public string ContentFingerprint { get; set; } = string.Empty;
    public float UniquenessScore { get; set; }
    public float UniquenessThreshold { get; set; }
    public bool IsUnique { get; set; }
    public List<SimilarContentItem> SimilarContent { get; set; } = new();
    public List<string> ViolationReasons { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
    public DateTime ValidationDate { get; set; }
}

/// <summary>
/// Similar content item
/// </summary>
public class SimilarContentItem
{
    public long PageId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public float SimilarityScore { get; set; }
    public string SimilarityType { get; set; } = string.Empty;
}

/// <summary>
/// Group of duplicate content pages
/// </summary>
public class DuplicateContentGroup
{
    public SimilarContentItem MasterPage { get; set; } = new();
    public List<SimilarContentItem> DuplicatePages { get; set; } = new();
    public float GroupSimilarityScore { get; set; }
    public DateTime DetectedAt { get; set; }
}

/// <summary>
/// Content variation for uniqueness improvement
/// </summary>
public class ContentVariation
{
    public int VariationIndex { get; set; }
    public string OriginalContent { get; set; } = string.Empty;
    public string ModifiedContent { get; set; } = string.Empty;
    public float UniquenessScore { get; set; }
    public float ReadabilityScore { get; set; }
    public bool IsAcceptable { get; set; }
    public DateTime CreatedAt { get; set; }
}

#endregion