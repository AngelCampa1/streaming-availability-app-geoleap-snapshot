namespace GeoLeap.Api.Models;

public class UserUsageDto
{
    public int SearchesUsed { get; set; }
    public int SearchesLimit { get; set; }
    public int SearchesRemaining { get; set; }
    public string Period { get; set; } = "monthly";
    public DateTime ResetDate { get; set; }
    public string Tier { get; set; } = "free";
}
