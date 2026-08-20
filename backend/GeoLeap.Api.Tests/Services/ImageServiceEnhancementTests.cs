using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

public class ImageServiceEnhancementTests
{
    private readonly ImageService _imageService;
    private readonly Mock<ILogger<ImageService>> _mockLogger;
    private readonly TmdbSettings _tmdbSettings;

    public ImageServiceEnhancementTests()
    {
        _tmdbSettings = new TmdbSettings
        {
            ApiKey = "test-api-key",
            BaseUrl = "https://api.themoviedb.org/3",
            ImageBaseUrl = "https://image.tmdb.org/t/p/"
        };

        var mockOptions = new Mock<IOptionsMonitor<TmdbSettings>>();
        mockOptions.Setup(x => x.CurrentValue).Returns(_tmdbSettings);

        _mockLogger = new Mock<ILogger<ImageService>>();

        _imageService = new ImageService(mockOptions.Object, _mockLogger.Object);
    }

    [Fact]
    public void ConstructTmdbUrl_WithRelativePath_ReturnsAbsoluteUrl()
    {
        // Arrange
        var relativePath = "/abc123.jpg";

        // Act
        var result = _imageService.ConstructTmdbUrl(relativePath, ImageSize.W500);

        // Assert
        Assert.Equal("https://image.tmdb.org/t/p/w500/abc123.jpg", result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithAbsoluteHttpsPath_ReturnsUnchanged()
    {
        // Arrange
        var absolutePath = "https://example.com/image.jpg";

        // Act
        var result = _imageService.ConstructTmdbUrl(absolutePath, ImageSize.W500);

        // Assert
        Assert.Equal("https://example.com/image.jpg", result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithAbsoluteHttpPath_ReturnsUnchanged()
    {
        // Arrange
        var absolutePath = "http://example.com/image.jpg";

        // Act
        var result = _imageService.ConstructTmdbUrl(absolutePath, ImageSize.W500);

        // Assert
        Assert.Equal("http://example.com/image.jpg", result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithNull_ReturnsEmptyString()
    {
        // Arrange
        string? nullPath = null;

        // Act
        var result = _imageService.ConstructTmdbUrl(nullPath, ImageSize.W500);

        // Assert
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithEmptyString_ReturnsEmptyString()
    {
        // Arrange
        var emptyPath = string.Empty;

        // Act
        var result = _imageService.ConstructTmdbUrl(emptyPath, ImageSize.W500);

        // Assert
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithWhitespace_ReturnsEmptyString()
    {
        // Arrange
        var whitespacePath = "   ";

        // Act
        var result = _imageService.ConstructTmdbUrl(whitespacePath, ImageSize.W500);

        // Assert
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void ConstructTmdbUrl_UsesCorrectSize_W500()
    {
        // Arrange
        var relativePath = "/poster.jpg";

        // Act
        var result = _imageService.ConstructTmdbUrl(relativePath, ImageSize.W500);

        // Assert
        Assert.Contains("/w500/", result);
    }

    [Fact]
    public void ConstructTmdbUrl_UsesCorrectSize_W1280()
    {
        // Arrange
        var relativePath = "/backdrop.jpg";

        // Act
        var result = _imageService.ConstructTmdbUrl(relativePath, ImageSize.W1280);

        // Assert
        Assert.Contains("/w1280/", result);
    }

    [Fact]
    public void ConstructTmdbUrl_UsesCorrectSize_Original()
    {
        // Arrange
        var relativePath = "/highres.jpg";

        // Act
        var result = _imageService.ConstructTmdbUrl(relativePath, ImageSize.Original);

        // Assert
        Assert.Contains("/original/", result);
    }

    [Theory]
    [InlineData("/poster.jpg", ImageSize.W185, "https://image.tmdb.org/t/p/w185/poster.jpg")]
    [InlineData("/poster.png", ImageSize.W342, "https://image.tmdb.org/t/p/w342/poster.png")]
    [InlineData("/backdrop.webp", ImageSize.W780, "https://image.tmdb.org/t/p/w780/backdrop.webp")]
    public void ConstructTmdbUrl_WithVariousSizes_GeneratesCorrectUrls(string path, ImageSize size, string expected)
    {
        // Act
        var result = _imageService.ConstructTmdbUrl(path, size);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithInvalidPath_NoLeadingSlash_ReturnsEmptyString()
    {
        // Arrange
        var invalidPath = "abc123.jpg"; // Missing leading slash

        // Act
        var result = _imageService.ConstructTmdbUrl(invalidPath, ImageSize.W500);

        // Assert
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void ConstructTmdbUrl_WithInvalidPath_SecurityCheck_ReturnsEmptyString()
    {
        // Arrange
        var maliciousPath = "/../../../etc/passwd"; // Path traversal attempt

        // Act
        var result = _imageService.ConstructTmdbUrl(maliciousPath, ImageSize.W500);

        // Assert
        Assert.Equal(string.Empty, result); // Should reject paths with ".."
    }

    [Fact]
    public void ConstructTmdbUrl_WithInvalidExtension_ReturnsEmptyString()
    {
        // Arrange
        var invalidExtension = "/image.txt"; // Not an image extension

        // Act
        var result = _imageService.ConstructTmdbUrl(invalidExtension, ImageSize.W500);

        // Assert
        Assert.Equal(string.Empty, result); // Should only accept jpg, png, webp
    }
}
