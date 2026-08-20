using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Data;
using GeoLeap.Api.Exceptions;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services.ValidationServices;

public interface IBusinessValidationService
{
    Task<BusinessValidationResult> ValidateUserRegistrationAsync(RegisterDto registration);
    Task<BusinessValidationResult> ValidateSubscriptionChangeAsync(Guid userId, string newTier);
    Task<BusinessValidationResult> ValidatePaymentAmountAsync(decimal amount, string currency);
    Task<BusinessValidationResult> ValidateContentAccessAsync(Guid userId, string contentId);
    Task<BusinessValidationResult> ValidateUserProfileUpdateAsync(Guid userId, UpdateProfileDto updates);
    Task<BusinessValidationResult> ValidatePasswordResetAsync(string email, string token);
    BusinessValidationResult ValidatePaginationParameters(int page, int pageSize);
    BusinessValidationResult ValidateSearchQuery(string query);
    BusinessValidationResult ValidateDateRange(DateTime? startDate, DateTime? endDate);
    BusinessValidationResult ValidateFileUpload(IFormFile file, string[] allowedExtensions, long maxSizeBytes);
    Task<BusinessValidationResult> ValidateSubscriptionCancellationAsync(Guid userId, string reason);
}

public class BusinessValidationService : IBusinessValidationService
{
    private readonly ILogger<BusinessValidationService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public BusinessValidationService(
        ILogger<BusinessValidationService> logger,
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _configuration = configuration;
    }

    public async Task<BusinessValidationResult> ValidateUserRegistrationAsync(RegisterDto registration)
    {
        var errors = new List<string>();

        // Check if email already exists
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == registration.Email);
        
        if (existingUser != null)
        {
            errors.Add("An account with this email address already exists.");
        }

        // Business rule: Check if email domain is blacklisted
        var emailDomain = registration.Email.Split('@').LastOrDefault();
        var blacklistedDomains = _configuration.GetSection("Security:BlacklistedDomains")
            .Get<string[]>() ?? Array.Empty<string>();
        
        if (blacklistedDomains.Contains(emailDomain, StringComparer.OrdinalIgnoreCase))
        {
            errors.Add("Email domain is not allowed for registration.");
        }

        // Business rule: Validate name format (no numbers or special characters)
        if (registration.FirstName.Any(char.IsDigit) || registration.FirstName.Any(c => !char.IsLetter(c) && !char.IsWhiteSpace(c)))
        {
            errors.Add("First name should only contain letters and spaces.");
        }

        if (registration.LastName.Any(char.IsDigit) || registration.LastName.Any(c => !char.IsLetter(c) && !char.IsWhiteSpace(c)))
        {
            errors.Add("Last name should only contain letters and spaces.");
        }

        // Business rule: Check registration rate limiting
        var recentRegistrations = await _context.Users
            .Where(u => u.CreatedAt > DateTime.UtcNow.AddHours(-1))
            .CountAsync();

