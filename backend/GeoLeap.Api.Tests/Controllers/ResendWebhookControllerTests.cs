using GeoLeap.Api.Controllers;
using GeoLeap.Api.DTOs;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

public class ResendWebhookControllerTests
{
    private readonly Mock<IInboundEmailForwardingService> _forwardingServiceMock;
    private readonly Mock<ILogger<ResendWebhookController>> _loggerMock;
    private readonly ResendWebhookController _controller;

    public ResendWebhookControllerTests()
    {
        _forwardingServiceMock = new Mock<IInboundEmailForwardingService>();
        _loggerMock = new Mock<ILogger<ResendWebhookController>>();

        _controller = new ResendWebhookController(
            _forwardingServiceMock.Object,
            _loggerMock.Object);

        // Setup HttpContext for reading request body
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    #region HandleInboundEmail Tests

    [Fact]
    public async Task HandleInboundEmail_WithValidPayload_ReturnsOk()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Test Email",
                Text = "Test email body",
                Html = "<p>Test email body</p>"
            }
        };

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(
            It.Is<ResendInboundEmailDto>(dto =>
                dto.Type == "email.received" &&
                dto.Data.From == "sender@example.com")),
            Times.Once);
    }

    [Fact]
    public async Task HandleInboundEmail_WithMissingFromField_ReturnsBadRequest()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "", // Missing from
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Test",
                Text = "Test"
            }
        };

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);

        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleInboundEmail_WithMissingToField_ReturnsBadRequest()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string>(), // Empty To list
                Subject = "Test",
                Text = "Test"
            }
        };

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task HandleInboundEmail_WithNullToField_ReturnsBadRequest()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = null!, // Null To
                Subject = "Test",
                Text = "Test"
            }
        };

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task HandleInboundEmail_WithNonEmailReceivedType_ReturnsOkWithoutProcessing()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.sent",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "recipient@example.com" },
                Subject = "Test",
                Text = "Test"
            }
        };

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleInboundEmail_WithForwardingFailure_ReturnsInternalServerError()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
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

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var statusCodeResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, statusCodeResult.StatusCode);
    }

    [Fact]
    public async Task HandleInboundEmail_WithException_ReturnsInternalServerError()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
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

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ThrowsAsync(new Exception("Unexpected error"));

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var statusCodeResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, statusCodeResult.StatusCode);
    }

    [Fact]
    public async Task HandleInboundEmail_WithValidSignature_ProcessesEmail()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
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

        var jsonPayload = JsonSerializer.Serialize(webhookPayload);
        var requestBody = new MemoryStream(Encoding.UTF8.GetBytes(jsonPayload));

        _controller.ControllerContext.HttpContext.Request.Body = requestBody;
        // Set all required Svix headers for signature validation
        _controller.ControllerContext.HttpContext.Request.Headers["svix-id"] = "msg_test123";
        _controller.ControllerContext.HttpContext.Request.Headers["svix-timestamp"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        _controller.ControllerContext.HttpContext.Request.Headers["svix-signature"] = "v1,valid_signature";

        _forwardingServiceMock
            .Setup(x => x.ValidateSvixSignature(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .Returns(true);

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _forwardingServiceMock.Verify(x => x.ValidateSvixSignature(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task HandleInboundEmail_WithAttachments_ProcessesSuccessfully()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Email with attachments",
                Text = "Email body",
                Html = "<p>Email body</p>",
                Attachments = new List<ResendAttachment>
                {
                    new ResendAttachment
                    {
                        Filename = "document.pdf",
                        ContentType = "application/pdf",
                        Content = Convert.ToBase64String(new byte[] { 1, 2, 3 }),
                        Size = 3
                    }
                }
            }
        };

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(
            It.Is<ResendInboundEmailDto>(dto =>
                dto.Data.Attachments.Count == 1 &&
                dto.Data.Attachments[0].Filename == "document.pdf")),
            Times.Once);
    }

    [Fact]
    public async Task HandleInboundEmail_WithMultipleRecipients_ProcessesSuccessfully()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string>
                {
                    "support@inbound.geoleap.app",
                    "contact@inbound.geoleap.app"
                },
                Subject = "Multi-recipient email",
                Text = "Test"
            }
        };

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(
            It.Is<ResendInboundEmailDto>(dto => dto.Data.To.Count == 2)),
            Times.Once);
    }

    [Fact]
    public async Task HandleInboundEmail_WithHtmlContent_ProcessesSuccessfully()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "HTML Email",
                Text = "Plain text version",
                Html = "<html><body><h1>Hello</h1><p>This is HTML</p></body></html>"
            }
        };

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(
            It.Is<ResendInboundEmailDto>(dto =>
                !string.IsNullOrEmpty(dto.Data.Html) &&
                dto.Data.Html.Contains("<h1>"))),
            Times.Once);
    }

    [Fact]
    public async Task HandleInboundEmail_WithSpecialCharactersInSubject_ProcessesSuccessfully()
    {
        // Arrange
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Test: Special <chars> & symbols!",
                Text = "Test"
            }
        };

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(
            It.Is<ResendInboundEmailDto>(dto =>
                dto.Data.Subject.Contains("<") &&
                dto.Data.Subject.Contains("&"))),
            Times.Once);
    }

    [Fact]
    public async Task HandleInboundEmail_WithLargeEmailBody_ProcessesSuccessfully()
    {
        // Arrange
        var largeBody = new string('x', 10000); // 10KB body
        var webhookPayload = new ResendInboundEmailDto
        {
            Type = "email.received",
            CreatedAt = DateTime.UtcNow,
            Data = new ResendEmailData
            {
                From = "sender@example.com",
                To = new List<string> { "support@inbound.geoleap.app" },
                Subject = "Large email",
                Text = largeBody
            }
        };

        _forwardingServiceMock
            .Setup(x => x.ProcessAndForwardAsync(It.IsAny<ResendInboundEmailDto>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.HandleInboundEmail(webhookPayload);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _forwardingServiceMock.Verify(x => x.ProcessAndForwardAsync(
            It.Is<ResendInboundEmailDto>(dto => dto.Data.Text.Length == 10000)),
            Times.Once);
    }

    #endregion

    #region HealthCheck Tests

    [Fact]
    public void HealthCheck_ReturnsOkWithStatus()
    {
        // Act
        var result = _controller.HealthCheck();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var value = okResult.Value;
        Assert.NotNull(value);

        var statusProperty = value.GetType().GetProperty("status");
        Assert.NotNull(statusProperty);
        Assert.Equal("healthy", statusProperty.GetValue(value));
    }

    [Fact]
    public void HealthCheck_ReturnsCorrectServiceName()
    {
        // Act
        var result = _controller.HealthCheck();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var value = okResult.Value;

        var serviceProperty = value!.GetType().GetProperty("service");
        Assert.NotNull(serviceProperty);
        Assert.Equal("Resend Webhook Handler", serviceProperty.GetValue(value));
    }

    [Fact]
    public void HealthCheck_ReturnsTimestamp()
    {
        // Arrange
        var before = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var result = _controller.HealthCheck();
        var after = DateTime.UtcNow.AddSeconds(1);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var value = okResult.Value;

        var timestampProperty = value!.GetType().GetProperty("timestamp");
        Assert.NotNull(timestampProperty);

        var timestamp = (DateTime)timestampProperty.GetValue(value)!;
        Assert.True(timestamp >= before && timestamp <= after);
    }

    #endregion
}
