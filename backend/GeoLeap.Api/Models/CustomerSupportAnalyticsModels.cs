using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class SupportDashboardDto
{
    public SupportMetricsOverview Overview { get; set; } = new();
    public List<AgentPerformanceDto> TopPerformers { get; set; } = new();
    public List<SupportTrendDto> Trends { get; set; } = new();
    public List<CategoryAnalyticsDto> CategoryBreakdown { get; set; } = new();
    public List<ChannelAnalyticsDto> ChannelDistribution { get; set; } = new();
    public SlaMetricsDto SlaMetrics { get; set; } = new();
    public CustomerSatisfactionDto CustomerSatisfaction { get; set; } = new();
}

public class SupportMetricsOverview
{
    public int TotalTicketsToday { get; set; }
    public int OpenTickets { get; set; }
    public int ResolvedTicketsToday { get; set; }
    public double ResolutionRate { get; set; }
    public TimeSpan AverageResponseTime { get; set; }
    public TimeSpan AverageResolutionTime { get; set; }
    public double CustomerSatisfactionScore { get; set; }
    public double SlaComplianceRate { get; set; }
    public int ActiveAgents { get; set; }
    public decimal TotalRefundsToday { get; set; }
    public double TicketVolumeChange { get; set; }
    public double ResolutionTimeChange { get; set; }
    public double SatisfactionChange { get; set; }
}

public class AgentPerformanceDto
{
    public Guid AgentId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string AgentEmail { get; set; } = string.Empty;
    public int TicketsHandled { get; set; }
    public int TicketsResolved { get; set; }
    public double ResolutionRate { get; set; }
    public TimeSpan AverageResponseTime { get; set; }
    public TimeSpan AverageResolutionTime { get; set; }
    public double CustomerSatisfactionScore { get; set; }
    public double OverallPerformanceScore { get; set; }
    public string PerformanceGrade { get; set; } = string.Empty;
    public List<string> Strengths { get; set; } = new();
    public List<string> ImprovementAreas { get; set; } = new();
}

public class SupportTrendDto
{
    public DateTime Date { get; set; }
    public int TotalTickets { get; set; }
    public int ResolvedTickets { get; set; }
    public int OpenTickets { get; set; }
    public TimeSpan AverageResponseTime { get; set; }
    public TimeSpan AverageResolutionTime { get; set; }
    public double CustomerSatisfactionScore { get; set; }
    public double SlaComplianceRate { get; set; }
}

public class CategoryAnalyticsDto
{
    public string Category { get; set; } = string.Empty;
    public string SubCategory { get; set; } = string.Empty;
    public int TicketCount { get; set; }
    public double Percentage { get; set; }
    public TimeSpan AverageResolutionTime { get; set; }
    public double CustomerSatisfactionScore { get; set; }
    public double TrendChange { get; set; }
    public List<string> CommonIssues { get; set; } = new();
}

public class ChannelAnalyticsDto
{
    public string Channel { get; set; } = string.Empty;
    public int TicketCount { get; set; }
    public double Percentage { get; set; }
    public TimeSpan AverageResponseTime { get; set; }
    public TimeSpan AverageResolutionTime { get; set; }
    public double CustomerSatisfactionScore { get; set; }
    public double EfficiencyScore { get; set; }
}

public class SlaMetricsDto
{
    public double OverallComplianceRate { get; set; }
    public int TotalTicketsWithSla { get; set; }
    public int TicketsWithinSla { get; set; }
    public int SlaBreaches { get; set; }
    public List<SlaBreachDto> RecentBreaches { get; set; } = new();
    public Dictionary<string, double> ComplianceByPriority { get; set; } = new();
    public Dictionary<string, double> ComplianceByCategory { get; set; } = new();
}

public class SlaBreachDto
{
    public Guid TicketId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public TimeSpan SlaTarget { get; set; }
    public TimeSpan ActualTime { get; set; }
    public TimeSpan OverdueBy { get; set; }
}

public class CustomerSatisfactionDto
{
    public double OverallScore { get; set; }
    public int TotalResponses { get; set; }
    public int PositiveResponses { get; set; }
    public int NeutralResponses { get; set; }
    public int NegativeResponses { get; set; }
    public List<SatisfactionTrendDto> Trends { get; set; } = new();
    public Dictionary<string, double> ScoreByCategory { get; set; } = new();
    public Dictionary<string, double> ScoreByChannel { get; set; } = new();
    public List<CustomerFeedbackDto> RecentFeedback { get; set; } = new();
}

public class SatisfactionTrendDto
{
    public DateTime Date { get; set; }
    public double Score { get; set; }
    public int ResponseCount { get; set; }
    public double TrendChange { get; set; }
}

public class CustomerFeedbackDto
{
    public Guid FeedbackId { get; set; }
    public Guid TicketId { get; set; }
    public string CustomerEmail { get; set; } = string.Empty;
    public double Rating { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Sentiment { get; set; } = string.Empty;
}

public class RealtimeMetricsDto
{
    public DateTime Timestamp { get; set; }
    public int ActiveTickets { get; set; }
    public int TicketsInQueue { get; set; }
    public int AvailableAgents { get; set; }
    public int BusyAgents { get; set; }
    public TimeSpan AverageWaitTime { get; set; }
    public int TicketsCreatedLastHour { get; set; }
    public int TicketsResolvedLastHour { get; set; }
    public List<UrgentTicketDto> UrgentTickets { get; set; } = new();
    public List<AgentStatusDto> AgentStatuses { get; set; } = new();
}

public class UrgentTicketDto
{
    public Guid TicketId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public TimeSpan Age { get; set; }
    public string CustomerEmail { get; set; } = string.Empty;
}

public class AgentStatusDto
{
    public Guid AgentId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ActiveTickets { get; set; }
    public DateTime LastActivity { get; set; }
    public TimeSpan AvailabilityToday { get; set; }
}

// Request/Response DTOs
public class SupportAnalyticsRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? AgentId { get; set; }
    public string? Category { get; set; }
    public string? Priority { get; set; }
    public string? Channel { get; set; }
    public bool IncludeTrends { get; set; } = true;
    public bool IncludeAgentMetrics { get; set; } = true;
    public bool IncludeCategoryBreakdown { get; set; } = true;
    public bool IncludeChannelAnalysis { get; set; } = true;
    public bool IncludeSlaMetrics { get; set; } = true;
    public bool IncludeCustomerSatisfaction { get; set; } = true;
}

public class SupportAnalyticsResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public int? TotalRecords { get; set; }
}

public class SupportExportRequest
{
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    public string Format { get; set; } = "csv";
    
    public string? Category { get; set; }
    
    public string? AgentId { get; set; }
    
    public bool IncludeDetailedMetrics { get; set; } = true;
}