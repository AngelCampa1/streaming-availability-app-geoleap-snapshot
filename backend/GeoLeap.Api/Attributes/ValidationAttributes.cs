using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Attributes;

/// <summary>
/// Strong email validation attribute that requires proper format
/// </summary>
public class StrictEmailAttribute : ValidationAttribute
{
    private static readonly Regex EmailRegex = new Regex(
        @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public override bool IsValid(object? value)
    {
        if (value is string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            return EmailRegex.IsMatch(email) && email.Contains("@") && email.Contains(".");
        }

        return false;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field is not a valid email address.";
    }
}

/// <summary>
/// Strong password validation that requires complexity
/// </summary>
public class StrongPasswordAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                return false;

            bool hasUpper = password.Any(char.IsUpper);
            bool hasLower = password.Any(char.IsLower);
            bool hasDigit = password.Any(char.IsDigit);
            bool hasSpecial = password.Any(c => !char.IsLetterOrDigit(c));

            return hasUpper && hasLower && hasDigit && hasSpecial;
        }

        return false;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be at least 8 characters long and contain uppercase, lowercase, number and special character.";
    }
}

/// <summary>
/// Validates positive amounts for payments
/// </summary>
public class PositiveAmountAttribute : ValidationAttribute
{
    public double MaxAmount { get; set; } = 10000;

    public override bool IsValid(object? value)
    {
        if (value is decimal amount)
        {
            return amount > 0 && amount <= (decimal)MaxAmount;
        }

        if (value is double doubleAmount)
        {
            return doubleAmount > 0 && doubleAmount <= MaxAmount;
        }

        return false;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be greater than 0 and not exceed {MaxAmount}.";
    }
}

/// <summary>
/// Validates page size for pagination
/// </summary>
public class PageSizeAttribute : ValidationAttribute
{
    public int MinSize { get; set; } = 1;
    public int MaxSize { get; set; } = 100;

    public override bool IsValid(object? value)
    {
        if (value is int size)
        {
            return size >= MinSize && size <= MaxSize;
        }

        return false;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be between {MinSize} and {MaxSize}.";
    }
}

/// <summary>
/// Validates content types
/// </summary>
public class ValidContentTypeAttribute : ValidationAttribute
{
    private static readonly string[] ValidTypes = { "movie", "tv", "series", "all" };

    public override bool IsValid(object? value)
    {
        if (value is string contentType)
        {
            if (string.IsNullOrWhiteSpace(contentType))
                return true; // Allow empty for optional fields
            return ValidTypes.Contains(contentType.ToLower());
        }

        return true; // Allow null/empty for optional fields
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be one of: {string.Join(", ", ValidTypes)}.";
    }
}

/// <summary>
/// Validates Stripe payment method IDs
/// </summary>
public class StripeIdAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is string stripeId)
        {
            if (string.IsNullOrWhiteSpace(stripeId))
                return false;

            return stripeId.StartsWith("pm_") || stripeId.StartsWith("card_") || stripeId.StartsWith("src_");
        }

        return false;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field must be a valid Stripe payment method ID.";
    }
}