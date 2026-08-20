namespace GeoLeap.Api.Utilities;

/// <summary>
/// Utility class for mapping country codes to emoji flags
/// </summary>
public static class CountryFlagHelper
{
    /// <summary>
    /// Gets the emoji flag for a country code (ISO 3166-1 alpha-2)
    /// </summary>
    /// <param name="countryCode">2-letter country code (e.g., "US", "GB", "JP")</param>
    /// <returns>Emoji flag string (e.g., "🇺🇸", "🇬🇧", "🇯🇵")</returns>
    public static string GetFlag(string countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return "🌍";

        var code = countryCode.ToUpper();

        // Direct mapping for common countries
        return code switch
        {
            // North America
            "US" => "🇺🇸",
            "CA" => "🇨🇦",
            "MX" => "🇲🇽",

            // Europe
            "GB" => "🇬🇧",
            "DE" => "🇩🇪",
            "FR" => "🇫🇷",
            "ES" => "🇪🇸",
            "IT" => "🇮🇹",
            "NL" => "🇳🇱",
            "BE" => "🇧🇪",
            "CH" => "🇨🇭",
            "AT" => "🇦🇹",
            "SE" => "🇸🇪",
            "NO" => "🇳🇴",
            "DK" => "🇩🇰",
            "FI" => "🇫🇮",
            "PL" => "🇵🇱",
            "CZ" => "🇨🇿",
            "HU" => "🇭🇺",
            "RO" => "🇷🇴",
            "GR" => "🇬🇷",
            "PT" => "🇵🇹",
            "IE" => "🇮🇪",

            // Asia
            "JP" => "🇯🇵",
            "KR" => "🇰🇷",
            "CN" => "🇨🇳",
            "IN" => "🇮🇳",
            "TH" => "🇹🇭",
            "SG" => "🇸🇬",
            "MY" => "🇲🇾",
            "ID" => "🇮🇩",
            "PH" => "🇵🇭",
            "VN" => "🇻🇳",
            "TW" => "🇹🇼",
            "HK" => "🇭🇰",

            // Oceania
            "AU" => "🇦🇺",
            "NZ" => "🇳🇿",

            // South America
            "BR" => "🇧🇷",
            "AR" => "🇦🇷",
            "CL" => "🇨🇱",
            "CO" => "🇨🇴",
            "PE" => "🇵🇪",
            "VE" => "🇻🇪",

            // Middle East
            "TR" => "🇹🇷",
            "IL" => "🇮🇱",
            "SA" => "🇸🇦",
            "AE" => "🇦🇪",

            // Africa
            "ZA" => "🇿🇦",
            "EG" => "🇪🇬",
            "NG" => "🇳🇬",
            "KE" => "🇰🇪",

            // Eastern Europe
            "RU" => "🇷🇺",
            "UA" => "🇺🇦",

            // Default
            _ => ConvertToFlag(code)
        };
    }

    /// <summary>
    /// Converts a 2-letter country code to its regional indicator symbols (emoji flag)
    /// </summary>
    private static string ConvertToFlag(string countryCode)
    {
        if (countryCode.Length != 2)
            return "🌍";

        // Convert ASCII letters to regional indicator symbols
        // A (0x41) → 🇦 (0x1F1E6)
        var char1 = char.ToUpper(countryCode[0]);
        var char2 = char.ToUpper(countryCode[1]);

        if (char1 < 'A' || char1 > 'Z' || char2 < 'A' || char2 > 'Z')
            return "🌍";

        var regionalIndicator1 = 0x1F1E6 + (char1 - 'A');
        var regionalIndicator2 = 0x1F1E6 + (char2 - 'A');

        return char.ConvertFromUtf32(regionalIndicator1) + char.ConvertFromUtf32(regionalIndicator2);
    }

    /// <summary>
    /// Gets the country name from country code
    /// </summary>
    public static string GetCountryName(string countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return "Unknown";

        var code = countryCode.ToUpper();

        return code switch
        {
            // North America
            "US" => "United States",
            "CA" => "Canada",
            "MX" => "Mexico",

            // Europe
            "GB" => "United Kingdom",
            "DE" => "Germany",
            "FR" => "France",
            "ES" => "Spain",
            "IT" => "Italy",
            "NL" => "Netherlands",
            "BE" => "Belgium",
            "CH" => "Switzerland",
            "AT" => "Austria",
            "SE" => "Sweden",
            "NO" => "Norway",
            "DK" => "Denmark",
            "FI" => "Finland",
            "PL" => "Poland",
            "CZ" => "Czech Republic",
            "HU" => "Hungary",
            "RO" => "Romania",
            "GR" => "Greece",
            "PT" => "Portugal",
            "IE" => "Ireland",

            // Asia
            "JP" => "Japan",
            "KR" => "South Korea",
            "CN" => "China",
            "IN" => "India",
            "TH" => "Thailand",
            "SG" => "Singapore",
            "MY" => "Malaysia",
            "ID" => "Indonesia",
            "PH" => "Philippines",
            "VN" => "Vietnam",
            "TW" => "Taiwan",
            "HK" => "Hong Kong",

            // Oceania
            "AU" => "Australia",
            "NZ" => "New Zealand",

            // South America
            "BR" => "Brazil",
            "AR" => "Argentina",
            "CL" => "Chile",
            "CO" => "Colombia",
            "PE" => "Peru",
            "VE" => "Venezuela",

            // Middle East
            "TR" => "Turkey",
            "IL" => "Israel",
            "SA" => "Saudi Arabia",
            "AE" => "United Arab Emirates",

            // Africa
            "ZA" => "South Africa",
            "EG" => "Egypt",
            "NG" => "Nigeria",
            "KE" => "Kenya",

            // Eastern Europe
            "RU" => "Russia",
            "UA" => "Ukraine",

            // Default
            _ => countryCode
        };
    }
}
