using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.ProgrammaticSeo.Models;

/// <summary>
/// Content metadata for streaming content
/// </summary>
public class ContentMetadata
{
    public long Id { get; set; }
    public string ExternalId { get; set; } = string.Empty; // TMDB ID, IMDB ID, etc.
    public string Title { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty; // movie, tv_series, documentary
    public string Genre { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public int ReleaseYear { get; set; }
    public float Rating { get; set; }
    public int Duration { get; set; } // in minutes
    public string Synopsis { get; set; } = string.Empty;
    public List<string> Cast { get; set; } = new();
    public List<string> Directors { get; set; } = new();
    public List<string> StreamingServices { get; set; } = new();
    public float PopularityScore { get; set; }
    public float TrendingScore { get; set; }
    public List<string> Keywords { get; set; } = new();
    public List<string> TrendingKeywords { get; set; } = new();
    public List<string> SeoKeywords { get; set; } = new();
    public List<string> RelatedContent { get; set; } = new();
    public DateTime LastUpdated { get; set; }
    public DateTime? LastEnriched { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Content variable for template generation
/// </summary>
public class ContentVariable
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty; // string, number, boolean, array
    public string Description { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public string DefaultValue { get; set; } = string.Empty;
    public string ValidationRules { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Template variable specification
/// </summary>
public class TemplateVariable
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public string DefaultValue { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> AllowedValues { get; set; } = new();
}

/// <summary>
/// Content cluster for organizing related pages
/// </summary>
public class ContentCluster
{
    public int Id { get; set; }
    public string ClusterName { get; set; } = string.Empty;
    public string ClusteringCriteria { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<SeoPage> Pages { get; set; } = new();
}

/// <summary>
/// Link cluster for SEO architecture
/// </summary>
public class LinkCluster
{
    public string Name { get; set; } = string.Empty;
    public List<SeoPage> Pages { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Link injection point for internal linking
/// </summary>
public class LinkInjectionPoint
{
    public int Position { get; set; }
    public string Context { get; set; } = string.Empty;
    public float Score { get; set; }
}

/// <summary>
/// Internal link between pages
/// </summary>
public class InternalLink
{
    public long Id { get; set; }
    public long SourcePageId { get; set; }
    public long TargetPageId { get; set; }
    public string TargetSlug { get; set; } = string.Empty;
    public string TargetTitle { get; set; } = string.Empty;
    public string LinkText { get; set; } = string.Empty;
    public float RelevanceScore { get; set; }
    public string LinkType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// SEO analytics response
/// </summary>
public class SeoAnalyticsResponse
{
    public int TotalPages { get; set; }
    public int PublishedPages { get; set; }
    public float AverageQualityScore { get; set; }
    public int TotalViews { get; set; }
    public float AveragePositionRanking { get; set; }
    public List<TopPerformingPage> TopPages { get; set; } = new();
    public Dictionary<string, int> PagesByTemplate { get; set; } = new();
    public Dictionary<string, float> QualityMetrics { get; set; } = new();
    public PerformanceTrendAnalysis? PerformanceTrends { get; set; }
    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// Top performing page information
/// </summary>
public class TopPerformingPage
{
    public long PageId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Views { get; set; }
    public float Position { get; set; }
    public float ClickThroughRate { get; set; }
}

/// <summary>
/// Keyword cluster for template generation
/// </summary>
public class KeywordCluster
{
    public string ClusterName { get; set; } = string.Empty;
    public List<SeoKeyword> Keywords { get; set; } = new();
    public string Theme { get; set; } = string.Empty;
    public float AverageSearchVolume { get; set; }
    public float AverageDifficulty { get; set; }
}

/// <summary>
/// Keyword performance report
/// </summary>
public class KeywordPerformanceReport
{
    public string Keyword { get; set; } = string.Empty;
    public int CurrentPosition { get; set; }
    public int SearchVolume { get; set; }
    public int Clicks { get; set; }
    public int Impressions { get; set; }
    public float ClickThroughRate { get; set; }
    public DateTime ReportDate { get; set; }
}