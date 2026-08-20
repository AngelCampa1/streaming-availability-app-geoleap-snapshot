using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Additional models required for service compilation
/// </summary>

public class SystemAlertRequest
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info";
    public string Type { get; set; } = "System";
    public Dictionary<string, object>? Metadata { get; set; }
}

public class ConfigurationChangeHistory
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime ChangedAt { get; set; }
    public Guid ChangedBy { get; set; }
    public string? Reason { get; set; }
}

public class ConfigurationBackup
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ConfigurationData { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class ConfigurationUsageAnalytics
{
    public Dictionary<string, int> AccessCount { get; set; } = new();
    public Dictionary<string, DateTime> LastAccessed { get; set; } = new();
    public Dictionary<string, List<string>> AccessPatterns { get; set; } = new();
}

public class ImportResult
{
    public bool Success { get; set; }
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

// AdminSession is now defined in AdminModels.cs

public class AdminSessionStatistics
{
    public int ActiveSessions { get; set; }
    public int TotalSessions { get; set; }
    public int TotalActiveSessions { get; set; }
    public int UniqueActiveUsers { get; set; }
    public int SessionsCreatedToday { get; set; }
    public TimeSpan AverageSessionDuration { get; set; }
    public Dictionary<string, int> SessionsByHour { get; set; } = new();
    public Dictionary<string, int> TopUserAgents { get; set; } = new();
    public Dictionary<string, int> TopIpAddresses { get; set; } = new();
}