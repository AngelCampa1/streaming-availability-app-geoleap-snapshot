using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserRegionPreference
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;
    
    /// <summary>
    /// RegionCode alias for compatibility
    /// </summary>
    public string RegionCode => CountryCode;
    
    public bool IsPrimary { get; set; } = false;
    
    public int Priority { get; set; } = 0;
    
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
}