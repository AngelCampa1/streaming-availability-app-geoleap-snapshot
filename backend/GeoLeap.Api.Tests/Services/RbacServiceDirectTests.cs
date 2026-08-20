using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for RbacService (not via HTTP).
/// Tests role-based access control including permissions, roles, tier logic, and caching.
/// Uses in-memory database for ApplicationDbContext.
/// </summary>
public class RbacServiceDirectTests : IDisposable
{
    private readonly RbacService _service;
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<RbacService>> _loggerMock;

    // Test data IDs
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _premiumUserId = Guid.NewGuid();
    private readonly Guid _basicUserId = Guid.NewGuid();
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly Guid _userRoleId = Guid.NewGuid();
    private readonly Guid _premiumRoleId = Guid.NewGuid();
    private readonly Guid _adminRoleId = Guid.NewGuid();
    private readonly Guid _viewContentPermissionId = Guid.NewGuid();
    private readonly Guid _editContentPermissionId = Guid.NewGuid();
    private readonly Guid _adminPermissionId = Guid.NewGuid();

    public RbacServiceDirectTests()
    {
        // Create in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"RbacTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _cache = new MemoryCache(new MemoryCacheOptions());
        _loggerMock = new Mock<ILogger<RbacService>>();

        // Seed test data
        SeedTestData();

        _service = new RbacService(_context, _cache, _loggerMock.Object);
    }

    private void SeedTestData()
    {
        // Create test users
        _context.Users.AddRange(
            new User
            {
                Id = _testUserId,
                Email = "test@example.com",
                UserName = "test@example.com",
                IsActive = true
            },
            new User
            {
                Id = _premiumUserId,
                Email = "premium@example.com",
                UserName = "premium@example.com",
                IsActive = true
            },
            new User
            {
                Id = _basicUserId,
                Email = "basic@example.com",
                UserName = "basic@example.com",
                IsActive = true
            },
            new User
            {
                Id = _adminUserId,
                Email = "admin@example.com",
                UserName = "admin@example.com",
                IsActive = true
            }
        );

        // Create roles
        _context.Roles.AddRange(
            new Role
            {
                Id = _userRoleId,
                Name = "User",
                Description = "Basic user role",
                IsActive = true,
                Priority = 100
            },
            new Role
            {
                Id = _premiumRoleId,
                Name = "Premium",
                Description = "Premium subscriber role",
                IsActive = true,
                Priority = 50
            },
            new Role
            {
                Id = _adminRoleId,
                Name = "Admin",
                Description = "Administrator role",
                IsActive = true,
                Priority = 1
            }
        );

        // Create permissions
        _context.Permissions.AddRange(
            new Permission
            {
                Id = _viewContentPermissionId,
                Name = "content:view",
                Resource = "Content",
                Action = "View",
                Description = "View content",
                IsActive = true
            },
            new Permission
            {
                Id = _editContentPermissionId,
                Name = "content:edit",
                Resource = "Content",
                Action = "Edit",
                Description = "Edit content",
                IsActive = true
            },
            new Permission
            {
                Id = _adminPermissionId,
                Name = "admin:all",
                Resource = "Admin",
                Action = "All",
                Description = "Full admin access",
                IsActive = true
            }
        );

        // Assign permissions to roles
        _context.RolePermissions.AddRange(
            new RolePermission
            {
                RoleId = _userRoleId,
                PermissionId = _viewContentPermissionId,
                IsActive = true
            },
            new RolePermission
            {
                RoleId = _premiumRoleId,
                PermissionId = _viewContentPermissionId,
                IsActive = true
            },
            new RolePermission
            {
                RoleId = _premiumRoleId,
                PermissionId = _editContentPermissionId,
                IsActive = true
            },
            new RolePermission
            {
                RoleId = _adminRoleId,
                PermissionId = _adminPermissionId,
                IsActive = true
            }
        );

        // Assign roles to users
        _context.UserRoles.AddRange(
            new UserRole
            {
                UserId = _testUserId,
                RoleId = _userRoleId,
                IsActive = true,
                AssignedAt = DateTime.UtcNow
            },
            new UserRole
            {
                UserId = _premiumUserId,
                RoleId = _premiumRoleId,
                IsActive = true,
                AssignedAt = DateTime.UtcNow
            },
            new UserRole
            {
                UserId = _basicUserId,
                RoleId = _userRoleId,
                IsActive = true,
                AssignedAt = DateTime.UtcNow
            },
            new UserRole
            {
                UserId = _adminUserId,
                RoleId = _adminRoleId,
                IsActive = true,
                AssignedAt = DateTime.UtcNow
            }
        );

        // Create subscriptions
        _context.UserSubscriptions.AddRange(
            new UserSubscription
            {
                UserId = _premiumUserId,
                Tier = SubscriptionTier.Premium,
                IsActive = true,
                StartDate = DateTime.UtcNow.AddMonths(-1),
                EndDate = DateTime.UtcNow.AddMonths(1)
            },
            new UserSubscription
            {
                UserId = _basicUserId,
                Tier = SubscriptionTier.Basic,
                IsActive = true,
                StartDate = DateTime.UtcNow.AddMonths(-1),
                EndDate = DateTime.UtcNow.AddMonths(1)
            }
        );

        _context.SaveChanges();
    }

