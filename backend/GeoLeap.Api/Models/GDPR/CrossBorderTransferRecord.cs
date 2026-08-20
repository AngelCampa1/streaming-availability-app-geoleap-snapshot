using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// Record of cross-border data transfers for GDPR compliance tracking
/// </summary>
public class CrossBorderTransferRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(3)]
    public string TargetCountry { get; set; } = string.Empty; // ISO country code
    
    [Required]
    [StringLength(100)]
    public string DataType { get; set; } = string.Empty;
    
    [Required]
    public DateTime TransferDate { get; set; } = DateTime.UtcNow;
    
    [Required]
    [StringLength(50)]
    public string LegalBasis { get; set; } = string.Empty; // "consent", "contract", "legitimate_interest", etc.
    
    [StringLength(500)]
    public string Safeguards { get; set; } = string.Empty; // e.g., "Standard Contractual Clauses"
    
    [Required]
    [StringLength(50)]
    public string ComplianceStatus { get; set; } = string.Empty; // "compliant", "pending_review", "non_compliant"
    
    [StringLength(200)]
    public string? RecipientEntity { get; set; }
    
    [StringLength(1000)]
    public string? TransferPurpose { get; set; }
    
    [StringLength(1000)]
    public string? AdditionalNotes { get; set; }
    
    public DateTime? ReviewDate { get; set; }
    
    [StringLength(100)]
    public string? ReviewedBy { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
}