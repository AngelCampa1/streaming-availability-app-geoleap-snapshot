using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Tests.Infrastructure.Fakes;
using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Base class for tests that use REAL internal services with only external I/O mocked.
///
/// FEATURES:
/// - Access to real services via dependency injection
/// - Test data seeding helpers
/// - Fake service access for assertions
/// - Authentication helper methods
/// - Database cleanup between tests
///
/// EXAMPLE USAGE:
/// <code>
/// [Collection("RealServicesTest")]
/// public class SearchServiceRealTests : RealServicesTestBase
/// {
///     public SearchServiceRealTests(RealServicesTestFactory factory) : base(factory) { }
///
///     [Fact]
///     public async Task Search_ReturnsResults_WhenContentExists()
///     {
///         // Arrange - seed test data
///         await SeedTestContentAsync();
///
///         // Act - call real search service via API
///         var response = await Client.GetAsync("/api/search?q=fight");
///
///         // Assert
///         response.EnsureSuccessStatusCode();
///         var results = await response.Content.ReadFromJsonAsync<SearchResults>();
///         Assert.NotEmpty(results.Items);
///     }
/// }
/// </code>
/// </summary>
[Collection("RealServicesTest")]
public abstract class RealServicesTestBase : IClassFixture<RealServicesTestFactory>, IDisposable
{
    protected readonly HttpClient Client;
    protected readonly RealServicesTestFactory Factory;
    protected readonly IServiceScope ServiceScope;

    // Direct access to fake services for test assertions
    // These fakes capture external I/O calls for verification in tests
    // TEMPORARILY DISABLED: FakeEmailService, FakePaymentClient, FakeCacheService (interface mismatches)
    protected FakeTmdbClient TmdbClient => Factory.FakeTmdbClient;
    protected FakeSmsService SmsService => Factory.FakeSmsService;
    protected FakePushNotificationService PushService => Factory.FakePushNotificationService;

    // JSON serialization options
    protected static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    protected RealServicesTestBase(RealServicesTestFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
        ServiceScope = factory.Services.CreateScope();

        // Set default authentication
        SetAuthenticationHeader();
    }

    #region Authentication Helpers

    /// <summary>
    /// Set authentication header for subsequent requests.
    /// Defaults to "test-user-token" which creates a standard user.
    /// Use "test-admin-token" for admin-level access.
    /// Use "test-premium-token" for premium user access.
    /// </summary>
    protected void SetAuthenticationHeader(string token = "test-user-token")
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Clear authentication header for unauthenticated requests
    /// </summary>
    protected void ClearAuthentication()
    {
        Client.DefaultRequestHeaders.Authorization = null;
    }

    /// <summary>
    /// Set admin authentication
    /// </summary>
    protected void SetAdminAuthentication()
    {
        SetAuthenticationHeader("test-admin-token");
    }

    /// <summary>
    /// Set premium user authentication
    /// </summary>
    protected void SetPremiumAuthentication()
    {
        SetAuthenticationHeader("test-premium-token");
    }

    #endregion

    #region Service Access

    /// <summary>
    /// Get a real service instance from DI container.
    /// Use this to verify real service behavior or seed test data.
    /// </summary>
    protected TService GetService<TService>() where TService : notnull
    {
        return ServiceScope.ServiceProvider.GetRequiredService<TService>();
    }

    /// <summary>
    /// Get the database context for direct data manipulation
    /// </summary>
    protected ApplicationDbContext GetDbContext()
    {
        return GetService<ApplicationDbContext>();
    }

    #endregion

    #region Test Data Seeding

    /// <summary>
    /// Seed a test user into the database
    /// </summary>
    protected async Task<User> SeedTestUserAsync(
        string email = "testuser@test.com",
        string username = "testuser",
        bool isPremium = false)
    {
        var context = GetDbContext();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            UserName = username,
            NormalizedEmail = email.ToUpperInvariant(),
            NormalizedUserName = username.ToUpperInvariant(),
            EmailConfirmed = true,
            PasswordHash = "hashed_password",
            SecurityStamp = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return user;
    }

