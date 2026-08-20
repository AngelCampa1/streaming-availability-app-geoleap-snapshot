using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// Represents an affiliate partner (e.g. NordVPN, ExpressVPN)
/// </summary>
public class AffiliatePartner
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? LogoUrl { get; set; }

    /// <summary>
    /// URL template with {offerId}, {affId} placeholders
    /// e.g. https://go.nordvpn.net/aff_c?offer_id={offerId}&aff_id={affId}
    /// </summary>
    [Required]
    public string AffiliateUrlTemplate { get; set; } = string.Empty;

    /// <summary>
    /// JSON dict of template parameter substitution values
    /// </summary>
    public string? TemplateParameters { get; set; }

    /// <summary>
    /// Display weight for ranking (higher = shown first)
    /// </summary>
    public int Priority { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public decimal? CommissionRate { get; set; }

    /// <summary>
    /// "percentage", "flat", or "cpa"
    /// </summary>
    [MaxLength(20)]
    public string CommissionType { get; set; } = "percentage";

    public decimal? FlatCommission { get; set; }

    /// <summary>
    /// JSON array of country codes, null = all countries
    /// </summary>
    public string? TargetCountries { get; set; }

    /// <summary>
    /// JSON array of streaming service IDs, null = all services
    /// </summary>
    public string? TargetStreamingServices { get; set; }

    /// <summary>
    /// Optional FK to existing VpnProvider
    /// </summary>
    public Guid? VpnProviderId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ICollection<AffiliateClick> Clicks { get; set; } = new List<AffiliateClick>();
}

/// <summary>
/// Records each click on an affiliate link
/// </summary>
public class AffiliateClick
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AffiliatePartnerId { get; set; }

    public Guid? UserId { get; set; }

    [MaxLength(100)]
    public string? AnonymousId { get; set; }

    [MaxLength(200)]
    public string? ContentId { get; set; }

    [MaxLength(500)]
    public string? ContentTitle { get; set; }

    [MaxLength(10)]
    public string? CountryCode { get; set; }

    [MaxLength(200)]
    public string? StreamingService { get; set; }

    [MaxLength(100)]
    public string? SessionId { get; set; }

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [MaxLength(1000)]
    public string? Referrer { get; set; }

    /// <summary>
    /// "web", "ios", "android"
    /// </summary>
    [MaxLength(20)]
    public string Platform { get; set; } = "web";

    [MaxLength(2000)]
    public string? GeneratedUrl { get; set; }

    public DateTime ClickedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual AffiliatePartner? Partner { get; set; }
    public virtual AffiliateConversion? Conversion { get; set; }
}

/// <summary>
/// Records affiliate network conversion postbacks
/// </summary>
public class AffiliateConversion
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AffiliatePartnerId { get; set; }

    public Guid? AffiliateClickId { get; set; }

    [MaxLength(200)]
    public string? ExternalConversionId { get; set; }

    public decimal Revenue { get; set; }

    public decimal Commission { get; set; }

    /// <summary>
    /// "pending", "confirmed", "rejected"
    /// </summary>
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime ConvertedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual AffiliatePartner? Partner { get; set; }
    public virtual AffiliateClick? Click { get; set; }
}

// DTO classes

public class AffiliatePartnerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string AffiliateUrlTemplate { get; set; } = string.Empty;
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public decimal? CommissionRate { get; set; }
    public string CommissionType { get; set; } = "percentage";
    public decimal? FlatCommission { get; set; }
    public string[]? TargetCountries { get; set; }
    public string[]? TargetStreamingServices { get; set; }
    public Guid? VpnProviderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public long TotalClicks { get; set; }
    public long TotalConversions { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class CreateAffiliatePartnerRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    [Required]
    public string AffiliateUrlTemplate { get; set; } = string.Empty;
    public string? TemplateParameters { get; set; }
    public int Priority { get; set; } = 0;
    public decimal? CommissionRate { get; set; }
    public string CommissionType { get; set; } = "percentage";
    public decimal? FlatCommission { get; set; }
    public string[]? TargetCountries { get; set; }
    public string[]? TargetStreamingServices { get; set; }
    public Guid? VpnProviderId { get; set; }
}

public class UpdateAffiliatePartnerRequest
{
    public string? Name { get; set; }
    public string? LogoUrl { get; set; }
    public string? AffiliateUrlTemplate { get; set; }
    public string? TemplateParameters { get; set; }
    public int? Priority { get; set; }
    public bool? IsActive { get; set; }
    public decimal? CommissionRate { get; set; }
    public string? CommissionType { get; set; }
    public decimal? FlatCommission { get; set; }
    public string[]? TargetCountries { get; set; }
    public string[]? TargetStreamingServices { get; set; }
}

public class AffiliateClickRequest
{
    [Required]
    public Guid PartnerId { get; set; }
    public string? ContentId { get; set; }
    public string? ContentTitle { get; set; }
    public string? CountryCode { get; set; }
    public string? StreamingService { get; set; }
    public string Platform { get; set; } = "web";
    public string? AnonymousId { get; set; }
}

public class AffiliateRecommendationResponse
{
    public List<AffiliatePartnerDto> Partners { get; set; } = new();
    public string? CountryCode { get; set; }
    public string? StreamingService { get; set; }
    public string? ContentId { get; set; }
}

public class AffiliateDashboard
{
    public long TotalClicks { get; set; }
    public long TotalConversions { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalCommission { get; set; }
    public double ConversionRate { get; set; }
    public List<AffiliatePartnerDto> TopPartners { get; set; } = new();
    public DateTime From { get; set; }
    public DateTime To { get; set; }
}

public class AffiliateConversionRequest
{
    [Required]
    public Guid PartnerId { get; set; }
    public Guid? ClickId { get; set; }
    public string? ExternalConversionId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Revenue must be non-negative")]
    public decimal Revenue { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Commission must be non-negative")]
    public decimal Commission { get; set; }
}
