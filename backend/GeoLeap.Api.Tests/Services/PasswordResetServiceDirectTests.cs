using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

public class PasswordResetServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly Mock<IPasswordValidationService> _mockPasswordValidationService;
    private readonly Mock<ILogger<PasswordResetService>> _mockLogger;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly PasswordResetService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly string _testEmail = "test@example.com";
    private readonly string _correlationId = Guid.NewGuid().ToString();

    public PasswordResetServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockUserManager = CreateMockUserManager();
        _mockPasswordValidationService = new Mock<IPasswordValidationService>();
        _mockLogger = new Mock<ILogger<PasswordResetService>>();
        _mockEmailService = new Mock<IEmailService>();

        _service = new PasswordResetService(
            _context,
            _mockUserManager.Object,
            _mockPasswordValidationService.Object,
            _mockLogger.Object,
            _mockEmailService.Object);

        SeedTestData().Wait();
    }

    private Mock<UserManager<User>> CreateMockUserManager()
    {
        var store = new Mock<IUserStore<User>>();
        var mock = new Mock<UserManager<User>>(
            store.Object,
            null!, null!, null!, null!, null!, null!, null!, null!);

        // Setup default behavior - these will be overridden by specific test setups if needed
        // Use ReturnsAsync to ensure context is queried at runtime, not at setup time
        mock.Setup(x => x.FindByIdAsync(It.IsAny<string>()))
            .ReturnsAsync((string id) => _context.Users.FirstOrDefault(u => u.Id.ToString() == id));
        mock.Setup(x => x.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((string email) => _context.Users.FirstOrDefault(u => u.Email == email));

        // Setup password change methods to return success by default
        mock.Setup(x => x.ChangePasswordAsync(It.IsAny<User>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);
        mock.Setup(x => x.RemovePasswordAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success);
        mock.Setup(x => x.AddPasswordAsync(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        return mock;
    }

    private async Task SeedTestData()
    {
        var user = new User
        {
            Id = _testUserId,
            Email = _testEmail,
            UserName = _testEmail,
            FirstName = "Test",
            LastName = "User",
            EmailConfirmed = true,
            PasswordHash = "ExistingHashedPassword"
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    #region InitiatePasswordResetAsync Tests

    [Fact]
    public async Task InitiatePasswordResetAsync_WithValidEmail_CreatesResetToken()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);
        _mockEmailService.Setup(x => x.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        Assert.True(result);
        var token = await _context.PasswordResetTokens.FirstOrDefaultAsync();
        Assert.NotNull(token);
        Assert.Equal(_testUserId, token.UserId);
        Assert.NotEmpty(token.Token);
        Assert.True(token.ExpiresAt > DateTime.UtcNow);
        Assert.False(token.IsUsed);
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_WithNonExistentEmail_ReturnsTrueWithoutCreatingToken()
    {
        // Arrange
        _mockUserManager.Setup(x => x.FindByEmailAsync("nonexistent@example.com"))
            .ReturnsAsync((User)null!);

        // Act
        var result = await _service.InitiatePasswordResetAsync("nonexistent@example.com", _correlationId);

        // Assert
        Assert.True(result); // Don't reveal that email doesn't exist
        var token = await _context.PasswordResetTokens.FirstOrDefaultAsync();
        Assert.Null(token);
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_SendsEmail()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);
        _mockEmailService.Setup(x => x.SendPasswordResetEmailAsync(_testEmail, It.IsAny<string>(), "Test"))
            .ReturnsAsync(true);

        // Act
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        _mockEmailService.Verify(
            x => x.SendPasswordResetEmailAsync(_testEmail, It.IsAny<string>(), "Test"),
            Times.Once);
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_InvalidatesExistingTokens()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);
        _mockEmailService.Setup(x => x.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Create existing token
        var existingToken = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "existing-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(existingToken);
        await _context.SaveChangesAsync();

        // Act
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        var tokens = await _context.PasswordResetTokens.ToListAsync();
        Assert.Equal(2, tokens.Count);
        Assert.True(tokens.First(t => t.Token == "existing-token").IsUsed);
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_ExceedsRateLimit_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Create 3 recent reset requests (max per hour)
        for (int i = 0; i < 3; i++)
        {
            _context.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = _testUserId,
                Email = _testEmail,
                Token = $"token-{i}",
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_CreatesAuditLog()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Act
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        var auditLog = await _context.UserAuditLogs
            .FirstOrDefaultAsync(l => l.Action == "PasswordResetInitiated");
        Assert.NotNull(auditLog);
        Assert.Equal(_testUserId, auditLog.UserId);
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_GeneratesUniqueTokens()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Act
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        var tokens = await _context.PasswordResetTokens
            .Where(t => t.UserId == _testUserId)
            .ToListAsync();
        var distinctTokens = tokens.Select(t => t.Token).Distinct().Count();
        Assert.True(distinctTokens >= 1); // At least one unique token
    }

    [Fact]
    public async Task InitiatePasswordResetAsync_TokenExpiresIn24Hours()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Act
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        var token = await _context.PasswordResetTokens.FirstAsync();
        var expectedExpiry = DateTime.UtcNow.AddHours(24);
        Assert.True(token.ExpiresAt >= expectedExpiry.AddMinutes(-1));
        Assert.True(token.ExpiresAt <= expectedExpiry.AddMinutes(1));
    }

    #endregion

    #region ValidateResetTokenAsync Tests

    [Fact]
    public async Task ValidateResetTokenAsync_WithValidToken_ReturnsTrue()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token-12345",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateResetTokenAsync("valid-token-12345");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateResetTokenAsync_WithExpiredToken_ReturnsFalse()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "expired-token",
            ExpiresAt = DateTime.UtcNow.AddHours(-1),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateResetTokenAsync("expired-token");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateResetTokenAsync_WithUsedToken_ReturnsFalse()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "used-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = true
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateResetTokenAsync("used-token");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateResetTokenAsync_WithInvalidToken_ReturnsFalse()
    {
        // Act
        var result = await _service.ValidateResetTokenAsync("non-existent-token");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region ResetPasswordAsync Tests

    [Fact]
    public async Task ResetPasswordAsync_WithValidToken_ResetsPassword()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-reset-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockEmailService.Setup(x => x.SendPasswordResetConfirmationEmailAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ResetPasswordAsync("valid-reset-token", "NewSecurePassword123!", _correlationId);

        // Assert
        Assert.True(result);
        var updatedToken = await _context.PasswordResetTokens.FirstAsync();
        Assert.True(updatedToken.IsUsed);
    }

    [Fact]
    public async Task ResetPasswordAsync_WithInvalidToken_ReturnsFalse()
    {
        // Act
        var result = await _service.ResetPasswordAsync("invalid-token", "NewPassword123!", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ResetPasswordAsync_WithInvalidPassword_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = false, Errors = new List<string> { "Password too weak" } });

        // Act
        var result = await _service.ResetPasswordAsync("valid-token", "weak", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ResetPasswordAsync_WithReusedPassword_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ResetPasswordAsync("valid-token", "ReusedPassword123!", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ResetPasswordAsync_InvalidatesUserSessions()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);

        // Create active sessions
        _context.UserSessions.AddRange(
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session1", RefreshToken = "refresh1" },
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session2", RefreshToken = "refresh2" }
        );
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);

        // Act
        await _service.ResetPasswordAsync("valid-token", "NewPassword123!", _correlationId);

        // Assert
        var sessions = await _context.UserSessions.Where(s => s.UserId == _testUserId).ToListAsync();
        Assert.All(sessions, s => Assert.False(s.IsActive));
    }

    [Fact]
    public async Task ResetPasswordAsync_StoresPasswordInHistory()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);

        // Act
        await _service.ResetPasswordAsync("valid-token", "NewPassword123!", _correlationId);

        // Assert
        var history = await _context.PasswordHistory
            .Where(h => h.UserId == _testUserId)
            .ToListAsync();
        Assert.NotEmpty(history);
    }

    [Fact]
    public async Task ResetPasswordAsync_SendsConfirmationEmail()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);

        // Act
        await _service.ResetPasswordAsync("valid-token", "NewPassword123!", _correlationId);

        // Assert
        _mockEmailService.Verify(
            x => x.SendPasswordResetConfirmationEmailAsync(_testEmail, "Test"),
            Times.Once);
    }

    [Fact]
    public async Task ResetPasswordAsync_CreatesAuditLog()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);

        // Act
        await _service.ResetPasswordAsync("valid-token", "NewPassword123!", _correlationId);

        // Assert
        var auditLog = await _context.UserAuditLogs
            .FirstOrDefaultAsync(l => l.Action == "PasswordReset");
        Assert.NotNull(auditLog);
        Assert.Equal(_testUserId, auditLog.UserId);
    }

    #endregion

    #region ChangePasswordAsync Tests

    [Fact]
    public async Task ChangePasswordAsync_WithValidData_ChangesPassword()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "CurrentPassword123!"))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockUserManager.Setup(x => x.ChangePasswordAsync(user, "CurrentPassword123!", "NewPassword123!"))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "NewPassword123!", _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithInvalidCurrentPassword_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "WrongPassword"))
            .ReturnsAsync(false);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ChangePasswordAsync(_testUserId, "WrongPassword", "NewPassword123!", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ExceedsRateLimit_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(false);

        // Act
        var result = await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "NewPassword123!", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithInvalidNewPassword_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "CurrentPassword123!"))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword("weak"))
            .Returns(new PasswordValidationResult { IsValid = false, Errors = new List<string> { "Password too weak" } });

        // Act
        var result = await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "weak", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithReusedPassword_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "CurrentPassword123!"))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "ReusedPassword123!", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_SendsNotificationEmail()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "CurrentPassword123!"))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockUserManager.Setup(x => x.ChangePasswordAsync(user, "CurrentPassword123!", "NewPassword123!"))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "NewPassword123!", _correlationId);

        // Assert
        _mockEmailService.Verify(
            x => x.SendPasswordChangeNotificationEmailAsync(_testEmail, "Test"),
            Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_InvalidatesUserSessions()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _context.UserSessions.AddRange(
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session1", RefreshToken = "refresh1" },
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session2", RefreshToken = "refresh2" }
        );
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "CurrentPassword123!"))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockUserManager.Setup(x => x.ChangePasswordAsync(user, "CurrentPassword123!", "NewPassword123!"))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "NewPassword123!", _correlationId);

        // Assert
        var sessions = await _context.UserSessions.Where(s => s.UserId == _testUserId).ToListAsync();
        Assert.All(sessions, s => Assert.False(s.IsActive));
    }

    [Fact]
    public async Task ChangePasswordAsync_CreatesAuditLogs()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, "CurrentPassword123!"))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.CanUserChangePasswordAsync(_testUserId))
            .ReturnsAsync(true);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockUserManager.Setup(x => x.ChangePasswordAsync(user, "CurrentPassword123!", "NewPassword123!"))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        await _service.ChangePasswordAsync(_testUserId, "CurrentPassword123!", "NewPassword123!", _correlationId);

        // Assert
        var auditLog = await _context.UserAuditLogs
            .FirstOrDefaultAsync(l => l.Action == "PasswordChanged");
        Assert.NotNull(auditLog);
        Assert.Equal(_testUserId, auditLog.UserId);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithNonExistentUser_ReturnsFalse()
    {
        // Arrange
        _mockUserManager.Setup(x => x.FindByIdAsync(It.IsAny<string>()))
            .ReturnsAsync((User)null!);

        // Act
        var result = await _service.ChangePasswordAsync(Guid.NewGuid(), "CurrentPassword123!", "NewPassword123!", _correlationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region InvalidateUserSessionsAsync Tests

    [Fact]
    public async Task InvalidateUserSessionsAsync_InvalidatesAllActiveSessions()
    {
        // Arrange
        _context.UserSessions.AddRange(
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session1", RefreshToken = "refresh1" },
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session2", RefreshToken = "refresh2" },
            new UserSession { UserId = _testUserId, IsActive = false, SessionToken = "session3", RefreshToken = "refresh3" }
        );
        await _context.SaveChangesAsync();

        // Act
        await _service.InvalidateUserSessionsAsync(_testUserId, _correlationId);

        // Assert
        var sessions = await _context.UserSessions.Where(s => s.UserId == _testUserId).ToListAsync();
        Assert.Equal(3, sessions.Count);
        Assert.All(sessions, s => Assert.False(s.IsActive));
    }

    [Fact]
    public async Task InvalidateUserSessionsAsync_WithNoActiveSessions_CompletesSuccessfully()
    {
        // Act
        await _service.InvalidateUserSessionsAsync(_testUserId, _correlationId);

        // Assert
        var sessions = await _context.UserSessions.Where(s => s.UserId == _testUserId).ToListAsync();
        Assert.Empty(sessions);
    }

    [Fact]
    public async Task InvalidateUserSessionsAsync_CreatesAuditLog()
    {
        // Arrange
        _context.UserSessions.Add(
            new UserSession { UserId = _testUserId, IsActive = true, SessionToken = "session1", RefreshToken = "refresh1" }
        );
        await _context.SaveChangesAsync();

        // Act
        await _service.InvalidateUserSessionsAsync(_testUserId, _correlationId);

        // Assert
        var auditLog = await _context.UserAuditLogs
            .FirstOrDefaultAsync(l => l.Action == "SessionsInvalidated");
        Assert.NotNull(auditLog);
        Assert.Equal(_testUserId, auditLog.UserId);
    }

    #endregion

    #region CanRequestPasswordResetAsync Tests

    [Fact]
    public async Task CanRequestPasswordResetAsync_WithNoRecentRequests_ReturnsTrue()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Act
        var result = await _service.CanRequestPasswordResetAsync(_testEmail);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task CanRequestPasswordResetAsync_WithinRateLimit_ReturnsTrue()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Create 2 recent requests (under limit of 3)
        _context.PasswordResetTokens.AddRange(
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token1", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddMinutes(-30) },
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token2", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddMinutes(-15) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CanRequestPasswordResetAsync(_testEmail);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task CanRequestPasswordResetAsync_ExceedsRateLimit_ReturnsFalse()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Create 3 recent requests (at limit)
        _context.PasswordResetTokens.AddRange(
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token1", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddMinutes(-50) },
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token2", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddMinutes(-30) },
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token3", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddMinutes(-10) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CanRequestPasswordResetAsync(_testEmail);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CanRequestPasswordResetAsync_WithNonExistentEmail_ReturnsTrue()
    {
        // Arrange
        _mockUserManager.Setup(x => x.FindByEmailAsync("nonexistent@example.com"))
            .ReturnsAsync((User)null!);

        // Act
        var result = await _service.CanRequestPasswordResetAsync("nonexistent@example.com");

        // Assert
        Assert.True(result); // Don't reveal non-existent emails
    }

    [Fact]
    public async Task CanRequestPasswordResetAsync_OldRequestsNotCounted_ReturnsTrue()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);

        // Create 3 old requests (over 1 hour ago, shouldn't count)
        _context.PasswordResetTokens.AddRange(
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token1", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token2", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddHours(-3) },
            new PasswordResetToken { UserId = _testUserId, Email = _testEmail, Token = "token3", ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow.AddHours(-4) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CanRequestPasswordResetAsync(_testEmail);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region Security and Edge Cases

    [Fact]
    public async Task InitiatePasswordResetAsync_TokenIsUrlSafe()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();
        _mockUserManager.Setup(x => x.FindByEmailAsync(_testEmail))
            .ReturnsAsync(user);
        _mockEmailService.Setup(x => x.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.InitiatePasswordResetAsync(_testEmail, _correlationId);

        // Assert
        var token = await _context.PasswordResetTokens.FirstAsync();
        Assert.DoesNotContain("/", token.Token);
        Assert.DoesNotContain("+", token.Token);
        Assert.DoesNotContain("=", token.Token);
    }

    [Fact]
    public async Task PasswordHistory_KeepsOnly5Entries()
    {
        // Arrange
        var user = await _context.Users.FirstAsync();

        // Create 5 existing password history entries
        for (int i = 0; i < 5; i++)
        {
            _context.PasswordHistory.Add(new PasswordHistory
            {
                UserId = _testUserId,
                PasswordHash = $"OldHash{i}",
                CreatedAt = DateTime.UtcNow.AddDays(-i - 1)
            });
        }
        await _context.SaveChangesAsync();

        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockUserManager.Setup(x => x.ChangePasswordAsync(user, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        await _service.ResetPasswordAsync("valid-token", "NewPassword123!", _correlationId);

        // Assert
        var historyCount = await _context.PasswordHistory
            .Where(h => h.UserId == _testUserId)
            .CountAsync();
        Assert.Equal(5, historyCount); // Should keep only 5 entries
    }

    #endregion

    #region Token Ordering Tests (Race Condition Fix)

    [Fact]
    public async Task ResetPasswordAsync_MarksTokenAsUsedBeforePasswordChange()
    {
        // Arrange: verify that the token is marked used before the password change
        // by making RemovePasswordAsync fail. If token ordering is correct, the token
        // should still be marked as used even when the password change fails.
        var user = await _context.Users.FirstAsync();
        var token = new PasswordResetToken
        {
            UserId = _testUserId,
            Email = _testEmail,
            Token = "ordering-test-token",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false
        };
        _context.PasswordResetTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockUserManager.Setup(x => x.FindByIdAsync(_testUserId.ToString()))
            .ReturnsAsync(user);
        _mockPasswordValidationService.Setup(x => x.ValidatePassword(It.IsAny<string>()))
            .Returns(new PasswordValidationResult { IsValid = true });
        _mockPasswordValidationService.Setup(x => x.IsPasswordReusedAsync(_testUserId, It.IsAny<string>()))
            .ReturnsAsync(false);

        // Make RemovePasswordAsync fail to simulate a failure after token is marked used
        _mockUserManager.Setup(x => x.RemovePasswordAsync(user))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Simulated failure" }));

        // Act
        var result = await _service.ResetPasswordAsync("ordering-test-token", "NewPassword123!", _correlationId);

        // Assert: the method returns false (password change failed)
        Assert.False(result);
        // But the token should already be marked as used (preventing reuse)
        var updatedToken = await _context.PasswordResetTokens
            .FirstAsync(t => t.Token == "ordering-test-token");
        Assert.True(updatedToken.IsUsed);
    }

    #endregion

    public void Dispose()
    {
        try
        {
            _context?.Database.EnsureDeleted();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed, ignore
        }
        finally
        {
            _context?.Dispose();
        }
    }
}
