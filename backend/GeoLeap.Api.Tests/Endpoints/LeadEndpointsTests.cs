using System.Net;
using GeoLeap.Api.Endpoints;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests.Endpoints;

public class LeadEndpointsTests
{
    [Fact]
    public async Task HandleEmailLeadAsync_HoneypotFilled_ReturnsSuccessWithoutVerificationOrStorage()
    {
        var redis = new Mock<IConnectionMultiplexer>(MockBehavior.Strict);
        var verifier = new Mock<ILeadTurnstileVerifier>(MockBehavior.Strict);

        var result = await LeadEndpoints.HandleEmailLeadAsync(
            new EmailLeadRequest("not-an-email", "email_capture", CompanyWebsite: "https://bot.example"),
            CreateHttpContext(),
            redis.Object,
            CreateRateLimiter(),
            verifier.Object,
            CreateConfiguration(),
            CreateEnvironment(),
            NullLogger.Instance);

        Assert.Equal(StatusCodes.Status201Created, await ExecuteAsync(result));
        verifier.VerifyNoOtherCalls();
        redis.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleEmailLeadAsync_TurnstileFails_ReturnsForbiddenBeforeRedisWrite()
    {
        var redis = new Mock<IConnectionMultiplexer>(MockBehavior.Strict);
        var verifier = new Mock<ILeadTurnstileVerifier>();
        verifier
            .Setup(v => v.VerifyAsync(null, "203.0.113.10", It.IsAny<CancellationToken>()))
            .ReturnsAsync(LeadTurnstileResult.Failed("missing-token"));

        var result = await LeadEndpoints.HandleEmailLeadAsync(
            new EmailLeadRequest("person@example.com", "email_capture"),
            CreateHttpContext("203.0.113.10"),
            redis.Object,
            CreateRateLimiter(),
            verifier.Object,
            CreateConfiguration(),
            CreateEnvironment(),
            NullLogger.Instance);

        Assert.Equal(StatusCodes.Status403Forbidden, await ExecuteAsync(result));
        redis.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleEmailLeadAsync_UsesRedisEmailThrottleBeforeLeadStorage()
    {
        var db = new Mock<IDatabase>();
        db.Setup(d => d.StringIncrementAsync(
                It.Is<RedisKey>(k => k.ToString() == "geoleap:leads:ratelimit:ip:203.0.113.10"),
                1,
                CommandFlags.None))
            .ReturnsAsync(1);
        db.Setup(d => d.StringIncrementAsync(
                It.Is<RedisKey>(k => k.ToString() == "geoleap:leads:ratelimit:email:person@example.com"),
                1,
                CommandFlags.None))
            .ReturnsAsync(4);

        var redis = new Mock<IConnectionMultiplexer>();
        redis.Setup(r => r.GetDatabase(-1, null)).Returns(db.Object);

        var result = await LeadEndpoints.HandleEmailLeadAsync(
            new EmailLeadRequest("Person@Example.com", "email_capture", TurnstileToken: "token"),
            CreateHttpContext("203.0.113.10"),
            redis.Object,
            CreateRateLimiter(),
            PassingVerifier(),
            CreateConfiguration(),
            CreateEnvironment(),
            NullLogger.Instance);

        Assert.Equal(StatusCodes.Status429TooManyRequests, await ExecuteAsync(result));
        db.Verify(d => d.HashSetAsync(
            It.IsAny<RedisKey>(),
            It.IsAny<RedisValue>(),
            It.IsAny<RedisValue>(),
            It.IsAny<When>(),
            It.IsAny<CommandFlags>()), Times.Never);
    }

    [Fact]
    public async Task HandleEmailLeadAsync_HappyPathStoresLeadOnlyWithWhenNotExists()
    {
        var db = new Mock<IDatabase>();
        db.Setup(d => d.StringIncrementAsync(It.IsAny<RedisKey>(), 1, CommandFlags.None)).ReturnsAsync(1);
        db.Setup(d => d.KeyExpireAsync(It.IsAny<RedisKey>(), It.IsAny<TimeSpan?>(), ExpireWhen.Always, CommandFlags.None))
            .ReturnsAsync(true);
        db.Setup(d => d.HashSetAsync(
                "geoleap:leads:emails",
                "person@example.com",
                It.IsAny<RedisValue>(),
                When.NotExists,
                CommandFlags.None))
            .ReturnsAsync(true);

        var redis = new Mock<IConnectionMultiplexer>();
        redis.Setup(r => r.GetDatabase(-1, null)).Returns(db.Object);

        var result = await LeadEndpoints.HandleEmailLeadAsync(
            new EmailLeadRequest(" Person@Example.com ", "email_capture", TurnstileToken: "token"),
            CreateHttpContext("203.0.113.10"),
            redis.Object,
            CreateRateLimiter(),
            PassingVerifier(),
            CreateConfiguration(),
            CreateEnvironment(),
            NullLogger.Instance);

        Assert.Equal(StatusCodes.Status201Created, await ExecuteAsync(result));
        db.Verify(d => d.HashSetAsync(
            "geoleap:leads:emails",
            "person@example.com",
            It.IsAny<RedisValue>(),
            When.NotExists,
            CommandFlags.None), Times.Once);
    }

    [Fact]
    public async Task HandleEmailLeadAsync_MemoryFallbackThrottlesByEmailWhenRedisUnavailable()
    {
        var rateLimiter = CreateRateLimiter();
        var statuses = new List<int>();

        for (var i = 0; i < 4; i++)
        {
            var result = await LeadEndpoints.HandleEmailLeadAsync(
                new EmailLeadRequest("person@example.com", "email_capture", TurnstileToken: "token"),
                CreateHttpContext($"203.0.113.{10 + i}"),
                null,
                rateLimiter,
                PassingVerifier(),
                CreateConfiguration(),
                CreateEnvironment(),
                NullLogger.Instance);

            statuses.Add(await ExecuteAsync(result));
        }

        Assert.Equal(
            new[]
            {
                StatusCodes.Status201Created,
                StatusCodes.Status201Created,
                StatusCodes.Status201Created,
                StatusCodes.Status429TooManyRequests,
            },
            statuses);
    }

    [Fact]
    public void GetClientIp_TrustsCloudflareHeaderOnlyWhenTrustedProxyEnabled()
    {
        var context = CreateHttpContext("10.0.0.10");
        context.Request.Headers["cf-connecting-ip"] = "203.0.113.99";

        Assert.Equal("10.0.0.10", LeadEndpoints.GetClientIp(context, CreateConfiguration()));
        Assert.Equal("203.0.113.99", LeadEndpoints.GetClientIp(context, CreateConfiguration(("TRUSTED_PROXY", "true"))));
    }

    private static ILeadTurnstileVerifier PassingVerifier()
    {
        var verifier = new Mock<ILeadTurnstileVerifier>();
        verifier
            .Setup(v => v.VerifyAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(LeadTurnstileResult.Passed());
        return verifier.Object;
    }

    private static RateLimitingService CreateRateLimiter()
    {
        return new RateLimitingService(
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<RateLimitingService>.Instance);
    }

    private static DefaultHttpContext CreateHttpContext(string ip = "203.0.113.10")
    {
        return new DefaultHttpContext
        {
            Connection =
            {
                RemoteIpAddress = IPAddress.Parse(ip),
            },
        };
    }

    private static IConfiguration CreateConfiguration(params (string Key, string Value)[] values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values.ToDictionary(v => v.Key, v => (string?)v.Value))
            .Build();
    }

    private static IWebHostEnvironment CreateEnvironment(string name = "Development")
    {
        var env = new Mock<IWebHostEnvironment>();
        env.SetupProperty(e => e.EnvironmentName, name);
        env.SetupProperty(e => e.ApplicationName, "GeoLeap.Api.Tests");
        env.SetupProperty(e => e.ContentRootPath, Directory.GetCurrentDirectory());
        env.SetupProperty(e => e.WebRootPath, Directory.GetCurrentDirectory());
        env.SetupProperty(e => e.ContentRootFileProvider, new NullFileProvider());
        env.SetupProperty(e => e.WebRootFileProvider, new NullFileProvider());
        return env.Object;
    }

    private static async Task<int> ExecuteAsync(IResult result)
    {
        var context = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection()
                .AddLogging()
                .BuildServiceProvider(),
            Response =
            {
                Body = new MemoryStream(),
            },
        };

        await result.ExecuteAsync(context);
        return context.Response.StatusCode;
    }
}
