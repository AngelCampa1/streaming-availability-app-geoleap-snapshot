using GeoLeap.Api.Models;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Services;

public class CacheKeyService : ICacheKeyService
{
    private readonly IOptionsMonitor<CacheSettings> _settings;
    private const string KeySeparator = ":";
    private const int MaxKeyLength = 250; // Redis limit

    public CacheKeyService(IOptionsMonitor<CacheSettings> settings)
    {
        _settings = settings;
    }

    public string GenerateKey(CacheCategory category, params string[] components)
    {
        var prefix = _settings.CurrentValue.KeyPrefix ?? "geoleap";
        var version = _settings.CurrentValue.DataVersion ?? "v1";
        
        var keyComponents = new List<string> { prefix, version, category.ToString().ToLower() };
        keyComponents.AddRange(components.Where(c => !string.IsNullOrEmpty(c)));
        
        var key = string.Join(KeySeparator, keyComponents.Select(SanitizeKeyComponent));
        
        // Ensure key length doesn't exceed Redis limits
        if (key.Length > MaxKeyLength)
        {
            var hash = ComputeHash(key);
            key = key.Substring(0, MaxKeyLength - hash.Length - 1) + KeySeparator + hash;
        }
        
        return key;
    }

    public string GenerateStreamingKey(string contentId, string? countryCode = null)
    {
        var components = new List<string> { "streaming", contentId };
        if (!string.IsNullOrEmpty(countryCode)) components.Add(countryCode);
        return GenerateKey(CacheCategory.StreamingData, components.ToArray());
    }

    public string GenerateMetadataKey(int tmdbId, ContentType contentType, string language = "en-US")
    {
        return GenerateKey(CacheCategory.Metadata, contentType.ToString().ToLower(), tmdbId.ToString(), language);
    }

    public string GenerateSearchKey(string query, ContentType? contentType = null, string language = "en-US")
    {
        var components = new List<string> { "search", ComputeHash(query.ToLower()), language };
        if (contentType.HasValue) components.Add(contentType.Value.ToString().ToLower());
        return GenerateKey(CacheCategory.Search, components.ToArray());
    }

    public string GenerateImageKey(string imageUrl, string? size = null)
    {
        var components = new List<string> { "image", ComputeHash(imageUrl) };
        if (!string.IsNullOrEmpty(size)) components.Add(size);
        return GenerateKey(CacheCategory.Images, components.ToArray());
    }

    public string GenerateUserPreferenceKey(string userId, string preferenceType)
    {
        return GenerateKey(CacheCategory.UserPreferences, userId, preferenceType);
    }

    public string GenerateConfigurationKey(string configKey)
    {
        return GenerateKey(CacheCategory.Configuration, configKey);
    }

    private string SanitizeKeyComponent(string component)
    {
        return component.Replace(" ", "_").Replace(":", "_").Replace("*", "_");
    }

    private string ComputeHash(string input)
    {
        using var sha1 = SHA1.Create();
        var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash)[..8]; // First 8 characters
    }
}