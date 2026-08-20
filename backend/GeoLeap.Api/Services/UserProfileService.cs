using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.AspNetCore.Identity;
using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Services;

public class UserProfileService : IUserProfileService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly ILogger<UserProfileService> _logger;

    public UserProfileService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IEmailService emailService,
        ILogger<UserProfileService> logger)
    {
        _context = context;
        _userManager = userManager;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<UserProfileDto?> GetUserProfileAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.NotificationPreferences)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            DisplayName = user.DisplayName,
            TimeZone = user.Timezone,
            Language = user.Language,
            ProfileImageUrl = user.ProfileImageUrl,
            Bio = user.Bio,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            EmailVerified = user.EmailConfirmed,
            HasGoogleAccount = !string.IsNullOrEmpty(user.GoogleId),
            HasAppleAccount = !string.IsNullOrEmpty(user.AppleId),
            NotificationPreferences = user.NotificationPreferences != null 
                ? new NotificationPreferencesDto
                {
                    EmailNotifications = user.NotificationPreferences.EmailNotifications,
                    PushNotifications = user.NotificationPreferences.PushNotifications,
                    MarketingEmails = user.NotificationPreferences.MarketingEmails,
                    WeeklyDigest = user.NotificationPreferences.WeeklyDigest
                }
                : null
        };
    }

    public async Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UpdateUserProfileDto updateDto)
    {
        var user = await _context.Users
            .Include(u => u.NotificationPreferences)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        // Update user fields
        user.FirstName = updateDto.FirstName;
        user.LastName = updateDto.LastName;
        user.DisplayName = updateDto.DisplayName;
        user.Timezone = updateDto.TimeZone;
        user.Language = updateDto.Language;
        user.ProfileImageUrl = updateDto.ProfileImageUrl;
        user.Bio = updateDto.Bio;
        user.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Log the activity
        await LogUserActivityAsync(userId, "ProfileUpdated", "User updated their profile information");

        _logger.LogInformation("User profile updated successfully for UserId: {UserId}", userId);

        return await GetUserProfileAsync(userId) ?? throw new InvalidOperationException("Failed to retrieve updated profile");
    }

    public async Task<bool> ChangeEmailAsync(Guid userId, ChangeEmailRequestDto requestDto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return false;

        // Verify current password
        var isPasswordValid = await _userManager.CheckPasswordAsync(user, requestDto.CurrentPassword);
        if (!isPasswordValid) return false;

        // Check if the new email is already in use
        var existingUser = await _userManager.FindByEmailAsync(requestDto.NewEmail);
        if (existingUser != null && existingUser.Id != userId) return false;

        var oldEmail = user.Email;

        // Update the user's email directly (no verification needed)
        user.Email = requestDto.NewEmail;
        user.NormalizedEmail = requestDto.NewEmail.ToUpperInvariant();
        user.EmailConfirmed = true;
        user.ModifiedAt = DateTime.UtcNow;

        // Invalidate all user sessions for security
        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && s.IsActive)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Send confirmation emails to both old and new addresses
        if (oldEmail != null)
        {
            await _emailService.SendEmailChangeNotificationAsync(oldEmail, user.FirstName, requestDto.NewEmail, true);
        }

        // Log the activity
        await LogUserActivityAsync(userId, "EmailChanged", $"Email changed from {oldEmail} to {requestDto.NewEmail}");

        _logger.LogInformation("Email changed for UserId: {UserId}, NewEmail: {NewEmail}", userId, requestDto.NewEmail);

        return true;
    }

    public async Task<bool> VerifyEmailChangeAsync(string token)
    {
        // Email verification removed - this method is deprecated
        _logger.LogWarning("VerifyEmailChangeAsync called but email verification is disabled");
        await Task.CompletedTask; // Suppress async warning
        return false;
    }

    public async Task<NotificationPreferencesDto> GetNotificationPreferencesAsync(Guid userId)
    {
        var preferences = await _context.NotificationPreferences
            .FirstOrDefaultAsync(np => np.UserId == userId);

        if (preferences == null)
        {
            // Create default preferences
            preferences = new Models.NotificationPreferences
            {
                UserId = userId,
                EmailNotifications = true,
                PushNotifications = true,
                MarketingEmails = false,
                WeeklyDigest = true
            };

            _context.NotificationPreferences.Add(preferences);
            await _context.SaveChangesAsync();
        }

        return new NotificationPreferencesDto
        {
            EmailNotifications = preferences.EmailNotifications,
            PushNotifications = preferences.PushNotifications,
            MarketingEmails = preferences.MarketingEmails,
            WeeklyDigest = preferences.WeeklyDigest
        };
    }

    public async Task<NotificationPreferencesDto> UpdateNotificationPreferencesAsync(Guid userId, NotificationPreferencesDto preferencesDto)
    {
        var preferences = await _context.NotificationPreferences
            .FirstOrDefaultAsync(np => np.UserId == userId);

        if (preferences == null)
        {
            preferences = new Models.NotificationPreferences { UserId = userId };
            _context.NotificationPreferences.Add(preferences);
        }

        preferences.EmailNotifications = preferencesDto.EmailNotifications;
        preferences.PushNotifications = preferencesDto.PushNotifications;
        preferences.MarketingEmails = preferencesDto.MarketingEmails;
        preferences.WeeklyDigest = preferencesDto.WeeklyDigest;
        preferences.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Log the activity
        await LogUserActivityAsync(userId, "NotificationPreferencesUpdated", "User updated notification preferences");

        _logger.LogInformation("Notification preferences updated for UserId: {UserId}", userId);

        return preferencesDto;
    }

    public async Task<IEnumerable<UserActivityLogDto>> GetUserActivityLogAsync(Guid userId, int skip = 0, int take = 50)
    {
        var activities = await _context.UserActivityLogs
            .Where(al => al.UserId == userId)
            .OrderByDescending(al => al.CreatedAt)
            .Skip(skip)
            .Take(Math.Min(take, 100)) // Limit maximum take to 100
            .Select(al => new UserActivityLogDto
            {
                Id = al.Id,
                ActivityType = al.ActivityType,
                Description = al.Description,
                IpAddress = al.IpAddress,
                UserAgent = al.UserAgent,
                CreatedAt = al.CreatedAt
            })
            .ToListAsync();

        return activities;
    }

    public async Task LogUserActivityAsync(Guid userId, string activityType, string? description = null, string? ipAddress = null, string? userAgent = null)
    {
        var activityLog = new UserActivityLog
        {
            UserId = userId,
            ActivityType = activityType,
            Description = description,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        _context.UserActivityLogs.Add(activityLog);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<SocialAccountDto>> GetConnectedSocialAccountsAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return Enumerable.Empty<SocialAccountDto>();

        var accounts = new List<SocialAccountDto>();

        if (!string.IsNullOrEmpty(user.GoogleId))
        {
            accounts.Add(new SocialAccountDto
            {
                Provider = "Google",
                IsConnected = true,
                ConnectedAt = user.CreatedAt // Approximation, could be tracked separately
            });
        }

        if (!string.IsNullOrEmpty(user.AppleId))
        {
            accounts.Add(new SocialAccountDto
            {
                Provider = "Apple",
                IsConnected = true,
                ConnectedAt = user.CreatedAt // Approximation, could be tracked separately
            });
        }

        return accounts;
    }

    public async Task<bool> DisconnectSocialAccountAsync(Guid userId, DisconnectSocialAccountDto disconnectDto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return false;

        // Verify password
        var isPasswordValid = await _userManager.CheckPasswordAsync(user, disconnectDto.Password);
        if (!isPasswordValid) return false;

        // Check if user has a password set (can't disconnect last social account without password)
        var hasPassword = await _userManager.HasPasswordAsync(user);
        var hasOtherSocialAccount = false;

        switch (disconnectDto.Provider.ToLower())
        {
            case "google":
                if (string.IsNullOrEmpty(user.GoogleId)) return false;
                hasOtherSocialAccount = !string.IsNullOrEmpty(user.AppleId);
                user.GoogleId = null;
                break;
            case "apple":
                if (string.IsNullOrEmpty(user.AppleId)) return false;
                hasOtherSocialAccount = !string.IsNullOrEmpty(user.GoogleId);
                user.AppleId = null;
                break;
            default:
                return false;
        }

        // Prevent disconnecting the last authentication method
        if (!hasPassword && !hasOtherSocialAccount)
        {
            throw new InvalidOperationException("Cannot disconnect the last authentication method. Please set a password first.");
        }

        user.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Log the activity
        await LogUserActivityAsync(userId, "SocialAccountDisconnected", $"Disconnected {disconnectDto.Provider} account");

        _logger.LogInformation("Social account disconnected for UserId: {UserId}, Provider: {Provider}", userId, disconnectDto.Provider);

        return true;
    }

    public async Task DeleteAccountAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        await AssertAccountCanBeDeletedAsync(userId);
        RemoveSelfServiceAccountRows(userId);

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(error => error.Description));
            throw new InvalidOperationException($"Failed to delete account: {errors}");
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Deleted self-service account for UserId: {UserId}", userId);
    }

    private Task AssertAccountCanBeDeletedAsync(Guid userId)
    {
        var blockingReference = _context.Model
            .GetEntityTypes()
            .SelectMany(entityType => entityType.GetForeignKeys()
                .Where(foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(User))
                .Select(foreignKey => new { EntityType = entityType, ForeignKey = foreignKey }))
            .Where(reference => !CanDeleteWithAccount(reference.EntityType, reference.ForeignKey))
            .FirstOrDefault(reference => EntityHasUserReference(reference.EntityType.ClrType, reference.ForeignKey.Properties, userId));

        if (blockingReference != null)
        {
            throw new InvalidOperationException(
                "This account is linked to retained billing, subscription, analytics, social, or audit records. " +
                "Contact support to preserve required history before account deletion.");
        }

        return Task.CompletedTask;
    }

    private void RemoveSelfServiceAccountRows(Guid userId)
    {
        var removableReferences = _context.Model
            .GetEntityTypes()
            .SelectMany(entityType => entityType.GetForeignKeys()
                .Where(foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(User))
                .Select(foreignKey => new { EntityType = entityType, ForeignKey = foreignKey }))
            .Where(reference => CanDeleteWithAccount(reference.EntityType, reference.ForeignKey));

        foreach (var reference in removableReferences)
        {
            var rows = GetUserReferenceRows(reference.EntityType.ClrType, reference.ForeignKey.Properties, userId);
            _context.RemoveRange(rows);
        }
    }

    private static bool CanDeleteWithAccount(IReadOnlyTypeBase entityType, IReadOnlyForeignKey foreignKey)
    {
        var name = entityType.ClrType.Name;
        var isAccountOwnedReference = foreignKey.Properties.All(property => property.Name == "UserId");

        return isAccountOwnedReference && name is
            "IdentityUserRole`1" or
            "IdentityUserClaim`1" or
            "IdentityUserLogin`1" or
            "IdentityUserToken`1" or
            "UserRole" or
            "UserSession" or
            "PasswordResetToken" or
            "PasswordHistory" or
            "NotificationPreferences" or
            "UserActivityLog" or
            "SecurityPreferences";
    }

    private bool EntityHasUserReference(Type entityClrType, IReadOnlyList<IProperty> properties, Guid userId)
    {
        return GetUserReferenceRows(entityClrType, properties, userId).Any();
    }

    private IEnumerable<object> GetUserReferenceRows(Type entityClrType, IReadOnlyList<IProperty> properties, Guid userId)
    {
        var query = CreateSetQuery(entityClrType);
        var parameter = Expression.Parameter(entityClrType, "entity");
        Expression? body = null;

        foreach (var property in properties)
        {
            var comparison = BuildUserIdComparison(parameter, property, userId);
            body = body == null ? comparison : Expression.AndAlso(body, comparison);
        }

        if (body == null)
        {
            return Enumerable.Empty<object>();
        }

        var predicateType = typeof(Func<,>).MakeGenericType(entityClrType, typeof(bool));
        var predicate = Expression.Lambda(predicateType, body, parameter);
        var whereExpression = Expression.Call(
            typeof(Queryable),
            nameof(Queryable.Where),
            new[] { entityClrType },
            query.Expression,
            predicate);
        var filteredQuery = query.Provider.CreateQuery(whereExpression);

        return filteredQuery.Cast<object>().ToList();
    }

    private IQueryable CreateSetQuery(Type entityClrType)
    {
        var setMethod = typeof(DbContext)
            .GetMethods()
            .Single(method => method.Name == nameof(DbContext.Set)
                && method.IsGenericMethodDefinition
                && method.GetParameters().Length == 0);

        return (IQueryable)setMethod.MakeGenericMethod(entityClrType).Invoke(_context, null)!;
    }

    private static Expression BuildUserIdComparison(ParameterExpression parameter, IProperty property, Guid userId)
    {
        Expression value = property.PropertyInfo != null
            ? Expression.Property(parameter, property.PropertyInfo)
            : Expression.Call(
                typeof(EF),
                nameof(EF.Property),
                new[] { property.ClrType },
                parameter,
                Expression.Constant(property.Name));

        if (property.ClrType == typeof(Guid))
        {
            return Expression.Equal(value, Expression.Constant(userId));
        }

        if (property.ClrType == typeof(Guid?))
        {
            return Expression.Equal(value, Expression.Constant(userId, typeof(Guid?)));
        }

        return Expression.Constant(false);
    }

    private static string GenerateEmailChangeToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var tokenBytes = new byte[32];
        rng.GetBytes(tokenBytes);
        return Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }
}
