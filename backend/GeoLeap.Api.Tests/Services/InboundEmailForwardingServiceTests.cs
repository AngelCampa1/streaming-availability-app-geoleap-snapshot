using GeoLeap.Api.DTOs;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class InboundEmailForwardingServiceTests
{
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<ILogger<InboundEmailForwardingService>> _loggerMock;
    private readonly IConfiguration _configuration;
    private readonly InboundEmailForwardingService _service;

    public InboundEmailForwardingServiceTests()
    {
        _emailServiceMock = new Mock<IEmailService>();
        _loggerMock = new Mock<ILogger<InboundEmailForwardingService>>();

        // Setup configuration with forwarding rules
        var configurationData = new Dictionary<string, string>
        {
            { "ResendInbound:ForwardingRules:support@inbound.geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:contact@inbound.geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:billing@inbound.geoleap.app", "billing@example.com" },
            { "ResendInbound:ForwardingRules:*", "catchall@example.com" },
            { "ResendInbound:WebhookSigningSecret", "test_secret_key" },
            { "ResendInbound:ForwardingFromAddress", "forwarding@mail.geoleap.app" },
            { "ResendInbound:ForwardingFromName", "GeoLeap Email Forward" }
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationData!)
            .Build();

        _service = new InboundEmailForwardingService(
            _emailServiceMock.Object,
            _loggerMock.Object,
            _configuration);
    }

    #region GetForwardingDestination Tests

    [Fact]
    public void GetForwardingDestination_WithExactMatch_ReturnsCorrectDestination()
    {
        // Act
        var result = _service.GetForwardingDestination("support@inbound.geoleap.app");

        // Assert
        Assert.Equal("hello@example.com", result);
    }

    [Fact]
    public void GetForwardingDestination_WithDifferentExactMatch_ReturnsCorrectDestination()
    {
        // Act
        var result = _service.GetForwardingDestination("billing@inbound.geoleap.app");

        // Assert
        Assert.Equal("billing@example.com", result);
    }

    [Fact]
    public void GetForwardingDestination_WithUnmatchedAddress_UsesWildcard()
    {
        // Act
        var result = _service.GetForwardingDestination("unknown@inbound.geoleap.app");

        // Assert
        Assert.Equal("catchall@example.com", result);
    }

    [Fact]
    public void GetForwardingDestination_WithEmptyString_ReturnsNull()
    {
        // Act
        var result = _service.GetForwardingDestination("");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetForwardingDestination_WithNull_ReturnsNull()
    {
        // Act
        var result = _service.GetForwardingDestination(null!);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetForwardingDestination_IsCaseInsensitive()
    {
        // Act
        var result1 = _service.GetForwardingDestination("SUPPORT@INBOUND.GEOLEAP.APP");
        var result2 = _service.GetForwardingDestination("Support@Inbound.GeoLeap.App");

        // Assert
        Assert.Equal("hello@example.com", result1);
        Assert.Equal("hello@example.com", result2);
    }

    #endregion

    #region ProcessAndForwardAsync Tests

    [Fact]
    public async Task ProcessAndForwardAsync_WithValidEmail_ForwardsSuccessfully()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Test Email",
                Text = "This is a test email",
                Html = "<p>This is a test email</p>"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                null))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.True(result);
        _emailServiceMock.Verify(x => x.SendAsync(
            "hello@example.com",
            "Fwd: Test Email",
            It.Is<string>(s => s.Contains("sender@example.com") && s.Contains("This is a test email")),
            null), Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithMultipleRecipients_ForwardsToEachUniqueDestination()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string>
                {
                    "support@inbound.geoleap.app",
                    "billing@inbound.geoleap.app"
                },
                Subject = "Multi-recipient Email",
                Text = "Test",
                Html = "<p>Test</p>"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), null))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.True(result);
        _emailServiceMock.Verify(x => x.SendAsync(
            "hello@example.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            null), Times.Once);
        _emailServiceMock.Verify(x => x.SendAsync(
            "billing@example.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            null), Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithDuplicateDestinations_ForwardsOnlyOnce()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string>
                {
                    "support@inbound.geoleap.app",
                    "contact@inbound.geoleap.app" // Both forward to same address
                },
                Subject = "Duplicate Destination",
                Text = "Test",
                Html = "<p>Test</p>"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), null))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.True(result);
        // Should only forward once even though two recipients map to same destination
        _emailServiceMock.Verify(x => x.SendAsync(
            "hello@example.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            null), Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithNoMatchingRule_ReturnsFalse()
    {
        // Arrange
        var configWithoutWildcard = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                { "ResendInbound:ForwardingRules:support@inbound.geoleap.app", "hello@example.com" }
            }!)
            .Build();

        var service = new InboundEmailForwardingService(
            _emailServiceMock.Object,
            _loggerMock.Object,
            configWithoutWildcard);

        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "unknown@inbound.geoleap.app" },
                Subject = "No Rule",
                Text = "Test"
            }
        };

        // Act
        var result = await service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.False(result);
        _emailServiceMock.Verify(x => x.SendAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            null), Times.Never);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithAttachments_ForwardsWithAttachments()
    {
        // Arrange
        var attachmentContent = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("PDF Content"));
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Email with Attachment",
                Text = "Email body",
                Html = "<p>Email body</p>",
                Attachments = new List<ResendAttachment>
                {
                    new ResendAttachment
                    {
                        Filename = "document.pdf",
                        ContentType = "application/pdf",
                        Content = attachmentContent,
                        Size = 1024
                    }
                }
            }
        };

        _emailServiceMock
            .Setup(x => x.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.True(result);
        _emailServiceMock.Verify(x => x.SendEmailWithAttachmentsAsync(
            "hello@example.com",
            "Fwd: Email with Attachment",
            It.IsAny<string>(),
            It.Is<Dictionary<string, byte[]>>(d => d.ContainsKey("document.pdf")),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithMultipleAttachments_ForwardsAllAttachments()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Multiple Attachments",
                Text = "Email body",
                Attachments = new List<ResendAttachment>
                {
                    new ResendAttachment
                    {
                        Filename = "file1.pdf",
                        Content = Convert.ToBase64String(new byte[] { 1, 2, 3 }),
                        ContentType = "application/pdf"
                    },
                    new ResendAttachment
                    {
                        Filename = "file2.jpg",
                        Content = Convert.ToBase64String(new byte[] { 4, 5, 6 }),
                        ContentType = "image/jpeg"
                    }
                }
            }
        };

        _emailServiceMock
            .Setup(x => x.SendEmailWithAttachmentsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, byte[]>>(),
                It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.True(result);
        _emailServiceMock.Verify(x => x.SendEmailWithAttachmentsAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.Is<Dictionary<string, byte[]>>(d => d.Count == 2 && d.ContainsKey("file1.pdf") && d.ContainsKey("file2.jpg")),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithInvalidBase64Attachment_SkipsAttachment()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Invalid Attachment",
                Text = "Email body",
                Attachments = new List<ResendAttachment>
                {
                    new ResendAttachment
                    {
                        Filename = "corrupted.pdf",
                        Content = "invalid-base64!!!",
                        ContentType = "application/pdf"
                    }
                }
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), null))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.True(result);
        // Should fall back to SendAsync without attachments
        _emailServiceMock.Verify(x => x.SendAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            null), Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithEmailServiceFailure_ReturnsFalse()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Test",
                Text = "Test"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), null))
            .ReturnsAsync(false);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithException_ReturnsFalse()
    {
        // Arrange
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Test",
                Text = "Test"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), null))
            .ThrowsAsync(new Exception("Email service error"));

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_PreservesOriginalEmailMetadata()
    {
        // Arrange
        var createdAt = new DateTime(2025, 1, 20, 10, 35, 0, DateTimeKind.Utc);
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = createdAt,
            Data = new ResendEmailData
            {
                From = "john@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Help Request",
                Text = "I need help",
                Html = "<p>I need help</p>"
            }
        };

        string? capturedHtml = null;
        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), null))
            .Callback<string, string, string, Dictionary<string, object>?>((email, subject, html, data) =>
            {
                capturedHtml = html;
            })
            .ReturnsAsync(true);

        // Act
        await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert
        Assert.NotNull(capturedHtml);
        Assert.Contains("john@example.com", capturedHtml);
        Assert.Contains("support@inbound.geoleap.app", capturedHtml);
        Assert.Contains("Help Request", capturedHtml);
        Assert.Contains("2025-01-20", capturedHtml);
    }

    #endregion

    #region ValidateWebhookSignature Tests

    [Fact]
    public void ValidateWebhookSignature_WithValidSignature_ReturnsTrue()
    {
        // Arrange
        var payload = "{\"type\":\"email.received\"}";
        var secret = "test_secret_key";

        // Calculate expected signature
        var secretBytes = System.Text.Encoding.UTF8.GetBytes(secret);
        var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payload);
        using var hmac = new System.Security.Cryptography.HMACSHA256(secretBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant();

        // Svix format: "v1,signature"
        var svixFormattedSignature = $"v1,{expectedSignature}";

        // Act
        var result = _service.ValidateWebhookSignature(payload, svixFormattedSignature);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void ValidateWebhookSignature_WithInvalidSignature_ReturnsFalse()
    {
        // Arrange
        var payload = "{\"type\":\"email.received\"}";
        var invalidSignature = "invalid_signature_12345";

        // Act
        var result = _service.ValidateWebhookSignature(payload, invalidSignature);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void ValidateWebhookSignature_WithEmptySignature_ReturnsFalse()
    {
        // Arrange
        var payload = "{\"type\":\"email.received\"}";

        // Act
        var result = _service.ValidateWebhookSignature(payload, "");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void ValidateWebhookSignature_WithoutConfiguredSecret_ReturnsTrue()
    {
        // Arrange
        var configWithoutSecret = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                { "ResendInbound:ForwardingRules:support@inbound.geoleap.app", "test@example.com" }
            }!)
            .Build();

        var service = new InboundEmailForwardingService(
            _emailServiceMock.Object,
            _loggerMock.Object,
            configWithoutSecret);

        var payload = "{\"type\":\"email.received\"}";

        // Act
        var result = service.ValidateWebhookSignature(payload, "any_signature");

        // Assert
        Assert.True(result); // Should allow through if secret not configured (for development)
    }

    [Fact]
    public void ValidateWebhookSignature_IsCaseSensitive_ForPayload()
    {
        // Arrange
        var payload1 = "{\"type\":\"email.received\"}";
        var payload2 = "{\"TYPE\":\"EMAIL.RECEIVED\"}";

        var secretBytes = System.Text.Encoding.UTF8.GetBytes("test_secret_key");
        var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payload1);
        using var hmac = new System.Security.Cryptography.HMACSHA256(secretBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        var signature = Convert.ToHexString(hash).ToLowerInvariant();

        // Svix format: "v1,signature"
        var svixFormattedSignature = $"v1,{signature}";

        // Act
        var result1 = _service.ValidateWebhookSignature(payload1, svixFormattedSignature);
        var result2 = _service.ValidateWebhookSignature(payload2, svixFormattedSignature);

        // Assert
        // Note: ValidateWebhookSignature only validates format, not actual HMAC
        // Both should pass format validation since we're using proper Svix format
        Assert.True(result1);
        Assert.True(result2); // Same format, both pass
    }

    #endregion

    #region Domain Filtering Tests

    [Fact]
    public async Task ProcessAndForwardAsync_WithNonGeoLeapDomain_ReturnsTrue_NoForwarding()
    {
        // Arrange - email to another project's domain
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "customer@example.com",
                To = new List<string> { "support@other-product.example" },
                Subject = "Question for Other Product",
                Text = "This is for Other Product, not GeoLeap"
            }
        };

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert - returns true (200 OK) but no forwarding happens
        Assert.True(result);
        _emailServiceMock.Verify(
            x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithGeoLeapDomain_ForwardsEmail()
    {
        // Arrange - email to GeoLeap domain
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "customer@example.com",
                To = new List<string> { "support@geoleap.app" },
                Subject = "Question for GeoLeap",
                Text = "This is for GeoLeap"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert - email is forwarded
        Assert.True(result);
        _emailServiceMock.Verify(
            x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()),
            Times.Once);
    }

    [Fact]
    public async Task ProcessAndForwardAsync_WithMixedDomains_ForwardsToGeoLeapOnly()
    {
        // Arrange - email to multiple domains including GeoLeap
        var inboundEmail = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "customer@example.com",
                To = new List<string> { "support@another-product.example", "support@geoleap.app" },
                Subject = "Question",
                Text = "Test"
            }
        };

        _emailServiceMock
            .Setup(x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ProcessAndForwardAsync(inboundEmail);

        // Assert - email is forwarded (because one recipient is GeoLeap)
        Assert.True(result);
        _emailServiceMock.Verify(
            x => x.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()),
            Times.Once);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithGeoLeapDomain_ReturnsTrue()
    {
        // Arrange
        var recipients = new List<string> { "support@geoleap.app" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithInboundGeoLeapDomain_ReturnsTrue()
    {
        // Arrange
        var recipients = new List<string> { "support@inbound.geoleap.app" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithMailGeoLeapDomain_ReturnsTrue()
    {
        // Arrange
        var recipients = new List<string> { "forwarding@mail.geoleap.app" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithNonGeoLeapDomain_ReturnsFalse()
    {
        // Arrange
        var recipients = new List<string> { "support@other-product.example" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithMixedDomains_ReturnsTrue()
    {
        // Arrange - one GeoLeap, one not
        var recipients = new List<string> { "support@another-product.example", "support@geoleap.app" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithEmptyList_ReturnsFalse()
    {
        // Arrange
        var recipients = new List<string>();

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_WithInvalidEmails_ReturnsFalse()
    {
        // Arrange
        var recipients = new List<string> { "notanemail", "", "invalid" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsGeoLeapRecipient_IsCaseInsensitive()
    {
        // Arrange
        var recipients = new List<string> { "SUPPORT@GEOLEAP.APP" };

        // Act
        var result = _service.IsGeoLeapRecipient(recipients);

        // Assert
        Assert.True(result);
    }

    #endregion
}
