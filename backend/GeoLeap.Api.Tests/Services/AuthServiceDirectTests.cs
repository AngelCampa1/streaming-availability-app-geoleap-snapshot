using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Hangfire;
using Hangfire.MemoryStorage;

namespace GeoLeap.Api.Tests.Services;

public class AuthServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IJwtTokenService> _mockJwtTokenService;
    private readonly Mock<ISessionService> _mockSessionService;
    private readonly Mock<IAccountLockoutService> _mockLockoutService;
    private readonly Mock<ISecurityService> _mockSecurityService;
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<AuthService>> _mockLogger;
    private readonly AuthService _service;

    public AuthServiceDirectTests()
    {
        // Initialize Hangfire with in-memory storage for testing
        GlobalConfiguration.Configuration.UseMemoryStorage();
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"AuthServiceTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup UserManager
        var userStore = new Mock<IUserStore<User>>();
        _userManager = new Mock<UserManager<User>>(
            userStore.Object, null, null, null, null, null, null, null, null).Object;

        // Setup SignInManager
        var contextAccessor = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        var claimsFactory = new Mock<IUserClaimsPrincipalFactory<User>>();
        _signInManager = new Mock<SignInManager<User>>(
            _userManager, contextAccessor.Object, claimsFactory.Object, null, null, null, null).Object;

        // Setup mocks
        _mockRbacService = new Mock<IRbacService>();
        _mockEmailService = new Mock<IEmailService>();
        _mockJwtTokenService = new Mock<IJwtTokenService>();
        _mockSessionService = new Mock<ISessionService>();
        _mockLockoutService = new Mock<IAccountLockoutService>();
        _mockSecurityService = new Mock<ISecurityService>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _mockLogger = new Mock<ILogger<AuthService>>();

        // Setup default mock returns
        _mockLockoutService.Setup(x => x.IsLockedOutAsync(It.IsAny<string>())).ReturnsAsync(false);
        _mockLockoutService.Setup(x => x.ClearFailedAttemptsAsync(It.IsAny<string>())).Returns(Task.CompletedTask);
        _mockRbacService.Setup(x => x.LogAccessAttemptAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);
        _mockRbacService.Setup(x => x.AssignRoleAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<Guid?>())).ReturnsAsync(true);
        _mockSecurityService.Setup(x => x.LogSecurityEventAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>())).Returns(Task.FromResult(new SecurityEvent()));
        _mockEmailService.Setup(x => x.SendWelcomeEmailAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);
        _mockJwtTokenService.Setup(x => x.GenerateAccessToken(It.IsAny<System.Security.Claims.ClaimsIdentity>(), It.IsAny<bool>()))
            .Returns("access_token");
        _mockJwtTokenService.Setup(x => x.GenerateRefreshToken()).Returns("refresh_token");
        _mockJwtTokenService.Setup(x => x.GetTokenExpiration(It.IsAny<string>())).Returns(DateTime.UtcNow.AddHours(1));

        _service = new AuthService(
            _userManager,
            _signInManager,
            _context,
            _mockRbacService.Object,
            _mockEmailService.Object,
            _mockJwtTokenService.Object,
            _mockSessionService.Object,
            _mockLockoutService.Object,
            _mockSecurityService.Object,
            _cache,
            _mockLogger.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        _cache.Dispose();
        GC.SuppressFinalize(this);
    }

    #region RegisterAsync Tests

    [Fact]
    public async Task RegisterAsync_WithValidData_CreatesUser()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = "newuser@test.com",
            Password = "Password123!",
            FirstName = "New",
            LastName = "User"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(registerDto.Email)).ReturnsAsync((User?)null);
        userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), registerDto.Password))
            .ReturnsAsync(IdentityResult.Success)
            .Callback<User, string>((user, pwd) =>
            {
                user.Id = Guid.NewGuid();
                _context.Users.Add(user);
                _context.SaveChanges();
            });

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.RegisterAsync(registerDto, "127.0.0.1", "test-agent");

        // Assert
        Assert.True(result.Success);
        Assert.Equal("Registration successful. You can now log in to your account.", result.Message);
        Assert.NotNull(result.User);
        Assert.Equal(registerDto.Email, result.User.Email);
        Assert.True(result.User.EmailConfirmed); // Auto-verified
        _mockRbacService.Verify(x => x.AssignRoleAsync(It.IsAny<Guid>(), "User", It.IsAny<Guid?>()), Times.Once);
        _mockSecurityService.Verify(x => x.LogSecurityEventAsync(It.IsAny<Guid>(), "REGISTRATION_SUCCESS",
            "127.0.0.1", "test-agent", It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ReturnsError()
    {
        // Arrange
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "existing@test.com",
            UserName = "existing@test.com",
            FirstName = "Existing",
            LastName = "User"
        };
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        var registerDto = new RegisterDto
        {
            Email = "existing@test.com",
            Password = "Password123!",
            FirstName = "New",
            LastName = "User"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);
        userManagerMock.Setup(x => x.FindByEmailAsync(registerDto.Email)).ReturnsAsync(existingUser);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.RegisterAsync(registerDto);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("An account with this email already exists.", result.Message);
        Assert.Contains("Email already in use", result.Errors);
    }

    [Fact]
    public async Task RegisterAsync_WithInvalidPassword_ReturnsValidationErrors()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = "newuser@test.com",
            Password = "weak",
            FirstName = "New",
            LastName = "User"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(registerDto.Email)).ReturnsAsync((User?)null);
        userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), registerDto.Password))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Password too weak" }));

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.RegisterAsync(registerDto);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Password too weak", result.Errors);
    }

    #endregion

    #region LoginAsync Tests

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsTokens()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Test",
            LastName = "User",
            IsActive = true,
            EmailConfirmed = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginDto = new LoginDto
        {
            Email = "user@test.com",
            Password = "Password123!",
            RememberMe = false
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(loginDto.Email)).ReturnsAsync(user);
        userManagerMock.Setup(x => x.CheckPasswordAsync(user, loginDto.Password)).ReturnsAsync(true);
        userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });
        userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RefreshToken = "refresh_token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _mockSessionService.Setup(x => x.CreateSessionAsync(user.Id, It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(session);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.LoginAsync(loginDto, "127.0.0.1", "test-agent", "web-browser");

        // Assert
        Assert.True(result.Success);
        Assert.Equal("Login successful.", result.Message);
        Assert.NotNull(result.AccessToken);
        Assert.NotNull(result.RefreshToken);
        Assert.NotNull(result.User);
        Assert.Contains("User", result.User.Roles);
        _mockLockoutService.Verify(x => x.ClearFailedAttemptsAsync(loginDto.Email), Times.Once);
        _mockSecurityService.Verify(x => x.LogSecurityEventAsync(user.Id, "LOGIN_SUCCESS",
            "127.0.0.1", "test-agent", It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ReturnsError()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "user@test.com",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginDto = new LoginDto
        {
            Email = "user@test.com",
            Password = "WrongPassword"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(loginDto.Email)).ReturnsAsync(user);
        userManagerMock.Setup(x => x.CheckPasswordAsync(user, loginDto.Password)).ReturnsAsync(false);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.LoginAsync(loginDto, "127.0.0.1", "test-agent");

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Invalid email or password.", result.Message);
        _mockLockoutService.Verify(x => x.RecordFailedAttemptAsync(loginDto.Email), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WithLockedAccount_ReturnsLockoutError()
    {
        // Arrange
        var loginDto = new LoginDto
        {
            Email = "locked@test.com",
            Password = "Password123!"
        };

        var lockoutEnd = DateTime.UtcNow.AddMinutes(15);
        _mockLockoutService.Setup(x => x.IsLockedOutAsync(loginDto.Email)).ReturnsAsync(true);
        _mockLockoutService.Setup(x => x.GetLockoutEndAsync(loginDto.Email)).ReturnsAsync(lockoutEnd);

        // Act
        var result = await _service.LoginAsync(loginDto);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Account is locked", result.Message);
        Assert.Contains("Account locked", result.Errors);
    }

    [Fact]
    public async Task LoginAsync_WithInactiveUser_ReturnsError()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "inactive@test.com",
            UserName = "inactive@test.com",
            IsActive = false // Inactive user
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginDto = new LoginDto
        {
            Email = "inactive@test.com",
            Password = "Password123!"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);
        userManagerMock.Setup(x => x.FindByEmailAsync(loginDto.Email)).ReturnsAsync(user);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.LoginAsync(loginDto);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Invalid email or password.", result.Message);
        _mockLockoutService.Verify(x => x.RecordFailedAttemptAsync(loginDto.Email), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WithNonExistentUser_ReturnsError()
    {
        // Arrange
        var loginDto = new LoginDto
        {
            Email = "nonexistent@test.com",
            Password = "Password123!"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);
        userManagerMock.Setup(x => x.FindByEmailAsync(loginDto.Email)).ReturnsAsync((User?)null);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.LoginAsync(loginDto);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Invalid email or password.", result.Message);
        _mockLockoutService.Verify(x => x.RecordFailedAttemptAsync(loginDto.Email), Times.Once);
    }

    #endregion

    #region ExternalLoginAsync Tests

    [Fact]
    public async Task ExternalLoginAsync_WithNewUser_CreatesUserAndReturnsTokens()
    {
        // Arrange
        var provider = "Google";
        var providerUserId = "google_12345";
        var email = "newgoogle@test.com";
        var firstName = "Google";
        var lastName = "User";

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(email)).ReturnsAsync((User?)null);
        userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success)
            .Callback<User>(user =>
            {
                user.Id = Guid.NewGuid();
                _context.Users.Add(user);
                _context.SaveChanges();
            });
        userManagerMock.Setup(x => x.GetRolesAsync(It.IsAny<User>())).ReturnsAsync(new List<string> { "User" });
        userManagerMock.Setup(x => x.UpdateAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);

        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            RefreshToken = "refresh_token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _mockSessionService.Setup(x => x.CreateSessionAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(session);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.ExternalLoginAsync(provider, providerUserId, email,
            firstName, lastName, "127.0.0.1", "test-agent", "web");

        // Assert
        Assert.True(result.Success);
        Assert.Contains("Successfully authenticated with Google", result.Message);
        Assert.NotNull(result.AccessToken);
        Assert.NotNull(result.RefreshToken);
        Assert.NotNull(result.User);
        Assert.Equal(email, result.User.Email);
        _mockRbacService.Verify(x => x.AssignRoleAsync(It.IsAny<Guid>(), "User", It.IsAny<Guid?>()), Times.Once);
    }

    [Fact]
    public async Task ExternalLoginAsync_WithExistingUser_UpdatesOAuthIdAndReturnsTokens()
    {
        // Arrange
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "existing@test.com",
            UserName = "existing@test.com",
            FirstName = "Existing",
            LastName = "User",
            IsActive = true,
            GoogleId = null // No Google ID yet
        };
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        var provider = "Google";
        var providerUserId = "google_12345";

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(existingUser.Email)).ReturnsAsync(existingUser);
        userManagerMock.Setup(x => x.UpdateAsync(existingUser)).ReturnsAsync(IdentityResult.Success);
        userManagerMock.Setup(x => x.GetRolesAsync(existingUser)).ReturnsAsync(new List<string> { "User" });

        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            UserId = existingUser.Id,
            RefreshToken = "refresh_token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _mockSessionService.Setup(x => x.CreateSessionAsync(existingUser.Id, It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(session);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.ExternalLoginAsync(provider, providerUserId, existingUser.Email,
            "Google", "User", "127.0.0.1", "test-agent", "web");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.AccessToken);
        // Service calls UpdateAsync twice: once to set OAuth ID, once to update LastLoginAt
        userManagerMock.Verify(x => x.UpdateAsync(It.Is<User>(u => u.GoogleId == providerUserId)), Times.Exactly(2));
    }

    [Fact]
    public async Task ExternalLoginAsync_WithAppleProvider_SetsAppleId()
    {
        // Arrange
        var provider = "Apple";
        var providerUserId = "apple_12345";
        var email = "newapple@test.com";

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByEmailAsync(email)).ReturnsAsync((User?)null);
        userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(IdentityResult.Success)
            .Callback<User>(user =>
            {
                user.Id = Guid.NewGuid();
                _context.Users.Add(user);
                _context.SaveChanges();
            });
        userManagerMock.Setup(x => x.GetRolesAsync(It.IsAny<User>())).ReturnsAsync(new List<string> { "User" });
        userManagerMock.Setup(x => x.UpdateAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);

        var session = new GeoLeap.Api.Models.UserSession { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), RefreshToken = "refresh_token" };
        _mockSessionService.Setup(x => x.CreateSessionAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(session);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.ExternalLoginAsync(provider, providerUserId, email, "Apple", "User");

        // Assert
        Assert.True(result.Success);
        Assert.Contains("Successfully authenticated with Apple", result.Message);
    }

    #endregion

    #region GetUserInfoAsync Tests

    [Fact]
    public async Task GetUserInfoAsync_WithValidUserId_ReturnsUserInfo()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Test",
            LastName = "User",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.GetUserInfoAsync(user.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(user.Id, result.Id);
        Assert.Equal(user.Email, result.Email);
        Assert.Equal(user.FirstName, result.FirstName);
        Assert.Equal(user.LastName, result.LastName);
        Assert.Contains("User", result.Roles);
    }

    [Fact]
    public async Task GetUserInfoAsync_WithCaching_ReturnsCachedResult()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "cached@test.com",
            UserName = "cached@test.com",
            FirstName = "Cached",
            LastName = "User"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act - First call (cache miss)
        var result1 = await service.GetUserInfoAsync(user.Id);
        // Act - Second call (cache hit)
        var result2 = await service.GetUserInfoAsync(user.Id);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal(result1.Email, result2.Email);
        // UserManager.FindByIdAsync should only be called once due to caching
        userManagerMock.Verify(x => x.FindByIdAsync(user.Id.ToString()), Times.Once);
    }

    [Fact]
    public async Task GetUserInfoAsync_WithNonExistentUser_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);
        userManagerMock.Setup(x => x.FindByIdAsync(userId.ToString())).ReturnsAsync((User?)null);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.GetUserInfoAsync(userId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region RefreshTokenAsync Tests

    [Fact]
    public async Task RefreshTokenAsync_WithValidToken_ReturnsNewTokens()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Test",
            LastName = "User",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var refreshToken = "valid_refresh_token";
        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            RefreshToken = refreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _mockSessionService.Setup(x => x.GetSessionByRefreshTokenAsync(refreshToken)).ReturnsAsync(session);
        _mockSessionService.Setup(x => x.RefreshSessionAsync(refreshToken, It.IsAny<string>())).ReturnsAsync(true);

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);
        userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.RefreshTokenAsync(refreshToken, "127.0.0.1", "test-agent");

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.AccessToken);
        Assert.NotNull(result.RefreshToken);
        _mockSessionService.Verify(x => x.RefreshSessionAsync(refreshToken, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_WithExpiredToken_ReturnsNull()
    {
        // Arrange
        var refreshToken = "expired_token";
        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            RefreshToken = refreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(-1) // Expired
        };

        _mockSessionService.Setup(x => x.GetSessionByRefreshTokenAsync(refreshToken)).ReturnsAsync(session);

        // Act
        var result = await _service.RefreshTokenAsync(refreshToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_WithInactiveSession_ReturnsNull()
    {
        // Arrange
        var refreshToken = "inactive_token";
        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            RefreshToken = refreshToken,
            IsActive = false, // Inactive
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _mockSessionService.Setup(x => x.GetSessionByRefreshTokenAsync(refreshToken)).ReturnsAsync(session);

        // Act
        var result = await _service.RefreshTokenAsync(refreshToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_WithInactiveUser_RevokesSessionAndReturnsNull()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "inactive@test.com",
            IsActive = false // Inactive user
        };

        var refreshToken = "valid_token";
        var session = new GeoLeap.Api.Models.UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            RefreshToken = refreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _mockSessionService.Setup(x => x.GetSessionByRefreshTokenAsync(refreshToken)).ReturnsAsync(session);
        _mockSessionService.Setup(x => x.RevokeSessionAsync(refreshToken)).ReturnsAsync(true);

        // Act
        var result = await _service.RefreshTokenAsync(refreshToken);

        // Assert
        Assert.Null(result);
        _mockSessionService.Verify(x => x.RevokeSessionAsync(refreshToken), Times.Once);
    }

    #endregion

    #region LogoutAsync Tests

    [Fact]
    public async Task LogoutAsync_WithRefreshToken_RevokesSession()
    {
        // Arrange
        var refreshToken = "refresh_token_123";
        _mockSessionService.Setup(x => x.RevokeSessionAsync(refreshToken)).ReturnsAsync(true);

        // Act
        var result = await _service.LogoutAsync(refreshToken);

        // Assert
        Assert.True(result);
        _mockSessionService.Verify(x => x.RevokeSessionAsync(refreshToken), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_WithoutRefreshToken_ReturnsTrue()
    {
        // Act
        var result = await _service.LogoutAsync(null);

        // Assert
        Assert.True(result);
        _mockSessionService.Verify(x => x.RevokeSessionAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region LogoutAllSessionsAsync Tests

    [Fact]
    public async Task LogoutAllSessionsAsync_RevokesAllUserSessions()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockSessionService.Setup(x => x.RevokeAllUserSessionsAsync(userId)).ReturnsAsync(true);

        // Act
        var result = await _service.LogoutAllSessionsAsync(userId);

        // Assert
        Assert.True(result);
        _mockSessionService.Verify(x => x.RevokeAllUserSessionsAsync(userId), Times.Once);
        _mockRbacService.Verify(x => x.LogAccessAttemptAsync(userId, "auth", "logout-all",
            true, "All user sessions revoked", "system", "system"), Times.Once);
    }

    #endregion

    #region UpdateUserProfileAsync Tests

    [Fact]
    public async Task UpdateUserProfileAsync_WithValidData_UpdatesProfile()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Old",
            LastName = "Name"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateProfileDto
        {
            FirstName = "New",
            LastName = "Name",
            Email = "newemail@test.com"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.UpdateUserProfileAsync(user.Id, updateDto);

        // Assert
        Assert.True(result);
        userManagerMock.Verify(x => x.UpdateAsync(It.Is<User>(u =>
            u.FirstName == "New" && u.Email == "newemail@test.com")), Times.Once);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_WithNoChanges_ReturnsTrue()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "user@test.com",
            FirstName = "Test",
            LastName = "User"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateProfileDto
        {
            FirstName = "Test", // Same as existing
            LastName = "User"   // Same as existing
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.UpdateUserProfileAsync(user.Id, updateDto);

        // Assert
        Assert.True(result);
        userManagerMock.Verify(x => x.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_WithNonExistentUser_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var updateDto = new UpdateProfileDto { FirstName = "New" };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);
        userManagerMock.Setup(x => x.FindByIdAsync(userId.ToString())).ReturnsAsync((User?)null);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.UpdateUserProfileAsync(userId, updateDto);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_WithUserNameChange_UpdatesUserName()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            UserName = "oldusername"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateProfileDto
        {
            UserName = "newusername"
        };

        var userManagerMock = new Mock<UserManager<User>>(
            Mock.Of<IUserStore<User>>(), null, null, null, null, null, null, null, null);

        userManagerMock.Setup(x => x.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        var service = new AuthService(
            userManagerMock.Object, _signInManager, _context, _mockRbacService.Object,
            _mockEmailService.Object, _mockJwtTokenService.Object, _mockSessionService.Object,
            _mockLockoutService.Object, _mockSecurityService.Object, _cache, _mockLogger.Object
        );

        // Act
        var result = await service.UpdateUserProfileAsync(user.Id, updateDto);

        // Assert
        Assert.True(result);
        userManagerMock.Verify(x => x.UpdateAsync(It.Is<User>(u =>
            u.UserName == "newusername" && u.NormalizedUserName == "NEWUSERNAME")), Times.Once);
    }

    #endregion
}
