using GeoLeap.Api.Utilities;
using Xunit;

namespace GeoLeap.Api.Tests.Utilities;

/// <summary>
/// Direct unit tests for CountryFlagHelper utility class.
/// Tests country code to emoji flag conversion and country name mapping.
/// </summary>
public class CountryFlagHelperDirectTests
{
    #region GetFlag Tests - Common Countries

    [Fact]
    public void GetFlag_UnitedStates_ReturnsUSFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("US");

        // Assert
        Assert.Equal("🇺🇸", result);
    }

    [Fact]
    public void GetFlag_Canada_ReturnsCAFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("CA");

        // Assert
        Assert.Equal("🇨🇦", result);
    }

    [Fact]
    public void GetFlag_UnitedKingdom_ReturnsGBFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("GB");

        // Assert
        Assert.Equal("🇬🇧", result);
    }

    [Fact]
    public void GetFlag_Germany_ReturnsDEFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("DE");

        // Assert
        Assert.Equal("🇩🇪", result);
    }

    [Fact]
    public void GetFlag_Japan_ReturnsJPFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("JP");

        // Assert
        Assert.Equal("🇯🇵", result);
    }

    [Fact]
    public void GetFlag_Australia_ReturnsAUFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("AU");

        // Assert
        Assert.Equal("🇦🇺", result);
    }

    [Fact]
    public void GetFlag_Brazil_ReturnsBRFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("BR");

        // Assert
        Assert.Equal("🇧🇷", result);
    }

    #endregion

    #region GetFlag Tests - Edge Cases

    [Fact]
    public void GetFlag_NullCountryCode_ReturnsGlobe()
    {
        // Act
        var result = CountryFlagHelper.GetFlag(null!);

        // Assert
        Assert.Equal("🌍", result);
    }

    [Fact]
    public void GetFlag_EmptyCountryCode_ReturnsGlobe()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("");

        // Assert
        Assert.Equal("🌍", result);
    }

    [Fact]
    public void GetFlag_WhitespaceCountryCode_ReturnsGlobe()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("   ");

        // Assert
        Assert.Equal("🌍", result);
    }

    [Fact]
    public void GetFlag_LowercaseCode_ReturnsCorrectFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("us");

        // Assert
        Assert.Equal("🇺🇸", result); // Should handle lowercase
    }

    [Fact]
    public void GetFlag_MixedCaseCode_ReturnsCorrectFlag()
    {
        // Act
        var result = CountryFlagHelper.GetFlag("Us");

        // Assert
        Assert.Equal("🇺🇸", result); // Should handle mixed case
    }

    #endregion

    #region GetFlag Tests - ConvertToFlag Fallback

    [Fact]
    public void GetFlag_UnknownTwoLetterCode_ConvertsFallback()
    {
        // Arrange - Use a country not in the common list (e.g., "FJ" for Fiji)
        var countryCode = "FJ";

        // Act
        var result = CountryFlagHelper.GetFlag(countryCode);

        // Assert - Should return a regional indicator flag (🇫🇯)
        Assert.NotNull(result);
        Assert.NotEqual("🌍", result); // Should not be globe
        Assert.True(result.Length > 0); // Should have some content
    }

    [Fact]
    public void GetFlag_InvalidLengthCode_ReturnsGlobe()
    {
        // Arrange
        var invalidCode = "USA"; // 3 letters instead of 2

        // Act
        var result = CountryFlagHelper.GetFlag(invalidCode);

        // Assert
        Assert.Equal("🌍", result);
    }

    [Fact]
    public void GetFlag_SingleLetterCode_ReturnsGlobe()
    {
        // Arrange
        var invalidCode = "U";

        // Act
        var result = CountryFlagHelper.GetFlag(invalidCode);

        // Assert
        Assert.Equal("🌍", result);
    }

    [Fact]
    public void GetFlag_NumericCode_ReturnsGlobe()
    {
        // Arrange
        var invalidCode = "12";

        // Act
        var result = CountryFlagHelper.GetFlag(invalidCode);

        // Assert
        Assert.Equal("🌍", result);
    }

    [Fact]
    public void GetFlag_SpecialCharactersCode_ReturnsGlobe()
    {
        // Arrange
        var invalidCode = "U$";

        // Act
        var result = CountryFlagHelper.GetFlag(invalidCode);

        // Assert
        Assert.Equal("🌍", result);
    }

    #endregion

    #region GetFlag Tests - Regional Coverage

    [Theory]
    [InlineData("US", "🇺🇸")] // North America
    [InlineData("CA", "🇨🇦")]
    [InlineData("MX", "🇲🇽")]
    [InlineData("GB", "🇬🇧")] // Europe
    [InlineData("FR", "🇫🇷")]
    [InlineData("DE", "🇩🇪")]
    [InlineData("JP", "🇯🇵")] // Asia
    [InlineData("CN", "🇨🇳")]
    [InlineData("IN", "🇮🇳")]
    [InlineData("AU", "🇦🇺")] // Oceania
    [InlineData("NZ", "🇳🇿")]
    [InlineData("BR", "🇧🇷")] // South America
    [InlineData("AR", "🇦🇷")]
    [InlineData("TR", "🇹🇷")] // Middle East
    [InlineData("SA", "🇸🇦")]
    [InlineData("ZA", "🇿🇦")] // Africa
    [InlineData("EG", "🇪🇬")]
    [InlineData("RU", "🇷🇺")] // Eastern Europe
    [InlineData("UA", "🇺🇦")]
    public void GetFlag_VariousCountries_ReturnsCorrectFlag(string countryCode, string expectedFlag)
    {
        // Act
        var result = CountryFlagHelper.GetFlag(countryCode);

        // Assert
        Assert.Equal(expectedFlag, result);
    }

    #endregion

    #region GetCountryName Tests - Common Countries

    [Fact]
    public void GetCountryName_UnitedStates_ReturnsFullName()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("US");

        // Assert
        Assert.Equal("United States", result);
    }

    [Fact]
    public void GetCountryName_Canada_ReturnsFullName()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("CA");

        // Assert
        Assert.Equal("Canada", result);
    }

    [Fact]
    public void GetCountryName_UnitedKingdom_ReturnsFullName()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("GB");

        // Assert
        Assert.Equal("United Kingdom", result);
    }

    [Fact]
    public void GetCountryName_Japan_ReturnsFullName()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("JP");

        // Assert
        Assert.Equal("Japan", result);
    }

    #endregion

    #region GetCountryName Tests - Edge Cases

    [Fact]
    public void GetCountryName_NullCode_ReturnsUnknown()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName(null!);

        // Assert
        Assert.Equal("Unknown", result);
    }

    [Fact]
    public void GetCountryName_EmptyCode_ReturnsUnknown()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("");

        // Assert
        Assert.Equal("Unknown", result);
    }

    [Fact]
    public void GetCountryName_WhitespaceCode_ReturnsUnknown()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("   ");

        // Assert
        Assert.Equal("Unknown", result);
    }

    [Fact]
    public void GetCountryName_LowercaseCode_ReturnsCorrectName()
    {
        // Act
        var result = CountryFlagHelper.GetCountryName("us");

        // Assert
        Assert.Equal("United States", result);
    }

    [Fact]
    public void GetCountryName_UnknownCode_ReturnsCode()
    {
        // Arrange
        var unknownCode = "XY";

        // Act
        var result = CountryFlagHelper.GetCountryName(unknownCode);

        // Assert
        Assert.Equal(unknownCode, result); // Returns the code itself if unknown
    }

    #endregion

    #region GetCountryName Tests - Regional Coverage

    [Theory]
    [InlineData("US", "United States")]
    [InlineData("CA", "Canada")]
    [InlineData("MX", "Mexico")]
    [InlineData("GB", "United Kingdom")]
    [InlineData("DE", "Germany")]
    [InlineData("FR", "France")]
    [InlineData("ES", "Spain")]
    [InlineData("IT", "Italy")]
    [InlineData("JP", "Japan")]
    [InlineData("KR", "South Korea")]
    [InlineData("CN", "China")]
    [InlineData("IN", "India")]
    [InlineData("AU", "Australia")]
    [InlineData("NZ", "New Zealand")]
    [InlineData("BR", "Brazil")]
    [InlineData("AR", "Argentina")]
    [InlineData("TR", "Turkey")]
    [InlineData("IL", "Israel")]
    [InlineData("SA", "Saudi Arabia")]
    [InlineData("AE", "United Arab Emirates")]
    [InlineData("ZA", "South Africa")]
    [InlineData("EG", "Egypt")]
    [InlineData("RU", "Russia")]
    [InlineData("UA", "Ukraine")]
    public void GetCountryName_VariousCountries_ReturnsCorrectName(string countryCode, string expectedName)
    {
        // Act
        var result = CountryFlagHelper.GetCountryName(countryCode);

        // Assert
        Assert.Equal(expectedName, result);
    }

    #endregion

    #region Integration Tests

    [Fact]
    public void GetFlagAndName_Consistency_BothMethodsHandleSameInputs()
    {
        // Arrange
        var testCodes = new[] { "US", "GB", "JP", "AU", "BR", null, "", "XY" };

        foreach (var code in testCodes)
        {
            // Act
            var flag = CountryFlagHelper.GetFlag(code!);
            var name = CountryFlagHelper.GetCountryName(code!);

            // Assert - Both methods should handle inputs without throwing
            Assert.NotNull(flag);
            Assert.NotNull(name);
        }
    }

    [Fact]
    public void GetFlag_AllMappedCountries_ReturnEmojiFlags()
    {
        // Arrange - All countries from the switch statement
        var countries = new[]
        {
            "US", "CA", "MX", "GB", "DE", "FR", "ES", "IT", "NL", "BE",
            "CH", "AT", "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "RO",
            "GR", "PT", "IE", "JP", "KR", "CN", "IN", "TH", "SG", "MY",
            "ID", "PH", "VN", "TW", "HK", "AU", "NZ", "BR", "AR", "CL",
            "CO", "PE", "VE", "TR", "IL", "SA", "AE", "ZA", "EG", "NG",
            "KE", "RU", "UA"
        };

        foreach (var code in countries)
        {
            // Act
            var flag = CountryFlagHelper.GetFlag(code);

            // Assert - Should not be globe for mapped countries
            Assert.NotEqual("🌍", flag);
            Assert.True(flag.Length > 0);
        }
    }

    #endregion
}
