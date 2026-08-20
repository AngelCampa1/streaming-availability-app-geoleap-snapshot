using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Infrastructure;

/// <summary>
/// Utility class for filtering sensitive data from logs and error responses.
/// Prevents accidental exposure of PII, credentials, and payment information.
/// </summary>
public static class SensitiveDataFilter
{
    /// <summary>
    /// List of field names that should have their values redacted.
    /// </summary>
    private static readonly HashSet<string> SensitiveFieldNames = new(StringComparer.OrdinalIgnoreCase)
    {
        // Authentication
        "password",
        "passwordhash",
        "passwordsalt",
        "pwd",
        "pass",
        "currentpassword",
        "newpassword",
        "confirmpassword",
        "oldpassword",

        // Tokens
        "token",
        "accesstoken",
        "refreshtoken",
        "apikey",
        "api_key",
        "secretkey",
        "secret_key",
        "bearertoken",
        "authtoken",
        "jwttoken",
        "sessiontoken",
        "csrftoken",
        "oauthtoken",

        // Payment Information
        "cardnumber",
        "card_number",
        "creditcard",
        "debitcard",
        "cvv",
        "cvc",
        "securitycode",
        "expiry",
        "expirationdate",
        "expiration_date",
        "accountnumber",
        "account_number",
        "routingnumber",
        "routing_number",
        "iban",
        "swiftcode",
        "swift_code",

        // Personal Information
        "ssn",
        "socialsecuritynumber",
        "social_security_number",
        "taxid",
        "tax_id",
        "nationalid",
        "national_id",
        "driverslicense",
        "drivers_license",
        "passport",
        "passportnumber",

        // Connection Strings
        "connectionstring",
        "connection_string",
        "dbpassword",
        "db_password",
    };

    /// <summary>
    /// Regex patterns for detecting sensitive data in strings.
    /// </summary>
    private static readonly (string Name, Regex Pattern)[] SensitivePatterns = new[]
    {
        ("Credit Card", new Regex(@"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", RegexOptions.Compiled)),
        ("SSN", new Regex(@"\b\d{3}-\d{2}-\d{4}\b", RegexOptions.Compiled)),
        ("JWT Token", new Regex(@"\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]+\b", RegexOptions.Compiled)),
        ("Bearer Token", new Regex(@"Bearer\s+[A-Za-z0-9-_.]+", RegexOptions.Compiled | RegexOptions.IgnoreCase)),
        ("API Key", new Regex(@"(?:api[_-]?key|apikey)[=:]\s*[A-Za-z0-9-_]{16,}", RegexOptions.Compiled | RegexOptions.IgnoreCase)),
        ("Password in URL", new Regex(@"(?:password|pwd)[=:][^&\s]+", RegexOptions.Compiled | RegexOptions.IgnoreCase)),
    };

    private const string RedactedValue = "[REDACTED]";
    private const string RedactedPattern = "[SENSITIVE DATA REDACTED]";

    /// <summary>
    /// Sanitizes an object by redacting sensitive field values.
    /// </summary>
    /// <param name="data">Object to sanitize</param>
    /// <returns>Sanitized object safe for logging</returns>
    public static object Sanitize(object? data)
    {
        if (data == null) return new { };

        try
        {
            // Convert to JSON and back to sanitize
            var json = JsonSerializer.Serialize(data);
            var sanitizedJson = SanitizeJsonString(json);

            // Parse back to object for structured logging
            using var doc = JsonDocument.Parse(sanitizedJson);
            return JsonSerializer.Deserialize<object>(sanitizedJson) ?? new { };
        }
        catch (Exception)
        {
            // If serialization fails, return a safe representation
            return new { originalType = data.GetType().Name, sanitized = true };
        }
    }

    /// <summary>
    /// Sanitizes a dictionary by redacting sensitive field values.
    /// </summary>
    public static Dictionary<string, object?> Sanitize(Dictionary<string, object?> data)
    {
        var result = new Dictionary<string, object?>();

        foreach (var kvp in data)
        {
            if (IsSensitiveFieldName(kvp.Key))
            {
                result[kvp.Key] = RedactedValue;
            }
            else if (kvp.Value is string strValue)
            {
                result[kvp.Key] = SanitizeString(strValue);
            }
            else if (kvp.Value is Dictionary<string, object?> nestedDict)
            {
                result[kvp.Key] = Sanitize(nestedDict);
            }
            else
            {
                result[kvp.Key] = kvp.Value;
            }
        }

        return result;
    }

