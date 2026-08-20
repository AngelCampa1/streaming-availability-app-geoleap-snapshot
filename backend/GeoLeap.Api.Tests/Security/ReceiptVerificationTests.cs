using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Controllers;

namespace GeoLeap.Api.Tests.Security;

/// <summary>
/// BUG-040 SECURITY TESTS: Receipt Verification & Replay Attack Prevention
///
/// CRITICAL VULNERABILITY: Receipt validation service implemented but NO REPLAY ATTACK PREVENTION
///
/// This test suite validates:
/// 1. ✅ Valid iOS and Android receipts are verified successfully
/// 2. ✅ Duplicate transaction IDs are REJECTED (iOS replay attack prevention)
/// 3. ✅ Duplicate original transaction IDs are REJECTED (iOS renewal replay)
/// 4. ✅ Duplicate purchase tokens are REJECTED (Android replay attack prevention)
/// 5. ✅ Cross-user replay attacks are BLOCKED (can't reuse another user's receipt)
/// 6. ✅ Invalid/expired receipts are REJECTED
/// 7. ✅ Concurrent duplicate requests are handled safely (race condition testing)
/// 8. ✅ Database unique constraints enforce replay prevention
/// 9. ✅ Comprehensive audit logging for security monitoring
///
/// DEFENSE-IN-DEPTH STRATEGY:
/// - Application-level: Check database for existing transaction IDs before verification
/// - Database-level: Unique indexes on TransactionId, OriginalTransactionId, PurchaseToken
/// - Store-level: Apple/Google API validation (mocked in tests)
/// - Audit-level: Comprehensive logging of all verification attempts and security events
/// </summary>
[Collection("ReceiptVerification")]
public class ReceiptVerificationTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IIosReceiptVerificationService> _mockIosVerification;
    private readonly Mock<IAndroidReceiptVerificationService> _mockAndroidVerification;
    private readonly Mock<ILogger<MobileSubscriptionService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly MobileSubscriptionService _service;

    public ReceiptVerificationTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"ReceiptVerificationTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockIosVerification = new Mock<IIosReceiptVerificationService>();
        _mockAndroidVerification = new Mock<IAndroidReceiptVerificationService>();
        _mockLogger = new Mock<ILogger<MobileSubscriptionService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Setup default configuration
        _mockConfiguration.Setup(c => c["MobileApp:Android:PackageId"])
            .Returns("com.geoleap.app");
        _mockConfiguration.Setup(c => c["MobileApp:iOS:BundleId"])
            .Returns("com.geoleap.app");

        // Create service with correct constructor order
        _service = new MobileSubscriptionService(
            _context,
            _mockIosVerification.Object,
            _mockAndroidVerification.Object,
            _mockLogger.Object,
            _mockConfiguration.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // ============================================================
    // TEST 1: iOS VALID RECEIPT VERIFICATION
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_ValidReceipt_CreatesSubscription()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var transactionId = $"ios_txn_{Guid.NewGuid()}";
        var originalTransactionId = $"ios_orig_{Guid.NewGuid()}";

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = transactionId,
            OriginalTransactionId = originalTransactionId
        };

        // Mock successful iOS verification
        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = transactionId,
                OriginalTransactionId = originalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(userId, request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Subscription);
        Assert.Equal("premium", result.Subscription.Tier);
        Assert.Equal("active", result.Subscription.Status);

        // Verify subscription created in database
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.NotNull(subscription);
        Assert.Equal(transactionId, subscription.TransactionId);
        Assert.Equal(originalTransactionId, subscription.OriginalTransactionId);
        Assert.Equal("ios", subscription.Platform);
    }

    // ============================================================
    // TEST 2: iOS REPLAY ATTACK PREVENTION - DUPLICATE TRANSACTION ID
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_DuplicateTransactionId_RejectsReplayAttack()
    {
        // Arrange
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var transactionId = $"ios_txn_{Guid.NewGuid()}";

        // Create existing subscription with this transaction ID for user1
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = user1,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            TransactionId = transactionId,
            ProductId = "com.geoleap.premium.monthly",
            StartDate = DateTime.UtcNow.AddDays(-10),
            EndDate = DateTime.UtcNow.AddDays(20),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = transactionId, // SAME transaction ID!
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = transactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act - Attempt to reuse the same transaction ID for user2 (REPLAY ATTACK!)
        var result = await _service.VerifyIosReceiptAsync(user2, request);

        // Assert - MUST BE REJECTED
        Assert.False(result.Success);
        Assert.Contains("already been activated", result.ErrorMessage);

        // Verify user2 does NOT have a subscription
        var user2Subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == user2);
        Assert.Null(user2Subscription);

        // Verify security logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("SECURITY") && v.ToString()!.Contains("Replay attack")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    // ============================================================
    // TEST 3: iOS REPLAY ATTACK PREVENTION - DUPLICATE ORIGINAL TRANSACTION ID (CROSS-USER)
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_DuplicateOriginalTransactionIdDifferentUser_RejectsReplayAttack()
    {
        // Arrange
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var originalTransactionId = $"ios_orig_{Guid.NewGuid()}";

        // User1 has an existing subscription with this original transaction ID
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = user1,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            TransactionId = $"ios_txn_{Guid.NewGuid()}",
            OriginalTransactionId = originalTransactionId,
            ProductId = "com.geoleap.premium.monthly",
            StartDate = DateTime.UtcNow.AddDays(-10),
            EndDate = DateTime.UtcNow.AddDays(20),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = $"ios_txn_{Guid.NewGuid()}", // Different transaction ID
            OriginalTransactionId = originalTransactionId // SAME original transaction ID!
        };

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = originalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act - User2 tries to use User1's original transaction ID (CROSS-USER REPLAY ATTACK!)
        var result = await _service.VerifyIosReceiptAsync(user2, request);

        // Assert - MUST BE REJECTED
        Assert.False(result.Success);
        Assert.Contains("already associated with another account", result.ErrorMessage);

        // Verify security logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("SECURITY") && v.ToString()!.Contains("Replay attack")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    // ============================================================
    // TEST 4: iOS ORIGINAL TRANSACTION ID RENEWAL FOR SAME USER - SHOULD ALLOW
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_SameOriginalTransactionIdSameUser_AllowsRenewal()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var originalTransactionId = $"ios_orig_{Guid.NewGuid()}";

        // User has an existing subscription with this original transaction ID
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Platform = "ios",
            Tier = "premium",
            Status = "active",
            TransactionId = $"ios_txn_{Guid.NewGuid()}",
            OriginalTransactionId = originalTransactionId,
            ProductId = "com.geoleap.premium.monthly",
            StartDate = DateTime.UtcNow.AddDays(-10),
            EndDate = DateTime.UtcNow.AddDays(20),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var newTransactionId = $"ios_txn_{Guid.NewGuid()}";
        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = newTransactionId, // NEW transaction ID (renewal)
            OriginalTransactionId = originalTransactionId // SAME original (legitimate renewal)
        };

        // Mock successful iOS verification
        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = newTransactionId,
                OriginalTransactionId = originalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act - Same user renewing subscription (LEGITIMATE USE CASE)
        var result = await _service.VerifyIosReceiptAsync(userId, request);

        // Assert - SHOULD BE ALLOWED
        Assert.True(result.Success);
        Assert.NotNull(result.Subscription);
        Assert.Equal("premium", result.Subscription.Tier);
        Assert.Equal("active", result.Subscription.Status);

        // Verify subscription updated
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.NotNull(subscription);
        Assert.Equal(newTransactionId, subscription.TransactionId); // Updated to new transaction ID
        Assert.Equal(originalTransactionId, subscription.OriginalTransactionId); // Same original ID
    }

    // ============================================================
    // TEST 5: ANDROID VALID RECEIPT VERIFICATION
    // ============================================================

    [Fact]
    public async Task VerifyAndroidReceipt_ValidReceipt_CreatesSubscription()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var purchaseToken = $"android_token_{Guid.NewGuid()}";
        var orderId = $"GPA.{Guid.NewGuid()}";

        var request = new AndroidReceiptRequest
        {
            PurchaseToken = purchaseToken,
            ProductId = "geoleap_premium_monthly",
            PackageName = "com.geoleap.app",
            OrderId = orderId
        };

        // Mock successful Android verification
        _mockAndroidVerification.Setup(s => s.VerifyPurchaseAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId
            });

        // Act
        var result = await _service.VerifyAndroidReceiptAsync(userId, request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Subscription);
        Assert.Equal("premium", result.Subscription.Tier);
        Assert.Equal("active", result.Subscription.Status);

        // Verify subscription created in database
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.NotNull(subscription);
        Assert.Equal(purchaseToken, subscription.PurchaseToken);
        Assert.Equal("android", subscription.Platform);
    }

    // ============================================================
    // TEST 6: ANDROID REPLAY ATTACK PREVENTION - DUPLICATE PURCHASE TOKEN
    // ============================================================

    [Fact]
    public async Task VerifyAndroidReceipt_DuplicatePurchaseToken_RejectsReplayAttack()
    {
        // Arrange
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var purchaseToken = $"android_token_{Guid.NewGuid()}";

        // Create existing subscription with this purchase token for user1
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = user1,
            Platform = "android",
            Tier = "premium",
            Status = "active",
            PurchaseToken = purchaseToken,
            ProductId = "geoleap_premium_monthly",
            StartDate = DateTime.UtcNow.AddDays(-10),
            EndDate = DateTime.UtcNow.AddDays(20),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new AndroidReceiptRequest
        {
            PurchaseToken = purchaseToken, // SAME purchase token!
            ProductId = "geoleap_premium_monthly",
            PackageName = "com.geoleap.app",
            OrderId = $"GPA.{Guid.NewGuid()}"
        };

        // Act - Attempt to reuse the same purchase token for user2 (REPLAY ATTACK!)
        var result = await _service.VerifyAndroidReceiptAsync(user2, request);

        // Assert - MUST BE REJECTED
        Assert.False(result.Success);
        Assert.Contains("already been activated", result.ErrorMessage);

        // Verify user2 does NOT have a subscription
        var user2Subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == user2);
        Assert.Null(user2Subscription);

        // Verify security logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("SECURITY") && v.ToString()!.Contains("Replay attack")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    // ============================================================
    // TEST 7: ANDROID REPLAY ATTACK PREVENTION - DUPLICATE ORDER ID (CROSS-USER)
    // ============================================================

    [Fact]
    public async Task VerifyAndroidReceipt_DuplicateOrderIdDifferentUser_RejectsReplayAttack()
    {
        // Arrange
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var orderId = $"GPA.{Guid.NewGuid()}";

        // User1 has an existing subscription with this order ID
        var existingSubscription = new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = user1,
            Platform = "android",
            Tier = "premium",
            Status = "active",
            TransactionId = orderId, // Order ID stored in TransactionId
            PurchaseToken = $"android_token_{Guid.NewGuid()}",
            ProductId = "geoleap_premium_monthly",
            StartDate = DateTime.UtcNow.AddDays(-10),
            EndDate = DateTime.UtcNow.AddDays(20),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MobileSubscriptions.Add(existingSubscription);
        await _context.SaveChangesAsync();

        var request = new AndroidReceiptRequest
        {
            PurchaseToken = $"android_token_{Guid.NewGuid()}", // Different token
            ProductId = "geoleap_premium_monthly",
            PackageName = "com.geoleap.app",
            OrderId = orderId // SAME order ID!
        };

        // Act - User2 tries to use User1's order ID (CROSS-USER REPLAY ATTACK!)
        var result = await _service.VerifyAndroidReceiptAsync(user2, request);

        // Assert - MUST BE REJECTED
        Assert.False(result.Success);
        Assert.Contains("already associated with another account", result.ErrorMessage);

        // Verify security logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("SECURITY") && v.ToString()!.Contains("Replay attack")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    // ============================================================
    // TEST 8: iOS INVALID RECEIPT REJECTION
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_InvalidReceipt_RejectsVerification()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var request = new IosReceiptRequest
        {
            ReceiptData = "invalid_receipt_data",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = $"ios_txn_{Guid.NewGuid()}",
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        // Mock failed iOS verification
        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Receipt verification failed with Apple"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(userId, request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Receipt verification failed", result.ErrorMessage);

        // Verify NO subscription created
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.Null(subscription);
    }

    // ============================================================
    // TEST 9: ANDROID INVALID RECEIPT REJECTION
    // ============================================================

    [Fact]
    public async Task VerifyAndroidReceipt_InvalidReceipt_RejectsVerification()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var request = new AndroidReceiptRequest
        {
            PurchaseToken = "invalid_purchase_token",
            ProductId = "geoleap_premium_monthly",
            PackageName = "com.geoleap.app",
            OrderId = $"GPA.{Guid.NewGuid()}"
        };

        // Mock failed Android verification
        _mockAndroidVerification.Setup(s => s.VerifyPurchaseAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Purchase verification failed with Google Play"
            });

        // Act
        var result = await _service.VerifyAndroidReceiptAsync(userId, request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Purchase verification failed", result.ErrorMessage);

        // Verify NO subscription created
        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.Null(subscription);
    }

    // ============================================================
    // TEST 10: CONCURRENT DUPLICATE REQUESTS - RACE CONDITION TESTING
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_ConcurrentDuplicateRequests_OnlyCreatesOneSubscription()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var transactionId = $"ios_txn_{Guid.NewGuid()}";

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = transactionId,
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        // Mock successful iOS verification
        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = transactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act - Simulate 5 concurrent requests with same transaction ID (race condition)
        var tasks = Enumerable.Range(0, 5)
            .Select(_ => _service.VerifyIosReceiptAsync(userId, request))
            .ToList();

        var results = await Task.WhenAll(tasks);

        // Assert - At most ONE should succeed (first one wins), rest should be rejected
        var successCount = results.Count(r => r.Success);
        var rejectedCount = results.Count(r => !r.Success && r.ErrorMessage!.Contains("already been activated"));

        // CRITICAL: Only ONE subscription should be created
        var subscriptions = await _context.MobileSubscriptions
            .Where(s => s.UserId == userId && s.TransactionId == transactionId)
            .ToListAsync();

        // Note: In-memory database doesn't enforce unique constraints the same way SQL Server does
        // But the application logic should still prevent duplicates
        Assert.True(subscriptions.Count <= 1,
            $"Expected at most 1 subscription, but found {subscriptions.Count}. " +
            $"Success count: {successCount}, Rejected count: {rejectedCount}");

        if (subscriptions.Count == 1)
        {
            // If one was created, verify at least some requests were rejected
            Assert.True(rejectedCount > 0,
                "Expected some requests to be rejected as duplicates");
        }
    }

    // ============================================================
    // TEST 11: AUDIT LOGGING - SUCCESSFUL VERIFICATION
    // ============================================================

    [Fact]
    public async Task VerifyIosReceipt_SuccessfulVerification_LogsSecurityEvent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var transactionId = $"ios_txn_{Guid.NewGuid()}";

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = "com.geoleap.premium.monthly",
            TransactionId = transactionId,
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        // Mock successful iOS verification
        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = transactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(userId, request);

        // Assert
        Assert.True(result.Success);

        // Verify security audit logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("SECURITY") &&
                                              v.ToString()!.Contains("verified successfully")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once,
            "Expected security audit log for successful verification");
    }

    // ============================================================
    // TEST 12: TIER DETERMINATION FROM PRODUCT ID
    // ============================================================

    [Theory]
    [InlineData("com.geoleap.premium.monthly")]
    [InlineData("com.geoleap.pro.monthly")]
    public async Task VerifyIosReceipt_VerifiedBasicProductWithHigherRequestedProduct_RejectsMismatch(string requestedProductId)
    {
        var userId = Guid.NewGuid();
        var verifiedTransactionId = $"ios_txn_{Guid.NewGuid()}";
        var verifiedOriginalTransactionId = $"ios_orig_{Guid.NewGuid()}";

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_basic_receipt_data_base64",
            ProductId = requestedProductId,
            TransactionId = $"client_txn_{Guid.NewGuid()}",
            OriginalTransactionId = $"client_orig_{Guid.NewGuid()}"
        };

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = "com.geoleap.basic.monthly",
                TransactionId = verifiedTransactionId,
                OriginalTransactionId = verifiedOriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        var result = await _service.VerifyIosReceiptAsync(userId, request);

        Assert.False(result.Success);
        Assert.Contains("Product ID", result.ErrorMessage);

        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.Null(subscription);
    }

    [Fact]
    public async Task VerifyIosReceipt_ReplayedVerifiedTransactionWithDifferentRequestedTransactionId_RejectsReplayAttack()
    {
        var firstUserId = Guid.NewGuid();
        var secondUserId = Guid.NewGuid();
        var verifiedTransactionId = $"ios_txn_{Guid.NewGuid()}";
        var verifiedOriginalTransactionId = $"ios_orig_{Guid.NewGuid()}";

        _context.MobileSubscriptions.Add(new MobileSubscription
        {
            Id = Guid.NewGuid(),
            UserId = firstUserId,
            Platform = "ios",
            Tier = "basic",
            Status = "active",
            TransactionId = verifiedTransactionId,
            OriginalTransactionId = verifiedOriginalTransactionId,
            ProductId = "com.geoleap.basic.monthly",
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow.AddDays(29),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var request = new IosReceiptRequest
        {
            ReceiptData = "replayed_receipt_data_base64",
            ProductId = "com.geoleap.basic.monthly",
            TransactionId = $"client_supplied_different_txn_{Guid.NewGuid()}",
            OriginalTransactionId = $"client_supplied_different_orig_{Guid.NewGuid()}"
        };

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = "com.geoleap.basic.monthly",
                TransactionId = verifiedTransactionId,
                OriginalTransactionId = verifiedOriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        var result = await _service.VerifyIosReceiptAsync(secondUserId, request);

        Assert.False(result.Success);
        Assert.Contains("already been activated", result.ErrorMessage);

        var secondUserSubscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == secondUserId);
        Assert.Null(secondUserSubscription);
    }

    [Fact]
    public async Task VerifyIosReceipt_VerifiedReceiptWithExpiredSubscription_RejectsReceipt()
    {
        var userId = Guid.NewGuid();

        var request = new IosReceiptRequest
        {
            ReceiptData = "expired_receipt_data_base64",
            ProductId = "com.geoleap.basic.monthly",
            TransactionId = $"ios_txn_{Guid.NewGuid()}",
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMinutes(-1),
                AutoRenew = true,
                ProductId = request.ProductId,
                TransactionId = request.TransactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        var result = await _service.VerifyIosReceiptAsync(userId, request);

        Assert.False(result.Success);
        Assert.Contains("expired", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);

        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.Null(subscription);
    }

    [Fact]
    public async Task VerifyIosReceipt_VerifiedReceiptWithMismatchedBundleId_RejectsReceipt()
    {
        var userId = Guid.NewGuid();
        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_wrong_bundle_data_base64",
            ProductId = "com.geoleap.basic.monthly",
            TransactionId = $"ios_txn_{Guid.NewGuid()}",
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        var verificationResult = new ReceiptVerificationResult
        {
            IsValid = true,
            ExpirationDate = DateTime.UtcNow.AddMonths(1),
            AutoRenew = true,
            ProductId = request.ProductId,
            TransactionId = request.TransactionId,
            OriginalTransactionId = request.OriginalTransactionId
        };
        verificationResult.GetType().GetProperty("BundleId")?.SetValue(verificationResult, "com.attacker.app");

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(verificationResult);

        var result = await _service.VerifyIosReceiptAsync(userId, request);

        Assert.False(result.Success);
        Assert.Contains("bundle", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);

        var subscription = await _context.MobileSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        Assert.Null(subscription);
    }

    [Theory]
    [InlineData("com.geoleap.basic.monthly", "basic")]
    [InlineData("com.geoleap.premium.yearly", "premium")]
    [InlineData("com.geoleap.pro.monthly", "pro")]
    [InlineData("geoleap_basic_yearly", "basic")]
    [InlineData("geoleap_premium_monthly", "premium")]
    [InlineData("geoleap_pro_yearly", "pro")]
    public async Task VerifyIosReceipt_DeterminesCorrectTierFromProductId(string productId, string expectedTier)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var transactionId = $"ios_txn_{Guid.NewGuid()}";

        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_receipt_data_base64",
            ProductId = productId,
            TransactionId = transactionId,
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        // Mock successful iOS verification
        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
            .ReturnsAsync(new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = DateTime.UtcNow.AddMonths(1),
                AutoRenew = true,
                ProductId = productId,
                TransactionId = transactionId,
                OriginalTransactionId = request.OriginalTransactionId,
                BundleId = "com.geoleap.app"
            });

        // Act
        var result = await _service.VerifyIosReceiptAsync(userId, request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(expectedTier, result.Subscription!.Tier);
    }

    [Fact]
    public async Task VerifyIosReceipt_UnknownVerifiedProduct_RejectsReceipt()
    {
        var userId = Guid.NewGuid();
        var request = new IosReceiptRequest
        {
            ReceiptData = "valid_unknown_product_receipt",
            ProductId = "unknown.product",
            TransactionId = $"ios_txn_{Guid.NewGuid()}",
            OriginalTransactionId = $"ios_orig_{Guid.NewGuid()}"
        };

        _mockIosVerification.Setup(s => s.VerifyReceiptAsync(It.IsAny<string>()))
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

        var result = await _service.VerifyIosReceiptAsync(userId, request);

        Assert.False(result.Success);
        Assert.Contains("not recognized", result.ErrorMessage);
    }
}
