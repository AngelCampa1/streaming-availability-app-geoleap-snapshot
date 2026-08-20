using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using System.Text.Json;

namespace GeoLeap.Api.Attributes;

/// <summary>
/// Validates GUID format
/// </summary>
public class ValidGuidAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string guidString)
        {
            if (string.IsNullOrWhiteSpace(guidString))
                return true; // Allow empty for optional fields
            return Guid.TryParse(guidString, out _);
        }
        
        if (value is Guid guid)
        {
            return guid != Guid.Empty;
        }

        return value == null; // Allow null for optional fields
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid GUID.";
    }
}

/// <summary>
/// Validates JSON format
/// </summary>
public class ValidJsonAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string jsonString)
        {
            if (string.IsNullOrWhiteSpace(jsonString))
                return true; // Allow empty for optional fields

            try
            {
                JsonDocument.Parse(jsonString);
                return true;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must contain valid JSON.";
    }
}

/// <summary>
/// Validates URL format
/// </summary>
public class ValidUrlAttribute : ValidationAttribute
{
    public bool RequireHttps { get; set; } = false;

    public override bool IsValid(object? value)
    {
        if (value is string urlString)
        {
            if (string.IsNullOrWhiteSpace(urlString))
                return true; // Allow empty for optional fields

            if (!Uri.TryCreate(urlString, UriKind.Absolute, out var uri))
                return false;

            if (RequireHttps && uri.Scheme != "https")
                return false;

            return uri.Scheme == "http" || uri.Scheme == "https";
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        var httpsRequired = RequireHttps ? " (HTTPS required)" : "";
        return $"The {name} field must be a valid URL{httpsRequired}.";
    }
}

/// <summary>
/// Validates date ranges
/// </summary>
public class DateRangeAttribute : ValidationAttribute
{
    public int MinDaysFromNow { get; set; } = 0;
    public int MaxDaysFromNow { get; set; } = 365;
    public bool AllowPastDates { get; set; } = true;

    public override bool IsValid(object? value)
    {
        if (value is DateTime dateValue)
        {
            var now = DateTime.UtcNow;
            
            if (!AllowPastDates && dateValue < now.Date)
                return false;

            var minDate = now.AddDays(MinDaysFromNow);
            var maxDate = now.AddDays(MaxDaysFromNow);

            return dateValue >= minDate && dateValue <= maxDate;
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        var pastAllowed = AllowPastDates ? "" : " (future dates only)";
        return $"The {name} field must be between {MinDaysFromNow} and {MaxDaysFromNow} days from now{pastAllowed}.";
    }
}

/// <summary>
/// Validates phone number format
/// </summary>
public class PhoneNumberAttribute : ValidationAttribute
{
    private static readonly Regex PhoneRegex = new Regex(
        @"^\+?[1-9]\d{7,14}$", // E.164 format - minimum 8 digits total
        RegexOptions.Compiled);

    public override bool IsValid(object? value)
    {
        if (value is string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return true; // Allow empty for optional fields

            // Remove common formatting characters
            var cleanNumber = phoneNumber.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
            return PhoneRegex.IsMatch(cleanNumber);
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid phone number.";
    }
}

/// <summary>
/// Validates credit card number using Luhn algorithm
/// </summary>
public class CreditCardAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string cardNumber)
        {
            if (string.IsNullOrWhiteSpace(cardNumber))
                return false;

            // Remove spaces and dashes
            var cleanNumber = cardNumber.Replace(" ", "").Replace("-", "");
            
            // Check if all digits
            if (!cleanNumber.All(char.IsDigit))
                return false;

            // Check length (13-19 digits for most cards)
            if (cleanNumber.Length < 13 || cleanNumber.Length > 19)
                return false;

            // Validate using Luhn algorithm
            return IsValidLuhn(cleanNumber);
        }

        return false;
    }

    private static bool IsValidLuhn(string number)
    {
        var sum = 0;
        var alternate = false;

        for (var i = number.Length - 1; i >= 0; i--)
        {
            var digit = int.Parse(number[i].ToString());

            if (alternate)
            {
                digit *= 2;
                if (digit > 9)
                    digit = (digit % 10) + 1;
            }

            sum += digit;
            alternate = !alternate;
        }

        return sum % 10 == 0;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid credit card number.";
    }
}

