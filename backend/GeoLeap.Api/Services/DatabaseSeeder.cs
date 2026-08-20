using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public interface IDatabaseSeeder
{
    Task SeedAsync();
    Task SeedStreamingServicesAsync();
    Task SeedSubscriptionPlansAsync();
    Task SeedTestUsersAsync();
    Task SeedContentMetadataAsync();
    Task ClearAllDataAsync();
}

public class DatabaseSeeder : IDatabaseSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(ApplicationDbContext context, ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting database seeding...");
            
            // Ensure database is created
            await _context.Database.EnsureCreatedAsync();

            // Seed all entities
            await SeedStreamingServicesAsync();
            await SeedSubscriptionPlansAsync();
            await SeedTestUsersAsync();
            await SeedContentMetadataAsync();

            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database seeding failed");
            throw;
        }
    }

    public async Task SeedStreamingServicesAsync()
    {
        try
        {
            if (await _context.StreamingServices.AnyAsync())
            {
                _logger.LogDebug("Streaming services already seeded, skipping...");
                return;
            }

            var streamingServices = new[]
            {
                // Major Subscription Services
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440001"),
                    Name = "Netflix",
                    DisplayName = "Netflix",
                    Description = "World's leading streaming entertainment service with TV series, documentaries and feature films",
                    LogoUrl = "https://example.com/logos/netflix.png",
                    WebsiteUrl = "https://www.netflix.com",
                    Type = StreamingServiceType.Subscription,
                    Category = "Entertainment",
                    IsGlobal = true,
                    IsActive = true,
                    SortOrder = 1,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR", "ES", "IT", "BR", "MX", "JP", "IN", "KR" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440002"),
                    Name = "Disney+",
                    DisplayName = "Disney+",
                    Description = "The streaming home of Disney, Pixar, Marvel, Star Wars, National Geographic, and more",
                    LogoUrl = "https://example.com/logos/disney-plus.png",
                    WebsiteUrl = "https://www.disneyplus.com",
                    Type = StreamingServiceType.Subscription,
                    Category = "Entertainment",
                    IsGlobal = true,
                    IsActive = true,
                    SortOrder = 2,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR", "ES", "IT", "NL", "BE" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440003"),
                    Name = "Amazon Prime Video",
                    DisplayName = "Amazon Prime Video",
                    Description = "Amazon's streaming service featuring award-winning Prime Originals and popular movies and TV shows",
                    LogoUrl = "https://example.com/logos/amazon-prime.png",
                    WebsiteUrl = "https://www.primevideo.com",
                    Type = StreamingServiceType.Subscription,
                    Category = "Entertainment",
                    IsGlobal = true,
                    IsActive = true,
                    SortOrder = 3,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR", "ES", "IT", "JP", "BR", "MX", "IN" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440004"),
                    Name = "HBO Max",
                    DisplayName = "HBO Max",
                    Description = "Stream HBO, Max Originals, hit movies, TV favorites, and more",
                    LogoUrl = "https://example.com/logos/hbo-max.png",
                    WebsiteUrl = "https://www.hbomax.com",
                    Type = StreamingServiceType.Subscription,
                    Category = "Entertainment",
                    IsGlobal = false,
                    IsActive = true,
                    SortOrder = 4,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440005"),
                    Name = "Apple TV+",
                    DisplayName = "Apple TV+",
                    Description = "Apple's original content streaming service",
                    LogoUrl = "https://example.com/logos/apple-tv.png",
                    WebsiteUrl = "https://tv.apple.com",
                    Type = StreamingServiceType.Subscription,
                    Category = "Entertainment",
                    IsGlobal = true,
                    IsActive = true,
                    SortOrder = 5,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR", "ES", "IT", "JP", "IN", "BR", "MX" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },
                
                // Free Services
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440006"),
                    Name = "YouTube",
                    DisplayName = "YouTube",
                    Description = "Free video streaming platform with user-generated and professional content",
                    LogoUrl = "https://example.com/logos/youtube.png",
                    WebsiteUrl = "https://www.youtube.com",
                    Type = StreamingServiceType.Free,
                    Category = "Entertainment",
                    IsGlobal = true,
                    IsActive = true,
                    SortOrder = 6,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR", "ES", "IT", "BR", "MX", "JP", "IN", "KR", "RU", "CN" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440007"),
                    Name = "Tubi",
                    DisplayName = "Tubi",
                    Description = "Free streaming service with thousands of movies and TV shows",
                    LogoUrl = "https://example.com/logos/tubi.png",
                    WebsiteUrl = "https://tubitv.com",
                    Type = StreamingServiceType.Free,
                    Category = "Entertainment",
                    IsGlobal = false,
                    IsActive = true,
                    SortOrder = 7,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "CA", "AU" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "CA" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },

                // Ad-Supported Services
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440008"),
                    Name = "Hulu",
                    DisplayName = "Hulu",
                    Description = "Stream current hit TV shows and acclaimed movies",
                    LogoUrl = "https://example.com/logos/hulu.png",
                    WebsiteUrl = "https://www.hulu.com",
                    Type = StreamingServiceType.AdSupported,
                    Category = "Entertainment",
                    IsGlobal = false,
                    IsActive = true,
                    SortOrder = 8,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "JP" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },

                // Music Services
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440009"),
                    Name = "Spotify",
                    DisplayName = "Spotify",
                    Description = "Music streaming service with millions of songs and podcasts",
                    LogoUrl = "https://example.com/logos/spotify.png",
                    WebsiteUrl = "https://www.spotify.com",
                    Type = StreamingServiceType.AdSupported,
                    Category = "Music",
                    IsGlobal = true,
                    IsActive = true,
                    SortOrder = 9,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "FR", "ES", "IT", "BR", "MX", "JP", "IN", "KR", "SE", "NO", "DK" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US", "UK", "CA", "AU", "DE", "SE" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                },

                // Sports Services
                new StreamingService
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440010"),
                    Name = "ESPN+",
                    DisplayName = "ESPN+",
                    Description = "Live sports streaming and on-demand content",
                    LogoUrl = "https://example.com/logos/espn-plus.png",
                    WebsiteUrl = "https://plus.espn.com",
                    Type = StreamingServiceType.Subscription,
                    Category = "Sports",
                    IsGlobal = false,
                    IsActive = true,
                    SortOrder = 10,
                    AvailableRegions = JsonSerializer.Serialize(new[] { "US" }),
                    PopularRegions = JsonSerializer.Serialize(new[] { "US" }),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow
                }
            };

            _context.StreamingServices.AddRange(streamingServices);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Seeded {streamingServices.Length} streaming services");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed streaming services");
            throw;
        }
    }

    public async Task SeedSubscriptionPlansAsync()
    {
        try
        {
            if (await _context.SubscriptionPlans.AnyAsync())
            {
                _logger.LogDebug("Subscription plans already seeded, skipping...");
                return;
            }

            var subscriptionPlans = new[]
            {
                new SubscriptionPlan
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Name = "Free Tier",
                    Description = "Basic access with limited features",
                    Price = 0.00m,
                    Currency = "USD",
                    BillingPeriod = "monthly",
                    Tier = SubscriptionTier.Free,
                    Interval = "month",
                    Features = new List<string>
                    {
                        "Up to 5 search results per query",
                        "Up to 20 searches per day",
                        "Basic content information",
                        "Limited region support"
                    },
                    MaxSearchResultsPerQuery = 5,
                    MaxDailySearches = 20,
                    CanViewStreamingUrls = false,
                    CanViewPricing = false,
                    CanAccessAdvancedFilters = false,
                    IsActive = true,
                    StripePriceId = "price_free_test",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new SubscriptionPlan
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Name = "Premium Monthly",
                    Description = "Full access to all features with monthly billing",
                    Price = 9.99m,
                    Currency = "USD",
                    BillingPeriod = "monthly",
                    Tier = SubscriptionTier.Premium,
                    Interval = "month",
                    Features = new List<string>
                    {
                        "Unlimited search results",
                        "Unlimited daily searches",
                        "Detailed content information",
                        "All regions supported",
                        "Advanced filters",
                        "Search history",
                        "Priority support"
                    },
                    MaxSearchResultsPerQuery = -1, // Unlimited
                    MaxDailySearches = -1, // Unlimited
                    CanViewStreamingUrls = true,
                    CanViewPricing = true,
                    CanAccessAdvancedFilters = true,
                    IsActive = true,
                    StripePriceId = "price_premium_monthly_test",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new SubscriptionPlan
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Name = "Premium Yearly",
                    Description = "Full access to all features with yearly billing (2 months free)",
                    Price = 99.99m,
                    Currency = "USD",
                    BillingPeriod = "yearly",
                    Tier = SubscriptionTier.Premium,
                    Interval = "year",
                    Features = new List<string>
                    {
                        "Everything in Premium Monthly",
                        "2 months free (save 17%)",
                        "Priority customer support",
                        "Early access to new features"
                    },
                    MaxSearchResultsPerQuery = -1, // Unlimited
                    MaxDailySearches = -1, // Unlimited
                    CanViewStreamingUrls = true,
                    CanViewPricing = true,
                    CanAccessAdvancedFilters = true,
                    IsActive = true,
                    StripePriceId = "price_premium_yearly_test",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new SubscriptionPlan
                {
                    Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Name = "Admin Access",
                    Description = "Full administrative access to the platform",
                    Price = 0.00m,
                    Currency = "USD",
                    BillingPeriod = "monthly",
                    Tier = SubscriptionTier.Premium, // Admin uses Premium tier with special permissions
                    Interval = "month",
                    Features = new List<string>
                    {
                        "All Premium features",
                        "Administrative dashboard",
                        "User management",
                        "Analytics and reporting",
                        "System configuration"
                    },
                    MaxSearchResultsPerQuery = -1, // Unlimited
                    MaxDailySearches = -1, // Unlimited
                    CanViewStreamingUrls = true,
                    CanViewPricing = true,
                    CanAccessAdvancedFilters = true,
                    IsActive = true,
                    StripePriceId = "price_admin_test",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            _context.SubscriptionPlans.AddRange(subscriptionPlans);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Seeded {subscriptionPlans.Length} subscription plans");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed subscription plans");
            throw;
        }
    }

    public async Task SeedTestUsersAsync()
    {
        try
        {
            // Check if test user already exists
            if (await _context.Users.AnyAsync(u => u.Email == "test@example.com"))
            {
                _logger.LogDebug("Test users already seeded, skipping...");
                return;
            }

            // Create test user with proper password hash using UserManager
            // We need to use UserManager for password hashing, so this is a placeholder
            // Actual user creation should be done in Program.cs with UserManager injection
            var testUsers = new[]
            {
                new User
                {
                    Id = Guid.Parse("12345678-1234-1234-1234-123456789012"),
                    UserName = "test@example.com",
                    NormalizedUserName = "TEST@EXAMPLE.COM",
                    Email = "test@example.com",
                    NormalizedEmail = "TEST@EXAMPLE.COM",
                    EmailConfirmed = true,
                    FirstName = "Test",
                    LastName = "User",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                    // Password will be set via UserManager: Test123!
                    SecurityStamp = Guid.NewGuid().ToString()
                },
                new User
                {
                    Id = Guid.Parse("12345678-1234-1234-1234-123456789013"),
                    UserName = "premiumuser@example.com",
                    NormalizedUserName = "PREMIUMUSER@EXAMPLE.COM",
                    Email = "premiumuser@example.com",
                    NormalizedEmail = "PREMIUMUSER@EXAMPLE.COM",
                    EmailConfirmed = true,
                    FirstName = "Premium",
                    LastName = "User",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                    PasswordHash = "AQAAAAEAACcQAAAAEDummyHashForTestingPurposes123456789012345678901234567890",
                    SecurityStamp = Guid.NewGuid().ToString()
                },
                new User
                {
                    Id = Guid.Parse("12345678-1234-1234-1234-123456789014"),
                    UserName = "admin@example.com",
                    NormalizedUserName = "ADMIN@EXAMPLE.COM",
                    Email = "admin@example.com",
                    NormalizedEmail = "ADMIN@EXAMPLE.COM",
                    EmailConfirmed = true,
                    FirstName = "Admin",
                    LastName = "User",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                    PasswordHash = "AQAAAAEAACcQAAAAEDummyHashForTestingPurposes123456789012345678901234567890",
                    SecurityStamp = Guid.NewGuid().ToString()
                },
                new User
                {
                    Id = Guid.Parse("12345678-1234-1234-1234-123456789015"),
                    UserName = "unverified@example.com",
                    NormalizedUserName = "UNVERIFIED@EXAMPLE.COM",
                    Email = "unverified@example.com",
                    NormalizedEmail = "UNVERIFIED@EXAMPLE.COM",
                    EmailConfirmed = false, // Unverified user for testing
                    FirstName = "Unverified",
                    LastName = "User",
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                    PasswordHash = "AQAAAAEAACcQAAAAEDummyHashForTestingPurposes123456789012345678901234567890",
                    SecurityStamp = Guid.NewGuid().ToString()
                }
            };

            _context.Users.AddRange(testUsers);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Seeded {testUsers.Length} test users");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed test users");
            throw;
        }
    }

    public async Task SeedContentMetadataAsync()
    {
        try
        {
            if (await _context.SearchableContents.AnyAsync())
            {
                _logger.LogDebug("Content metadata already seeded, skipping...");
                return;
            }

            var contentMetadata = new[]
            {
                new SearchableContent
                {
                    Id = Guid.NewGuid(),
                    TmdbId = 603,
                    Title = "The Matrix",
                    OriginalTitle = "The Matrix",
                    SearchableTitle = "the matrix action sci-fi thriller",
                    Type = ContentType.Movie,
                    Year = 1999,
                    Overview = "A computer programmer discovers that reality as he knows it is a simulation controlled by sentient machines.",
                    SearchableOverview = "computer programmer reality simulation machines neo morpheus trinity",
                    GenresJson = JsonSerializer.Serialize(new[] { "Action", "Sci-Fi", "Thriller" }),
                    SearchableGenres = "action sci-fi thriller",
                    PosterUrl = "https://example.com/posters/matrix.jpg",
                    BackdropUrl = "https://example.com/backdrops/matrix.jpg",
                    Rating = 8.7m,
                    VoteCount = 18000,
                    Popularity = 95.5m,
                    IsAdult = false,
                    RuntimeMinutes = 136,
                    Language = "en",
                    ContentRating = "R",
                    CastJson = JsonSerializer.Serialize(new[] { "Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss" }),
                    SearchableCast = "keanu reeves laurence fishburne carrie-anne moss",
                    CrewJson = JsonSerializer.Serialize(new[] { "The Wachowskis" }),
                    SearchableCrew = "wachowskis director",
                    AvailableCountriesCount = 15,
                    AvailableServicesCount = 5,
                    SearchScore = 95.5m,
                    ClickThroughRate = 0.15m,
                    ViewCount = 150000,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new SearchableContent
                {
                    Id = Guid.NewGuid(),
                    TmdbId = 27205,
                    Title = "Inception",
                    OriginalTitle = "Inception",
                    SearchableTitle = "inception action sci-fi thriller dreams",
                    Type = ContentType.Movie,
                    Year = 2010,
                    Overview = "A thief who enters people's dreams to steal secrets from their subconscious is given a final job: planting an idea in someone's mind.",
                    SearchableOverview = "thief dreams steal secrets subconscious planting idea mind dom cobb",
                    GenresJson = JsonSerializer.Serialize(new[] { "Action", "Sci-Fi", "Thriller" }),
                    SearchableGenres = "action sci-fi thriller",
                    PosterUrl = "https://example.com/posters/inception.jpg",
                    BackdropUrl = "https://example.com/backdrops/inception.jpg",
                    Rating = 8.8m,
                    VoteCount = 22000,
                    Popularity = 92.3m,
                    IsAdult = false,
                    RuntimeMinutes = 148,
                    Language = "en",
                    ContentRating = "PG-13",
                    CastJson = JsonSerializer.Serialize(new[] { "Leonardo DiCaprio", "Marion Cotillard", "Tom Hardy" }),
                    SearchableCast = "leonardo dicaprio marion cotillard tom hardy",
                    CrewJson = JsonSerializer.Serialize(new[] { "Christopher Nolan" }),
                    SearchableCrew = "christopher nolan director",
                    AvailableCountriesCount = 18,
                    AvailableServicesCount = 6,
                    SearchScore = 92.3m,
                    ClickThroughRate = 0.18m,
                    ViewCount = 180000,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            _context.SearchableContents.AddRange(contentMetadata);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Seeded {contentMetadata.Length} content metadata entries");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed content metadata");
            throw;
        }
    }

    public async Task ClearAllDataAsync()
    {
        try
        {
            _logger.LogInformation("Clearing all seeded data...");
            
            // Clear in reverse order of dependencies
            await _context.Database.ExecuteSqlRawAsync("DELETE FROM SearchableContents");
            await _context.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUsers");
            await _context.Database.ExecuteSqlRawAsync("DELETE FROM SubscriptionPlans");
            await _context.Database.ExecuteSqlRawAsync("DELETE FROM StreamingServices");
            
            _logger.LogInformation("All seeded data cleared");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear seeded data");
            throw;
        }
    }
}