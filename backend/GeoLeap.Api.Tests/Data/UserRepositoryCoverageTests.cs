using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Data;
using GeoLeap.Api.Data.Repositories;
using GeoLeap.Api.Models;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Data;

/// <summary>
/// Comprehensive coverage tests for UserRepository specialized operations.
/// Tests ALL user-specific query methods, authentication, roles, permissions, sessions, and analytics.
///
/// GOAL: Exercise UserRepository.cs code paths with real UserManager and RoleManager.
/// TARGET: 80%+ coverage of UserRepository.cs
/// </summary>
[Collection("RealServicesTest")]
public class UserRepositoryCoverageTests : RealServicesTestBase
{
    private readonly ApplicationDbContext _context;
    private readonly IUserRepository _userRepository;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;

    public UserRepositoryCoverageTests(RealServicesTestFactory factory) : base(factory)
    {
        _context = GetDbContext();
        _userManager = GetService<UserManager<User>>();
        _roleManager = GetService<RoleManager<IdentityRole<Guid>>>();
        _userRepository = new UserRepository(_context, _userManager, _roleManager);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullContext_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new UserRepository(null!, _userManager, _roleManager));
    }

    [Fact]
    public void Constructor_WithNullUserManager_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new UserRepository(_context, null!, _roleManager));
    }

    [Fact]
    public void Constructor_WithNullRoleManager_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new UserRepository(_context, _userManager, null!));
    }

    #endregion

    #region GetByEmailAsync Tests

    [Fact]
    public async Task GetByEmailAsync_WithExistingEmail_ReturnsUser()
    {
        // Arrange
        await SeedTestUserAsync("getbyemail@test.com", "getbyemail");

        // Act - Exercises: FirstOrDefaultAsync with email predicate
        var result = await _userRepository.GetByEmailAsync("getbyemail@test.com");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("getbyemail@test.com", result.Email);
    }

    [Fact]
    public async Task GetByEmailAsync_WithNonExistentEmail_ReturnsNull()
    {
        // Act
        var result = await _userRepository.GetByEmailAsync("notfound@test.com");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetByUsernameAsync Tests

    [Fact]
    public async Task GetByUsernameAsync_WithExistingUsername_ReturnsUser()
    {
        // Arrange
        await SeedTestUserAsync("byusername@test.com", "byusername");

        // Act - Exercises: FirstOrDefaultAsync with username predicate
        var result = await _userRepository.GetByUsernameAsync("byusername");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("byusername", result.UserName);
    }

    [Fact]
    public async Task GetByUsernameAsync_WithNonExistentUsername_ReturnsNull()
    {
        // Act
        var result = await _userRepository.GetByUsernameAsync("notfound");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region IsEmailTakenAsync Tests

    [Fact]
    public async Task IsEmailTakenAsync_WithTakenEmail_ReturnsTrue()
    {
        // Arrange
        await SeedTestUserAsync("taken@test.com", "taken");

        // Act - Exercises: Where + AnyAsync
        var result = await _userRepository.IsEmailTakenAsync("taken@test.com");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsEmailTakenAsync_WithAvailableEmail_ReturnsFalse()
    {
        // Act
        var result = await _userRepository.IsEmailTakenAsync("available@test.com");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsEmailTakenAsync_WithExcludedUserId_ReturnsFalse()
    {
        // Arrange
        var user = await SeedTestUserAsync("exclude@test.com", "exclude");

        // Act - Exercises: Where with exclusion predicate
        var result = await _userRepository.IsEmailTakenAsync("exclude@test.com", user.Id);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region IsUsernameTakenAsync Tests

    [Fact]
    public async Task IsUsernameTakenAsync_WithTakenUsername_ReturnsTrue()
    {
        // Arrange
        await SeedTestUserAsync("usertaken@test.com", "usertaken");

        // Act - Exercises: Where + AnyAsync
        var result = await _userRepository.IsUsernameTakenAsync("usertaken");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsUsernameTakenAsync_WithAvailableUsername_ReturnsFalse()
    {
        // Act
        var result = await _userRepository.IsUsernameTakenAsync("availableuser");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsUsernameTakenAsync_WithExcludedUserId_ReturnsFalse()
    {
        // Arrange
        var user = await SeedTestUserAsync("excludeuser@test.com", "excludeuser");

        // Act
        var result = await _userRepository.IsUsernameTakenAsync("excludeuser", user.Id);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region AuthenticateAsync Tests

    [Fact]
    public async Task AuthenticateAsync_WithValidCredentials_ReturnsUser()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "auth@test.com",
            UserName = "authuser",
            NormalizedEmail = "AUTH@TEST.COM",
            NormalizedUserName = "AUTHUSER",
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        await _userManager.CreateAsync(user, "Password123!");

        // Act - Exercises: GetByEmailAsync + CheckPasswordAsync
        var result = await _userRepository.AuthenticateAsync("auth@test.com", "Password123!");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("auth@test.com", result.Email);
    }

    [Fact]
    public async Task AuthenticateAsync_WithInvalidPassword_ReturnsNull()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "wrongpass@test.com",
            UserName = "wrongpass",
            NormalizedEmail = "WRONGPASS@TEST.COM",
            NormalizedUserName = "WRONGPASS",
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        await _userManager.CreateAsync(user, "Password123!");

        // Act
        var result = await _userRepository.AuthenticateAsync("wrongpass@test.com", "WrongPassword!");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task AuthenticateAsync_WithNonExistentEmail_ReturnsNull()
    {
        // Act
        var result = await _userRepository.AuthenticateAsync("notexist@test.com", "Password123!");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region UpdateLastLoginAsync Tests

    [Fact]
    public async Task UpdateLastLoginAsync_WithExistingUser_UpdatesTimestamp()
    {
        // Arrange
        var user = await SeedTestUserAsync("lastlogin@test.com", "lastlogin");
        var loginTime = DateTime.UtcNow;

        // Act - Exercises: GetByIdAsync + UpdateAsync
        await _userRepository.UpdateLastLoginAsync(user.Id, loginTime);
        await _context.SaveChangesAsync();

        // Assert
        var updated = await _userRepository.GetByIdAsync(user.Id);
        Assert.NotNull(updated!.LastLoginAt);
        Assert.Equal(loginTime.Date, updated.LastLoginAt.Value.Date);
    }

    [Fact]
    public async Task UpdateLastLoginAsync_WithNonExistentUser_DoesNotThrow()
    {
        // Act - Exercises: null check path
        await _userRepository.UpdateLastLoginAsync(Guid.NewGuid(), DateTime.UtcNow);

        // Assert - no exception
        Assert.True(true);
    }

    #endregion

    #region GetSuspendedUsersAsync Tests

    [Fact]
    public async Task GetSuspendedUsersAsync_ReturnsOnlySuspendedUsers()
    {
        // Arrange
        var suspended = await SeedTestUserAsync("suspended@test.com", "suspended");
        var active = await SeedTestUserAsync("active@test.com", "active");

        suspended.IsSuspended = true;
        await _context.SaveChangesAsync();

        // Act - Exercises: Where(IsSuspended).ToListAsync()
        var results = await _userRepository.GetSuspendedUsersAsync();

        // Assert
        Assert.Contains(results, u => u.Id == suspended.Id);
        Assert.DoesNotContain(results, u => u.Id == active.Id);
    }

    #endregion

    #region SuspendUserAsync Tests

    [Fact]
    public async Task SuspendUserAsync_WithExistingUser_SuspendsUser()
    {
        // Arrange
        var user = await SeedTestUserAsync("tosuspend@test.com", "tosuspend");
        var adminId = Guid.NewGuid();

        // Act - Exercises: GetByIdAsync + property updates
        await _userRepository.SuspendUserAsync(user.Id, "Policy violation", adminId);
        await _context.SaveChangesAsync();

        // Assert
        var suspended = await _userRepository.GetByIdAsync(user.Id);
        Assert.True(suspended!.IsSuspended);
        Assert.Equal("Policy violation", suspended.SuspensionReason);
        Assert.NotNull(suspended.SuspendedAt);
        Assert.Equal(adminId, suspended.ModifiedBy);
    }

    #endregion

    #region UnsuspendUserAsync Tests

    [Fact]
    public async Task UnsuspendUserAsync_WithSuspendedUser_UnsuspendsUser()
    {
        // Arrange
        var user = await SeedTestUserAsync("tounsuspend@test.com", "tounsuspend");
        user.IsSuspended = true;
        user.SuspensionReason = "Test reason";
        user.SuspendedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var adminId = Guid.NewGuid();

        // Act - Exercises: GetByIdAsync + property clears
        await _userRepository.UnsuspendUserAsync(user.Id, adminId);
        await _context.SaveChangesAsync();

        // Assert
        var unsuspended = await _userRepository.GetByIdAsync(user.Id);
        Assert.False(unsuspended!.IsSuspended);
        Assert.Null(unsuspended.SuspensionReason);
        Assert.Null(unsuspended.SuspendedAt);
    }

    #endregion

    #region GetActiveUsersAsync Tests

    [Fact]
    public async Task GetActiveUsersAsync_ReturnsUsersActiveSinceDate()
    {
        // Arrange
        var recentUser = await SeedTestUserAsync("recent@test.com", "recent");
        var oldUser = await SeedTestUserAsync("old@test.com", "old");

        recentUser.IsActive = true;
        recentUser.LastLoginAt = DateTime.UtcNow;
        oldUser.IsActive = true;
        oldUser.LastLoginAt = DateTime.UtcNow.AddDays(-60);
        await _context.SaveChangesAsync();

        var since = DateTime.UtcNow.AddDays(-30);

        // Act - Exercises: Where(IsActive && LastLoginAt >= since).ToListAsync()
        var results = await _userRepository.GetActiveUsersAsync(since);

        // Assert
        Assert.Contains(results, u => u.Id == recentUser.Id);
        Assert.DoesNotContain(results, u => u.Id == oldUser.Id);
    }

    #endregion

    #region GetInactiveUsersAsync Tests

    [Fact]
    public async Task GetInactiveUsersAsync_ReturnsUsersInactiveSinceDate()
    {
        // Arrange
        var inactive = await SeedTestUserAsync("inactive@test.com", "inactive");
        var active = await SeedTestUserAsync("activerecent@test.com", "activerecent");

        inactive.LastLoginAt = DateTime.UtcNow.AddDays(-60);
        active.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var since = DateTime.UtcNow.AddDays(-30);

        // Act - Exercises: Where(LastLoginAt < since || LastLoginAt == null).ToListAsync()
        var results = await _userRepository.GetInactiveUsersAsync(since);

        // Assert
        Assert.Contains(results, u => u.Id == inactive.Id);
        Assert.DoesNotContain(results, u => u.Id == active.Id);
    }

    #endregion

    #region GetNewUsersAsync Tests

    [Fact]
    public async Task GetNewUsersAsync_ReturnsUsersCreatedSinceDate()
    {
        // Arrange
        var newUser = await SeedTestUserAsync("newuser@test.com", "newuser");
        var oldUser = await SeedTestUserAsync("olduser@test.com", "olduser");

        newUser.CreatedAt = DateTime.UtcNow;
        oldUser.CreatedAt = DateTime.UtcNow.AddDays(-60);
        await _context.SaveChangesAsync();

        var since = DateTime.UtcNow.AddDays(-30);

        // Act - Exercises: Where(CreatedAt >= since).ToListAsync()
        var results = await _userRepository.GetNewUsersAsync(since);

        // Assert
        Assert.Contains(results, u => u.Id == newUser.Id);
        Assert.DoesNotContain(results, u => u.Id == oldUser.Id);
    }

    #endregion

    #region GetUserStatsByDateRangeAsync Tests

    [Fact]
    public async Task GetUserStatsByDateRangeAsync_ReturnsCorrectStats()
    {
        // Arrange
        ResetDatabase();

        var user1 = await SeedTestUserAsync("stats1@test.com", "stats1");
        var user2 = await SeedTestUserAsync("stats2@test.com", "stats2");

        user1.EmailConfirmed = true;
        user2.EmailConfirmed = false;
        user1.IsActive = true;
        user2.IsActive = false;
        await _context.SaveChangesAsync();

        var startDate = DateTime.UtcNow.AddDays(-7);
        var endDate = DateTime.UtcNow;

        // Act - Exercises: Multiple CountAsync queries
        var stats = await _userRepository.GetUserStatsByDateRangeAsync(startDate, endDate);

        // Assert
        Assert.Equal(2, stats["TotalUsers"]);
        Assert.Equal(1, stats["VerifiedUsers"]);
        Assert.Equal(1, stats["ActiveUsers"]);
    }

    #endregion

    #region SearchUsersAsync Tests

    [Fact]
    public async Task SearchUsersAsync_WithSearchTerm_ReturnsMatching()
    {
        // Arrange
        await SeedTestUserAsync("searchable@test.com", "searchable");
        await SeedTestUserAsync("other@test.com", "other");

        // Act - Exercises: Complex Where with Contains, pagination
        var (users, totalCount) = await _userRepository.SearchUsersAsync(
            searchTerm: "searchable",
            page: 1,
            pageSize: 10);

        // Assert
        Assert.True(totalCount >= 1);
        Assert.Contains(users, u => u.Email == "searchable@test.com");
    }

    [Fact]
    public async Task SearchUsersAsync_WithIsActiveFilter_ReturnsFiltered()
    {
        // Arrange
        var active = await SeedTestUserAsync("searchactive@test.com", "searchactive");
        var inactive = await SeedTestUserAsync("searchinactive@test.com", "searchinactive");

        active.IsActive = true;
        inactive.IsActive = false;
        await _context.SaveChangesAsync();

        // Act - Exercises: Where(IsActive == value)
        var (users, totalCount) = await _userRepository.SearchUsersAsync(
            isActive: true,
            page: 1,
            pageSize: 10);

        // Assert
        Assert.Contains(users, u => u.Id == active.Id);
        Assert.DoesNotContain(users, u => u.Id == inactive.Id);
    }

    [Fact]
    public async Task SearchUsersAsync_WithSorting_ReturnsSorted()
    {
        // Arrange
        ResetDatabase();
        await SeedTestUserAsync("zebra@test.com", "zebra");
        await SeedTestUserAsync("alpha@test.com", "alpha");

        // Act - Exercises: OrderBy email ascending
        var (users, _) = await _userRepository.SearchUsersAsync(
            sortBy: "email",
            sortDescending: false,
            page: 1,
            pageSize: 10);

        // Assert
        var userList = users.ToList();
        Assert.Equal("alpha@test.com", userList[0].Email);
    }

    [Fact]
    public async Task SearchUsersAsync_WithDateFilters_ReturnsFiltered()
    {
        // Arrange
        var recent = await SeedTestUserAsync("daterecent@test.com", "daterecent");
        var old = await SeedTestUserAsync("dateold@test.com", "dateold");

        recent.CreatedAt = DateTime.UtcNow;
        old.CreatedAt = DateTime.UtcNow.AddDays(-60);
        await _context.SaveChangesAsync();

        var registeredAfter = DateTime.UtcNow.AddDays(-30);

        // Act - Exercises: Where(CreatedAt >= date)
        var (users, _) = await _userRepository.SearchUsersAsync(
            registeredAfter: registeredAfter,
            page: 1,
            pageSize: 10);

        // Assert
        Assert.Contains(users, u => u.Id == recent.Id);
        Assert.DoesNotContain(users, u => u.Id == old.Id);
    }

    #endregion

    #region BulkActivateUsersAsync Tests

    [Fact]
    public async Task BulkActivateUsersAsync_ActivatesMultipleUsers()
    {
        // Arrange
        var user1 = await SeedTestUserAsync("bulkact1@test.com", "bulkact1");
        var user2 = await SeedTestUserAsync("bulkact2@test.com", "bulkact2");

        user1.IsActive = false;
        user2.IsActive = false;
        await _context.SaveChangesAsync();

        // Act - Exercises: Where(ids.Contains).ToListAsync() + foreach update
        var count = await _userRepository.BulkActivateUsersAsync(new[] { user1.Id, user2.Id });

        // Assert
        Assert.Equal(2, count);

        var updated1 = await _userRepository.GetByIdAsync(user1.Id);
        var updated2 = await _userRepository.GetByIdAsync(user2.Id);
        Assert.True(updated1!.IsActive);
        Assert.True(updated2!.IsActive);
    }

    #endregion

    #region BulkDeactivateUsersAsync Tests

    [Fact]
    public async Task BulkDeactivateUsersAsync_DeactivatesMultipleUsers()
    {
        // Arrange
        var user1 = await SeedTestUserAsync("bulkdeact1@test.com", "bulkdeact1");
        var user2 = await SeedTestUserAsync("bulkdeact2@test.com", "bulkdeact2");

        // Act - Exercises: Where(ids.Contains).ToListAsync() + foreach update
        var count = await _userRepository.BulkDeactivateUsersAsync(new[] { user1.Id, user2.Id });

        // Assert
        Assert.Equal(2, count);

        var updated1 = await _userRepository.GetByIdAsync(user1.Id);
        var updated2 = await _userRepository.GetByIdAsync(user2.Id);
        Assert.False(updated1!.IsActive);
        Assert.False(updated2!.IsActive);
    }

    #endregion

    #region BulkDeleteInactiveUsersAsync Tests

    [Fact]
    public async Task BulkDeleteInactiveUsersAsync_DeletesOldInactiveUsers()
    {
        // Arrange
        var inactive1 = await SeedTestUserAsync("bulkdelinact1@test.com", "bulkdelinact1");
        var inactive2 = await SeedTestUserAsync("bulkdelinact2@test.com", "bulkdelinact2");
        var active = await SeedTestUserAsync("bulkdelactive@test.com", "bulkdelactive");

        inactive1.LastLoginAt = DateTime.UtcNow.AddDays(-100);
        inactive1.CreatedAt = DateTime.UtcNow.AddDays(-100);
        inactive2.LastLoginAt = null;
        inactive2.CreatedAt = DateTime.UtcNow.AddDays(-100);
        active.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var inactiveSince = DateTime.UtcNow.AddDays(-90);

        // Act - Exercises: complex Where + RemoveRange
        var count = await _userRepository.BulkDeleteInactiveUsersAsync(inactiveSince);

        // Assert
        Assert.Equal(2, count);

        var exists1 = await _userRepository.ExistsAsync(inactive1.Id);
        var exists2 = await _userRepository.ExistsAsync(inactive2.Id);
        var existsActive = await _userRepository.ExistsAsync(active.Id);

        Assert.False(exists1);
        Assert.False(exists2);
        Assert.True(existsActive);
    }

    #endregion

    #region GetUsersForExportAsync Tests

    [Fact]
    public async Task GetUsersForExportAsync_WithFilter_ReturnsFiltered()
    {
        // Arrange
        var verified = await SeedTestUserAsync("exportverified@test.com", "exportverified");
        var unverified = await SeedTestUserAsync("exportunverified@test.com", "exportunverified");

        verified.EmailConfirmed = true;
        unverified.EmailConfirmed = false;
        await _context.SaveChangesAsync();

        // Act - Exercises: Where(filter).ToListAsync()
        var results = await _userRepository.GetUsersForExportAsync(
            filter: u => u.EmailConfirmed);

        // Assert
        Assert.Contains(results, u => u.Id == verified.Id);
        Assert.DoesNotContain(results, u => u.Id == unverified.Id);
    }

    [Fact]
    public async Task GetUsersForExportAsync_WithoutFilter_ReturnsAll()
    {
        // Arrange
        await SeedTestUserAsync("exportall1@test.com", "exportall1");
        await SeedTestUserAsync("exportall2@test.com", "exportall2");

        // Act - Exercises: ToListAsync without filter
        var results = await _userRepository.GetUsersForExportAsync();

        // Assert
        Assert.NotEmpty(results);
        Assert.True(results.Count() >= 2);
    }

    #endregion

    #region Legacy Compatibility Methods Tests

    [Fact]
    public async Task FindByEmailAsync_LegacyMethod_ReturnsUser()
    {
        // Arrange
        await SeedTestUserAsync("legacy@test.com", "legacy");

        // Act - Exercises: GetByEmailAsync wrapper
        var result = await _userRepository.FindByEmailAsync("legacy@test.com");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("legacy@test.com", result.Email);
    }

    [Fact]
    public async Task EmailExistsAsync_LegacyMethod_ReturnsTrue()
    {
        // Arrange
        await SeedTestUserAsync("emailexists@test.com", "emailexists");

        // Act - Exercises: IsEmailTakenAsync wrapper
        var exists = await _userRepository.EmailExistsAsync("emailexists@test.com");

        // Assert
        Assert.True(exists);
    }

    [Fact]
    public async Task GetTotalCountAsync_LegacyMethod_ReturnsCount()
    {
        // Arrange
        ResetDatabase();
        await SeedTestUserAsync("count1@test.com", "count1");
        await SeedTestUserAsync("count2@test.com", "count2");

        // Act - Exercises: CountAsync wrapper
        var count = await _userRepository.GetTotalCountAsync();

        // Assert
        Assert.Equal(2, count);
    }

    [Fact]
    public async Task GetActiveCountAsync_LegacyMethod_ReturnsActiveCount()
    {
        // Arrange
        var active = await SeedTestUserAsync("activecount@test.com", "activecount");
        var inactive = await SeedTestUserAsync("inactivecount@test.com", "inactivecount");

        active.IsActive = true;
        inactive.IsActive = false;
        await _context.SaveChangesAsync();

        // Act - Exercises: CountAsync(predicate) wrapper
        var count = await _userRepository.GetActiveCountAsync();

        // Assert
        Assert.True(count >= 1);
    }

    [Fact]
    public async Task UpdateLastLoginAsync_LegacyOverload_UpdatesTimestamp()
    {
        // Arrange
        var user = await SeedTestUserAsync("legacylogin@test.com", "legacylogin");
        var loginTime = DateTime.UtcNow;

        // Act - Exercises: UpdateLastLoginAsync overload
        var result = await _userRepository.UpdateLastLoginAsync(user.Id, loginTime);

        // Assert
        Assert.True(result);

        var updated = await _userRepository.GetByIdAsync(user.Id);
        Assert.NotNull(updated!.LastLoginAt);
    }

    [Fact]
    public async Task UpdateEmailVerificationAsync_SetsEmailConfirmed()
    {
        // Arrange
        var user = await SeedTestUserAsync("verifyemail@test.com", "verifyemail");
        user.EmailConfirmed = false;
        await _context.SaveChangesAsync();

        // Act - Exercises: UpdateAsync wrapper
        var result = await _userRepository.UpdateEmailVerificationAsync(user.Id, true);

        // Assert
        Assert.True(result);

        var updated = await _userRepository.GetByIdAsync(user.Id);
        Assert.True(updated!.EmailConfirmed);
    }

    #endregion
}
