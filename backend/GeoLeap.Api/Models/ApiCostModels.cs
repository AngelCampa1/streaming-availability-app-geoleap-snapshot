using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

public class ApiCostRecord
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string ProviderId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Endpoint { get; set; } = string.Empty;
    
    public DateTime Timestamp { get; set; }
    
    public bool Success { get; set; }
    
    public int ResponseTime { get; set; }
    
    [Column(TypeName = "decimal(18,4)")]
    public decimal EstimatedCost { get; set; }
    
    public int RequestSize { get; set; }
    
    public int ResponseSize { get; set; }
    
    public Guid? UserId { get; set; }
    
    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User? User { get; set; }
}

public class BudgetConfiguration
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Limit { get; set; }
    
    public BudgetPeriod Period { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(50)]
    public string? ProviderId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class BudgetAlert
{
    [Key]
    public Guid Id { get; set; }
    
    public BudgetAlertType Type { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal Threshold { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal CurrentUtilization { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentCost { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal BudgetLimit { get; set; }
    
    public DateTime Timestamp { get; set; }
    
    [MaxLength(50)]
    public string? ProviderId { get; set; }
    
    public bool IsProcessed { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CostOptimizationRecommendation
{
    [Key]
    public Guid Id { get; set; }
    
    public OptimizationType Type { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal EstimatedMonthlySavings { get; set; }
    
    public ImplementationEffort ImplementationEffort { get; set; }
    
    public string Actions { get; set; } = string.Empty; // JSON serialized list
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsImplemented { get; set; } = false;
    
    public DateTime? ImplementedAt { get; set; }
}

// DTOs
public class ApiCallCostInfo
{
    public string ProviderId { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public bool Success { get; set; }
    public int ResponseTime { get; set; }
    public int RequestSize { get; set; }
    public int ResponseSize { get; set; }
    public Guid? UserId { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
}

public class BudgetStatus
{
    public decimal MonthlyBudget { get; set; }
    public decimal MonthlySpent { get; set; }
    public decimal MonthlyRemaining { get; set; }
    public decimal DailyBudget { get; set; }
    public decimal DailySpent { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public List<ProviderBudgetStatus> ProviderStatuses { get; set; } = new();
    public int DaysRemainingInMonth { get; set; }
    public decimal ProjectedMonthlySpend { get; set; }
}

public class ProviderBudgetStatus
{
    public string ProviderId { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public decimal Spent { get; set; }
    public decimal Remaining { get; set; }
    public decimal UtilizationPercentage { get; set; }
}

public class BudgetUtilization
{
    public decimal TotalBudget { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public BudgetPeriod Period { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public List<DailyUtilization> DailyBreakdown { get; set; } = new();
}

public class DailyUtilization
{
    public DateTime Date { get; set; }
    public decimal DailyCost { get; set; }
    public int CallCount { get; set; }
    public Dictionary<string, decimal> ProviderCosts { get; set; } = new();
}

public class CostBreakdown
{
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Percentage { get; set; }
    public int CallCount { get; set; }
    public TimeSpan Period { get; set; }
}

public class CostForecast
{
    public DateTime ForecastDate { get; set; }
    public int DaysAhead { get; set; }
    public decimal TotalForecastCost { get; set; }
    public List<DailyCostForecast> DailyForecasts { get; set; } = new();
}

public class DailyCostForecast
{
    public DateTime Date { get; set; }
    public decimal PredictedCost { get; set; }
    public double ConfidenceLevel { get; set; }
}

public class DailyCostData
{
    public DateTime Date { get; set; }
    public decimal TotalCost { get; set; }
    public int CallCount { get; set; }
}

public class ProviderCostComparison
{
    public string Endpoint { get; set; } = string.Empty;
    public TimeSpan Period { get; set; }
    public List<ProviderCostData> ProviderComparisons { get; set; } = new();
}

public class ProviderCostData
{
    public string ProviderId { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public int TotalCalls { get; set; }
    public int SuccessfulCalls { get; set; }
    public decimal AverageCostPerCall { get; set; }
    public decimal CostPerSuccessfulCall { get; set; }
}

public class OptimizationImpactAnalysis
{
    public CostOptimizationRecommendation Recommendation { get; set; } = new();
    public decimal ProjectedSavings { get; set; }
    public decimal ImplementationCost { get; set; }
    public int PaybackPeriodDays { get; set; }
    public List<string> RisksAndChallenges { get; set; } = new();
    public double ConfidenceScore { get; set; }
}

public class ProviderPricing
{
    public string ProviderId { get; set; } = string.Empty;
    public EndpointPricing DefaultPricing { get; set; } = new();
    public Dictionary<string, EndpointPricing> EndpointPricing { get; set; } = new();
}

public class EndpointPricing
{
    public PricingModel PricingModel { get; set; }
    public decimal BasePrice { get; set; }
    public bool ChargeForFailures { get; set; }
    public decimal FailureMultiplier { get; set; } = 0.5m;
    public List<PricingTier> Tiers { get; set; } = new();
}

public class PricingTier
{
    public int Threshold { get; set; }
    public decimal PricePerCall { get; set; }
}


// Enums
public enum BudgetPeriod
{
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Yearly
}

public enum BudgetAlertType
{
    ThresholdExceeded,
    DailyLimitApproaching,
    ProviderLimitExceeded,
    ForecastOverrun
}

public enum OptimizationType
{
    CacheOptimization,
    ProviderOptimization,
    UsagePatternOptimization,
    RedundancyReduction
}

public enum ImplementationEffort
{
    Low,
    Medium,
    High
}

public enum PricingModel
{
    PerCall,
    PerKbResponse,
    PerSuccessfulCall,
    Tiered
}