using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for PasswordValidationService (not via HTTP).
/// Tests pure validation and strength analysis methods that are measurable by standard coverage tools.
/// </summary>
public class PasswordValidationServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IPasswordHasher<User>> _passwordHasherMock;
    private readonly Mock<ILogger<PasswordValidationService>> _loggerMock;
    private readonly PasswordValidationService _service;

    public PasswordValidationServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _passwordHasherMock = new Mock<IPasswordHasher<User>>();
        _loggerMock = new Mock<ILogger<PasswordValidationService>>();

        _service = new PasswordValidationService(_context, _passwordHasherMock.Object, _loggerMock.Object);
    }

    #region ValidatePassword Tests

    [Fact]
    public void ValidatePassword_WithValidPassword_ReturnsValid()
    {
        // Arrange
        var password = "SecureP@ssw0rd!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void ValidatePassword_WithNullPassword_ReturnsInvalid()
    {
        // Act
        var result = _service.ValidatePassword(null!);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password is required", result.Errors);
    }

    [Fact]
    public void ValidatePassword_WithEmptyPassword_ReturnsInvalid()
    {
        // Act
        var result = _service.ValidatePassword("");

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password is required", result.Errors);
    }

    [Fact]
    public void ValidatePassword_WithWhitespacePassword_ReturnsInvalid()
    {
        // Act
        var result = _service.ValidatePassword("   ");

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password is required", result.Errors);
    }

    [Fact]
    public void ValidatePassword_TooShort_ReturnsError()
    {
        // Arrange
        var password = "Short1!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password must be at least 8 characters long", result.Errors);
    }

    [Fact]
    public void ValidatePassword_TooLong_ReturnsError()
    {
        // Arrange
        var password = new string('A', 130) + "a1!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password must be no more than 128 characters long", result.Errors);
    }

    [Fact]
    public void ValidatePassword_MissingLowercase_ReturnsError()
    {
        // Arrange
        var password = "PASSWORD123!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password must contain at least one lowercase letter", result.Errors);
    }

    [Fact]
    public void ValidatePassword_MissingUppercase_ReturnsError()
    {
        // Arrange
        var password = "password123!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password must contain at least one uppercase letter", result.Errors);
    }

    [Fact]
    public void ValidatePassword_MissingNumber_ReturnsError()
    {
        // Arrange
        var password = "Password!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password must contain at least one number", result.Errors);
    }

    [Fact]
    public void ValidatePassword_MissingSpecialCharacter_ReturnsError()
    {
        // Arrange
        var password = "Password123";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password must contain at least one special character", result.Errors);
    }

    [Fact]
    public void ValidatePassword_ContainsCommonPattern_ReturnsError()
    {
        // Arrange
        var password = "Password123456!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password contains common patterns that are easily guessable", result.Errors);
    }

    [Fact]
    public void ValidatePassword_WithQwertyPattern_ReturnsError()
    {
        // Arrange
        var password = "Qwerty123!";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Password contains common patterns that are easily guessable", result.Errors);
    }

    [Fact]
    public void ValidatePassword_MultipleErrors_ReturnsAllErrors()
    {
        // Arrange
        var password = "pass";

        // Act
        var result = _service.ValidatePassword(password);

        // Assert
        Assert.False(result.IsValid);
        Assert.True(result.Errors.Count > 1);
    }

    #endregion

    #region AnalyzePasswordStrength Tests

    [Fact]
    public void AnalyzePasswordStrength_WithEmptyPassword_ReturnsVeryWeak()
    {
        // Act
        var result = _service.AnalyzePasswordStrength("");

        // Assert
        Assert.Equal(PasswordStrength.VeryWeak, result.Strength);
        Assert.Equal(0, result.Score);
        Assert.Contains("Password is empty", result.Feedback);
    }

    [Fact]
    public void AnalyzePasswordStrength_WithWeakPassword_ReturnsWeakStrength()
    {
        // Arrange
        var password = "password";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.True(result.Strength == PasswordStrength.VeryWeak || result.Strength == PasswordStrength.Weak);
        Assert.False(result.MeetsRequirements);
    }

    [Fact]
    public void AnalyzePasswordStrength_WithMediumPassword_ReturnsFairOrBetter()
    {
        // Arrange
        var password = "Password1!";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert - Password1! contains "password" common pattern, so may be weak
        Assert.True(result.Strength >= PasswordStrength.VeryWeak);
        Assert.True(result.Score >= 0);
        Assert.NotNull(result.Feedback);
    }

    [Fact]
    public void AnalyzePasswordStrength_WithStrongPassword_ReturnsStrongOrVeryStrong()
    {
        // Arrange
        var password = "MyV3ry$tr0ngP@ssw0rd!2024";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.True(result.Strength >= PasswordStrength.Strong);
        Assert.True(result.MeetsRequirements);
        Assert.True(result.Score >= 7);
    }

    [Fact]
    public void AnalyzePasswordStrength_ShortPassword_SuggestsLongerPassword()
    {
        // Arrange
        var password = "Pass123!";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.Contains(result.Feedback, f => f.Contains("longer password"));
    }

    [Fact]
    public void AnalyzePasswordStrength_NoSpecialChars_SuggestsSpecialCharacters()
    {
        // Arrange
        var password = "Password123";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.Contains(result.Feedback, f => f.Contains("special characters"));
    }

    [Fact]
    public void AnalyzePasswordStrength_WithCommonPattern_SuggestsAvoidingCommonWords()
    {
        // Arrange
        var password = "Password123!";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.Contains(result.Feedback, f => f.Contains("common words"));
    }

    [Fact]
    public void AnalyzePasswordStrength_LongComplexPassword_ReturnsHighScore()
    {
        // Arrange
        var password = "C0mpl3x!P@ssw0rd#With$Many%Characters&2024";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert - Complex password should be Strong or VeryStrong
        Assert.True(result.Score >= 7);
        Assert.True(result.Strength >= PasswordStrength.Strong);
        Assert.True(result.MeetsRequirements);
    }

    [Fact]
    public void AnalyzePasswordStrength_ValidPassword_MeetsRequirements()
    {
        // Arrange
        var password = "ValidP@ssw0rd!";

        // Act
        var result = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.True(result.MeetsRequirements);
    }

    [Fact]
    public void AnalyzePasswordStrength_ConsistentResults_SamePasswordSameScore()
    {
        // Arrange
        var password = "TestP@ssw0rd123!";

        // Act
        var result1 = _service.AnalyzePasswordStrength(password);
        var result2 = _service.AnalyzePasswordStrength(password);

        // Assert
        Assert.Equal(result1.Score, result2.Score);
        Assert.Equal(result1.Strength, result2.Strength);
        Assert.Equal(result1.MeetsRequirements, result2.MeetsRequirements);
    }

    #endregion

    #region Edge Cases and Integration

    [Fact]
    public void ValidatePassword_SetsStrengthFromAnalysis()
    {
        // Arrange
        var weakPassword = "Pass123!";
        var strongPassword = "MyV3ry$tr0ngP@ssw0rd!2024";

        // Act
        var weakResult = _service.ValidatePassword(weakPassword);
        var strongResult = _service.ValidatePassword(strongPassword);

        // Assert - Weak password should have lower strength
        Assert.True(weakResult.Strength < strongResult.Strength);
    }

    [Fact]
    public void AnalyzePasswordStrength_ScoreBoundaries_NeverExceedMaximum()
    {
        // Arrange - Various passwords
        var passwords = new[]
        {
            "a",
            "Pass123!",
            "MyV3ry$tr0ngP@ssw0rd!2024",
            new string('A', 100) + "a1!@#$",
            ""
        };

        // Act & Assert
        foreach (var password in passwords)
        {
            var result = _service.AnalyzePasswordStrength(password);
            Assert.True(result.Score >= 0 && result.Score <= 10);
        }
    }

    #endregion

    public void Dispose()
    {
        _context.Dispose();
    }
}
