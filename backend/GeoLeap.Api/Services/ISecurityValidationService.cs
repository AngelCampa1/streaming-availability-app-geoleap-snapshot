using System.Threading.Tasks;

namespace GeoLeap.Api.Services;

public interface ISecurityValidationService
{
    Task<SecurityValidationResult> ValidateInputAsync(string input, SecurityValidationType validationType);
    Task<bool> IsSqlInjectionAttemptAsync(string input);
    Task<bool> IsXssAttemptAsync(string input);
    Task<string> SanitizeInputAsync(string input);
    Task<bool> IsExcessivelyLongAsync(string input, int maxLength = 1000);
    Task<SecurityThreatLevel> AssessThreatLevelAsync(string input);
}

public class SecurityValidationResult
{
    public bool IsValid { get; set; }
    public SecurityThreatLevel ThreatLevel { get; set; }
    public string[] Violations { get; set; } = Array.Empty<string>();
    public string? SanitizedInput { get; set; }
    public string? RecommendedAction { get; set; }
}

public enum SecurityValidationType
{
    SqlInjection,
    XssAttempt,
    ExcessiveLength,
    MaliciousContent,
    All
}

public enum SecurityThreatLevel
{
    None,
    Low,
    Medium,
    High,
    Critical
}