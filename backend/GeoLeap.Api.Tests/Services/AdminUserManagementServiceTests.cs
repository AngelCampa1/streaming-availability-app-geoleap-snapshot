using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class AdminUserManagementServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IAdminActionLogger> _mockAdminActionLogger;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<ILogger<AdminUserManagementService>> _mockLogger;
    private readonly AdminUserManagementService _service;
    private readonly Guid _adminUserId;
    private readonly Guid _testUserId;
    private User _adminUser = null!;
    private User _testUser = null!;
    private Role _testRole = null!;

    public AdminUserManagementServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"AdminUserManagementServiceTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockAdminActionLogger = new Mock<IAdminActionLogger>();
        _mockRbacService = new Mock<IRbacService>();
        _mockLogger = new Mock<ILogger<AdminUserManagementService>>();

        _service = new AdminUserManagementService(
            _context,
            _mockAdminActionLogger.Object,
            _mockRbacService.Object,
            _mockLogger.Object
        );

        _adminUserId = Guid.NewGuid();
        _testUserId = Guid.NewGuid();
    }

    public async Task InitializeAsync()
    {
        // Create admin user
        _adminUser = new User
        {
            Id = _adminUserId,
            Email = "admin@example.com",
            UserName = "admin",
            EmailConfirmed = true,
            FirstName = "Admin",
            LastName = "User",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // Create test user
        _testUser = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            UserName = "testuser",
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User",
            IsActive = true,
            IsSuspended = false,
            CreatedAt = DateTime.UtcNow
        };

        // Create test role
        _testRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "TestRole",
            Description = "Test role for testing"
        };

        _context.Users.AddRange(_adminUser, _testUser);
        _context.Roles.Add(_testRole);
        await _context.SaveChangesAsync();

        // Setup default admin action logger behavior
        _mockAdminActionLogger
            .Setup(aal => aal.LogAdminActionAsync(
                It.IsAny<AdminActionType>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid?>(),
                It.IsAny<object>(),
                It.IsAny<string>()))
            .Returns(Task.CompletedTask);
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    #region GetUsersAsync Tests

    [Fact]
    public async Task GetUsersAsync_ValidRequest_ReturnsUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Users.Count);
        Assert.Contains(result.Users, u => u.Id == _testUserId);
        Assert.Contains(result.Users, u => u.Id == _adminUserId);
    }

    [Fact]
    public async Task GetUsersAsync_SearchTermFiltering_ReturnsMatchingUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Search = "test",
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Users);
        Assert.Equal(_testUserId, result.Users[0].Id);
    }

    [Fact]
    public async Task GetUsersAsync_StatusFiltering_ReturnsFilteredUsers()
    {
        // Arrange - Suspend test user
        _testUser.IsSuspended = true;
        await _context.SaveChangesAsync();

        var request = new AdminUserListRequest
        {
            Status = nameof(UserStatus.Suspended),
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Users);
        Assert.True(result.Users[0].IsSuspended);
    }

    [Fact]
    public async Task GetUsersAsync_Pagination_ReturnsCorrectPage()
    {
        // Arrange - Add more users
        var user3 = new User
        {
            Id = Guid.NewGuid(),
            Email = "user3@example.com",
            UserName = "user3",
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user3);
        await _context.SaveChangesAsync();

        var request = new AdminUserListRequest
        {
            Page = 2,
            PageSize = 2
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.TotalCount);
        Assert.Single(result.Users); // Page 2 with PageSize 2 should return 1 user
        Assert.Equal(2, result.Page);
    }

    [Fact]
    public async Task GetUsersAsync_Sorting_OrdersCorrectly()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Page = 1,
            PageSize = 10,
            SortBy = "Email",
            SortDirection = "asc"
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Users.Count);
        Assert.Equal("admin@example.com", result.Users[0].Email);
        Assert.Equal("test@example.com", result.Users[1].Email);
    }

    #endregion

    #region GetUserDetailAsync Tests

    [Fact]
    public async Task GetUserDetailAsync_ExistingUser_ReturnsDetail()
    {
        // Act
        var result = await _service.GetUserDetailAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.Id);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test", result.FirstName);
        Assert.Equal("User", result.LastName);
        Assert.True(result.IsActive);
        Assert.False(result.IsSuspended);
    }

    [Fact]
    public async Task GetUserDetailAsync_IncludesSecurityEvents_ReturnsEvents()
    {
        // Arrange - Add security event
        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "login",
            IpAddress = "127.0.0.1",
            RiskScore = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.SecurityEvents.Add(securityEvent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserDetailAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.RecentSecurityEvents);
        Assert.Equal("login", result.RecentSecurityEvents[0].EventType);
    }

    [Fact]
    public async Task GetUserDetailAsync_NonExistentUser_ReturnsNull()
    {
        // Act
        var result = await _service.GetUserDetailAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region SuspendUserAsync Tests

    [Fact]
    public async Task SuspendUserAsync_ValidRequest_SuspendsUser()
    {
        // Arrange
        var request = new UserSuspensionRequest
        {
            UserId = _testUserId,
            Reason = "Policy violation",
            IsPermanent = false
        };

        // Act
        var result = await _service.SuspendUserAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify user was suspended
        await _context.Entry(_testUser).ReloadAsync();
        Assert.True(_testUser.IsSuspended);
        Assert.NotNull(_testUser.SuspendedAt);
        Assert.Equal("Policy violation", _testUser.SuspensionReason);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.UserSuspend,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task SuspendUserAsync_AlreadySuspended_ReturnsFalse()
    {
        // Arrange
        _testUser.IsSuspended = true;
        _testUser.SuspendedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var request = new UserSuspensionRequest
        {
            UserId = _testUserId,
            Reason = "Test"
        };

        // Act
        var result = await _service.SuspendUserAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task SuspendUserAsync_NonExistentUser_ReturnsFalse()
    {
        // Arrange
        var request = new UserSuspensionRequest
        {
            UserId = Guid.NewGuid(),
            Reason = "Test"
        };

        // Act
        var result = await _service.SuspendUserAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region UnsuspendUserAsync Tests

    [Fact]
    public async Task UnsuspendUserAsync_ValidRequest_UnsupendsUser()
    {
        // Arrange - Suspend user first
        _testUser.IsSuspended = true;
        _testUser.SuspendedAt = DateTime.UtcNow;
        _testUser.SuspensionReason = "Test reason";
        await _context.SaveChangesAsync();

        var request = new UserUnsuspensionRequest
        {
            UserId = _testUserId,
            Reason = "Appealed successfully"
        };

        // Act
        var result = await _service.UnsuspendUserAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify user was unsuspended
        await _context.Entry(_testUser).ReloadAsync();
        Assert.False(_testUser.IsSuspended);
        Assert.Null(_testUser.SuspendedAt);
        Assert.Null(_testUser.SuspensionReason);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.UserUnsuspend,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task UnsuspendUserAsync_NotSuspended_ReturnsFalse()
    {
        // Arrange
        var request = new UserUnsuspensionRequest
        {
            UserId = _testUserId,
            Reason = "Test"
        };

        // Act
        var result = await _service.UnsuspendUserAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Deactivate/Reactivate Tests

    [Fact]
    public async Task DeactivateUserAsync_ValidRequest_DeactivatesUser()
    {
        // Act
        var result = await _service.DeactivateUserAsync(_testUserId, "Account closed", _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify user was deactivated
        await _context.Entry(_testUser).ReloadAsync();
        Assert.False(_testUser.IsActive);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.UserDeactivate,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task DeactivateUserAsync_AlreadyInactive_ReturnsFalse()
    {
        // Arrange
        _testUser.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeactivateUserAsync(_testUserId, "Test", _adminUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ReactivateUserAsync_ValidRequest_ReactivatesUser()
    {
        // Arrange
        _testUser.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ReactivateUserAsync(_testUserId, "Account reopened", _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify user was reactivated
        await _context.Entry(_testUser).ReloadAsync();
        Assert.True(_testUser.IsActive);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.UserReactivate,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    #endregion

    #region Role Management Tests

    [Fact]
    public async Task AssignRoleAsync_ValidRequest_AssignsRole()
    {
        // Arrange
        var request = new RoleAssignmentRequest
        {
            UserId = _testUserId,
            RoleName = "TestRole",
            Reason = "Testing role assignment"
        };

        // Act
        var result = await _service.AssignRoleAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify role was assigned
        var userRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == _testUserId && ur.RoleId == _testRole.Id && ur.IsActive);
        Assert.NotNull(userRole);
        Assert.Equal(_adminUserId, userRole.AssignedBy);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.RoleAssign,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task AssignRoleAsync_AlreadyHasRole_ReturnsFalse()
    {
        // Arrange - Assign role first
        var userRole = new UserRole
        {
            UserId = _testUserId,
            RoleId = _testRole.Id,
            AssignedBy = _adminUserId,
            AssignedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.UserRoles.Add(userRole);
        await _context.SaveChangesAsync();

        var request = new RoleAssignmentRequest
        {
            UserId = _testUserId,
            RoleName = "TestRole",
            Reason = "Test"
        };

        // Act
        var result = await _service.AssignRoleAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RemoveRoleAsync_ValidRequest_RemovesRole()
    {
        // Arrange - Assign role first
        var userRole = new UserRole
        {
            UserId = _testUserId,
            RoleId = _testRole.Id,
            AssignedBy = _adminUserId,
            AssignedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.UserRoles.Add(userRole);
        await _context.SaveChangesAsync();

        var request = new RoleRemovalRequest
        {
            UserId = _testUserId,
            RoleName = "TestRole",
            Reason = "Testing role removal"
        };

        // Act
        var result = await _service.RemoveRoleAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify role was deactivated
        await _context.Entry(userRole).ReloadAsync();
        Assert.False(userRole.IsActive);
        Assert.NotNull(userRole.RevokedAt);
        Assert.Equal(_adminUserId, userRole.RevokedBy);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.RoleRemove,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task RemoveRoleAsync_RoleNotAssigned_ReturnsFalse()
    {
        // Arrange
        var request = new RoleRemovalRequest
        {
            UserId = _testUserId,
            RoleName = "TestRole",
            Reason = "Test"
        };

        // Act
        var result = await _service.RemoveRoleAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Impersonation Tests

    [Fact]
    public async Task StartImpersonationAsync_ValidRequest_CreatesSession()
    {
        // Arrange
        var request = new ImpersonationRequest
        {
            UserId = _testUserId,
            Reason = "Testing impersonation",
            DurationMinutes = 30
        };

        // Act
        var sessionToken = await _service.StartImpersonationAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.NotNull(sessionToken);
        Assert.NotEmpty(sessionToken);

        // Verify session was created
        var session = await _context.UserImpersonationSessions
            .FirstOrDefaultAsync(uis => uis.SessionToken == sessionToken);
        Assert.NotNull(session);
        Assert.Equal(_adminUserId, session.AdminUserId);
        Assert.Equal(_testUserId, session.ImpersonatedUserId);
        Assert.True(session.IsActive);
        Assert.Equal("Testing impersonation", session.Reason);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.UserImpersonationStart,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task StartImpersonationAsync_ReturnsSecureToken()
    {
        // Arrange
        var request = new ImpersonationRequest
        {
            UserId = _testUserId,
            Reason = "Test",
            DurationMinutes = 15
        };

        // Act
        var sessionToken = await _service.StartImpersonationAsync(request, _adminUserId, "test-correlation-id");

        // Assert - Token should be base64 encoded (32 bytes = 44 base64 chars)
        Assert.True(sessionToken.Length > 30);
    }

    [Fact]
    public async Task EndImpersonationAsync_ValidSession_EndsSession()
    {
        // Arrange - Start impersonation first
        var session = new UserImpersonationSession
        {
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _testUserId,
            SessionToken = "test-token",
            Reason = "Test",
            StartedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.UserImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.EndImpersonationAsync(session.Id, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify session was ended
        await _context.Entry(session).ReloadAsync();
        Assert.False(session.IsActive);
        Assert.NotNull(session.EndedAt);
        Assert.Equal(ImpersonationEndReason.ManualEnd.ToString(), session.EndReason);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.UserImpersonationEnd,
                _adminUserId,
                _testUserId,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task GetActiveImpersonationSessionAsync_ActiveSession_ReturnsSession()
    {
        // Arrange
        var session = new UserImpersonationSession
        {
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _testUserId,
            SessionToken = "active-test-token",
            Reason = "Test",
            StartedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.UserImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveImpersonationSessionAsync("active-test-token");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(session.Id, result.Id);
        Assert.Equal(_adminUserId, result.AdminUserId);
        Assert.Equal(_testUserId, result.ImpersonatedUserId);
        Assert.True(result.IsActive);
    }

    #endregion

    #region Bulk Actions Tests

    [Fact]
    public async Task ProcessBulkActionAsync_SuspendMultipleUsers_SuspendsAll()
    {
        // Arrange
        var user3 = new User
        {
            Id = Guid.NewGuid(),
            Email = "user3@example.com",
            UserName = "user3",
            EmailConfirmed = true,
            IsActive = true,
            IsSuspended = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user3);
        await _context.SaveChangesAsync();

        var request = new BulkUserActionRequest
        {
            UserIds = new List<Guid> { _testUserId, user3.Id },
            Action = "suspend",
            Reason = "Bulk suspension test"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify both users were suspended
        await _context.Entry(_testUser).ReloadAsync();
        await _context.Entry(user3).ReloadAsync();
        Assert.True(_testUser.IsSuspended);
        Assert.True(user3.IsSuspended);
        Assert.Equal("Bulk suspension test", _testUser.SuspensionReason);

        // Verify admin action was logged
        _mockAdminActionLogger.Verify(
            aal => aal.LogAdminActionAsync(
                AdminActionType.BulkOperation,
                _adminUserId,
                null,
                It.IsAny<object>(),
                "test-correlation-id"),
            Times.Once);
    }

    [Fact]
    public async Task ProcessBulkActionAsync_DeactivateMultipleUsers_DeactivatesAll()
    {
        // Arrange
        var user3 = new User
        {
            Id = Guid.NewGuid(),
            Email = "user3@example.com",
            UserName = "user3",
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user3);
        await _context.SaveChangesAsync();

        var request = new BulkUserActionRequest
        {
            UserIds = new List<Guid> { _testUserId, user3.Id },
            Action = "deactivate",
            Reason = "Bulk deactivation test"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify both users were deactivated
        await _context.Entry(_testUser).ReloadAsync();
        await _context.Entry(user3).ReloadAsync();
        Assert.False(_testUser.IsActive);
        Assert.False(user3.IsActive);
    }

    #endregion
}