    /// <summary>
    /// Sanitizes a string by redacting sensitive patterns.
    /// </summary>
    public static string SanitizeString(string? input)
    {
        if (string.IsNullOrEmpty(input)) return input ?? string.Empty;

        var result = input;

        foreach (var (_, pattern) in SensitivePatterns)
        {
            result = pattern.Replace(result, RedactedPattern);
        }

        return result;
    }

    /// <summary>
    /// Sanitizes a JSON string by redacting sensitive field values.
    /// </summary>
    public static string SanitizeJsonString(string json)
    {
        if (string.IsNullOrEmpty(json)) return json;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var sanitizedElement = SanitizeJsonElement(doc.RootElement);
            return JsonSerializer.Serialize(sanitizedElement);
        }
        catch (JsonException)
        {
            // If not valid JSON, sanitize as string
            return SanitizeString(json);
        }
    }

    /// <summary>
    /// Recursively sanitizes a JsonElement.
    /// </summary>
    private static object? SanitizeJsonElement(JsonElement element, string? parentKey = null)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var dict = new Dictionary<string, object?>();
                foreach (var property in element.EnumerateObject())
                {
                    if (IsSensitiveFieldName(property.Name))
                    {
                        dict[property.Name] = RedactedValue;
                    }
                    else
                    {
                        dict[property.Name] = SanitizeJsonElement(property.Value, property.Name);
                    }
                }
                return dict;

            case JsonValueKind.Array:
                return element.EnumerateArray()
                    .Select(e => SanitizeJsonElement(e, parentKey))
                    .ToArray();

            case JsonValueKind.String:
                var strValue = element.GetString();
                // If parent key is sensitive, redact entirely
                if (!string.IsNullOrEmpty(parentKey) && IsSensitiveFieldName(parentKey))
                {
                    return RedactedValue;
                }
                // Otherwise, check for sensitive patterns in the string
                return SanitizeString(strValue);

            case JsonValueKind.Number:
                return element.GetDecimal();

            case JsonValueKind.True:
            case JsonValueKind.False:
                return element.GetBoolean();

            case JsonValueKind.Null:
                return null;

            default:
                return element.ToString();
        }
    }

    /// <summary>
    /// Checks if a field name should be considered sensitive.
    /// </summary>
    public static bool IsSensitiveFieldName(string fieldName)
    {
        if (string.IsNullOrEmpty(fieldName)) return false;

        // Direct match
        if (SensitiveFieldNames.Contains(fieldName)) return true;

        // Check for partial matches (e.g., "userPassword", "card_number_encrypted")
        var normalizedName = fieldName.ToLowerInvariant();
        return SensitiveFieldNames.Any(sensitive =>
            normalizedName.Contains(sensitive) ||
            normalizedName.Replace("_", "").Contains(sensitive.Replace("_", ""))
        );
    }

    /// <summary>
    /// Creates a safe exception message that doesn't expose sensitive data.
    /// </summary>
    public static string SanitizeExceptionMessage(Exception ex)
    {
        if (ex == null) return string.Empty;

        var message = ex.Message;

        // Sanitize the message for sensitive patterns
        message = SanitizeString(message);

        // Remove potential connection strings
        message = Regex.Replace(message,
            @"(Server|Data Source|Initial Catalog|User Id|Password|Integrated Security)[=;][^;]+",
            "[CONNECTION INFO REDACTED]",
            RegexOptions.IgnoreCase);

        return message;
    }

    /// <summary>
    /// Creates a logging-safe representation of request data.
    /// </summary>
    public static Dictionary<string, object> CreateSafeRequestLog(
        HttpRequest request,
        bool includeHeaders = false,
        bool includeBody = false)
    {
        var log = new Dictionary<string, object>
        {
            ["method"] = request.Method,
            ["path"] = request.Path.Value ?? string.Empty,
            ["queryString"] = SanitizeString(request.QueryString.Value),
            ["contentType"] = request.ContentType ?? string.Empty,
            ["contentLength"] = request.ContentLength ?? 0,
        };

        if (includeHeaders)
        {
            var safeHeaders = new Dictionary<string, string>();
            foreach (var header in request.Headers)
            {
                if (IsSensitiveFieldName(header.Key))
                {
                    safeHeaders[header.Key] = RedactedValue;
                }
                else
                {
                    safeHeaders[header.Key] = SanitizeString(header.Value.ToString());
                }
            }
            log["headers"] = safeHeaders;
        }

        return log;
    }
}
