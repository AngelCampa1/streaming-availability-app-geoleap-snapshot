using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoLeap.Api.Tests.Services;

public class UserProfileServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<ILogger<UserProfileService>> _mockLogger;
    private readonly UserProfileService _service;
    private readonly Guid _testUserId;
    private readonly Guid _otherUserId;
    private User _testUser = null!;

    public UserProfileServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"UserProfileServiceTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup UserManager mock
        var userStore = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(
            userStore.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _mockEmailService = new Mock<IEmailService>();
        _mockLogger = new Mock<ILogger<UserProfileService>>();

        _service = new UserProfileService(
            _context,
            _mockUserManager.Object,
            _mockEmailService.Object,
            _mockLogger.Object
        );

        _testUserId = Guid.NewGuid();
        _otherUserId = Guid.NewGuid();
    }

    public async Task InitializeAsync()
    {
        // Create test users
        _testUser = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            UserName = "testuser",
            NormalizedEmail = "TEST@EXAMPLE.COM",
            NormalizedUserName = "TESTUSER",
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User",
            DisplayName = "TestUser",
            Timezone = "UTC",
            Language = "en",
            Bio = "Test bio",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            LastLoginAt = DateTime.UtcNow.AddHours(-2)
        };

        var otherUser = new User
        {
            Id = _otherUserId,
            Email = "other@example.com",
            UserName = "otheruser",
            NormalizedEmail = "OTHER@EXAMPLE.COM",
            NormalizedUserName = "OTHERUSER",
            EmailConfirmed = true,
            FirstName = "Other",
            LastName = "User",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(_testUser, otherUser);
        await _context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    #region Profile Management Tests

    [Fact]
    public async Task GetUserProfileAsync_ExistingUser_ReturnsProfile()
    {
        // Act
        var result = await _service.GetUserProfileAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.Id);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test", result.FirstName);
        Assert.Equal("User", result.LastName);
        Assert.Equal("TestUser", result.DisplayName);
        Assert.Equal("UTC", result.TimeZone);
        Assert.Equal("en", result.Language);
        Assert.Equal("Test bio", result.Bio);
        Assert.True(result.EmailVerified);
    }

    [Fact]
    public async Task GetUserProfileAsync_WithNotificationPreferences_IncludesPreferences()
    {
        // Arrange
        var preferences = new NotificationPreferences
        {
            UserId = _testUserId,
            EmailNotifications = true,
            PushNotifications = false,
            MarketingEmails = true,
            WeeklyDigest = false
        };
        _context.NotificationPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserProfileAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.NotificationPreferences);
        Assert.True(result.NotificationPreferences.EmailNotifications);
        Assert.False(result.NotificationPreferences.PushNotifications);
        Assert.True(result.NotificationPreferences.MarketingEmails);
        Assert.False(result.NotificationPreferences.WeeklyDigest);
    }

    [Fact]
    public async Task GetUserProfileAsync_WithSocialAccounts_IncludesAccountFlags()
    {
        // Arrange
        _testUser.GoogleId = "google123";
        _testUser.AppleId = "apple456";
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserProfileAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.HasGoogleAccount);
        Assert.True(result.HasAppleAccount);
    }

    [Fact]
    public async Task GetUserProfileAsync_NonExistent_ReturnsNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserProfileAsync(nonExistentId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_ValidData_UpdatesProfile()
    {
        // Arrange
        var updateDto = new UpdateUserProfileDto
        {
            FirstName = "Updated",
            LastName = "Name",
            DisplayName = "UpdatedUser",
            TimeZone = "America/New_York",
            Language = "es",
            ProfileImageUrl = "https://example.com/avatar.jpg",
            Bio = "Updated bio"
        };

        // Act
        var result = await _service.UpdateUserProfileAsync(_testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated", result.FirstName);
        Assert.Equal("Name", result.LastName);
        Assert.Equal("UpdatedUser", result.DisplayName);
        Assert.Equal("America/New_York", result.TimeZone);
        Assert.Equal("es", result.Language);
        Assert.Equal("https://example.com/avatar.jpg", result.ProfileImageUrl);
        Assert.Equal("Updated bio", result.Bio);

        // Verify database was updated
        await _context.Entry(_testUser).ReloadAsync();
        Assert.Equal("Updated", _testUser.FirstName);
        Assert.NotNull(_testUser.ModifiedAt);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_AllFields_UpdatesSuccessfully()
    {
        // Arrange
        var updateDto = new UpdateUserProfileDto
        {
            FirstName = "John",
            LastName = "Doe",
            DisplayName = "JohnD",
            TimeZone = "Europe/London",
            Language = "fr",
            ProfileImageUrl = "https://cdn.example.com/profile.png",
            Bio = "Full stack developer"
        };

        // Act
        var result = await _service.UpdateUserProfileAsync(_testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(updateDto.FirstName, result.FirstName);
        Assert.Equal(updateDto.LastName, result.LastName);
        Assert.Equal(updateDto.DisplayName, result.DisplayName);
        Assert.Equal(updateDto.TimeZone, result.TimeZone);
        Assert.Equal(updateDto.Language, result.Language);
        Assert.Equal(updateDto.ProfileImageUrl, result.ProfileImageUrl);
        Assert.Equal(updateDto.Bio, result.Bio);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_NonExistentUser_ThrowsException()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        var updateDto = new UpdateUserProfileDto
        {
            FirstName = "Test",
            LastName = "User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.UpdateUserProfileAsync(nonExistentId, updateDto));
    }

    [Fact]
    public async Task UpdateUserProfileAsync_LogsActivity()
    {
        // Arrange
        var updateDto = new UpdateUserProfileDto
        {
            FirstName = "Updated",
            LastName = "User"
        };

        // Act
        await _service.UpdateUserProfileAsync(_testUserId, updateDto);

        // Assert - Verify activity was logged
        var activityLog = await _context.UserActivityLogs
            .FirstOrDefaultAsync(al => al.UserId == _testUserId && al.ActivityType == "ProfileUpdated");
        Assert.NotNull(activityLog);
        Assert.Equal("User updated their profile information", activityLog.Description);
    }

    #endregion

    #region Email Management Tests

    [Fact]
    public async Task ChangeEmailAsync_ValidPassword_ChangesEmail()
    {
        // Arrange
        var newEmail = "newemail@example.com";
        var requestDto = new ChangeEmailRequestDto
        {
            CurrentPassword = "ValidPassword123!",
            NewEmail = newEmail
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, requestDto.CurrentPassword))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.FindByEmailAsync(newEmail))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _service.ChangeEmailAsync(_testUserId, requestDto);

        // Assert
        Assert.True(result);
        Assert.Equal(newEmail, _testUser.Email);
        Assert.Equal(newEmail.ToUpperInvariant(), _testUser.NormalizedEmail);
        Assert.True(_testUser.EmailConfirmed);
        Assert.NotNull(_testUser.ModifiedAt);

        _mockEmailService.Verify(
            es => es.SendEmailChangeNotificationAsync(
                "test@example.com",
                "Test",
                newEmail,
                true),
            Times.Once);
    }

    [Fact]
    public async Task ChangeEmailAsync_InvalidPassword_ReturnsFalse()
    {
        // Arrange
        var requestDto = new ChangeEmailRequestDto
        {
            CurrentPassword = "WrongPassword",
            NewEmail = "newemail@example.com"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, requestDto.CurrentPassword))
            .ReturnsAsync(false);

        // Act
        var result = await _service.ChangeEmailAsync(_testUserId, requestDto);

        // Assert
        Assert.False(result);
        Assert.Equal("test@example.com", _testUser.Email); // Email unchanged
    }

    [Fact]
    public async Task ChangeEmailAsync_EmailInUse_ReturnsFalse()
    {
        // Arrange
        var requestDto = new ChangeEmailRequestDto
        {
            CurrentPassword = "ValidPassword123!",
            NewEmail = "other@example.com" // Already in use
        };

        var otherUser = await _context.Users.FindAsync(_otherUserId);

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, requestDto.CurrentPassword))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.FindByEmailAsync("other@example.com"))
            .ReturnsAsync(otherUser);

        // Act
        var result = await _service.ChangeEmailAsync(_testUserId, requestDto);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ChangeEmailAsync_InvalidatesSessions()
    {
        // Arrange
        var session1 = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "refresh_token_1",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };
        var session2 = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "refresh_token_2",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        _context.UserSessions.AddRange(session1, session2);
        await _context.SaveChangesAsync();

        var requestDto = new ChangeEmailRequestDto
        {
            CurrentPassword = "ValidPassword123!",
            NewEmail = "newemail@example.com"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, requestDto.CurrentPassword))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        await _service.ChangeEmailAsync(_testUserId, requestDto);

        // Assert
        await _context.Entry(session1).ReloadAsync();
        await _context.Entry(session2).ReloadAsync();
        Assert.False(session1.IsActive);
        Assert.False(session2.IsActive);
        Assert.NotNull(session1.RevokedAt);
        Assert.NotNull(session2.RevokedAt);
    }

    [Fact]
    public async Task ChangeEmailAsync_SendsNotificationEmails()
    {
        // Arrange
        var requestDto = new ChangeEmailRequestDto
        {
            CurrentPassword = "ValidPassword123!",
            NewEmail = "newemail@example.com"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, requestDto.CurrentPassword))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        await _service.ChangeEmailAsync(_testUserId, requestDto);

        // Assert - Verify email was sent to old address
        _mockEmailService.Verify(
            es => es.SendEmailChangeNotificationAsync(
                "test@example.com",
                "Test",
                "newemail@example.com",
                true),
            Times.Once);
    }

    [Fact]
    public async Task ChangeEmailAsync_LogsActivity()
    {
        // Arrange
        var requestDto = new ChangeEmailRequestDto
        {
            CurrentPassword = "ValidPassword123!",
            NewEmail = "newemail@example.com"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, requestDto.CurrentPassword))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        await _service.ChangeEmailAsync(_testUserId, requestDto);

        // Assert
        var activityLog = await _context.UserActivityLogs
            .FirstOrDefaultAsync(al => al.UserId == _testUserId && al.ActivityType == "EmailChanged");
        Assert.NotNull(activityLog);
        Assert.Contains("test@example.com", activityLog.Description);
        Assert.Contains("newemail@example.com", activityLog.Description);
    }

    [Fact]
    public async Task VerifyEmailChangeAsync_AlwaysReturnsFalse()
    {
        // Act
        var result = await _service.VerifyEmailChangeAsync("any-token");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Notification Preferences Tests

    [Fact]
    public async Task GetNotificationPreferencesAsync_ExistingPreferences_ReturnsPreferences()
    {
        // Arrange
        var preferences = new NotificationPreferences
        {
            UserId = _testUserId,
            EmailNotifications = false,
            PushNotifications = true,
            MarketingEmails = false,
            WeeklyDigest = true
        };
        _context.NotificationPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetNotificationPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EmailNotifications);
        Assert.True(result.PushNotifications);
        Assert.False(result.MarketingEmails);
        Assert.True(result.WeeklyDigest);
    }

    [Fact]
    public async Task GetNotificationPreferencesAsync_NoPreferences_CreatesDefaults()
    {
        // Act
        var result = await _service.GetNotificationPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EmailNotifications); // Default
        Assert.True(result.PushNotifications); // Default
        Assert.False(result.MarketingEmails); // Default
        Assert.True(result.WeeklyDigest); // Default

        // Verify created in database
        var dbPreferences = await _context.NotificationPreferences
            .FirstOrDefaultAsync(np => np.UserId == _testUserId);
        Assert.NotNull(dbPreferences);
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_ExistingPreferences_Updates()
    {
        // Arrange
        var existing = new NotificationPreferences
        {
            UserId = _testUserId,
            EmailNotifications = true,
            PushNotifications = true,
            MarketingEmails = false,
            WeeklyDigest = true
        };
        _context.NotificationPreferences.Add(existing);
        await _context.SaveChangesAsync();

        var updateDto = new NotificationPreferencesDto
        {
            EmailNotifications = false,
            PushNotifications = false,
            MarketingEmails = true,
            WeeklyDigest = false
        };

        // Act
        var result = await _service.UpdateNotificationPreferencesAsync(_testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EmailNotifications);
        Assert.False(result.PushNotifications);
        Assert.True(result.MarketingEmails);
        Assert.False(result.WeeklyDigest);

        // Verify database
        await _context.Entry(existing).ReloadAsync();
        Assert.False(existing.EmailNotifications);
        Assert.NotNull(existing.ModifiedAt);
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_NewPreferences_Creates()
    {
        // Arrange
        var updateDto = new NotificationPreferencesDto
        {
            EmailNotifications = false,
            PushNotifications = true,
            MarketingEmails = true,
            WeeklyDigest = false
        };

        // Act
        var result = await _service.UpdateNotificationPreferencesAsync(_testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EmailNotifications);
        Assert.True(result.PushNotifications);
        Assert.True(result.MarketingEmails);
        Assert.False(result.WeeklyDigest);

        // Verify created in database
        var dbPreferences = await _context.NotificationPreferences
            .FirstOrDefaultAsync(np => np.UserId == _testUserId);
        Assert.NotNull(dbPreferences);
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_AllFlags_UpdatesCorrectly()
    {
        // Arrange - All enabled
        var allEnabled = new NotificationPreferencesDto
        {
            EmailNotifications = true,
            PushNotifications = true,
            MarketingEmails = true,
            WeeklyDigest = true
        };

        // Act
        var result = await _service.UpdateNotificationPreferencesAsync(_testUserId, allEnabled);

        // Assert
        Assert.True(result.EmailNotifications);
        Assert.True(result.PushNotifications);
        Assert.True(result.MarketingEmails);
        Assert.True(result.WeeklyDigest);
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_LogsActivity()
    {
        // Arrange
        var updateDto = new NotificationPreferencesDto
        {
            EmailNotifications = false,
            PushNotifications = false,
            MarketingEmails = false,
            WeeklyDigest = false
        };

        // Act
        await _service.UpdateNotificationPreferencesAsync(_testUserId, updateDto);

        // Assert
        var activityLog = await _context.UserActivityLogs
            .FirstOrDefaultAsync(al => al.UserId == _testUserId && al.ActivityType == "NotificationPreferencesUpdated");
        Assert.NotNull(activityLog);
    }

    #endregion

    #region Activity Logging Tests

    [Fact]
    public async Task GetUserActivityLogAsync_ReturnsLogs()
    {
        // Arrange
        var log1 = new UserActivityLog
        {
            UserId = _testUserId,
            ActivityType = "Login",
            Description = "User logged in",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };
        var log2 = new UserActivityLog
        {
            UserId = _testUserId,
            ActivityType = "ProfileUpdated",
            Description = "User updated profile",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _context.UserActivityLogs.AddRange(log1, log2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserActivityLogAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        var logs = result.ToList();
        Assert.Equal(2, logs.Count);
        Assert.Equal("ProfileUpdated", logs[0].ActivityType); // Most recent first
        Assert.Equal("Login", logs[1].ActivityType);
    }

    [Fact]
    public async Task GetUserActivityLogAsync_Pagination_WorksCorrectly()
    {
        // Arrange - Create 10 logs
        for (int i = 0; i < 10; i++)
        {
            _context.UserActivityLogs.Add(new UserActivityLog
            {
                UserId = _testUserId,
                ActivityType = $"Activity{i}",
                CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act - Skip 3, take 4
        var result = await _service.GetUserActivityLogAsync(_testUserId, skip: 3, take: 4);

        // Assert
        var logs = result.ToList();
        Assert.Equal(4, logs.Count);
    }

    [Fact]
    public async Task GetUserActivityLogAsync_LimitMaximumTake_EnforcesLimit()
    {
        // Arrange - Create 150 logs
        for (int i = 0; i < 150; i++)
        {
            _context.UserActivityLogs.Add(new UserActivityLog
            {
                UserId = _testUserId,
                ActivityType = $"Activity{i}",
                CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act - Request 200, should get max 100
        var result = await _service.GetUserActivityLogAsync(_testUserId, skip: 0, take: 200);

        // Assert
        var logs = result.ToList();
        Assert.Equal(100, logs.Count); // Maximum enforced
    }

    [Fact]
    public async Task LogUserActivityAsync_CreatesLog()
    {
        // Act
        await _service.LogUserActivityAsync(
            _testUserId,
            "TestActivity",
            "Test description",
            "192.168.1.1",
            "Mozilla/5.0");

        // Assert
        var log = await _context.UserActivityLogs
            .FirstOrDefaultAsync(al => al.UserId == _testUserId && al.ActivityType == "TestActivity");
        Assert.NotNull(log);
        Assert.Equal("Test description", log.Description);
        Assert.Equal("192.168.1.1", log.IpAddress);
        Assert.Equal("Mozilla/5.0", log.UserAgent);
    }

    #endregion

    #region Social Account Management Tests

    [Fact]
    public async Task GetConnectedSocialAccountsAsync_GoogleConnected_ReturnsGoogle()
    {
        // Arrange
        _testUser.GoogleId = "google123";
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetConnectedSocialAccountsAsync(_testUserId);

        // Assert
        var accounts = result.ToList();
        Assert.Single(accounts);
        Assert.Equal("Google", accounts[0].Provider);
        Assert.True(accounts[0].IsConnected);
    }

    [Fact]
    public async Task GetConnectedSocialAccountsAsync_AppleConnected_ReturnsApple()
    {
        // Arrange
        _testUser.AppleId = "apple456";
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetConnectedSocialAccountsAsync(_testUserId);

        // Assert
        var accounts = result.ToList();
        Assert.Single(accounts);
        Assert.Equal("Apple", accounts[0].Provider);
        Assert.True(accounts[0].IsConnected);
    }

    [Fact]
    public async Task GetConnectedSocialAccountsAsync_BothConnected_ReturnsBoth()
    {
        // Arrange
        _testUser.GoogleId = "google123";
        _testUser.AppleId = "apple456";
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetConnectedSocialAccountsAsync(_testUserId);

        // Assert
        var accounts = result.ToList();
        Assert.Equal(2, accounts.Count);
        Assert.Contains(accounts, a => a.Provider == "Google");
        Assert.Contains(accounts, a => a.Provider == "Apple");
    }

    [Fact]
    public async Task GetConnectedSocialAccountsAsync_NoAccounts_ReturnsEmpty()
    {
        // Act
        var result = await _service.GetConnectedSocialAccountsAsync(_testUserId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task DisconnectSocialAccountAsync_ValidPassword_DisconnectsGoogle()
    {
        // Arrange
        _testUser.GoogleId = "google123";
        await _context.SaveChangesAsync();

        var disconnectDto = new DisconnectSocialAccountDto
        {
            Provider = "Google",
            Password = "ValidPassword123!"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, disconnectDto.Password))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.HasPasswordAsync(_testUser))
            .ReturnsAsync(true);

        // Act
        var result = await _service.DisconnectSocialAccountAsync(_testUserId, disconnectDto);

        // Assert
        Assert.True(result);
        Assert.Null(_testUser.GoogleId);
        Assert.NotNull(_testUser.ModifiedAt);
    }

    [Fact]
    public async Task DisconnectSocialAccountAsync_ValidPassword_DisconnectsApple()
    {
        // Arrange
        _testUser.AppleId = "apple456";
        await _context.SaveChangesAsync();

        var disconnectDto = new DisconnectSocialAccountDto
        {
            Provider = "Apple",
            Password = "ValidPassword123!"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, disconnectDto.Password))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.HasPasswordAsync(_testUser))
            .ReturnsAsync(true);

        // Act
        var result = await _service.DisconnectSocialAccountAsync(_testUserId, disconnectDto);

        // Assert
        Assert.True(result);
        Assert.Null(_testUser.AppleId);
    }

    [Fact]
    public async Task DisconnectSocialAccountAsync_InvalidPassword_ReturnsFalse()
    {
        // Arrange
        _testUser.GoogleId = "google123";
        await _context.SaveChangesAsync();

        var disconnectDto = new DisconnectSocialAccountDto
        {
            Provider = "Google",
            Password = "WrongPassword"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, disconnectDto.Password))
            .ReturnsAsync(false);

        // Act
        var result = await _service.DisconnectSocialAccountAsync(_testUserId, disconnectDto);

        // Assert
        Assert.False(result);
        Assert.Equal("google123", _testUser.GoogleId); // Unchanged
    }

    [Fact]
    public async Task DisconnectSocialAccountAsync_LastAuthMethod_ThrowsException()
    {
        // Arrange - Only Google, no password
        _testUser.GoogleId = "google123";
        await _context.SaveChangesAsync();

        var disconnectDto = new DisconnectSocialAccountDto
        {
            Provider = "Google",
            Password = "ValidPassword123!"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, disconnectDto.Password))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.HasPasswordAsync(_testUser))
            .ReturnsAsync(false); // No password set

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.DisconnectSocialAccountAsync(_testUserId, disconnectDto));
        Assert.Contains("Cannot disconnect the last authentication method", exception.Message);
    }

    [Fact]
    public async Task DisconnectSocialAccountAsync_LogsActivity()
    {
        // Arrange
        _testUser.GoogleId = "google123";
        _testUser.AppleId = "apple456"; // Has another account
        await _context.SaveChangesAsync();

        var disconnectDto = new DisconnectSocialAccountDto
        {
            Provider = "Google",
            Password = "ValidPassword123!"
        };

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(_testUser, disconnectDto.Password))
            .ReturnsAsync(true);
        _mockUserManager.Setup(um => um.HasPasswordAsync(_testUser))
            .ReturnsAsync(false);

        // Act
        await _service.DisconnectSocialAccountAsync(_testUserId, disconnectDto);

        // Assert
        var activityLog = await _context.UserActivityLogs
            .FirstOrDefaultAsync(al => al.UserId == _testUserId && al.ActivityType == "SocialAccountDisconnected");
        Assert.NotNull(activityLog);
        Assert.Contains("Google", activityLog.Description);
    }

    #endregion

    #region Account Deletion Tests

    [Fact]
    public async Task DeleteAccountAsync_CleanAccount_RemovesOwnedRowsAndDeletesUser()
    {
        // Arrange
        _context.UserSessions.Add(new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "refresh-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        _context.NotificationPreferences.Add(new NotificationPreferences
        {
            UserId = _testUserId
        });
        _context.UserActivityLogs.Add(new UserActivityLog
        {
            UserId = _testUserId,
            ActivityType = "Login"
        });
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.DeleteAsync(_testUser))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        await _service.DeleteAccountAsync(_testUserId);

        // Assert
        Assert.False(await _context.UserSessions.AnyAsync(session => session.UserId == _testUserId));
        Assert.False(await _context.NotificationPreferences.AnyAsync(preferences => preferences.UserId == _testUserId));
        Assert.False(await _context.UserActivityLogs.AnyAsync(activity => activity.UserId == _testUserId));
        _mockUserManager.Verify(um => um.DeleteAsync(_testUser), Times.Once);
    }

    [Fact]
    public async Task DeleteAccountAsync_WithSubscription_BlocksDeletion()
    {
        // Arrange
        _context.UserSubscriptions.Add(new UserSubscription
        {
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true
        });
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.DeleteAccountAsync(_testUserId));

        Assert.Contains("retained billing", exception.Message);
        _mockUserManager.Verify(um => um.DeleteAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAccountAsync_WhenIdentityDeleteFails_ThrowsException()
    {
        // Arrange
        _mockUserManager.Setup(um => um.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(_testUser);
        _mockUserManager.Setup(um => um.DeleteAsync(_testUser))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "delete failed" }));

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.DeleteAccountAsync(_testUserId));

        Assert.Contains("delete failed", exception.Message);
    }

    #endregion
}
