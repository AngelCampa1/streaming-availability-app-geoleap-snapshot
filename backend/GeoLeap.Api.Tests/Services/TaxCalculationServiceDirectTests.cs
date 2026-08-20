using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Comprehensive DirectTests for TaxCalculationService
/// Tests tax calculations with different jurisdictions, exemptions, and validation rules
/// Pattern: InMemoryDatabase with unique Guid per test class
/// </summary>
public class TaxCalculationServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<TaxCalculationService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly TaxCalculationService _service;
    private readonly string _testCorrelationId = "test-correlation-tax-123";

    public TaxCalculationServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TaxCalculationDirectTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<TaxCalculationService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        _service = new TaxCalculationService(_context, _mockLogger.Object, _mockConfiguration.Object);
    }

    #region Basic Tax Calculation Tests

    [Fact]
    public async Task CalculateTaxAsync_US_California_CalculatesCorrectly()
    {
        // Arrange
        var amount = 100.00m;
        var country = "US";
        var state = "CA";
        var expectedTax = 9.75m; // 9.75% CA sales tax

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, null, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.0975m, result.Rate);
        Assert.Equal("sales_tax", result.TaxType);
        Assert.Equal(amount, result.TaxableAmount);
    }

    [Fact]
    public async Task CalculateTaxAsync_US_NewYork_CalculatesCorrectly()
    {
        // Arrange
        var amount = 200.00m;
        var country = "US";
        var state = "NY";
        var expectedTax = 16.00m; // 8% NY sales tax

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.08m, result.Rate);
        Assert.Equal("US", result.Country);
        Assert.Equal("NY", result.StateProvince);
    }

    [Fact]
    public async Task CalculateTaxAsync_US_Texas_CalculatesCorrectly()
    {
        // Arrange
        var amount = 150.00m;
        var country = "US";
        var state = "TX";
        var expectedTax = 9.38m; // 6.25% TX sales tax, rounded

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.0625m, result.Rate);
    }

    [Fact]
    public async Task CalculateTaxAsync_GB_VAT_CalculatesCorrectly()
    {
        // Arrange
        var amount = 100.00m;
        var country = "GB";
        var expectedTax = 20.00m; // 20% UK VAT

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, null, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.20m, result.Rate);
        Assert.Equal("vat", result.TaxType);
        Assert.Equal("VAT", result.TaxName);
    }

    [Fact]
    public async Task CalculateTaxAsync_Germany_VAT_CalculatesCorrectly()
    {
        // Arrange
        var amount = 100.00m;
        var country = "DE";
        var expectedTax = 19.00m; // 19% Germany VAT

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, null, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.19m, result.Rate);
        Assert.Equal("Mehrwertsteuer (VAT)", result.TaxName);
    }

    [Fact]
    public async Task CalculateTaxAsync_France_VAT_CalculatesCorrectly()
    {
        // Arrange
        var amount = 100.00m;
        var country = "FR";
        var expectedTax = 20.00m; // 20% France VAT

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, null, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.20m, result.Rate);
        Assert.Equal("TVA (VAT)", result.TaxName);
    }

    [Fact]
    public async Task CalculateTaxAsync_Canada_Ontario_CalculatesCorrectly()
    {
        // Arrange
        var amount = 100.00m;
        var country = "CA";
        var province = "ON";
        var expectedTax = 13.00m; // 13% Ontario HST

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, province, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.13m, result.Rate);
        Assert.Equal("gst", result.TaxType);
    }

    [Fact]
    public async Task CalculateTaxAsync_Canada_Quebec_CalculatesCorrectly()
    {
        // Arrange
        var amount = 100.00m;
        var country = "CA";
        var province = "QC";
        var expectedTax = 14.98m; // 14.975% Quebec GST + QST, rounded

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, province, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(0.14975m, result.Rate);
    }

    [Fact]
    public async Task CalculateTaxAsync_UnsupportedCountry_ReturnsZeroTax()
    {
        // Arrange
        var amount = 100.00m;
        var country = "ZZ"; // Unknown country

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, null, null, _testCorrelationId);

        // Assert
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal(0m, result.Rate);
    }

    #endregion

    #region Tax Exemption Tests

    [Fact]
    public async Task CalculateTaxAsync_WithExemptTaxId_ReturnsZeroTax()
    {
        // Arrange
        var amount = 100.00m;
        var country = "US";
        var state = "CA";
        var taxId = "EX-123456789"; // Exempt tax ID pattern

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, taxId, _testCorrelationId);

        // Assert
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal(0m, result.Rate);
        Assert.Equal("exempt", result.TaxType);
        Assert.Equal("Tax Exempt", result.TaxName);
    }

    [Fact]
    public async Task CalculateTaxAsync_WithValidEIN_ReturnsZeroTax()
    {
        // Arrange
        var amount = 100.00m;
        var country = "US";
        var state = "NY";
        var taxId = "123456789"; // 9-digit EIN format

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, taxId, _testCorrelationId);

        // Assert
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal("exempt", result.TaxType);
    }

    [Fact]
    public async Task CalculateTaxAsync_WithUKExemptVAT_ReturnsZeroTax()
    {
        // Arrange
        var amount = 100.00m;
        var country = "GB";
        var taxId = "GB123456789"; // UK VAT exempt pattern

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, null, taxId, _testCorrelationId);

        // Assert
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal("exempt", result.TaxType);
    }

    [Fact]
    public async Task IsTaxExemptAsync_WithExemptPrefix_ReturnsTrue()
    {
        // Arrange
        var taxId = "EX-ABC123";
        var country = "US";

        // Act
        var result = await _service.IsTaxExemptAsync(taxId, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsTaxExemptAsync_WithNineDigitEIN_ReturnsTrue()
    {
        // Arrange
        var taxId = "987654321";
        var country = "US";

        // Act
        var result = await _service.IsTaxExemptAsync(taxId, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsTaxExemptAsync_WithEmptyTaxId_ReturnsFalse()
    {
        // Arrange
        var country = "US";

        // Act
        var result = await _service.IsTaxExemptAsync("", country, _testCorrelationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsTaxExemptAsync_WithNonExemptTaxId_ReturnsFalse()
    {
        // Arrange
        var taxId = "12345"; // Invalid format
        var country = "US";

        // Act
        var result = await _service.IsTaxExemptAsync(taxId, country, _testCorrelationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Rounding and Precision Tests

    [Fact]
    public async Task CalculateTaxAsync_RoundsToTwoDecimals()
    {
        // Arrange
        var amount = 99.99m;
        var country = "US";
        var state = "CA";
        var expectedTax = 9.75m; // Should round 9.74903 to 9.75

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
    }

    [Fact]
    public async Task CalculateTaxAsync_SmallAmount_CalculatesCorrectly()
    {
        // Arrange
        var amount = 0.50m;
        var country = "US";
        var state = "CA";
        var expectedTax = 0.05m; // 9.75% of $0.50 = $0.04875, rounds to $0.05

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, state, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
    }

    [Fact]
    public async Task CalculateTaxAsync_LargeAmount_CalculatesCorrectly()
    {
        // Arrange
        var amount = 10000.00m;
        var country = "GB";
        var expectedTax = 2000.00m; // 20% VAT

        // Act
        var result = await _service.CalculateTaxAsync(amount, country, null, null, _testCorrelationId);

        // Assert
        Assert.Equal(expectedTax, result.TaxAmount);
    }

    #endregion

    #region Multiple Tax Calculations Tests

    [Fact]
    public async Task CalculateMultipleTaxesAsync_WithMultipleLineItems_CalculatesTotal()
    {
        // Arrange
        var lineItems = new List<InvoiceLineItemDto>
        {
            new InvoiceLineItemDto { Amount = 50.00m, Description = "Item 1" },
            new InvoiceLineItemDto { Amount = 30.00m, Description = "Item 2" },
            new InvoiceLineItemDto { Amount = 20.00m, Description = "Item 3" }
        };
        var billingAddress = new BillingAddressDto { Country = "US", State = "CA" };
        var expectedTax = 9.75m; // 9.75% of $100

        // Act
        var result = await _service.CalculateMultipleTaxesAsync(lineItems, billingAddress, _testCorrelationId);

        // Assert
        Assert.Single(result);
        Assert.Equal(expectedTax, result[0].TaxAmount);
        Assert.Equal(100.00m, result[0].TaxableAmount);
    }

    [Fact]
    public async Task CalculateMultipleTaxesAsync_WithZeroAmount_ReturnsEmpty()
    {
        // Arrange
        var lineItems = new List<InvoiceLineItemDto>
        {
            new InvoiceLineItemDto { Amount = 0m, Description = "Free item" }
        };
        var billingAddress = new BillingAddressDto { Country = "US", State = "CA" };

        // Act
        var result = await _service.CalculateMultipleTaxesAsync(lineItems, billingAddress, _testCorrelationId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task CalculateMultipleTaxesAsync_WithEmptyLineItems_ReturnsEmpty()
    {
        // Arrange
        var lineItems = new List<InvoiceLineItemDto>();
        var billingAddress = new BillingAddressDto { Country = "US", State = "CA" };

        // Act
        var result = await _service.CalculateMultipleTaxesAsync(lineItems, billingAddress, _testCorrelationId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region Tax ID Validation Tests

    [Fact]
    public async Task ValidateTaxIdAsync_US_EIN_ValidFormat_ReturnsTrue()
    {
        // Arrange
        var taxId = "12-3456789";
        var taxIdType = "ein";
        var country = "US";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_US_SSN_ValidFormat_ReturnsTrue()
    {
        // Arrange
        var taxId = "123-45-6789";
        var taxIdType = "ssn";
        var country = "US";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_US_EIN_InvalidFormat_ReturnsFalse()
    {
        // Arrange
        var taxId = "123456789"; // Missing hyphen
        var taxIdType = "ein";
        var country = "US";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_UK_VAT_ValidFormat_ReturnsTrue()
    {
        // Arrange
        var taxId = "GB123456789"; // 9 digits
        var taxIdType = "vat";
        var country = "GB";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_UK_VAT_12Digits_ReturnsTrue()
    {
        // Arrange
        var taxId = "GB123456789012"; // 12 digits
        var taxIdType = "vat";
        var country = "GB";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_EU_VAT_ValidFormat_ReturnsTrue()
    {
        // Arrange
        var taxId = "DE12345678";
        var taxIdType = "vat";
        var country = "DE";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_Canada_ValidFormat_ReturnsTrue()
    {
        // Arrange
        var taxId = "123456789RC0001";
        var taxIdType = "bn";
        var country = "CA";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateTaxIdAsync_EmptyTaxId_ReturnsTrue()
    {
        // Arrange - Tax ID is optional
        var taxId = "";
        var taxIdType = "ein";
        var country = "US";

        // Act
        var result = await _service.ValidateTaxIdAsync(taxId, taxIdType, country, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region Jurisdiction Tests

    [Fact]
    public async Task DetermineTaxJurisdictionAsync_WithState_ReturnsCombined()
    {
        // Arrange
        var address = new BillingAddressDto { Country = "US", State = "CA" };

        // Act
        var result = await _service.DetermineTaxJurisdictionAsync(address);

        // Assert
        Assert.Equal("US/CA", result);
    }

    [Fact]
    public async Task DetermineTaxJurisdictionAsync_WithoutState_ReturnsCountryOnly()
    {
        // Arrange
        var address = new BillingAddressDto { Country = "GB", State = "" };

        // Act
        var result = await _service.DetermineTaxJurisdictionAsync(address);

        // Assert
        Assert.Equal("GB", result);
    }

    [Fact]
    public async Task GetSupportedTaxJurisdictionsAsync_ReturnsAllJurisdictions()
    {
        // Act
        var result = await _service.GetSupportedTaxJurisdictionsAsync();

        // Assert
        Assert.NotEmpty(result);
        Assert.Contains("US/CA", result);
        Assert.Contains("US/NY", result);
        Assert.Contains("US/TX", result);
        Assert.Contains("GB", result);
        Assert.Contains("DE", result);
        Assert.Contains("FR", result);
        Assert.Contains("CA/ON", result);
    }

    [Fact]
    public async Task GetTaxRateAsync_WithValidJurisdiction_ReturnsCorrectRate()
    {
        // Arrange
        var country = "US";
        var state = "CA";

        // Act
        var result = await _service.GetTaxRateAsync(country, state, "sales_tax");

        // Assert
        Assert.Equal(0.0975m, result);
    }

    [Fact]
    public async Task GetTaxRateAsync_WithUnsupportedCountry_ReturnsZero()
    {
        // Arrange
        var country = "ZZ";
        var state = "";

        // Act
        var result = await _service.GetTaxRateAsync(country, state, "tax");

        // Assert
        Assert.Equal(0m, result);
    }

    [Fact]
    public async Task GetTaxRateAsync_CaseInsensitive_ReturnsCorrectRate()
    {
        // Arrange
        var country = "us"; // lowercase
        var state = "ca"; // lowercase

        // Act
        var result = await _service.GetTaxRateAsync(country, state, "sales_tax");

        // Assert
        Assert.Equal(0.0975m, result);
    }

    #endregion

    #region Tax Report Generation Tests

    [Fact]
    public async Task GenerateTaxReportAsync_WithNoData_ReturnsEmptyReport()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;
        var jurisdiction = "US/CA";

        // Act
        var result = await _service.GenerateTaxReportAsync(startDate, endDate, jurisdiction);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(jurisdiction, result["jurisdiction"]);
        Assert.Equal(startDate, result["start_date"]);
        Assert.Equal(endDate, result["end_date"]);
        Assert.Equal(0m, result["total_tax_collected"]);
        Assert.Equal(0, result["transaction_count"]);
    }

    #endregion

    public void Dispose()
    {
        try
        {
            _context?.Database.EnsureDeleted();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed, ignore
        }
        finally
        {
            _context?.Dispose();
        }
    }
}
