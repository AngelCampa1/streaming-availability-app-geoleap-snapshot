using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

public class SecurityService : ISecurityService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<SecurityService> _logger;

    // Known VPN/Proxy IP ranges (simplified example)
    private readonly HashSet<string> _highRiskIpRanges = new()
    {
        "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", // Private ranges often used by VPNs
        "1.1.1.0/24", "8.8.8.0/24" // Example public ranges - in real implementation use threat intel feeds
    };

    public SecurityService(ApplicationDbContext context, IEmailService emailService, ILogger<SecurityService> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<SecurityEvent> LogSecurityEventAsync(Guid userId, string eventType, string ipAddress, string userAgent, string? details = null)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new ArgumentException($"User with ID {userId} not found");
            }

            var location = await GetLocationFromIpAsync(ipAddress);
            
            var securityEvent = new SecurityEvent
            {
                UserId = userId,
                EventType = eventType,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Location = location,
                Details = details
            };

            // Calculate risk score
            securityEvent.RiskScore = await CalculateRiskScoreAsync(securityEvent, user);

            _context.SecurityEvents.Add(securityEvent);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Security event logged: {EventType} for user {UserId} with risk score {RiskScore}", 
                eventType, userId, securityEvent.RiskScore);

            // Check if we should send security alert
            if (await ShouldSendSecurityAlertAsync(securityEvent, user))
            {
                await SendSecurityAlertAsync(user, securityEvent);
            }

            return securityEvent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging security event for user {UserId}", userId);
            throw;
        }
    }

    public async Task<int> CalculateRiskScoreAsync(SecurityEvent securityEvent, User user)
    {
        int riskScore = 0;

        try
        {
            // New device/location: +30
            if (!string.IsNullOrEmpty(securityEvent.UserAgent) && await IsNewDeviceAsync(securityEvent.UserAgent, user.Id))
                riskScore += 30;

            // Unusual location: +25
            if (!string.IsNullOrEmpty(securityEvent.IpAddress) && await IsUnusualLocationAsync(securityEvent.IpAddress, user.Id))
                riskScore += 25;

            // High-risk IP: +40
            if (!string.IsNullOrEmpty(securityEvent.IpAddress) && await IsHighRiskIpAsync(securityEvent.IpAddress))
                riskScore += 40;

            // Multiple recent failures: +20
            if (await HasRecentFailedAttemptsAsync(user.Id))
                riskScore += 20;

            // Failed login attempt: +15
            if (securityEvent.EventType == "LOGIN_FAILED")
                riskScore += 15;

            // Login outside business hours (additional risk factor): +10
            var currentHour = DateTime.UtcNow.Hour;
            if (currentHour < 6 || currentHour > 22) // Outside 6 AM - 10 PM UTC
                riskScore += 10;

            return Math.Min(riskScore, 100);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating risk score for user {UserId}", user.Id);
            return 0; // Default to low risk on error
        }
    }

    public async Task<IEnumerable<SecurityEvent>> GetUserSecurityHistoryAsync(Guid userId, int skip = 0, int take = 50)
    {
        return await _context.SecurityEvents
            .Where(se => se.UserId == userId)
            .OrderByDescending(se => se.CreatedAt)
            .Skip(skip)
            .Take(Math.Min(take, 100)) // Limit max results to prevent abuse
            .ToListAsync();
    }

    public async Task<bool> IsNewDeviceAsync(string userAgent, Guid userId)
    {
        // Extract device signature from user agent (simplified)
        var deviceSignature = ExtractDeviceSignature(userAgent);
        
        var recentSessions = await _context.UserSessions
            .Where(us => us.UserId == userId && us.CreatedAt > DateTime.UtcNow.AddDays(-30))
            .Select(us => us.UserAgent)
            .ToListAsync();

        return !recentSessions.Any(ua => ua != null && ExtractDeviceSignature(ua) == deviceSignature);
    }

    public async Task<bool> IsUnusualLocationAsync(string ipAddress, Guid userId)
    {
        var location = await GetLocationFromIpAsync(ipAddress);
        if (string.IsNullOrEmpty(location))
            return false;

        var recentLocations = await _context.SecurityEvents
            .Where(se => se.UserId == userId && se.CreatedAt > DateTime.UtcNow.AddDays(-30))
            .Select(se => se.Location)
            .Where(loc => !string.IsNullOrEmpty(loc))
            .Distinct()
            .ToListAsync();

        // If user has no recent locations, this is unusual
        if (!recentLocations.Any())
            return true;

        // Check if current location is in recent locations (simplified check)
        var country = location.Contains(',') ? location.Substring(0, location.IndexOf(',')) : location;
        return !recentLocations.Any(loc => loc != null && loc.Contains(country)); // Match by country/state
    }

    public async Task<bool> IsHighRiskIpAsync(string ipAddress)
    {
        // In a real implementation, this would check against threat intelligence feeds
        // For now, implement basic checks
        
        // Check against known high-risk ranges (simplified)
        foreach (var range in _highRiskIpRanges)
        {
            if (IsIpInRange(ipAddress, range))
                return true;
        }

        // Additional checks could include:
        // - Tor exit nodes
        // - Known malicious IPs
        // - VPN/Proxy detection services
        // - Geolocation inconsistencies

        return await Task.FromResult(false);
    }

    public async Task<bool> HasRecentFailedAttemptsAsync(Guid userId)
    {
        var recentFailures = await _context.SecurityEvents
            .Where(se => se.UserId == userId && 
                        se.EventType == "LOGIN_FAILED" && 
                        se.CreatedAt > DateTime.UtcNow.AddHours(-1))
            .CountAsync();

        return recentFailures >= 3;
    }

    public async Task<string?> GetLocationFromIpAsync(string ipAddress)
    {
        // In a real implementation, this would use a GeoIP service like MaxMind
        // For now, return a placeholder
        if (string.IsNullOrEmpty(ipAddress))
            return null;

        // Simple mock implementation
        if (ipAddress.StartsWith("192.168.") || ipAddress.StartsWith("10.") || ipAddress.StartsWith("172."))
            return "Private Network";

        // This should be replaced with actual GeoIP lookup
        return await Task.FromResult("Location Unknown");
    }

    public async Task<SecurityPreferences> GetUserSecurityPreferencesAsync(Guid userId)
    {
        var preferences = await _context.SecurityPreferences
            .FirstOrDefaultAsync(sp => sp.UserId == userId);

        if (preferences == null)
        {
            // Create default preferences
            preferences = new SecurityPreferences
            {
                UserId = userId,
                EmailSecurityAlerts = true,
                EmailLoginNotifications = false,
                TwoFactorEnabled = false,
                SecurityQuestionEnabled = false
            };

            _context.SecurityPreferences.Add(preferences);
            await _context.SaveChangesAsync();
        }

        return preferences;
    }

    public async Task<SecurityPreferences> UpdateUserSecurityPreferencesAsync(Guid userId, SecurityPreferences preferences)
    {
        var existingPreferences = await _context.SecurityPreferences
            .FirstOrDefaultAsync(sp => sp.UserId == userId);

        if (existingPreferences == null)
        {
            preferences.UserId = userId;
            preferences.CreatedAt = DateTime.UtcNow;
            _context.SecurityPreferences.Add(preferences);
        }
        else
        {
            existingPreferences.EmailSecurityAlerts = preferences.EmailSecurityAlerts;
            existingPreferences.EmailLoginNotifications = preferences.EmailLoginNotifications;
            existingPreferences.TwoFactorEnabled = preferences.TwoFactorEnabled;
            existingPreferences.SecurityQuestionEnabled = preferences.SecurityQuestionEnabled;
            existingPreferences.ModifiedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return existingPreferences ?? preferences;
    }

    public async Task<bool> ShouldSendSecurityAlertAsync(SecurityEvent securityEvent, User user)
    {
        var preferences = await GetUserSecurityPreferencesAsync(user.Id);

        // Check if user has security alerts enabled
        if (!preferences.EmailSecurityAlerts)
            return false;

        // Send alerts for high-risk events
        if (securityEvent.RiskScore >= 50)
            return true;

        // Send alerts for specific event types if login notifications are enabled
        if (preferences.EmailLoginNotifications && 
            (securityEvent.EventType == "LOGIN_SUCCESS" || securityEvent.EventType == "LOGIN_FAILED"))
            return true;

        // Send alerts for critical security changes
        if (securityEvent.EventType == "PASSWORD_CHANGE" || 
            securityEvent.EventType == "EMAIL_CHANGE" ||
            securityEvent.EventType == "ACCOUNT_LOCKED")
            return true;

        return false;
    }

    public async Task SendSecurityAlertAsync(User user, SecurityEvent securityEvent)
    {
        try
        {
            if (string.IsNullOrEmpty(user.Email))
                return;

            var subject = GetSecurityAlertSubject(securityEvent.EventType);
            var content = GenerateSecurityAlertContent(user, securityEvent);

            // Note: IEmailService interface would need to be updated to support HTML content and subject
            // For now, we'll log the alert that would be sent
            _logger.LogInformation("Security alert would be sent to {Email}: {Subject}", user.Email, subject);
            
            // In a real implementation:
            // await _emailService.SendSecurityAlertAsync(user.Email, subject, content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending security alert to user {UserId}", user.Id);
        }
    }

    private string ExtractDeviceSignature(string userAgent)
    {
        // Simplified device signature extraction
        // In a real implementation, this would be more sophisticated
        if (string.IsNullOrEmpty(userAgent))
            return "unknown";

        var signature = userAgent.ToLower();
        
        // Extract OS
        if (signature.Contains("windows")) return "windows";
        if (signature.Contains("macintosh")) return "mac";
        if (signature.Contains("linux")) return "linux";
        if (signature.Contains("android")) return "android";
        if (signature.Contains("iphone") || signature.Contains("ipad")) return "ios";

        return "unknown";
    }

    private bool IsIpInRange(string ipAddress, string cidr)
    {
        // Simplified CIDR check - in production use proper IP address libraries
        // This is a basic implementation for demonstration
        try
        {
            var parts = cidr.Split('/');
            if (parts.Length != 2) return false;

            var networkIp = parts[0];
            var prefixLength = int.Parse(parts[1]);

            // Basic subnet check - this should use proper IP address comparison
            return ipAddress.StartsWith(networkIp.Substring(0, Math.Min(networkIp.Length, prefixLength / 8)));
        }
        catch
        {
            return false;
        }
    }

    private string GetSecurityAlertSubject(string eventType)
    {
        return eventType switch
        {
            "LOGIN_SUCCESS" => "New Device Login - GeoLeap",
            "LOGIN_FAILED" => "Failed Login Attempt - GeoLeap",
            "PASSWORD_CHANGE" => "Password Changed - GeoLeap",
            "EMAIL_CHANGE" => "Email Address Changed - GeoLeap",
            "ACCOUNT_LOCKED" => "Account Locked - GeoLeap",
            _ => "Security Alert - GeoLeap"
        };
    }

    private string GenerateSecurityAlertContent(User user, SecurityEvent securityEvent)
    {
        var content = $@"
Hello {user.FirstName},

We detected a security event on your GeoLeap account:

Event: {securityEvent.EventType}
Time: {securityEvent.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC
Location: {securityEvent.Location ?? "Unknown"}
IP Address: {securityEvent.IpAddress ?? "Unknown"}
Risk Score: {securityEvent.RiskScore}/100

If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately by changing your password.

Review your account security: https://geoleap.com/account/security

Best regards,
The GeoLeap Security Team
";

        return content;
    }
}