/// <summary>
/// Validates business-specific rules for content IDs
/// </summary>
public class ValidContentIdAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string contentId)
        {
            if (string.IsNullOrWhiteSpace(contentId))
                return false;

            // Content IDs should be either numeric (TMDb) or prefixed format
            return contentId.All(char.IsDigit) || 
                   contentId.StartsWith("tmdb_") || 
                   contentId.StartsWith("imdb_") || 
                   contentId.StartsWith("tvdb_");
        }

        return false;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid content ID (numeric or prefixed format).";
    }
}

/// <summary>
/// Validates subscription tier values
/// </summary>
public class ValidSubscriptionTierAttribute : ValidationAttribute
{
    private static readonly string[] ValidTiers = { "free", "premium", "enterprise" };

    public override bool IsValid(object? value)
    {
        if (value is string tier)
        {
            if (string.IsNullOrWhiteSpace(tier))
                return true; // Allow empty for optional fields
            return ValidTiers.Contains(tier.ToLower());
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be one of: {string.Join(", ", ValidTiers)}.";
    }
}

/// <summary>
/// Validates file size limits
/// </summary>
public class MaxFileSizeAttribute : ValidationAttribute
{
    public long MaxSizeInBytes { get; set; } = 5 * 1024 * 1024; // 5MB default

    public override bool IsValid(object? value)
    {
        if (value is IFormFile file)
        {
            return file.Length <= MaxSizeInBytes;
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        var sizeMB = MaxSizeInBytes / (1024 * 1024);
        return $"The {name} field must not exceed {sizeMB}MB.";
    }
}

/// <summary>
/// Validates allowed file extensions
/// </summary>
public class AllowedFileExtensionsAttribute : ValidationAttribute
{
    public string[] Extensions { get; set; } = Array.Empty<string>();

    public override bool IsValid(object? value)
    {
        if (value is IFormFile file)
        {
            var extension = Path.GetExtension(file.FileName)?.ToLower();
            return Extensions.Contains(extension);
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must have one of the following extensions: {string.Join(", ", Extensions)}.";
    }
}

/// <summary>
/// Validates currency codes (ISO 4217)
/// </summary>
public class CurrencyCodeAttribute : ValidationAttribute
{
    private static readonly string[] ValidCurrencies = { "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK" };

    public override bool IsValid(object? value)
    {
        if (value is string currency)
        {
            if (string.IsNullOrWhiteSpace(currency))
                return true; // Allow empty for optional fields
            return ValidCurrencies.Contains(currency.ToUpper());
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid currency code: {string.Join(", ", ValidCurrencies)}.";
    }
}

/// <summary>
/// Validates country codes (ISO 3166-1 alpha-2)
/// </summary>
public class CountryCodeAttribute : ValidationAttribute
{
    private static readonly string[] ValidCountries = { "US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "JP", "KR", "IN", "BR", "MX", "AR" };

    public override bool IsValid(object? value)
    {
        if (value is string country)
        {
            if (string.IsNullOrWhiteSpace(country))
                return true; // Allow empty for optional fields
            return ValidCountries.Contains(country.ToUpper());
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid country code.";
    }
}

/// <summary>
/// Validates timezone identifiers
/// </summary>
public class ValidTimezoneAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string timezone)
        {
            if (string.IsNullOrWhiteSpace(timezone))
                return true; // Allow empty for optional fields

            try
            {
                TimeZoneInfo.FindSystemTimeZoneById(timezone);
                return true;
            }
            catch (TimeZoneNotFoundException)
            {
                return false;
            }
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid timezone identifier.";
    }
}

/// <summary>
/// Validates IP address format
/// </summary>
public class ValidIpAddressAttribute : ValidationAttribute
{
    public bool AllowIPv6 { get; set; } = true;

    public override bool IsValid(object? value)
    {
        if (value is string ipAddress)
        {
            if (string.IsNullOrWhiteSpace(ipAddress))
                return true; // Allow empty for optional fields

            if (System.Net.IPAddress.TryParse(ipAddress, out var parsedIP))
            {
                return AllowIPv6 || parsedIP.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork;
            }

            return false;
        }

        return value == null;
    }

    public override string FormatErrorMessage(string name)
    {
        var ipVersion = AllowIPv6 ? "IPv4 or IPv6" : "IPv4";
        return $"The {name} field must be a valid {ipVersion} address.";
    }
}