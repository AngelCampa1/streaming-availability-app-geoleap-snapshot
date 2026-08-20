using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Enhanced privacy service implementation for social media integration
/// </summary>
public class EnhancedPrivacyService : IPrivacyService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;

    public EnhancedPrivacyService(ApplicationDbContext context, ILoggerService logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> HasSocialDataConsentAsync(Guid userId)
    {
        try
        {
            var consent = await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ConsentRevokedAt == null);

            return consent?.AllowSocialDataCollection == true;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to check social data consent: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> HasSocialRecommendationConsentAsync(Guid userId)
    {
        try
        {
            var consent = await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ConsentRevokedAt == null);

            return consent?.AllowSocialRecommendations == true;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to check social recommendation consent: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> HasFriendDiscoveryConsentAsync(Guid userId)
    {
        try
        {
            var consent = await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ConsentRevokedAt == null);

            return consent?.AllowFriendDiscovery == true;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to check friend discovery consent: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> HasActivityTrackingConsentAsync(Guid userId)
    {
        try
        {
            var consent = await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ConsentRevokedAt == null);

            return consent?.AllowActivityTracking == true;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to check activity tracking consent: {ex.Message}");
            return false;
        }
    }

    public async Task<ServiceResult> UpdateSocialPrivacyConsentAsync(Guid userId, SocialPrivacyConsent consent)
    {
        try
        {
            var existingConsent = await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (existingConsent != null)
            {
                existingConsent.AllowSocialDataCollection = consent.AllowSocialDataCollection;
                existingConsent.AllowFriendDiscovery = consent.AllowFriendDiscovery;
                existingConsent.AllowSocialRecommendations = consent.AllowSocialRecommendations;
                existingConsent.AllowActivityTracking = consent.AllowActivityTracking;
                existingConsent.UpdatedAt = DateTime.UtcNow;
                
                if (!consent.AllowSocialDataCollection && !consent.AllowFriendDiscovery && 
                    !consent.AllowSocialRecommendations && !consent.AllowActivityTracking)
                {
                    existingConsent.ConsentRevokedAt = DateTime.UtcNow;
                }
                else
                {
                    existingConsent.ConsentRevokedAt = null;
                    existingConsent.ConsentGivenAt = DateTime.UtcNow;
                }
            }
            else
            {
                consent.UserId = userId;
                consent.ConsentGivenAt = DateTime.UtcNow;
                consent.UpdatedAt = DateTime.UtcNow;
                consent.IsGdprCompliant = true;
                consent.ConsentVersion = "2.0";
                consent.GdprLawfulBasis = "consent";

                _context.SocialPrivacyConsents.Add(consent);
            }

            await _context.SaveChangesAsync();

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to update social privacy consent: {ex.Message}");
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to update privacy consent",
                ErrorCode = "CONSENT_UPDATE_FAILED"
            };
        }
    }

    public async Task<SocialPrivacyConsent?> GetSocialPrivacyConsentAsync(Guid userId)
    {
        try
        {
            return await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get social privacy consent: {ex.Message}");
            return null;
        }
    }
}