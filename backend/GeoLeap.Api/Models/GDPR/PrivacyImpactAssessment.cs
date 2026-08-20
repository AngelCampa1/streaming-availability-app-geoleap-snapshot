using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// Privacy Impact Assessment (PIA) for high-risk data processing activities under GDPR
/// </summary>
public class PrivacyImpactAssessment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string ProcessingType { get; set; } = string.Empty; // e.g., "social_analytics", "third_party_sharing"
    
    [Required]
    public DateTime AssessmentDate { get; set; } = DateTime.UtcNow;
    
    [Required]
    [StringLength(20)]
    public string RiskLevel { get; set; } = string.Empty; // "low", "medium", "high"
    
    [StringLength(2000)]
    public string MitigationMeasures { get; set; } = string.Empty;
    
    [Required]
    [StringLength(50)]
    public string ComplianceStatus { get; set; } = string.Empty; // "compliant", "pending_review", "non_compliant"
    
    [Required]
    public DateTime ReviewDate { get; set; }
    
    [StringLength(1000)]
    public string? AssessmentNotes { get; set; }
    
    [StringLength(100)]
    public string? AssessedBy { get; set; } // Who conducted the assessment
    
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
}