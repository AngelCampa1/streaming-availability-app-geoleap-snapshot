using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IVpnProviderService
{
    Task<IEnumerable<VpnProviderDto>> GetProvidersAsync(
        bool? featured = null,
        decimal? maxPrice = null,
        bool? supportsStreaming = null,
        string? streamingService = null,
        int page = 1,
        int pageSize = 20);
    
    Task<VpnProviderDto?> GetProviderByIdAsync(Guid id);
    
    Task<VpnProviderComparisonDto> CompareProvidersAsync(
        List<Guid> providerIds,
        bool comparePrice = true,
        bool compareFeatures = true,
        bool compareRatings = true,
        bool compareStreaming = false);
    
    Task RateProviderAsync(Guid userId, Guid providerId, VpnRatingDto rating);
    
    Task<IEnumerable<VpnStreamingCompatibilityDto>> GetStreamingCompatibilityAsync(Guid providerId);
    
    Task<IEnumerable<VpnSetupGuideDto>> GetSetupGuidesAsync(Guid? providerId = null, string? platform = null);
    
    Task<IEnumerable<VpnBestPracticeDto>> GetBestPracticesAsync(
        VpnPracticeCategory? category = null,
        VpnPracticeImportance? importance = null);
    
    Task<IEnumerable<VpnLegalDisclaimer>> GetLegalDisclaimersAsync(string? countryCode = null);
    
    Task SaveUserPreferencesAsync(UserVpnPreference preferences);
    
    Task<UserVpnPreference?> GetUserPreferencesAsync(Guid userId);
    
    Task TrackAnalyticsEventAsync(VpnGuidanceAnalytics analytics);
    
    Task<IEnumerable<VpnProviderDto>> SearchProvidersAsync(string query, int page = 1, int pageSize = 20);
    
    Task UpdateProviderEffectivenessAsync(Guid providerId, Guid streamingServiceId, VpnStreamingStatus status, string? notes = null);
    
    Task<Dictionary<Guid, double>> GetProviderEffectivenessScoresAsync(List<Guid> providerIds);
}