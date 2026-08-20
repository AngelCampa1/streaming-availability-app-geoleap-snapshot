using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public interface IVpnProviderService
{
    // VPN Provider CRUD operations
    Task<VpnProviderDto?> GetVpnProviderAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnProviderDto>> GetAllVpnProvidersAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnProviderDto>> GetFeaturedVpnProvidersAsync(CancellationToken cancellationToken = default);
    Task<VpnProviderDto?> CreateVpnProviderAsync(VpnProvider provider, CancellationToken cancellationToken = default);
    Task<VpnProviderDto?> UpdateVpnProviderAsync(Guid id, VpnProvider provider, CancellationToken cancellationToken = default);
    Task<bool> DeleteVpnProviderAsync(Guid id, CancellationToken cancellationToken = default);
    
    // Search and filtering
    Task<IEnumerable<VpnProviderDto>> SearchVpnProvidersAsync(
        string? searchTerm = null,
        decimal? maxMonthlyPrice = null,
        decimal? maxAnnualPrice = null,
        bool? supportsStreaming = null,
        bool? supportsP2P = null,
        bool? hasKillSwitch = null,
        bool? hasNoLogsPolicy = null,
        int? minServerCount = null,
        int? minCountryCount = null,
        List<string>? requiredPlatforms = null,
        List<string>? requiredCountries = null,
        double? minRating = null,
        CancellationToken cancellationToken = default);
    
    // Recommendations
    Task<VpnRecommendationDto> GetRecommendationsAsync(
        Guid? userId = null,
        VpnRecommendationType? recommendationType = null,
        CancellationToken cancellationToken = default);
    
    Task<VpnRecommendationDto> GetPersonalizedRecommendationsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
    
    // Comparison
    Task<VpnProviderComparisonDto> CompareProvidersAsync(
        List<Guid> providerIds,
        VpnComparisonCriteria criteria,
        CancellationToken cancellationToken = default);
    
    // Analytics
    Task TrackProviderViewAsync(Guid providerId, Guid? userId = null, string? sessionId = null, CancellationToken cancellationToken = default);
    Task TrackProviderClickAsync(Guid providerId, Guid? userId = null, string? sessionId = null, bool isAffiliateClick = false, CancellationToken cancellationToken = default);
}

