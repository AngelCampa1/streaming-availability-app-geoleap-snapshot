using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for NotificationTemplateService - notification template management with DotLiquid rendering
/// Tests 23 public methods covering CRUD operations, rendering, versioning, import/export, and optimization
/// </summary>
public class NotificationTemplateServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<NotificationTemplateService>> _mockLogger;
    private readonly NotificationTemplateService _service;

    private readonly string _templateId = "test-template-001";
    private readonly string _correlationId = $"test-correlation-{Guid.NewGuid()}";

    public NotificationTemplateServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"NotificationTemplateServiceTestDb_{Guid.NewGuid()}")
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockLogger = new Mock<ILogger<NotificationTemplateService>>();

        // Create service
        _service = new NotificationTemplateService(_mockLogger.Object, _context);

        // Seed test data
        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        var template = new Models.NotificationTemplate
        {
            Id = _templateId,
            Type = "availability_change",
            Channel = "email",
            Subject = "New Content Available: {{ content.title }}",
            Template = "<p>Hello {{ user.name }},</p><p>{{ content.title }} is now available on {{ service.name }}!</p>",
            Version = "1.0",
            Language = "en",
            IsActive = true,
            DefaultData = new Dictionary<string, object>
            {
                ["user"] = new Dictionary<string, object> { ["name"] = "Test User" },
                ["content"] = new Dictionary<string, object> { ["title"] = "Test Content" },
                ["service"] = new Dictionary<string, object> { ["name"] = "Test Service" }
            },
            CreatedBy = "test-system",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-30)
        };

        var inactiveTemplate = new Models.NotificationTemplate
        {
            Id = "inactive-template",
            Type = "price_drop",
            Channel = "email",
            Subject = "Price Drop Alert",
            Template = "<p>Price dropped!</p>",
            Version = "1.0",
            Language = "en",
            IsActive = false,
            CreatedBy = "test-system",
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            UpdatedAt = DateTime.UtcNow.AddDays(-60)
        };

        await _context.NotificationTemplates.AddRangeAsync(template, inactiveTemplate);
        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // ==================== CreateTemplateAsync Tests ====================

    [Fact]
    public async Task CreateTemplateAsync_WithValidData_CreatesTemplate()
    {
        // Arrange
        var request = new CreateNotificationTemplateRequest
        {
            Id = "new-template-001",
            Type = "new_release",
            Channel = "email",
            Subject = "New Release: {{ content.title }}",
            Template = "<p>Check out {{ content.title }}!</p>",
            Version = "1.0",
            Language = "en",
            DefaultData = new Dictionary<string, object>
            {
                ["content"] = new Dictionary<string, object> { ["title"] = "Test Content" }
            },
            CreatedBy = "test-user"
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _correlationId);

        // Assert
        Assert.Equal("new-template-001", result);
        var template = await _context.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == "new-template-001");
        Assert.NotNull(template);
        Assert.True(template.IsActive);
        Assert.Equal("new_release", template.Type);
    }

    [Fact]
    public async Task CreateTemplateAsync_WithDuplicateId_ThrowsException()
    {
        // Arrange
        var request = new CreateNotificationTemplateRequest
        {
            Id = _templateId,
            Type = "test",
            Channel = "email",
            Subject = "Test",
            Template = "<p>Test</p>",
            Version = "1.0",
            Language = "en",
            DefaultData = new Dictionary<string, object>(),
            CreatedBy = "test-user"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateTemplateAsync(request, _correlationId));
    }

    [Fact]
    public async Task CreateTemplateAsync_WithInvalidTemplate_ThrowsException()
    {
        // Arrange
        var request = new CreateNotificationTemplateRequest
        {
            Id = "invalid-template",
            Type = "test",
            Channel = "email",
            Subject = "Test",
            Template = "{{ unclosed_tag",
            Version = "1.0",
            Language = "en",
            DefaultData = new Dictionary<string, object>(),
            CreatedBy = "test-user"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateTemplateAsync(request, _correlationId));
    }

    // ==================== UpdateTemplateAsync Tests ====================

    [Fact]
    public async Task UpdateTemplateAsync_WithValidData_UpdatesTemplate()
    {
        // Arrange
        var request = new UpdateNotificationTemplateRequest
        {
            Subject = "Updated Subject: {{ content.title }}",
            Template = "<p>Updated content</p>"
        };

        // Act
        var result = await _service.UpdateTemplateAsync(_templateId, request, _correlationId);

        // Assert
        Assert.True(result);
        var template = await _context.NotificationTemplates.FirstAsync(t => t.Id == _templateId);
        Assert.Equal("Updated Subject: {{ content.title }}", template.Subject);
        Assert.Equal("<p>Updated content</p>", template.Template);
    }

    [Fact]
    public async Task UpdateTemplateAsync_WithNonExistentId_ReturnsFalse()
    {
        // Arrange
        var request = new UpdateNotificationTemplateRequest
        {
            Subject = "Updated"
        };

        // Act
        var result = await _service.UpdateTemplateAsync("non-existent", request, _correlationId);

        // Assert
        Assert.False(result);
    }

    // ==================== GetTemplateAsync Tests ====================

    [Fact]
    public async Task GetTemplateAsync_WithValidId_ReturnsTemplate()
    {
        // Act
        var result = await _service.GetTemplateAsync(_templateId, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_templateId, result.Id);
        Assert.Equal("availability_change", result.Type);
    }

    [Fact]
    public async Task GetTemplateAsync_WithInactiveTemplate_ReturnsNull()
    {
        // Act
        var result = await _service.GetTemplateAsync("inactive-template", _correlationId);

        // Assert
        Assert.Null(result);
    }

    // ==================== GetTemplatesAsync Tests ====================

    [Fact]
    public async Task GetTemplatesAsync_WithNoFilters_ReturnsActiveTemplates()
    {
        // Act
        var result = await _service.GetTemplatesAsync(correlationId: _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, t => Assert.True(t.IsActive));
    }

    [Fact]
    public async Task GetTemplatesAsync_WithTypeFilter_ReturnsFilteredTemplates()
    {
        // Act
        var result = await _service.GetTemplatesAsync(type: "availability_change", correlationId: _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, t => Assert.Equal("availability_change", t.Type));
    }

    [Fact]
    public async Task GetTemplatesAsync_WithChannelFilter_ReturnsFilteredTemplates()
    {
        // Act
        var result = await _service.GetTemplatesAsync(channel: "email", correlationId: _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, t => Assert.Equal("email", t.Channel));
    }

    // ==================== DeleteTemplateAsync Tests ====================

    [Fact]
    public async Task DeleteTemplateAsync_WithValidId_SoftDeletesTemplate()
    {
        // Act
        var result = await _service.DeleteTemplateAsync(_templateId, _correlationId);

        // Assert
        Assert.True(result);
        var template = await _context.NotificationTemplates.FirstAsync(t => t.Id == _templateId);
        Assert.False(template.IsActive);
    }

    [Fact]
    public async Task DeleteTemplateAsync_WithNonExistentId_ReturnsFalse()
    {
        // Act
        var result = await _service.DeleteTemplateAsync("non-existent", _correlationId);

        // Assert
        Assert.False(result);
    }

    // ==================== ActivateTemplateAsync / DeactivateTemplateAsync Tests ====================

    [Fact]
    public async Task ActivateTemplateAsync_ActivatesTemplate()
    {
        // Act
        var result = await _service.ActivateTemplateAsync("inactive-template", _correlationId);

        // Assert
        Assert.True(result);
        var template = await _context.NotificationTemplates.FirstAsync(t => t.Id == "inactive-template");
        Assert.True(template.IsActive);
    }

    [Fact]
    public async Task DeactivateTemplateAsync_DeactivatesTemplate()
    {
        // Act
        var result = await _service.DeactivateTemplateAsync(_templateId, _correlationId);

        // Assert
        Assert.True(result);
        var template = await _context.NotificationTemplates.FirstAsync(t => t.Id == _templateId);
        Assert.False(template.IsActive);
    }

    // ==================== RenderTemplateAsync Tests ====================

    [Fact]
    public async Task RenderTemplateAsync_WithValidData_RendersTemplate()
    {
        // Arrange
        var data = new Dictionary<string, object>
        {
            ["user"] = new Dictionary<string, object> { ["name"] = "John Doe" },
            ["content"] = new Dictionary<string, object> { ["title"] = "The Matrix" },
            ["service"] = new Dictionary<string, object> { ["name"] = "Netflix" }
        };

        // Act
        var result = await _service.RenderTemplateAsync(_templateId, data, _correlationId);

        // Assert
        Assert.True(result.IsValid);
        Assert.Contains("John Doe", result.Body);
        Assert.Contains("The Matrix", result.Body);
        Assert.Contains("Netflix", result.Body);
        Assert.Contains("The Matrix", result.Subject);
    }

    [Fact]
    public async Task RenderTemplateAsync_WithMissingTemplate_ReturnsInvalid()
    {
        // Arrange
        var data = new Dictionary<string, object>();

        // Act
        var result = await _service.RenderTemplateAsync("non-existent", data, _correlationId);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotEmpty(result.Errors);
    }

    // ==================== RenderTemplateContentAsync Tests ====================

    [Fact]
    public async Task RenderTemplateContentAsync_WithValidData_RendersContent()
    {
        // Arrange
        var templateContent = "<p>Hello {{ user.name }}!</p>";
        var subject = "Welcome {{ user.name }}";
        var data = new Dictionary<string, object>
        {
            ["user"] = new Dictionary<string, object> { ["name"] = "Alice" }
        };

        // Act
        var result = await _service.RenderTemplateContentAsync(templateContent, subject, data, _correlationId);

        // Assert
        Assert.True(result.IsValid);
        Assert.Contains("Alice", result.Body);
        Assert.Contains("Alice", result.Subject);
    }

    [Fact]
    public async Task RenderTemplateContentAsync_WithMissingVariables_AddsWarnings()
    {
        // Arrange
        var templateContent = "<p>Hello {{ user.name }}! Your order {{ order.id }} is ready.</p>";
        var subject = "Order Ready";
        var data = new Dictionary<string, object>
        {
            ["user"] = new Dictionary<string, object> { ["name"] = "Bob" }
        };

        // Act
        var result = await _service.RenderTemplateContentAsync(templateContent, subject, data, _correlationId);

        // Assert
        Assert.NotEmpty(result.Warnings);
        Assert.Contains(result.MissingVariables.Keys, k => k == "order");
    }

    // ==================== ValidateTemplateAsync Tests ====================

    [Fact]
    public async Task ValidateTemplateAsync_WithValidTemplate_ReturnsTrue()
    {
        // Arrange
        var templateContent = "<p>Valid template with {{ variable }}</p>";
        var sampleData = new Dictionary<string, object> { ["variable"] = "data" };

        // Act
        var result = await _service.ValidateTemplateAsync(templateContent, sampleData, _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTemplateAsync_WithInvalidTemplate_ReturnsFalse()
    {
        // Arrange
        var templateContent = "<p>Invalid {{ unclosed tag</p>";

        // Act
        var result = await _service.ValidateTemplateAsync(templateContent, null, _correlationId);

        // Assert
        Assert.False(result);
    }

    // ==================== GetTemplatesByTypeAsync Tests ====================

    [Fact]
    public async Task GetTemplatesByTypeAsync_ReturnsFilteredTemplates()
    {
        // Act
        var result = await _service.GetTemplatesByTypeAsync("availability_change", _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, t => Assert.Equal("availability_change", t.Type));
    }

    // ==================== GetDefaultTemplateAsync Tests ====================

    [Fact]
    public async Task GetDefaultTemplateAsync_WithExactMatch_ReturnsTemplate()
    {
        // Act
        var result = await _service.GetDefaultTemplateAsync("availability_change", "email", "en", _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("availability_change", result.Type);
        Assert.Equal("email", result.Channel);
    }

    [Fact]
    public async Task GetDefaultTemplateAsync_WithFallback_ReturnsFallbackTemplate()
    {
        // Act - Request Spanish, should fallback to English
        var result = await _service.GetDefaultTemplateAsync("availability_change", "email", "es", _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("en", result.Language);
    }

    // ==================== SetDefaultTemplateAsync Tests ====================

    [Fact]
    public async Task SetDefaultTemplateAsync_WithValidId_ReturnsTrue()
    {
        // Act
        var result = await _service.SetDefaultTemplateAsync("availability_change", "email", _templateId, _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task SetDefaultTemplateAsync_WithNonExistentId_ReturnsFalse()
    {
        // Act
        var result = await _service.SetDefaultTemplateAsync("test", "email", "non-existent", _correlationId);

        // Assert
        Assert.False(result);
    }

    // ==================== CreateTemplateVersionAsync Tests ====================

    [Fact]
    public async Task CreateTemplateVersionAsync_CreatesNewVersion()
    {
        // Arrange
        var request = new UpdateNotificationTemplateRequest
        {
            Template = "<p>Updated template version</p>",
            Version = "2.0"
        };

        // Act
        var result = await _service.CreateTemplateVersionAsync(_templateId, request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("_v2.0", result);
        var version = await _context.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == result);
        Assert.NotNull(version);
        Assert.False(version.IsActive); // New versions start inactive
    }

    // ==================== GetTemplateVersionsAsync Tests ====================

    [Fact]
    public async Task GetTemplateVersionsAsync_ReturnsAllVersions()
    {
        // Arrange - Create a version first
        var request = new UpdateNotificationTemplateRequest
        {
            Template = "<p>Version 2</p>",
            Version = "2.0"
        };
        await _service.CreateTemplateVersionAsync(_templateId, request, _correlationId);

        // Act
        var result = await _service.GetTemplateVersionsAsync(_templateId, _correlationId);

        // Assert
        Assert.True(result.Count >= 2); // Original + versioned
    }

    // ==================== PromoteTemplateVersionAsync Tests ====================

    [Fact]
    public async Task PromoteTemplateVersionAsync_PromotesVersion()
    {
        // Arrange - Create a version first
        var request = new UpdateNotificationTemplateRequest
        {
            Template = "<p>Version 2</p>",
            Version = "2.0"
        };
        var versionId = await _service.CreateTemplateVersionAsync(_templateId, request, _correlationId);

        // Act
        var result = await _service.PromoteTemplateVersionAsync(_templateId, "2.0", _correlationId);

        // Assert
        Assert.True(result);
        var version = await _context.NotificationTemplates.FirstAsync(t => t.Id == versionId);
        Assert.True(version.IsActive);
    }

    // ==================== ImportTemplatesAsync Tests ====================

    [Fact]
    public async Task ImportTemplatesAsync_ImportsTemplates()
    {
        // Arrange
        var templates = new List<ImportTemplateRequest>
        {
            new ImportTemplateRequest
            {
                Id = "import-001",
                Type = "test",
                Channel = "email",
                Subject = "Test",
                Template = "<p>Test</p>",
                Language = "en"
            },
            new ImportTemplateRequest
            {
                Id = "import-002",
                Type = "test",
                Channel = "sms",
                Subject = "Test SMS",
                Template = "Test SMS content",
                Language = "en"
            }
        };

        // Act
        var result = await _service.ImportTemplatesAsync(templates, _correlationId);

        // Assert
        Assert.Equal(2, result);
        var imported = await _context.NotificationTemplates
            .Where(t => t.Id.StartsWith("import-"))
            .ToListAsync();
        Assert.Equal(2, imported.Count);
    }

    // ==================== ExportTemplatesAsync Tests ====================

    [Fact]
    public async Task ExportTemplatesAsync_ExportsTemplates()
    {
        // Act
        var result = await _service.ExportTemplatesAsync(correlationId: _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, t => Assert.True(t.IsActive));
    }

    [Fact]
    public async Task ExportTemplatesAsync_WithTypeFilter_ExportsFilteredTemplates()
    {
        // Act
        var result = await _service.ExportTemplatesAsync(type: "availability_change", correlationId: _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, t => Assert.Equal("availability_change", t.Type));
    }

    // ==================== GetTemplateUsageStatsAsync Tests ====================

    [Fact]
    public async Task GetTemplateUsageStatsAsync_ReturnsStats()
    {
        // Act
        var result = await _service.GetTemplateUsageStatsAsync(_templateId, correlationId: _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_templateId, result.TemplateId);
    }

    // ==================== GetTopPerformingTemplatesAsync Tests ====================

    [Fact]
    public async Task GetTopPerformingTemplatesAsync_ReturnsResults()
    {
        // Act
        var result = await _service.GetTopPerformingTemplatesAsync(10, _correlationId);

        // Assert
        Assert.NotNull(result);
    }

    // ==================== TestTemplateAsync Tests ====================

    [Fact]
    public async Task TestTemplateAsync_WithValidData_ReturnsValidResult()
    {
        // Arrange
        var testData = new Dictionary<string, object>
        {
            ["user"] = new Dictionary<string, object> { ["name"] = "Test User" },
            ["content"] = new Dictionary<string, object> { ["title"] = "Test Content" },
            ["service"] = new Dictionary<string, object> { ["name"] = "Test Service" }
        };

        // Act
        var result = await _service.TestTemplateAsync(_templateId, testData, _correlationId);

        // Assert
        Assert.True(result.IsValid);
        Assert.NotNull(result.RenderedResult);
        Assert.True(result.RenderTime.TotalMilliseconds > 0);
    }

    [Fact]
    public async Task TestTemplateAsync_WithMissingTemplate_ReturnsInvalid()
    {
        // Arrange
        var testData = new Dictionary<string, object>();

        // Act
        var result = await _service.TestTemplateAsync("non-existent", testData, _correlationId);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotEmpty(result.ValidationErrors);
    }

    // ==================== GetTemplateSuggestionsAsync Tests ====================

    [Fact]
    public async Task GetTemplateSuggestionsAsync_ReturnsSuggestions()
    {
        // Act
        var result = await _service.GetTemplateSuggestionsAsync("availability_change", _correlationId);

        // Assert
        Assert.NotNull(result);
        // May be empty or have suggestions based on type
    }

    // ==================== OptimizeTemplateAsync Tests ====================

    [Fact]
    public async Task OptimizeTemplateAsync_WithOptimizableContent_OptimizesTemplate()
    {
        // Arrange - Create template with optimizable content
        var createRequest = new CreateNotificationTemplateRequest
        {
            Id = "optimize-test",
            Type = "test",
            Channel = "email",
            Subject = "Test",
            Template = "<p>Test   with    extra    spaces</p><img src='test.jpg'>",
            Version = "1.0",
            Language = "en",
            DefaultData = new Dictionary<string, object>(),
            CreatedBy = "test"
        };
        await _service.CreateTemplateAsync(createRequest, _correlationId);

        // Act
        var result = await _service.OptimizeTemplateAsync("optimize-test", _correlationId);

        // Assert
        Assert.True(result);
        var template = await _context.NotificationTemplates.FirstAsync(t => t.Id == "optimize-test");
        Assert.Contains("loading=\"lazy\"", template.Template);
    }

    [Fact]
    public async Task OptimizeTemplateAsync_WithNonExistentTemplate_ReturnsFalse()
    {
        // Act
        var result = await _service.OptimizeTemplateAsync("non-existent", _correlationId);

        // Assert
        Assert.False(result);
    }
}
