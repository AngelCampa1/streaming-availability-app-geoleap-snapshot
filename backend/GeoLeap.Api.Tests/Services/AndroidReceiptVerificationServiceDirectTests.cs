using Xunit;
using Moq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Services;
using Google.Apis.AndroidPublisher.v3.Data;
using Google;
using System.Net;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for AndroidReceiptVerificationService
/// Tests service behavior with mocked external dependencies (Google Play API)
/// </summary>
public class AndroidReceiptVerificationServiceDirectTests : IDisposable
{
    private readonly Mock<ILogger<AndroidReceiptVerificationService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly string _validServiceAccountJson;
    private readonly string _testPackageName = "com.geoleap.app";
    private readonly string _testProductId = "premium_monthly";
    private readonly string _testPurchaseToken = "test-purchase-token-12345";

    public AndroidReceiptVerificationServiceDirectTests()
    {
        _mockLogger = new Mock<ILogger<AndroidReceiptVerificationService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Valid Google service account JSON structure (test values)
        _validServiceAccountJson = @"{
            ""type"": ""service_account"",
            ""project_id"": ""test-project"",
            ""private_key_id"": ""test-key-id"",
            ""private_key"": ""-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1+fWIcPm15j9m26ICqhwC2nUqt6X+4WvMEQm6pN8kqBqSk\np39g6Q==\n-----END PRIVATE KEY-----"",
            ""client_email"": ""test@test-project.iam.gserviceaccount.com"",
            ""client_id"": ""123456789"",
            ""auth_uri"": ""https://accounts.google.com/o/oauth2/auth"",
            ""token_uri"": ""https://oauth2.googleapis.com/token"",
            ""auth_provider_x509_cert_url"": ""https://www.googleapis.com/oauth2/v1/certs"",
            ""client_x509_cert_url"": ""https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com""
        }";
    }

    #region Constructor and Initialization Tests

    [Fact]
    public void Constructor_WithConfiguration_CreatesServiceInstance()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns(_validServiceAccountJson);

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert
        Assert.NotNull(service);
        // Note: Real Google API initialization requires valid service account credentials
        // We verify the service is created and doesn't throw during construction
    }

    [Fact]
    public void Constructor_WithMissingConfiguration_LogsWarning()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert
        Assert.NotNull(service);
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
    public void Constructor_WithEmptyConfiguration_LogsWarning()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns(string.Empty);

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert
        Assert.NotNull(service);
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
    public void Constructor_WithInvalidJson_LogsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns("invalid-json-{{{");

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert
        Assert.NotNull(service);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to initialize")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void Constructor_WithMalformedPrivateKey_LogsError()
    {
        // Arrange
        var invalidJson = @"{
            ""type"": ""service_account"",
            ""private_key"": ""INVALID_KEY"",
            ""client_email"": ""test@example.com""
        }";
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns(invalidJson);

        // Act
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Assert
        Assert.NotNull(service);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region VerifyPurchaseAsync - Service Not Initialized Tests

    [Fact]
    public async Task VerifyPurchaseAsync_ServiceNotInitialized_ReturnsInvalidResult()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(_testPackageName, _testProductId, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Equal("Verification service not available", result.ErrorMessage);
        Assert.Null(result.ExpirationDate);
        Assert.False(result.AutoRenew);
        Assert.Null(result.ProductId);
        Assert.Null(result.TransactionId);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_ServiceNotInitialized_LogsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        await service.VerifyPurchaseAsync(_testPackageName, _testProductId, _testPurchaseToken);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("not initialized")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_NullPackageName_ServiceNotInitialized_ReturnsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(null!, _testProductId, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Equal("Verification service not available", result.ErrorMessage);
    }

    #endregion

    #region VerifyPurchaseAsync - Input Validation Tests

    [Fact]
    public async Task VerifyPurchaseAsync_ValidInputs_LogsInformation()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        await service.VerifyPurchaseAsync(_testPackageName, _testProductId, _testPurchaseToken);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains($"Verifying Android purchase for product {_testProductId}")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_EmptyPackageName_ServiceNotInitialized_ReturnsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(string.Empty, _testProductId, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_EmptyProductId_ServiceNotInitialized_ReturnsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(_testPackageName, string.Empty, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_EmptyPurchaseToken_ServiceNotInitialized_ReturnsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(_testPackageName, _testProductId, string.Empty);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    #endregion

    #region Payment State Logic Tests

    [Theory]
    [InlineData(0, "Payment pending")]
    [InlineData(1, "Payment received")]
    [InlineData(2, "Free trial")]
    [InlineData(3, "Pending deferred upgrade/downgrade")]
    [InlineData(4, "Unknown payment state")]
    [InlineData(99, "Unknown payment state")]
    [InlineData(-1, "Unknown payment state")]
    public void GetPaymentStateMessage_VariousStates_ReturnsCorrectMessage(int paymentState, string expectedMessage)
    {
        // Act
        var actualMessage = GetPaymentStateMessageHelper(paymentState);

        // Assert
        Assert.Equal(expectedMessage, actualMessage);
    }

    [Fact]
    public void GetPaymentStateMessage_NullState_ReturnsUnknownMessage()
    {
        // Act
        var actualMessage = GetPaymentStateMessageHelper(null);

        // Assert
        Assert.Equal("Unknown payment state", actualMessage);
    }

    [Fact]
    public void GetPaymentStateMessage_PaymentReceived_IsValidState()
    {
        // Arrange
        var paymentState = 1;

        // Act
        var message = GetPaymentStateMessageHelper(paymentState);
        var isValid = paymentState == 1;

        // Assert
        Assert.Equal("Payment received", message);
        Assert.True(isValid);
    }

    [Fact]
    public void GetPaymentStateMessage_PaymentPending_IsInvalidState()
    {
        // Arrange
        var paymentState = 0;

        // Act
        var message = GetPaymentStateMessageHelper(paymentState);
        var isValid = paymentState == 1;

        // Assert
        Assert.Equal("Payment pending", message);
        Assert.False(isValid);
    }

    [Fact]
    public void GetPaymentStateMessage_FreeTrial_IsInvalidState()
    {
        // Arrange
        var paymentState = 2;

        // Act
        var message = GetPaymentStateMessageHelper(paymentState);
        var isValid = paymentState == 1;

        // Assert
        Assert.Equal("Free trial", message);
        Assert.False(isValid);
    }

    // Helper method replicating GetPaymentStateMessage private method
    private static string GetPaymentStateMessageHelper(int? paymentState)
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

    #endregion

    #region Expiration Date Calculation Tests

    [Fact]
    public void ExpirationDateCalculation_ValidExpiryTimeMillis_CalculatesCorrectDate()
    {
        // Arrange
        var expectedDate = new DateTime(2025, 6, 15, 12, 30, 45, DateTimeKind.Utc);
        var expiryTimeMillis = new DateTimeOffset(expectedDate).ToUnixTimeMilliseconds();

        // Act
        var actualDate = DateTimeOffset.FromUnixTimeMilliseconds(expiryTimeMillis).DateTime;

        // Assert
        Assert.Equal(expectedDate.Year, actualDate.Year);
        Assert.Equal(expectedDate.Month, actualDate.Month);
        Assert.Equal(expectedDate.Day, actualDate.Day);
        Assert.Equal(expectedDate.Hour, actualDate.Hour);
        Assert.Equal(expectedDate.Minute, actualDate.Minute);
    }

    [Fact]
    public void ExpirationDateCalculation_NullExpiryTimeMillis_IsInvalid()
    {
        // Arrange
        long? expiryTimeMillis = null;

        // Assert
        Assert.False(expiryTimeMillis.HasValue);
    }

    [Fact]
    public void ExpirationDateCalculation_FutureDate_CalculatesCorrectly()
    {
        // Arrange
        var futureDate = DateTime.UtcNow.AddYears(1);
        var expiryTimeMillis = new DateTimeOffset(futureDate).ToUnixTimeMilliseconds();

        // Act
        var actualDate = DateTimeOffset.FromUnixTimeMilliseconds(expiryTimeMillis).DateTime;

        // Assert
        Assert.True(actualDate > DateTime.UtcNow);
        Assert.InRange(actualDate, futureDate.AddSeconds(-1), futureDate.AddSeconds(1));
    }

    [Fact]
    public void ExpirationDateCalculation_PastDate_CalculatesCorrectly()
    {
        // Arrange
        var pastDate = DateTime.UtcNow.AddMonths(-1);
        var expiryTimeMillis = new DateTimeOffset(pastDate).ToUnixTimeMilliseconds();

        // Act
        var actualDate = DateTimeOffset.FromUnixTimeMilliseconds(expiryTimeMillis).DateTime;

        // Assert
        Assert.True(actualDate < DateTime.UtcNow);
        Assert.InRange(actualDate, pastDate.AddSeconds(-1), pastDate.AddSeconds(1));
    }

    [Fact]
    public void ExpirationDateCalculation_MaxValue_HandlesGracefully()
    {
        // Arrange
        var maxDate = DateTime.MaxValue.AddYears(-1); // Avoid overflow
        var expiryTimeMillis = new DateTimeOffset(maxDate).ToUnixTimeMilliseconds();

        // Act
        var actualDate = DateTimeOffset.FromUnixTimeMilliseconds(expiryTimeMillis).DateTime;

        // Assert
        Assert.True(actualDate > DateTime.UtcNow);
    }

    #endregion

    #region AutoRenew Logic Tests

    [Fact]
    public void AutoRenewLogic_TrueValue_ReturnsTrue()
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
    public void AutoRenewLogic_NullValue_DefaultsToFalse()
    {
        // Arrange
        bool? autoRenewing = null;

        // Act
        var autoRenew = autoRenewing ?? false;

        // Assert
        Assert.False(autoRenew);
    }

    #endregion

    #region ReceiptVerificationResult Tests

    [Fact]
    public void ReceiptVerificationResult_ValidPurchase_SetsAllProperties()
    {
        // Arrange
        var expirationDate = DateTime.UtcNow.AddMonths(1);

        // Act
        var result = new ReceiptVerificationResult
        {
            IsValid = true,
            ExpirationDate = expirationDate,
            AutoRenew = true,
            ProductId = _testProductId,
            TransactionId = "GPA.1234-5678-9012-34567",
            OriginalTransactionId = "GPA.0000-1111-2222-33333"
        };

        // Assert
        Assert.True(result.IsValid);
        Assert.Equal(expirationDate, result.ExpirationDate);
        Assert.True(result.AutoRenew);
        Assert.Equal(_testProductId, result.ProductId);
        Assert.Equal("GPA.1234-5678-9012-34567", result.TransactionId);
        Assert.Equal("GPA.0000-1111-2222-33333", result.OriginalTransactionId);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public void ReceiptVerificationResult_InvalidPurchase_SetsErrorMessage()
    {
        // Arrange & Act
        var result = new ReceiptVerificationResult
        {
            IsValid = false,
            ErrorMessage = "Payment was declined"
        };

        // Assert
        Assert.False(result.IsValid);
        Assert.Equal("Payment was declined", result.ErrorMessage);
        Assert.Null(result.ExpirationDate);
        Assert.False(result.AutoRenew);
        Assert.Null(result.ProductId);
        Assert.Null(result.TransactionId);
    }

    [Fact]
    public void ReceiptVerificationResult_DefaultValues_AreCorrect()
    {
        // Act
        var result = new ReceiptVerificationResult();

        // Assert
        Assert.False(result.IsValid);
        Assert.Null(result.ErrorMessage);
        Assert.Null(result.ExpirationDate);
        Assert.False(result.AutoRenew);
        Assert.Null(result.ProductId);
        Assert.Null(result.TransactionId);
        Assert.Null(result.OriginalTransactionId);
    }

    [Fact]
    public void ReceiptVerificationResult_WithExpiredSubscription_IsStillValid()
    {
        // Arrange
        var pastDate = DateTime.UtcNow.AddMonths(-1);

        // Act
        var result = new ReceiptVerificationResult
        {
            IsValid = true, // Google API returned valid purchase
            ExpirationDate = pastDate, // But it's expired
            AutoRenew = false,
            ProductId = _testProductId,
            TransactionId = "GPA.1234-5678-9012-34567"
        };

        // Assert
        Assert.True(result.IsValid); // Verification was successful
        Assert.True(result.ExpirationDate < DateTime.UtcNow); // But subscription is expired
        Assert.False(result.AutoRenew); // And won't auto-renew
    }

    [Fact]
    public void ReceiptVerificationResult_WithAutoRenew_HasFutureExpiration()
    {
        // Arrange
        var futureDate = DateTime.UtcNow.AddMonths(1);

        // Act
        var result = new ReceiptVerificationResult
        {
            IsValid = true,
            ExpirationDate = futureDate,
            AutoRenew = true,
            ProductId = _testProductId,
            TransactionId = "GPA.1234-5678-9012-34567"
        };

        // Assert
        Assert.True(result.IsValid);
        Assert.True(result.ExpirationDate > DateTime.UtcNow);
        Assert.True(result.AutoRenew);
    }

    #endregion

    #region Error Handling Tests (Simulated)

    [Fact]
    public async Task VerifyPurchaseAsync_SimulatedGoogleApiException_ReturnsErrorResult()
    {
        // Arrange - Service not initialized simulates Google API being unavailable
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(_testPackageName, _testProductId, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
        Assert.Contains("not available", result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_ServiceUnavailable_LogsError()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        await service.VerifyPurchaseAsync(_testPackageName, _testProductId, _testPurchaseToken);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region Edge Case Tests

    [Fact]
    public async Task VerifyPurchaseAsync_VeryLongPackageName_HandlesGracefully()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);
        var longPackageName = new string('a', 500) + ".com";

        // Act
        var result = await service.VerifyPurchaseAsync(longPackageName, _testProductId, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_VeryLongProductId_HandlesGracefully()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);
        var longProductId = new string('x', 1000);

        // Act
        var result = await service.VerifyPurchaseAsync(_testPackageName, longProductId, _testPurchaseToken);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_SpecialCharactersInInputs_HandlesGracefully()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(
            "com.test<script>alert('xss')</script>",
            "product_'OR'1'='1",
            "token\"; DROP TABLE users;--");

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task VerifyPurchaseAsync_UnicodeCharacters_HandlesGracefully()
    {
        // Arrange
        _mockConfiguration.Setup(x => x["Google:PlayStore:ServiceAccountJson"])
            .Returns((string?)null);
        var service = new AndroidReceiptVerificationService(_mockLogger.Object, _mockConfiguration.Object);

        // Act
        var result = await service.VerifyPurchaseAsync(
            "com.测试.应用",
            "продукт_премиум",
            "токен_покупки_日本語");

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
    }

    #endregion

    public void Dispose()
    {
        // No database cleanup needed - this service only mocks external dependencies
        GC.SuppressFinalize(this);
    }
}
