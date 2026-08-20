using Xunit;
using GeoLeap.Api.Utilities;

namespace GeoLeap.Api.Tests.Utilities;

/// <summary>
/// Tests for CountryFlagHelper utility
/// </summary>
public class CountryFlagHelperTests
{
    [Theory]
    [InlineData("US", "🇺🇸")]
    [InlineData("GB", "🇬🇧")]
    [InlineData("FR", "🇫🇷")]
    [InlineData("DE", "🇩🇪")]
    [InlineData("JP", "🇯🇵")]
    [InlineData("CA", "🇨🇦")]
    public void GetFlag_WithValidCountryCode_ReturnsCorrectFlag(string countryCode, string expectedFlag)
    {
        // Act
        var flag = CountryFlagHelper.GetFlag(countryCode);

        // Assert
        Assert.Equal(expectedFlag, flag);
    }

    [Theory]
    [InlineData("us", "🇺🇸")] // lowercase
    [InlineData("Us", "🇺🇸")] // mixed case
    [InlineData("uS", "🇺🇸")] // mixed case
    public void GetFlag_WithDifferentCasing_ReturnsCorrectFlag(string countryCode, string expectedFlag)
    {
        // Act
        var flag = CountryFlagHelper.GetFlag(countryCode);

        // Assert
        Assert.Equal(expectedFlag, flag);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public void GetFlag_WithInvalidInput_ReturnsGlobeEmoji(string? countryCode)
    {
        // Act
        var flag = CountryFlagHelper.GetFlag(countryCode!);

        // Assert
        Assert.Equal("🌍", flag);
    }

    [Theory]
    [InlineData("ZZ")] // Invalid country code
    [InlineData("XX")] // Invalid country code
    public void GetFlag_WithUnrecognizedCountryCode_ReturnsValidEmoji(string countryCode)
    {
        // Act
        var flag = CountryFlagHelper.GetFlag(countryCode);

        // Assert - should either return specific flag or globe
        Assert.NotNull(flag);
        Assert.NotEmpty(flag);
    }

    [Theory]
    [InlineData("US", "United States")]
    [InlineData("GB", "United Kingdom")]
    [InlineData("FR", "France")]
    [InlineData("DE", "Germany")]
    [InlineData("JP", "Japan")]
    [InlineData("CA", "Canada")]
    public void GetCountryName_WithValidCountryCode_ReturnsCorrectName(string countryCode, string expectedName)
    {
        // Act
        var name = CountryFlagHelper.GetCountryName(countryCode);

        // Assert
        Assert.Equal(expectedName, name);
    }

    [Theory]
    [InlineData("us", "United States")] // lowercase
    [InlineData("Us", "United States")] // mixed case
    public void GetCountryName_WithDifferentCasing_ReturnsCorrectName(string countryCode, string expectedName)
    {
        // Act
        var name = CountryFlagHelper.GetCountryName(countryCode);

        // Assert
        Assert.Equal(expectedName, name);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public void GetCountryName_WithInvalidInput_ReturnsUnknown(string? countryCode)
    {
        // Act
        var name = CountryFlagHelper.GetCountryName(countryCode!);

        // Assert
        Assert.Equal("Unknown", name);
    }

    [Theory]
    [InlineData("ZZ")] // Unrecognized country code
    public void GetCountryName_WithUnrecognizedCode_ReturnsTheCode(string countryCode)
    {
        // Act
        var name = CountryFlagHelper.GetCountryName(countryCode);

        // Assert
        Assert.Equal(countryCode, name);
    }

    [Theory]
    [InlineData("ES")] // Spain
    [InlineData("IT")] // Italy
    [InlineData("BR")] // Brazil
    [InlineData("AU")] // Australia
    [InlineData("IN")] // India
    [InlineData("KR")] // South Korea
    public void GetFlag_WithCommonCountries_ReturnsValidFlag(string countryCode)
    {
        // Act
        var flag = CountryFlagHelper.GetFlag(countryCode);

        // Assert
        Assert.NotNull(flag);
        Assert.NotEmpty(flag);
        Assert.NotEqual("🌍", flag); // Should not be fallback for common countries
    }

    [Fact]
    public void GetFlag_AllMappedCountries_ReturnsUniqueFlags()
    {
        // Arrange
        var countryCodes = new[] { "US", "GB", "FR", "DE", "JP", "CA", "ES", "IT", "BR", "AU" };
        var flags = new HashSet<string>();

        // Act
        foreach (var code in countryCodes)
        {
            var flag = CountryFlagHelper.GetFlag(code);
            flags.Add(flag);
        }

        // Assert - each country should have a unique flag
        Assert.Equal(countryCodes.Length, flags.Count);
    }
}
