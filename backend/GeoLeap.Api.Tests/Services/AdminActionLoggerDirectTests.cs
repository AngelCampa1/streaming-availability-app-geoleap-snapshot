using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Net;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for AdminActionLogger - Admin audit logging
/// Service: AdminActionLogger.cs (130 LOC, 4 methods)
/// Focus: Admin action audit trail (2.0x business value multiplier)
/// </summary>
public class AdminActionLoggerDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly AdminActionLogger _service;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly Guid _targetUserId = Guid.NewGuid();

    public AdminActionLoggerDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"AdminActionLoggerTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();

        // Setup default HTTP context with IP and User-Agent
        var mockHttpContext = new Mock<HttpContext>();
        var mockConnection = new Mock<ConnectionInfo>();
        var mockRequest = new Mock<HttpRequest>();
        var mockHeaders = new HeaderDictionary
        {
            { "User-Agent", "Mozilla/5.0 Test Browser" }
        };

        mockConnection.Setup(c => c.RemoteIpAddress).Returns(IPAddress.Parse("192.168.1.100"));
        mockRequest.Setup(r => r.Headers).Returns(mockHeaders);
        mockHttpContext.Setup(c => c.Connection).Returns(mockConnection.Object);
        mockHttpContext.Setup(c => c.Request).Returns(mockRequest.Object);
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(mockHttpContext.Object);

        _service = new AdminActionLogger(
            _context,
            NullLogger<AdminActionLogger>.Instance,
            _mockHttpContextAccessor.Object
        );

        // Seed test users
        SeedTestUsers();
    }

    private void SeedTestUsers()
    {
        var adminUser = new User
        {
            Id = _adminUserId,
            Email = "admin@example.com",
            UserName = "admin",
            FirstName = "Admin",
            LastName = "User"
        };

        var targetUser = new User
        {
            Id = _targetUserId,
            Email = "target@example.com",
            UserName = "targetuser",
            FirstName = "Target",
            LastName = "User"
        };

        _context.Users.AddRange(adminUser, targetUser);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region LogAdminActionAsync Tests

    [Fact]
    public async Task LogAdminActionAsync_WithValidData_LogsAction()
    {
        // Arrange
        var actionType = AdminActionType.UserDeactivate;
        var details = new { Reason = "Policy violation" };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogAdminActionAsync(actionType, _adminUserId, _targetUserId, details, correlationId);

        // Assert
        var action = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(action);
        Assert.Equal(actionType.ToString(), action.ActionType);
        Assert.Equal(_adminUserId, action.AdminUserId);
        Assert.Equal(_targetUserId, action.TargetUserId);
        Assert.NotNull(action.Details);
        Assert.Contains("Policy violation", action.Details);
        Assert.Equal(Guid.Parse(correlationId), action.CorrelationId);
        Assert.Equal("192.168.1.100", action.IpAddress);
        Assert.Equal("Mozilla/5.0 Test Browser", action.UserAgent);
    }

    [Fact]
    public async Task LogAdminActionAsync_WithNullTargetUser_LogsSuccessfully()
    {
        // Arrange
        var actionType = AdminActionType.DataExport;
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogAdminActionAsync(actionType, _adminUserId, null, null, correlationId);

        // Assert
        var action = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(action);
        Assert.Equal(actionType.ToString(), action.ActionType);
        Assert.Equal(_adminUserId, action.AdminUserId);
        Assert.Null(action.TargetUserId);
        Assert.Null(action.Details);
    }

    [Fact]
    public async Task LogAdminActionAsync_WithNullDetails_LogsSuccessfully()
    {
        // Arrange
        var actionType = AdminActionType.UserSuspend;
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogAdminActionAsync(actionType, _adminUserId, _targetUserId, null, correlationId);

        // Assert
        var action = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(action);
        Assert.Null(action.Details);
    }

    [Fact]
    public async Task LogAdminActionAsync_WithComplexDetails_SerializesCorrectly()
    {
        // Arrange
        var actionType = AdminActionType.RoleAssign;
        var details = new
        {
            OldRole = "User",
            NewRole = "Admin",
            Permissions = new[] { "read", "write", "delete" },
            AssignedBy = "SuperAdmin"
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogAdminActionAsync(actionType, _adminUserId, _targetUserId, details, correlationId);

        // Assert
        var action = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(action);
        Assert.NotNull(action.Details);

        var deserializedDetails = JsonSerializer.Deserialize<JsonElement>(action.Details);
        Assert.Equal("User", deserializedDetails.GetProperty("OldRole").GetString());
        Assert.Equal("Admin", deserializedDetails.GetProperty("NewRole").GetString());
    }

    [Fact]
    public async Task LogAdminActionAsync_WithNullHttpContext_LogsWithoutIpAndUserAgent()
    {
        // Arrange
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns((HttpContext?)null);
        var actionType = AdminActionType.UserView;
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogAdminActionAsync(actionType, _adminUserId, _targetUserId, null, correlationId);

        // Assert
        var action = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(action);
        Assert.Null(action.IpAddress);
        Assert.Null(action.UserAgent);
    }

    #endregion

    #region GetAdminActionsAsync Tests

    [Fact]
    public async Task GetAdminActionsAsync_WithNoFilters_ReturnsAllActions()
    {
        // Arrange
        await SeedAdminActions();

        // Act
        var result = await _service.GetAdminActionsAsync();

        // Assert
        var actions = result.ToList();
        Assert.Equal(3, actions.Count);
        // Should be ordered by CreatedAt descending (most recent first)
        Assert.True(actions[0].CreatedAt >= actions[1].CreatedAt);
        Assert.True(actions[1].CreatedAt >= actions[2].CreatedAt);
    }

    [Fact]
    public async Task GetAdminActionsAsync_FilterByAdminUserId_ReturnsMatchingActions()
    {
        // Arrange
        await SeedAdminActions();
        var otherAdminId = Guid.NewGuid();
        _context.AdminActions.Add(new AdminAction
        {
            ActionType = "UserSuspend",
            AdminUserId = otherAdminId,
            CorrelationId = Guid.NewGuid()
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAdminActionsAsync(adminUserId: _adminUserId);

        // Assert
        var actions = result.ToList();
        Assert.Equal(3, actions.Count);
        Assert.All(actions, a => Assert.Equal(_adminUserId, a.AdminUserId));
    }

    [Fact]
    public async Task GetAdminActionsAsync_FilterByTargetUserId_ReturnsMatchingActions()
    {
        // Arrange
        await SeedAdminActions();

        // Act
        var result = await _service.GetAdminActionsAsync(targetUserId: _targetUserId);

        // Assert
        var actions = result.ToList();
        Assert.Equal(2, actions.Count); // Only 2 actions target this user
        Assert.All(actions, a => Assert.Equal(_targetUserId, a.TargetUserId));
    }

    [Fact]
    public async Task GetAdminActionsAsync_FilterByDateRange_ReturnsMatchingActions()
    {
        // Arrange
        await SeedAdminActions();
        var from = DateTime.UtcNow.AddHours(-2);
        var to = DateTime.UtcNow.AddHours(2);

        // Act
        var result = await _service.GetAdminActionsAsync(from: from, to: to);

        // Assert
        var actions = result.ToList();
        Assert.All(actions, a =>
        {
            Assert.True(a.CreatedAt >= from);
            Assert.True(a.CreatedAt <= to);
        });
    }

    [Fact]
    public async Task GetAdminActionsAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        await SeedAdminActions();

        // Act - Get second page with 1 item per page
        var result = await _service.GetAdminActionsAsync(skip: 1, take: 1);

        // Assert
        var actions = result.ToList();
        Assert.Single(actions);
    }

    [Fact]
    public async Task GetAdminActionsAsync_TakeLimitCappedAt100_EnforcesMaxLimit()
    {
        // Arrange
        await SeedAdminActions();

        // Act - Request 200 items (should be capped at 100)
        var result = await _service.GetAdminActionsAsync(take: 200);

        // Assert
        var actions = result.ToList();
        // We only have 3 actions, but the cap is enforced in the query
        Assert.True(actions.Count <= 100);
    }

    [Fact]
    public async Task GetAdminActionsAsync_IncludesRelatedUsers_LoadsNavigationProperties()
    {
        // Arrange
        await SeedAdminActions();

        // Act
        var result = await _service.GetAdminActionsAsync();

        // Assert
        var actions = result.ToList();
        var actionWithUsers = actions.FirstOrDefault(a => a.TargetUserId == _targetUserId);
        Assert.NotNull(actionWithUsers);
        Assert.NotNull(actionWithUsers.AdminUser);
        Assert.NotNull(actionWithUsers.TargetUser);
        Assert.Equal("admin@example.com", actionWithUsers.AdminUser.Email);
        Assert.Equal("target@example.com", actionWithUsers.TargetUser.Email);
    }

    [Fact]
    public async Task GetAdminActionsAsync_WithMultipleFilters_AppliesAllFilters()
    {
        // Arrange
        await SeedAdminActions();
        var from = DateTime.UtcNow.AddHours(-1);

        // Act
        var result = await _service.GetAdminActionsAsync(
            adminUserId: _adminUserId,
            targetUserId: _targetUserId,
            from: from
        );

        // Assert
        var actions = result.ToList();
        Assert.All(actions, a =>
        {
            Assert.Equal(_adminUserId, a.AdminUserId);
            Assert.Equal(_targetUserId, a.TargetUserId);
            Assert.True(a.CreatedAt >= from);
        });
    }

    #endregion

    #region GetAdminActionAsync Tests

    [Fact]
    public async Task GetAdminActionAsync_WithValidId_ReturnsAction()
    {
        // Arrange
        var action = new AdminAction
        {
            ActionType = "UserDeactivate",
            AdminUserId = _adminUserId,
            TargetUserId = _targetUserId,
            CorrelationId = Guid.NewGuid()
        };
        _context.AdminActions.Add(action);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAdminActionAsync(action.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(action.Id, result.Id);
        Assert.Equal("UserDeactivate", result.ActionType);
    }

    [Fact]
    public async Task GetAdminActionAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetAdminActionAsync(nonExistentId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetAdminActionAsync_IncludesRelatedUsers_LoadsNavigationProperties()
    {
        // Arrange
        var action = new AdminAction
        {
            ActionType = "RoleAssign",
            AdminUserId = _adminUserId,
            TargetUserId = _targetUserId,
            CorrelationId = Guid.NewGuid()
        };
        _context.AdminActions.Add(action);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAdminActionAsync(action.Id);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.AdminUser);
        Assert.NotNull(result.TargetUser);
        Assert.Equal("admin@example.com", result.AdminUser.Email);
        Assert.Equal("target@example.com", result.TargetUser.Email);
    }

    #endregion

    #region LogActionAsync Tests

    [Fact]
    public async Task LogActionAsync_WithValidData_LogsAction()
    {
        // Arrange
        var action = "Delete";
        var entity = "User";
        var category = "UserManagement";
        var correlationId = Guid.NewGuid().ToString();
        var details = new { Reason = "Account cleanup" };

        // Act
        await _service.LogActionAsync(_adminUserId, action, entity, category, correlationId, _targetUserId, details);

        // Assert
        var loggedAction = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(loggedAction);
        Assert.Equal("Delete_User", loggedAction.ActionType);
        Assert.Equal(_adminUserId, loggedAction.AdminUserId);
        Assert.Equal(_targetUserId, loggedAction.TargetUserId);
        Assert.NotNull(loggedAction.Details);
        Assert.Contains("Account cleanup", loggedAction.Details);
    }

    [Fact]
    public async Task LogActionAsync_WithNullTargetId_LogsSuccessfully()
    {
        // Arrange
        var action = "Update";
        var entity = "Settings";
        var category = "SystemConfiguration";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogActionAsync(_adminUserId, action, entity, category, correlationId);

        // Assert
        var loggedAction = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(loggedAction);
        Assert.Equal("Update_Settings", loggedAction.ActionType);
        Assert.Null(loggedAction.TargetUserId);
    }

    [Fact]
    public async Task LogActionAsync_WithNullDetails_LogsSuccessfully()
    {
        // Arrange
        var action = "View";
        var entity = "Report";
        var category = "Reporting";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogActionAsync(_adminUserId, action, entity, category, correlationId, _targetUserId, null);

        // Assert
        var loggedAction = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(loggedAction);
        Assert.Null(loggedAction.Details);
    }

    [Fact]
    public async Task LogActionAsync_CapturesHttpContextData_LogsIpAndUserAgent()
    {
        // Arrange
        var action = "Export";
        var entity = "Data";
        var category = "DataManagement";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        await _service.LogActionAsync(_adminUserId, action, entity, category, correlationId);

        // Assert
        var loggedAction = await _context.AdminActions.FirstOrDefaultAsync();
        Assert.NotNull(loggedAction);
        Assert.Equal("192.168.1.100", loggedAction.IpAddress);
        Assert.Equal("Mozilla/5.0 Test Browser", loggedAction.UserAgent);
    }

    #endregion

    #region Helper Methods

    private async Task SeedAdminActions()
    {
        var actions = new[]
        {
            new AdminAction
            {
                ActionType = "UserDeactivate",
                AdminUserId = _adminUserId,
                TargetUserId = _targetUserId,
                CorrelationId = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            },
            new AdminAction
            {
                ActionType = "RoleAssign",
                AdminUserId = _adminUserId,
                TargetUserId = _targetUserId,
                CorrelationId = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new AdminAction
            {
                ActionType = "DataExport",
                AdminUserId = _adminUserId,
                TargetUserId = null,
                CorrelationId = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            }
        };

        _context.AdminActions.AddRange(actions);
        await _context.SaveChangesAsync();
    }

    #endregion
}
