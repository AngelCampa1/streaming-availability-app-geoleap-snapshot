using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Seeder.DataGenerators;
using GeoLeap.Seeder.Seeders.Base;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Seeder.Seeders;

public class UserSeeder : BaseSeeder<User>
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;

    public override string Name => "Users, Roles & Permissions";
    public override int Order => 1;

    public UserSeeder(
        ApplicationDbContext context,
        UserManager<User> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        ILogger<UserSeeder> logger)
        : base(context, logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public override async Task<bool> IsAlreadySeededAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users.AnyAsync(cancellationToken);
    }

    protected override async Task<IEnumerable<User>> GenerateEntitiesAsync(
        SeederConfiguration config,
        CancellationToken cancellationToken = default)
    {
        // Create roles first
        await EnsureRolesAsync(cancellationToken);

        var generator = new UserDataGenerator(config.RandomSeed);

        // Generate test accounts
        var testAccounts = generator.GenerateTestAccounts().ToList();

        // Generate regular users
        var regularUserCount = config.UserCount - testAccounts.Count;
        var regularUsers = generator.GenerateUsers(regularUserCount).ToList();

        var allUsers = testAccounts.Concat(regularUsers).ToList();

        _logger.LogInformation("Generated {Count} users ({TestCount} test accounts)",
            allUsers.Count, testAccounts.Count);

        // Create users with UserManager for proper password hashing
        var createdUsers = new List<User>();

        foreach (var user in allUsers)
        {
            var result = await _userManager.CreateAsync(user, "Test123!");

            if (result.Succeeded)
            {
                createdUsers.Add(user);

                // Assign roles
                if (user.Email.Contains("admin@"))
                {
                    await _userManager.AddToRoleAsync(user, "Admin");
                }
                else if (user.SubscriptionTier.Contains("premium"))
                {
                    await _userManager.AddToRoleAsync(user, "PremiumUser");
                }
                else
                {
                    await _userManager.AddToRoleAsync(user, "User");
                }
            }
            else
            {
                _logger.LogWarning("Failed to create user {Email}: {Errors}",
                    user.Email,
                    string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }

        return createdUsers;
    }

    private async Task EnsureRolesAsync(CancellationToken cancellationToken)
    {
        var roles = new[] { "Admin", "User", "PremiumUser" };

        foreach (var roleName in roles)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                var role = new IdentityRole<Guid> { Name = roleName };
                await _roleManager.CreateAsync(role);
                _logger.LogInformation("Created role: {Role}", roleName);
            }
        }
    }

    // Override base SeedAsync to use UserManager
    public override async Task SeedAsync(SeederConfiguration config, CancellationToken cancellationToken = default)
    {
        if (await IsAlreadySeededAsync(cancellationToken))
        {
            _logger.LogInformation("{SeederName} already seeded, skipping", Name);
            return;
        }

        _logger.LogInformation("Starting {SeederName}", Name);
        await GenerateEntitiesAsync(config, cancellationToken);
        _logger.LogInformation("{SeederName} completed successfully", Name);
    }
}
