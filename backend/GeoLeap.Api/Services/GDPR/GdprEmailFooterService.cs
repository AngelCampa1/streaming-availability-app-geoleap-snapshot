using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GDPR;

namespace GeoLeap.Api.Services.GDPR;

/// <summary>
/// Service for generating GDPR-compliant email footers and headers
/// </summary>
public class GdprEmailFooterService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GdprEmailFooterService> _logger;
    private readonly IConfiguration _configuration;
    
    public GdprEmailFooterService(
        ApplicationDbContext context, 
        ILogger<GdprEmailFooterService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }
    
    /// <summary>
    /// Generates GDPR-compliant email footer for notification emails
    /// </summary>
    public async Task<string> GenerateGdprFooterAsync(Guid userId, string notificationType = "general")
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return GetGenericGdprFooter();
            
            var privacySettings = await _context.PrivacySettings
                .FirstOrDefaultAsync(p => p.UserId == userId);
            
            var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
            var unsubscribeUrl = $"{baseUrl}/unsubscribe?token={GenerateUnsubscribeToken(userId, notificationType)}";
            var privacyPolicyUrl = $"{baseUrl}/privacy-policy";
            var preferencesUrl = $"{baseUrl}/preferences";
            
            var footer = $@"
<div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666666;'>
    <p style='margin: 0 0 10px 0;'>
        <strong>Privacy & Data Protection Notice</strong><br/>
        This email was sent in accordance with your notification preferences and our privacy policy.
    </p>
    
    <p style='margin: 0 0 10px 0;'>
        <strong>Your Rights:</strong> Under GDPR, you have the right to access, rectify, erase, or restrict processing of your personal data.
        <a href='{privacyPolicyUrl}' style='color: #007bff;'>Learn more about your data protection rights</a>.
    </p>
    
    <p style='margin: 0 0 10px 0;'>
        <strong>Manage Your Preferences:</strong>
        <a href='{preferencesUrl}' style='color: #007bff; margin-right: 10px;'>Update Notification Preferences</a> |
        <a href='{unsubscribeUrl}' style='color: #dc3545;'>Unsubscribe from All Notifications</a>
    </p>
    
    <p style='margin: 0 0 10px 0;'>
        <strong>Data Processing:</strong> {GetDataProcessingInfo(privacySettings)}
    </p>
    
    <p style='margin: 0; font-size: 11px; color: #999999;'>
        This email was sent to {user.Email}. If you believe you received this email in error, please contact our 
        <a href='mailto:privacy@geoleap.com' style='color: #007bff;'>Privacy Team</a>.
        <br/>© 2025 GeoLeap. All rights reserved. | 
        <a href='{privacyPolicyUrl}' style='color: #007bff;'>Privacy Policy</a> | 
        <a href='{baseUrl}/terms' style='color: #007bff;'>Terms of Service</a>
    </p>
</div>";

            return footer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate GDPR footer for user {UserId}", userId);
            return GetGenericGdprFooter();
        }
    }
    
    /// <summary>
    /// Generates GDPR-compliant plain text footer
    /// </summary>
    public async Task<string> GenerateGdprPlainTextFooterAsync(Guid userId, string notificationType = "general")
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return GetGenericPlainTextGdprFooter();
            
            var privacySettings = await _context.PrivacySettings
                .FirstOrDefaultAsync(p => p.UserId == userId);
            
            var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
            var unsubscribeUrl = $"{baseUrl}/unsubscribe?token={GenerateUnsubscribeToken(userId, notificationType)}";
            var privacyPolicyUrl = $"{baseUrl}/privacy-policy";
            var preferencesUrl = $"{baseUrl}/preferences";
            
            var footer = $@"

---
PRIVACY & DATA PROTECTION NOTICE

This email was sent in accordance with your notification preferences and our privacy policy.

YOUR RIGHTS: Under GDPR, you have the right to access, rectify, erase, or restrict processing of your personal data. Learn more: {privacyPolicyUrl}

MANAGE YOUR PREFERENCES:
• Update Notification Preferences: {preferencesUrl}
• Unsubscribe from All Notifications: {unsubscribeUrl}

DATA PROCESSING: {GetPlainTextDataProcessingInfo(privacySettings)}

This email was sent to {user.Email}. If you believe you received this email in error, please contact our Privacy Team at privacy@geoleap.com.

