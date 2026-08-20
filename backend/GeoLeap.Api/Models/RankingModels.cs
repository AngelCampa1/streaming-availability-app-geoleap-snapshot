using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

public class RankingConfiguration
{
    public decimal RelevanceWeight { get; set; } = 0.40m;
    public decimal PopularityWeight { get; set; } = 0.25m;
    public decimal AvailabilityWeight { get; set; } = 0.15m;
    public decimal FreshnessWeight { get; set; } = 0.10m;
    public decimal PersonalizationWeight { get; set; } = 0.07m;
    public decimal ClickThroughRateWeight { get; set; } = 0.03m;

    public void Normalize()
    {
        var total = RelevanceWeight + PopularityWeight + AvailabilityWeight + 
                   FreshnessWeight + PersonalizationWeight + ClickThroughRateWeight;
        
        if (total != 1.0m)
        {
            RelevanceWeight /= total;
            PopularityWeight /= total;
            AvailabilityWeight /= total;
            FreshnessWeight /= total;
            PersonalizationWeight /= total;
            ClickThroughRateWeight /= total;
        }
    }
}

public class RankingScore
{
    public decimal TotalScore { get; set; }
    public RelevanceScore Relevance { get; set; } = new();
    public PopularityScore Popularity { get; set; } = new();
    public AvailabilityScore Availability { get; set; } = new();
    public FreshnessScore Freshness { get; set; } = new();
    public PersonalizationScore Personalization { get; set; } = new();
    public ClickThroughRateScore ClickThroughRate { get; set; } = new();
    public List<string> ExplanationFactors { get; set; } = new();
}

public class RelevanceScore
{
    public decimal Score { get; set; }
    public bool IsExactMatch { get; set; }
    public bool IsFuzzyMatch { get; set; }
    public decimal EditDistance { get; set; }
    public List<string> MatchedFields { get; set; } = new();
    public List<string> AlternativeTitles { get; set; } = new();
}

public class PopularityScore
{
    public decimal Score { get; set; }
    public decimal TmdbPopularity { get; set; }
    public decimal ImdbRating { get; set; }
    public int InternalSearchCount { get; set; }
    public int SocialMentions { get; set; }
}

public class AvailabilityScore
{
    public decimal Score { get; set; }
    public int ServiceCount { get; set; }
    public int CountryCount { get; set; }
    public List<string> StreamingTypes { get; set; } = new();
    public bool IsGloballyAvailable { get; set; }
}

public class FreshnessScore
{
    public decimal Score { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public int AgeInMonths { get; set; }
    public bool IsTrending { get; set; }
    public bool IsSeasonalContent { get; set; }
}

public class PersonalizationScore
{
    public decimal Score { get; set; }
    public List<string> UserPreferredGenres { get; set; } = new();
    public List<string> UserPreferredServices { get; set; } = new();
    public decimal GenreMatchScore { get; set; }
    public decimal ServiceMatchScore { get; set; }
}

public class ClickThroughRateScore
{
    public decimal Score { get; set; }
    public decimal ClickThroughRate { get; set; }
    public int TotalViews { get; set; }
    public int TotalClicks { get; set; }
}

public class RankingRequest
{
    [Required]
    public string Query { get; set; } = string.Empty;
    
    [Required]
    public List<GlobalSearchResult> Results { get; set; } = new();
    
    public string? UserId { get; set; }
    public RankingConfiguration? Configuration { get; set; }
    public bool IncludeExplanations { get; set; } = false;
    public int MaxResults { get; set; } = 100;
}

public class RankedSearchResult
{
    public GlobalSearchResult Content { get; set; } = new();
    public RankingScore Ranking { get; set; } = new();
    public int Position { get; set; }
}

public class RankingResponse
{
    public List<RankedSearchResult> Results { get; set; } = new();
    public RankingMetadata Metadata { get; set; } = new();
}

public class RankingMetadata
{
    public int TotalResults { get; set; }
    public TimeSpan ComputationTime { get; set; }
    public RankingConfiguration UsedConfiguration { get; set; } = new();
    public List<string> DataSources { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class FuzzyMatchResult
{
    public string OriginalText { get; set; } = string.Empty;
    public string MatchedText { get; set; } = string.Empty;
    public decimal Similarity { get; set; }
    public int LevenshteinDistance { get; set; }
    public decimal JaroWinklerScore { get; set; }
    public bool IsPhoneticMatch { get; set; }
}

public class ContentPopularityData
{
    public string ContentId { get; set; } = string.Empty;
    public decimal TmdbPopularity { get; set; }
    public decimal ImdbRating { get; set; }
    public int SearchFrequency { get; set; }
    public int ClickCount { get; set; }
    public int ViewCount { get; set; }
    public DateTime LastUpdated { get; set; }
    public List<string> TrendingCountries { get; set; } = new();
}

[NotMapped] // DTO class - not a database entity
public class UserPreferences
{
    public string UserId { get; set; } = string.Empty;
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> PreferredServices { get; set; } = new();
    public List<string> PreferredCountries { get; set; } = new();
    public ContentType PreferredContentType { get; set; } = ContentType.All;
    public int MinRating { get; set; } = 0;
    public DateTime LastUpdated { get; set; }
}

public class TypoCorrection
{
    public string OriginalQuery { get; set; } = string.Empty;
    public string CorrectedQuery { get; set; } = string.Empty;
    public decimal Confidence { get; set; }
    public List<string> SuggestedAlternatives { get; set; } = new();
}