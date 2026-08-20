namespace GeoLeap.Api.Configuration;

/// <summary>
/// Configuration settings for MaxMind GeoLite2 geolocation database
/// </summary>
public class MaxMindSettings
{
    public const string SectionName = "MaxMind";

    /// <summary>
    /// Path to the GeoLite2 database file (.mmdb)
    /// Supports both absolute and relative paths (relative to ContentRootPath)
    /// </summary>
    public string DatabasePath { get; set; } = "Data/GeoLite2-Country.mmdb";
}