        var maxRegistrationsPerHour = _configuration.GetValue<int>("Security:MaxRegistrationsPerHour", 50);
        if (recentRegistrations >= maxRegistrationsPerHour)
        {
            errors.Add("Registration temporarily unavailable. Please try again later.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult
            {
                IsValid = false,
                Errors = errors
            };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public async Task<BusinessValidationResult> ValidateSubscriptionChangeAsync(Guid userId, string newTier)
    {
        var errors = new List<string>();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            errors.Add("User not found.");
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        var validTiers = new[] { "free", "premium", "enterprise" };
        if (!validTiers.Contains(newTier.ToLower()))
        {
            errors.Add("Invalid subscription tier.");
        }

        // Business rule: Cannot downgrade if user has active features that require current tier
        var currentTier = user.SubscriptionTier ?? "free";
        if (IsDowngrade(currentTier, newTier))
        {
            var hasActiveFeatures = await _context.UserActivityLogs
                .Where(log => log.UserId == userId && 
                              log.CreatedAt > DateTime.UtcNow.AddDays(-30) &&
                              RequiresPremiumTier(log.ActivityType))
                .AnyAsync();

            if (hasActiveFeatures)
            {
                errors.Add("Cannot downgrade subscription while using premium features.");
            }
        }

        // Business rule: Prevent multiple subscription changes within a day
        var recentSubscriptionChanges = await _context.UserActivityLogs
            .Where(log => log.UserId == userId && 
                          log.ActivityType == "SubscriptionChanged" &&
                          log.CreatedAt > DateTime.UtcNow.AddDays(-1))
            .CountAsync();

        if (recentSubscriptionChanges > 0)
        {
            errors.Add("You can only change your subscription once per day.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public async Task<BusinessValidationResult> ValidatePaymentAmountAsync(decimal amount, string currency)
    {
        var errors = new List<string>();

        // Business rule: Minimum payment amount
        var minimumAmounts = new Dictionary<string, decimal>
        {
            { "USD", 1.00m },
            { "EUR", 1.00m },
            { "GBP", 0.50m },
            { "CAD", 1.00m }
        };

        if (minimumAmounts.TryGetValue(currency, out var minAmount) && amount < minAmount)
        {
            errors.Add($"Minimum payment amount for {currency} is {minAmount:C}.");
        }

        // Business rule: Maximum payment amount for fraud prevention
        var maximumAmounts = new Dictionary<string, decimal>
        {
            { "USD", 10000m },
            { "EUR", 10000m },
            { "GBP", 8000m },
            { "CAD", 12000m }
        };

        if (maximumAmounts.TryGetValue(currency, out var maxAmount) && amount > maxAmount)
        {
            errors.Add($"Maximum payment amount for {currency} is {maxAmount:C}.");
        }

        // Business rule: Check for suspicious payment patterns
        var suspiciousAmounts = new[] { 9999.99m, 10000.01m, 5000.00m };
        if (suspiciousAmounts.Contains(amount))
        {
            _logger.LogWarning("Suspicious payment amount detected: {Amount} {Currency}", amount, currency);
            // Don't block, but log for review
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public async Task<BusinessValidationResult> ValidateContentAccessAsync(Guid userId, string contentId)
    {
        var errors = new List<string>();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            errors.Add("User not found.");
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        // Business rule: Check subscription tier requirements for premium content
        if (IsPremiumContent(contentId))
        {
            var userTier = user.SubscriptionTier ?? "free";
            if (userTier == "free")
            {
                errors.Add("Premium subscription required to access this content.");
            }
        }

        // Business rule: Geographic restrictions
        var userRegion = await GetUserRegionAsync(userId);
        if (!string.IsNullOrEmpty(userRegion) && !IsContentAvailableInRegion(contentId, userRegion))
        {
            errors.Add("This content is not available in your region.");
        }

        // Business rule: Age restrictions
        var contentRating = await GetContentRatingAsync(contentId);
        if (!string.IsNullOrEmpty(contentRating) && !user.DateOfBirth.HasValue)
        {
            if (RequiresAgeVerification(contentRating))
            {
                errors.Add("Age verification required to access this content.");
            }
        }
        else if (user.DateOfBirth.HasValue)
        {
            var age = DateTime.UtcNow.Year - user.DateOfBirth.Value.Year;
            if (!IsAgeAppropriate(contentRating, age))
            {
                errors.Add("You must be 18 or older to access this content.");
            }
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public async Task<BusinessValidationResult> ValidateUserProfileUpdateAsync(Guid userId, UpdateProfileDto updates)
    {
        var errors = new List<string>();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            errors.Add("User not found.");
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        // Business rule: Email change validation
        if (!string.IsNullOrEmpty(updates.Email) && updates.Email != user.Email)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == updates.Email && u.Id != userId);
            
            if (existingUser != null)
            {
                errors.Add("This email address is already in use by another account.");
            }
        }

        // Business rule: Username change limitations
        if (!string.IsNullOrEmpty(updates.UserName) && updates.UserName != user.UserName)
        {
            var recentUsernameChanges = await _context.UserActivityLogs
                .Where(log => log.UserId == userId && 
                              log.ActivityType == "UsernameChanged" &&
                              log.CreatedAt > DateTime.UtcNow.AddDays(-30))
                .CountAsync();

            if (recentUsernameChanges >= 1)
            {
                errors.Add("You can only change your username once per month.");
            }
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public async Task<BusinessValidationResult> ValidatePasswordResetAsync(string email, string token)
    {
        var errors = new List<string>();

        // Business rule: Check for token reuse attempts
        var recentResetAttempts = await _context.PasswordResetTokens
            .Where(t => t.Email == email && 
                        t.CreatedAt > DateTime.UtcNow.AddMinutes(-15))
            .CountAsync();

        if (recentResetAttempts > 3)
        {
            errors.Add("Too many password reset attempts. Please wait 15 minutes before trying again.");
        }

        // Business rule: Validate token hasn't been used
        var existingToken = await _context.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsUsed);

        if (existingToken == null)
        {
            errors.Add("Invalid or expired reset token.");
        }
        else if (existingToken.ExpiresAt < DateTime.UtcNow)
        {
            errors.Add("Reset token has expired.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public BusinessValidationResult ValidatePaginationParameters(int page, int pageSize)
    {
        var errors = new List<string>();

        if (page < 1)
        {
            errors.Add("Page number must be 1 or greater.");
        }

        if (pageSize < 1)
        {
            errors.Add("Page size must be 1 or greater.");
        }

        if (pageSize > 100)
        {
            errors.Add("Page size cannot exceed 100 items.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public BusinessValidationResult ValidateSearchQuery(string query)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(query))
        {
            errors.Add("Search query cannot be empty.");
        }
        else if (query.Length < 2)
        {
            errors.Add("Search query must be at least 2 characters long.");
        }
        else if (query.Length > 100)
        {
            errors.Add("Search query cannot exceed 100 characters.");
        }

        // Business rule: Block potentially malicious search patterns
        var suspiciousPatterns = new[] { "script", "alert", "javascript:", "vbscript:", "onload", "onerror" };
        if (suspiciousPatterns.Any(pattern => query.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("Search query contains invalid characters.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public BusinessValidationResult ValidateDateRange(DateTime? startDate, DateTime? endDate)
    {
        var errors = new List<string>();

        if (startDate.HasValue && endDate.HasValue)
        {
            if (startDate > endDate)
            {
                errors.Add("Start date cannot be later than end date.");
            }

            var maxRange = TimeSpan.FromDays(365);
            if (endDate - startDate > maxRange)
            {
                errors.Add("Date range cannot exceed 365 days.");
            }

            var minDate = DateTime.UtcNow.AddYears(-5);
            var maxDate = DateTime.UtcNow.AddDays(1);

            if (startDate < minDate || endDate < minDate)
            {
                errors.Add("Date cannot be more than 5 years in the past.");
            }

            if (startDate > maxDate || endDate > maxDate)
            {
                errors.Add("Date cannot be in the future.");
            }
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public BusinessValidationResult ValidateFileUpload(IFormFile file, string[] allowedExtensions, long maxSizeBytes)
    {
        var errors = new List<string>();

        if (file == null || file.Length == 0)
        {
            errors.Add("No file was uploaded.");
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        if (file.Length > maxSizeBytes)
        {
            var maxSizeMB = maxSizeBytes / (1024 * 1024);
            errors.Add($"File size cannot exceed {maxSizeMB}MB.");
        }

        var extension = Path.GetExtension(file.FileName)?.ToLower();
        if (!allowedExtensions.Contains(extension))
        {
            errors.Add($"File type not allowed. Allowed types: {string.Join(", ", allowedExtensions)}.");
        }

        // Business rule: Check for potentially malicious file names
        var suspiciousNames = new[] { "web.config", ".htaccess", "index.php", "shell", "backdoor" };
        if (suspiciousNames.Any(name => file.FileName.Contains(name, StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("File name contains invalid characters.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    public async Task<BusinessValidationResult> ValidateSubscriptionCancellationAsync(Guid userId, string reason)
    {
        var errors = new List<string>();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            errors.Add("User not found.");
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        var userTier = user.SubscriptionTier ?? "free";
        if (userTier == "free")
        {
            errors.Add("Cannot cancel free subscription.");
        }

        // Business rule: Check for recent cancellation attempts
        var recentCancellations = await _context.UserActivityLogs
            .Where(log => log.UserId == userId && 
                          log.ActivityType == "SubscriptionCancelled" &&
                          log.CreatedAt > DateTime.UtcNow.AddDays(-1))
            .CountAsync();

        if (recentCancellations > 0)
        {
            errors.Add("Subscription was recently cancelled. Please contact support for assistance.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            errors.Add("Cancellation reason is required.");
        }
        else if (reason.Length > 500)
        {
            errors.Add("Cancellation reason cannot exceed 500 characters.");
        }

        if (errors.Any())
        {
            return new BusinessValidationResult { IsValid = false, Errors = errors };
        }

        return new BusinessValidationResult { IsValid = true };
    }

    // Helper methods
    private static bool IsDowngrade(string currentTier, string newTier)
    {
        var tierHierarchy = new Dictionary<string, int>
        {
            { "free", 0 },
            { "premium", 1 },
            { "enterprise", 2 }
        };

        return tierHierarchy.GetValueOrDefault(currentTier.ToLower(), 0) > 
               tierHierarchy.GetValueOrDefault(newTier.ToLower(), 0);
    }

    private static bool RequiresPremiumTier(string activityType)
    {
        var premiumActivities = new[] { "AdvancedSearch", "PremiumContent", "DataExport", "ApiAccess" };
        return premiumActivities.Contains(activityType);
    }

    private static bool IsPremiumContent(string contentId)
    {
        // This would typically check against a database or cache
        // For now, assume content IDs starting with "premium_" are premium
        return contentId.StartsWith("premium_", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string?> GetUserRegionAsync(Guid userId)
    {
        var userPreference = await _context.UserRegionPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);
        
        return userPreference?.RegionCode;
    }

    private static bool IsContentAvailableInRegion(string contentId, string region)
    {
        // This would typically check against a database or external service
        // For now, assume all content is available in major regions
        var supportedRegions = new[] { "US", "CA", "GB", "AU", "DE", "FR" };
        return supportedRegions.Contains(region);
    }

    private async Task<string?> GetContentRatingAsync(string contentId)
    {
        // This would typically fetch from database or external service
        // For now, return null to avoid blocking
        await Task.CompletedTask;
        return null;
    }

    private static bool RequiresAgeVerification(string rating)
    {
        var adultRatings = new[] { "R", "NC-17", "TV-MA", "M" };
        return adultRatings.Contains(rating, StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsAgeAppropriate(string? rating, int age)
    {
        if (string.IsNullOrEmpty(rating)) return true;

        return rating.ToUpper() switch
        {
            "G" or "TV-G" => true,
            "PG" or "TV-PG" => age >= 7,
            "PG-13" or "TV-14" => age >= 13,
            "R" or "TV-MA" => age >= 17,
            "NC-17" => age >= 18,
            _ => true
        };
    }
}

public class BusinessValidationResult : ValidationResult
{
    // Inherits IsValid and Errors from ValidationResult
}