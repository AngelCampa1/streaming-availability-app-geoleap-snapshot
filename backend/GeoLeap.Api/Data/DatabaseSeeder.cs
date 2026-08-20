using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        // Ensure database is created and migrations are applied
        await context.Database.MigrateAsync();
        
        // Add seed data here when entities are created
        await SeedDevelopmentDataAsync(context);
    }
    
    private static async Task SeedDevelopmentDataAsync(ApplicationDbContext context)
    {
        // Seed RBAC system
        await SeedRolesAndPermissionsAsync(context);
        await SeedDevelopmentUsersAsync(context);
        
        // Seed streaming services
        await SeedStreamingServicesAsync(context);
        
        // Seed subscription plans 
        await SeedSubscriptionPlansAsync(context);
        
        // Seed searchable content
        await SeedSearchableContentAsync(context);
        
        await context.SaveChangesAsync();
    }

    private static async Task SeedRolesAndPermissionsAsync(ApplicationDbContext context)
    {
        // Skip if data already exists
        if (await context.Roles.AnyAsync()) return;

        // Create system permissions
        var permissions = new List<Permission>
        {
            // Content Access Permissions
            new() { Name = "content:search:basic", Resource = "content", Action = "search:basic", Description = "Basic search with paywall" },
            new() { Name = "content:search:full", Resource = "content", Action = "search:full", Description = "Full search results access" },
            new() { Name = "content:details:view", Resource = "content", Action = "details:view", Description = "View detailed content information" },

            // User Management Permissions
            new() { Name = "user:profile:view", Resource = "user", Action = "profile:view", Description = "View own profile" },
            new() { Name = "user:profile:edit", Resource = "user", Action = "profile:edit", Description = "Edit own profile" },
            new() { Name = "user:watchlist:manage", Resource = "user", Action = "watchlist:manage", Description = "Manage own watchlist" },
            new() { Name = "user:preferences:manage", Resource = "user", Action = "preferences:manage", Description = "Manage user preferences" },

            // Streaming Service Permissions
            new() { Name = "streaming_services:read", Resource = "streaming_services", Action = "read", Description = "View streaming service catalog" },
            new() { Name = "user_streaming_services:read", Resource = "user_streaming_services", Action = "read", Description = "View user's streaming services" },
            new() { Name = "user_streaming_services:write", Resource = "user_streaming_services", Action = "write", Description = "Add/update user's streaming services" },
            new() { Name = "user_streaming_services:delete", Resource = "user_streaming_services", Action = "delete", Description = "Remove user's streaming services" },

            // Administrative Permissions
            new() { Name = "admin:users:view", Resource = "admin", Action = "users:view", Description = "View all users" },
            new() { Name = "admin:users:manage", Resource = "admin", Action = "users:manage", Description = "Create, update, delete users" },
            new() { Name = "admin:roles:manage", Resource = "admin", Action = "roles:manage", Description = "Manage roles and permissions" },
            new() { Name = "admin:system:configure", Resource = "admin", Action = "system:configure", Description = "System configuration access" },
            new() { Name = "admin:analytics:view", Resource = "admin", Action = "analytics:view", Description = "Access analytics dashboards" }
        };

        await context.Permissions.AddRangeAsync(permissions);
        await context.SaveChangesAsync();

        // Create system roles with hierarchy (lower priority = higher privilege)
        var roles = new List<Role>
        {
            new() { Name = "Guest", Description = "Unauthenticated users with basic access", IsSystemRole = true, Priority = 1000 },
            new() { Name = "User", Description = "Authenticated users with search access", IsSystemRole = true, Priority = 500 },
            new() { Name = "Premium", Description = "Premium subscribers with full access", IsSystemRole = true, Priority = 100 },
            new() { Name = "Admin", Description = "System administrators", IsSystemRole = true, Priority = 10 },
            new() { Name = "SuperAdmin", Description = "Super administrators with full system access", IsSystemRole = true, Priority = 1 }
        };

        await context.Roles.AddRangeAsync(roles);
        await context.SaveChangesAsync();

        // Assign permissions to roles
        var rolePermissions = new List<RolePermission>();

        // Guest permissions (none - public access only)

        // User permissions
        var userRole = roles.First(r => r.Name == "User");
        var userPermissions = permissions.Where(p => p.Name.StartsWith("content:search:basic") || 
                                                    p.Name.StartsWith("user:") ||
                                                    p.Name.StartsWith("streaming_services:") ||
                                                    p.Name.StartsWith("user_streaming_services:")).ToList();
        rolePermissions.AddRange(userPermissions.Select(p => new RolePermission { RoleId = userRole.Id, PermissionId = p.Id }));

        // Premium permissions (inherit User + full content access)
        var premiumRole = roles.First(r => r.Name == "Premium");
        var premiumPermissions = permissions.Where(p => p.Name.StartsWith("content:") || 
                                                       p.Name.StartsWith("user:") ||
                                                       p.Name.StartsWith("streaming_services:") ||
                                                       p.Name.StartsWith("user_streaming_services:")).ToList();
        rolePermissions.AddRange(premiumPermissions.Select(p => new RolePermission { RoleId = premiumRole.Id, PermissionId = p.Id }));

        // Admin permissions (inherit Premium + admin access)
        var adminRole = roles.First(r => r.Name == "Admin");
        var adminPermissions = permissions.Where(p => !p.Name.StartsWith("admin:roles:manage")).ToList(); // All except role management
        rolePermissions.AddRange(adminPermissions.Select(p => new RolePermission { RoleId = adminRole.Id, PermissionId = p.Id }));

        // SuperAdmin permissions (all permissions)
        var superAdminRole = roles.First(r => r.Name == "SuperAdmin");
        rolePermissions.AddRange(permissions.Select(p => new RolePermission { RoleId = superAdminRole.Id, PermissionId = p.Id }));

        await context.RolePermissions.AddRangeAsync(rolePermissions);
        await context.SaveChangesAsync();
    }

    private static async Task SeedDevelopmentUsersAsync(ApplicationDbContext context)
    {
        // Skip if users already exist
        if (await context.Users.AnyAsync()) return;

        // Create development users
        var superAdminRole = await context.Roles.FirstAsync(r => r.Name == "SuperAdmin");
        var adminRole = await context.Roles.FirstAsync(r => r.Name == "Admin");
        var userRole = await context.Roles.FirstAsync(r => r.Name == "User");

        var users = new List<User>
        {
            new() 
            { 
                Email = "superadmin@geoleap.local", 
                PasswordHash = "hashed_password_here", // This should be properly hashed
                FirstName = "Super", 
                LastName = "Admin",
                EmailConfirmed = true,
                IsActive = true
            },
            new() 
            { 
                Email = "admin@geoleap.local", 
                PasswordHash = "hashed_password_here", // This should be properly hashed
                FirstName = "Admin", 
                LastName = "User",
                EmailConfirmed = true,
                IsActive = true
            },
            new() 
            { 
                Email = "user@geoleap.local", 
                PasswordHash = "hashed_password_here", // This should be properly hashed
                FirstName = "Test", 
                LastName = "User",
                EmailConfirmed = true,
                IsActive = true
            }
        };

        await context.Users.AddRangeAsync(users);
        await context.SaveChangesAsync();

        // Assign roles to users
        var userRoles = new List<UserRole>
        {
            new() { UserId = users[0].Id, RoleId = superAdminRole.Id },
            new() { UserId = users[1].Id, RoleId = adminRole.Id },
            new() { UserId = users[2].Id, RoleId = userRole.Id }
        };

        await context.UserRoles.AddRangeAsync(userRoles);
        await context.SaveChangesAsync();
    }

    private static async Task SeedStreamingServicesAsync(ApplicationDbContext context)
    {
        // Skip if streaming services already exist
        if (await context.StreamingServices.AnyAsync()) return;

        var streamingServices = new List<StreamingService>
        {
            // Major Global Subscription Services
            new() 
            { 
                Name = "Netflix", 
                DisplayName = "Netflix", 
                Description = "Global streaming service with original content and licensed movies/TV shows",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = true,
                SortOrder = 1,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU", "DE", "FR", "JP", "BR" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU" }),
                LogoUrl = "/images/logos/netflix.png",
                WebsiteUrl = "https://netflix.com"
            },
            new() 
            { 
                Name = "Amazon Prime Video", 
                DisplayName = "Prime Video", 
                Description = "Amazon's streaming service included with Prime membership",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = true,
                SortOrder = 2,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU", "DE", "FR", "JP", "IN" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "DE" }),
                LogoUrl = "/images/logos/prime-video.png",
                WebsiteUrl = "https://primevideo.com"
            },
            new() 
            { 
                Name = "Disney+", 
                DisplayName = "Disney+", 
                Description = "Disney's streaming service with Disney, Marvel, Star Wars, and National Geographic content",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = true,
                SortOrder = 3,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU", "NL", "DE", "FR" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU" }),
                LogoUrl = "/images/logos/disney-plus.png",
                WebsiteUrl = "https://disneyplus.com"
            },
            new() 
            { 
                Name = "Apple TV+", 
                DisplayName = "Apple TV+", 
                Description = "Apple's premium streaming service with original content",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = true,
                SortOrder = 4,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU", "DE", "FR", "JP" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU" }),
                LogoUrl = "/images/logos/apple-tv-plus.png",
                WebsiteUrl = "https://tv.apple.com"
            },
            new() 
            { 
                Name = "HBO Max", 
                DisplayName = "Max", 
                Description = "Premium streaming service with HBO content and Warner Bros. Discovery library",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 5,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "MX", "BR", "AR" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA" }),
                LogoUrl = "/images/logos/hbo-max.png",
                WebsiteUrl = "https://max.com"
            },
            
            // US-focused Services
            new() 
            { 
                Name = "Hulu", 
                DisplayName = "Hulu", 
                Description = "US streaming service with current TV shows and originals",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 6,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US" }),
                LogoUrl = "/images/logos/hulu.png",
                WebsiteUrl = "https://hulu.com"
            },
            new() 
            { 
                Name = "Paramount+", 
                DisplayName = "Paramount+", 
                Description = "ViacomCBS streaming service with CBS, Paramount, and Nickelodeon content",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 7,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "AU", "GB" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA" }),
                LogoUrl = "/images/logos/paramount-plus.png",
                WebsiteUrl = "https://paramountplus.com"
            },
            new() 
            { 
                Name = "Peacock", 
                DisplayName = "Peacock", 
                Description = "NBCUniversal's streaming service with NBC content and originals",
                Type = StreamingServiceType.AdSupported,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 8,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US" }),
                LogoUrl = "/images/logos/peacock.png",
                WebsiteUrl = "https://peacocktv.com"
            },
            
            // Anime & International
            new() 
            { 
                Name = "Crunchyroll", 
                DisplayName = "Crunchyroll", 
                Description = "Leading anime streaming service",
                Type = StreamingServiceType.Subscription,
                Category = "Anime",
                IsGlobal = true,
                SortOrder = 9,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU", "DE", "FR", "JP", "BR" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "AU", "JP" }),
                LogoUrl = "/images/logos/crunchyroll.png",
                WebsiteUrl = "https://crunchyroll.com"
            },
            
            // Free Services
            new() 
            { 
                Name = "Tubi", 
                DisplayName = "Tubi", 
                Description = "Free ad-supported streaming service",
                Type = StreamingServiceType.Free,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 20,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "AU" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US" }),
                LogoUrl = "/images/logos/tubi.png",
                WebsiteUrl = "https://tubi.tv"
            },
            new() 
            { 
                Name = "Pluto TV", 
                DisplayName = "Pluto TV", 
                Description = "Free streaming TV service with live channels and on-demand content",
                Type = StreamingServiceType.Free,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 21,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "US", "CA", "GB", "DE" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "US", "CA" }),
                LogoUrl = "/images/logos/pluto-tv.png",
                WebsiteUrl = "https://pluto.tv"
            },
            
            // Regional Services
            new() 
            { 
                Name = "BBC iPlayer", 
                DisplayName = "BBC iPlayer", 
                Description = "BBC's catch-up and live streaming service",
                Type = StreamingServiceType.Free,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 30,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "GB" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "GB" }),
                LogoUrl = "/images/logos/bbc-iplayer.png",
                WebsiteUrl = "https://iplayer.bbc.co.uk"
            },
            new() 
            { 
                Name = "Stan", 
                DisplayName = "Stan", 
                Description = "Australian streaming service with local and international content",
                Type = StreamingServiceType.Subscription,
                Category = "Movies & TV",
                IsGlobal = false,
                SortOrder = 31,
                AvailableRegions = JsonSerializer.Serialize(new List<string> { "AU" }),
                PopularRegions = JsonSerializer.Serialize(new List<string> { "AU" }),
                LogoUrl = "/images/logos/stan.png",
                WebsiteUrl = "https://stan.com.au"
            }
        };

        await context.StreamingServices.AddRangeAsync(streamingServices);
        await context.SaveChangesAsync();
    }

    private static async Task SeedSearchableContentAsync(ApplicationDbContext context)
    {
        // Skip if data already exists
        if (await context.SearchableContents.AnyAsync()) return;

        var searchableContents = new List<SearchableContent>
        {
            // Popular Movies
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 634649,
                Title = "Spider-Man: No Way Home",
                OriginalTitle = "Spider-Man: No Way Home",
                SearchableTitle = "spider man no way home",
                Type = ContentType.Movie,
                Year = 2021,
                Overview = "Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero.",
                SearchableOverview = "peter parker unmasked no longer able separate normal life high stakes super hero",
                Genres = new List<string> { "Action", "Adventure", "Science Fiction" },
                SearchableGenres = "action adventure science fiction",
                PosterUrl = "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
                Rating = 8.4m,
                RuntimeMinutes = 148,
                Language = "en",
                Popularity = 98.5m,
                AvailableCountriesCount = 25,
                AvailableServicesCount = 8,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 438148,
                Title = "Minions: The Rise of Gru",
                OriginalTitle = "Minions: The Rise of Gru",
                SearchableTitle = "minions rise gru",
                Type = ContentType.Movie,
                Year = 2022,
                Overview = "A fanboy of a supervillain supergroup known as the Vicious 6, Gru hatches a plan to become evil enough to join them.",
                SearchableOverview = "fanboy supervillain supergroup known vicious 6 gru hatches plan become evil enough join them",
                Genres = new List<string> { "Animation", "Adventure", "Comedy", "Crime", "Family" },
                SearchableGenres = "animation adventure comedy crime family",
                PosterUrl = "https://image.tmdb.org/t/p/w500/wKiOkZTN9lUUUNZLmtnwubZYONg.jpg",
                Rating = 7.8m,
                RuntimeMinutes = 87,
                Language = "en",
                Popularity = 94.2m,
                AvailableCountriesCount = 30,
                AvailableServicesCount = 6,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 335787,
                Title = "Uncharted",
                OriginalTitle = "Uncharted",
                SearchableTitle = "uncharted",
                Type = ContentType.Movie,
                Year = 2022,
                Overview = "A young street-smart, Nathan Drake and his wisecracking partner Victor 'Sully' Sullivan embark on a dangerous pursuit of 'the greatest treasure never found' while also tracking clues that may lead to Nathan's long-lost brother.",
                SearchableOverview = "young street smart nathan drake wisecracking partner victor sully sullivan embark dangerous pursuit greatest treasure never found tracking clues lead nathan long lost brother",
                Genres = new List<string> { "Action", "Adventure" },
                SearchableGenres = "action adventure",
                PosterUrl = "https://image.tmdb.org/t/p/w500/tlZpSxYuBRoVJBOpUrPdQe9FmFq.jpg",
                Rating = 7.0m,
                RuntimeMinutes = 116,
                Language = "en",
                Popularity = 89.8m,
                AvailableCountriesCount = 18,
                AvailableServicesCount = 5,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 508947,
                Title = "Turning Red",
                OriginalTitle = "Turning Red",
                SearchableTitle = "turning red",
                Type = ContentType.Movie,
                Year = 2022,
                Overview = "Thirteen-year-old Mei is experiencing the awkwardness of being a teenager with a twist – when she gets too excited, she transforms into a giant red panda.",
                SearchableOverview = "thirteen year old mei experiencing awkwardness being teenager twist gets too excited transforms giant red panda",
                Genres = new List<string> { "Animation", "Family", "Comedy", "Fantasy" },
                SearchableGenres = "animation family comedy fantasy",
                PosterUrl = "https://image.tmdb.org/t/p/w500/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg",
                Rating = 7.4m,
                RuntimeMinutes = 100,
                Language = "en",
                Popularity = 87.3m,
                AvailableCountriesCount = 22,
                AvailableServicesCount = 4,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 526896,
                Title = "Morbius",
                OriginalTitle = "Morbius",
                SearchableTitle = "morbius",
                Type = ContentType.Movie,
                Year = 2022,
                Overview = "Dangerously ill with a rare blood disorder, and determined to save others suffering his same fate, Dr. Michael Morbius attempts a desperate gamble.",
                SearchableOverview = "dangerously ill rare blood disorder determined save others suffering same fate dr michael morbius attempts desperate gamble",
                Genres = new List<string> { "Action", "Science Fiction", "Horror" },
                SearchableGenres = "action science fiction horror",
                PosterUrl = "https://image.tmdb.org/t/p/w500/6JjfSchsU6daXk2AKX8EEBjO3Fm.jpg",
                Rating = 5.1m,
                RuntimeMinutes = 104,
                Language = "en",
                Popularity = 85.1m,
                AvailableCountriesCount = 15,
                AvailableServicesCount = 7,
                UpdatedAt = DateTime.UtcNow
            },
            // Popular TV Shows
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 94997,
                Title = "House of the Dragon",
                OriginalTitle = "House of the Dragon",
                SearchableTitle = "house dragon",
                Type = ContentType.TvSeries,
                Year = 2022,
                Overview = "The Targaryen dynasty is at the absolute apex of its power, with more than 15 dragons under their yoke. Most empires crumble from such heights.",
                SearchableOverview = "targaryen dynasty absolute apex power more than 15 dragons under their yoke most empires crumble such heights",
                Genres = new List<string> { "Sci-Fi & Fantasy", "Drama", "Action & Adventure" },
                SearchableGenres = "sci-fi fantasy drama action adventure",
                PosterUrl = "https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
                Rating = 8.4m,
                RuntimeMinutes = 60,
                Language = "en",
                Popularity = 97.8m,
                AvailableCountriesCount = 35,
                AvailableServicesCount = 10,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 85271,
                Title = "Wednesday",
                OriginalTitle = "Wednesday",
                SearchableTitle = "wednesday",
                Type = ContentType.TvSeries,
                Year = 2022,
                Overview = "Wednesday Addams is sent to Nevermore Academy, a supernatural boarding school where she attempts to master her psychic powers, stop a monstrous killing spree of the town citizens, and solve the supernatural mystery that affected her family 25 years ago — all while navigating her new relationships.",
                SearchableOverview = "wednesday addams sent nevermore academy supernatural boarding school attempts master psychic powers stop monstrous killing spree town citizens solve supernatural mystery affected family 25 years ago while navigating new relationships",
                Genres = new List<string> { "Mystery", "Comedy", "Crime" },
                SearchableGenres = "mystery comedy crime",
                PosterUrl = "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
                Rating = 8.8m,
                RuntimeMinutes = 50,
                Language = "en",
                Popularity = 96.2m,
                AvailableCountriesCount = 40,
                AvailableServicesCount = 12,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 66732,
                Title = "Stranger Things",
                OriginalTitle = "Stranger Things",
                SearchableTitle = "stranger things",
                Type = ContentType.TvSeries,
                Year = 2016,
                Overview = "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
                SearchableOverview = "when young boy vanishes small town uncovers mystery involving secret experiments terrifying supernatural forces one strange little girl",
                Genres = new List<string> { "Sci-Fi & Fantasy", "Mystery", "Drama" },
                SearchableGenres = "sci-fi fantasy mystery drama",
                PosterUrl = "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
                Rating = 8.6m,
                RuntimeMinutes = 51,
                Language = "en",
                Popularity = 93.4m,
                AvailableCountriesCount = 38,
                AvailableServicesCount = 9,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 1399,
                Title = "Game of Thrones",
                OriginalTitle = "Game of Thrones",
                SearchableTitle = "game thrones",
                Type = ContentType.TvSeries,
                Year = 2011,
                Overview = "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north. Amidst the war, a neglected military order of misfits, the Night's Watch, is all that stands between the realms of men and icy horrors beyond.",
                SearchableOverview = "seven noble families fight control mythical land westeros friction between houses leads full scale war while very ancient evil awakens farthest north amidst war neglected military order misfits nights watch all stands between realms men icy horrors beyond",
                Genres = new List<string> { "Sci-Fi & Fantasy", "Drama", "Action & Adventure" },
                SearchableGenres = "sci-fi fantasy drama action adventure",
                PosterUrl = "https://image.tmdb.org/t/p/w500/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg",
                Rating = 8.4m,
                RuntimeMinutes = 57,
                Language = "en",
                Popularity = 91.7m,
                AvailableCountriesCount = 45,
                AvailableServicesCount = 15,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TmdbId = 60625,
                Title = "The Boys",
                OriginalTitle = "The Boys",
                SearchableTitle = "boys",
                Type = ContentType.TvSeries,
                Year = 2019,
                Overview = "A group of vigilantes known informally as 'The Boys' set out to take down corrupt superheroes with no more than blue-collar grit and a willingness to fight dirty.",
                SearchableOverview = "group vigilantes known informally boys set out take down corrupt superheroes no more than blue collar grit willingness fight dirty",
                Genres = new List<string> { "Sci-Fi & Fantasy", "Comedy", "Drama" },
                SearchableGenres = "sci-fi fantasy comedy drama",
                PosterUrl = "https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg",
                Rating = 8.7m,
                RuntimeMinutes = 60,
                Language = "en",
                Popularity = 90.1m,
                AvailableCountriesCount = 32,
                AvailableServicesCount = 8,
                UpdatedAt = DateTime.UtcNow
            }
        };

        await context.SearchableContents.AddRangeAsync(searchableContents);
        await context.SaveChangesAsync();
    }

    private static async Task SeedSubscriptionPlansAsync(ApplicationDbContext context)
    {
        // Skip if subscription plans already exist
        if (await context.SubscriptionPlans.AnyAsync()) return;

        var subscriptionPlans = new List<SubscriptionPlan>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Free",
                Description = "Free access with basic features and limitations",
                Price = 0.00m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Free,
                IsActive = true,
                MaxSearchResultsPerQuery = 5,
                MaxDailySearches = 20,
                CanViewStreamingUrls = false,
                CanViewPricing = false,
                CanAccessAdvancedFilters = false,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Basic",
                Description = "Basic streaming access with essential features",
                Price = 9.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Basic,
                IsActive = true,
                MaxSearchResultsPerQuery = 20,
                MaxDailySearches = 50,
                CanViewStreamingUrls = false,
                CanViewPricing = true,
                CanAccessAdvancedFilters = false,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Premium",
                Description = "Premium streaming access with advanced features",
                Price = 19.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Premium,
                IsActive = true,
                MaxSearchResultsPerQuery = -1, // Unlimited
                MaxDailySearches = -1, // Unlimited
                CanViewStreamingUrls = true,
                CanViewPricing = true,
                CanAccessAdvancedFilters = true,
                Interval = "monthly",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        await context.SubscriptionPlans.AddRangeAsync(subscriptionPlans);
        await context.SaveChangesAsync();
    }
}