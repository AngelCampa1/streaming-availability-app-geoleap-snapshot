using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Database seeder service implementation
/// </summary>
public class DatabaseSeederService : IDatabaseSeederService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly ILogger<DatabaseSeederService> _logger;

    public DatabaseSeederService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        ILogger<DatabaseSeederService> logger)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await SeedRolesAsync(cancellationToken);
            await SeedUsersAsync(cancellationToken);
            // Only seed test data in development
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                await SeedTestDataAsync(cancellationToken);
            }
            
            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database seeding");
            throw;
        }
    }

    public async Task SeedUsersAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if admin user exists
            var adminUser = await _userManager.FindByEmailAsync("admin@geoleap.com");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    UserName = "admin@geoleap.com",
                    Email = "admin@geoleap.com",
                    EmailConfirmed = true,
                    FirstName = "Admin",
                    LastName = "User",
                    IsActive = true,
                    SubscriptionTier = "premium"
                };

                var result = await _userManager.CreateAsync(adminUser, "Admin123!");
                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(adminUser, "Administrator");
                    _logger.LogInformation("Admin user created successfully");
                }
                else
                {
                    _logger.LogError("Failed to create admin user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding users");
            throw;
        }
    }

    public async Task SeedRolesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var roles = new[] { "Administrator", "User", "Moderator" };

            foreach (var roleName in roles)
            {
                var roleExists = await _roleManager.RoleExistsAsync(roleName);
                if (!roleExists)
                {
                    var role = new IdentityRole<Guid>
                    {
                        Name = roleName
                    };

                    var result = await _roleManager.CreateAsync(role);
                    if (result.Succeeded)
                    {
                        _logger.LogInformation("Role {RoleName} created successfully", roleName);
                    }
                    else
                    {
                        _logger.LogError("Failed to create role {RoleName}: {Errors}", roleName, string.Join(", ", result.Errors.Select(e => e.Description)));
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding roles");
            throw;
        }
    }

    public async Task SeedContentAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if any content exists
            var hasContent = await _context.SearchableContents.AnyAsync(cancellationToken);
            if (!hasContent)
            {
                var sampleContent = new SearchableContent[]
                {
                    // Session 5 Test Scenarios - Basic Search
                    new()
                    {
                        Title = "Stranger Things",
                        SearchableTitle = "stranger things",
                        Type = ContentType.TvSeries,
                        Year = 2016,
                        Rating = 8.7m,
                        Overview = "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
                        SearchableOverview = "when a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl",
                        GenresJson = "[\"Drama\", \"Fantasy\", \"Horror\"]",
                        SearchableGenres = "drama fantasy horror",
                        Language = "en",
                        Popularity = 950.0m
                    },
                    // Fuzzy Matching Test
                    new()
                    {
                        Title = "Breaking Bad",
                        SearchableTitle = "breaking bad",
                        Type = ContentType.TvSeries,
                        Year = 2008,
                        Rating = 9.5m,
                        Overview = "A high school chemistry teacher turned methamphetamine producer partners with a former student to secure his family's future.",
                        SearchableOverview = "a high school chemistry teacher turned methamphetamine producer partners with a former student to secure his family's future",
                        GenresJson = "[\"Crime\", \"Drama\", \"Thriller\"]",
                        SearchableGenres = "crime drama thriller",
                        Language = "en",
                        Popularity = 920.0m
                    },
                    // Content Type Tests - Movies
                    new()
                    {
                        Title = "The Shawshank Redemption",
                        SearchableTitle = "the shawshank redemption",
                        Type = ContentType.Movie,
                        Year = 1994,
                        Rating = 9.3m,
                        Overview = "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
                        SearchableOverview = "two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency",
                        GenresJson = "[\"Drama\"]",
                        SearchableGenres = "drama",
                        Language = "en",
                        Popularity = 880.0m
                    },
                    new()
                    {
                        Title = "The Dark Knight",
                        SearchableTitle = "the dark knight",
                        Type = ContentType.Movie,
                        Year = 2008,
                        Rating = 9.0m,
                        Overview = "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological tests.",
                        SearchableOverview = "when the menace known as the joker wreaks havoc and chaos on the people of gotham, batman must accept one of the greatest psychological tests",
                        GenresJson = "[\"Action\", \"Crime\", \"Drama\"]",
                        SearchableGenres = "action crime drama",
                        Language = "en",
                        Popularity = 910.0m
                    },
                    // Filter Tests - Various Years
                    new()
                    {
                        Title = "Inception",
                        SearchableTitle = "inception",
                        Type = ContentType.Movie,
                        Year = 2010,
                        Rating = 8.8m,
                        Overview = "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
                        SearchableOverview = "a thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea",
                        GenresJson = "[\"Action\", \"Science Fiction\", \"Thriller\"]",
                        SearchableGenres = "action science fiction thriller",
                        Language = "en",
                        Popularity = 890.0m
                    },
                    // Filter Tests - Comedy Genre
                    new()
                    {
                        Title = "The Office",
                        SearchableTitle = "the office",
                        Type = ContentType.TvSeries,
                        Year = 2005,
                        Rating = 8.9m,
                        Overview = "A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.",
                        SearchableOverview = "a mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium",
                        GenresJson = "[\"Comedy\"]",
                        SearchableGenres = "comedy",
                        Language = "en",
                        Popularity = 870.0m
                    },
                    // Filter Tests - Animation
                    new()
                    {
                        Title = "Avatar: The Last Airbender",
                        SearchableTitle = "avatar: the last airbender",
                        Type = ContentType.TvSeries,
                        Year = 2005,
                        Rating = 9.3m,
                        Overview = "In a war-torn world of elemental magic, a young boy reawakens to undertake a dangerous mystic quest.",
                        SearchableOverview = "in a war-torn world of elemental magic, a young boy reawakens to undertake a dangerous mystic quest",
                        GenresJson = "[\"Animation\", \"Action\", \"Adventure\"]",
                        SearchableGenres = "animation action adventure",
                        Language = "en",
                        Popularity = 860.0m
                    },
                    // Filter Tests - Recent Content
                    new()
                    {
                        Title = "The Last of Us",
                        SearchableTitle = "the last of us",
                        Type = ContentType.TvSeries,
                        Year = 2023,
                        Rating = 8.8m,
                        Overview = "Twenty years after a fungal outbreak ravages the planet, survivors Joel and Ellie embark on a brutal journey across America.",
                        SearchableOverview = "twenty years after a fungal outbreak ravages the planet, survivors joel and ellie embark on a brutal journey across america",
                        GenresJson = "[\"Drama\", \"Science Fiction\", \"Action\"]",
                        SearchableGenres = "drama science fiction action",
                        Language = "en",
                        Popularity = 940.0m
                    },
                    // Filter Tests - Lower Rating
                    new()
                    {
                        Title = "Generic Action Movie",
                        SearchableTitle = "generic action movie",
                        Type = ContentType.Movie,
                        Year = 2020,
                        Rating = 6.2m,
                        Overview = "An average action movie with explosions and car chases.",
                        SearchableOverview = "an average action movie with explosions and car chases",
                        GenresJson = "[\"Action\"]",
                        SearchableGenres = "action",
                        Language = "en",
                        Popularity = 450.0m
                    },
                    // Filter Tests - Old Classic
                    new()
                    {
                        Title = "The Godfather",
                        SearchableTitle = "the godfather",
                        Type = ContentType.Movie,
                        Year = 1972,
                        Rating = 9.2m,
                        Overview = "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
                        SearchableOverview = "the aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son",
                        GenresJson = "[\"Crime\", \"Drama\"]",
                        SearchableGenres = "crime drama",
                        Language = "en",
                        Popularity = 900.0m
                    }
                };

                _context.SearchableContents.AddRange(sampleContent);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Sample content seeded successfully");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding content");
            throw;
        }
    }

    public async Task SeedTestDataAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await SeedContentAsync(cancellationToken);
            _logger.LogInformation("Test data seeded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding test data");
            throw;
        }
    }

    public async Task<bool> IsDataSeededAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var hasRoles = await _context.Roles.AnyAsync(cancellationToken);
            var hasUsers = await _context.Users.AnyAsync(cancellationToken);
            return hasRoles && hasUsers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if data is seeded");
            return false;
        }
    }
}