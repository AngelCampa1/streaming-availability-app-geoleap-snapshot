using FluentAssertions;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Moq;
using System.Net;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Tests for AnonymousUserService - Anonymous user tracking via localStorage ID and IP fingerprinting
/// Coverage target: 100%
/// Covers: Header extraction, IP fingerprint generation, UUID validation, IP masking
/// </summary>
public class AnonymousUserServiceTests
{
    private readonly Mock<ILogger<AnonymousUserService>> _mockLogger;
    private readonly AnonymousUserService _service;

    public AnonymousUserServiceTests()
    {
        _mockLogger = new Mock<ILogger<AnonymousUserService>>();
        _service = new AnonymousUserService(_mockLogger.Object);
    }

    #region GetAnonymousId Tests

    [Fact]
    public void GetAnonymousId_WithValidUuidHeader_ReturnsId()
    {
        // Arrange
        var validUuid = Guid.NewGuid().ToString();
        var context = CreateMockHttpContext(anonymousIdHeader: validUuid);

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().Be(validUuid);
    }

    [Fact]
    public void GetAnonymousId_WithUppercaseUuid_ReturnsId()
    {
        // Arrange
        var validUuid = Guid.NewGuid().ToString().ToUpperInvariant();
        var context = CreateMockHttpContext(anonymousIdHeader: validUuid);

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().Be(validUuid);
    }

    [Fact]
    public void GetAnonymousId_NoHeader_ReturnsNull()
    {
        // Arrange
        var context = CreateMockHttpContext();

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetAnonymousId_EmptyHeader_ReturnsNull()
    {
        // Arrange
        var context = CreateMockHttpContext(anonymousIdHeader: "");

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetAnonymousId_WhitespaceHeader_ReturnsNull()
    {
        // Arrange
        var context = CreateMockHttpContext(anonymousIdHeader: "   ");

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetAnonymousId_InvalidUuid_ReturnsNull()
    {
        // Arrange
        var context = CreateMockHttpContext(anonymousIdHeader: "not-a-valid-uuid");

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetAnonymousId_PartialUuid_ReturnsNull()
    {
        // Arrange - UUID missing a segment
        var context = CreateMockHttpContext(anonymousIdHeader: "12345678-1234-1234");

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetAnonymousId_MaliciousInput_ReturnsNull()
    {
        // Arrange - SQL injection attempt
        var context = CreateMockHttpContext(anonymousIdHeader: "'; DROP TABLE users; --");

        // Act
        var result = _service.GetAnonymousId(context);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GenerateIpFingerprint Tests

    [Fact]
    public void GenerateIpFingerprint_ReturnsConsistentHash()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            acceptLanguage: "en-US,en;q=0.9");

        // Act
        var result1 = _service.GenerateIpFingerprint(context);
        var result2 = _service.GenerateIpFingerprint(context);

        // Assert
        result1.Should().Be(result2);
        result1.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateIpFingerprint_DifferentIp_DifferentHash()
    {
        // Arrange
        var context1 = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");
        var context2 = CreateMockHttpContext(
            ipAddress: "192.168.1.101",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var result1 = _service.GenerateIpFingerprint(context1);
        var result2 = _service.GenerateIpFingerprint(context2);

        // Assert
        result1.Should().NotBe(result2);
    }

    [Fact]
    public void GenerateIpFingerprint_DifferentUserAgent_DifferentHash()
    {
        // Arrange
        var context1 = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0 (Windows)",
            acceptLanguage: "en-US");
        var context2 = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0 (MacOS)",
            acceptLanguage: "en-US");

        // Act
        var result1 = _service.GenerateIpFingerprint(context1);
        var result2 = _service.GenerateIpFingerprint(context2);

        // Assert
        result1.Should().NotBe(result2);
    }

    [Fact]
    public void GenerateIpFingerprint_DifferentLanguage_DifferentHash()
    {
        // Arrange
        var context1 = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");
        var context2 = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "es-ES");

        // Act
        var result1 = _service.GenerateIpFingerprint(context1);
        var result2 = _service.GenerateIpFingerprint(context2);

        // Assert
        result1.Should().NotBe(result2);
    }

    [Fact]
    public void GenerateIpFingerprint_UsesXForwardedFor()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "127.0.0.1",
            xForwardedFor: "203.0.113.45, 70.41.3.18",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        var contextDirect = CreateMockHttpContext(
            ipAddress: "203.0.113.45",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var resultWithProxy = _service.GenerateIpFingerprint(context);
        var resultDirect = _service.GenerateIpFingerprint(contextDirect);

        // Assert - Should use first IP from X-Forwarded-For
        resultWithProxy.Should().Be(resultDirect);
    }

    [Fact]
    public void GenerateIpFingerprint_UsesXRealIp()
    {
        // Arrange - X-Real-IP takes precedence when X-Forwarded-For not present
        var context = CreateMockHttpContext(
            ipAddress: "127.0.0.1",
            xRealIp: "203.0.113.45",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        var contextDirect = CreateMockHttpContext(
            ipAddress: "203.0.113.45",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var resultWithRealIp = _service.GenerateIpFingerprint(context);
        var resultDirect = _service.GenerateIpFingerprint(contextDirect);

        // Assert
        resultWithRealIp.Should().Be(resultDirect);
    }

    [Fact]
    public void GenerateIpFingerprint_XForwardedForTakesPrecedenceOverXRealIp()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "127.0.0.1",
            xForwardedFor: "1.2.3.4",
            xRealIp: "5.6.7.8",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        var contextForwardedFor = CreateMockHttpContext(
            ipAddress: "1.2.3.4",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var result = _service.GenerateIpFingerprint(context);
        var resultForwardedFor = _service.GenerateIpFingerprint(contextForwardedFor);

        // Assert - Should use X-Forwarded-For IP
        result.Should().Be(resultForwardedFor);
    }

    [Fact]
    public void GenerateIpFingerprint_ReturnsSha256Hash()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var result = _service.GenerateIpFingerprint(context);

        // Assert - SHA256 produces 64 hex characters
        result.Should().HaveLength(64);
        result.Should().MatchRegex("^[a-f0-9]+$");
    }

    [Fact]
    public void GenerateIpFingerprint_HandlesNullRemoteIpAddress()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: null,
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var result = _service.GenerateIpFingerprint(context);

        // Assert - Should not throw, uses "unknown" as fallback
        result.Should().NotBeNullOrWhiteSpace();
        result.Should().HaveLength(64);
    }

    [Fact]
    public void GenerateIpFingerprint_HandlesEmptyUserAgent()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "",
            acceptLanguage: "en-US");

        // Act
        var result = _service.GenerateIpFingerprint(context);

        // Assert
        result.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateIpFingerprint_HandlesEmptyAcceptLanguage()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "");

        // Act
        var result = _service.GenerateIpFingerprint(context);

        // Assert
        result.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateIpFingerprint_IPv6Address()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        var result = _service.GenerateIpFingerprint(context);

        // Assert
        result.Should().NotBeNullOrWhiteSpace();
        result.Should().HaveLength(64);
    }

