using FluentAssertions;
using GeoLeap.Api.Data;
using GeoLeap.Api.Tests.Framework;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace GeoLeap.Api.Tests.Examples
{
    /// <summary>
    /// Example integration test demonstrating database operations and API testing
    /// Shows best practices for testing with controlled dependencies
    /// </summary>
    [Trait("Category", TestCategories.Integration)]
    [Trait("Priority", TestPriority.High)]
    [Collection("IntegrationTests")] // Ensure sequential execution
    public class ExampleIntegrationTest : IntegrationTestBase
    {
        private readonly ITestOutputHelper _output;
        private readonly TestDataManager _dataManager;

        public ExampleIntegrationTest(ITestOutputHelper output)
        {
            _output = output;
            _dataManager = new TestDataManager(DbContext);
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            // Configure test-specific services
            services.AddScoped<IExampleRepository, ExampleRepository>();
            
            // Mock external HTTP services
            var mockHttpClient = new HttpClient(new MockHttpMessageHandler());
            services.AddSingleton(mockHttpClient);
        }

        protected override async Task SeedTestData()
        {
            await _dataManager.SeedIntegrationTestData();
            _output.WriteLine("✅ Integration test data seeded successfully");
        }

        [Fact]
        public async Task CreateUser_WithValidData_SavesToDatabase()
        {
            // Arrange
            var userService = GetService<IUserService>();
            var userData = new CreateUserRequest
            {
                Email = "integration@test.com",
                Name = "Integration Test User",
                Password = "TestPassword123!"
            };

            // Act & Assert with timeout validation
            await AssertCompletesWithinTimeout(async () =>
            {
                var userId = await userService.CreateUserAsync(userData);

                // Verify in database
                var savedUser = await DbContext.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                // Assert
                savedUser.Should().NotBeNull();
                savedUser!.Email.Should().Be(userData.Email);
                savedUser.Name.Should().Be(userData.Name);
                savedUser.EmailVerified.Should().BeFalse(); // Default state
                
            }, TestTimeouts.Integration);

            _output.WriteLine("✅ Integration test completed - user creation and database persistence verified");
        }

        [Fact]
        public async Task GetUser_WithExistingId_ReturnsUserData()
        {
            // Arrange - Use seeded test data
            var expectedUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var userService = GetService<IUserService>();

            // Act
            var user = await userService.GetUserAsync(expectedUserId);

            // Assert
            user.Should().NotBeNull();
            user!.Id.Should().Be(expectedUserId);
            user.Email.Should().Be("test@example.com");

            _output.WriteLine($"✅ Integration test completed - user retrieval verified for ID: {expectedUserId}");
        }

        [Fact]
        public async Task ApiEndpoint_WithValidRequest_ReturnsExpectedResponse()
        {
            // Arrange
            var request = new
            {
                Name = "API Test User",
                Email = "api@test.com",
                Password = "ApiTestPassword123!"
            };
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // Act
            var response = await Client.PostAsync("/api/users", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            responseContent.Should().NotBeNullOrEmpty();

            // Verify response structure
            var createdUser = JsonSerializer.Deserialize<UserResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            createdUser.Should().NotBeNull();
            createdUser!.Email.Should().Be(request.Email);
            createdUser.Name.Should().Be(request.Name);

            _output.WriteLine($"✅ API integration test completed - endpoint responded correctly");
        }

        [Fact]
        public async Task DatabaseTransaction_WithMultipleOperations_MaintainsConsistency()
        {
            // Arrange
            var userService = GetService<IUserService>();
            var subscriptionService = GetService<ISubscriptionService>();

            var userData = new CreateUserRequest
            {
                Email = "transaction@test.com",
                Name = "Transaction Test User",
                Password = "TransactionTest123!"
            };

            // Act - Perform transactional operations
            await AssertCompletesWithinTimeout(async () =>
            {
                using var scope = CreateScope();
                var scopedDbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                
                using var transaction = await scopedDbContext.Database.BeginTransactionAsync();
                
                try
                {
                    // Create user
                    var userId = await userService.CreateUserAsync(userData);
                    
                    // Create subscription for user
                    var subscriptionData = new CreateSubscriptionRequest
                    {
                        UserId = userId,
                        PlanType = "premium",
                        PaymentMethod = "test-card"
                    };
                    
                    var subscriptionId = await subscriptionService.CreateSubscriptionAsync(subscriptionData);
                    
                    await transaction.CommitAsync();
                    
                    // Verify both operations succeeded
                    var user = await scopedDbContext.Users.FindAsync(userId);
                    var subscription = await scopedDbContext.UserSubscriptions.FindAsync(subscriptionId);
                    
                    user.Should().NotBeNull();
                    subscription.Should().NotBeNull();
                    subscription!.UserId.Should().Be(userId);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }, TestTimeouts.Integration);

            _output.WriteLine("✅ Database transaction test completed - consistency verified");
        }

        [Fact]
        public async Task ExternalServiceMock_WithPredefinedResponse_BehavesAsExpected()
        {
            // Arrange
            var externalService = GetService<IExternalApiService>();

            // Act
            var result = await externalService.FetchDataAsync("test-key");

            // Assert
            result.Should().NotBeNull();
            result.Should().Contain("mocked-response");

            _output.WriteLine("✅ External service mock test completed - mocked behavior verified");
        }

        public override async ValueTask DisposeAsync()
        {
            _dataManager?.Dispose();
            await base.DisposeAsync();
        }
    }

    // Example DTOs and service interfaces for integration testing
    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserResponse
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool EmailVerified { get; set; }
    }

    public class CreateSubscriptionRequest
    {
        public Guid UserId { get; set; }
        public string PlanType { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
    }

    // Example service interfaces
    public interface IUserService
    {
        Task<Guid> CreateUserAsync(CreateUserRequest request);
        Task<UserResponse?> GetUserAsync(Guid id);
    }

    public interface ISubscriptionService
    {
        Task<Guid> CreateSubscriptionAsync(CreateSubscriptionRequest request);
    }

    public interface IExternalApiService
    {
        Task<string> FetchDataAsync(string key);
    }

    public interface IExampleRepository
    {
        Task<T> SaveAsync<T>(T entity) where T : class;
        Task<T?> GetByIdAsync<T>(Guid id) where T : class;
    }

    // Mock HTTP message handler for external service testing
    public class MockHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, 
            System.Threading.CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(new { data = "mocked-response" }))
            };

            return Task.FromResult(response);
        }
    }
}