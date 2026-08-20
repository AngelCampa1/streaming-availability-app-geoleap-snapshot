using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data;

/// <summary>
/// Seeds test users with properly hashed passwords for development/testing
/// </summary>
public static class TestUserSeeder
{
    public static async Task SeedTestUsersAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        // Ensure database exists
        await context.Database.EnsureCreatedAsync();

        // Check if any users exist
        if (await context.Users.AnyAsync())
        {
            Console.WriteLine("Test users already exist. Skipping seeding.");
            return;
        }

        // Create test user with proper password hashing
        var testUser = new User
        {
            UserName = "test@example.com",
            Email = "test@example.com",
            EmailConfirmed = true, // Email confirmed for easy login
            FirstName = "Test",
            LastName = "User",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(testUser, "Test123!");

        if (result.Succeeded)
        {
            Console.WriteLine("✅ Test user created successfully:");
            Console.WriteLine($"  Email: test@example.com");
            Console.WriteLine($"  Password: Test123!");
            Console.WriteLine($"  Email Confirmed: {testUser.EmailConfirmed}");
        }
        else
        {
            Console.WriteLine("❌ Failed to create test user:");
            foreach (var error in result.Errors)
            {
                Console.WriteLine($"  - {error.Description}");
            }
        }
    }
}
