using GeoLeap.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text.Json;

namespace GeoLeap.Api.Tests.Services;

public class IosReceiptVerificationServiceTests
{
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<HttpMessageHandler> _mockHttpMessageHandler;
    private readonly Mock<ILogger<IosReceiptVerificationService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly IosReceiptVerificationService _service;

    public IosReceiptVerificationServiceTests()
    {
        _mockHttpMessageHandler = new Mock<HttpMessageHandler>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<IosReceiptVerificationService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        var httpClient = new HttpClient(_mockHttpMessageHandler.Object);
        _mockHttpClientFactory.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);
        _mockConfiguration.Setup(x => x["Apple:SharedSecret"]).Returns("test-shared-secret");

        _service = new IosReceiptVerificationService(
            _mockHttpClientFactory.Object,
            _mockLogger.Object,
            _mockConfiguration.Object
        );
    }

    [Fact]
    public async Task VerifyReceiptAsync_ValidReceipt_ReturnsSuccess()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var expirationDateMs = DateTimeOffset.UtcNow.AddMonths(1).ToUnixTimeMilliseconds();

        var appleResponse = new
        {
            status = 0,
            environment = "Production",
            latest_receipt_info = new[]
            {
                new
                {
                    product_id = "premium_monthly",
                    transaction_id = "1000000123456789",
                    original_transaction_id = "1000000123456789",
                    purchase_date_ms = "1640000000000",
                    expires_date = "2025-02-01 00:00:00 Etc/GMT",
                    expires_date_ms = expirationDateMs,
                    is_trial_period = "false"
                }
            },
            pending_renewal_info = new[]
            {
                new
                {
                    auto_renew_status = "1",
                    product_id = "premium_monthly"
                }
            }
        };

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.Equal("premium_monthly", result.ProductId);
        Assert.Equal("1000000123456789", result.TransactionId);
        Assert.Equal("1000000123456789", result.OriginalTransactionId);
        Assert.True(result.AutoRenew);
        Assert.True(result.ExpirationDate > DateTime.UtcNow);
    }

    [Fact]
    public async Task VerifyReceiptAsync_ValidReceipt_ReturnsAppleBundleId()
    {
        var receiptData = "base64-encoded-receipt-data";
        var expirationDateMs = DateTimeOffset.UtcNow.AddMonths(1).ToUnixTimeMilliseconds();

        var appleResponse = new
        {
            status = 0,
            environment = "Production",
            receipt = new
            {
                bundle_id = "com.geoleap.app"
            },
            latest_receipt_info = new[]
            {
                new
                {
                    product_id = "com.geoleap.basic.monthly",
                    transaction_id = "1000000123456789",
                    original_transaction_id = "1000000123456789",
                    purchase_date_ms = "1640000000000",
                    expires_date = "2025-02-01 00:00:00 Etc/GMT",
                    expires_date_ms = expirationDateMs,
                    is_trial_period = "false"
                }
            },
            pending_renewal_info = new[]
            {
                new
                {
                    auto_renew_status = "1",
                    product_id = "com.geoleap.basic.monthly"
                }
            }
        };

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        var result = await _service.VerifyReceiptAsync(receiptData);

        var bundleId = result.GetType().GetProperty("BundleId")?.GetValue(result) as string;
        Assert.Equal("com.geoleap.app", bundleId);
    }

    [Fact]
    public async Task VerifyReceiptAsync_SandboxReceipt_RetriesWithSandboxUrl()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var expirationDateMs = DateTimeOffset.UtcNow.AddMonths(1).ToUnixTimeMilliseconds();

        // First call returns 21007 (sandbox receipt sent to production)
        var productionResponse = new { status = 21007 };

        // Second call returns success from sandbox
        var sandboxResponse = new
        {
            status = 0,
            environment = "Sandbox",
            latest_receipt_info = new[]
            {
                new
                {
                    product_id = "premium_monthly",
                    transaction_id = "1000000987654321",
                    original_transaction_id = "1000000987654321",
                    purchase_date_ms = "1640000000000",
                    expires_date = "2025-02-01 00:00:00 Etc/GMT",
                    expires_date_ms = expirationDateMs,
                    is_trial_period = "false"
                }
            },
            pending_renewal_info = new[]
            {
                new
                {
                    auto_renew_status = "1",
                    product_id = "premium_monthly"
                }
            }
        };

        // Setup sequential responses
        var callCount = 0;
        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                callCount++;
                object response = callCount == 1 ? (object)productionResponse : (object)sandboxResponse;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(JsonSerializer.Serialize(response))
                };
            });

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.Equal("premium_monthly", result.ProductId);
        Assert.Equal(2, callCount); // Verify it made 2 calls
    }

    [Fact]
    public async Task VerifyReceiptAsync_InvalidSharedSecret_ReturnsError()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var appleResponse = new { status = 21004 }; // Invalid shared secret

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains("shared secret", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyReceiptAsync_MalformedReceipt_ReturnsError()
    {
        // Arrange
        var receiptData = "invalid-receipt-data";
        var appleResponse = new { status = 21002 }; // Malformed receipt data

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains("malformed", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyReceiptAsync_ExpiredSubscription_ReturnsError()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var appleResponse = new { status = 21006 }; // Receipt valid but subscription expired

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains("expired", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyReceiptAsync_ServerUnavailable_ReturnsError()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var appleResponse = new { status = 21005 }; // Server unavailable

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains("not currently available", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyReceiptAsync_NoSubscriptionInReceipt_ReturnsError()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var appleResponse = new
        {
            status = 0,
            latest_receipt_info = Array.Empty<object>() // No subscriptions
        };

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains("No subscription found", result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyReceiptAsync_AutoRenewDisabled_ReturnsCorrectStatus()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var expirationDateMs = DateTimeOffset.UtcNow.AddMonths(1).ToUnixTimeMilliseconds();

        var appleResponse = new
        {
            status = 0,
            latest_receipt_info = new[]
            {
                new
                {
                    product_id = "premium_monthly",
                    transaction_id = "1000000123456789",
                    original_transaction_id = "1000000123456789",
                    purchase_date_ms = "1640000000000",
                    expires_date = "2025-02-01 00:00:00 Etc/GMT",
                    expires_date_ms = expirationDateMs,
                    is_trial_period = "false"
                }
            },
            pending_renewal_info = new[]
            {
                new
                {
                    auto_renew_status = "0", // Auto-renew disabled
                    product_id = "premium_monthly"
                }
            }
        };

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.False(result.AutoRenew);
    }

    [Fact]
    public async Task VerifyReceiptAsync_MultipleReceipts_UsesLatestExpiration()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var olderExpirationMs = DateTimeOffset.UtcNow.AddDays(10).ToUnixTimeMilliseconds();
        var newerExpirationMs = DateTimeOffset.UtcNow.AddMonths(1).ToUnixTimeMilliseconds();

        var appleResponse = new
        {
            status = 0,
            latest_receipt_info = new[]
            {
                new
                {
                    product_id = "premium_monthly",
                    transaction_id = "1000000111111111",
                    original_transaction_id = "1000000111111111",
                    purchase_date_ms = "1640000000000",
                    expires_date = "2025-01-10 00:00:00 Etc/GMT",
                    expires_date_ms = olderExpirationMs,
                    is_trial_period = "false"
                },
                new
                {
                    product_id = "premium_monthly",
                    transaction_id = "1000000222222222",
                    original_transaction_id = "1000000111111111",
                    purchase_date_ms = "1640100000000",
                    expires_date = "2025-02-01 00:00:00 Etc/GMT",
                    expires_date_ms = newerExpirationMs,
                    is_trial_period = "false"
                }
            },
            pending_renewal_info = new[]
            {
                new
                {
                    auto_renew_status = "1",
                    product_id = "premium_monthly"
                }
            }
        };

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.Equal("1000000222222222", result.TransactionId); // Latest transaction
        Assert.Equal(DateTimeOffset.FromUnixTimeMilliseconds(newerExpirationMs).DateTime, result.ExpirationDate);
    }

    [Fact]
    public async Task VerifyReceiptAsync_HttpException_ReturnsError()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(new HttpRequestException("Network error"));

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Equal("Unknown error (status -1)", result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyReceiptAsync_UnknownStatusCode_ReturnsError()
    {
        // Arrange
        var receiptData = "base64-encoded-receipt-data";
        var appleResponse = new { status = 99999 }; // Unknown status

        SetupHttpResponse(HttpStatusCode.OK, appleResponse);

        // Act
        var result = await _service.VerifyReceiptAsync(receiptData);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains("Unknown error", result.ErrorMessage);
        Assert.Contains("99999", result.ErrorMessage);
    }

    private void SetupHttpResponse(HttpStatusCode statusCode, object responseObject)
    {
        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = statusCode,
                Content = new StringContent(JsonSerializer.Serialize(responseObject))
            });
    }
}
