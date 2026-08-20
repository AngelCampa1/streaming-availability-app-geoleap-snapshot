using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Services;

public class SecurityValidationService : ISecurityValidationService
{
    private readonly ILogger<SecurityValidationService> _logger;
    
    // SQL injection patterns
    private static readonly Regex SqlInjectionPattern = new(
        @"(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)|" +
        @"(\b(AND|OR)\s+\d+\s*=\s*\d+)|" +
        @"('(''|[^'])*')|" +
        @"(\b(SP_|XP_)\w+)|" +
        @"(\bdbo\.)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Multiline);

    // XSS patterns
    private static readonly Regex XssPattern = new(
        @"<script[^>]*>.*?</script>|" +
        @"javascript:|" +
        @"on\w+\s*=|" +
        @"<iframe[^>]*>.*?</iframe>|" +
        @"<object[^>]*>.*?</object>|" +
        @"<embed[^>]*>|" +
        @"<link[^>]*>|" +
        @"<meta[^>]*>|" +
        @"expression\s*\(|" +
        @"vbscript:|" +
        @"mocha:|" +
        @"livescript:",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Multiline);

    // Common malicious patterns
    // NOTE: Removed overly broad %[0-9a-f]{2} pattern as it blocks legitimate URL-encoded characters like %20 (space)
    // URL-encoded attacks are handled by checking decoded input against SQL/XSS patterns in validation methods
    private static readonly Regex MaliciousPattern = new(
        @"(\.\./){2,}|" +  // Path traversal
        @"\\x[0-9a-f]{2}|" +  // Hex encoding (backslash-x format, not URL encoding)
        @"%00|%0[aAdD]|" +  // Only dangerous URL-encoded chars: null byte, newlines (CRLF injection)
        @"\$\{.*\}|" +  // Expression language injection
        @"<!--.*-->",  // HTML comments that might hide malicious content
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Multiline);

    public SecurityValidationService(ILogger<SecurityValidationService> logger)
    {
        _logger = logger;
    }

    public async Task<SecurityValidationResult> ValidateInputAsync(string input, SecurityValidationType validationType)
    {
        if (string.IsNullOrEmpty(input))
        {
            return new SecurityValidationResult { IsValid = true, ThreatLevel = SecurityThreatLevel.None };
        }

        var violations = new List<string>();
        var threatLevel = SecurityThreatLevel.None;

        try
        {
            switch (validationType)
            {
                case SecurityValidationType.SqlInjection:
                    if (await IsSqlInjectionAttemptAsync(input))
                    {
                        violations.Add("Potential SQL injection detected");
                        threatLevel = SecurityThreatLevel.High;
                    }
                    break;

                case SecurityValidationType.XssAttempt:
                    if (await IsXssAttemptAsync(input))
                    {
                        violations.Add("Potential XSS attack detected");
                        threatLevel = SecurityThreatLevel.High;
                    }
                    break;

                case SecurityValidationType.ExcessiveLength:
                    if (await IsExcessivelyLongAsync(input))
                    {
                        violations.Add("Input exceeds maximum allowed length");
                        threatLevel = SecurityThreatLevel.Medium;
                    }
                    break;

                case SecurityValidationType.MaliciousContent:
                    if (ContainsMaliciousPatterns(input))
                    {
                        violations.Add("Potentially malicious content detected");
                        threatLevel = SecurityThreatLevel.High;
                    }
                    break;

                case SecurityValidationType.All:
                    var allResult = await ValidateAllPatternsAsync(input);
                    violations.AddRange(allResult.violations);
                    threatLevel = allResult.maxThreatLevel;
                    break;
            }

            var sanitizedInput = violations.Any() ? await SanitizeInputAsync(input) : input;

            var result = new SecurityValidationResult
            {
                IsValid = !violations.Any(),
                ThreatLevel = threatLevel,
                Violations = violations.ToArray(),
                SanitizedInput = sanitizedInput,
                RecommendedAction = GetRecommendedAction(threatLevel, violations)
            };

            if (!result.IsValid)
            {
                _logger.LogWarning("Security validation failed for input. Violations: {Violations}, Threat Level: {ThreatLevel}", 
                    string.Join(", ", violations), threatLevel);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during security validation");
            
            // Fail secure - if we can't validate, assume it's potentially dangerous
            return new SecurityValidationResult
            {
                IsValid = false,
                ThreatLevel = SecurityThreatLevel.High,
                Violations = new[] { "Security validation failed due to internal error" },
                RecommendedAction = "Block request and investigate"
            };
        }
    }

    public async Task<bool> IsSqlInjectionAttemptAsync(string input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        await Task.Yield(); // Make async for consistency

        try
        {
            // Check for common SQL injection patterns
            if (SqlInjectionPattern.IsMatch(input))
            {
                _logger.LogWarning("Potential SQL injection detected in input: {InputLength} characters", input.Length);
                return true;
            }

            // Additional checks for encoded attacks
            var decodedInput = HttpUtility.UrlDecode(input);
            if (!string.Equals(input, decodedInput, StringComparison.Ordinal) && SqlInjectionPattern.IsMatch(decodedInput))
            {
                _logger.LogWarning("Potential URL-encoded SQL injection detected");
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking for SQL injection");
            return true; // Fail secure
        }
    }

    public async Task<bool> IsXssAttemptAsync(string input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        await Task.Yield(); // Make async for consistency

        try
        {
            // Check for XSS patterns
            if (XssPattern.IsMatch(input))
            {
                _logger.LogWarning("Potential XSS attack detected in input: {InputLength} characters", input.Length);
                return true;
            }

            // Check URL-decoded input
            var decodedInput = HttpUtility.UrlDecode(input);
            if (!string.Equals(input, decodedInput, StringComparison.Ordinal) && XssPattern.IsMatch(decodedInput))
            {
                _logger.LogWarning("Potential URL-encoded XSS attack detected");
                return true;
            }

            // Check HTML-decoded input
            var htmlDecodedInput = HttpUtility.HtmlDecode(input);
            if (!string.Equals(input, htmlDecodedInput, StringComparison.Ordinal) && XssPattern.IsMatch(htmlDecodedInput))
            {
                _logger.LogWarning("Potential HTML-encoded XSS attack detected");
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking for XSS attack");
            return true; // Fail secure
        }
    }

    public async Task<string> SanitizeInputAsync(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        await Task.Yield(); // Make async for consistency

        try
        {
            var sanitized = input;

            // HTML encode to prevent XSS
            sanitized = HttpUtility.HtmlEncode(sanitized);

            // Remove or escape SQL dangerous characters
            sanitized = sanitized.Replace("'", "&#39;");
            sanitized = sanitized.Replace("--", "&#45;&#45;");
            sanitized = sanitized.Replace(";", "&#59;");

            // Remove script tags and other dangerous HTML elements
            sanitized = Regex.Replace(sanitized, @"<script[^>]*>.*?</script>", "", RegexOptions.IgnoreCase);
            sanitized = Regex.Replace(sanitized, @"<iframe[^>]*>.*?</iframe>", "", RegexOptions.IgnoreCase);
            sanitized = Regex.Replace(sanitized, @"javascript:", "blocked:", RegexOptions.IgnoreCase);

            _logger.LogDebug("Input sanitized: original length {OriginalLength}, sanitized length {SanitizedLength}", 
                input.Length, sanitized.Length);

            return sanitized;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sanitizing input");
            return ""; // Return empty string if sanitization fails
        }
    }

    public async Task<bool> IsExcessivelyLongAsync(string input, int maxLength = 1000)
    {
        await Task.Yield(); // Make async for consistency

        if (string.IsNullOrEmpty(input))
            return false;

        var isExcessive = input.Length > maxLength;
        
        if (isExcessive)
        {
            _logger.LogWarning("Excessively long input detected: {InputLength} > {MaxLength}", input.Length, maxLength);
        }

        return isExcessive;
    }

    public async Task<SecurityThreatLevel> AssessThreatLevelAsync(string input)
    {
        if (string.IsNullOrEmpty(input))
            return SecurityThreatLevel.None;

        var result = await ValidateInputAsync(input, SecurityValidationType.All);
        return result.ThreatLevel;
    }

    private bool ContainsMaliciousPatterns(string input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        return MaliciousPattern.IsMatch(input);
    }

    private async Task<(List<string> violations, SecurityThreatLevel maxThreatLevel)> ValidateAllPatternsAsync(string input)
    {
        var violations = new List<string>();
        var maxThreatLevel = SecurityThreatLevel.None;

        if (await IsSqlInjectionAttemptAsync(input))
        {
            violations.Add("Potential SQL injection detected");
            maxThreatLevel = SecurityThreatLevel.High;
        }

        if (await IsXssAttemptAsync(input))
        {
            violations.Add("Potential XSS attack detected");
            maxThreatLevel = SecurityThreatLevel.High;
        }

        if (await IsExcessivelyLongAsync(input))
        {
            violations.Add("Input exceeds maximum allowed length");
            if (maxThreatLevel < SecurityThreatLevel.Medium)
                maxThreatLevel = SecurityThreatLevel.Medium;
        }

        if (ContainsMaliciousPatterns(input))
        {
            violations.Add("Potentially malicious content detected");
            maxThreatLevel = SecurityThreatLevel.High;
        }

        return (violations, maxThreatLevel);
    }

    private static string GetRecommendedAction(SecurityThreatLevel threatLevel, List<string> violations)
    {
        return threatLevel switch
        {
            SecurityThreatLevel.None => "Allow request",
            SecurityThreatLevel.Low => "Log and monitor",
            SecurityThreatLevel.Medium => "Log, sanitize input, and continue with caution",
            SecurityThreatLevel.High => "Block request and log incident",
            SecurityThreatLevel.Critical => "Block request, log incident, and alert security team",
            _ => "Unknown threat level"
        };
    }
}