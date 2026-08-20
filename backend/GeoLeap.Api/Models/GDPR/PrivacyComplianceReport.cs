using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// Comprehensive privacy compliance report for GDPR monitoring and auditing
/// </summary>
public class PrivacyComplianceReport
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    [StringLength(100)]
    public string ReportPeriod { get; set; } = string.Empty;
    
    public Guid? UserId { get; set; } // Null for system-wide reports
    
    // Consent statistics
    public int TotalConsents { get; set; }
    public int ActiveConsents { get; set; }
    public int RevokedConsents { get; set; }
    public int ExpiredConsents { get; set; }
    
    // Data subject requests
    public int DataSubjectRequests { get; set; }
    public int PendingRequests { get; set; }
    public int CompletedRequests { get; set; }
    public int OverdueRequests { get; set; }
    
    // Privacy impact assessments
    public int PrivacyImpactAssessments { get; set; }
    public int HighRiskProcessing { get; set; }
    public int PendingPIAReviews { get; set; }
    
    // Cross-border transfers
    public int CrossBorderTransfers { get; set; }
    public int NonAdequateTransfers { get; set; }
    public int TransfersRequiringReview { get; set; }
    
    // Data retention
    public int DataRetentionViolations { get; set; }
    public int AutoDeletedRecords { get; set; }
    
    // Security and audit
    public int DataBreachIncidents { get; set; }
    public int UnauthorizedAccessAttempts { get; set; }
    public int SuccessfulAuditEvents { get; set; }
    
    // Compliance scores (0-100)
    public double OverallComplianceScore { get; set; }
    public double ConsentComplianceScore { get; set; }
    public double DataProcessingComplianceScore { get; set; }
    public double SecurityComplianceScore { get; set; }
    
    [StringLength(2000)]
    public string? ComplianceNotes { get; set; }
    
    [StringLength(2000)]
    public string? RecommendedActions { get; set; }
    
    [StringLength(100)]
    public string? GeneratedBy { get; set; } // System or user who generated the report
    
    // Navigation properties
    public User? User { get; set; }
}