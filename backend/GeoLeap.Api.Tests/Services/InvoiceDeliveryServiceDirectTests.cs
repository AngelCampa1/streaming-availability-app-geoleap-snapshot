using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class InvoiceDeliveryServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<InvoiceDeliveryService>> _mockLogger;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IInvoicePdfService> _mockPdfService;
    private readonly InvoiceDeliveryService _service;
    private readonly Guid _userId;
    private readonly Guid _invoiceId;
    private readonly string _correlationId;
    private readonly DateTime _baseDate;

    public InvoiceDeliveryServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;
        _context = new ApplicationDbContext(options);

        _mockLogger = new Mock<ILogger<InvoiceDeliveryService>>();
        _mockEmailService = new Mock<IEmailService>();
        _mockPdfService = new Mock<IInvoicePdfService>();

        _service = new InvoiceDeliveryService(
            _context,
            _mockLogger.Object,
            _mockEmailService.Object,
            _mockPdfService.Object);

        _userId = Guid.NewGuid();
        _invoiceId = Guid.NewGuid();
        _correlationId = Guid.NewGuid().ToString();
        _baseDate = DateTime.UtcNow;

        SeedTestData();
        SetupMocks();
    }

    private void SeedTestData()
    {
        // Create test user
        var user = new User
        {
            Id = _userId,
            Email = "test@example.com",
            FirstName = "John",
            LastName = "Doe",
            PasswordHash = "hash",
            CreatedAt = _baseDate
        };
        _context.Users.Add(user);

        // Create billing address
        var billingAddress = new BillingAddress
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FullName = "John Doe",
            CompanyName = "Test Corp",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "Test City",
            State = "CA",
            PostalCode = "94102",
            Country = "US",
            IsDefault = true,
            IsActive = true,
            CreatedAt = _baseDate
        };
        _context.BillingAddresses.Add(billingAddress);

        // Create invoice
        var invoice = new Invoice
        {
            Id = _invoiceId,
            UserId = _userId,
            BillingAddressId = billingAddress.Id,
            InvoiceNumber = "INV-001",
            Status = "open",
            Currency = "USD",
            Subtotal = 100.00m,
            Total = 110.00m,
            PeriodStart = _baseDate.AddMonths(-1),
            PeriodEnd = _baseDate,
            DueDate = _baseDate.AddDays(30),
            IssueDate = _baseDate.AddMonths(-1),
            IsPdfGenerated = true,
            IsEmailSent = false,
            CreatedAt = _baseDate
        };
        _context.Invoices.Add(invoice);

        // Add line items
        var lineItem = new InvoiceLineItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            ItemType = "subscription",
            Description = "Premium Subscription",
            Quantity = 1,
            UnitPrice = 100.00m,
            Amount = 100.00m,
            Currency = "USD"
        };
        _context.InvoiceLineItems.Add(lineItem);

        // Create another invoice for bulk testing
        var invoice2 = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            BillingAddressId = billingAddress.Id,
            InvoiceNumber = "INV-002",
            Status = "paid",
            Currency = "USD",
            Subtotal = 50.00m,
            Total = 55.00m,
            PeriodStart = _baseDate.AddMonths(-2),
            PeriodEnd = _baseDate.AddMonths(-1),
            DueDate = _baseDate.AddMonths(-1).AddDays(30),
            IssueDate = _baseDate.AddMonths(-2),
            IsPdfGenerated = true,
            IsEmailSent = false,
            PaidAt = _baseDate.AddMonths(-1),
            CreatedAt = _baseDate.AddMonths(-1)
        };
        _context.Invoices.Add(invoice2);

        _context.SaveChanges();
    }

    private void SetupMocks()
    {
        // Mock PDF service to return PDF bytes
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // PDF header bytes
        _mockPdfService
            .Setup(s => s.GetStoredInvoicePdfAsync(It.IsAny<Guid>()))
            .ReturnsAsync(pdfBytes);

        _mockPdfService
            .Setup(s => s.GenerateAndStorePdfAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Mock email service to succeed
        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ReturnsAsync(true);

        _mockEmailService
            .Setup(s => s.SendPlainEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(true);
    }

    #region SendInvoiceEmailAsync Tests (9 tests)

    [Fact]
    public async Task SendInvoiceEmailAsync_WithValidInvoice_SendsEmail()
    {
        // Act
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result);

        // Verify email was sent with attachment
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            "test@example.com",
            "Invoice INV-001 - GeoLeap",
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            _correlationId), Times.Once);

        // Verify invoice updated
        var invoice = await _context.Invoices.FindAsync(_invoiceId);
        Assert.True(invoice!.IsEmailSent);
        Assert.NotNull(invoice.EmailSentAt);

        // Verify delivery record created
        var delivery = await _context.InvoiceDeliveries
            .FirstOrDefaultAsync(d => d.InvoiceId == _invoiceId);
        Assert.NotNull(delivery);
        Assert.Equal("sent", delivery.Status);
        Assert.NotNull(delivery.SentAt);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WithNonExistentInvoice_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.SendInvoiceEmailAsync(nonExistentId, _correlationId);

        // Assert
        Assert.False(result);

        // Verify no email sent
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WhenEmailFails_UpdatesDeliveryStatusToFailed()
    {
        // Arrange - Email service fails
        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ReturnsAsync(false);

        // Act
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.False(result);

        // Verify delivery marked as failed
        var delivery = await _context.InvoiceDeliveries
            .FirstOrDefaultAsync(d => d.InvoiceId == _invoiceId);
        Assert.NotNull(delivery);
        Assert.Equal("failed", delivery.Status);
        Assert.NotNull(delivery.FailedAt);
        Assert.Equal("Email service failed", delivery.FailureReason);
        Assert.NotNull(delivery.NextRetryAt);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WithRecentDelivery_SkipsSending()
    {
        // Arrange - Create recent delivery
        var recentDelivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "delivered",
            SentAt = DateTime.UtcNow.AddMinutes(-30), // 30 minutes ago (< 1 hour)
            CreatedAt = DateTime.UtcNow.AddMinutes(-30)
        };
        _context.InvoiceDeliveries.Add(recentDelivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result); // Returns true because already delivered recently

        // Verify no new email sent
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WithOldDelivery_SendsAgain()
    {
        // Arrange - Create old delivery (> 1 hour ago)
        var oldDelivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "delivered",
            SentAt = DateTime.UtcNow.AddHours(-2), // 2 hours ago
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };
        _context.InvoiceDeliveries.Add(oldDelivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result);

        // Verify new email sent
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WithoutPdfGenerated_GeneratesPdf()
    {
        // Arrange - Invoice without PDF
        var invoice = await _context.Invoices.FindAsync(_invoiceId);
        invoice!.IsPdfGenerated = false;
        await _context.SaveChangesAsync();

        // Mock PDF not exists, then exists after generation
        _mockPdfService
            .SetupSequence(s => s.GetStoredInvoicePdfAsync(_invoiceId))
            .ReturnsAsync((byte[]?)null) // First call returns null
            .ReturnsAsync(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // Second call returns PDF

        // Act
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result);

        // Verify PDF generation was called
        _mockPdfService.Verify(s => s.GenerateAndStorePdfAsync(_invoiceId, _correlationId), Times.Once);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WithNoPdfAttachment_SendsPlainEmail()
    {
        // Arrange - PDF service returns null
        _mockPdfService
            .Setup(s => s.GetStoredInvoicePdfAsync(It.IsAny<Guid>()))
            .ReturnsAsync((byte[]?)null);

        _mockPdfService
            .Setup(s => s.GenerateAndStorePdfAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync(false);

        // Act
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result);

        // Verify plain email sent (without attachment)
        _mockEmailService.Verify(s => s.SendPlainEmailAsync(
            "test@example.com",
            "Invoice INV-001 - GeoLeap",
            It.IsAny<string>(),
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_EmailBodyIncludesInvoiceDetails()
    {
        // Arrange
        string? capturedEmailBody = null;
        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .Callback<string, string, string, Dictionary<string, byte[]>, string>(
                (to, subject, body, attachments, correlationId) => capturedEmailBody = body)
            .ReturnsAsync(true);

        // Act
        await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.NotNull(capturedEmailBody);
        Assert.Contains("INV-001", capturedEmailBody);
        Assert.Contains("$110.00", capturedEmailBody); // Formatted currency
        Assert.Contains("John Doe", capturedEmailBody); // Billing name
        Assert.Contains("Payment is due by", capturedEmailBody); // Open invoice status
    }

    [Fact]
    public async Task SendInvoiceEmailAsync_WithException_MarksDeliveryAsFailed()
    {
        // Arrange - Email service throws exception
        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ThrowsAsync(new Exception("Email service error"));

        // Act - Service catches exception via Polly retry policy and returns false
        var result = await _service.SendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.False(result);

        // Verify delivery marked as failed
        var delivery = await _context.InvoiceDeliveries
            .FirstOrDefaultAsync(d => d.InvoiceId == _invoiceId);
        Assert.NotNull(delivery);
        Assert.Equal("failed", delivery.Status);
        Assert.NotNull(delivery.FailedAt);
        Assert.Contains("Email service error", delivery.FailureReason);
    }

    #endregion

    #region ResendInvoiceEmailAsync Tests (3 tests)

    [Fact]
    public async Task ResendInvoiceEmailAsync_WithFailedDeliveries_ResetsAndResends()
    {
        // Arrange - Create failed delivery
        var failedDelivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "failed",
            AttemptCount = 1,
            FailedAt = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _context.InvoiceDeliveries.Add(failedDelivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ResendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result);

        // Verify delivery was reset to pending and attempt count incremented
        var delivery = await _context.InvoiceDeliveries.FindAsync(failedDelivery.Id);
        Assert.Equal(2, delivery!.AttemptCount); // Incremented from 1 to 2
    }

    [Fact]
    public async Task ResendInvoiceEmailAsync_CallsSendInvoiceEmailAsync()
    {
        // Act
        var result = await _service.ResendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.True(result);

        // Verify email sent
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ResendInvoiceEmailAsync_WithException_ReturnsFalse()
    {
        // Arrange - Email service fails
        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ThrowsAsync(new Exception("Test error"));

        // Act
        var result = await _service.ResendInvoiceEmailAsync(_invoiceId, _correlationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region SendBulkInvoiceEmailsAsync Tests (3 tests)

    [Fact]
    public async Task SendBulkInvoiceEmailsAsync_WithMultipleInvoices_SendsAll()
    {
        // Arrange
        var invoiceIds = await _context.Invoices.Select(i => i.Id).ToListAsync();

        // Act
        var result = await _service.SendBulkInvoiceEmailsAsync(invoiceIds, _correlationId);

        // Assert
        Assert.True(result);

        // Verify multiple emails sent
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Exactly(invoiceIds.Count));
    }

    [Fact]
    public async Task SendBulkInvoiceEmailsAsync_WithPartialFailures_ReturnsFalse()
    {
        // Arrange
        var invoiceIds = await _context.Invoices.Select(i => i.Id).ToListAsync();

        // Setup email service to fail on second invoice
        var callCount = 0;
        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ReturnsAsync(() => ++callCount == 1); // First succeeds, second fails

        // Act
        var result = await _service.SendBulkInvoiceEmailsAsync(invoiceIds, _correlationId);

        // Assert
        Assert.False(result); // Returns false because not all succeeded
    }

    [Fact]
    public async Task SendBulkInvoiceEmailsAsync_AddsDelayBetweenEmails()
    {
        // Arrange
        var invoiceIds = await _context.Invoices.Select(i => i.Id).ToListAsync();
        var sendTimes = new List<DateTime>();

        _mockEmailService
            .Setup(s => s.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .Callback(() => sendTimes.Add(DateTime.UtcNow))
            .ReturnsAsync(true);

        // Act
        var startTime = DateTime.UtcNow;
        await _service.SendBulkInvoiceEmailsAsync(invoiceIds, _correlationId);
        var endTime = DateTime.UtcNow;

        // Assert - Should take at least (count - 1) * 100ms delay
        var expectedMinimumDuration = TimeSpan.FromMilliseconds((invoiceIds.Count - 1) * 100);
        Assert.True(endTime - startTime >= expectedMinimumDuration);
    }

    #endregion

    #region GetInvoiceDeliveryAsync Tests (2 tests)

    [Fact]
    public async Task GetInvoiceDeliveryAsync_WithExistingDelivery_ReturnsDelivery()
    {
        // Arrange
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "sent",
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetInvoiceDeliveryAsync(_invoiceId, "email");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(delivery.Id, result.Id);
    }

    [Fact]
    public async Task GetInvoiceDeliveryAsync_WithNonExistentDelivery_ReturnsNull()
    {
        // Act
        var result = await _service.GetInvoiceDeliveryAsync(_invoiceId, "sms");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetInvoiceDeliveriesAsync Tests (2 tests)

    [Fact]
    public async Task GetInvoiceDeliveriesAsync_ReturnsAllDeliveriesForInvoice()
    {
        // Arrange - Create multiple deliveries
        var deliveries = new List<InvoiceDelivery>
        {
            new InvoiceDelivery
            {
                Id = Guid.NewGuid(),
                InvoiceId = _invoiceId,
                DeliveryMethod = "email",
                DeliveryAddress = "test@example.com",
                Status = "sent",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new InvoiceDelivery
            {
                Id = Guid.NewGuid(),
                InvoiceId = _invoiceId,
                DeliveryMethod = "email",
                DeliveryAddress = "test@example.com",
                Status = "failed",
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            }
        };
        _context.InvoiceDeliveries.AddRange(deliveries);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetInvoiceDeliveriesAsync(_invoiceId);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetInvoiceDeliveriesAsync_OrdersByCreatedAtDescending()
    {
        // Arrange - Create deliveries with different timestamps
        var older = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "sent",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };
        var newer = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "failed",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _context.InvoiceDeliveries.AddRange(new[] { older, newer });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetInvoiceDeliveriesAsync(_invoiceId);

        // Assert
        Assert.Equal(newer.Id, result[0].Id); // Newer first
        Assert.Equal(older.Id, result[1].Id); // Older second
    }

    #endregion

    #region UpdateDeliveryStatusAsync Tests (5 tests)

    [Fact]
    public async Task UpdateDeliveryStatusAsync_ToDelivered_SetsDeliveredAt()
    {
        // Arrange
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "sent",
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UpdateDeliveryStatusAsync(delivery.Id, "delivered");

        // Assert
        Assert.True(result);

        var updated = await _context.InvoiceDeliveries.FindAsync(delivery.Id);
        Assert.Equal("delivered", updated!.Status);
        Assert.NotNull(updated.DeliveredAt);
    }

    [Fact]
    public async Task UpdateDeliveryStatusAsync_ToFailed_SetsFailedAtAndNextRetry()
    {
        // Arrange
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "pending",
            AttemptCount = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UpdateDeliveryStatusAsync(delivery.Id, "failed", "Test failure");

        // Assert
        Assert.True(result);

        var updated = await _context.InvoiceDeliveries.FindAsync(delivery.Id);
        Assert.Equal("failed", updated!.Status);
        Assert.NotNull(updated.FailedAt);
        Assert.Equal("Test failure", updated.FailureReason);
        Assert.NotNull(updated.NextRetryAt);
    }

    [Fact]
    public async Task UpdateDeliveryStatusAsync_ToSent_SetsSentAt()
    {
        // Arrange
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UpdateDeliveryStatusAsync(delivery.Id, "sent");

        // Assert
        Assert.True(result);

        var updated = await _context.InvoiceDeliveries.FindAsync(delivery.Id);
        Assert.Equal("sent", updated!.Status);
        Assert.NotNull(updated.SentAt);
    }

    [Fact]
    public async Task UpdateDeliveryStatusAsync_WithNonExistentDelivery_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.UpdateDeliveryStatusAsync(nonExistentId, "delivered");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateDeliveryStatusAsync_CalculatesExponentialBackoffForRetry()
    {
        // Arrange - Delivery with 2 attempts
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "pending",
            AttemptCount = 2, // 2^2 * 5 = 20 minutes
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        var beforeUpdate = DateTime.UtcNow;

        // Act
        await _service.UpdateDeliveryStatusAsync(delivery.Id, "failed", "Test");

        // Assert
        var updated = await _context.InvoiceDeliveries.FindAsync(delivery.Id);
        var expectedDelay = TimeSpan.FromMinutes(Math.Pow(2, 2) * 5); // 20 minutes
        var actualDelay = updated!.NextRetryAt!.Value - beforeUpdate;

        // Allow 1 second tolerance
        Assert.True(Math.Abs((actualDelay - expectedDelay).TotalSeconds) < 1);
    }

    #endregion

    #region ConfigureDeliveryPreferencesAsync Tests (2 tests)

    [Fact]
    public async Task ConfigureDeliveryPreferencesAsync_WithValidMethod_ReturnsTrue()
    {
        // Act
        var result = await _service.ConfigureDeliveryPreferencesAsync(_userId, "email", _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task GetUserDeliveryPreferenceAsync_ReturnsDefaultEmail()
    {
        // Act
        var result = await _service.GetUserDeliveryPreferenceAsync(_userId);

        // Assert
        Assert.Equal("email", result);
    }

    #endregion

    #region ProcessFailedDeliveriesAsync Tests (2 tests)

    [Fact]
    public async Task ProcessFailedDeliveriesAsync_RetriesFailedDeliveries()
    {
        // Arrange - Create failed delivery ready for retry
        var failedDelivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "failed",
            AttemptCount = 1,
            NextRetryAt = DateTime.UtcNow.AddMinutes(-5), // Ready for retry
            FailedAt = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _context.InvoiceDeliveries.Add(failedDelivery);
        await _context.SaveChangesAsync();

        // Act
        await _service.ProcessFailedDeliveriesAsync();

        // Assert - Verify retry was attempted
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ProcessFailedDeliveriesAsync_SkipsDeliveriesExceedingMaxAttempts()
    {
        // Arrange - Create failed delivery with max attempts
        var failedDelivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "failed",
            AttemptCount = 5, // Max attempts reached
            NextRetryAt = DateTime.UtcNow.AddMinutes(-5),
            FailedAt = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _context.InvoiceDeliveries.Add(failedDelivery);
        await _context.SaveChangesAsync();

        // Act
        await _service.ProcessFailedDeliveriesAsync();

        // Assert - Verify no retry attempted
        _mockEmailService.Verify(s => s.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, byte[]>>(),
            It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region RetryFailedDeliveryAsync Tests (3 tests)

    [Fact]
    public async Task RetryFailedDeliveryAsync_WithValidDelivery_RetriesEmail()
    {
        // Arrange
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "failed",
            AttemptCount = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RetryFailedDeliveryAsync(delivery.Id, _correlationId);

        // Assert
        Assert.True(result);

        // Verify attempt count incremented
        var updated = await _context.InvoiceDeliveries.FindAsync(delivery.Id);
        Assert.Equal(2, updated!.AttemptCount); // Incremented from 1 to 2
    }

    [Fact]
    public async Task RetryFailedDeliveryAsync_WithNonExistentDelivery_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.RetryFailedDeliveryAsync(nonExistentId, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RetryFailedDeliveryAsync_UpdatesStatusToPending()
    {
        // Arrange
        var delivery = new InvoiceDelivery
        {
            Id = Guid.NewGuid(),
            InvoiceId = _invoiceId,
            DeliveryMethod = "email",
            DeliveryAddress = "test@example.com",
            Status = "failed",
            AttemptCount = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.InvoiceDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        // Act
        await _service.RetryFailedDeliveryAsync(delivery.Id, _correlationId);

        // Assert - Status updated before retry attempt
        // Note: Will be "sent" after successful email, but starts as "pending"
        var updated = await _context.InvoiceDeliveries.FindAsync(delivery.Id);
        Assert.NotEqual("failed", updated!.Status); // No longer failed
    }

    #endregion

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
