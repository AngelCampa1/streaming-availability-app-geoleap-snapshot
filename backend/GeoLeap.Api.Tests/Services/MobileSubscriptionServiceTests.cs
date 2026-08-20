using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Services;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Controllers;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Tests for MobileSubscriptionService - iOS/Android receipt verification
/// Coverage target: 95% (Revenue critical - includes security features)
/// </summary>
public class MobileSubscriptionServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IIosReceiptVerificationService> _mockIosVerification;
    private readonly Mock<IAndroidReceiptVerificationService> _mockAndroidVerification;
    private readonly Mock<ILogger<MobileSubscriptionService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly MobileSubscriptionService _service;
    private readonly Guid _testUserId;

    public MobileSubscriptionServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockIosVerification = new Mock<IIosReceiptVerificationService>();
        _mockAndroidVerification = new Mock<IAndroidReceiptVerificationService>();
        _mockLogger = new Mock<ILogger<MobileSubscriptionService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Configure mock configuration
        _mockConfiguration.Setup(c => c["MobileApp:Android:PackageId"]).Returns("com.geoleap.app");
        _mockConfiguration.Setup(c => c["MobileApp:iOS:BundleId"]).Returns("com.geoleap.app");

        // Create service
        _service = new MobileSubscriptionService(
            _context,
            _mockIosVerification.Object,
            _mockAndroidVerification.Object,
            _mockLogger.Object,
            _mockConfiguration.Object
        );

        _testUserId = Guid.NewGuid();
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    #region VerifyIosReceiptAsync Tests

    [Fact]
    public async Task VerifyIosReceiptAsync_ValidReceipt_CreatesSubscription()
    {
        // Arrange
        var request = new IosReceiptRequest
        {
            ReceiptData = "base64_receipt_data",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_123",
            OriginalTransactionId = "ios_original_123"
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Subscription);
        Assert.Equal(_testUserId, result.Subscription.UserId);
        Assert.Equal("premium", result.Subscription.Tier);
        Assert.Equal("active", result.Subscription.Status);
        Assert.Equal("ios", result.Subscription.Platform);

        // Verify subscription created in database
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(subscription);
        Assert.Equal("premium", subscription.Tier);
        Assert.Equal(request.TransactionId, subscription.TransactionId);
    }

    [Fact]
    public async Task VerifyIosReceiptAsync_InvalidReceipt_ReturnsFailed()
    {
        // Arrange
        var request = new IosReceiptRequest
        {
            ReceiptData = "invalid_receipt",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_invalid"
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Invalid receipt"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(_testUserId, request);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Invalid receipt", result.ErrorMessage);
        Assert.Null(result.Subscription);
    }

    [Fact]
    public async Task VerifyIosReceiptAsync_ReplayAttack_PreventsReuse()
    {
        // Arrange - Create existing subscription with same transaction ID
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(), // Different user
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            TransactionId = "ios_txn_replay",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new IosReceiptRequest
        {
            ReceiptData = "base64_receipt_data",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_replay", // SAME transaction ID (replay attack!)
            OriginalTransactionId = "ios_original_123"
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(_testUserId, request);

        // Assert - BUG-040 FIX: Replay attack should be prevented
        Assert.False(result.Success);
        Assert.Contains("already been activated", result.ErrorMessage);

        // Verify Apple verification was called before replay checks use verified transaction IDs.
        _mockIosVerification.Verify(
            x => x.VerifyReceiptAsync(It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task VerifyIosReceiptAsync_DifferentUserSameOriginalTxn_PreventsReuse()
    {
        // Arrange - Existing subscription with same original transaction ID but different user
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(), // Different user
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            TransactionId = "ios_txn_different",
            OriginalTransactionId = "ios_original_shared",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new IosReceiptRequest
        {
            ReceiptData = "base64_receipt_data",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_new",
            OriginalTransactionId = "ios_original_shared" // SAME original txn ID (cross-account attack!)
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(_testUserId, request);

        // Assert - BUG-040 FIX: Cross-account replay should be prevented
        Assert.False(result.Success);
        Assert.Contains("already associated with another account", result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyIosReceiptAsync_PremiumProduct_SetsPremiumTier()
    {
        // Arrange
        var request = new IosReceiptRequest
        {
            ReceiptData = "base64_receipt",
            ProductId = "com.geoleap.premium.yearly",
            TransactionId = "ios_txn_premium",
            OriginalTransactionId = "ios_original_premium"
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddYears(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("premium", result.Subscription!.Tier);
    }

    [Fact]
    public async Task VerifyIosReceiptAsync_ProProduct_SetsProTier()
    {
        // Arrange
        var request = new IosReceiptRequest
        {
            ReceiptData = "base64_receipt",
            ProductId = "com.geoleap.pro.monthly",
            TransactionId = "ios_txn_pro",
            OriginalTransactionId = "ios_original_pro"
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = false,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("pro", result.Subscription!.Tier);
        Assert.False(result.Subscription.AutoRenew);
    }

    #endregion

    #region VerifyAndroidReceiptAsync Tests

    [Fact]
    public async Task VerifyAndroidReceiptAsync_ValidReceipt_CreatesSubscription()
    {
        // Arrange
        var request = new AndroidReceiptRequest
        {
            PackageName = "com.geoleap.app",
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "android_token_123",
            OrderId = "GPA.1234-5678-9012-34567"
        };

        _mockAndroidVerification
            .Setup(x => x.VerifyPurchaseAsync(request.PackageName, request.ProductId, request.PurchaseToken))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                TransactionId = request.OrderId
            });

        // Act
        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Subscription);
        Assert.Equal(_testUserId, result.Subscription.UserId);
        Assert.Equal("premium", result.Subscription.Tier);
        Assert.Equal("active", result.Subscription.Status);
        Assert.Equal("android", result.Subscription.Platform);

        // Verify subscription created in database
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(subscription);
        Assert.Equal(request.PurchaseToken, subscription.PurchaseToken);
    }

    [Fact]
    public async Task VerifyAndroidReceiptAsync_InvalidReceipt_ReturnsFailed()
    {
        // Arrange
        var request = new AndroidReceiptRequest
        {
            PackageName = "com.geoleap.app",
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "invalid_token"
        };

        _mockAndroidVerification
            .Setup(x => x.VerifyPurchaseAsync(request.PackageName, request.ProductId, request.PurchaseToken))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Purchase not found"
            });

        // Act
        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Purchase not found", result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyAndroidReceiptAsync_MismatchedPackageId_RejectsBeforeGoogleVerification()
    {
        var request = new AndroidReceiptRequest
        {
            PackageName = "com.attacker.app",
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "android_token_123",
            OrderId = "GPA.1234-5678-9012-34567"
        };

        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        Assert.False(result.Success);
        Assert.Contains("package ID", result.ErrorMessage);
        _mockAndroidVerification.Verify(
            x => x.VerifyPurchaseAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task VerifyAndroidReceiptAsync_UsesConfiguredPackageIdForGoogleVerification()
    {
        var request = new AndroidReceiptRequest
        {
            PackageName = string.Empty,
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "android_token_123",
            OrderId = "GPA.1234-5678-9012-34567"
        };

        _mockAndroidVerification
            .Setup(x => x.VerifyPurchaseAsync("com.geoleap.app", request.ProductId, request.PurchaseToken))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                TransactionId = request.OrderId
            });

        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        Assert.True(result.Success);
        _mockAndroidVerification.Verify(
            x => x.VerifyPurchaseAsync("com.geoleap.app", request.ProductId, request.PurchaseToken),
            Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(-1)]
    public async Task VerifyAndroidReceiptAsync_MissingOrExpiredVerifiedExpiry_RejectsReceipt(int? expiryOffsetMinutes)
    {
        var request = new AndroidReceiptRequest
        {
            PackageName = "com.geoleap.app",
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "android_token_123",
            OrderId = "GPA.1234-5678-9012-34567"
        };

        _mockAndroidVerification
            .Setup(x => x.VerifyPurchaseAsync("com.geoleap.app", request.ProductId, request.PurchaseToken))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = expiryOffsetMinutes.HasValue
                    ? DateTime.UtcNow.AddMinutes(expiryOffsetMinutes.Value)
                    : null,
                AutoRenew = true,
                TransactionId = request.OrderId
            });

        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        Assert.False(result.Success);
        Assert.Contains("expiry", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);

        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.Null(subscription);
    }

    [Fact]
    public async Task VerifyAndroidReceiptAsync_ReplayAttack_PreventsPurchaseTokenReuse()
    {
        // Arrange - Existing subscription with same purchase token
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(), // Different user
            Platform = "android",
            Tier = "premium",
            Status = "active",
            PurchaseToken = "android_token_replay",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new AndroidReceiptRequest
        {
            PackageName = "com.geoleap.app",
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "android_token_replay", // SAME token (replay attack!)
            OrderId = "GPA.1234-5678-9012-34567"
        };

        // Act
        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        // Assert - BUG-040 FIX: Replay attack prevented
        Assert.False(result.Success);
        Assert.Contains("already been activated", result.ErrorMessage);

        // Verify Google Play verification was NOT called
        _mockAndroidVerification.Verify(
            x => x.VerifyPurchaseAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task VerifyAndroidReceiptAsync_DifferentUserSameOrderId_Prevents()
    {
        // Arrange - Existing subscription with same order ID
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(), // Different user
            Platform = "android",
            Tier = "premium",
            Status = "active",
            TransactionId = "GPA.SHARED-ORDER-ID",
            PurchaseToken = "different_token",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new AndroidReceiptRequest
        {
            PackageName = "com.geoleap.app",
            ProductId = "geoleap_premium_monthly",
            PurchaseToken = "new_token",
            OrderId = "GPA.SHARED-ORDER-ID" // SAME order ID (cross-account attack!)
        };

        // Act
        var result = await _service.VerifyAndroidReceiptAsync(_testUserId, request);

        // Assert - BUG-040 FIX: Cross-account replay prevented
        Assert.False(result.Success);
        Assert.Contains("already associated with another account", result.ErrorMessage);
    }

    #endregion

    #region GetSubscriptionStatusAsync Tests

    [Fact]
    public async Task GetSubscriptionStatusAsync_NoSubscription_ReturnsFreeInactive()
    {
        // Act
        var result = await _service.GetSubscriptionStatusAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.Equal("free", result.Tier);
        Assert.Equal("inactive", result.Status);
    }

    [Fact]
    public async Task GetSubscriptionStatusAsync_ActiveSubscription_ReturnsStatus()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_active",
            StartDate = DateTime.UtcNow.AddMonths(-1),
            EndDate = DateTime.UtcNow.AddMonths(1),
            AutoRenew = true,
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSubscriptionStatusAsync(_testUserId);

        // Assert
        Assert.Equal("premium", result.Tier);
        Assert.Equal("active", result.Status);
        Assert.Equal("ios", result.Platform);
        Assert.True(result.AutoRenew);
        Assert.NotNull(result.Plan);
    }

    [Fact]
    public async Task GetSubscriptionStatusAsync_ExpiredSubscription_MarksExpired()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "android",
            Tier = "premium",
            Status = "active", // Still marked active
            EndDate = DateTime.UtcNow.AddDays(-1), // But expired
            CreatedAt = DateTime.UtcNow.AddMonths(-2),
            UpdatedAt = DateTime.UtcNow.AddMonths(-1)
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSubscriptionStatusAsync(_testUserId);

        // Assert
        Assert.Equal("expired", result.Status);

        // Verify database was updated
        var updated = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.Equal("expired", updated!.Status);
    }

    #endregion

    #region SyncSubscriptionAsync Tests

    [Fact]
    public async Task SyncSubscriptionAsync_NoSubscription_ReturnsFailed()
    {
        // Arrange
        var request = new SyncSubscriptionRequest
        {
            Platform = "ios"
        };

        // Act
        var result = await _service.SyncSubscriptionAsync(_testUserId, request);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("No subscription found", result.ErrorMessage);
    }

    [Fact]
    public async Task SyncSubscriptionAsync_IosSubscription_SyncsWithApple()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_current",
            OriginalTransactionId = "ios_original_current",
            EndDate = DateTime.UtcNow.AddDays(15),
            AutoRenew = false,
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        var request = new SyncSubscriptionRequest
        {
            Platform = "ios",
            ReceiptData = "updated_receipt_data"
        };

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync(request.ReceiptData))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = "com.geoleap.premium.monthly",
                TransactionId = "ios_txn_renewal",
                OriginalTransactionId = "ios_original_current",
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.SyncSubscriptionAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Subscription);
        Assert.True(result.Subscription.AutoRenew); // Updated from sync

        // Verify database was updated
        var updated = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.True(updated!.AutoRenew);
        Assert.True(updated.EndDate > DateTime.UtcNow.AddDays(20)); // Updated expiration
        Assert.Equal("ios_txn_renewal", updated.TransactionId);
    }

    [Fact]
    public async Task SyncSubscriptionAsync_IosMismatchedProduct_RejectsReceipt()
    {
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "basic",
            Status = "active",
            ProductId = "com.geoleap.basic.monthly",
            TransactionId = "ios_txn_basic",
            OriginalTransactionId = "ios_original_basic",
            EndDate = DateTime.UtcNow.AddDays(15),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync("premium_receipt"))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ProductId = "com.geoleap.premium.monthly",
                TransactionId = "ios_txn_premium",
                OriginalTransactionId = "ios_original_basic",
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                BundleId = "com.geoleap.app"
            });

        var result = await _service.SyncSubscriptionAsync(_testUserId, new SyncSubscriptionRequest
        {
            Platform = "ios",
            ReceiptData = "premium_receipt"
        });

        Assert.False(result.Success);
        Assert.Contains("product", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SyncSubscriptionAsync_IosMismatchedOriginalTransaction_RejectsReceipt()
    {
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = "ios_txn_current",
            OriginalTransactionId = "ios_original_current",
            EndDate = DateTime.UtcNow.AddDays(15),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        _mockIosVerification
            .Setup(x => x.VerifyReceiptAsync("other_receipt"))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ProductId = "com.geoleap.premium.monthly",
                TransactionId = "ios_txn_other",
                OriginalTransactionId = "ios_original_other",
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                BundleId = "com.geoleap.app"
            });

        var result = await _service.SyncSubscriptionAsync(_testUserId, new SyncSubscriptionRequest
        {
            Platform = "ios",
            ReceiptData = "other_receipt"
        });

        Assert.False(result.Success);
        Assert.Contains("active subscription", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SyncSubscriptionAsync_AndroidSubscription_SyncsWithGooglePlay()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "android",
            Tier = "pro",
            Status = "active",
            ProductId = "geoleap_pro_yearly",
            EndDate = DateTime.UtcNow.AddDays(30),
            AutoRenew = true,
            CreatedAt = DateTime.UtcNow.AddMonths(-6),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        var request = new SyncSubscriptionRequest
        {
            Platform = "android",
            PurchaseToken = "updated_purchase_token"
        };

        _mockAndroidVerification
            .Setup(x => x.VerifyPurchaseAsync("com.geoleap.app", subscription.ProductId!, request.PurchaseToken))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddYears(1),
                AutoRenew = false // Changed to false
            });

        // Act
        var result = await _service.SyncSubscriptionAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.False(result.Subscription!.AutoRenew); // Updated from sync

        // Verify database updated
        var updated = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.False(updated!.AutoRenew);
    }

    #endregion

    #region RestorePurchasesAsync Tests

    [Fact]
    public async Task RestorePurchasesAsync_NoExistingPurchases_ReturnsZero()
    {
        // Arrange
        var request = new RestorePurchasesRequest
        {
            Platform = "ios"
        };

        // Act
        var result = await _service.RestorePurchasesAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(0, result.RestoredCount);
        Assert.Null(result.ActiveSubscription);
    }

    [Fact]
    public async Task RestorePurchasesAsync_HasActiveSubscription_RestoresOne()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            EndDate = DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow.AddMonths(-2),
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        var request = new RestorePurchasesRequest
        {
            Platform = "ios"
        };

        // Act
        var result = await _service.RestorePurchasesAsync(_testUserId, request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(1, result.RestoredCount);
        Assert.NotNull(result.ActiveSubscription);
        Assert.Equal("premium", result.ActiveSubscription.Tier);
    }

    #endregion

    #region CancelSubscriptionAsync Tests

    [Fact]
    public async Task CancelSubscriptionAsync_NoSubscription_ReturnsFailed()
    {
        // Act
        var result = await _service.CancelSubscriptionAsync(_testUserId);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("No subscription found", result.ErrorMessage);
    }

    [Fact]
    public async Task CancelSubscriptionAsync_ActiveSubscription_MarksCanceled()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            AutoRenew = true,
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CancelSubscriptionAsync(_testUserId);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("canceled", result.Subscription!.Status);
        Assert.False(result.Subscription.AutoRenew);

        // Verify database updated
        var updated = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.Equal("canceled", updated!.Status);
        Assert.False(updated.AutoRenew);
    }

    #endregion

    #region HasFeatureAccessAsync Tests

    [Fact]
    public async Task HasFeatureAccessAsync_FreeUser_HasLimitedFeatures()
    {
        // Act & Assert
        Assert.False(await _service.HasFeatureAccessAsync(_testUserId, "advanced-search"));
        Assert.False(await _service.HasFeatureAccessAsync(_testUserId, "vpn-recommendations"));
    }

    [Fact]
    public async Task HasFeatureAccessAsync_PremiumUser_HasPremiumFeatures()
    {
        // Arrange
        var subscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            EndDate = DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act & Assert
        Assert.True(await _service.HasFeatureAccessAsync(_testUserId, "basic-search"));
        Assert.True(await _service.HasFeatureAccessAsync(_testUserId, "advanced-search"));
        Assert.True(await _service.HasFeatureAccessAsync(_testUserId, "vpn-recommendations"));
        Assert.True(await _service.HasFeatureAccessAsync(_testUserId, "offline-downloads"));
        Assert.True(await _service.HasFeatureAccessAsync(_testUserId, "ad-free"));
    }

    #endregion

    #region GetAvailablePlansAsync Tests

    [Fact]
    public async Task GetAvailablePlansAsync_ReturnsAllFourPlans()
    {
        // Act
        var result = await _service.GetAvailablePlansAsync("ios");

        // Assert
        Assert.Equal(4, result.Count);

        var freePlan = result.FirstOrDefault(p => p.Tier == "free");
        Assert.NotNull(freePlan);
        Assert.Equal(0, freePlan.MonthlyPrice);

        var basicPlan = result.FirstOrDefault(p => p.Tier == "basic");
        Assert.NotNull(basicPlan);
        Assert.Equal(4.99m, basicPlan.MonthlyPrice);

        var premiumPlan = result.FirstOrDefault(p => p.Tier == "premium");
        Assert.NotNull(premiumPlan);
        Assert.Equal(9.99m, premiumPlan.MonthlyPrice);
        Assert.True(premiumPlan.IsMostPopular);

        var proPlan = result.FirstOrDefault(p => p.Tier == "pro");
        Assert.NotNull(proPlan);
        Assert.Equal(14.99m, proPlan.MonthlyPrice);
        Assert.True(proPlan.IsRecommended);
    }

    #endregion
}