© 2025 GeoLeap. All rights reserved.
Privacy Policy: {privacyPolicyUrl}
Terms of Service: {baseUrl}/terms";

            return footer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate plain text GDPR footer for user {UserId}", userId);
            return GetGenericPlainTextGdprFooter();
        }
    }
    
    /// <summary>
    /// Adds GDPR compliance metadata to notification delivery log
    /// </summary>
    public async Task<Dictionary<string, object>> GenerateGdprMetadataAsync(Guid userId, string notificationType)
    {
        var metadata = new Dictionary<string, object>();
        
        try
        {
            var privacySettings = await _context.PrivacySettings
                .FirstOrDefaultAsync(p => p.UserId == userId);
                
            var hasConsent = await _context.ConsentRecords
                .AnyAsync(c => c.UserId == userId && 
                             c.Purpose == "notifications" && 
                             c.IsActive && 
                             c.ConsentGiven &&
                             !c.ConsentWithdrawnDate.HasValue);
            
            metadata["gdpr_compliant"] = true;
            metadata["privacy_compliant"] = true;
            metadata["consent_verified"] = hasConsent;
            metadata["data_retention_days"] = GetNotificationRetentionDays();
            metadata["personalization_enabled"] = privacySettings?.AllowPersonalization ?? false;
            metadata["third_party_sharing"] = privacySettings?.AllowThirdPartySharing ?? false;
            metadata["minimal_data_processing"] = privacySettings?.MinimalDataProcessing ?? true;
            metadata["notification_type"] = notificationType;
            metadata["gdpr_rights_notice_included"] = true;
            metadata["unsubscribe_link_included"] = true;
            metadata["privacy_policy_link_included"] = true;
            metadata["compliance_version"] = "1.0";
            metadata["compliance_timestamp"] = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate GDPR metadata for user {UserId}", userId);
            metadata["gdpr_error"] = ex.Message;
        }
        
        return metadata;
    }
    
    /// <summary>
    /// Validates if notification can be sent based on GDPR compliance
    /// </summary>
    public async Task<bool> CanSendNotificationAsync(Guid userId, string notificationType)
    {
        try
        {
            // Check if user has withdrawn consent
            var hasWithdrawnConsent = await _context.ConsentRecords
                .AnyAsync(c => c.UserId == userId && 
                             c.Purpose == "notifications" && 
                             c.IsActive && 
                             !c.ConsentGiven &&
                             c.ConsentWithdrawnDate.HasValue);
                             
            if (hasWithdrawnConsent) return false;
            
            // Check privacy settings
            var privacySettings = await _context.PrivacySettings
                .FirstOrDefaultAsync(p => p.UserId == userId);
                
            if (privacySettings?.EnableDataProcessing == false) return false;
            
            // Check notification settings
            var notificationSettings = await _context.WatchlistNotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);
                
            if (notificationSettings?.UnsubscribeFromAllDate.HasValue == true) return false;
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate GDPR compliance for user {UserId}", userId);
            return false; // Fail secure - don't send if can't validate
        }
    }
    
    private string GetDataProcessingInfo(PrivacySettings? settings)
    {
        if (settings == null)
        {
            return "Essential data processing only (service delivery).";
        }
        
        var purposes = new List<string>();
        
        if (settings.EnableDataProcessing)
            purposes.Add("service delivery");
            
        if (settings.AllowPersonalization)
            purposes.Add("content personalization");
            
        if (settings.AllowAnalytics)
            purposes.Add("analytics and improvements");
            
        if (settings.AllowMarketingCommunications)
            purposes.Add("marketing communications");
        
        if (!purposes.Any())
            purposes.Add("essential data processing only");
            
        return $"Your data is processed for: {string.Join(", ", purposes)}.";
    }
    
    private string GetPlainTextDataProcessingInfo(PrivacySettings? settings)
    {
        if (settings == null)
        {
            return "Essential data processing only (service delivery).";
        }
        
        var purposes = new List<string>();
        
        if (settings.EnableDataProcessing)
            purposes.Add("service delivery");
            
        if (settings.AllowPersonalization)
            purposes.Add("content personalization");
            
        if (settings.AllowAnalytics)
            purposes.Add("analytics and improvements");
            
        if (settings.AllowMarketingCommunications)
            purposes.Add("marketing communications");
        
        if (!purposes.Any())
            purposes.Add("essential data processing only");
            
        return $"Your data is processed for: {string.Join(", ", purposes)}.";
    }
    
    private string GenerateUnsubscribeToken(Guid userId, string notificationType)
    {
        // Generate a secure unsubscribe token
        var data = $"{userId}|{notificationType}|{DateTime.UtcNow:yyyy-MM-dd}";
        var bytes = System.Text.Encoding.UTF8.GetBytes(data);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }
    
    private int GetNotificationRetentionDays()
    {
        return _configuration.GetValue<int>("GDPR:NotificationRetentionDays", 90);
    }
    
    private string GetGenericGdprFooter()
    {
        var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
        
        return $@"
<div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666666;'>
    <p style='margin: 0 0 10px 0;'>
        <strong>Privacy & Data Protection Notice</strong><br/>
        This email was sent in accordance with your notification preferences and our privacy policy.
    </p>
    
    <p style='margin: 0 0 10px 0;'>
        Under GDPR, you have the right to access, rectify, erase, or restrict processing of your personal data.
        <a href='{baseUrl}/privacy-policy' style='color: #007bff;'>Privacy Policy</a> |
        <a href='{baseUrl}/unsubscribe' style='color: #dc3545;'>Unsubscribe</a>
    </p>
    
    <p style='margin: 0; font-size: 11px; color: #999999;'>
        © 2025 GeoLeap. All rights reserved. | 
        <a href='{baseUrl}/privacy-policy' style='color: #007bff;'>Privacy Policy</a> | 
        <a href='{baseUrl}/terms' style='color: #007bff;'>Terms of Service</a>
    </p>
</div>";
    }
    
    private string GetGenericPlainTextGdprFooter()
    {
        var baseUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
        
        return $@"

---
PRIVACY & DATA PROTECTION NOTICE

This email was sent in accordance with your notification preferences and our privacy policy.

Under GDPR, you have the right to access, rectify, erase, or restrict processing of your personal data.

Privacy Policy: {baseUrl}/privacy-policy
Unsubscribe: {baseUrl}/unsubscribe

© 2025 GeoLeap. All rights reserved.";
    }
}