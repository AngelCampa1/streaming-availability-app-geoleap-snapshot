using System.Net;
using GeoLeap.Api.Controllers;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace GeoLeap.Api.Tests.Controllers;

public class FeedbackControllerTests
{
    [Fact]
    public async Task SubmitFeedback_HoneypotFilled_ReturnsSuccessWithoutTurnstileRateLimitOrService()
    {
        var feedbackService = new Mock<IFeedbackService>(MockBehavior.Strict);
        var turnstileVerifier = new Mock<ILeadTurnstileVerifier>(MockBehavior.Strict);
        var rateLimiter = new Mock<IRateLimitingService>(MockBehavior.Strict);
        var controller = CreateController(feedbackService, turnstileVerifier, rateLimiter);

        var result = await controller.SubmitFeedback(new FeedbackRequest
        {
            Message = "This should be silently accepted.",
            CompanyWebsite = "https://bot.example"
        });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<FeedbackResponse>(ok.Value);
        Assert.True(response.Success);
        feedbackService.VerifyNoOtherCalls();
        turnstileVerifier.VerifyNoOtherCalls();
        rateLimiter.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SubmitFeedback_TurnstileFails_ReturnsForbiddenBeforeService()
    {
        var feedbackService = new Mock<IFeedbackService>(MockBehavior.Strict);
        feedbackService.Setup(s => s.IsRateLimited("10.0.0.10")).Returns(false);
        var turnstileVerifier = new Mock<ILeadTurnstileVerifier>();
        var rateLimiter = AllowingRateLimiter();
        turnstileVerifier
            .Setup(v => v.VerifyAsync("token", "10.0.0.10", It.IsAny<CancellationToken>()))
            .ReturnsAsync(LeadTurnstileResult.Failed("bad-token"));
        var controller = CreateController(feedbackService, turnstileVerifier, rateLimiter);

        var result = await controller.SubmitFeedback(ValidRequest());

        var forbidden = Assert.IsType<StatusCodeResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidden.StatusCode);
        feedbackService.Verify(s => s.IsRateLimited("10.0.0.10"), Times.Once);
        feedbackService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SubmitFeedback_RateLimitsContactEmailBeforeService()
    {
        var feedbackService = new Mock<IFeedbackService>(MockBehavior.Strict);
        feedbackService.Setup(s => s.IsRateLimited("10.0.0.10")).Returns(false);
        var turnstileVerifier = PassingVerifier();
        var rateLimiter = new Mock<IRateLimitingService>();
        rateLimiter
            .Setup(r => r.CheckRateLimitAsync("feedback:email:person@example.com", 3, TimeSpan.FromMinutes(10)))
            .ReturnsAsync(new RateLimitResult { IsAllowed = false });
        var controller = CreateController(feedbackService, turnstileVerifier, rateLimiter);
        var request = ValidRequest();
        request.Email = " Person@Example.com ";

        var result = await controller.SubmitFeedback(request);

        var tooMany = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, tooMany.StatusCode);
        feedbackService.Verify(s => s.IsRateLimited("10.0.0.10"), Times.Once);
        feedbackService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SubmitFeedback_IgnoresForwardedHeadersUnlessTrustedProxyEnabled()
    {
        var feedbackService = new Mock<IFeedbackService>();
        feedbackService.Setup(s => s.IsRateLimited(It.IsAny<string?>())).Returns(false);
        feedbackService
            .Setup(s => s.SubmitFeedbackAsync(
                It.IsAny<FeedbackRequest>(),
                null,
                null,
                It.IsAny<string?>(),
                "10.0.0.10"))
            .ReturnsAsync(new FeedbackResponse { Success = true, Message = "ok" });
        var controller = CreateController(feedbackService, PassingVerifier(), AllowingRateLimiter());
        controller.HttpContext.Request.Headers["X-Forwarded-For"] = "203.0.113.99";

        await controller.SubmitFeedback(ValidRequest());

        feedbackService.VerifyAll();
    }

    [Fact]
    public async Task SubmitFeedback_UsesForwardedHeadersWhenTrustedProxyEnabled()
    {
        var feedbackService = new Mock<IFeedbackService>();
        feedbackService.Setup(s => s.IsRateLimited(It.IsAny<string?>())).Returns(false);
        feedbackService
            .Setup(s => s.SubmitFeedbackAsync(
                It.IsAny<FeedbackRequest>(),
                null,
                null,
                It.IsAny<string?>(),
                "203.0.113.99"))
            .ReturnsAsync(new FeedbackResponse { Success = true, Message = "ok" });
        var controller = CreateController(
            feedbackService,
            PassingVerifier(),
            AllowingRateLimiter(),
            ("TRUSTED_PROXY", "true"));
        controller.HttpContext.Request.Headers["X-Forwarded-For"] = "203.0.113.99";

        await controller.SubmitFeedback(ValidRequest());

        feedbackService.VerifyAll();
    }

    private static FeedbackRequest ValidRequest() => new()
    {
        Message = "This is useful product feedback.",
        Email = null,
        TurnstileToken = "token"
    };

    private static FeedbackController CreateController(
        Mock<IFeedbackService> feedbackService,
        Mock<ILeadTurnstileVerifier> turnstileVerifier,
        Mock<IRateLimitingService> rateLimiter,
        params (string Key, string Value)[] configuration)
    {
        var controller = new FeedbackController(
            feedbackService.Object,
            NullLogger<FeedbackController>.Instance,
            turnstileVerifier.Object,
            rateLimiter.Object,
            new ConfigurationBuilder()
                .AddInMemoryCollection(configuration.ToDictionary(v => v.Key, v => (string?)v.Value))
                .Build());

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                Connection =
                {
                    RemoteIpAddress = IPAddress.Parse("10.0.0.10")
                }
            }
        };

        return controller;
    }

    private static Mock<ILeadTurnstileVerifier> PassingVerifier()
    {
        var verifier = new Mock<ILeadTurnstileVerifier>();
        verifier
            .Setup(v => v.VerifyAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(LeadTurnstileResult.Passed());
        return verifier;
    }

    private static Mock<IRateLimitingService> AllowingRateLimiter()
    {
        var rateLimiter = new Mock<IRateLimitingService>();
        rateLimiter
            .Setup(r => r.CheckRateLimitAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<TimeSpan>()))
            .ReturnsAsync(new RateLimitResult { IsAllowed = true });
        return rateLimiter;
    }
}
