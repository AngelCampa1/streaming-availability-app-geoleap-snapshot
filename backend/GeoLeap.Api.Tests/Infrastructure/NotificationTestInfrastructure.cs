using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Moq;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using System.Diagnostics;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Specialized test infrastructure for US-8.2 Notification System testing
/// Provides comprehensive mocking, data management, and validation utilities
/// Follows MinimalTestBase patterns for 100% reliability
/// </summary>
public class NotificationTestInfrastructure : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationTestInfrastructure> _logger;

    // Mock services for notification testing
    public Mock<IEmailService> MockEmailService { get; }
    public Mock<IPushNotificationService> MockPushService { get; }
    public Mock<ISmsService> MockSmsService { get; }
    public Mock<INotificationTemplateService> MockTemplateService { get; }
    
    // Test data factories
    public NotificationTestDataFactory DataFactory { get; }
    
    // Performance monitoring
    public NotificationPerformanceTracker PerformanceTracker { get; }
    
    // Validation utilities
    public NotificationTestValidator Validator { get; }

    public NotificationTestInfrastructure()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"NotificationTest_{Guid.NewGuid()}")
            .EnableSensitiveDataLogging()
            .Options;
        _context = new ApplicationDbContext(options);

        // Create logger
        using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        _logger = loggerFactory.CreateLogger<NotificationTestInfrastructure>();

        // Initialize mock services
        MockEmailService = CreateEmailServiceMock();
        MockPushService = CreatePushServiceMock();
        MockSmsService = CreateSmsServiceMock();
        MockTemplateService = CreateTemplateServiceMock();

        // Setup service collection
        var services = new ServiceCollection();
        ConfigureTestServices(services);
        _serviceProvider = services.BuildServiceProvider();

        // Initialize utilities
        DataFactory = new NotificationTestDataFactory(_context);
        PerformanceTracker = new NotificationPerformanceTracker();
        Validator = new NotificationTestValidator(_context);
    }

    private void ConfigureTestServices(IServiceCollection services)
    {
        // Add logging
        services.AddLogging(builder => builder.AddConsole());

        // Add database context
        services.AddScoped(_ => _context);

        // Add mock services
        services.AddScoped(_ => MockEmailService.Object);
        services.AddScoped(_ => MockPushService.Object);
        services.AddScoped(_ => MockSmsService.Object);
        services.AddScoped(_ => MockTemplateService.Object);

        // Add real notification services for integration testing
        services.AddScoped<NotificationService>();
        services.AddScoped<WatchlistNotificationService>();
        services.AddScoped<NotificationPreferencesService>();
        services.AddScoped<NotificationEngine>();
    }

    private Mock<IEmailService> CreateEmailServiceMock()
    {
        var mock = new Mock<IEmailService>();
        
        // Setup successful email sending - using explicit method signature
        mock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.FromResult(true));

        return mock;
    }

    private Mock<IPushNotificationService> CreatePushServiceMock()
    {
        var mock = new Mock<IPushNotificationService>();
        
        // Setup successful push notification sending
        mock.Setup(x => x.SendPushNotificationAsync(
            It.IsAny<Guid>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<Dictionary<string, object>>()))
            .ReturnsAsync(true);
            
        // Setup device registration
        mock.Setup(x => x.RegisterDeviceTokenAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        return mock;
    }

    private Mock<ISmsService> CreateSmsServiceMock()
    {
        var mock = new Mock<ISmsService>();
        
        // Setup successful SMS sending
        mock.Setup(x => x.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);
            
        // Setup SMS validation
        mock.Setup(x => x.VerifyPhoneNumberAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        return mock;
    }

    private Mock<INotificationTemplateService> CreateTemplateServiceMock()
    {
        var mock = new Mock<INotificationTemplateService>();
        
        // Setup template rendering
        mock.Setup(x => x.RenderTemplateAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<string>()))
            .ReturnsAsync(new RenderedNotificationResult
            {
                Subject = "Test Subject",
                Body = "Rendered notification template",
                IsValid = true
            });
            
        // Setup template validation
        mock.Setup(x => x.ValidateTemplateAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        return mock;
    }

    public T GetService<T>() where T : notnull
    {
        return _serviceProvider.GetRequiredService<T>();
    }

    public async Task SeedTestDataAsync()
    {
        await DataFactory.SeedBasicNotificationDataAsync();
    }

    public void Dispose()
    {
        _context?.Dispose();
        if (_serviceProvider is IDisposable disposableProvider)
        {
            disposableProvider.Dispose();
        }
        GC.SuppressFinalize(this);
    }
}

/// <summary>
/// Factory for creating test data specific to notification testing
/// </summary>
public class NotificationTestDataFactory
{
    private readonly ApplicationDbContext _context;

    public NotificationTestDataFactory(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedBasicNotificationDataAsync()
    {
        // Create test users
        var users = CreateTestUsers(10);
        _context.Users.AddRange(users);

        // Create notification settings for users
        var settings = users.Select(CreateNotificationSettingsForUser);
        _context.WatchlistNotificationSettings.AddRange(settings);

        // Create sample watchlist items
        var watchlists = users.Select(CreateWatchlistForUser);
        _context.Watchlists.AddRange(watchlists);

        await _context.SaveChangesAsync();
    }

    public List<User> CreateTestUsers(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new User
            {
                Id = Guid.NewGuid(),
                Email = $"testuser{i}@notification-test.com",
                FirstName = $"Test{i}",
                LastName = "User",
                PhoneNumber = $"+1555{i:D7}",
                PreferredLanguage = i % 3 == 0 ? "es-ES" : i % 3 == 1 ? "fr-FR" : "en-US",
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                IsActive = true
            }).ToList();
    }

    public WatchlistNotificationSettings CreateNotificationSettingsForUser(User user)
    {
        return new WatchlistNotificationSettings
        {
            UserId = user.Id,
            NotifyOnAvailabilityChange = true,
            NotifyOnLeavingPlatform = true,
            NotifyOnRegionalChanges = user.Id.GetHashCode() % 2 == 0, // 50% enable regional
            NotifyOnContentExpiring = true,
            WeeklyDigest = true,
            MonthlyDigest = user.Id.GetHashCode() % 3 == 0, // 33% enable monthly
            PreferredNotificationMethod = user.Id.GetHashCode() % 3 == 0 ? "push" : "email",
            DigestNotificationMethod = "email",
            UrgentNotificationMethod = "both",
            QuietHoursStart = new TimeSpan(22, 0, 0),
            QuietHoursEnd = new TimeSpan(8, 0, 0),
            DigestDeliveryTime = new TimeSpan(9, 0, 0),
            NotificationGenresJson = """["Action", "Drama", "Comedy"]""",
            ExcludedGenresJson = """["Horror"]""",
            PreferredServicesJson = """["Netflix", "Amazon Prime", "Disney+"]""",
            MinimumRating = 6.5m
        };
    }

    public Watchlist CreateWatchlistForUser(User user)
    {
        return new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "My Watchlist",
            Description = "Test watchlist for notifications",
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            IsPublic = false
        };
    }

    public List<WatchlistItemDto> CreateTestWatchlistItems(int count)
    {
        var titles = new[] { "Action Movie", "Drama Series", "Comedy Film", "Thriller Show", "Documentary" };
        var genres = new[] { new[] { "Action" }, new[] { "Drama" }, new[] { "Comedy" }, new[] { "Thriller" }, new[] { "Documentary" } };

        return Enumerable.Range(1, count)
            .Select(i => new WatchlistItemDto
            {
                Id = Guid.NewGuid(),
                Title = $"{titles[i % titles.Length]} {i}",
                ContentType = i % 2 == 0 ? "movie" : "series",
                ContentId = $"tmdb_{1000 + i}",
                ReleaseYear = 2020 + (i % 4),
                Rating = 6.0m + (i % 5),
                Genres = genres[i % genres.Length].ToList(),
                IsCurrentlyAvailable = i % 3 != 0, // 66% available
                Overview = $"Test content description for item {i}"
            }).ToList();
    }
}

