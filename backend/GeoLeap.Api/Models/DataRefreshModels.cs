using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models
{
    public class RefreshRequest
    {
        [Required]
        public string ContentId { get; set; } = string.Empty;
        
        [Required]
        public ContentType ContentType { get; set; }
        
        public List<RefreshDataSource> DataSources { get; set; } = new();
        
        public RefreshPriority Priority { get; set; } = RefreshPriority.Standard;
        
        public bool ForceRefresh { get; set; }
    }

    public class RefreshOperation
    {
        public string Id { get; set; } = string.Empty;
        public string ContentId { get; set; } = string.Empty;
        public ContentType ContentType { get; set; }
        public RefreshPriority Priority { get; set; }
        public DateTime ScheduledAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public RefreshStatus Status { get; set; }
        public List<RefreshDataSource> DataSources { get; set; } = new();
        public int RetryCount { get; set; }
        public string? ErrorMessage { get; set; }
        public bool IsImmediate { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
        public string? CorrelationId { get; set; }
    }

    public class BatchRefreshRequest
    {
        [Required]
        public List<string> ContentIds { get; set; } = new();
        
        [Required]
        public ContentType ContentType { get; set; }
        
        public RefreshPriority Priority { get; set; } = RefreshPriority.Standard;
        
        public List<RefreshDataSource> DataSources { get; set; } = new() { RefreshDataSource.All };
    }

    public class RefreshResult
    {
        public bool Success { get; set; }
        public bool HasChanges { get; set; }
        public string? Error { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
        public TimeSpan ProcessingTime { get; set; }
    }

    public class RefreshStatistics
    {
        public int TotalOperations { get; set; }
        public int CompletedOperations { get; set; }
        public int FailedOperations { get; set; }
        public int InProgressOperations { get; set; }
        public double SuccessRate { get; set; }
        public TimeSpan AverageProcessingTime { get; set; }
        public Dictionary<RefreshPriority, int> OperationsByPriority { get; set; } = new();
        public Dictionary<RefreshDataSource, int> OperationsBySource { get; set; } = new();
        public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ChangeAnalysis
    {
        public bool HasSignificantChanges { get; set; }
        public List<DataChange> Changes { get; set; } = new();
        public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
        public string ContentId { get; set; } = string.Empty;
        public ContentType ContentType { get; set; }
    }

    public class DataChange
    {
        public ChangeType Type { get; set; }
        public int Count { get; set; }
        public List<string> Details { get; set; } = new();
        public string? Description { get; set; }
        public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    }

    public class RefreshConfiguration
    {
        public int MaxConcurrentRefreshes { get; set; } = 10;
        public int BatchSize { get; set; } = 100;
        public TimeSpan BatchDelay { get; set; } = TimeSpan.FromSeconds(1);
        public Dictionary<string, TimeSpan> RefreshIntervals { get; set; } = new()
        {
            { "High", TimeSpan.FromHours(4) },
            { "Medium", TimeSpan.FromHours(12) },
            { "Standard", TimeSpan.FromHours(24) },
            { "Low", TimeSpan.FromDays(3) }
        };
        public RetryConfiguration RetryConfiguration { get; set; } = new();
        public StalenessConfiguration StalenessThresholds { get; set; } = new();
        public bool EnableChangeDetection { get; set; } = true;
        public bool EnableBatchProcessing { get; set; } = true;
        public int IdlePollIntervalSeconds { get; set; } = 60;
    }

    public class RetryConfiguration
    {
        public Dictionary<string, int> MaxRetries { get; set; } = new()
        {
            { "Critical", 5 },
            { "High", 3 },
            { "Medium", 2 },
            { "Standard", 1 },
            { "Low", 0 }
        };
        public TimeSpan BaseRetryDelay { get; set; } = TimeSpan.FromMinutes(1);
        public int MaxRetryDelayMinutes { get; set; } = 30;
        public double BackoffMultiplier { get; set; } = 2.0;
    }

    public class StalenessConfiguration
    {
        public TimeSpan Critical { get; set; } = TimeSpan.FromHours(12);
        public TimeSpan Warning { get; set; } = TimeSpan.FromHours(24);
        public TimeSpan Alert { get; set; } = TimeSpan.FromHours(48);
    }

    public enum RefreshPriority
    {
        Low,
        Standard,
        Medium,
        High,
        Critical
    }

    public enum RefreshStatus
    {
        Scheduled,
        InProgress,
        Completed,
        Failed,
        Cancelled,
        Retrying
    }

    public enum RefreshDataSource
    {
        StreamingAvailability,
        ContentMetadata,
        Images,
        All
    }

    public enum ChangeType
    {
        StreamingServiceAdded,
        StreamingServiceRemoved,
        PriceChanged,
        TitleChanged,
        RatingChanged,
        CastUpdated,
        GenresChanged,
        MetadataUpdated,
        ImageUpdated,
        AvailabilityChanged
    }

    // ContentType enum is defined in StreamingAvailability.cs
}