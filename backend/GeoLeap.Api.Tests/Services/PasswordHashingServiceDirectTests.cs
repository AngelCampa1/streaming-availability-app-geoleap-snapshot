using GeoLeap.Api.Services;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for PasswordHashingService (not via HTTP).
/// Tests cryptographic hashing and verification functions.
/// </summary>
public class PasswordHashingServiceDirectTests
{
    private readonly PasswordHashingService _service;

    public PasswordHashingServiceDirectTests()
    {
        _service = new PasswordHashingService();
    }

    #region HashPassword Tests

    [Fact]
    public void HashPassword_WithValidPassword_ReturnsHash()
    {
        // Arrange
        var password = "SecureP@ssw0rd123";

        // Act
        var hash = _service.HashPassword(password);

        // Assert
        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
        Assert.NotEqual(password, hash); // Hash should be different from password
        Assert.True(hash.Length > 50); // BCrypt hashes are typically 60 characters
    }

    [Fact]
    public void HashPassword_SamePassword_ProducesDifferentHashes()
    {
        // Arrange
        var password = "SecureP@ssw0rd123";

        // Act
        var hash1 = _service.HashPassword(password);
        var hash2 = _service.HashPassword(password);

        // Assert - BCrypt includes random salt, so same password produces different hashes
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void HashPassword_WithNullPassword_ThrowsArgumentException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => _service.HashPassword(null!));
        Assert.Contains("Password cannot be null or empty", exception.Message);
    }

    [Fact]
    public void HashPassword_WithEmptyPassword_ThrowsArgumentException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => _service.HashPassword(""));
        Assert.Contains("Password cannot be null or empty", exception.Message);
    }

    [Fact]
    public void HashPassword_WithWhitespacePassword_ThrowsArgumentException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => _service.HashPassword("   "));
        Assert.Contains("Password cannot be null or empty", exception.Message);
    }

    [Fact]
    public void HashPassword_DifferentPasswords_ProduceDifferentHashes()
    {
        // Arrange
        var password1 = "Password1!";
        var password2 = "Password2!";

        // Act
        var hash1 = _service.HashPassword(password1);
        var hash2 = _service.HashPassword(password2);

        // Assert
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void HashPassword_LongPassword_ReturnsHash()
    {
        // Arrange
        var password = new string('A', 100) + "a1!";

        // Act
        var hash = _service.HashPassword(password);

        // Assert
        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
    }

    #endregion

    #region VerifyPassword Tests

    [Fact]
    public void VerifyPassword_CorrectPassword_ReturnsTrue()
    {
        // Arrange
        var password = "SecureP@ssw0rd123";
        var hash = _service.HashPassword(password);

        // Act
        var result = _service.VerifyPassword(password, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        // Arrange
        var correctPassword = "SecureP@ssw0rd123";
        var wrongPassword = "WrongPassword456!";
        var hash = _service.HashPassword(correctPassword);

        // Act
        var result = _service.VerifyPassword(wrongPassword, hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_NullPassword_ReturnsFalse()
    {
        // Arrange
        var hash = _service.HashPassword("ValidPassword123!");

        // Act
        var result = _service.VerifyPassword(null!, hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_EmptyPassword_ReturnsFalse()
    {
        // Arrange
        var hash = _service.HashPassword("ValidPassword123!");

        // Act
        var result = _service.VerifyPassword("", hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_WhitespacePassword_ReturnsFalse()
    {
        // Arrange
        var hash = _service.HashPassword("ValidPassword123!");

        // Act
        var result = _service.VerifyPassword("   ", hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_NullHash_ReturnsFalse()
    {
        // Act
        var result = _service.VerifyPassword("Password123!", null!);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_EmptyHash_ReturnsFalse()
    {
        // Act
        var result = _service.VerifyPassword("Password123!", "");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_InvalidHash_ReturnsFalse()
    {
        // Arrange
        var invalidHash = "not-a-valid-bcrypt-hash";

        // Act
        var result = _service.VerifyPassword("Password123!", invalidHash);

        // Assert
        Assert.False(result); // Should return false instead of throwing
    }

    [Fact]
    public void VerifyPassword_CaseSensitive_Different()
    {
        // Arrange
        var password = "SecureP@ssw0rd123";
        var hash = _service.HashPassword(password);

        // Act
        var resultLower = _service.VerifyPassword("securep@ssw0rd123", hash);
        var resultUpper = _service.VerifyPassword("SECUREP@SSW0RD123", hash);

        // Assert - Password verification is case-sensitive
        Assert.False(resultLower);
        Assert.False(resultUpper);
    }

    #endregion

    #region Integration Tests

    [Fact]
    public void HashAndVerify_MultiplePasswords_AllWork()
    {
        // Arrange
        var passwords = new[]
        {
            "ShortP@ss1",
            "MediumPasswordWith123!",
            "VeryLongPasswordWith123!@#$%SpecialCharactersAndNumbers987654321",
            "Sp3c!@l#Ch@r$P@ss",
            "12345!@#$%AbCdE"
        };

        foreach (var password in passwords)
        {
            // Act
            var hash = _service.HashPassword(password);
            var result = _service.VerifyPassword(password, hash);

            // Assert
            Assert.True(result, $"Failed to verify password: {password.Substring(0, Math.Min(5, password.Length))}...");
        }
    }

    [Fact]
    public void HashPassword_RepeatedCalls_ProducesValidHashes()
    {
        // Arrange
        var password = "TestPassword123!";
        var hashes = new List<string>();

        // Act - Create 5 different hashes of the same password
        for (int i = 0; i < 5; i++)
        {
            hashes.Add(_service.HashPassword(password));
        }

        // Assert - All hashes should be different but all should verify
        var uniqueHashes = hashes.Distinct().Count();
        Assert.Equal(5, uniqueHashes); // All hashes should be unique

        foreach (var hash in hashes)
        {
            Assert.True(_service.VerifyPassword(password, hash));
        }
    }

    #endregion
}