/// <summary>
/// Performance tracking utility for notification tests
/// </summary>
public class NotificationPerformanceTracker
{
    private readonly Dictionary<string, List<TimeSpan>> _operationTimes = new();
    private readonly Dictionary<string, int> _operationCounts = new();

    public void StartOperation(string operationName)
    {
        // Implementation would track operation start time
        if (!_operationCounts.ContainsKey(operationName))
        {
            _operationCounts[operationName] = 0;
            _operationTimes[operationName] = new List<TimeSpan>();
        }
        _operationCounts[operationName]++;
    }

    public void EndOperation(string operationName, TimeSpan duration)
    {
        if (_operationTimes.ContainsKey(operationName))
        {
            _operationTimes[operationName].Add(duration);
        }
    }

    public NotificationPerformanceReport GetReport()
    {
        var operations = _operationTimes.Select(kvp => new OperationPerformance
        {
            OperationName = kvp.Key,
            TotalExecutions = _operationCounts.GetValueOrDefault(kvp.Key, 0),
            AverageTime = kvp.Value.Any() ? kvp.Value.Average(t => t.TotalMilliseconds) : 0,
            MinTime = kvp.Value.Any() ? kvp.Value.Min(t => t.TotalMilliseconds) : 0,
            MaxTime = kvp.Value.Any() ? kvp.Value.Max(t => t.TotalMilliseconds) : 0
        }).ToList();

        return new NotificationPerformanceReport { Operations = operations };
    }
}

/// <summary>
/// Validation utility for notification test assertions
/// </summary>
public class NotificationTestValidator
{
    private readonly ApplicationDbContext _context;

    public NotificationTestValidator(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> ValidateNotificationDeliveryAsync(Guid userId, string notificationType)
    {
        var deliveryLog = await _context.NotificationDeliveryLogs
            .FirstOrDefaultAsync(n => n.UserId == userId && n.NotificationType == notificationType);
        return deliveryLog != null;
    }

    public async Task<bool> ValidateUserPreferencesAsync(Guid userId)
    {
        var settings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);
        return settings != null;
    }

    public async Task<int> CountNotificationsAsync(Guid userId, DateTime since)
    {
        return await _context.UserNotifications
            .CountAsync(n => n.UserId == userId && n.CreatedAt >= since);
    }

    public bool ValidateNotificationContent(string content, params string[] requiredElements)
    {
        return requiredElements.All(element => content.Contains(element));
    }
}

// Supporting classes
public class NotificationPerformanceReport
{
    public List<OperationPerformance> Operations { get; set; } = new();
}

public class OperationPerformance
{
    public string OperationName { get; set; } = string.Empty;
    public int TotalExecutions { get; set; }
    public double AverageTime { get; set; }
    public double MinTime { get; set; }
    public double MaxTime { get; set; }
}