using System.Text.Json;
using System.Text.RegularExpressions;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Primitives;
using StackExchange.Redis;

namespace GeoLeap.Api.Endpoints;

public static class LeadEndpoints
{
    private const string RedisLeadsKey = "geoleap:leads:emails";
    private const string RedisRateLimitPrefix = "geoleap:leads:ratelimit:";
    private const int MaxEmailLength = 254;
    private const int MaxSourceLength = 50;
    private const int RateLimitPerMinute = 5;
    private const int EmailRateLimitPerWindow = 3;
    private static readonly TimeSpan EmailRateLimitWindow = TimeSpan.FromMinutes(10);

    public static void MapLeadEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/leads");

        group.MapPost("/email", async (
            EmailLeadRequest request,
            HttpContext httpContext,
            IServiceProvider services,
            IRateLimitingService rateLimitingService,
            ILeadTurnstileVerifier turnstileVerifier,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<Program> logger) =>
        {
            return await HandleEmailLeadAsync(
                request,
                httpContext,
                ResolveRedis(services, logger),
                rateLimitingService,
                turnstileVerifier,
                configuration,
                environment,
                logger,
                httpContext.RequestAborted);
        }).AllowAnonymous();
    }

    internal static async Task<IResult> HandleEmailLeadAsync(
        EmailLeadRequest request,
        HttpContext httpContext,
        IConnectionMultiplexer? redis,
        IRateLimitingService rateLimitingService,
        ILeadTurnstileVerifier turnstileVerifier,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(request.CompanyWebsite))
        {
            return Results.Created((string?)null, new { ok = true });
        }

        if (string.IsNullOrWhiteSpace(request.Email) ||
            request.Email.Length > MaxEmailLength ||
            !IsValidEmail(request.Email))
        {
            return Results.BadRequest(new { error = "Invalid email address." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var source = NormalizeSource(request.Source);
        var ip = GetClientIp(httpContext, configuration);

        var turnstileResult = await turnstileVerifier.VerifyAsync(
            request.TurnstileToken ?? request.CfTurnstileResponse,
            ip == "unknown" ? null : ip,
            cancellationToken);

        if (!turnstileResult.Success)
        {
            logger.LogWarning("Lead capture Turnstile verification failed: {Reason}", turnstileResult.Reason);
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        if (redis != null)
        {
            try
            {
                var db = redis.GetDatabase();

                var ipLimit = await IncrementRedisLimitAsync(
                    db,
                    $"{RedisRateLimitPrefix}ip:{ip}",
                    TimeSpan.FromMinutes(1));
                if (ipLimit > RateLimitPerMinute)
                {
                    return Results.StatusCode(StatusCodes.Status429TooManyRequests);
                }

                var emailLimit = await IncrementRedisLimitAsync(
                    db,
                    $"{RedisRateLimitPrefix}email:{email}",
                    EmailRateLimitWindow);
                if (emailLimit > EmailRateLimitPerWindow)
                {
                    return Results.StatusCode(StatusCodes.Status429TooManyRequests);
                }

                var lead = new
                {
                    email,
                    source,
                    capturedAt = DateTimeOffset.UtcNow.ToString("o"),
                };
                var json = JsonSerializer.Serialize(lead);

                // HashSet(..., When.NotExists) is the side-effect gate: duplicates return
                // the same success shape but do not mutate the stored lead.
                await db.HashSetAsync(RedisLeadsKey, email, json, When.NotExists);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to store email lead");
                return environment.IsProduction()
                    ? Results.StatusCode(StatusCodes.Status503ServiceUnavailable)
                    : Results.Created((string?)null, new { ok = true });
            }
        }
        else
        {
            var ipLimit = await rateLimitingService.CheckRateLimitAsync(
                $"leads:ip:{ip}",
                RateLimitPerMinute,
                TimeSpan.FromMinutes(1));
            if (!ipLimit.IsAllowed)
            {
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);
            }

            var emailLimit = await rateLimitingService.CheckRateLimitAsync(
                $"leads:email:{email}",
                EmailRateLimitPerWindow,
                EmailRateLimitWindow);
            if (!emailLimit.IsAllowed)
            {
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);
            }

            logger.LogWarning("Redis unavailable; lead capture storage skipped");
        }

        return Results.Created((string?)null, new { ok = true });
    }

    internal static string GetClientIp(HttpContext httpContext, IConfiguration configuration)
    {
        var trustedProxy = configuration.GetValue<bool>("TrustedProxy") ||
            configuration.GetValue<bool>("TRUSTED_PROXY");

        if (trustedProxy)
        {
            if (httpContext.Request.Headers.TryGetValue("cf-connecting-ip", out var cfIp) &&
                !StringValues.IsNullOrEmpty(cfIp))
            {
                return cfIp.ToString();
            }

            if (httpContext.Request.Headers.TryGetValue("x-forwarded-for", out var xff) &&
                !StringValues.IsNullOrEmpty(xff))
            {
                var firstForwarded = xff.ToString()
                    .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                    .FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(firstForwarded))
                {
                    return firstForwarded;
                }
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static IConnectionMultiplexer? ResolveRedis(IServiceProvider services, ILogger logger)
    {
        try
        {
            return services.GetService<IConnectionMultiplexer>();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis unavailable for lead capture");
            return null;
        }
    }

    private static async Task<long> IncrementRedisLimitAsync(IDatabase db, string key, TimeSpan window)
    {
        var count = await db.StringIncrementAsync(key);
        if (count == 1)
        {
            await db.KeyExpireAsync(key, window);
        }

        return count;
    }

    private static string NormalizeSource(string? source)
    {
        var normalized = string.IsNullOrWhiteSpace(source) ? "email_capture" : source.Trim();
        return normalized.Length > MaxSourceLength ? normalized[..MaxSourceLength] : normalized;
    }

    private static bool IsValidEmail(string email)
    {
        return Regex.IsMatch(
            email.Trim(),
            @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
            RegexOptions.IgnoreCase,
            TimeSpan.FromMilliseconds(250));
    }
}

public record EmailLeadRequest(
    string Email,
    string? Source,
    string? TurnstileToken = null,
    string? CfTurnstileResponse = null,
    string? CompanyWebsite = null);
