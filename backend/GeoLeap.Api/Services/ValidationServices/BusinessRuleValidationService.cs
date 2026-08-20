using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.ValidationServices;

public interface IBusinessRuleValidationService
{
    ValidationResult ValidateRegistration(RegisterDto dto);
    ValidationResult ValidateLogin(LoginDto dto);
    ValidationResult ValidatePayment(decimal amount, string stripeId);
    ValidationResult ValidateSubscriptionChange(string currentTier, string newTier);
    ValidationResult ValidateSearchRequest(string query, int page, int pageSize);
    ValidationResult ValidateContentRequest(string contentType, string id);
}

public class BusinessRuleValidationService : IBusinessRuleValidationService
{
    private readonly ILogger<BusinessRuleValidationService> _logger;

    public BusinessRuleValidationService(ILogger<BusinessRuleValidationService> logger)
    {
        _logger = logger;
    }

    public ValidationResult ValidateRegistration(RegisterDto dto)
    {
        var errors = new List<string>();

        // Email validation
        if (!IsValidEmail(dto.Email))
        {
            errors.Add("Email format is invalid");
        }

        // Password strength validation
        if (!IsStrongPassword(dto.Password))
        {
            errors.Add("Password must be at least 8 characters long and contain uppercase, lowercase, number and special character");
        }

        // Password confirmation validation
        if (dto.Password != dto.ConfirmPassword)
        {
            errors.Add("Password and confirmation password do not match");
        }

        // Name validation
        if (string.IsNullOrWhiteSpace(dto.FirstName))
        {
            errors.Add("FirstName is required");
        }

        if (string.IsNullOrWhiteSpace(dto.LastName))
        {
            errors.Add("LastName is required");
        }

        // Business rule: No profanity in names
        if (ContainsProfanity(dto.FirstName) || ContainsProfanity(dto.LastName))
        {
            errors.Add("Names cannot contain inappropriate language");
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public ValidationResult ValidateLogin(LoginDto dto)
    {
        var errors = new List<string>();

        if (!IsValidEmail(dto.Email))
        {
            errors.Add("Email format is invalid");
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            errors.Add("Password is required");
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public ValidationResult ValidatePayment(decimal amount, string stripeId)
    {
        var errors = new List<string>();

        // Amount validation
        if (amount <= 0)
        {
            errors.Add("Payment amount must be greater than zero");
        }

        if (amount > 10000) // Business rule: Max $10,000 per transaction
        {
            errors.Add("Payment amount cannot exceed $10,000");
        }

        // Stripe ID validation
        if (string.IsNullOrWhiteSpace(stripeId))
        {
            errors.Add("Stripe payment method ID is required");
        }
        else if (!stripeId.StartsWith("pm_") && !stripeId.StartsWith("card_"))
        {
            errors.Add("Invalid Stripe payment method ID format");
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public ValidationResult ValidateSubscriptionChange(string currentTier, string newTier)
    {
        var errors = new List<string>();

        var validTiers = new[] { "Free", "Premium", "Admin" };

        if (!validTiers.Contains(currentTier))
        {
            errors.Add("Invalid current subscription tier");
        }

        if (!validTiers.Contains(newTier))
        {
            errors.Add("Invalid new subscription tier");
        }

        // Business rule: Cannot downgrade from Admin
        if (currentTier == "Admin" && newTier != "Admin")
        {
            errors.Add("Admin accounts cannot be downgraded");
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public ValidationResult ValidateSearchRequest(string query, int page, int pageSize)
    {
        var errors = new List<string>();

        // Query validation
        if (string.IsNullOrWhiteSpace(query))
        {
            errors.Add("Search query cannot be empty");
        }
        else if (query.Length > 200)
        {
            errors.Add("Search query cannot exceed 200 characters");
        }

        // Pagination validation
        if (page < 1)
        {
            errors.Add("Page number must be 1 or greater");
        }

        if (pageSize < 1 || pageSize > 100)
        {
            errors.Add("Page size must be between 1 and 100");
        }

        // Business rule: No SQL injection patterns
        if (ContainsSqlInjectionPatterns(query))
        {
            errors.Add("Search query contains invalid characters");
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public ValidationResult ValidateContentRequest(string contentType, string id)
    {
        var errors = new List<string>();

        // Content type validation
        var validTypes = new[] { "movie", "tv", "all", "series" };
        if (!string.IsNullOrEmpty(contentType) && !validTypes.Contains(contentType.ToLower()))
        {
            errors.Add("Invalid content type. Must be one of: movie, tv, series, all");
        }

        // ID validation
        if (!string.IsNullOrEmpty(id))
        {
            if (!Guid.TryParse(id, out _) && !int.TryParse(id, out _))
            {
                errors.Add("Invalid content ID format. Must be GUID or integer");
            }
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    private bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        // Basic format check - must contain @ and at least one . after @
        if (!email.Contains("@") || !email.Contains("."))
            return false;

        var atIndex = email.IndexOf("@");
        if (atIndex <= 0 || atIndex >= email.Length - 1)
            return false;

        // Check there's a . after @
        var afterAt = email.Substring(atIndex + 1);
        if (!afterAt.Contains(".") || afterAt.StartsWith(".") || afterAt.EndsWith("."))
            return false;

        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email && email.Length >= 5;
        }
        catch
        {
            return false;
        }
    }

    private bool IsStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            return false;

        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(c => !char.IsLetterOrDigit(c));

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    private bool ContainsProfanity(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return false;

        // Simple profanity filter - in production, use a comprehensive service
        var profanityWords = new[] { "badword1", "badword2" }; // Placeholder
        return profanityWords.Any(word => text.ToLower().Contains(word));
    }

    private bool ContainsSqlInjectionPatterns(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return false;

        var sqlPatterns = new[]
        {
            "DROP TABLE", "DELETE FROM", "INSERT INTO", "UPDATE SET",
            "UNION SELECT", "'; --", "' OR '1'='1", "'; DROP"
        };

        return sqlPatterns.Any(pattern => text.ToUpper().Contains(pattern));
    }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}