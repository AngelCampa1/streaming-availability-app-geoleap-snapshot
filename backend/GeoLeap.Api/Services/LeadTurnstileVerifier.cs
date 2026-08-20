using System.Text.Json;

namespace GeoLeap.Api.Services;

public interface ILeadTurnstileVerifier
{
    Task<LeadTurnstileResult> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken);
}

public sealed record LeadTurnstileResult(bool Success, string Reason)
{
    public static LeadTurnstileResult Passed() => new(true, "passed");
    public static LeadTurnstileResult Failed(string reason) => new(false, reason);
}

public sealed class LeadTurnstileVerifier : ILeadTurnstileVerifier
{
    private const string SiteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LeadTurnstileVerifier> _logger;

    public LeadTurnstileVerifier(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<LeadTurnstileVerifier> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<LeadTurnstileResult> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken)
    {
        var secret = _configuration["TURNSTILE_SECRET_KEY"] ??
            _configuration["Turnstile:SecretKey"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            if (_environment.IsProduction())
            {
                _logger.LogError("TURNSTILE_SECRET_KEY is not configured in production; failing lead capture closed.");
                return LeadTurnstileResult.Failed("missing-secret");
            }

            return LeadTurnstileResult.Passed();
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return LeadTurnstileResult.Failed("missing-token");
        }

        try
        {
            var fields = new List<KeyValuePair<string, string>>
            {
                new("secret", secret),
                new("response", token),
            };

            if (!string.IsNullOrWhiteSpace(remoteIp))
            {
                fields.Add(new("remoteip", remoteIp));
            }

            using var content = new FormUrlEncodedContent(fields);
            using var client = _httpClientFactory.CreateClient(nameof(LeadTurnstileVerifier));
            using var response = await client.PostAsync(SiteVerifyUrl, content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return LeadTurnstileResult.Failed($"siteverify-http-{(int)response.StatusCode}");
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var body = await JsonSerializer.DeserializeAsync<TurnstileSiteVerifyResponse>(
                stream,
                cancellationToken: cancellationToken);

            return body?.Success == true
                ? LeadTurnstileResult.Passed()
                : LeadTurnstileResult.Failed("siteverify-failed");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Turnstile verification request failed.");
            return LeadTurnstileResult.Failed("siteverify-error");
        }
    }

    private sealed class TurnstileSiteVerifyResponse
    {
        public bool Success { get; set; }
    }
}
