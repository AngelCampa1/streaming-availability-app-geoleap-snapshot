using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class AdminUserManagementServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IAdminActionLogger> _mockAdminActionLogger;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<ILogger<AdminUserManagementService>> _mockLogger;
    private readonly AdminUserManagementService _service;
    private readonly Guid _adminUserId;
    private readonly Guid _testUserId;

    public AdminUserManagementServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"AdminUserMgmtTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        _mockAdminActionLogger = new Mock<IAdminActionLogger>();
        _mockRbacService = new Mock<IRbacService>();
        _mockLogger = new Mock<ILogger<AdminUserManagementService>>();

        _mockAdminActionLogger.Setup(x => x.LogAdminActionAsync(
            It.IsAny<AdminActionType>(), It.IsAny<Guid>(), It.IsAny<Guid?>(),
            It.IsAny<object>(), It.IsAny<string>())).Returns(Task.CompletedTask);

        _service = new AdminUserManagementService(
            _context,
            _mockAdminActionLogger.Object,
            _mockRbacService.Object,
            _mockLogger.Object
        );

        _adminUserId = Guid.NewGuid();
        _testUserId = Guid.NewGuid();

        SeedTestData();
    }

    private void SeedTestData()
    {
        var userRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "User",
            Description = "Standard user role"
        };

        var adminRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Admin",
            Description = "Administrator role"
        };

        _context.Roles.AddRange(userRole, adminRole);

        var users = new List<User>
        {
            new User
            {
                Id = _testUserId,
                Email = "test@example.com",
                UserName = "test@example.com",
                FirstName = "Test",
                LastName = "User",
                DisplayName = "Test User",
                IsActive = true,
                IsSuspended = false,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "suspended@example.com",
                UserName = "suspended@example.com",
                FirstName = "Suspended",
                LastName = "User",
                IsActive = true,
                IsSuspended = true,
                SuspendedAt = DateTime.UtcNow.AddDays(-5),
                SuspensionReason = "Policy violation",
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow.AddDays(-60)
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "inactive@example.com",
                UserName = "inactive@example.com",
                FirstName = "Inactive",
                LastName = "User",
                IsActive = false,
                IsSuspended = false,
                EmailConfirmed = false,
                CreatedAt = DateTime.UtcNow.AddDays(-90)
            },
            new User
            {
                Id = _adminUserId,
                Email = "admin@example.com",
                UserName = "admin@example.com",
                FirstName = "Admin",
                LastName = "User",
                IsActive = true,
                IsSuspended = false,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow.AddDays(-180)
            }
        };

        _context.Users.AddRange(users);

        // Assign roles
        var userRoleAssignment = new UserRole
        {
            UserId = _testUserId,
            RoleId = userRole.Id,
            AssignedBy = _adminUserId,
            AssignedAt = DateTime.UtcNow.AddDays(-30),
            IsActive = true
        };

        var adminRoleAssignment = new UserRole
        {
            UserId = _adminUserId,
            RoleId = adminRole.Id,
            AssignedBy = _adminUserId,
            AssignedAt = DateTime.UtcNow.AddDays(-180),
            IsActive = true
        };

        _context.UserRoles.AddRange(userRoleAssignment, adminRoleAssignment);

        // Add security events
        var securityEvent = new SecurityEvent
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            IpAddress = "192.168.1.1",
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            RiskScore = 10
        };

        _context.SecurityEvents.Add(securityEvent);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    #region GetUsersAsync Tests

    [Fact]
    public async Task GetUsersAsync_WithNoFilters_ReturnsAllUsers()
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
        Assert.Equal(4, result.TotalCount);
        Assert.Equal(4, result.Users.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
    }

    [Fact]
    public async Task GetUsersAsync_WithSearchTerm_FiltersUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Search = "Suspended",
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Users);
        Assert.Equal("suspended@example.com", result.Users[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_WithEmailFilter_ReturnsMatchingUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Email = "test@",
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.Equal("test@example.com", result.Users[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_WithIsSuspendedFilter_ReturnsOnlySuspendedUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            IsSuspended = true,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.True(result.Users[0].IsSuspended);
    }

    [Fact]
    public async Task GetUsersAsync_WithIsActiveFilter_ReturnsOnlyActiveUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            IsActive = true,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(3, result.TotalCount);
        Assert.All(result.Users, u => Assert.True(u.IsActive));
    }

    [Fact]
    public async Task GetUsersAsync_WithDateRange_FiltersCorrectly()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            RegisteredFrom = DateTime.UtcNow.AddDays(-100),
            RegisteredTo = DateTime.UtcNow.AddDays(-20),
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(3, result.TotalCount); // test (30d), suspended (60d) and inactive (90d)
    }

    [Fact]
    public async Task GetUsersAsync_WithRoleFilter_ReturnsUsersWithRole()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Role = "Admin",
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.Contains("Admin", result.Users[0].Roles);
    }

    [Fact]
    public async Task GetUsersAsync_WithStatusFilter_ReturnsCorrectUsers()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Status = nameof(UserStatus.Suspended),
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.True(result.Users[0].IsSuspended);
    }

    [Fact]
    public async Task GetUsersAsync_WithSorting_SortsCorrectly()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            SortBy = "email",
            SortDirection = "asc",
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal("admin@example.com", result.Users[0].Email);
        Assert.Equal("test@example.com", result.Users[^1].Email);
    }

    [Fact]
    public async Task GetUsersAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var request = new AdminUserListRequest
        {
            Page = 2,
            PageSize = 2
        };

        // Act
        var result = await _service.GetUsersAsync(request);

        // Assert
        Assert.Equal(4, result.TotalCount);
        Assert.Equal(2, result.Users.Count);
        Assert.Equal(2, result.TotalPages);
    }

    #endregion

    #region GetUserDetailAsync Tests

    [Fact]
    public async Task GetUserDetailAsync_WithValidUserId_ReturnsUserDetail()
    {
        // Act
        var result = await _service.GetUserDetailAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.Id);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test", result.FirstName);
        Assert.Contains("User", result.Roles);
        Assert.Single(result.RecentSecurityEvents);
    }

    [Fact]
    public async Task GetUserDetailAsync_WithNonExistentUser_ReturnsNull()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserDetailAsync(nonExistentUserId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region SuspendUserAsync Tests

    [Fact]
    public async Task SuspendUserAsync_WithValidRequest_SuspendsUser()
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

        var user = await _context.Users.FindAsync(_testUserId);
        Assert.NotNull(user);
        Assert.True(user.IsSuspended);
        Assert.NotNull(user.SuspendedAt);
        Assert.Equal("Policy violation", user.SuspensionReason);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.UserSuspend, _adminUserId, _testUserId,
            It.IsAny<object>(), "test-correlation-id"), Times.Once);
    }

    [Fact]
    public async Task SuspendUserAsync_WithAlreadySuspendedUser_ReturnsFalse()
    {
        // Arrange
        var suspendedUser = await _context.Users.FirstAsync(u => u.IsSuspended);
        var request = new UserSuspensionRequest
        {
            UserId = suspendedUser.Id,
            Reason = "Test"
        };

        // Act
        var result = await _service.SuspendUserAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task SuspendUserAsync_WithNonExistentUser_ReturnsFalse()
    {
        // Arrange
        var request = new UserSuspensionRequest
        {
            UserId = Guid.NewGuid(),
            Reason = "Test"
        };

        // Act
        var result = await _service.SuspendUserAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region UnsuspendUserAsync Tests

    [Fact]
    public async Task UnsuspendUserAsync_WithSuspendedUser_UnsuspendsUser()
    {
        // Arrange
        var suspendedUser = await _context.Users.FirstAsync(u => u.IsSuspended);
        var request = new UserUnsuspensionRequest
        {
            UserId = suspendedUser.Id,
            Reason = "Appeal approved"
        };

        // Act
        var result = await _service.UnsuspendUserAsync(request, _adminUserId, "test-correlation-id");

        // Assert
        Assert.True(result);

        var user = await _context.Users.FindAsync(suspendedUser.Id);
        Assert.NotNull(user);
        Assert.False(user.IsSuspended);
        Assert.Null(user.SuspendedAt);
        Assert.Null(user.SuspensionReason);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.UserUnsuspend, _adminUserId, suspendedUser.Id,
            It.IsAny<object>(), "test-correlation-id"), Times.Once);
    }

    [Fact]
    public async Task UnsuspendUserAsync_WithNonSuspendedUser_ReturnsFalse()
    {
        // Arrange
        var request = new UserUnsuspensionRequest
        {
            UserId = _testUserId,
            Reason = "Test"
        };

        // Act
        var result = await _service.UnsuspendUserAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region DeactivateUserAsync Tests

    [Fact]
    public async Task DeactivateUserAsync_WithActiveUser_DeactivatesUser()
    {
        // Act
        var result = await _service.DeactivateUserAsync(_testUserId, "Account closed by user", _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var user = await _context.Users.FindAsync(_testUserId);
        Assert.NotNull(user);
        Assert.False(user.IsActive);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.UserDeactivate, _adminUserId, _testUserId,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task DeactivateUserAsync_WithInactiveUser_ReturnsFalse()
    {
        // Arrange
        var inactiveUser = await _context.Users.FirstAsync(u => !u.IsActive);

        // Act
        var result = await _service.DeactivateUserAsync(inactiveUser.Id, "Test", _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeactivateUserAsync_WithNonExistentUser_ReturnsFalse()
    {
        // Act
        var result = await _service.DeactivateUserAsync(Guid.NewGuid(), "Test", _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region ReactivateUserAsync Tests

    [Fact]
    public async Task ReactivateUserAsync_WithInactiveUser_ReactivatesUser()
    {
        // Arrange
        var inactiveUser = await _context.Users.FirstAsync(u => !u.IsActive);

        // Act
        var result = await _service.ReactivateUserAsync(inactiveUser.Id, "Account restored", _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var user = await _context.Users.FindAsync(inactiveUser.Id);
        Assert.NotNull(user);
        Assert.True(user.IsActive);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.UserReactivate, _adminUserId, inactiveUser.Id,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task ReactivateUserAsync_WithActiveUser_ReturnsFalse()
    {
        // Act
        var result = await _service.ReactivateUserAsync(_testUserId, "Test", _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region AssignRoleAsync Tests

    [Fact]
    public async Task AssignRoleAsync_WithValidRequest_AssignsRole()
    {
        // Arrange
        var request = new RoleAssignmentRequest
        {
            UserId = _testUserId,
            RoleName = "Admin",
            Reason = "Promotion",
            ExpiresAt = DateTime.UtcNow.AddDays(365)
        };

        // Act
        var result = await _service.AssignRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var userRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == _testUserId && ur.Role!.Name == "Admin" && ur.IsActive);
        Assert.NotNull(userRole);
        Assert.Equal(_adminUserId, userRole.AssignedBy);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.RoleAssign, _adminUserId, _testUserId,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task AssignRoleAsync_WithExistingRole_ReturnsFalse()
    {
        // Arrange
        var request = new RoleAssignmentRequest
        {
            UserId = _testUserId,
            RoleName = "User", // Already assigned
            Reason = "Test"
        };

        // Act
        var result = await _service.AssignRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AssignRoleAsync_WithNonExistentRole_ReturnsFalse()
    {
        // Arrange
        var request = new RoleAssignmentRequest
        {
            UserId = _testUserId,
            RoleName = "NonExistentRole",
            Reason = "Test"
        };

        // Act
        var result = await _service.AssignRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AssignRoleAsync_WithNonExistentUser_ReturnsFalse()
    {
        // Arrange
        var request = new RoleAssignmentRequest
        {
            UserId = Guid.NewGuid(),
            RoleName = "Admin",
            Reason = "Test"
        };

        // Act
        var result = await _service.AssignRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region RemoveRoleAsync Tests

    [Fact]
    public async Task RemoveRoleAsync_WithValidRequest_RemovesRole()
    {
        // Arrange
        var request = new RoleRemovalRequest
        {
            UserId = _testUserId,
            RoleName = "User",
            Reason = "Demotion"
        };

        // Act
        var result = await _service.RemoveRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var userRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == _testUserId && ur.Role!.Name == "User");
        Assert.NotNull(userRole);
        Assert.False(userRole.IsActive);
        Assert.NotNull(userRole.RevokedAt);
        Assert.Equal(_adminUserId, userRole.RevokedBy);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.RoleRemove, _adminUserId, _testUserId,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task RemoveRoleAsync_WithNonExistentRole_ReturnsFalse()
    {
        // Arrange
        var request = new RoleRemovalRequest
        {
            UserId = _testUserId,
            RoleName = "NonExistentRole",
            Reason = "Test"
        };

        // Act
        var result = await _service.RemoveRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RemoveRoleAsync_WithUserNotHavingRole_ReturnsFalse()
    {
        // Arrange
        var request = new RoleRemovalRequest
        {
            UserId = _testUserId,
            RoleName = "Admin", // User doesn't have this role
            Reason = "Test"
        };

        // Act
        var result = await _service.RemoveRoleAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region StartImpersonationAsync Tests

    [Fact]
    public async Task StartImpersonationAsync_WithValidRequest_CreatesSession()
    {
        // Arrange
        var request = new ImpersonationRequest
        {
            UserId = _testUserId,
            Reason = "Customer support",
            DurationMinutes = 30
        };

        // Act
        var sessionToken = await _service.StartImpersonationAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.NotNull(sessionToken);
        Assert.NotEmpty(sessionToken);

        var session = await _context.UserImpersonationSessions
            .FirstOrDefaultAsync(s => s.SessionToken == sessionToken);
        Assert.NotNull(session);
        Assert.Equal(_adminUserId, session.AdminUserId);
        Assert.Equal(_testUserId, session.ImpersonatedUserId);
        Assert.True(session.IsActive);
        Assert.Equal("Customer support", session.Reason);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.UserImpersonationStart, _adminUserId, _testUserId,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task StartImpersonationAsync_WithNonExistentUser_ThrowsException()
    {
        // Arrange
        var request = new ImpersonationRequest
        {
            UserId = Guid.NewGuid(),
            Reason = "Test"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.StartImpersonationAsync(request, _adminUserId, "test-id"));
    }

    #endregion

    #region EndImpersonationAsync Tests

    [Fact]
    public async Task EndImpersonationAsync_WithActiveSession_EndsSession()
    {
        // Arrange
        var session = new UserImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _testUserId,
            SessionToken = "test-session-token",
            Reason = "Support",
            StartedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.UserImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.EndImpersonationAsync(session.Id, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var updatedSession = await _context.UserImpersonationSessions.FindAsync(session.Id);
        Assert.NotNull(updatedSession);
        Assert.False(updatedSession.IsActive);
        Assert.NotNull(updatedSession.EndedAt);
        Assert.Equal("ManualEnd", updatedSession.EndReason);

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.UserImpersonationEnd, _adminUserId, _testUserId,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task EndImpersonationAsync_WithInactiveSession_ReturnsFalse()
    {
        // Arrange
        var session = new UserImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _testUserId,
            SessionToken = "inactive-token",
            Reason = "Test reason",
            IsActive = false,
            StartedAt = DateTime.UtcNow.AddHours(-1),
            EndedAt = DateTime.UtcNow
        };
        _context.UserImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.EndImpersonationAsync(session.Id, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task EndImpersonationAsync_WithNonExistentSession_ReturnsFalse()
    {
        // Act
        var result = await _service.EndImpersonationAsync(Guid.NewGuid(), _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetActiveImpersonationSessionAsync Tests

    [Fact]
    public async Task GetActiveImpersonationSessionAsync_WithValidToken_ReturnsSession()
    {
        // Arrange
        var sessionToken = "active-session-token";
        var session = new UserImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _testUserId,
            SessionToken = sessionToken,
            Reason = "Testing",
            StartedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.UserImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveImpersonationSessionAsync(sessionToken);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(sessionToken, result.SessionToken);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetActiveImpersonationSessionAsync_WithInvalidToken_ReturnsNull()
    {
        // Act
        var result = await _service.GetActiveImpersonationSessionAsync("invalid-token");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region ProcessBulkActionAsync Tests

    [Fact]
    public async Task ProcessBulkActionAsync_WithSuspendAction_SuspendsUsers()
    {
        // Arrange
        var userIds = await _context.Users
            .Where(u => !u.IsSuspended && u.IsActive)
            .Take(2)
            .Select(u => u.Id)
            .ToListAsync();

        var request = new BulkUserActionRequest
        {
            UserIds = userIds,
            Action = "suspend",
            Reason = "Bulk suspension test"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var suspendedUsers = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToListAsync();
        Assert.All(suspendedUsers, u => Assert.True(u.IsSuspended));
        Assert.All(suspendedUsers, u => Assert.NotNull(u.SuspendedAt));

        _mockAdminActionLogger.Verify(x => x.LogAdminActionAsync(
            AdminActionType.BulkOperation, _adminUserId, null,
            It.IsAny<object>(), "test-id"), Times.Once);
    }

    [Fact]
    public async Task ProcessBulkActionAsync_WithUnsuspendAction_UnsuspendsUsers()
    {
        // Arrange
        var suspendedUserId = await _context.Users
            .Where(u => u.IsSuspended)
            .Select(u => u.Id)
            .FirstAsync();

        var request = new BulkUserActionRequest
        {
            UserIds = new List<Guid> { suspendedUserId },
            Action = "unsuspend",
            Reason = "Appeal approved"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var user = await _context.Users.FindAsync(suspendedUserId);
        Assert.NotNull(user);
        Assert.False(user.IsSuspended);
    }

    [Fact]
    public async Task ProcessBulkActionAsync_WithDeactivateAction_DeactivatesUsers()
    {
        // Arrange
        var userIds = await _context.Users
            .Where(u => u.IsActive)
            .Take(2)
            .Select(u => u.Id)
            .ToListAsync();

        var request = new BulkUserActionRequest
        {
            UserIds = userIds,
            Action = "deactivate",
            Reason = "Account cleanup"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToListAsync();
        Assert.All(users, u => Assert.False(u.IsActive));
    }

    [Fact]
    public async Task ProcessBulkActionAsync_WithReactivateAction_ReactivatesUsers()
    {
        // Arrange
        var inactiveUserId = await _context.Users
            .Where(u => !u.IsActive)
            .Select(u => u.Id)
            .FirstAsync();

        var request = new BulkUserActionRequest
        {
            UserIds = new List<Guid> { inactiveUserId },
            Action = "reactivate",
            Reason = "Account restored"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.True(result);

        var user = await _context.Users.FindAsync(inactiveUserId);
        Assert.NotNull(user);
        Assert.True(user.IsActive);
    }

    [Fact]
    public async Task ProcessBulkActionAsync_WithEmptyUserList_ReturnsFalse()
    {
        // Arrange
        var request = new BulkUserActionRequest
        {
            UserIds = new List<Guid>(),
            Action = "suspend",
            Reason = "Test"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ProcessBulkActionAsync_WithNonExistentUsers_ReturnsFalse()
    {
        // Arrange
        var request = new BulkUserActionRequest
        {
            UserIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() },
            Action = "suspend",
            Reason = "Test"
        };

        // Act
        var result = await _service.ProcessBulkActionAsync(request, _adminUserId, "test-id");

        // Assert
        Assert.False(result);
    }

    #endregion
}
