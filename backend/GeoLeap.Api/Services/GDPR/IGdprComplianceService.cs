using GeoLeap.Api.Models.GDPR;

namespace GeoLeap.Api.Services.GDPR;

/// <summary>
/// Service for managing GDPR compliance requirements
/// </summary>
public interface IGdprComplianceService
{
    // Consent Management
    Task<bool> RecordConsentAsync(Guid userId, string purpose, bool consentGiven, string method, string? consentText = null, string? ipAddress = null, string? userAgent = null);
    Task<bool> WithdrawConsentAsync(Guid userId, string purpose);
    Task<bool> HasValidConsentAsync(Guid userId, string purpose);
    Task<Models.GDPR.ConsentRecord?> GetCurrentConsentAsync(Guid userId, string purpose);
    Task<List<Models.GDPR.ConsentRecord>> GetConsentHistoryAsync(Guid userId);
    
    // Privacy Settings
    Task<PrivacySettings> GetPrivacySettingsAsync(Guid userId);
    Task<bool> UpdatePrivacySettingsAsync(Guid userId, PrivacySettings settings);
    Task<bool> CanProcessPersonalDataAsync(Guid userId);
    Task<bool> CanUseForPersonalizationAsync(Guid userId);
    Task<bool> CanShareWithThirdPartiesAsync(Guid userId);
    
    // Data Subject Rights
    Task<Guid> CreateDataSubjectRequestAsync(Guid userId, string requestType, string? requestDetails = null);
    Task<DataSubjectRequest?> GetDataSubjectRequestAsync(Guid requestId);
    Task<List<DataSubjectRequest>> GetUserDataSubjectRequestsAsync(Guid userId);
    Task<bool> ProcessDataSubjectRequestAsync(Guid requestId, string status, string? processingNotes = null);
    
    // Data Export (Right to Portability)
    Task<string> ExportUserDataAsync(Guid userId, string format = "json");
    Task<byte[]> GenerateDataExportFileAsync(Guid userId, string format);
    
    // Data Erasure (Right to be Forgotten)
    Task<bool> EraseUserDataAsync(Guid userId, bool verifiedRequest = false);
    Task<List<string>> GetErasableDataTypesAsync(Guid userId);
    
    // Data Retention
    Task<List<DataRetentionPolicy>> GetDataRetentionPoliciesAsync();
    Task<bool> ApplyDataRetentionAsync(string dataType);
    Task<int> GetRetentionDaysAsync(string dataType);
    Task<DateTime> GetDataExpiryDateAsync(string dataType, DateTime createdDate);
    
    // Compliance Validation
    Task<bool> ValidateGdprComplianceAsync(Guid userId);
    Task<Dictionary<string, object>> GetComplianceReportAsync(Guid userId);
    Task<bool> IsDataProcessingLegalAsync(Guid userId, string purpose);
    
    // Privacy Impact Assessment
    Task<bool> RequiresPrivacyImpactAssessmentAsync(string dataType, string purpose);
    Task<Dictionary<string, object>> GeneratePrivacyImpactAssessmentAsync(string dataType, string purpose);
}