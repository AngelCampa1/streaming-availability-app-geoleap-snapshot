using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using GeoLeap.Api.Attributes;

namespace GeoLeap.Api.Models;

// DTO Classes for authentication
public class RegisterDto
{
    [Required(ErrorMessage = "Email is required")]
    [StrictEmail(ErrorMessage = "Invalid email format")]
    [MaxLength(256, ErrorMessage = "Email cannot exceed 256 characters")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    [StrongPassword(ErrorMessage = "Password must be at least 8 characters long and contain uppercase, lowercase, number and special character")]
    [MaxLength(100, ErrorMessage = "Password cannot exceed 100 characters")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password confirmation is required")]
    [Compare("Password", ErrorMessage = "Password and confirmation password do not match")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "First name is required")]
    [MinLength(1, ErrorMessage = "First name cannot be empty")]
    [MaxLength(100, ErrorMessage = "First name cannot exceed 100 characters")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required")]
    [MinLength(1, ErrorMessage = "Last name cannot be empty")]
    [MaxLength(100, ErrorMessage = "Last name cannot exceed 100 characters")]
    public string LastName { get; set; } = string.Empty;
}

// Request Models for backward compatibility
public class RegisterRequest : RegisterDto
{
    // Inherits all properties from RegisterDto
    
    [MaxLength(50)]
    public string UserName { get; set; } = string.Empty;
}

public class LoginRequest : LoginDto
{
    // Inherits all properties from LoginDto
}

public class LoginResponse : AuthResponseDto
{
    // Inherits all properties from AuthResponseDto
}

public class LoginDto
{
    [Required(ErrorMessage = "Email is required")]
    [StrictEmail(ErrorMessage = "Invalid email format")]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; } = false;
}


public class AuthResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserInfoDto? User { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public string? Token { get; set; } // For backward compatibility
    public DateTime? TokenExpiration { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class TokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime TokenExpiration { get; set; }
}

public class UserInfoDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public bool EmailConfirmed { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; } = new();
}

// Additional DTOs missing from tests
public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
    
    [Required]
    [Compare(nameof(NewPassword))]
    public string ConfirmPassword { get; set; } = string.Empty;
}



// Add missing types for authentication
public class ResetPasswordDto : ResetPasswordRequest
{
    // Inherits all properties from ResetPasswordRequest
}

public class UpdateProfileDto
{
    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    [EmailAddress]
    [MaxLength(256)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? UserName { get; set; }
}