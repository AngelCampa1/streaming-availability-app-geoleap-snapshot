using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GDPR;

namespace GeoLeap.Api.Services.GDPR;

/// <summary>
/// Implementation of GDPR compliance service
/// </summary>
public class GdprComplianceService : IGdprComplianceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GdprComplianceService> _logger;
    
    // Default retention policies (in days)
    private readonly Dictionary<string, int> _defaultRetentionPolicies = new()
    {
        ["notification_logs"] = 90,
        ["user_preferences"] = 1095, // 3 years
        ["watchlist_data"] = 2555, // 7 years
        ["analytics_data"] = 365,
        ["marketing_data"] = 180,
        ["session_data"] = 30,
        ["audit_logs"] = 2555 // 7 years for legal compliance
    };
    
    public GdprComplianceService(ApplicationDbContext context, ILogger<GdprComplianceService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    #region Consent Management
    
    public async Task<bool> RecordConsentAsync(Guid userId, string purpose, bool consentGiven, string method, string? consentText = null, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            // Withdraw previous consent if exists
            var existingConsents = await _context.ConsentRecords
                .Where(c => c.UserId == userId && c.Purpose == purpose && c.IsActive)
                .ToListAsync();
                
            foreach (var consent in existingConsents)
            {
                consent.IsActive = false;
                if (consentGiven != consent.ConsentGiven)
                {
                    consent.ConsentWithdrawnDate = DateTime.UtcNow;
                }
            }
            
            // Record new consent
            var consentRecord = new Models.GDPR.ConsentRecord
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Purpose = purpose,
                ConsentGiven = consentGiven,
                ConsentDate = DateTime.UtcNow,
                ConsentMethod = method,
                ConsentText = consentText,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                IsActive = true
            };
            
            _context.ConsentRecords.Add(consentRecord);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Consent recorded for user {UserId}, purpose {Purpose}, granted: {ConsentGiven}", 
                userId, purpose, consentGiven);
                
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record consent for user {UserId}, purpose {Purpose}", userId, purpose);
            return false;
        }
    }
    
    public async Task<bool> WithdrawConsentAsync(Guid userId, string purpose)
    {
        try
        {
            var activeConsents = await _context.ConsentRecords
                .Where(c => c.UserId == userId && c.Purpose == purpose && c.IsActive && c.ConsentGiven)
                .ToListAsync();
                
            foreach (var consent in activeConsents)
            {
                consent.ConsentWithdrawnDate = DateTime.UtcNow;
                consent.ConsentGiven = false;
                consent.IsActive = false;
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Consent withdrawn for user {UserId}, purpose {Purpose}", userId, purpose);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to withdraw consent for user {UserId}, purpose {Purpose}", userId, purpose);
            return false;
        }
    }
    
    public async Task<bool> HasValidConsentAsync(Guid userId, string purpose)
    {
        try
        {
            var consent = await _context.ConsentRecords
                .Where(c => c.UserId == userId && c.Purpose == purpose && c.IsActive && c.ConsentGiven)
                .OrderByDescending(c => c.ConsentDate)
                .FirstOrDefaultAsync();
                
            return consent != null && !consent.ConsentWithdrawnDate.HasValue;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check consent for user {UserId}, purpose {Purpose}", userId, purpose);
            return false; // Fail secure - no consent assumed
        }
    }
    
    public async Task<ConsentRecord?> GetCurrentConsentAsync(Guid userId, string purpose)
    {
        return await _context.ConsentRecords
            .Where(c => c.UserId == userId && c.Purpose == purpose && c.IsActive)
            .OrderByDescending(c => c.ConsentDate)
            .FirstOrDefaultAsync();
    }
    
    public async Task<List<ConsentRecord>> GetConsentHistoryAsync(Guid userId)
    {
        return await _context.ConsentRecords
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.ConsentDate)
            .ToListAsync();
    }
    
    #endregion
    
    #region Privacy Settings
    
    public async Task<PrivacySettings> GetPrivacySettingsAsync(Guid userId)
    {
        var settings = await _context.PrivacySettings
            .FirstOrDefaultAsync(p => p.UserId == userId);
            
        if (settings == null)
        {
            // Create default privacy settings (privacy by design - all false by default)
            settings = new PrivacySettings
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EnableDataProcessing = false,
                AllowPersonalization = false,
                AllowThirdPartySharing = false,
                AllowMarketingCommunications = false,
                AllowAnalytics = false,
                PreferredExportFormat = "json",
                IncludeMetadataInExports = true,
                MinimalDataProcessing = true, // Default to minimal processing
                CreatedAt = DateTime.UtcNow
            };
            
            _context.PrivacySettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        
        return settings;
    }
    
    public async Task<bool> UpdatePrivacySettingsAsync(Guid userId, PrivacySettings settings)
    {
        try
        {
            var existing = await GetPrivacySettingsAsync(userId);
            
            existing.EnableDataProcessing = settings.EnableDataProcessing;
            existing.AllowPersonalization = settings.AllowPersonalization;
            existing.AllowThirdPartySharing = settings.AllowThirdPartySharing;
            existing.AllowMarketingCommunications = settings.AllowMarketingCommunications;
            existing.AllowAnalytics = settings.AllowAnalytics;
            existing.PreferredRetentionDays = settings.PreferredRetentionDays;
            existing.PreferredExportFormat = settings.PreferredExportFormat;
            existing.IncludeMetadataInExports = settings.IncludeMetadataInExports;
            existing.MinimalDataProcessing = settings.MinimalDataProcessing;
            existing.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Privacy settings updated for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update privacy settings for user {UserId}", userId);
            return false;
        }
    }
    
    public async Task<bool> CanProcessPersonalDataAsync(Guid userId)
    {
        var settings = await GetPrivacySettingsAsync(userId);
        return settings.EnableDataProcessing && await HasValidConsentAsync(userId, "data_processing");
    }
    
    public async Task<bool> CanUseForPersonalizationAsync(Guid userId)
    {
        var settings = await GetPrivacySettingsAsync(userId);
        return settings.AllowPersonalization && await HasValidConsentAsync(userId, "personalization");
    }
    
    public async Task<bool> CanShareWithThirdPartiesAsync(Guid userId)
    {
        var settings = await GetPrivacySettingsAsync(userId);
        return settings.AllowThirdPartySharing && await HasValidConsentAsync(userId, "third_party_sharing");
    }
    
    #endregion
    
    #region Data Subject Rights
    
    public async Task<Guid> CreateDataSubjectRequestAsync(Guid userId, string requestType, string? requestDetails = null)
    {
        var request = new DataSubjectRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RequestType = requestType,
            Status = "pending",
            RequestDate = DateTime.UtcNow,
            RequestDetails = requestDetails,
            IdentityVerified = false,
            Deadline = DateTime.UtcNow.AddDays(30) // GDPR requires response within 30 days
        };
        
        _context.DataSubjectRequests.Add(request);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Data subject request created: {RequestId} for user {UserId}, type {RequestType}", 
            request.Id, userId, requestType);
            
        return request.Id;
    }
    
    public async Task<DataSubjectRequest?> GetDataSubjectRequestAsync(Guid requestId)
    {
        return await _context.DataSubjectRequests
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == requestId);
    }
    
    public async Task<List<DataSubjectRequest>> GetUserDataSubjectRequestsAsync(Guid userId)
    {
        return await _context.DataSubjectRequests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.RequestDate)
            .ToListAsync();
    }
    
    public async Task<bool> ProcessDataSubjectRequestAsync(Guid requestId, string status, string? processingNotes = null)
    {
        try
        {
            var request = await _context.DataSubjectRequests.FindAsync(requestId);
            if (request == null) return false;
            
            request.Status = status;
            request.ProcessingNotes = processingNotes;
            
            if (status == "completed")
            {
                request.CompletedDate = DateTime.UtcNow;
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Data subject request {RequestId} updated to status {Status}", requestId, status);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process data subject request {RequestId}", requestId);
            return false;
        }
    }
    
    #endregion
    
    #region Data Export
    
    public async Task<string> ExportUserDataAsync(Guid userId, string format = "json")
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new ArgumentException("User not found");
            
            var userData = new Dictionary<string, object>();
            
            // Basic user information
            userData["user"] = new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.CreatedAt,
                user.PreferredLanguage
            };
            
            // Privacy settings
            var privacySettings = await GetPrivacySettingsAsync(userId);
            userData["privacy_settings"] = privacySettings;
            
            // Consent records
            var consents = await GetConsentHistoryAsync(userId);
            userData["consent_history"] = consents;
            
            // Notification preferences
            var notificationSettings = await _context.WatchlistNotificationSettings
                .Where(s => s.UserId == userId)
                .ToListAsync();
            userData["notification_preferences"] = notificationSettings;
            
            // Watchlists
            var watchlists = await _context.Watchlists
                .Where(w => w.UserId == userId)
                .ToListAsync();
            userData["watchlists"] = watchlists;
            
            // Notification delivery logs (last 90 days only for privacy)
            var recentLogs = await _context.NotificationDeliveryLogs
                .Where(l => l.UserId == userId && l.DeliveredAt >= DateTime.UtcNow.AddDays(-90))
                .ToListAsync();
            userData["recent_notifications"] = recentLogs;
            
            return JsonSerializer.Serialize(userData, new JsonSerializerOptions 
            { 
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export user data for user {UserId}", userId);
            throw;
        }
    }
    
    public async Task<byte[]> GenerateDataExportFileAsync(Guid userId, string format)
    {
        var dataJson = await ExportUserDataAsync(userId, format);
        return System.Text.Encoding.UTF8.GetBytes(dataJson);
    }
    
    #endregion
    
    #region Data Erasure
    
    public async Task<bool> EraseUserDataAsync(Guid userId, bool verifiedRequest = false)
    {
        try
        {
            if (!verifiedRequest)
            {
                _logger.LogWarning("Attempted data erasure for user {UserId} without verification", userId);
                return false;
            }
            
            // ✅ FIX: Execute all queries in parallel to reduce N+1 query time
            var cutoffDate = DateTime.UtcNow.AddDays(-30);

            var consentsTask = _context.ConsentRecords.Where(c => c.UserId == userId).ToListAsync();
            var privacySettingsTask = _context.PrivacySettings.Where(p => p.UserId == userId).ToListAsync();
            var notificationSettingsTask = _context.WatchlistNotificationSettings.Where(s => s.UserId == userId).ToListAsync();
            var notificationLogsTask = _context.NotificationDeliveryLogs.Where(l => l.UserId == userId && l.DeliveredAt < cutoffDate).ToListAsync();
            var watchlistsTask = _context.Watchlists.Where(w => w.UserId == userId).ToListAsync();

            await Task.WhenAll(consentsTask, privacySettingsTask, notificationSettingsTask, notificationLogsTask, watchlistsTask);

            var consents = await consentsTask;
            var privacySettings = await privacySettingsTask;
            var notificationSettings = await notificationSettingsTask;
            var notificationLogs = await notificationLogsTask;
            var watchlists = await watchlistsTask;

            // Remove all data in batches
            _context.ConsentRecords.RemoveRange(consents);
            _context.PrivacySettings.RemoveRange(privacySettings);
            _context.WatchlistNotificationSettings.RemoveRange(notificationSettings);
            _context.NotificationDeliveryLogs.RemoveRange(notificationLogs);
            _context.Watchlists.RemoveRange(watchlists);
            
            // Anonymize user record (don't delete completely for audit purposes)
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.Email = $"deleted-{userId}@deleted.local";
                user.FirstName = "Deleted";
                user.LastName = "User";
                user.PhoneNumber = null;
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("User data erased for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to erase user data for user {UserId}", userId);
            return false;
        }
    }
    
    public async Task<List<string>> GetErasableDataTypesAsync(Guid userId)
    {
        var erasableTypes = new List<string>();
        
        // Check what data exists for the user
        if (await _context.ConsentRecords.AnyAsync(c => c.UserId == userId))
            erasableTypes.Add("consent_records");
            
        if (await _context.PrivacySettings.AnyAsync(p => p.UserId == userId))
            erasableTypes.Add("privacy_settings");
            
        if (await _context.WatchlistNotificationSettings.AnyAsync(s => s.UserId == userId))
            erasableTypes.Add("notification_settings");
            
        if (await _context.NotificationDeliveryLogs.AnyAsync(l => l.UserId == userId))
            erasableTypes.Add("notification_logs");
            
        if (await _context.Watchlists.AnyAsync(w => w.UserId == userId))
            erasableTypes.Add("watchlists");
            
        return erasableTypes;
    }
    
    #endregion
    
    #region Data Retention
    
    public async Task<List<DataRetentionPolicy>> GetDataRetentionPoliciesAsync()
    {
        var policies = await _context.DataRetentionPolicies
            .Where(p => p.IsActive)
            .ToListAsync();
            
        // Create default policies if none exist
        if (!policies.Any())
        {
            policies = await CreateDefaultRetentionPoliciesAsync();
        }
        
        return policies;
    }
    
    public async Task<bool> ApplyDataRetentionAsync(string dataType)
    {
        try
        {
            var retentionDays = await GetRetentionDaysAsync(dataType);
            var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
            
            switch (dataType)
            {
                case "notification_logs":
                    var oldLogs = await _context.NotificationDeliveryLogs
                        .Where(l => l.DeliveredAt < cutoffDate)
                        .ToListAsync();
                    _context.NotificationDeliveryLogs.RemoveRange(oldLogs);
                    break;
                    
                case "session_data":
                    // Remove old session data if we had a sessions table
                    break;
                    
                // Add more data types as needed
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Data retention applied for data type {DataType}, retention days: {RetentionDays}", 
                dataType, retentionDays);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to apply data retention for data type {DataType}", dataType);
            return false;
        }
    }
    
    public async Task<int> GetRetentionDaysAsync(string dataType)
    {
        var policy = await _context.DataRetentionPolicies
            .FirstOrDefaultAsync(p => p.DataType == dataType && p.IsActive);
            
        return policy?.RetentionDays ?? _defaultRetentionPolicies.GetValueOrDefault(dataType, 365);
    }
    
    public async Task<DateTime> GetDataExpiryDateAsync(string dataType, DateTime createdDate)
    {
        var retentionDays = await GetRetentionDaysAsync(dataType);
        return createdDate.AddDays(retentionDays);
    }
    
    #endregion
    
    #region Compliance Validation
    
    public async Task<bool> ValidateGdprComplianceAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;
            
            // Check if user has valid privacy settings
            var privacySettings = await GetPrivacySettingsAsync(userId);
            if (privacySettings == null) return false;
            
            // Check if we have necessary consents for data processing
            if (privacySettings.EnableDataProcessing)
            {
                var hasDataProcessingConsent = await HasValidConsentAsync(userId, "data_processing");
                if (!hasDataProcessingConsent) return false;
            }
            
            // Check if personalization consent is valid when personalization is enabled
            if (privacySettings.AllowPersonalization)
            {
                var hasPersonalizationConsent = await HasValidConsentAsync(userId, "personalization");
                if (!hasPersonalizationConsent) return false;
            }
            
            // Check if third party consent is valid when sharing is enabled
            if (privacySettings.AllowThirdPartySharing)
            {
                var hasThirdPartyConsent = await HasValidConsentAsync(userId, "third_party_sharing");
                if (!hasThirdPartyConsent) return false;
            }
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate GDPR compliance for user {UserId}", userId);
            return false;
        }
    }
    
    public async Task<Dictionary<string, object>> GetComplianceReportAsync(Guid userId)
    {
        var report = new Dictionary<string, object>();
        
        try
        {
            var user = await _context.Users.FindAsync(userId);
            var privacySettings = await GetPrivacySettingsAsync(userId);
            var consents = await GetConsentHistoryAsync(userId);
            var dataSubjectRequests = await GetUserDataSubjectRequestsAsync(userId);
            
            report["user_id"] = userId;
            report["compliance_valid"] = await ValidateGdprComplianceAsync(userId);
            report["privacy_settings"] = privacySettings;
            report["active_consents"] = consents.Where(c => c.IsActive).Cast<Models.GDPR.ConsentRecord>().ToList();
            report["consent_count"] = consents.Count;
            report["data_subject_requests"] = dataSubjectRequests.Count;
            report["last_privacy_review"] = privacySettings.LastReviewedAt;
            report["data_processing_enabled"] = privacySettings.EnableDataProcessing;
            report["personalization_enabled"] = privacySettings.AllowPersonalization;
            report["third_party_sharing_enabled"] = privacySettings.AllowThirdPartySharing;
            report["minimal_processing"] = privacySettings.MinimalDataProcessing;
            report["generated_at"] = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate compliance report for user {UserId}", userId);
            report["error"] = ex.Message;
        }
        
        return report;
    }
    
    public async Task<bool> IsDataProcessingLegalAsync(Guid userId, string purpose)
    {
        // Check for valid consent
        var hasConsent = await HasValidConsentAsync(userId, purpose);
        if (hasConsent) return true;
        
        // Check for legitimate interest (case by case basis)
        var legitimateInterestPurposes = new[] { "security", "fraud_prevention", "service_improvement" };
        if (legitimateInterestPurposes.Contains(purpose)) return true;
        
        // Check for contractual necessity
        var contractualPurposes = new[] { "service_delivery", "billing", "customer_support" };
        if (contractualPurposes.Contains(purpose)) return true;
        
        // Check for legal obligation
        var legalObligationPurposes = new[] { "tax_reporting", "audit_compliance", "law_enforcement" };
        if (legalObligationPurposes.Contains(purpose)) return true;
        
        return false; // No legal basis found
    }
    
    #endregion
    
    #region Privacy Impact Assessment
    
    public async Task<bool> RequiresPrivacyImpactAssessmentAsync(string dataType, string purpose)
    {
        // High-risk processing activities require PIA
        var highRiskDataTypes = new[] { "biometric", "genetic", "health", "financial", "behavioral_profiling" };
        var highRiskPurposes = new[] { "automated_decision_making", "systematic_monitoring", "large_scale_processing" };
        
        return highRiskDataTypes.Contains(dataType) || highRiskPurposes.Contains(purpose);
    }
    
    public async Task<Dictionary<string, object>> GeneratePrivacyImpactAssessmentAsync(string dataType, string purpose)
    {
        var pia = new Dictionary<string, object>
        {
            ["data_type"] = dataType,
            ["purpose"] = purpose,
            ["requires_pia"] = await RequiresPrivacyImpactAssessmentAsync(dataType, purpose),
            ["risk_level"] = DetermineRiskLevel(dataType, purpose),
            ["mitigation_measures"] = GetMitigationMeasures(dataType, purpose),
            ["legal_basis"] = GetLegalBasis(purpose),
            ["data_minimization"] = true,
            ["purpose_limitation"] = true,
            ["storage_limitation"] = await GetRetentionDaysAsync(dataType),
            ["accuracy"] = true,
            ["security_measures"] = GetSecurityMeasures(dataType),
            ["generated_at"] = DateTime.UtcNow
        };
        
        return pia;
    }
    
    #endregion
    
    #region Private Helper Methods
    
    private async Task<List<DataRetentionPolicy>> CreateDefaultRetentionPoliciesAsync()
    {
        var policies = new List<DataRetentionPolicy>();
        
        foreach (var kvp in _defaultRetentionPolicies)
        {
            var policy = new DataRetentionPolicy
            {
                Id = Guid.NewGuid(),
                DataType = kvp.Key,
                RetentionDays = kvp.Value,
                Description = $"Default retention policy for {kvp.Key}",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "system",
                AutoPurge = true,
                LegalBasis = "legitimate_interest"
            };
            
            policies.Add(policy);
            _context.DataRetentionPolicies.Add(policy);
        }
        
        await _context.SaveChangesAsync();
        return policies;
    }
    
    private string DetermineRiskLevel(string dataType, string purpose)
    {
        var highRiskDataTypes = new[] { "biometric", "genetic", "health", "financial" };
        var highRiskPurposes = new[] { "automated_decision_making", "systematic_monitoring" };
        
        if (highRiskDataTypes.Contains(dataType) || highRiskPurposes.Contains(purpose))
            return "high";
        
        var mediumRiskDataTypes = new[] { "behavioral_profiling", "location", "device_fingerprinting" };
        if (mediumRiskDataTypes.Contains(dataType))
            return "medium";
            
        return "low";
    }
    
    private List<string> GetMitigationMeasures(string dataType, string purpose)
    {
        var measures = new List<string>
        {
            "Data minimization applied",
            "Purpose limitation enforced",
            "Storage limitation implemented",
            "Encryption at rest and in transit",
            "Access controls in place",
            "Regular security assessments",
            "Staff training on data protection",
            "Incident response procedures"
        };
        
        if (dataType == "biometric" || dataType == "genetic")
        {
            measures.Add("Enhanced security controls");
            measures.Add("Pseudonymization applied");
        }
        
        return measures;
    }
    
    private string GetLegalBasis(string purpose)
    {
        return purpose switch
        {
            "marketing" => "consent",
            "personalization" => "consent",
            "analytics" => "legitimate_interest",
            "security" => "legitimate_interest",
            "service_delivery" => "contract",
            "billing" => "contract",
            "legal_compliance" => "legal_obligation",
            _ => "consent"
        };
    }
    
    private List<string> GetSecurityMeasures(string dataType)
    {
        var measures = new List<string>
        {
            "AES-256 encryption",
            "TLS 1.3 for transmission",
            "Access logging and monitoring",
            "Role-based access control",
            "Regular security audits",
            "Data backup and recovery",
            "Incident response plan"
        };
        
        if (dataType == "financial" || dataType == "health")
        {
            measures.Add("Enhanced authentication");
            measures.Add("Data loss prevention");
            measures.Add("Additional audit trails");
        }
        
        return measures;
    }
    
    #endregion
}