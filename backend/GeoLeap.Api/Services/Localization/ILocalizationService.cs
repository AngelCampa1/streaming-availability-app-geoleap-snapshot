using System.Globalization;

namespace GeoLeap.Api.Services.Templates;

/// <summary>
/// Interface for localization services supporting multiple languages
/// </summary>
public interface ILocalizationService
{
    /// <summary>
    /// Gets a localized string for the specified key and language
    /// </summary>
    /// <param name="key">The localization key</param>
    /// <param name="language">Target language/culture</param>
    /// <param name="parameters">Optional parameters for string formatting</param>
    /// <returns>Localized string or key if not found</returns>
    string GetString(string key, string language, params object[] parameters);

    /// <summary>
    /// Gets a localized string with fallback to default language
    /// </summary>
    string GetStringWithFallback(string key, string language, string fallbackLanguage = "en-US", params object[] parameters);

    /// <summary>
    /// Checks if a localization key exists for the specified language
    /// </summary>
    bool HasKey(string key, string language);

    /// <summary>
    /// Gets all available languages
    /// </summary>
    Task<List<string>> GetAvailableLanguagesAsync();

    /// <summary>
    /// Gets all localization keys for a language
    /// </summary>
    Task<Dictionary<string, string>> GetAllStringsAsync(string language);

    /// <summary>
    /// Reloads localization data from source
    /// </summary>
    Task ReloadAsync();

    /// <summary>
    /// Gets culture-specific date format
    /// </summary>
    string GetDateFormat(string language);

    /// <summary>
    /// Gets culture-specific time format
    /// </summary>
    string GetTimeFormat(string language);

    /// <summary>
    /// Gets culture-specific number format
    /// </summary>
    NumberFormatInfo GetNumberFormat(string language);

    /// <summary>
    /// Formats a date according to the specified language/culture
    /// </summary>
    string FormatDate(DateTime date, string language, string format = "d");

    /// <summary>
    /// Formats a number according to the specified language/culture
    /// </summary>
    string FormatNumber(decimal number, string language, string format = "N2");
}