using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public interface IVpnStreamingCompatibilityService
{
    Task<IEnumerable<VpnStreamingCompatibilityDto>> GetProviderStreamingCompatibilityAsync(
        Guid providerId, 
        CancellationToken cancellationToken = default);
        
    Task<VpnStreamingCompatibilityDto?> GetSpecificCompatibilityAsync(
        Guid providerId, 
        Guid streamingServiceId,
        CancellationToken cancellationToken = default);
        
    Task<VpnStreamingCompatibilityDto> UpdateCompatibilityAsync(
        Guid providerId,
        Guid streamingServiceId,
        UpdateVpnStreamingCompatibilityDto updateDto,
        CancellationToken cancellationToken = default);
}

public class VpnStreamingCompatibilityDto
{
    public Guid StreamingServiceId { get; set; }
    public string StreamingServiceName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime LastTested { get; set; }
    public List<string>? CompatibleRegions { get; set; }
}

public class UpdateVpnStreamingCompatibilityDto
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<string>? CompatibleRegions { get; set; }
}