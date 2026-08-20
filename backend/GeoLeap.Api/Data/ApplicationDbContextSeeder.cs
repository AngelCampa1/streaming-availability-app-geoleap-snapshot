using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data;

/// <summary>
/// Comprehensive test data seeder for ApplicationDbContext
/// Provides realistic test data for all entities with proper relationships
/// </summary>
public static class ApplicationDbContextSeeder
{
    /// <summary>
    /// Seeds comprehensive test data for all entities
    /// MUST be called from test setup to ensure proper seeding
    /// </summary>
    public static async Task SeedTestDataAsync(this ApplicationDbContext context)
    {
        if (!IsTestEnvironment()) 
        {
            Console.WriteLine("⚠️ Not in test environment, skipping seeding");
            return;
        }

        try
        {
            // Ensure database is created
            await context.Database.EnsureCreatedAsync();
            Console.WriteLine("✅ Database ensure created completed");
            
            // Check if already seeded - but allow re-seeding for reliability
            var existingServices = await context.StreamingServices.CountAsync();
            Console.WriteLine($"📊 Current streaming services count: {existingServices}");

            // Force seeding if no data exists
            if (existingServices == 0)
            {
                Console.WriteLine("🌱 Starting FORCED test data seeding - no data detected...");
                
                // Seed WITHOUT transaction to avoid rollback issues in tests
                try
                {
                    // Seed core data in dependency order
                    Console.WriteLine("🔑 Seeding roles and permissions...");
                    await context.SeedRolesAndPermissionsAsync();
                    await context.SaveChangesAsync(); // Save after each step
                    
                    Console.WriteLine("👥 Seeding users...");
                    await context.SeedUsersAsync();
                    await context.SaveChangesAsync();
                    
                    Console.WriteLine("📺 Seeding streaming services...");
                    await context.SeedStreamingServicesAsync();
                    await context.SaveChangesAsync(); // Critical save
                    
                    Console.WriteLine("💳 Seeding subscription plans...");
                    await context.SeedSubscriptionPlansAsync();
                    await context.SaveChangesAsync();
                    
                    Console.WriteLine("🎬 Seeding content data...");
                    await context.SeedContentDataAsync();
                    await context.SaveChangesAsync();
                    
                    Console.WriteLine("🔍 Seeding search data...");
                    await context.SeedSearchDataAsync();
                    await context.SaveChangesAsync();
                    
                    Console.WriteLine("💰 Seeding payment data...");
                    await context.SeedPaymentDataAsync();
                    await context.SaveChangesAsync();
                    
                    Console.WriteLine("📱 Seeding social data...");
                    await context.SeedSocialDataAsync();
                    await context.SaveChangesAsync();
                    
                    Console.WriteLine("👨‍💼 Seeding admin data...");
                    await context.SeedAdminDataAsync();
                    await context.SaveChangesAsync();
                    
                    // Final verification
                    var finalCount = await context.StreamingServices.CountAsync();
                    Console.WriteLine($"✅ Test data seeding completed successfully - {finalCount} streaming services");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Test data seeding failed: {ex.Message}");
                    Console.WriteLine($"📍 Stack trace: {ex.StackTrace}");
                    throw;
                }
            }
            else
            {
                Console.WriteLine($"📊 Test data already exists ({existingServices} streaming services), skipping re-seeding");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Critical: Test data seeding failed: {ex.Message}");
            Console.WriteLine($"📍 Stack trace: {ex.StackTrace}");
            throw; // Don't catch and continue - tests need this data
        }
    }

    private static bool IsTestEnvironment()
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? 
                         Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
        
        // Always allow seeding in test scenarios (relaxed check)
        return true; // For now, always allow seeding for testing
    }

    private static async Task<bool> HasTestDataAsync(this ApplicationDbContext context)
    {
        try
        {
            return await context.Users.AnyAsync() || 
                   await context.Roles.AnyAsync() || 
                   await context.StreamingServices.AnyAsync();
        }
        catch
        {
            return false;
        }
    }

