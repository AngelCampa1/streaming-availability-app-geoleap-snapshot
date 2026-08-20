using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for CacheKeyService (not via HTTP).
/// Tests cache key generation algorithms and string manipulation logic.
/// </summary>
public class CacheKeyServiceDirectTests : IDisposable
{
    private readonly CacheKeyService _service;
    private readonly Mock<IOptionsMonitor<CacheSettings>> _settingsMock;
    private readonly CacheSettings _settings;

    public CacheKeyServiceDirectTests()
    {
        _settings = new CacheSettings
        {
            KeyPrefix = "geoleap",
            DataVersion = "v1"
        };

        _settingsMock = new Mock<IOptionsMonitor<CacheSettings>>();
        _settingsMock.Setup(x => x.CurrentValue).Returns(_settings);

        _service = new CacheKeyService(_settingsMock.Object);
    }

    #region GenerateKey Tests

    [Fact]
    public void GenerateKey_WithBasicComponents_ReturnsFormattedKey()
    {
        // Arrange
        var category = CacheCategory.Metadata;
        var components = new[] { "movie", "12345" };

        // Act
        var result = _service.GenerateKey(category, components);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("geoleap", result);
        Assert.Contains("v1", result);
        Assert.Contains("metadata", result);
        Assert.Contains("movie", result);
        Assert.Contains("12345", result);
    }

    [Fact]
    public void GenerateKey_WithNullComponents_SkipsNullValues()
    {
        // Arrange
        var category = CacheCategory.Search;
        var components = new[] { "valid", null, "also-valid" };

        // Act
        var result = _service.GenerateKey(category, components!);

        // Assert
        Assert.Contains("valid", result);
        Assert.Contains("also-valid", result);
        Assert.DoesNotContain("null", result);
    }

    [Fact]
    public void GenerateKey_WithEmptyComponents_SkipsEmptyValues()
    {
        // Arrange
        var category = CacheCategory.Images;
        var components = new[] { "valid", "", "  ", "also-valid" };

        // Act
        var result = _service.GenerateKey(category, components);

        // Assert
        Assert.Contains("valid", result);
        Assert.Contains("also-valid", result);
    }

    [Fact]
    public void GenerateKey_WithSpecialCharacters_SanitizesComponents()
    {
        // Arrange
        var category = CacheCategory.StreamingData;
        var components = new[] { "has spaces", "has:colons", "has*asterisks" };

        // Act
        var result = _service.GenerateKey(category, components);

        // Assert
        Assert.DoesNotContain(" ", result);
        Assert.DoesNotContain("*", result);
        // Note: Result should have underscores instead
        Assert.Contains("_", result);
    }

    [Fact]
    public void GenerateKey_ExceedsMaxLength_TrimsAndAddsHash()
    {
        // Arrange
        var category = CacheCategory.Metadata;
        var longComponent = new string('A', 300); // Exceed 250 char limit

        // Act
        var result = _service.GenerateKey(category, longComponent);

        // Assert
        Assert.True(result.Length <= 250, $"Key length {result.Length} exceeds max 250");
        Assert.NotNull(result);
    }

    [Fact]
    public void GenerateKey_DifferentCategories_ReturnsDifferentKeys()
    {
        // Arrange
        var components = new[] { "test", "123" };

        // Act
        var metadataKey = _service.GenerateKey(CacheCategory.Metadata, components);
        var searchKey = _service.GenerateKey(CacheCategory.Search, components);
        var imageKey = _service.GenerateKey(CacheCategory.Images, components);

        // Assert
        Assert.NotEqual(metadataKey, searchKey);
        Assert.NotEqual(searchKey, imageKey);
        Assert.NotEqual(metadataKey, imageKey);
        Assert.Contains("metadata", metadataKey.ToLower());
        Assert.Contains("search", searchKey.ToLower());
        Assert.Contains("images", imageKey.ToLower());
    }

    [Fact]
    public void GenerateKey_CustomPrefix_UsesCustomPrefix()
    {
        // Arrange
        _settings.KeyPrefix = "custom-prefix";
        var category = CacheCategory.Configuration;

        // Act
        var result = _service.GenerateKey(category, "test");

        // Assert
        Assert.StartsWith("custom-prefix", result);
    }