    /// <summary>
    /// Seed content to TMDB fake for search testing
    /// </summary>
    protected void SeedTestContent(
        string id = "test-content-1",
        string title = "Test Movie",
        int releaseYear = 2024,
        ContentType contentType = ContentType.Movie)
    {
        // FakeTmdbClient is already seeded with default content
        // Add additional content if needed
        if (contentType == ContentType.Movie)
        {
            TmdbClient.AddMovie(new ContentMetadata
            {
                Id = int.TryParse(id, out var parsedId) ? parsedId : id.GetHashCode(),
                Title = title,
                // ReleaseYear is read-only, set via other means if needed
                Overview = $"Test content: {title}",
                PosterPath = "/test-poster.jpg",
                BackdropPath = "/test-backdrop.jpg",
                Genres = new List<string> { "Action", "Drama" },
                VoteAverage = 7.5,
                VoteCount = 1000
            });
        }
        else
        {
            TmdbClient.AddTvShow(new ContentMetadata
            {
                Id = int.TryParse(id, out var parsedId) ? parsedId : id.GetHashCode(),
                Title = title,
                // ReleaseYear is read-only, set via other means if needed
                Overview = $"Test content: {title}",
                PosterPath = "/test-poster.jpg",
                BackdropPath = "/test-backdrop.jpg",
                Genres = new List<string> { "Drama", "Thriller" },
                VoteAverage = 8.0,
                VoteCount = 2000
            });
        }
    }

    /// <summary>
    /// Seed streaming availability for a content item.
    /// Note: IStreamingAvailabilityClient is mocked, so this is a no-op.
    /// Configure the mock directly in tests if specific behavior is needed.
    /// </summary>
    protected void SeedStreamingAvailability(
        string contentId,
        ContentType contentType,
        params (string serviceId, string countryCode)[] availability)
    {
        // IStreamingAvailabilityClient uses a mock, not a fake with state.
        // For specific streaming availability behavior, configure the mock in individual tests.
        // This method exists for API compatibility.
        Console.WriteLine($"[RealServicesTestBase] SeedStreamingAvailability called for {contentId} - configure mock directly for specific behavior");
    }

    private string GetServiceDisplayName(string serviceId) => serviceId switch
    {
        "netflix" => "Netflix",
        "prime" => "Amazon Prime Video",
        "disney" => "Disney+",
        "hulu" => "Hulu",
        "hbo" => "Max",
        "apple" => "Apple TV+",
        "peacock" => "Peacock",
        "paramount" => "Paramount+",
        _ => serviceId
    };

    #endregion

    #region HTTP Helpers

    /// <summary>
    /// POST JSON content and deserialize response
    /// </summary>
    protected async Task<TResponse?> PostJsonAsync<TRequest, TResponse>(string url, TRequest request)
    {
        var response = await Client.PostAsJsonAsync(url, request, JsonOptions);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions);
    }

    /// <summary>
    /// GET and deserialize response
    /// </summary>
    protected async Task<TResponse?> GetJsonAsync<TResponse>(string url)
    {
        var response = await Client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions);
    }

    /// <summary>
    /// PUT JSON content and deserialize response
    /// </summary>
    protected async Task<TResponse?> PutJsonAsync<TRequest, TResponse>(string url, TRequest request)
    {
        var response = await Client.PutAsJsonAsync(url, request, JsonOptions);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions);
    }

    /// <summary>
    /// DELETE and verify success
    /// </summary>
    protected async Task DeleteAsync(string url)
    {
        var response = await Client.DeleteAsync(url);
        response.EnsureSuccessStatusCode();
    }

    #endregion

    #region Assertion Helpers

    /// <summary>
    /// Assert that a push notification was sent
    /// </summary>
    protected void AssertPushNotificationSent(Guid userId, string? titleContains = null)
    {
        var notifications = PushService.GetNotificationsForUser(userId);
        Assert.NotEmpty(notifications);

        if (titleContains != null)
        {
            Assert.Contains(notifications, n => n.Title.Contains(titleContains, StringComparison.OrdinalIgnoreCase));
        }
    }

    #endregion

    #region Cleanup

    /// <summary>
    /// Reset all fakes to default state.
    /// Call this in test constructor or before each test if needed.
    /// </summary>
    protected void ResetFakes()
    {
        Factory.ResetFakes();
    }

    /// <summary>
    /// Reset database to clean state.
    /// Use sparingly as it affects all tests sharing the factory.
    /// </summary>
    protected void ResetDatabase()
    {
        Factory.ResetDatabase();
    }

    public void Dispose()
    {
        ServiceScope?.Dispose();
        Client?.Dispose();
    }

    #endregion
}

/// <summary>
/// XUnit collection definition for RealServicesTestFactory.
/// Tests using this collection share the same factory instance.
/// </summary>
[CollectionDefinition("RealServicesTest")]
public class RealServicesTestCollection : ICollectionFixture<RealServicesTestFactory>
{
}
