using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IGracePeriodService
{
    // Grace Period Management
    Task<GracePeriodDto> StartGracePeriodAsync(Guid failedPaymentId, string correlationId);
    Task<GracePeriodDto> ExtendGracePeriodAsync(Guid gracePeriodId, int additionalDays, string reason, string extendedBy, string correlationId);
    Task<GracePeriodDto> EndGracePeriodAsync(Guid failedPaymentId, string endReason, string correlationId);
    Task<GracePeriodDto?> GetActiveGracePeriodAsync(Guid userId);
    Task<GracePeriodDto?> GetGracePeriodByFailedPaymentAsync(Guid failedPaymentId);

    // Service Access Control
    Task<bool> IsUserInGracePeriodAsync(Guid userId);
    Task<List<string>> GetRestrictedFeaturesAsync(Guid userId);
    Task<bool> IsFeatureAvailableAsync(Guid userId, string featureName);
    Task UpdateServiceAccessControlAsync(Guid gracePeriodId, bool limitFeatures, List<string> restrictedFeatures, string correlationId);

    // Grace Period Configuration
    Task<int> GetGracePeriodDaysAsync(Guid userId, string gracePeriodType = "payment_failure");
    Task<Dictionary<string, int>> GetGracePeriodConfigurationAsync();
    Task UpdateGracePeriodConfigurationAsync(string gracePeriodType, int days, string updatedBy);

    // Monitoring and Cleanup
    Task ProcessExpiringGracePeriodsAsync();
    Task ProcessExpiredGracePeriodsAsync();
    Task<List<GracePeriodDto>> GetExpiringGracePeriodsAsync(int daysUntilExpiry = 1);
    Task<List<GracePeriodDto>> GetExpiredGracePeriodsAsync();

    // User Communication
    Task SendGracePeriodWarningsAsync();
    Task SendGracePeriodExpirationNoticesAsync();

    // Analytics and Reporting
    Task<Dictionary<string, object>> GetGracePeriodAnalyticsAsync(DateTime startDate, DateTime endDate);
    Task LogGracePeriodAnalyticsAsync(string eventType, Guid gracePeriodId, bool wasSuccessful, string correlationId, Dictionary<string, object>? metadata = null);
}