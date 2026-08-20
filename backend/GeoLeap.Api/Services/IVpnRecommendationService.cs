using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IVpnRecommendationService
{
    Task<VpnRecommendationDto> GetRecommendationsAsync(
        Guid? userId,
        VpnRecommendationType type = VpnRecommendationType.BestOverall,
        decimal? budget = null,
        List<string>? streamingServices = null,
        bool? requiresP2P = null);
    
    Task<VpnRecommendationDto> GetPersonalizedRecommendationsAsync(Guid userId);
    
    Task<List<VpnProviderDto>> GetBestForStreamingAsync(List<Guid> streamingServiceIds, int count = 5);
    
    Task<List<VpnProviderDto>> GetBestValueProvidersAsync(decimal maxBudget, int count = 5);
    
    Task<List<VpnProviderDto>> GetBeginnerFriendlyProvidersAsync(int count = 5);
    
    Task<double> CalculateProviderScoreAsync(Guid providerId, Guid? userId = null);
    
    Task RefreshRecommendationCacheAsync();
    
    Task<VpnRecommendationDto> GetMLBasedRecommendationsAsync(
        Guid? userId,
        Dictionary<string, object> preferences);
}