    #region HasPermissionAsync Tests

    [Fact]
    public async Task HasPermissionAsync_WithValidPermission_ReturnsTrue()
    {
        // Arrange
        var permission = "content:view";

        // Act
        var result = await _service.HasPermissionAsync(_testUserId, permission);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasPermissionAsync_WithInvalidPermission_ReturnsFalse()
    {
        // Arrange
        var permission = "content:delete";

        // Act
        var result = await _service.HasPermissionAsync(_testUserId, permission);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasPermissionAsync_WithDefaultPermission_ReturnsTrue()
    {
        // Arrange - default permissions are added for all authenticated users
        var permission = "User:ViewProfile";

        // Act
        var result = await _service.HasPermissionAsync(_testUserId, permission);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasPermissionAsync_WithPremiumPermission_ReturnsTrueForPremiumUser()
    {
        // Arrange
        var permission = "content:search:unlimited";

        // Act
        var result = await _service.HasPermissionAsync(_premiumUserId, permission);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasPermissionAsync_WithPremiumPermission_ReturnsFalseForBasicUser()
    {
        // Arrange
        var permission = "content:search:unlimited";

        // Act
        var result = await _service.HasPermissionAsync(_basicUserId, permission);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasPermissionAsync_UsesCache_OnSecondCall()
    {
        // Arrange
        var permission = "content:view";

        // Act
        var result1 = await _service.HasPermissionAsync(_testUserId, permission);
        var result2 = await _service.HasPermissionAsync(_testUserId, permission);

        // Assert
        Assert.True(result1);
        Assert.True(result2);
        // Cache should be hit on second call (verified by not hitting DB again)
    }

    [Fact]
    public async Task HasPermissionAsync_WithResourceAndAction_ReturnsTrueForValidPermission()
    {
        // Arrange
        var resource = "content";
        var action = "view";

        // Act
        var result = await _service.HasPermissionAsync(_testUserId, resource, action);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region GetUserPermissionsAsync Tests

    [Fact]
    public async Task GetUserPermissionsAsync_ReturnsAllPermissions()
    {
        // Act
        var permissions = await _service.GetUserPermissionsAsync(_testUserId);

        // Assert
        var permissionsList = permissions.ToList();
        Assert.NotEmpty(permissionsList);
        Assert.Contains("content:view", permissionsList);
        Assert.Contains("User:ViewProfile", permissionsList); // Default permission
    }

    [Fact]
    public async Task GetUserPermissionsAsync_ForPremiumUser_IncludesPremiumPermissions()
    {
        // Act
        var permissions = await _service.GetUserPermissionsAsync(_premiumUserId);

        // Assert
        var permissionsList = permissions.ToList();
        Assert.Contains("content:search:unlimited", permissionsList);
        Assert.Contains("content:streaming:urls", permissionsList);
        Assert.Contains("subscription:manage", permissionsList);
    }

    [Fact]
    public async Task GetUserPermissionsAsync_ForBasicUser_IncludesBasicPermissions()
    {
        // Act
        var permissions = await _service.GetUserPermissionsAsync(_basicUserId);

        // Assert
        var permissionsList = permissions.ToList();
        Assert.Contains("content:search:extended", permissionsList);
        Assert.Contains("subscription:manage", permissionsList);
        Assert.DoesNotContain("content:search:unlimited", permissionsList); // Premium only
    }

    #endregion

    #region GetUserRolesAsync Tests

    [Fact]
    public async Task GetUserRolesAsync_ReturnsUserRoles()
    {
        // Act
        var roles = await _service.GetUserRolesAsync(_testUserId);

        // Assert
        var rolesList = roles.ToList();
        Assert.Single(rolesList);
        Assert.Equal("User", rolesList[0].Name);
    }

    [Fact]
    public async Task GetUserRolesAsync_ReturnsRolesOrderedByPriority()
    {
        // Arrange - assign both User and Premium roles to test user
        await _service.AssignRoleAsync(_testUserId, "Premium");

        // Act
        var roles = await _service.GetUserRolesAsync(_testUserId);

        // Assert
        var rolesList = roles.ToList();
        Assert.Equal(2, rolesList.Count);
        Assert.Equal("Premium", rolesList[0].Name); // Priority 50 (lower number = higher priority)
        Assert.Equal("User", rolesList[1].Name); // Priority 100
    }

    #endregion

    #region AssignRoleAsync Tests

    [Fact]
    public async Task AssignRoleAsync_WithValidRole_AssignsSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = userId,
            Email = "newuser@example.com",
            UserName = "newuser@example.com",
            IsActive = true
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.AssignRoleAsync(userId, "User");

        // Assert
        Assert.True(result);
        var roles = await _service.GetUserRolesAsync(userId);
        Assert.Contains(roles, r => r.Name == "User");
    }

    [Fact]
    public async Task AssignRoleAsync_WithInvalidRole_ReturnsFalse()
    {
        // Act
        var result = await _service.AssignRoleAsync(_testUserId, "NonExistentRole");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task AssignRoleAsync_WhenRoleAlreadyAssigned_ReturnsTrue()
    {
        // Act - User already has User role
        var result = await _service.AssignRoleAsync(_testUserId, "User");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task AssignRoleAsync_ReactivatesInactiveRole()
    {
        // Arrange - remove role first
        await _service.RemoveRoleAsync(_testUserId, "User");

        // Act - reassign same role
        var result = await _service.AssignRoleAsync(_testUserId, "User");

        // Assert
        Assert.True(result);
        var roles = await _service.GetUserRolesAsync(_testUserId);
        Assert.Contains(roles, r => r.Name == "User");
    }

    [Fact]
    public async Task AssignRoleAsync_ClearsCacheAfterAssignment()
    {
        // Arrange - load permissions to populate cache
        await _service.GetUserPermissionsAsync(_testUserId);

        // Act
        await _service.AssignRoleAsync(_testUserId, "Premium");

        // Assert - get permissions again should reflect new role
        var permissions = await _service.GetUserPermissionsAsync(_testUserId);
        Assert.Contains("content:edit", permissions.ToList());
    }

    #endregion

    #region RemoveRoleAsync Tests

    [Fact]
    public async Task RemoveRoleAsync_WithValidRole_RemovesSuccessfully()
    {
        // Act
        var result = await _service.RemoveRoleAsync(_testUserId, "User");

        // Assert
        Assert.True(result);
        var roles = await _service.GetUserRolesAsync(_testUserId);
        Assert.DoesNotContain(roles, r => r.Name == "User");
    }

    [Fact]
    public async Task RemoveRoleAsync_WithNonExistentRole_ReturnsFalse()
    {
        // Act
        var result = await _service.RemoveRoleAsync(_testUserId, "NonExistentRole");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RemoveRoleAsync_ClearsCacheAfterRemoval()
    {
        // Arrange - load permissions to populate cache
        await _service.GetUserPermissionsAsync(_premiumUserId);

        // Act
        await _service.RemoveRoleAsync(_premiumUserId, "Premium");

        // Assert - get permissions again should not include premium permissions
        var permissions = await _service.GetUserPermissionsAsync(_premiumUserId);
        Assert.DoesNotContain("content:edit", permissions.ToList());
    }

    #endregion

    #region IsInRoleAsync Tests

    [Fact]
    public async Task IsInRoleAsync_WhenUserHasRole_ReturnsTrue()
    {
        // Act
        var result = await _service.IsInRoleAsync(_testUserId, "User");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsInRoleAsync_WhenUserDoesNotHaveRole_ReturnsFalse()
    {
        // Act
        var result = await _service.IsInRoleAsync(_testUserId, "Admin");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region LogAccessAttemptAsync Tests

    [Fact]
    public async Task LogAccessAttemptAsync_CreatesAuditLog()
    {
        // Act
        await _service.LogAccessAttemptAsync(
            _testUserId,
            "content",
            "view",
            success: true,
            details: "Test access",
            ipAddress: "127.0.0.1",
            userAgent: "TestAgent");

        // Assert
        var auditLogs = await _context.UserAuditLogs
            .Where(l => l.UserId == _testUserId && l.Resource == "content")
            .ToListAsync();
        Assert.Single(auditLogs);
        Assert.Equal("view", auditLogs[0].Action);
        Assert.True(auditLogs[0].Success);
        Assert.Equal("Test access", auditLogs[0].Details);
        Assert.Equal("127.0.0.1", auditLogs[0].IpAddress);
    }

    #endregion

    #region GetUserWithRolesAsync Tests

    [Fact]
    public async Task GetUserWithRolesAsync_ReturnsUserWithRoles()
    {
        // Act
        var user = await _service.GetUserWithRolesAsync(_testUserId);

        // Assert
        Assert.NotNull(user);
        Assert.NotNull(user.UserRoles);
        Assert.NotEmpty(user.UserRoles);
    }

    [Fact]
    public async Task GetUserWithRolesAsync_WithInvalidUserId_ReturnsNull()
    {
        // Act
        var user = await _service.GetUserWithRolesAsync(Guid.NewGuid());

        // Assert
        Assert.Null(user);
    }

    #endregion

    #region CanAccessResourceAsync Tests

    [Fact]
    public async Task CanAccessResourceAsync_WithValidPermission_ReturnsTrueAndLogsAttempt()
    {
        // Act
        var result = await _service.CanAccessResourceAsync(_testUserId, "content", "view");

        // Assert
        Assert.True(result);
        var auditLogs = await _context.UserAuditLogs
            .Where(l => l.UserId == _testUserId && l.Resource == "content" && l.Action == "view")
            .ToListAsync();
        Assert.NotEmpty(auditLogs);
    }

    #endregion

    #region SyncSubscriptionRoleAsync Tests

    [Fact]
    public async Task SyncSubscriptionRoleAsync_AssignsPremiumRoleWhenPremiumSubscriptionActive()
    {
        // Arrange - create user without premium role but with premium subscription
        var userId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = userId,
            Email = "newsub@example.com",
            UserName = "newsub@example.com",
            IsActive = true
        });
        _context.UserSubscriptions.Add(new UserSubscription
        {
            UserId = userId,
            Tier = SubscriptionTier.Premium,
            IsActive = true,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(1)
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.SyncSubscriptionRoleAsync(userId);

        // Assert
        Assert.True(result);
        var roles = await _service.GetUserRolesAsync(userId);
        Assert.Contains(roles, r => r.Name == "Premium");
    }

    [Fact]
    public async Task SyncSubscriptionRoleAsync_RemovesPremiumRoleWhenSubscriptionInactive()
    {
        // Arrange - make premium subscription inactive
        var subscription = await _context.UserSubscriptions
            .FirstAsync(s => s.UserId == _premiumUserId);
        subscription.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.SyncSubscriptionRoleAsync(_premiumUserId);

        // Assert
        Assert.True(result);
        var roles = await _service.GetUserRolesAsync(_premiumUserId);
        Assert.DoesNotContain(roles, r => r.Name == "Premium");
    }

    [Fact]
    public async Task SyncSubscriptionRoleAsync_ClearsCacheAfterSync()
    {
        // Arrange - load permissions to populate cache
        await _service.GetUserPermissionsAsync(_premiumUserId);

        // Make subscription inactive
        var subscription = await _context.UserSubscriptions
            .FirstAsync(s => s.UserId == _premiumUserId);
        subscription.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        await _service.SyncSubscriptionRoleAsync(_premiumUserId);

        // Assert - permissions should be refreshed without premium permissions
        var permissions = await _service.GetUserPermissionsAsync(_premiumUserId);
        Assert.DoesNotContain("content:search:unlimited", permissions.ToList());
    }

    #endregion

    public void Dispose()
    {
        _context?.Dispose();
        _cache?.Dispose();
    }
}
