using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// GDPR data subject rights requests (access, rectification, erasure, etc.)
/// </summary>
public class DataSubjectRequest
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(50)]
    public string RequestType { get; set; } = string.Empty; // "access", "rectification", "erasure", "portability", "restriction"
    
    [Required]
    [StringLength(20)]
    public string Status { get; set; } = "pending"; // "pending", "in_progress", "completed", "rejected"
    
    [Required]
    public DateTime RequestDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? CompletedDate { get; set; }
    
    [StringLength(1000)]
    public string? RequestDetails { get; set; } // Additional details about the request
    
    [StringLength(1000)]
    public string? ProcessingNotes { get; set; } // Internal notes about processing
    
    [StringLength(500)]
    public string? RejectionReason { get; set; } // Reason if request was rejected
    
    /// <summary>
    /// File path or reference to exported data (for access/portability requests)
    /// </summary>
    [StringLength(500)]
    public string? DataExportPath { get; set; }
    
    /// <summary>
    /// Verification method used to confirm user identity
    /// </summary>
    [StringLength(100)]
    public string? VerificationMethod { get; set; }
    
    [Required]
    public bool IdentityVerified { get; set; } = false;
    
    /// <summary>
    /// Deadline for completing the request (GDPR requires 30 days)
    /// </summary>
    [Required]
    public DateTime Deadline { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
}