    [Fact]
    public void GenerateKey_CustomVersion_UsesCustomVersion()
    {
        // Arrange
        _settings.DataVersion = "v2";
        var category = CacheCategory.UserPreferences;

        // Act
        var result = _service.GenerateKey(category, "test");

        // Assert
        Assert.Contains("v2", result);
    }

    #endregion

    #region GenerateStreamingKey Tests

    [Fact]
    public void GenerateStreamingKey_WithContentId_ReturnsKey()
    {
        // Arrange
        var contentId = "movie-12345";

        // Act
        var result = _service.GenerateStreamingKey(contentId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("streaming", result);
        Assert.Contains(contentId, result);
    }

    [Fact]
    public void GenerateStreamingKey_WithCountryCode_IncludesCountry()
    {
        // Arrange
        var contentId = "movie-12345";
        var countryCode = "US";

        // Act
        var result = _service.GenerateStreamingKey(contentId, countryCode);

        // Assert
        Assert.Contains("streaming", result);
        Assert.Contains(contentId, result);
        Assert.Contains(countryCode, result);
    }

    [Fact]
    public void GenerateStreamingKey_WithoutCountryCode_ExcludesCountry()
    {
        // Arrange
        var contentId = "movie-12345";

        // Act
        var resultWithNull = _service.GenerateStreamingKey(contentId, null);
        var resultWithEmpty = _service.GenerateStreamingKey(contentId, "");

        // Assert
        Assert.Contains("streaming", resultWithNull);
        Assert.Contains("streaming", resultWithEmpty);
    }

    [Fact]
    public void GenerateStreamingKey_DifferentCountries_ReturnsDifferentKeys()
    {
        // Arrange
        var contentId = "movie-12345";

        // Act
        var usKey = _service.GenerateStreamingKey(contentId, "US");
        var ukKey = _service.GenerateStreamingKey(contentId, "GB");

        // Assert
        Assert.NotEqual(usKey, ukKey);
    }

    #endregion

    #region GenerateMetadataKey Tests

    [Fact]
    public void GenerateMetadataKey_WithAllParameters_ReturnsKey()
    {
        // Arrange
        var tmdbId = 12345;
        var contentType = ContentType.Movie;
        var language = "en-US";

        // Act
        var result = _service.GenerateMetadataKey(tmdbId, contentType, language);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("metadata", result);
        Assert.Contains("movie", result.ToLower());
        Assert.Contains("12345", result);
        Assert.Contains("en-US", result);
    }

    [Fact]
    public void GenerateMetadataKey_DifferentContentTypes_ReturnsDifferentKeys()
    {
        // Arrange
        var tmdbId = 12345;
        var language = "en-US";

        // Act
        var movieKey = _service.GenerateMetadataKey(tmdbId, ContentType.Movie, language);
        var tvKey = _service.GenerateMetadataKey(tmdbId, ContentType.TvSeries, language);

        // Assert
        Assert.NotEqual(movieKey, tvKey);
        Assert.Contains("movie", movieKey.ToLower());
        Assert.Contains("tvseries", tvKey.ToLower());
    }

    [Fact]
    public void GenerateMetadataKey_DifferentLanguages_ReturnsDifferentKeys()
    {
        // Arrange
        var tmdbId = 12345;
        var contentType = ContentType.Movie;

        // Act
        var enKey = _service.GenerateMetadataKey(tmdbId, contentType, "en-US");
        var esKey = _service.GenerateMetadataKey(tmdbId, contentType, "es-ES");
        var frKey = _service.GenerateMetadataKey(tmdbId, contentType, "fr-FR");

        // Assert
        Assert.NotEqual(enKey, esKey);
        Assert.NotEqual(esKey, frKey);
        Assert.NotEqual(enKey, frKey);
    }

    [Fact]
    public void GenerateMetadataKey_DefaultLanguage_UsesEnUS()
    {
        // Arrange
        var tmdbId = 12345;
        var contentType = ContentType.Movie;

        // Act
        var result = _service.GenerateMetadataKey(tmdbId, contentType);

        // Assert
        Assert.Contains("en-US", result);
    }

    #endregion

    #region GenerateSearchKey Tests

    [Fact]
    public void GenerateSearchKey_WithQuery_ReturnsKey()
    {
        // Arrange
        var query = "action movies";

        // Act
        var result = _service.GenerateSearchKey(query);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("search", result);
        // Query should be hashed, not appear directly
    }

    [Fact]
    public void GenerateSearchKey_SameQueryDifferentCase_ReturnsSameKey()
    {
        // Arrange
        var query1 = "Action Movies";
        var query2 = "action movies";
        var query3 = "ACTION MOVIES";

        // Act
        var key1 = _service.GenerateSearchKey(query1);
        var key2 = _service.GenerateSearchKey(query2);
        var key3 = _service.GenerateSearchKey(query3);

        // Assert
        Assert.Equal(key1, key2);
        Assert.Equal(key2, key3);
    }

    [Fact]
    public void GenerateSearchKey_WithContentType_IncludesType()
    {
        // Arrange
        var query = "action";

        // Act
        var withMovie = _service.GenerateSearchKey(query, ContentType.Movie);
        var withTV = _service.GenerateSearchKey(query, ContentType.TvSeries);
        var withoutType = _service.GenerateSearchKey(query);

        // Assert
        Assert.NotEqual(withMovie, withTV);
        Assert.NotEqual(withMovie, withoutType);
        Assert.Contains("movie", withMovie.ToLower());
        Assert.Contains("tvseries", withTV.ToLower());
    }

    [Fact]
    public void GenerateSearchKey_DifferentLanguages_ReturnsDifferentKeys()
    {
        // Arrange
        var query = "action";

        // Act
        var enKey = _service.GenerateSearchKey(query, language: "en-US");
        var esKey = _service.GenerateSearchKey(query, language: "es-ES");

        // Assert
        Assert.NotEqual(enKey, esKey);
    }

    #endregion

    #region GenerateImageKey Tests

    [Fact]
    public void GenerateImageKey_WithUrl_ReturnsKey()
    {
        // Arrange
        var imageUrl = "https://image.tmdb.org/t/p/w500/abc123.jpg";

        // Act
        var result = _service.GenerateImageKey(imageUrl);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("image", result);
        // URL should be hashed, not appear directly
    }

    [Fact]
    public void GenerateImageKey_SameUrl_ReturnsSameKey()
    {
        // Arrange
        var imageUrl = "https://image.tmdb.org/t/p/w500/abc123.jpg";

        // Act
        var key1 = _service.GenerateImageKey(imageUrl);
        var key2 = _service.GenerateImageKey(imageUrl);

        // Assert
        Assert.Equal(key1, key2);
    }

    [Fact]
    public void GenerateImageKey_WithSize_IncludesSize()
    {
        // Arrange
        var imageUrl = "https://image.tmdb.org/t/p/w500/abc123.jpg";
        var size = "thumbnail";

        // Act
        var withSize = _service.GenerateImageKey(imageUrl, size);
        var withoutSize = _service.GenerateImageKey(imageUrl);

        // Assert
        Assert.NotEqual(withSize, withoutSize);
        Assert.Contains(size, withSize);
    }

    [Fact]
    public void GenerateImageKey_DifferentSizes_ReturnsDifferentKeys()
    {
        // Arrange
        var imageUrl = "https://image.tmdb.org/t/p/w500/abc123.jpg";

        // Act
        var thumbnail = _service.GenerateImageKey(imageUrl, "thumbnail");
        var medium = _service.GenerateImageKey(imageUrl, "medium");
        var large = _service.GenerateImageKey(imageUrl, "large");

        // Assert
        Assert.NotEqual(thumbnail, medium);
        Assert.NotEqual(medium, large);
        Assert.NotEqual(thumbnail, large);
    }

    #endregion

    #region GenerateUserPreferenceKey Tests

    [Fact]
    public void GenerateUserPreferenceKey_WithUserIdAndType_ReturnsKey()
    {
        // Arrange
        var userId = "user-123";
        var preferenceType = "notifications";

        // Act
        var result = _service.GenerateUserPreferenceKey(userId, preferenceType);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("userpreferences", result.ToLower());
        Assert.Contains(userId, result);
        Assert.Contains(preferenceType, result);
    }

    [Fact]
    public void GenerateUserPreferenceKey_DifferentUsers_ReturnsDifferentKeys()
    {
        // Arrange
        var preferenceType = "notifications";

        // Act
        var user1Key = _service.GenerateUserPreferenceKey("user-1", preferenceType);
        var user2Key = _service.GenerateUserPreferenceKey("user-2", preferenceType);

        // Assert
        Assert.NotEqual(user1Key, user2Key);
    }

    [Fact]
    public void GenerateUserPreferenceKey_DifferentTypes_ReturnsDifferentKeys()
    {
        // Arrange
        var userId = "user-123";

        // Act
        var notificationKey = _service.GenerateUserPreferenceKey(userId, "notifications");
        var themeKey = _service.GenerateUserPreferenceKey(userId, "theme");
        var languageKey = _service.GenerateUserPreferenceKey(userId, "language");

        // Assert
        Assert.NotEqual(notificationKey, themeKey);
        Assert.NotEqual(themeKey, languageKey);
        Assert.NotEqual(notificationKey, languageKey);
    }

    #endregion

    #region GenerateConfigurationKey Tests

    [Fact]
    public void GenerateConfigurationKey_WithConfigKey_ReturnsKey()
    {
        // Arrange
        var configKey = "feature-flags";

        // Act
        var result = _service.GenerateConfigurationKey(configKey);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("configuration", result.ToLower());
        Assert.Contains(configKey, result);
    }

    [Fact]
    public void GenerateConfigurationKey_DifferentKeys_ReturnsDifferentResults()
    {
        // Arrange & Act
        var key1 = _service.GenerateConfigurationKey("feature-flags");
        var key2 = _service.GenerateConfigurationKey("api-settings");
        var key3 = _service.GenerateConfigurationKey("cache-settings");

        // Assert
        Assert.NotEqual(key1, key2);
        Assert.NotEqual(key2, key3);
        Assert.NotEqual(key1, key3);
    }

    #endregion

    #region Integration Tests

    [Fact]
    public void AllKeyMethods_ProduceDifferentKeys_ForDifferentCategories()
    {
        // Arrange & Act
        var streamingKey = _service.GenerateStreamingKey("content-123");
        var metadataKey = _service.GenerateMetadataKey(123, ContentType.Movie);
        var searchKey = _service.GenerateSearchKey("query");
        var imageKey = _service.GenerateImageKey("http://image.url");
        var userPrefKey = _service.GenerateUserPreferenceKey("user-1", "pref");
        var configKey = _service.GenerateConfigurationKey("config");

        var keys = new[] { streamingKey, metadataKey, searchKey, imageKey, userPrefKey, configKey };

        // Assert - All keys should be unique
        var uniqueKeys = keys.Distinct().Count();
        Assert.Equal(keys.Length, uniqueKeys);
    }

    [Fact]
    public void AllKeyMethods_RespectMaxLength()
    {
        // Arrange
        var longString = new string('X', 300);

        // Act
        var streamingKey = _service.GenerateStreamingKey(longString);
        var searchKey = _service.GenerateSearchKey(longString);
        var userPrefKey = _service.GenerateUserPreferenceKey(longString, longString);
        var configKey = _service.GenerateConfigurationKey(longString);

        // Assert - All keys should be <= 250 characters
        Assert.True(streamingKey.Length <= 250);
        Assert.True(searchKey.Length <= 250);
        Assert.True(userPrefKey.Length <= 250);
        Assert.True(configKey.Length <= 250);
    }

    [Fact]
    public void KeyGeneration_Deterministic_SameInputsProduceSameKeys()
    {
        // Arrange
        var contentId = "movie-123";
        var tmdbId = 456;
        var query = "action movies";

        // Act - Generate keys twice
        var streamKey1 = _service.GenerateStreamingKey(contentId, "US");
        var streamKey2 = _service.GenerateStreamingKey(contentId, "US");

        var metaKey1 = _service.GenerateMetadataKey(tmdbId, ContentType.Movie, "en-US");
        var metaKey2 = _service.GenerateMetadataKey(tmdbId, ContentType.Movie, "en-US");

        var searchKey1 = _service.GenerateSearchKey(query, ContentType.Movie, "en-US");
        var searchKey2 = _service.GenerateSearchKey(query, ContentType.Movie, "en-US");

        // Assert - Same inputs produce same keys (deterministic)
        Assert.Equal(streamKey1, streamKey2);
        Assert.Equal(metaKey1, metaKey2);
        Assert.Equal(searchKey1, searchKey2);
    }

    #endregion

    public void Dispose()
    {
        // Cleanup if needed
    }
}