    #endregion

    #region IP Masking (via logging verification)

    [Fact]
    public void GenerateIpFingerprint_LogsMaskedIPv4()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "192.168.100.200",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        _service.GenerateIpFingerprint(context);

        // Assert - Logger was called with masked IP (first 2 octets only)
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("192.168.*.*")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void GenerateIpFingerprint_LogsTruncatedHash()
    {
        // Arrange
        var context = CreateMockHttpContext(
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0",
            acceptLanguage: "en-US");

        // Act
        _service.GenerateIpFingerprint(context);

        // Assert - Logger was called with truncated hash (8 chars + "...")
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("...")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private static HttpContext CreateMockHttpContext(
        string? anonymousIdHeader = null,
        string? ipAddress = "127.0.0.1",
        string? xForwardedFor = null,
        string? xRealIp = null,
        string userAgent = "TestUserAgent",
        string acceptLanguage = "en-US")
    {
        var context = new DefaultHttpContext();

        // Set headers
        if (anonymousIdHeader != null)
        {
            context.Request.Headers["X-Anonymous-Id"] = anonymousIdHeader;
        }

        if (xForwardedFor != null)
        {
            context.Request.Headers["X-Forwarded-For"] = xForwardedFor;
        }

        if (xRealIp != null)
        {
            context.Request.Headers["X-Real-IP"] = xRealIp;
        }

        context.Request.Headers.UserAgent = userAgent;
        context.Request.Headers.AcceptLanguage = acceptLanguage;

        // Set connection remote IP
        if (ipAddress != null)
        {
            context.Connection.RemoteIpAddress = IPAddress.Parse(ipAddress);
        }

        return context;
    }

    #endregion
}
