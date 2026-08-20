using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Xunit;

namespace GeoLeap.Api.Tests.Templates;

/// <summary>
/// Simple database test template - copy-paste ready
/// Isolated context for database-dependent tests
/// </summary>
public class SimpleDatabaseTest : SimpleTestBase
{
    [Fact]
    public async Task Database_CanSaveAndRetrieveData()
    {
        // Arrange
        using var context = GetDbContext();
        var testUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "testuser",
            Email = "test@example.com",
            EmailConfirmed = true
        };

        // Act
        context.Users.Add(testUser);
        await context.SaveChangesAsync();

        // Assert
        var savedUser = await context.Users
            .FirstOrDefaultAsync(u => u.Email == "test@example.com");
        
        Assert.NotNull(savedUser);
        Assert.Equal("testuser", savedUser.UserName);
    }

    [Fact]
    public async Task Database_CanUpdateExistingData()
    {
        // Arrange
        using var context = GetDbContext();
        var testUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "testuser",
            Email = "test@example.com"
        };
        
        context.Users.Add(testUser);
        await context.SaveChangesAsync();

        // Act
        testUser.UserName = "updateduser";
        await context.SaveChangesAsync();

        // Assert
        var updatedUser = await context.Users.FindAsync(testUser.Id);
        Assert.Equal("updateduser", updatedUser.UserName);
    }

    [Fact]
    public async Task Database_CanDeleteData()
    {
        // Arrange
        using var context = GetDbContext();
        var testUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "testuser",
            Email = "test@example.com"
        };
        
        context.Users.Add(testUser);
        await context.SaveChangesAsync();

        // Act
        context.Users.Remove(testUser);
        await context.SaveChangesAsync();

        // Assert
        var deletedUser = await context.Users.FindAsync(testUser.Id);
        Assert.Null(deletedUser);
    }

    [Fact]
    public async Task Database_CanQueryWithLinq()
    {
        // Arrange
        using var context = GetDbContext();
        var users = new[]
        {
            new ApplicationUser 
            { 
                Id = Guid.NewGuid().ToString(), 
                UserName = "user1", 
                Email = "user1@example.com" 
            },
            new ApplicationUser 
            { 
                Id = Guid.NewGuid().ToString(), 
                UserName = "user2", 
                Email = "user2@example.com" 
            },
            new ApplicationUser 
            { 
                Id = Guid.NewGuid().ToString(), 
                UserName = "admin1", 
                Email = "admin1@example.com" 
            }
        };

        context.Users.AddRange(users);
        await context.SaveChangesAsync();

        // Act
        var userResults = await context.Users
            .Where(u => u.UserName.StartsWith("user"))
            .OrderBy(u => u.UserName)
            .ToListAsync();

        // Assert
        Assert.Equal(2, userResults.Count);
        Assert.Equal("user1", userResults[0].UserName);
        Assert.Equal("user2", userResults[1].UserName);
    }

    [Fact]
    public async Task Api_WithDatabaseData_ReturnsExpectedResults()
    {
        // Arrange - Seed database
        using var context = GetDbContext();
        var testUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "testuser",
            Email = "test@example.com"
        };
        context.Users.Add(testUser);
        await context.SaveChangesAsync();

        // Arrange - Create client
        using var client = CreateClient();

        // Act
        var response = await client.GetAsync($"/api/users/{testUser.Id}");

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await DeserializeResponse<dynamic>(response);
        Assert.Equal("testuser", result.userName.ToString());
    }

    [Fact]
    public async Task Api_PostData_SavesToDatabase()
    {
        // Arrange
        using var client = CreateClient();
        var userData = new 
        { 
            UserName = "newuser",
            Email = "newuser@example.com"
        };

        // Act
        var response = await client.PostAsync("/api/users", JsonContent(userData));

        // Assert
        response.EnsureSuccessStatusCode();
        
        // Verify in database
        using var context = GetDbContext();
        var savedUser = await context.Users
            .FirstOrDefaultAsync(u => u.Email == "newuser@example.com");
        
        Assert.NotNull(savedUser);
        Assert.Equal("newuser", savedUser.UserName);
    }
}

/*
HOW TO USE THIS TEMPLATE:

1. Copy this file to your test project
2. Replace ApplicationUser with your entity models
3. Update API endpoints to match your controllers
4. Modify queries to match your business logic

COMMON DATABASE TEST PATTERNS:
- Test basic CRUD operations
- Test complex LINQ queries
- Test API endpoints that use the database
- Test data validation and constraints
- Test relationships between entities

BENEFITS:
- Each test gets a fresh in-memory database
- Tests are isolated from each other
- No cleanup needed - database is disposed automatically
- Fast execution with in-memory provider
*/