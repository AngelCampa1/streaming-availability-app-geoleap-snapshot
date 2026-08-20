using GeoLeap.Api.Models;
using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Advanced Content Generation Engine with NLP and AI capabilities
/// </summary>
public interface IContentGenerationEngineService
{
    /// <summary>
    /// Generate unique content based on template and data variables
    /// </summary>
    Task<GeneratedContent> GenerateContentAsync(SeoTemplate template, Dictionary<string, object> variables, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate content in batches for scalability
    /// </summary>
    Task<IEnumerable<GeneratedContent>> GenerateBatchContentAsync(SeoTemplate template, IEnumerable<Dictionary<string, object>> variableSets, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate SEO-optimized content with keyword integration
    /// </summary>
    Task<GeneratedContent> GenerateSeoOptimizedContentAsync(SeoTemplate template, Dictionary<string, object> variables, IEnumerable<string> targetKeywords, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Create natural language content variations
    /// </summary>
    Task<IEnumerable<string>> GenerateContentVariationsAsync(string baseContent, int variationCount = 5, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate meta descriptions optimized for CTR
    /// </summary>
    Task<string> GenerateMetaDescriptionAsync(string title, string content, IEnumerable<string> keywords, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate schema markup for content
    /// </summary>
    Task<string> GenerateSchemaMarkupAsync(ContentType contentType, Dictionary<string, object> properties, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validate content quality and SEO optimization
    /// </summary>
    Task<ContentQualityScore> ValidateContentQualityAsync(string content, IEnumerable<string> keywords, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate internal linking suggestions
    /// </summary>
    Task<IEnumerable<InternalLinkSuggestion>> GenerateInternalLinksAsync(string content, IEnumerable<SeoPage> existingPages, CancellationToken cancellationToken = default);
}

public class GeneratedContent
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string SchemaMarkup { get; set; } = string.Empty;
    public IEnumerable<string> Headings { get; set; } = new List<string>();
    public IEnumerable<InternalLinkSuggestion> SuggestedLinks { get; set; } = new List<InternalLinkSuggestion>();
    public ContentQualityScore QualityScore { get; set; } = new();
    public Dictionary<string, object> GenerationMetadata { get; set; } = new();
}

public class ContentQualityScore
{
    public double OverallScore { get; set; }
    public double ReadabilityScore { get; set; }
    public double SeoOptimizationScore { get; set; }
    public double KeywordDensityScore { get; set; }
    public double ContentLengthScore { get; set; }
    public double UniquenessScore { get; set; }
    public IEnumerable<string> Recommendations { get; set; } = new List<string>();
    public IEnumerable<string> Issues { get; set; } = new List<string>();
}

public class InternalLinkSuggestion
{
    public string AnchorText { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public string TargetPageTitle { get; set; } = string.Empty;
    public double RelevanceScore { get; set; }
    public string Context { get; set; } = string.Empty;
}

public enum ContentType
{
    Movie,
    TvShow,
    Actor,
    Director,
    Genre,
    Review,
    ListPage,
    ComparisonPage,
    GuideArticle
}