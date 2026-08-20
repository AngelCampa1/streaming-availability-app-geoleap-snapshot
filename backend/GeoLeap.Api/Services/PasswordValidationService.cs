using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

public class PasswordValidationService : IPasswordValidationService
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<PasswordValidationService> _logger;

    private const int MinLength = 8;
    private const int MaxLength = 128;
    private const int PasswordHistoryLimit = 5;

    public PasswordValidationService(
        ApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<PasswordValidationService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public PasswordValidationResult ValidatePassword(string password)
    {
        var result = new PasswordValidationResult
        {
            Errors = new List<string>()
        };

        if (string.IsNullOrWhiteSpace(password))
        {
            result.Errors.Add("Password is required");
            result.IsValid = false;
            return result;
        }

        if (password.Length < MinLength)
        {
            result.Errors.Add($"Password must be at least {MinLength} characters long");
        }

        if (password.Length > MaxLength)
        {
            result.Errors.Add($"Password must be no more than {MaxLength} characters long");
        }

        if (!Regex.IsMatch(password, @"[a-z]"))
        {
            result.Errors.Add("Password must contain at least one lowercase letter");
        }

        if (!Regex.IsMatch(password, @"[A-Z]"))
        {
            result.Errors.Add("Password must contain at least one uppercase letter");
        }

        if (!Regex.IsMatch(password, @"\d"))
        {
            result.Errors.Add("Password must contain at least one number");
        }

        if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]"))
        {
            result.Errors.Add("Password must contain at least one special character");
        }

        if (ContainsCommonPatterns(password))
        {
            result.Errors.Add("Password contains common patterns that are easily guessable");
        }

        result.IsValid = !result.Errors.Any();
        result.Strength = AnalyzePasswordStrength(password).Strength;

        return result;
    }

    public PasswordStrengthResult AnalyzePasswordStrength(string password)
    {
        var result = new PasswordStrengthResult
        {
            Feedback = new List<string>()
        };

        if (string.IsNullOrWhiteSpace(password))
        {
            result.Strength = PasswordStrength.VeryWeak;
            result.Score = 0;
            result.Feedback.Add("Password is empty");
            return result;
        }

        int score = 0;

        // Length scoring
        if (password.Length >= MinLength) score += 1;
        if (password.Length >= 12) score += 1;
        if (password.Length >= 16) score += 1;

        // Character variety scoring
        if (Regex.IsMatch(password, @"[a-z]")) score += 1;
        if (Regex.IsMatch(password, @"[A-Z]")) score += 1;
        if (Regex.IsMatch(password, @"\d")) score += 1;
        if (Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]")) score += 1;

        // Complexity bonus
        var uniqueChars = password.Distinct().Count();
        if (uniqueChars >= password.Length * 0.7) score += 1;

        // Penalty for common patterns
        if (ContainsCommonPatterns(password)) score -= 2;
        if (ContainsRepetitivePatterns(password)) score -= 1;

        result.Score = Math.Max(0, Math.Min(10, score));
        result.Strength = ScoreToStrength(result.Score);
        // Check requirements directly without calling ValidatePassword (prevents recursion)
        result.MeetsRequirements = password.Length >= MinLength &&
                                   password.Length <= MaxLength &&
                                   Regex.IsMatch(password, @"[a-z]") &&
                                   Regex.IsMatch(password, @"[A-Z]") &&
                                   Regex.IsMatch(password, @"\d") &&
                                   Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]") &&
                                   !ContainsCommonPatterns(password);
        result.Feedback = GenerateFeedback(password, result.Score);

        return result;
    }

    public async Task<bool> IsPasswordReusedAsync(Guid userId, string password)
    {
        try
        {
            var recentPasswords = await _context.PasswordHistory
                .Where(ph => ph.UserId == userId)
                .OrderByDescending(ph => ph.CreatedAt)
                .Take(PasswordHistoryLimit)
                .Select(ph => ph.PasswordHash)
                .ToListAsync();

            var tempUser = new User { Id = userId };

            foreach (var hashedPassword in recentPasswords)
            {
                var verificationResult = _passwordHasher.VerifyHashedPassword(tempUser, hashedPassword, password);
                if (verificationResult == PasswordVerificationResult.Success || 
                    verificationResult == PasswordVerificationResult.SuccessRehashNeeded)
                {
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking password reuse for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> CanUserChangePasswordAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return false;
            }

            // Check if user has recently changed password (prevent too frequent changes)
            var recentChange = await _context.PasswordHistory
                .Where(ph => ph.UserId == userId)
                .OrderByDescending(ph => ph.CreatedAt)
                .FirstOrDefaultAsync();

            if (recentChange != null && recentChange.CreatedAt > DateTime.UtcNow.AddMinutes(-5))
            {
                return false; // Must wait 5 minutes between password changes
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {UserId} can change password", userId);
            return false;
        }
    }

    private static bool ContainsCommonPatterns(string password)
    {
        var commonPatterns = new[]
        {
            @"123456",
            @"password",
            @"qwerty",
            @"admin",
            @"letmein",
            @"welcome",
            @"monkey",
            @"dragon"
        };

        return commonPatterns.Any(pattern => 
            password.ToLowerInvariant().Contains(pattern.ToLowerInvariant()));
    }

    private static bool ContainsRepetitivePatterns(string password)
    {
        // Check for repeated characters (aaa, 111, etc.)
        if (Regex.IsMatch(password, @"(.)\1{2,}"))
        {
            return true;
        }

        // Check for repeated sequences (abcabc, 123123, etc.)
        for (int i = 0; i < password.Length - 5; i++)
        {
            string substring = password.Substring(i, 3);
            if (password.Substring(i + 3).StartsWith(substring))
            {
                return true;
            }
        }

        return false;
    }

    private static PasswordStrength ScoreToStrength(int score)
    {
        return score switch
        {
            <= 2 => PasswordStrength.VeryWeak,
            <= 4 => PasswordStrength.Weak,
            <= 6 => PasswordStrength.Fair,
            <= 8 => PasswordStrength.Strong,
            _ => PasswordStrength.VeryStrong
        };
    }

    private static List<string> GenerateFeedback(string password, int score)
    {
        var feedback = new List<string>();

        if (score <= 2)
        {
            feedback.Add("This password is very weak and easily guessable");
        }
        else if (score <= 4)
        {
            feedback.Add("This password is weak and could be improved");
        }
        else if (score <= 6)
        {
            feedback.Add("This password is fair but could be stronger");
        }
        else if (score <= 8)
        {
            feedback.Add("This password is strong");
        }
        else
        {
            feedback.Add("This password is very strong");
        }

        if (password.Length < 12)
        {
            feedback.Add("Consider using a longer password");
        }

        if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]"))
        {
            feedback.Add("Add special characters to increase strength");
        }

        if (ContainsCommonPatterns(password))
        {
            feedback.Add("Avoid common words and patterns");
        }

        return feedback;
    }
}