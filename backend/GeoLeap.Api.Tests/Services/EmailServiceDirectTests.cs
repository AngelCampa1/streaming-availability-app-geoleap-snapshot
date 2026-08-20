using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class EmailServiceDirectTests : IDisposable
{
    private readonly EmailService _service;
    private readonly Mock<ILogger<EmailService>> _loggerMock;
    private readonly IConfiguration _configuration;

    public EmailServiceDirectTests()
    {
        _loggerMock = new Mock<ILogger<EmailService>>();

        // Configure for Testing environment (emails will be logged, not sent)
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Environment", "Testing"},
            {"App:BaseUrl", "https://test.geoleap.com"},
            {"Email:SmtpHost", ""},  // Empty to avoid actual sending
            {"Email:FromAddress", "test@geoleap.com"},
            {"Email:FromName", "GeoLeap Test"}
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _service = new EmailService(_loggerMock.Object, _configuration);
    }

    public void Dispose()
    {
        // No resources to dispose
    }

    #region SendWelcomeEmailAsync Tests

    [Fact]
    public async Task SendWelcomeEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "user@example.com";
        var firstName = "John";

        // Act
        var result = await _service.SendWelcomeEmailAsync(email, firstName);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to user@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_IncludesFirstNameInEmail_ReturnsTrue()
    {
        // Arrange
        var email = "user@example.com";
        var firstName = "Alice";

        // Act
        var result = await _service.SendWelcomeEmailAsync(email, firstName);

        // Assert
        Assert.True(result);
        // Verify the debug log contains the firstName
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Alice")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendPasswordResetEmailAsync Tests

    [Fact]
    public async Task SendPasswordResetEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "user@example.com";
        var resetToken = "reset-token-12345";
        var firstName = "John";

        // Act
        var result = await _service.SendPasswordResetEmailAsync(email, resetToken, firstName);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to user@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_IncludesResetTokenInEmail_ReturnsTrue()
    {
        // Arrange
        var email = "user@example.com";
        var resetToken = "unique-reset-token-xyz";
        var firstName = "Bob";

        // Act
        var result = await _service.SendPasswordResetEmailAsync(email, resetToken, firstName);

        // Assert
        Assert.True(result);
        // Verify the debug log contains the reset token
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(resetToken)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendPasswordResetConfirmationEmailAsync Tests

    [Fact]
    public async Task SendPasswordResetConfirmationEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "user@example.com";
        var firstName = "Jane";

        // Act
        var result = await _service.SendPasswordResetConfirmationEmailAsync(email, firstName);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to user@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendSubscriptionCreatedEmailAsync Tests

    [Fact]
    public async Task SendSubscriptionCreatedEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "subscriber@example.com";
        var firstName = "Premium";
        var planType = "Premium";
        var amount = 9.99m;
        var interval = "monthly";

        // Act
        var result = await _service.SendSubscriptionCreatedEmailAsync(email, firstName, planType, amount, interval);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to subscriber@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendSubscriptionCreatedEmailAsync_IncludesPriceDetails_ReturnsTrue()
    {
        // Arrange
        var email = "subscriber@example.com";
        var firstName = "User";
        var planType = "Basic";
        var amount = 4.99m;
        var interval = "monthly";

        // Act
        var result = await _service.SendSubscriptionCreatedEmailAsync(email, firstName, planType, amount, interval);

        // Assert
        Assert.True(result);
        // Verify the debug log contains the amount
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("$4.99")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendSubscriptionUpgradedEmailAsync Tests

    [Fact]
    public async Task SendSubscriptionUpgradedEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "upgrader@example.com";
        var firstName = "Upgrader";
        var oldPlan = "Basic";
        var newPlan = "Premium";
        var newAmount = 9.99m;
        var interval = "monthly";

        // Act
        var result = await _service.SendSubscriptionUpgradedEmailAsync(email, firstName, oldPlan, newPlan, newAmount, interval);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to upgrader@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendSubscriptionCancelledEmailAsync Tests

    [Fact]
    public async Task SendSubscriptionCancelledEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "cancelled@example.com";
        var firstName = "Former";
        var planType = "Premium";
        var accessEndDate = "2025-12-31";

        // Act
        var result = await _service.SendSubscriptionCancelledEmailAsync(email, firstName, planType, accessEndDate);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to cancelled@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendPaymentFailedEmailAsync Tests

    [Fact]
    public async Task SendPaymentFailedEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "failed@example.com";
        var firstName = "Failed";
        var planType = "Premium";
        var amount = 9.99m;
        var nextRetryDate = "2025-01-15";

        // Act
        var result = await _service.SendPaymentFailedEmailAsync(email, firstName, planType, amount, nextRetryDate);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to failed@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendPaymentFailedEmailAsync_IncludesRetryDate_ReturnsTrue()
    {
        // Arrange
        var email = "failed@example.com";
        var firstName = "User";
        var planType = "Basic";
        var amount = 4.99m;
        var nextRetryDate = "2025-02-01";

        // Act
        var result = await _service.SendPaymentFailedEmailAsync(email, firstName, planType, amount, nextRetryDate);

        // Assert
        Assert.True(result);
        // Verify the debug log contains the retry date
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(nextRetryDate)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendSubscriptionExpiringEmailAsync Tests

    [Fact]
    public async Task SendSubscriptionExpiringEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "expiring@example.com";
        var firstName = "Expiring";
        var planType = "Premium";
        var expiryDate = "2025-01-31";

        // Act
        var result = await _service.SendSubscriptionExpiringEmailAsync(email, firstName, planType, expiryDate);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to expiring@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendPlainEmailAsync Tests

    [Fact]
    public async Task SendPlainEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "plain@example.com";
        var subject = "Test Subject";
        var body = "Test body content";
        var correlationId = "corr-123";

        // Act
        var result = await _service.SendPlainEmailAsync(email, subject, body, correlationId);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to plain@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendEmailWithAttachmentsAsync Tests

    [Fact]
    public async Task SendEmailWithAttachmentsAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "attach@example.com";
        var subject = "Email with Attachments";
        var body = "This email has attachments";
        var attachments = new Dictionary<string, byte[]>
        {
            { "file1.pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 } },  // PDF header
            { "file2.txt", System.Text.Encoding.UTF8.GetBytes("Sample text") }
        };
        var correlationId = "corr-456";

        // Act
        var result = await _service.SendEmailWithAttachmentsAsync(email, subject, body, attachments, correlationId);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("attachments would be sent to attach@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendInvoiceEmailAsync Tests

    [Fact]
    public async Task SendInvoiceEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "invoice@example.com";
        var firstName = "Invoice";
        var invoiceNumber = "INV-2025-001";
        var amount = 9.99m;
        var currency = "USD";
        var pdfContent = new byte[] { 0x25, 0x50, 0x44, 0x46 };  // PDF header

        // Act
        var result = await _service.SendInvoiceEmailAsync(email, firstName, invoiceNumber, amount, currency, pdfContent);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("attachments would be sent to invoice@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendTrialExpiringEmailAsync Tests

    [Fact]
    public async Task SendTrialExpiringEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "trial@example.com";
        var firstName = "Trial";
        var planType = "Premium Trial";
        var expiryDate = "2025-01-15";

        // Act
        var result = await _service.SendTrialExpiringEmailAsync(email, firstName, planType, expiryDate);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to trial@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendAccountSuspensionEmailAsync Tests

    [Fact]
    public async Task SendAccountSuspensionEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "suspended@example.com";
        var firstName = "Suspended";
        var reason = "Payment failure";

        // Act
        var result = await _service.SendAccountSuspensionEmailAsync(email, firstName, reason);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to suspended@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendTemplateEmailAsync Tests

    [Fact]
    public async Task SendTemplateEmailAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "template@example.com";
        var templateId = "welcome-template";
        var templateData = new Dictionary<string, object>
        {
            { "subject", "Welcome Template" },
            { "body", "Template body content" }
        };

        // Act
        var result = await _service.SendTemplateEmailAsync(email, templateId, templateData);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to template@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendTemplateEmailAsync_WithMissingSubject_UsesDefaultSubject()
    {
        // Arrange
        var email = "template@example.com";
        var templateId = "custom-template";
        var templateData = new Dictionary<string, object>
        {
            { "body", "Body without subject" }
        };

        // Act
        var result = await _service.SendTemplateEmailAsync(email, templateId, templateData);

        // Assert
        Assert.True(result);
        // Verify default subject is used
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Notification - custom-template")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SendAsync Tests

    [Fact]
    public async Task SendAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var email = "send@example.com";
        var subject = "Test Subject";
        var body = "Test body";
        var data = new Dictionary<string, object> { { "key", "value" } };

        // Act
        var result = await _service.SendAsync(email, subject, body, data);

        // Assert
        Assert.True(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent to send@example.com")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendAsync_WithNullData_ReturnsTrue()
    {
        // Arrange
        var email = "send@example.com";
        var subject = "Test Subject";
        var body = "Test body";

        // Act
        var result = await _service.SendAsync(email, subject, body, null);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task SendEmailAsync_InDevelopmentMode_LogsInsteadOfSending()
    {
        // Arrange
        var email = "dev@example.com";
        var subject = "Dev Mode Test";
        var body = "This should only be logged";

        // Act
        var result = await _service.SendEmailAsync(email, subject, body);

        // Assert
        Assert.True(result);
        // Verify it was logged, not sent
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email would be sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion
}
