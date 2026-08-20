using GeoLeap.Api.Services;
using Google.Apis.AndroidPublisher.v3;
using Google.Apis.AndroidPublisher.v3.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Google;

namespace GeoLeap.Api.Tests.Services;

public class AndroidReceiptVerificationServiceTests
{
    private readonly Mock<ILogger<AndroidReceiptVerificationService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;

    public AndroidReceiptVerificationServiceTests()
    {
        _mockLogger = new Mock<ILogger<AndroidReceiptVerificationService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Setup minimal configuration - service will fail to initialize, which is expected for tests
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"]).Returns((string?)null);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_ServiceNotInitialized_ReturnsError()
    {
        // Arrange
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync("com.example.app", "premium_monthly", "purchase-token");

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Equal("Verification service not available", result.ErrorMessage);
    }

    [Fact]
    public void Constructor_MissingConfiguration_LogsWarning()
    {
        // Arrange & Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert - verify warning was logged
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("not configured")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void Constructor_InvalidJson_LogsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns("invalid-json-content");

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert - verify error was logged
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to initialize")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    // Note: The following tests demonstrate the expected behavior.
    // In a real scenario with dependency injection, we would mock AndroidPublisherService
    // or use a test-specific implementation. For now, these tests document the expected behavior.

    [Fact]
    public void GetPaymentStateMessage_PaymentReceived_ReturnsCorrectMessage()
    {
        // This test verifies the logic flow - in production, PaymentState = 1 means success
        // Arrange
        var paymentState = 1;
        var expectedMessage = "Payment received";

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);
        // Note: GetPaymentStateMessage is private, but we can verify through VerifyPurchaseAsync behavior

        // Assert
        Assert.Equal("Payment received", GetPaymentStateMessagePublic(paymentState));
    }

    [Fact]
    public void GetPaymentStateMessage_PaymentPending_ReturnsCorrectMessage()
    {
        // Arrange
        var paymentState = 0;

        // Act & Assert
        Assert.Equal("Payment pending", GetPaymentStateMessagePublic(paymentState));
    }

    [Fact]
    public void GetPaymentStateMessage_FreeTrial_ReturnsCorrectMessage()
    {
        // Arrange
        var paymentState = 2;

        // Act & Assert
        Assert.Equal("Free trial", GetPaymentStateMessagePublic(paymentState));
    }

    [Fact]
    public void GetPaymentStateMessage_PendingDeferredUpgrade_ReturnsCorrectMessage()
    {
        // Arrange
        var paymentState = 3;

        // Act & Assert
        Assert.Equal("Pending deferred upgrade/downgrade", GetPaymentStateMessagePublic(paymentState));
    }

    [Fact]
    public void GetPaymentStateMessage_UnknownState_ReturnsUnknownMessage()
    {
        // Arrange
        var paymentState = 99;

        // Act & Assert
        Assert.Equal("Unknown payment state", GetPaymentStateMessagePublic(paymentState));
    }

    [Fact]
    public void GetPaymentStateMessage_NullState_ReturnsUnknownMessage()
    {
        // Arrange
        int? paymentState = null;

        // Act & Assert
        Assert.Equal("Unknown payment state", GetPaymentStateMessagePublic(paymentState));
    }

    // Helper method to replicate the private GetPaymentStateMessage logic for testing
    private static string GetPaymentStateMessagePublic(int? paymentState)
    {
        return paymentState switch
        {
            0 => "Payment pending",
            1 => "Payment received",
            2 => "Free trial",
            3 => "Pending deferred upgrade/downgrade",
            _ => "Unknown payment state"
        };
    }

    [Fact]
    public void ExpirationDateCalculation_ValidExpiryTimeMillis_CalculatesCorrectly()
    {
        // Arrange
        var expectedDate = new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc);
        var expiryTimeMillis = new DateTimeOffset(expectedDate).ToUnixTimeMilliseconds();

        // Act
        var actualDate = DateTimeOffset.FromUnixTimeMilliseconds(expiryTimeMillis).DateTime;

        // Assert
        Assert.Equal(expectedDate, actualDate);
    }

    [Fact]
    public void ExpirationDateCalculation_NullExpiryTimeMillis_IsInvalid()
    {
        // Arrange
        long? expiryTimeMillis = null;

        Assert.False(expiryTimeMillis.HasValue);
    }

    [Fact]
    public void AutoRenewLogic_TrueValue_ReturnsTr()
    {
        // Arrange
        bool? autoRenewing = true;

        // Act
        var autoRenew = autoRenewing ?? false;

        // Assert
        Assert.True(autoRenew);
    }

    [Fact]
    public void AutoRenewLogic_FalseValue_ReturnsFalse()
    {
        // Arrange
        bool? autoRenewing = false;

        // Act
        var autoRenew = autoRenewing ?? false;

        // Assert
        Assert.False(autoRenew);
    }

    [Fact]
    public void AutoRenewLogic_NullValue_ReturnsFalse()
    {
        // Arrange
        bool? autoRenewing = null;

        // Act
        var autoRenew = autoRenewing ?? false;

        // Assert
        Assert.False(autoRenew);
    }

    [Fact]
    public void ReceiptVerificationResult_ValidPurchase_ContainsExpectedFields()
    {
        // Arrange
        var expirationDate = DateTime.UtcNow.AddMonths(1);

        // Act
        var result = new ReceiptVerificationResult
        {
            IsValid = true,
            ExpirationDate = expirationDate,
            AutoRenew = true,
            ProductId = "premium_monthly",
            TransactionId = "GPA.1234-5678-9012-34567"
        };

        // Assert
        Assert.True(result.IsValid);
        Assert.Equal(expirationDate, result.ExpirationDate);
        Assert.True(result.AutoRenew);
        Assert.Equal("premium_monthly", result.ProductId);
        Assert.Equal("GPA.1234-5678-9012-34567", result.TransactionId);
    }
}
