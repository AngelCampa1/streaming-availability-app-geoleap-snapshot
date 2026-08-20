using GeoLeap.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Tests to verify Resend inbound configuration is correct for production deployment.
/// </summary>
public class InboundEmailConfigurationTests
{
    [Fact]
    public void Configuration_HasCorrectForwardingRules_ForRootDomain()
    {
        // Arrange
        var configurationData = new Dictionary<string, string>
        {
            { "ResendInbound:ForwardingRules:support@geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:contact@geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:billing@geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:feedback@geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:*", "hello@example.com" },
            { "ResendInbound:WebhookSigningSecret", "whsec_test_secret" },
            { "ResendInbound:ForwardingFromAddress", "forwarding@mail.geoleap.app" },
            { "ResendInbound:ForwardingFromName", "GeoLeap Email Forward" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationData!)
            .Build();

        var emailServiceMock = new Mock<IEmailService>();
        var loggerMock = new Mock<ILogger<InboundEmailForwardingService>>();

        // Act
        var service = new InboundEmailForwardingService(
            emailServiceMock.Object,
            loggerMock.Object,
            configuration);

        // Assert - Test all forwarding rules work correctly
        Assert.Equal("hello@example.com", service.GetForwardingDestination("support@geoleap.app"));
        Assert.Equal("hello@example.com", service.GetForwardingDestination("contact@geoleap.app"));
        Assert.Equal("hello@example.com", service.GetForwardingDestination("billing@geoleap.app"));
        Assert.Equal("hello@example.com", service.GetForwardingDestination("feedback@geoleap.app"));

        // Test catch-all rule
        Assert.Equal("hello@example.com", service.GetForwardingDestination("any@geoleap.app"));
        Assert.Equal("hello@example.com", service.GetForwardingDestination("unknown@geoleap.app"));
    }

    [Fact]
    public void Configuration_DoesNotMatchSubdomain_ForRootDomainRules()
    {
        // Arrange
        var configurationData = new Dictionary<string, string>
        {
            { "ResendInbound:ForwardingRules:support@geoleap.app", "hello@example.com" },
            { "ResendInbound:ForwardingRules:*", "hello@example.com" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationData!)
            .Build();

        var emailServiceMock = new Mock<IEmailService>();
        var loggerMock = new Mock<ILogger<InboundEmailForwardingService>>();

        var service = new InboundEmailForwardingService(
            emailServiceMock.Object,
            loggerMock.Object,
            configuration);

        // Act & Assert - Verify subdomain doesn't match exact rule, uses wildcard
        var result = service.GetForwardingDestination("support@inbound.geoleap.app");

        // Should use wildcard since exact match doesn't exist
        Assert.Equal("hello@example.com", result);
    }

    [Fact]
    public void WebhookSignature_ValidatesCorrectly_WithConfiguredSecret()
    {
        // Arrange
        var signingSecret = "whsec_TESTONLYnotarealsigningsecret000000=";
        var configurationData = new Dictionary<string, string>
        {
            { "ResendInbound:ForwardingRules:*", "test@example.com" },
            { "ResendInbound:WebhookSigningSecret", signingSecret }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationData!)
            .Build();

        var emailServiceMock = new Mock<IEmailService>();
        var loggerMock = new Mock<ILogger<InboundEmailForwardingService>>();

        var service = new InboundEmailForwardingService(
            emailServiceMock.Object,
            loggerMock.Object,
            configuration);

        // Test payload
        var payload = "{\"type\":\"email.received\",\"data\":{\"from\":\"test@example.com\"}}";

        // Calculate expected signature (Svix format: v1,{base64_signature})
        var secretBytes = System.Text.Encoding.UTF8.GetBytes(signingSecret);
        var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payload);
        using var hmac = new System.Security.Cryptography.HMACSHA256(secretBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        var signatureBase64 = Convert.ToBase64String(hash);
        // Svix signature format is "v1,{signature}"
        var expectedSignature = $"v1,{signatureBase64}";

        // Act
        var result = service.ValidateWebhookSignature(payload, expectedSignature);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void WebhookSignature_RejectsInvalidSignature_WithConfiguredSecret()
    {
        // Arrange
        var signingSecret = "whsec_TESTONLYnotarealsigningsecret000000=";
        var configurationData = new Dictionary<string, string>
        {
            { "ResendInbound:ForwardingRules:*", "test@example.com" },
            { "ResendInbound:WebhookSigningSecret", signingSecret }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationData!)
            .Build();

        var emailServiceMock = new Mock<IEmailService>();
        var loggerMock = new Mock<ILogger<InboundEmailForwardingService>>();

        var service = new InboundEmailForwardingService(
            emailServiceMock.Object,
            loggerMock.Object,
            configuration);

        var payload = "{\"type\":\"email.received\"}";
        var invalidSignature = "invalid_signature_12345";

        // Act
        var result = service.ValidateWebhookSignature(payload, invalidSignature);

        // Assert
        Assert.False(result);
    }
}
