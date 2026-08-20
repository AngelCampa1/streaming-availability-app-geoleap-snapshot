using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

// ResetPasswordRequest moved to AuthDtos.cs to avoid duplication

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
    
    [Required]
    [Compare("NewPassword")]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}

public class PasswordValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public PasswordStrength Strength { get; set; }
}

public enum PasswordStrength
{
    VeryWeak = 1,
    Weak = 2,
    Fair = 3,
    Strong = 4,
    VeryStrong = 5
}

public class PasswordStrengthResult
{
    public PasswordStrength Strength { get; set; }
    public int Score { get; set; }
    public List<string> Feedback { get; set; } = new();
    public bool MeetsRequirements { get; set; }
}