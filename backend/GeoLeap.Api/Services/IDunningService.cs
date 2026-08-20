using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IDunningService
{
    // Campaign Management
    Task<DunningCampaignDto> CreateCampaignAsync(CreateDunningCampaignRequest request, string createdBy, string correlationId);
    Task<DunningCampaignDto> UpdateCampaignAsync(Guid campaignId, CreateDunningCampaignRequest request, string updatedBy, string correlationId);
    Task<bool> DeleteCampaignAsync(Guid campaignId, string deletedBy, string correlationId);
    Task<List<DunningCampaignDto>> GetActiveCampaignsAsync();
    Task<DunningCampaignDto?> GetCampaignAsync(Guid campaignId);

    // Campaign Execution
    Task TriggerDunningCampaignAsync(Guid failedPaymentId, string correlationId);
    Task ProcessDunningCampaignExecutionsAsync();
    Task ExecuteDunningStepAsync(Guid campaignExecutionId, Guid stepId, string correlationId);
    Task StopDunningCampaignAsync(Guid failedPaymentId, string reason, string correlationId);

    // Notification Management  
    Task<DunningNotification> SendDunningNotificationAsync(Guid campaignExecutionId, Guid stepId, string correlationId);
    Task ProcessFailedNotificationsAsync();
    Task<bool> RetryFailedNotificationAsync(Guid notificationId, string correlationId);

    // Campaign Analytics
    Task<Dictionary<string, object>> GetCampaignPerformanceAsync(Guid campaignId, DateTime startDate, DateTime endDate);
    Task<Dictionary<string, object>> GetDunningOverviewAnalyticsAsync(DateTime startDate, DateTime endDate);
    Task LogDunningAnalyticsAsync(string eventType, Guid? campaignId, Guid? stepId, Guid? userId, bool wasSuccessful, string correlationId, Dictionary<string, object>? metadata = null);

    // A/B Testing Support
    Task<DunningStep?> SelectOptimalStepVariantAsync(Guid stepId, Guid userId);
    Task RecordStepPerformanceAsync(Guid stepId, string variant, bool wasSuccessful, string correlationId);

    // Customer Segmentation
    Task<string> DetermineCustomerSegmentAsync(Guid userId);
    Task<List<DunningCampaignDto>> GetCampaignsForSegmentAsync(string customerSegment, string triggerType);

    // Template Processing
    Task<string> ProcessMessageTemplateAsync(string template, Guid userId, Guid failedPaymentId, Dictionary<string, object>? additionalVariables = null);
    Task<string> ProcessSubjectTemplateAsync(string template, Guid userId, Guid failedPaymentId, Dictionary<string, object>? additionalVariables = null);
    
    // Support Service methods
    Task OverrideFailedPaymentProcessAsync(Guid failedPaymentId, string reason, Guid supportAgentId, string correlationId);
    Task ExtendGracePeriodAsync(Guid failedPaymentId, int additionalDays, string reason, Guid supportAgentId, string correlationId);
}