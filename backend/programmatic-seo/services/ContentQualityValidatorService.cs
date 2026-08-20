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

    #region Quality Validation

    /// <summary>
    /// Comprehensive content quality validation
    /// </summary>
    public async Task<ContentQualityReport> ValidateContentQualityAsync(string content, ContentQualitySettings? settings = null)
    {
        try
        {
            settings ??= GetDefaultQualitySettings();
            
            var report = new ContentQualityReport
            {
                Content = content,
                Settings = settings,
                ValidationDate = DateTime.UtcNow
            };

            // Basic content metrics
            report.WordCount = CountWords(content);
            report.CharacterCount = content.Length;
            report.SentenceCount = CountSentences(content);
            report.ParagraphCount = CountParagraphs(content);

            // Quality checks
            var validationTasks = new List<Task>
            {
                ValidateContentLengthAsync(report, settings),
                ValidateReadabilityAsync(report, settings),
                ValidateSEOElementsAsync(report, settings),
                ValidateContentStructureAsync(report, settings),
                ValidateKeywordDensityAsync(report, settings),
                ValidateLinkQualityAsync(report, settings),
                ValidateMediaElementsAsync(report, settings)
            };

            await Task.WhenAll(validationTasks);

            // Calculate overall quality score
            report.OverallQualityScore = CalculateOverallQualityScore(report);
            report.IsQualityAcceptable = report.OverallQualityScore >= settings.MinOverallScore;

            // Generate recommendations
            if (!report.IsQualityAcceptable)
            {
                report.QualityRecommendations = GenerateQualityRecommendations(report);
            }

            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate content quality");
            throw;
        }
    }

    /// <summary>
    /// Validate readability score
    /// </summary>
    public async Task<ReadabilityAnalysis> AnalyzeReadabilityAsync(string content)
    {
        try
        {
            var analysis = new ReadabilityAnalysis
            {
                Content = content,
                AnalysisDate = DateTime.UtcNow
            };

            // Calculate multiple readability scores
            analysis.FleschReadingEase = CalculateFleschReadingEase(content);
            analysis.FleschKincaidGrade = CalculateFleschKincaidGrade(content);
            analysis.GunningFogIndex = CalculateGunningFogIndex(content);
            analysis.ColemanLiauIndex = CalculateColemanLiauIndex(content);

            // Average readability score
            analysis.AverageReadabilityScore = (
                analysis.FleschReadingEase +
                (100 - Math.Min(100, analysis.FleschKincaidGrade * 10)) +
                (100 - Math.Min(100, analysis.GunningFogIndex * 10)) +
                (100 - Math.Min(100, analysis.ColemanLiauIndex * 10))
            ) / 4;

            // Readability level
            analysis.ReadabilityLevel = analysis.AverageReadabilityScore switch
            {
                >= 90 => "Very Easy",
                >= 80 => "Easy",
                >= 70 => "Fairly Easy",
                >= 60 => "Standard",
                >= 50 => "Fairly Difficult",
                >= 30 => "Difficult",
                _ => "Very Difficult"
            };

            analysis.IsReadable = analysis.AverageReadabilityScore >= READABILITY_THRESHOLD;

            if (!analysis.IsReadable)
            {
                analysis.ReadabilityIssues = IdentifyReadabilityIssues(content, analysis);
                analysis.ImprovementSuggestions = GenerateReadabilityImprovements(analysis.ReadabilityIssues);
            }

            return analysis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze readability");
            throw;
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
        
        var duplicateKeyPhrases = await FindDuplicateKeyPhrasesAsync(content);
        if (duplicateKeyPhrases.Any())
        {
            violations.Add($"Found {duplicateKeyPhrases.Count} duplicate key phrases across existing content");
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
        
        if (violations.Any(v => v.Contains("duplicate key phrases")))
        {
            recommendations.Add("Vary keyword usage and implement semantic variations");
            recommendations.Add("Use related terms and contextual keywords instead of repetitive phrases");
        }
        
        return recommendations;
    }

    private async Task<List<string>> FindDuplicateKeyPhrasesAsync(string content)
    {
        var keyPhrases = ExtractKeyPhrases(NormalizeContentForComparison(content));
        var duplicates = new List<string>();
        
        // This would check against a database of existing key phrases
        // Simplified implementation for now
        var commonPhrases = new HashSet<string> 
        { 
            "best movies", "watch online", "streaming service", "movie review", 
            "tv show", "entertainment", "popular content", "latest releases" 
        };
        
        foreach (var phrase in keyPhrases)
        {
            if (commonPhrases.Any(cp => phrase.Contains(cp)))
            {
                duplicates.Add(phrase);
            }
        }
        
        return duplicates;
    }

    // Content variation methods
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
        var firstParagraph = paragraphs.First();
        var lastParagraph = paragraphs.Last();
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
        var expandedContent = content;
        
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

    // Quality validation methods
    private ContentQualitySettings GetDefaultQualitySettings()
    {
        return new ContentQualitySettings
        {
            MinWordCount = MIN_WORD_COUNT,
            MaxWordCount = MAX_WORD_COUNT,
            MinReadabilityScore = READABILITY_THRESHOLD,
            MinOverallScore = 75.0f,
            RequiredHeadings = true,
            MaxKeywordDensity = 0.03f,
            MinInternalLinks = 2,
            MaxExternalLinks = 5
        };
    }

    private async Task ValidateContentLengthAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var lengthCheck = new QualityCheck
        {
            CheckName = "Content Length",
            CheckType = "Structure"
        };

        if (report.WordCount < settings.MinWordCount)
        {
            lengthCheck.IsPassed = false;
            lengthCheck.Score = (float)report.WordCount / settings.MinWordCount * 100;
            lengthCheck.Issues.Add($"Content is too short ({report.WordCount} words). Minimum: {settings.MinWordCount} words");
            lengthCheck.Recommendations.Add("Expand content with more detailed information and examples");
        }
        else if (report.WordCount > settings.MaxWordCount)
        {
            lengthCheck.IsPassed = false;
            lengthCheck.Score = Math.Max(0, 100 - ((report.WordCount - settings.MaxWordCount) / 100));
            lengthCheck.Issues.Add($"Content is too long ({report.WordCount} words). Maximum: {settings.MaxWordCount} words");
            lengthCheck.Recommendations.Add("Consider breaking content into multiple pages or sections");
        }
        else
        {
            lengthCheck.IsPassed = true;
            lengthCheck.Score = 100;
        }

        report.QualityChecks.Add(lengthCheck);
    }

    private async Task ValidateReadabilityAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var readabilityCheck = new QualityCheck
        {
            CheckName = "Readability",
            CheckType = "Content"
        };

        var readabilityScore = CalculateReadabilityScore(report.Content);
        readabilityCheck.Score = readabilityScore;
        
        if (readabilityScore >= settings.MinReadabilityScore)
        {
            readabilityCheck.IsPassed = true;
        }
        else
        {
            readabilityCheck.IsPassed = false;
            readabilityCheck.Issues.Add($"Content readability score ({readabilityScore:F1}) is below threshold ({settings.MinReadabilityScore})");
            readabilityCheck.Recommendations.Add("Use shorter sentences and simpler vocabulary");
            readabilityCheck.Recommendations.Add("Break up long paragraphs");
            readabilityCheck.Recommendations.Add("Add subheadings to improve structure");
        }

        report.QualityChecks.Add(readabilityCheck);
    }

    private async Task ValidateSEOElementsAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var seoCheck = new QualityCheck
        {
            CheckName = "SEO Elements",
            CheckType = "SEO"
        };

        var issues = new List<string>();
        var score = 100f;

        // Check for headings
        if (settings.RequiredHeadings)
        {
            var headingCount = Regex.Matches(report.Content, @"<h[1-6]", RegexOptions.IgnoreCase).Count;
            if (headingCount == 0)
            {
                issues.Add("No headings found in content");
                score -= 25;
            }
            else if (headingCount == 1)
            {
                issues.Add("Only one heading found - consider adding more for better structure");
                score -= 10;
            }
        }

        // Check for meta elements in content structure
        var hasBoldText = Regex.IsMatch(report.Content, @"<(strong|b)>", RegexOptions.IgnoreCase);
        if (!hasBoldText)
        {
            issues.Add("No bold text found - consider emphasizing key points");
            score -= 10;
        }

        seoCheck.Score = Math.Max(0, score);
        seoCheck.IsPassed = issues.Count == 0;
        seoCheck.Issues = issues;

        if (!seoCheck.IsPassed)
        {
            seoCheck.Recommendations.Add("Add proper heading structure (H1, H2, H3)");
            seoCheck.Recommendations.Add("Use bold text to emphasize important keywords");
            seoCheck.Recommendations.Add("Include relevant internal and external links");
        }

        report.QualityChecks.Add(seoCheck);
    }

    private async Task ValidateContentStructureAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var structureCheck = new QualityCheck
        {
            CheckName = "Content Structure",
            CheckType = "Structure"
        };

        var score = 100f;
        var issues = new List<string>();

        // Check paragraph distribution
        if (report.ParagraphCount < 3)
        {
            issues.Add("Too few paragraphs - content lacks proper structure");
            score -= 20;
        }

        // Check average paragraph length
        var avgWordsPerParagraph = (float)report.WordCount / report.ParagraphCount;
        if (avgWordsPerParagraph > 150)
        {
            issues.Add("Paragraphs are too long on average");
            score -= 15;
        }

        // Check sentence variety
        var avgWordsPerSentence = (float)report.WordCount / report.SentenceCount;
        if (avgWordsPerSentence > 25)
        {
            issues.Add("Sentences are too long on average");
            score -= 10;
        }

        structureCheck.Score = Math.Max(0, score);
        structureCheck.IsPassed = issues.Count == 0;
        structureCheck.Issues = issues;

        if (!structureCheck.IsPassed)
        {
            structureCheck.Recommendations.Add("Break content into more paragraphs");
            structureCheck.Recommendations.Add("Use shorter, more varied sentence lengths");
            structureCheck.Recommendations.Add("Add bullet points or numbered lists where appropriate");
        }

        report.QualityChecks.Add(structureCheck);
    }

    private async Task ValidateKeywordDensityAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var keywordCheck = new QualityCheck
        {
            CheckName = "Keyword Density",
            CheckType = "SEO"
        };

        // Extract potential keywords (simplified)
        var words = Regex.Split(report.Content.ToLowerInvariant(), @"\W+")
            .Where(w => w.Length > 3)
            .ToList();

        var wordFrequency = words.GroupBy(w => w)
            .ToDictionary(g => g.Key, g => g.Count());

        var highestDensity = 0f;
        var problematicKeywords = new List<string>();

        foreach (var kvp in wordFrequency)
        {
            var density = (float)kvp.Value / words.Count;
            if (density > settings.MaxKeywordDensity)
            {
                problematicKeywords.Add($"{kvp.Key} ({density:P1})");
                highestDensity = Math.Max(highestDensity, density);
            }
        }

        if (problematicKeywords.Any())
        {
            keywordCheck.IsPassed = false;
            keywordCheck.Score = Math.Max(0, 100 - (highestDensity / settings.MaxKeywordDensity * 50));
            keywordCheck.Issues.Add($"High keyword density detected: {string.Join(", ", problematicKeywords)}");
            keywordCheck.Recommendations.Add("Reduce keyword repetition and use synonyms");
            keywordCheck.Recommendations.Add("Focus on natural language and user experience");
        }
        else
        {
            keywordCheck.IsPassed = true;
            keywordCheck.Score = 100;
        }

        report.QualityChecks.Add(keywordCheck);
    }

    private async Task ValidateLinkQualityAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var linkCheck = new QualityCheck
        {
            CheckName = "Link Quality",
            CheckType = "SEO"
        };

        var internalLinks = Regex.Matches(report.Content, @"<a[^>]+href\s*=\s*[""']/[^""']*[""']", RegexOptions.IgnoreCase);
        var externalLinks = Regex.Matches(report.Content, @"<a[^>]+href\s*=\s*[""']https?://[^""']*[""']", RegexOptions.IgnoreCase);

        var score = 100f;
        var issues = new List<string>();

        if (internalLinks.Count < settings.MinInternalLinks)
        {
            issues.Add($"Too few internal links ({internalLinks.Count}). Minimum: {settings.MinInternalLinks}");
            score -= 20;
        }

        if (externalLinks.Count > settings.MaxExternalLinks)
        {
            issues.Add($"Too many external links ({externalLinks.Count}). Maximum: {settings.MaxExternalLinks}");
            score -= 15;
        }

        linkCheck.Score = Math.Max(0, score);
        linkCheck.IsPassed = issues.Count == 0;
        linkCheck.Issues = issues;

        if (!linkCheck.IsPassed)
        {
            linkCheck.Recommendations.Add("Add relevant internal links to related content");
            linkCheck.Recommendations.Add("Review external links for relevance and quality");
            linkCheck.Recommendations.Add("Ensure all links have descriptive anchor text");
        }

        report.QualityChecks.Add(linkCheck);
    }

    private async Task ValidateMediaElementsAsync(ContentQualityReport report, ContentQualitySettings settings)
    {
        var mediaCheck = new QualityCheck
        {
            CheckName = "Media Elements",
            CheckType = "Content"
        };

        var images = Regex.Matches(report.Content, @"<img[^>]*>", RegexOptions.IgnoreCase);
        var imagesWithAlt = Regex.Matches(report.Content, @"<img[^>]*alt\s*=\s*[""'][^""']+[""'][^>]*>", RegexOptions.IgnoreCase);

        var score = 100f;
        var issues = new List<string>();

        if (images.Count > 0)
        {
            var missingAltCount = images.Count - imagesWithAlt.Count;
            if (missingAltCount > 0)
            {
                issues.Add($"{missingAltCount} images missing alt text");
                score -= (float)missingAltCount / images.Count * 30;
            }
        }

        mediaCheck.Score = Math.Max(0, score);
        mediaCheck.IsPassed = issues.Count == 0;
        mediaCheck.Issues = issues;

        if (!mediaCheck.IsPassed)
        {
            mediaCheck.Recommendations.Add("Add descriptive alt text to all images");
            mediaCheck.Recommendations.Add("Optimize image sizes for web performance");
        }

        report.QualityChecks.Add(mediaCheck);
    }

    private float CalculateOverallQualityScore(ContentQualityReport report)
    {
        if (!report.QualityChecks.Any())
            return 0f;

        return report.QualityChecks.Average(c => c.Score);
    }

    private List<string> GenerateQualityRecommendations(ContentQualityReport report)
    {
        var recommendations = new List<string>();
        
        foreach (var check in report.QualityChecks.Where(c => !c.IsPassed))
        {
            recommendations.AddRange(check.Recommendations);
        }
        
        return recommendations.Distinct().ToList();
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

    private float CalculateFleschKincaidGrade(string content)
    {
        var sentences = CountSentences(content);
        var words = CountWords(content);
        var syllables = EstimateSyllables(content);

        if (sentences == 0 || words == 0) return 0;

        var avgWordsPerSentence = (float)words / sentences;
        var avgSyllablesPerWord = (float)syllables / words;

        return 0.39f * avgWordsPerSentence + 11.8f * avgSyllablesPerWord - 15.59f;
    }

    private float CalculateGunningFogIndex(string content)
    {
        var sentences = CountSentences(content);
        var words = CountWords(content);
        var complexWords = CountComplexWords(content);

        if (sentences == 0 || words == 0) return 0;

        var avgWordsPerSentence = (float)words / sentences;
        var percentComplexWords = (float)complexWords / words * 100;

        return 0.4f * (avgWordsPerSentence + percentComplexWords);
    }

    private float CalculateColemanLiauIndex(string content)
    {
        var sentences = CountSentences(content);
        var words = CountWords(content);
        var letters = CountLetters(content);

        if (words == 0) return 0;

        var avgLettersPer100Words = (float)letters / words * 100;
        var avgSentencesPer100Words = (float)sentences / words * 100;

        return 0.0588f * avgLettersPer100Words - 0.296f * avgSentencesPer100Words - 15.8f;
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

    private int CountParagraphs(string content)
    {
        return Math.Max(1, content.Split(new[] { "</p>", "\n\n" }, StringSplitOptions.RemoveEmptyEntries).Length);
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

    private int CountComplexWords(string content)
    {
        var plainText = Regex.Replace(content, @"<[^>]*>", " ");
        var words = plainText.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        
        return words.Count(word => EstimateSyllablesInWord(word) >= 3);
    }

    private int CountLetters(string content)
    {
        var plainText = Regex.Replace(content, @"<[^>]*>", "");
        return plainText.Count(char.IsLetter);
    }

    private int EstimateSyllablesInWord(string word)
    {
        var vowels = word.Count(c => "aeiouAEIOU".Contains(c));
        return Math.Max(1, vowels);
    }

    private List<string> IdentifyReadabilityIssues(string content, ReadabilityAnalysis analysis)
    {
        var issues = new List<string>();
        
        if (analysis.FleschReadingEase < 60)
            issues.Add("Text is difficult to read - consider simplifying vocabulary");
        
        if (analysis.FleschKincaidGrade > 12)
            issues.Add("Reading level is too advanced for general audience");
        
        if (analysis.GunningFogIndex > 12)
            issues.Add("Too many complex words - simplify where possible");
        
        var avgWordsPerSentence = (float)CountWords(content) / CountSentences(content);
        if (avgWordsPerSentence > 20)
            issues.Add("Sentences are too long on average");
        
        return issues;
    }

    private List<string> GenerateReadabilityImprovements(List<string> issues)
    {
        var improvements = new List<string>();
        
        if (issues.Any(i => i.Contains("difficult to read")))
        {
            improvements.Add("Use simpler, more common words");
            improvements.Add("Replace jargon with plain language");
        }
        
        if (issues.Any(i => i.Contains("reading level")))
        {
            improvements.Add("Target 8th-12th grade reading level");
            improvements.Add("Explain complex concepts in simple terms");
        }
        
        if (issues.Any(i => i.Contains("complex words")))
        {
            improvements.Add("Replace complex words with simpler alternatives");
            improvements.Add("Define technical terms when first used");
        }
        
        if (issues.Any(i => i.Contains("sentences are too long")))
        {
            improvements.Add("Break long sentences into shorter ones");
            improvements.Add("Use bullet points for lists and complex information");
        }
        
        return improvements;
    }

    #endregion
}

#region Supporting Models and Interfaces

public interface IContentQualityValidatorService
{
    Task<ContentUniquenessResult> ValidateContentUniquenessAsync(string content, string? excludePageSlug = null);
    Task<List<DuplicateContentGroup>> DetectDuplicateContentAsync(float similarityThreshold = 0.75f);
    Task<List<ContentVariation>> GenerateContentVariationsAsync(string originalContent, int variationCount = 5);
    Task<ContentQualityReport> ValidateContentQualityAsync(string content, ContentQualitySettings? settings = null);
    Task<ReadabilityAnalysis> AnalyzeReadabilityAsync(string content);
}

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

public class SimilarContentItem
{
    public long PageId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public float SimilarityScore { get; set; }
    public string SimilarityType { get; set; } = string.Empty;
}

public class DuplicateContentGroup
{
    public SimilarContentItem MasterPage { get; set; } = new();
    public List<SimilarContentItem> DuplicatePages { get; set; } = new();
    public float GroupSimilarityScore { get; set; }
    public DateTime DetectedAt { get; set; }
}

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

public class ContentQualityReport
{
    public string Content { get; set; } = string.Empty;
    public ContentQualitySettings Settings { get; set; } = new();
    public int WordCount { get; set; }
    public int CharacterCount { get; set; }
    public int SentenceCount { get; set; }
    public int ParagraphCount { get; set; }
    public float OverallQualityScore { get; set; }
    public bool IsQualityAcceptable { get; set; }
    public List<QualityCheck> QualityChecks { get; set; } = new();
    public List<string> QualityRecommendations { get; set; } = new();
    public DateTime ValidationDate { get; set; }
}

public class ContentQualitySettings
{
    public int MinWordCount { get; set; } = 300;
    public int MaxWordCount { get; set; } = 3000;
    public float MinReadabilityScore { get; set; } = 60.0f;
    public float MinOverallScore { get; set; } = 75.0f;
    public bool RequiredHeadings { get; set; } = true;
    public float MaxKeywordDensity { get; set; } = 0.03f;
    public int MinInternalLinks { get; set; } = 2;
    public int MaxExternalLinks { get; set; } = 5;
}

public class QualityCheck
{
    public string CheckName { get; set; } = string.Empty;
    public string CheckType { get; set; } = string.Empty;
    public bool IsPassed { get; set; }
    public float Score { get; set; }
    public List<string> Issues { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

public class ReadabilityAnalysis
{
    public string Content { get; set; } = string.Empty;
    public float FleschReadingEase { get; set; }
    public float FleschKincaidGrade { get; set; }
    public float GunningFogIndex { get; set; }
    public float ColemanLiauIndex { get; set; }
    public float AverageReadabilityScore { get; set; }
    public string ReadabilityLevel { get; set; } = string.Empty;
    public bool IsReadable { get; set; }
    public List<string> ReadabilityIssues { get; set; } = new();
    public List<string> ImprovementSuggestions { get; set; } = new();
    public DateTime AnalysisDate { get; set; }
}

#endregion