public interface IVpnRatingService
{
    // Rating CRUD operations
    Task<VpnProviderRating?> GetRatingAsync(Guid userId, Guid providerId, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnProviderRating>> GetProviderRatingsAsync(Guid providerId, int pageSize = 20, int pageNumber = 1, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnProviderRating>> GetUserRatingsAsync(Guid userId, CancellationToken cancellationToken = default);
    
    // Submit and update ratings
    Task<VpnProviderRating?> SubmitRatingAsync(Guid userId, VpnRatingDto rating, CancellationToken cancellationToken = default);
    Task<VpnProviderRating?> UpdateRatingAsync(Guid userId, Guid providerId, VpnRatingDto rating, CancellationToken cancellationToken = default);
    Task<bool> DeleteRatingAsync(Guid userId, Guid providerId, CancellationToken cancellationToken = default);
    
    // Rating analytics and aggregation
    Task<Dictionary<string, object>> GetRatingStatsAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task RecalculateProviderRatingsAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task RecalculateAllProviderRatingsAsync(CancellationToken cancellationToken = default);
    
    // Helpfulness voting
    Task<bool> VoteRatingHelpfulnessAsync(Guid ratingId, Guid voterId, bool isHelpful, CancellationToken cancellationToken = default);
}

public interface IVpnSetupGuideService
{
    // Guide CRUD operations
    Task<VpnSetupGuideDto?> GetGuideAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnSetupGuideDto>> GetProviderGuidesAsync(Guid providerId, string? platform = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnSetupGuideDto>> GetGuidesForPlatformAsync(string platform, CancellationToken cancellationToken = default);
    Task<VpnSetupGuideDto?> CreateGuideAsync(VpnSetupGuide guide, CancellationToken cancellationToken = default);
    Task<VpnSetupGuideDto?> UpdateGuideAsync(Guid id, VpnSetupGuide guide, CancellationToken cancellationToken = default);
    Task<bool> DeleteGuideAsync(Guid id, CancellationToken cancellationToken = default);
    
    // Guide interactions
    Task TrackGuideViewAsync(Guid guideId, Guid? userId = null, string? sessionId = null, CancellationToken cancellationToken = default);
    Task<bool> RateGuideHelpfulnessAsync(Guid guideId, Guid userId, bool isHelpful, CancellationToken cancellationToken = default);
}

public interface IVpnBestPracticesService
{
    // Best practices CRUD operations
    Task<VpnBestPracticeDto?> GetBestPracticeAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnBestPracticeDto>> GetAllBestPracticesAsync(VpnPracticeCategory? category = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnBestPracticeDto>> GetBestPracticesByImportanceAsync(VpnPracticeImportance importance, CancellationToken cancellationToken = default);
    Task<VpnBestPracticeDto?> CreateBestPracticeAsync(VpnBestPractice practice, Guid createdByUserId, CancellationToken cancellationToken = default);
    Task<VpnBestPracticeDto?> UpdateBestPracticeAsync(Guid id, VpnBestPractice practice, Guid updatedByUserId, CancellationToken cancellationToken = default);
    Task<bool> DeleteBestPracticeAsync(Guid id, CancellationToken cancellationToken = default);
    
    // Search and filtering
    Task<IEnumerable<VpnBestPracticeDto>> SearchBestPracticesAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnBestPracticeDto>> GetBestPracticesByTagsAsync(List<string> tags, CancellationToken cancellationToken = default);
    
    // Analytics
    Task TrackBestPracticeViewAsync(Guid practiceId, Guid? userId = null, string? sessionId = null, CancellationToken cancellationToken = default);
    Task<bool> RateBestPracticeHelpfulnessAsync(Guid practiceId, Guid userId, bool isHelpful, CancellationToken cancellationToken = default);
}

public interface IVpnLegalDisclaimerService
{
    // Legal disclaimer operations
    Task<IEnumerable<VpnLegalDisclaimer>> GetActiveDisclaimersAsync(string? countryCode = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnLegalDisclaimer>> GetDisclaimersByTypeAsync(VpnDisclaimerType type, CancellationToken cancellationToken = default);
    Task<VpnLegalDisclaimer?> CreateDisclaimerAsync(VpnLegalDisclaimer disclaimer, Guid createdByUserId, CancellationToken cancellationToken = default);
    Task<VpnLegalDisclaimer?> UpdateDisclaimerAsync(Guid id, VpnLegalDisclaimer disclaimer, Guid updatedByUserId, CancellationToken cancellationToken = default);
    Task<bool> DeleteDisclaimerAsync(Guid id, CancellationToken cancellationToken = default);
    
    // Compliance checking
    Task<List<VpnLegalDisclaimer>> GetRequiredDisclaimersForUserAsync(Guid? userId, string? countryCode = null, CancellationToken cancellationToken = default);
}


public interface IVpnUserPreferenceService
{
    // User preference operations
    Task<UserVpnPreference?> GetUserPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserVpnPreference> CreateOrUpdatePreferencesAsync(Guid userId, UserVpnPreference preferences, CancellationToken cancellationToken = default);
    Task<bool> DeleteUserPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);
    
    // Preference-based recommendations
    Task<IEnumerable<VpnProviderDto>> GetRecommendationsBasedOnPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IVpnAnalyticsService
{
    // Analytics tracking
    Task TrackEventAsync(VpnGuidanceEventType eventType, Guid? userId = null, Guid? vpnProviderId = null, Guid? guideId = null, Dictionary<string, object>? additionalData = null, string? sessionId = null, CancellationToken cancellationToken = default);
    
    // Analytics reporting
    Task<Dictionary<string, object>> GetProviderAnalyticsAsync(Guid providerId, DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<Dictionary<string, object>> GetOverallAnalyticsAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<Dictionary<string, object>> GetUserEngagementAnalyticsAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    
    // Popular content
    Task<IEnumerable<VpnProviderDto>> GetMostViewedProvidersAsync(int count = 10, DateTime? fromDate = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnSetupGuideDto>> GetMostViewedGuidesAsync(int count = 10, DateTime? fromDate = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<VpnBestPracticeDto>> GetMostViewedBestPracticesAsync(int count = 10, DateTime? fromDate = null, CancellationToken cancellationToken = default);
}
