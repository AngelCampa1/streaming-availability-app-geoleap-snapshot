using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Enhanced autocomplete suggestion with rich metadata
/// </summary>
public class EnhancedAutocompleteSuggestion
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "Title";
    public double Score { get; set; }
    public string? ContentId { get; set; }
    public string? ContentType { get; set; }
    public string? PosterUrl { get; set; }
    public int? Year { get; set; }
    public List<string> Genres { get; set; } = new();
    public double? Rating { get; set; }
    public int EstimatedResults { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Search history item
/// </summary>
public class SearchHistoryItem
{
    public string Id { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int ResultsFound { get; set; }
    public string? ContentType { get; set; }
}