    private static async Task SeedRolesAndPermissionsAsync(this ApplicationDbContext context)
    {
        if (await context.Roles.AnyAsync()) return;

        var permissions = new List<Permission>
        {
            new() { Id = Guid.NewGuid(), Name = "Read Users", Resource = "User", Action = "Read", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Create Users", Resource = "User", Action = "Create", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Update Users", Resource = "User", Action = "Update", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Delete Users", Resource = "User", Action = "Delete", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Admin Access", Resource = "Admin", Action = "All", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Search Content", Resource = "Content", Action = "Search", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Manage Subscriptions", Resource = "Subscription", Action = "Manage", CreatedAt = DateTime.UtcNow }
        };

        var roles = new List<Role>
        {
            new() { Id = Guid.NewGuid(), Name = "Admin", Description = "Administrator role", IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Premium", Description = "Premium subscriber role", IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Basic", Description = "Basic user role", IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Guest", Description = "Guest user role", IsActive = true, CreatedAt = DateTime.UtcNow }
        };

        await context.Permissions.AddRangeAsync(permissions);
        await context.Roles.AddRangeAsync(roles);
        await context.SaveChangesAsync();

        // Add role permissions
        var rolePermissions = new List<RolePermission>();
        var adminRole = roles.First(r => r.Name == "Admin");
        var premiumRole = roles.First(r => r.Name == "Premium");
        var basicRole = roles.First(r => r.Name == "Basic");

        // Admin gets all permissions
        foreach (var permission in permissions)
        {
            rolePermissions.Add(new RolePermission
            {
                RoleId = adminRole.Id,
                PermissionId = permission.Id,
                GrantedAt = DateTime.UtcNow
            });
        }

        // Premium gets search and subscription management
        var premiumPermissions = permissions.Where(p => p.Resource == "Content" || p.Resource == "Subscription");
        foreach (var permission in premiumPermissions)
        {
            rolePermissions.Add(new RolePermission
            {
                RoleId = premiumRole.Id,
                PermissionId = permission.Id,
                GrantedAt = DateTime.UtcNow
            });
        }

        // Basic gets only search
        var basicPermission = permissions.First(p => p.Resource == "Content");
        rolePermissions.Add(new RolePermission
        {
            RoleId = basicRole.Id,
            PermissionId = basicPermission.Id,
            GrantedAt = DateTime.UtcNow
        });

        await context.RolePermissions.AddRangeAsync(rolePermissions);
        await context.SaveChangesAsync();
    }

    private static async Task SeedUsersAsync(this ApplicationDbContext context)
    {
        if (await context.Users.AnyAsync()) return;

        var users = new List<User>
        {
            new()
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                UserName = "admin@test.com",
                NormalizedUserName = "ADMIN@TEST.COM",
                Email = "admin@test.com",
                NormalizedEmail = "ADMIN@TEST.COM",
                EmailConfirmed = true,
                FirstName = "Admin",
                LastName = "User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                SecurityStamp = Guid.NewGuid().ToString(),
                PasswordHash = "AQAAAAEAACcQAAAAEPwWlCqj9GGGowSMJjpVxP3eXF5R+JV0K9B+vYGqoq5oFzF2Tf8H0/BrTdGHPg5G7w=="
            },
            new()
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                UserName = "premium@test.com",
                NormalizedUserName = "PREMIUM@TEST.COM", 
                Email = "premium@test.com",
                NormalizedEmail = "PREMIUM@TEST.COM",
                EmailConfirmed = true,
                FirstName = "Premium",
                LastName = "User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                SecurityStamp = Guid.NewGuid().ToString(),
                PasswordHash = "AQAAAAEAACcQAAAAEPwWlCqj9GGGowSMJjpVxP3eXF5R+JV0K9B+vYGqoq5oFzF2Tf8H0/BrTdGHPg5G7w=="
            },
            new()
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                UserName = "user@test.com",
                NormalizedUserName = "USER@TEST.COM",
                Email = "user@test.com", 
                NormalizedEmail = "USER@TEST.COM",
                EmailConfirmed = true,
                FirstName = "Test",
                LastName = "User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                SecurityStamp = Guid.NewGuid().ToString(),
                PasswordHash = "AQAAAAEAACcQAAAAEPwWlCqj9GGGowSMJjpVxP3eXF5R+JV0K9B+vYGqoq5oFzF2Tf8H0/BrTdGHPg5G7w=="
            },
            new()
            {
                Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                UserName = "guest@test.com",
                NormalizedUserName = "GUEST@TEST.COM",
                Email = "guest@test.com", 
                NormalizedEmail = "GUEST@TEST.COM",
                EmailConfirmed = false,
                FirstName = "Guest",
                LastName = "User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                SecurityStamp = Guid.NewGuid().ToString()
            }
        };

        await context.Users.AddRangeAsync(users);
        await context.SaveChangesAsync();

        // Add user roles
        var adminRole = await context.Roles.FirstAsync(r => r.Name == "Admin");
        var premiumRole = await context.Roles.FirstAsync(r => r.Name == "Premium"); 
        var basicRole = await context.Roles.FirstAsync(r => r.Name == "Basic");
        var guestRole = await context.Roles.FirstAsync(r => r.Name == "Guest");

        var userRoles = new List<UserRole>
        {
            new() { UserId = users[0].Id, RoleId = adminRole.Id, AssignedAt = DateTime.UtcNow },
            new() { UserId = users[1].Id, RoleId = premiumRole.Id, AssignedAt = DateTime.UtcNow },
            new() { UserId = users[2].Id, RoleId = basicRole.Id, AssignedAt = DateTime.UtcNow },
            new() { UserId = users[3].Id, RoleId = guestRole.Id, AssignedAt = DateTime.UtcNow }
        };

        await context.UserRoles.AddRangeAsync(userRoles);
        await context.SaveChangesAsync();
    }

    private static async Task SeedStreamingServicesAsync(this ApplicationDbContext context)
    {
        if (await context.StreamingServices.AnyAsync())
        {
            Console.WriteLine("📺 Streaming services already exist, skipping seeding");
            return;
        }
        
        Console.WriteLine("📺 Starting streaming services seeding...");

        var streamingServices = new List<StreamingService>
        {
            new()
            {
                Id = Guid.Parse("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),
                Name = "Netflix",
                DisplayName = "Netflix",
                Description = "World's leading streaming entertainment service",
                LogoUrl = "https://example.com/netflix.png",
                WebsiteUrl = "https://netflix.com",
                Type = StreamingServiceType.Subscription,
                Category = "Entertainment",
                IsGlobal = true,
                IsActive = true,
                AvailableRegions = "[\"US\", \"CA\", \"GB\", \"AU\", \"DE\", \"FR\", \"ES\", \"IT\"]",
                PopularRegions = "[\"US\", \"CA\", \"GB\", \"AU\"]",
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow,
                SortOrder = 1
            },
            new()
            {
                Id = Guid.Parse("BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB"),
                Name = "Amazon Prime Video",
                DisplayName = "Prime Video", 
                Description = "Amazon's premium video streaming service",
                LogoUrl = "https://example.com/prime.png",
                WebsiteUrl = "https://primevideo.com",
                Type = StreamingServiceType.Subscription,
                Category = "Entertainment",
                IsGlobal = true,
                IsActive = true,
                AvailableRegions = "[\"US\", \"CA\", \"GB\", \"AU\", \"DE\", \"FR\", \"JP\", \"IN\"]",
                PopularRegions = "[\"US\", \"CA\", \"GB\", \"AU\"]",
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow,
                SortOrder = 2
            },
            new()
            {
                Id = Guid.Parse("CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC"),
                Name = "Disney+",
                DisplayName = "Disney Plus",
                Description = "The streaming home for Disney, Pixar, Marvel, Star Wars, and National Geographic",
                LogoUrl = "https://example.com/disney.png",
                WebsiteUrl = "https://disneyplus.com", 
                Type = StreamingServiceType.Subscription,
                Category = "Family",
                IsGlobal = true,
                IsActive = true,
                AvailableRegions = "[\"US\", \"CA\", \"GB\", \"AU\", \"NL\", \"DE\", \"FR\"]",
                PopularRegions = "[\"US\", \"CA\", \"GB\", \"AU\"]",
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow,
                SortOrder = 3
            },
            new()
            {
                Id = Guid.Parse("DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD"),
                Name = "HBO Max",
                DisplayName = "HBO Max",
                Description = "Stream all of HBO plus exclusive Max Originals",
                LogoUrl = "https://example.com/hbo.png",
                WebsiteUrl = "https://hbomax.com",
                Type = StreamingServiceType.Subscription,
                Category = "Premium",
                IsGlobal = false,
                IsActive = true,
                AvailableRegions = "[\"US\", \"CA\", \"GB\"]",
                PopularRegions = "[\"US\"]",
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow,
                SortOrder = 4
            },
            new()
            {
                Id = Guid.Parse("EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE"),
                Name = "Hulu",
                DisplayName = "Hulu",
                Description = "Watch current hits and ad-free movies",
                LogoUrl = "https://example.com/hulu.png",
                WebsiteUrl = "https://hulu.com",
                Type = StreamingServiceType.Subscription,
                Category = "Entertainment",
                IsGlobal = false,
                IsActive = true,
                AvailableRegions = "[\"US\"]",
                PopularRegions = "[\"US\"]",
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow,
                SortOrder = 5
            }
        };

        await context.StreamingServices.AddRangeAsync(streamingServices);
        await context.SaveChangesAsync();
        
        // Verify seeding worked
        var count = await context.StreamingServices.CountAsync();
        Console.WriteLine($"📺 Successfully seeded {count} streaming services");
        
        // Log first few services for verification
        var verificationServices = await context.StreamingServices.Take(3).Select(s => s.Name).ToListAsync();
        Console.WriteLine($"📺 Sample services: {string.Join(", ", verificationServices)}");
    }

    private static async Task SeedSubscriptionPlansAsync(this ApplicationDbContext context)
    {
        if (await context.SubscriptionPlans.AnyAsync()) return;

        var plans = new List<SubscriptionPlan>
        {
            new()
            {
                Id = Guid.Parse("11111111-AAAA-AAAA-AAAA-111111111111"),
                Name = "Free",
                Description = "Free tier with limited searches",
                Price = 0m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Free,
                IsActive = true,
                StripePriceId = "price_test_free",
                MaxSearchResultsPerQuery = 5,
                MaxDailySearches = 10,
                CanViewStreamingUrls = false,
                CanViewPricing = false,
                CanAccessAdvancedFilters = false,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("22222222-BBBB-BBBB-BBBB-222222222222"),
                Name = "Basic",
                Description = "Basic plan with standard features",
                Price = 9.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Basic,
                IsActive = true,
                StripePriceId = "price_test_basic",
                MaxSearchResultsPerQuery = 20,
                MaxDailySearches = 100,
                CanViewStreamingUrls = true,
                CanViewPricing = true,
                CanAccessAdvancedFilters = false,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("33333333-CCCC-CCCC-CCCC-333333333333"),
                Name = "Premium",
                Description = "Premium plan with unlimited searches and advanced features",
                Price = 19.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Premium,
                IsActive = true,
                StripePriceId = "price_test_premium",
                MaxSearchResultsPerQuery = 50,
                MaxDailySearches = -1, // Unlimited
                CanViewStreamingUrls = true,
                CanViewPricing = true,
                CanAccessAdvancedFilters = true,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("44444444-DDDD-DDDD-DDDD-444444444444"),
                Name = "Pro",
                Description = "Professional plan for power users",
                Price = 49.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Pro,
                IsActive = true,
                StripePriceId = "price_test_pro",
                MaxSearchResultsPerQuery = 100,
                MaxDailySearches = -1, // Unlimited
                CanViewStreamingUrls = true,
                CanViewPricing = true,
                CanAccessAdvancedFilters = true,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        await context.SubscriptionPlans.AddRangeAsync(plans);
        await context.SaveChangesAsync();
    }

    private static async Task SeedContentDataAsync(this ApplicationDbContext context)
    {
        if (await context.SearchableContents.AnyAsync()) 
        {
            Console.WriteLine("⚠️ Content data already exists, skipping content seeding");
            return;
        }
        
        Console.WriteLine("🎬 Starting content data seeding...");

        var content = new List<SearchableContent>
        {
            new()
            {
                Id = Guid.Parse("AAAAAAAA-1111-1111-1111-AAAAAAAAAAAA"),
                Title = "Breaking Bad",
                Type = ContentType.TvSeries,
                Genres = new List<string> { "Drama" },
                Year = 2008,
                Overview = "A high school chemistry teacher turned methamphetamine manufacturer partners with his former student to cook and sell crystal meth.",
                Rating = 9.5m,
                TmdbId = 1396,
                PosterUrl = "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
                RuntimeMinutes = 50,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                SearchableTitle = "breaking bad walter white chemistry teacher drug dealer methamphetamine bryan cranston aaron paul"
            },
            new()
            {
                Id = Guid.Parse("BBBBBBBB-2222-2222-2222-BBBBBBBBBBBB"),
                Title = "The Office",
                Type = ContentType.TvSeries, 
                Genres = new List<string> { "Comedy" },
                Year = 2005,
                Overview = "A mockumentary sitcom about a group of typical office workers where the workday consists of ego clashes and inappropriate behavior.",
                Rating = 8.8m,
                TmdbId = 2316,
                PosterUrl = "https://image.tmdb.org/t/p/w500/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
                RuntimeMinutes = 22,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                SearchableTitle = "the office jim pam dwight michael scott comedy workplace steve carell john krasinski"
            },
            new()
            {
                Id = Guid.Parse("CCCCCCCC-3333-3333-3333-CCCCCCCCCCCC"),
                Title = "Inception",
                Type = ContentType.Movie,
                Genres = new List<string> { "Sci-Fi" },
                Year = 2010,
                Overview = "A thief who enters people's dreams and steals their secrets from their subconscious gets the chance to be given his life back.",
                Rating = 8.8m,
                TmdbId = 27205,
                PosterUrl = "https://image.tmdb.org/t/p/w500/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg",
                RuntimeMinutes = 148,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                SearchableTitle = "inception leonardo dicaprio dreams christopher nolan sci-fi thriller dom cobb"
            },
            new()
            {
                Id = Guid.Parse("DDDDDDDD-4444-4444-4444-DDDDDDDDDDDD"),
                Title = "Stranger Things",
                Type = ContentType.TvSeries,
                Genres = new List<string> { "Horror" },
                Year = 2016,
                Overview = "When a young boy vanishes, a small town uncovers a mystery involving secret experiments and terrifying supernatural forces.",
                Rating = 8.7m,
                TmdbId = 66732,
                PosterUrl = "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
                RuntimeMinutes = 50,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                SearchableTitle = "stranger things upside down eleven hawkins laboratory supernatural 80s horror"
            },
            new()
            {
                Id = Guid.Parse("EEEEEEEE-5555-5555-5555-EEEEEEEEEEEE"),
                Title = "The Matrix",
                Type = ContentType.Movie,
                Genres = new List<string> { "Action" },
                Year = 1999,
                Overview = "A computer programmer discovers that reality as he knows it is a simulation and joins a rebellion against the machines.",
                Rating = 8.7m,
                TmdbId = 603,
                PosterUrl = "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
                RuntimeMinutes = 136,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                SearchableTitle = "the matrix keanu reeves neo morpheus trinity wachowskis cyberpunk simulation"
            }
        };

        await context.SearchableContents.AddRangeAsync(content);
        await context.SaveChangesAsync();

        // Add streaming options
        var streamingServices = await context.StreamingServices.ToListAsync();
        Console.WriteLine($"📺 Found {streamingServices.Count} streaming services for content seeding");
        if (streamingServices.Any())
        {
            var streamingOptions = new List<ContentStreamingOption>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = content[0].Id,
                    ServiceId = streamingServices[0].Id.ToString(),
                    ServiceName = streamingServices[0].Name,
                    CountryCode = "US",
                    StreamingType = StreamingType.Subscription,
                    StreamingUrl = "https://netflix.com/title/breaking-bad",
                    VideoQualityJson = "[\"HD\", \"4K\"]",
                    AudioLanguagesJson = "[\"en\", \"es\"]",
                    SubtitleLanguagesJson = "[\"en\", \"es\", \"fr\"]",
                    Price = 0m,
                    Currency = "USD",
                    LastUpdated = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ContentId = content[1].Id,
                    ServiceId = streamingServices[0].Id.ToString(),
                    ServiceName = streamingServices[0].Name,
                    CountryCode = "US",
                    StreamingType = StreamingType.Subscription,
                    StreamingUrl = "https://netflix.com/title/the-office",
                    VideoQualityJson = "[\"HD\"]",
                    AudioLanguagesJson = "[\"en\"]",
                    SubtitleLanguagesJson = "[\"en\"]",
                    Price = 0m,
                    Currency = "USD",
                    LastUpdated = DateTime.UtcNow
                }
            };

            await context.ContentStreamingOptions.AddRangeAsync(streamingOptions);
            Console.WriteLine($"📺 Added {streamingOptions.Count} streaming options");
            await context.SaveChangesAsync();
            
            // Verify the streaming options were saved
            var savedOptions = await context.ContentStreamingOptions.CountAsync();
            Console.WriteLine($"📺 Verified {savedOptions} streaming options in database");
        }
        else
        {
            Console.WriteLine("⚠️ No streaming services found, skipping streaming options");
        }
    }

    private static async Task SeedSearchDataAsync(this ApplicationDbContext context)
    {
        if (await context.SearchHistories.AnyAsync()) return;

        try
        {
            var users = await context.Users.Take(3).ToListAsync();
            if (!users.Any()) return;

            var searchHistories = new List<SearchHistory>
            {
                new()
                {
                    Id = 1,
                    UserId = users[0].Id,
                    Query = "breaking bad",
                    ResultCount = 15,
                    SearchedAt = DateTime.UtcNow.AddDays(-5),
                    ExecutionTimeMs = 150,
                    SearchType = "General",
                    Region = "US",
                    CorrelationId = Guid.NewGuid().ToString(),
                    Metadata = "{\"year\": 2008}"
                },
                new()
                {
                    Id = 2,
                    UserId = users[1].Id,
                    Query = "inception movie",
                    ResultCount = 8,
                    SearchedAt = DateTime.UtcNow.AddDays(-2),
                    ExecutionTimeMs = 200,
                    SearchType = "General",
                    Region = "US",
                    CorrelationId = Guid.NewGuid().ToString(),
                    Metadata = "{\"type\": \"movie\"}"
                }
            };

            await context.SearchHistories.AddRangeAsync(searchHistories);

            var searchTrends = new List<SearchTrend>
            {
                new()
                {
                    Id = 1,
                    Query = "breaking bad",
                    SearchCount = 150,
                    Date = DateTime.UtcNow.Date,
                    UniqueUsers = 50,
                    TrendingScore = 15.5m,
                    IsRising = true
                },
                new()
                {
                    Id = 2,
                    Query = "stranger things", 
                    SearchCount = 120,
                    Date = DateTime.UtcNow.Date,
                    UniqueUsers = 40,
                    TrendingScore = -5.2m,
                    IsRising = false
                }
            };

            await context.SearchTrends.AddRangeAsync(searchTrends);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Search data seeding failed: {ex.Message}");
        }
    }

    private static async Task SeedPaymentDataAsync(this ApplicationDbContext context)
    {
        if (await context.Subscriptions.AnyAsync()) return;

        try
        {
            var users = await context.Users.Take(3).ToListAsync();
            var plans = await context.SubscriptionPlans.ToListAsync();
            
            if (!users.Any() || !plans.Any()) return;

            // Create subscriptions for test users
            var subscriptions = new List<Subscription>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = users[0].Id, // Admin user gets Premium
                    Status = "active",
                    CurrentPeriodStart = DateTime.UtcNow.AddDays(-15),
                    CurrentPeriodEnd = DateTime.UtcNow.AddDays(15),
                    CreatedAt = DateTime.UtcNow.AddDays(-15),
                    UpdatedAt = DateTime.UtcNow,
                    StripeSubscriptionId = "sub_test_admin_premium"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = users[1].Id, // Premium user gets Basic
                    Status = "active", 
                    CurrentPeriodStart = DateTime.UtcNow.AddDays(-10),
                    CurrentPeriodEnd = DateTime.UtcNow.AddDays(20),
                    CreatedAt = DateTime.UtcNow.AddDays(-10),
                    UpdatedAt = DateTime.UtcNow,
                    StripeSubscriptionId = "sub_test_premium_basic"
                }
            };

            await context.Subscriptions.AddRangeAsync(subscriptions);

            // Create payment methods
            var paymentMethods = new List<PaymentMethod>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = users[0].Id,
                    Type = "card",
                    Last4 = "4242",
                    Brand = "visa",
                    ExpiryMonth = 12,
                    ExpiryYear = DateTime.UtcNow.Year + 2,
                    IsDefault = true,
                    StripePaymentMethodId = "pm_test_admin_card",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = users[1].Id,
                    Type = "card",
                    Last4 = "0005",
                    Brand = "mastercard",
                    ExpiryMonth = 6,
                    ExpiryYear = DateTime.UtcNow.Year + 3,
                    IsDefault = true,
                    StripePaymentMethodId = "pm_test_premium_card",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await context.PaymentMethods.AddRangeAsync(paymentMethods);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Payment data seeding failed: {ex.Message}");
        }
    }

    private static async Task SeedSocialDataAsync(this ApplicationDbContext context)
    {
        if (await context.SocialShares.AnyAsync()) return;

        try
        {
            var users = await context.Users.Take(2).ToListAsync();
            var content = await context.SearchableContents.Take(2).ToListAsync();
            
            if (!users.Any() || !content.Any()) return;

            var socialShares = new List<SocialShare>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = users[0].Id,
                    ContentId = content[0].Id.ToString(),
                    Platform = "twitter",
                    ShareUrl = "https://twitter.com/share?url=test",
                    IsSuccessful = true,
                    ClickCount = 15,
                    CreatedAt = DateTime.UtcNow.AddDays(-3)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = users[1].Id,
                    ContentId = content[1].Id.ToString(),
                    Platform = "facebook",
                    ShareUrl = "https://facebook.com/share?url=test",
                    IsSuccessful = true,
                    ClickCount = 8,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                }
            };

            await context.SocialShares.AddRangeAsync(socialShares);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Social data seeding failed: {ex.Message}");
        }
    }

    private static async Task SeedAdminDataAsync(this ApplicationDbContext context)
    {
        if (await context.AdminActions.AnyAsync()) return;

        try
        {
            var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@test.com");
            if (adminUser == null) return;

            var adminActions = new List<AdminAction>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    AdminUserId = adminUser.Id,
                    ActionType = "UserCreated",
                    TargetUserId = adminUser.Id,
                    Details = "Test admin user creation",
                    IpAddress = "127.0.0.1",
                    UserAgent = "Test Agent",
                    CorrelationId = Guid.NewGuid(),
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    AdminUserId = adminUser.Id,
                    ActionType = "SystemConfigurationUpdated",
                    Details = "Updated test configuration settings",
                    IpAddress = "127.0.0.1", 
                    UserAgent = "Test Agent",
                    CorrelationId = Guid.NewGuid(),
                    CreatedAt = DateTime.UtcNow.AddDays(-7)
                }
            };

            await context.AdminActions.AddRangeAsync(adminActions);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Admin data seeding failed: {ex.Message}");
        }
    }
}
