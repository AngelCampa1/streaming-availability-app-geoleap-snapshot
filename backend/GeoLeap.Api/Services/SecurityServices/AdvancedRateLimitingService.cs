using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using System.Net;

namespace GeoLeap.Api.Services.SecurityServices;

public interface IAdvancedRateLimitingService
{
    Task<RateLimitResult> CheckRateLimitAsync(string clientId, string endpoint, RateLimitType limitType = RateLimitType.General);
    Task<RateLimitResult> CheckAuthenticationRateLimitAsync(string clientId, string email = "");
    Task<RateLimitResult> CheckRegistrationRateLimitAsync(string clientId, string email = "");
    Task<RateLimitResult> CheckPaymentRateLimitAsync(string clientId, Guid userId);
    Task IncrementAsync(string clientId, string endpoint, RateLimitType limitType = RateLimitType.General);
    Task ResetAsync(string clientId, string endpoint);
    Task<bool> IsClientBlockedAsync(string clientId);
    Task BlockClientAsync(string clientId, TimeSpan duration, string reason);
}

public class AdvancedRateLimitingService : IAdvancedRateLimitingService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<AdvancedRateLimitingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly ConcurrentDictionary<string, ClientRateLimitInfo> _clientLimits;
    private readonly ConcurrentDictionary<string, DateTime> _blockedClients;

    public AdvancedRateLimitingService(
        IMemoryCache cache,
        ILogger<AdvancedRateLimitingService> logger,
        IConfiguration configuration)
    {
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
        _clientLimits = new ConcurrentDictionary<string, ClientRateLimitInfo>();
        _blockedClients = new ConcurrentDictionary<string, DateTime>();
    }

    public async Task<RateLimitResult> CheckRateLimitAsync(string clientId, string endpoint, RateLimitType limitType = RateLimitType.General)
    {
        await Task.CompletedTask; // Make method async for future Redis integration

        // Check if client is blocked
        if (await IsClientBlockedAsync(clientId))
        {
            return RateLimitResult.Blocked("Client is temporarily blocked due to abuse");
        }

        var rateLimitConfig = GetRateLimitConfig(limitType);
        var key = GenerateKey(clientId, endpoint, limitType);
        
        var clientInfo = _clientLimits.GetOrAdd(key, _ => new ClientRateLimitInfo
        {
            RequestCount = 0,
            WindowStart = DateTime.UtcNow,
            LastRequest = DateTime.UtcNow
        });

        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe synchronization
        await clientInfo.Semaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;

            // Reset window if expired
            if (now - clientInfo.WindowStart >= rateLimitConfig.WindowSize)
            {
                clientInfo.RequestCount = 0;
                clientInfo.WindowStart = now;
            }

            // Check for rate limit violation
            if (clientInfo.RequestCount >= rateLimitConfig.MaxRequests)
            {
                // Check for aggressive behavior (multiple violations)
                if (IsAggressiveBehavior(clientId, endpoint))
                {
                    var blockDuration = CalculateBlockDuration(clientId);
                    _ = BlockClientAsync(clientId, blockDuration, $"Multiple rate limit violations on {endpoint}");

                    _logger.LogWarning("Client {ClientId} blocked for {Duration} due to aggressive behavior on {Endpoint}",
                        clientId, blockDuration, endpoint);
                }

                var retryAfter = rateLimitConfig.WindowSize - (now - clientInfo.WindowStart);
                return RateLimitResult.Exceeded(rateLimitConfig.MaxRequests, rateLimitConfig.WindowSize, retryAfter);
            }

            // Check for burst protection
            if (IsBurstTraffic(clientInfo, rateLimitConfig))
            {
                _logger.LogWarning("Burst traffic detected from client {ClientId} on {Endpoint}", clientId, endpoint);
                return RateLimitResult.BurstDetected("Burst traffic detected. Please slow down your requests.");
            }

            clientInfo.LastRequest = now;
            return RateLimitResult.Allowed(clientInfo.RequestCount, rateLimitConfig.MaxRequests, rateLimitConfig.WindowSize);
        }
        finally
        {
            clientInfo.Semaphore.Release();
        }
    }

    public async Task<RateLimitResult> CheckAuthenticationRateLimitAsync(string clientId, string email = "")
    {
        var result = await CheckRateLimitAsync(clientId, "auth", RateLimitType.Authentication);
        
        // Additional email-based rate limiting for authentication attempts
        if (!string.IsNullOrEmpty(email))
        {
            var emailResult = await CheckRateLimitAsync($"email_{email}", "auth", RateLimitType.Authentication);
            if (!emailResult.IsAllowed)
            {
                _logger.LogWarning("Authentication rate limit exceeded for email {Email} from client {ClientId}", 
                    email, clientId);
                return emailResult;
            }
        }

        return result;
    }

    public async Task<RateLimitResult> CheckRegistrationRateLimitAsync(string clientId, string email = "")
    {
        var result = await CheckRateLimitAsync(clientId, "registration", RateLimitType.Registration);
        
        // Additional email-based rate limiting
        if (!string.IsNullOrEmpty(email))
        {
            var emailDomain = email.Split('@').LastOrDefault();
            if (!string.IsNullOrEmpty(emailDomain))
            {
                var domainResult = await CheckRateLimitAsync($"domain_{emailDomain}", "registration", RateLimitType.Registration);
                if (!domainResult.IsAllowed)
                {
                    _logger.LogWarning("Registration rate limit exceeded for domain {Domain} from client {ClientId}", 
                        emailDomain, clientId);
                    return domainResult;
                }
            }
        }

        return result;
    }

    public async Task<RateLimitResult> CheckPaymentRateLimitAsync(string clientId, Guid userId)
    {
        var clientResult = await CheckRateLimitAsync(clientId, "payment", RateLimitType.Payment);
        var userResult = await CheckRateLimitAsync($"user_{userId}", "payment", RateLimitType.Payment);
        
        if (!clientResult.IsAllowed)
        {
            _logger.LogWarning("Payment rate limit exceeded for client {ClientId}", clientId);
            return clientResult;
        }
        
        if (!userResult.IsAllowed)
        {
            _logger.LogWarning("Payment rate limit exceeded for user {UserId} from client {ClientId}", userId, clientId);
            return userResult;
        }

        return clientResult;
    }

    public async Task IncrementAsync(string clientId, string endpoint, RateLimitType limitType = RateLimitType.General)
    {
        await Task.CompletedTask;

        var key = GenerateKey(clientId, endpoint, limitType);
        var clientInfo = _clientLimits.GetOrAdd(key, _ => new ClientRateLimitInfo
        {
            RequestCount = 0,
            WindowStart = DateTime.UtcNow,
            LastRequest = DateTime.UtcNow
        });

        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe synchronization
        await clientInfo.Semaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            var rateLimitConfig = GetRateLimitConfig(limitType);

            // Reset window if expired
            if (now - clientInfo.WindowStart >= rateLimitConfig.WindowSize)
            {
                clientInfo.RequestCount = 0;
                clientInfo.WindowStart = now;
            }

            clientInfo.RequestCount++;
            clientInfo.LastRequest = now;

            // Track violations for pattern detection
            if (clientInfo.RequestCount > rateLimitConfig.MaxRequests)
            {
                TrackViolation(clientId, endpoint);
            }
        }
        finally
        {
            clientInfo.Semaphore.Release();
        }
    }

    public async Task ResetAsync(string clientId, string endpoint)
    {
        await Task.CompletedTask;

        var keys = _clientLimits.Keys.Where(k => k.StartsWith($"{clientId}_{endpoint}")).ToList();
        foreach (var key in keys)
        {
            _clientLimits.TryRemove(key, out _);
        }

        _logger.LogInformation("Rate limit reset for client {ClientId} on endpoint {Endpoint}", clientId, endpoint);
    }

    public async Task<bool> IsClientBlockedAsync(string clientId)
    {
        await Task.CompletedTask;

        if (_blockedClients.TryGetValue(clientId, out var blockedUntil))
        {
            if (DateTime.UtcNow < blockedUntil)
            {
                return true;
            }
            else
            {
                // Remove expired block
                _blockedClients.TryRemove(clientId, out _);
            }
        }

        return false;
    }

    public async Task BlockClientAsync(string clientId, TimeSpan duration, string reason)
    {
        await Task.CompletedTask;

        var blockedUntil = DateTime.UtcNow.Add(duration);
        _blockedClients.AddOrUpdate(clientId, blockedUntil, (_, _) => blockedUntil);

        _logger.LogWarning("Client {ClientId} blocked until {BlockedUntil}. Reason: {Reason}", 
            clientId, blockedUntil, reason);
        
        // In a production environment, you might also want to:
        // - Store this in a persistent cache (Redis)
        // - Notify security monitoring systems
        // - Add to IP blacklist if it's an IP-based client ID
    }

    private RateLimitConfig GetRateLimitConfig(RateLimitType limitType)
    {
        var configSection = $"RateLimiting:{limitType}";
        var config = _configuration.GetSection(configSection).Get<RateLimitConfig>();
        
        return config ?? limitType switch
        {
            RateLimitType.Authentication => new RateLimitConfig 
            { 
                MaxRequests = 5, 
                WindowSize = TimeSpan.FromMinutes(15),
                BurstThreshold = 3,
                BurstWindow = TimeSpan.FromSeconds(30)
            },
            // NOTE: Registration limit increased from 3/hour to 10/5min to accommodate users behind
            // shared IPs (offices, cafes, universities, NAT) while still preventing abuse
            RateLimitType.Registration => new RateLimitConfig
            {
                MaxRequests = 10,
                WindowSize = TimeSpan.FromMinutes(5),
                BurstThreshold = 5,
                BurstWindow = TimeSpan.FromMinutes(1)
            },
            RateLimitType.Payment => new RateLimitConfig 
            { 
                MaxRequests = 10, 
                WindowSize = TimeSpan.FromMinutes(10),
                BurstThreshold = 5,
                BurstWindow = TimeSpan.FromMinutes(1)
            },
            RateLimitType.Search => new RateLimitConfig 
            { 
                MaxRequests = 100, 
                WindowSize = TimeSpan.FromMinutes(1),
                BurstThreshold = 20,
                BurstWindow = TimeSpan.FromSeconds(10)
            },
            RateLimitType.API => new RateLimitConfig 
            { 
                MaxRequests = 1000, 
                WindowSize = TimeSpan.FromHours(1),
                BurstThreshold = 100,
                BurstWindow = TimeSpan.FromMinutes(1)
            },
            _ => new RateLimitConfig 
            { 
                MaxRequests = 100, 
                WindowSize = TimeSpan.FromMinutes(1),
                BurstThreshold = 30,
                BurstWindow = TimeSpan.FromSeconds(10)
            }
        };
    }

    private static string GenerateKey(string clientId, string endpoint, RateLimitType limitType)
    {
        return $"{clientId}_{endpoint}_{limitType}";
    }

    private static bool IsBurstTraffic(ClientRateLimitInfo clientInfo, RateLimitConfig config)
    {
        var now = DateTime.UtcNow;
        var timeSinceLastRequest = now - clientInfo.LastRequest;
        
        // If requests are coming in too fast within the burst window
        if (timeSinceLastRequest < config.BurstWindow)
        {
            // Check if we're exceeding burst threshold
            var recentRequests = clientInfo.RequestCount;
            var burstWindowRatio = (double)timeSinceLastRequest.TotalMilliseconds / config.BurstWindow.TotalMilliseconds;
            var expectedRequests = (int)(config.BurstThreshold * burstWindowRatio);
            
            return recentRequests > Math.Max(expectedRequests, 1);
        }

        return false;
    }

    private bool IsAggressiveBehavior(string clientId, string endpoint)
    {
        // Check violation count for this client+endpoint combination
        var violationKey = $"violations_{clientId}_{endpoint}";
        var violations = _cache.GetOrCreate(violationKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            return 0;
        });

        return violations >= 3; // Consider 3+ violations in an hour as aggressive
    }

    private void TrackViolation(string clientId, string endpoint)
    {
        var violationKey = $"violations_{clientId}_{endpoint}";
        var violations = _cache.GetOrCreate(violationKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            return 0;
        });

        _cache.Set(violationKey, violations + 1, TimeSpan.FromHours(1));
        
        _logger.LogInformation("Rate limit violation tracked for client {ClientId} on {Endpoint}. Total violations: {Violations}",
            clientId, endpoint, violations + 1);
    }

    private TimeSpan CalculateBlockDuration(string clientId)
    {
        // Progressive blocking - longer blocks for repeat offenders
        var blockHistoryKey = $"block_history_{clientId}";
        var previousBlocks = _cache.GetOrCreate(blockHistoryKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1);
            return 0;
        });

        var blockDuration = previousBlocks switch
        {
            0 => TimeSpan.FromMinutes(5),   // First offense: 5 minutes
            1 => TimeSpan.FromMinutes(15),  // Second offense: 15 minutes
            2 => TimeSpan.FromHours(1),     // Third offense: 1 hour
            3 => TimeSpan.FromHours(6),     // Fourth offense: 6 hours
            _ => TimeSpan.FromDays(1)       // Persistent offender: 24 hours
        };

        _cache.Set(blockHistoryKey, previousBlocks + 1, TimeSpan.FromDays(1));
        
        return blockDuration;
    }
}

public class ClientRateLimitInfo
{
    // FIXED: Week 1 Day 3 - Added SemaphoreSlim for async-safe synchronization
    public SemaphoreSlim Semaphore { get; } = new SemaphoreSlim(1, 1);
    public int RequestCount { get; set; }
    public DateTime WindowStart { get; set; }
    public DateTime LastRequest { get; set; }
}

public class RateLimitConfig
{
    public int MaxRequests { get; set; }
    public TimeSpan WindowSize { get; set; }
    public int BurstThreshold { get; set; }
    public TimeSpan BurstWindow { get; set; }
}

public enum RateLimitType
{
    General,
    Authentication,
    Registration,
    Payment,
    Search,
    API,
    Upload,
    Download
}

public class RateLimitResult
{
    public bool IsAllowed { get; private set; }
    public string? Reason { get; private set; }
    public int CurrentCount { get; private set; }
    public int Limit { get; private set; }
    public TimeSpan WindowSize { get; private set; }
    public TimeSpan? RetryAfter { get; private set; }
    public bool IsBlocked { get; private set; }
    public bool IsBurstDetected { get; private set; }

    private RateLimitResult() { }

    public static RateLimitResult Allowed(int currentCount, int limit, TimeSpan windowSize)
    {
        return new RateLimitResult
        {
            IsAllowed = true,
            CurrentCount = currentCount,
            Limit = limit,
            WindowSize = windowSize
        };
    }

    public static RateLimitResult Exceeded(int limit, TimeSpan windowSize, TimeSpan retryAfter)
    {
        return new RateLimitResult
        {
            IsAllowed = false,
            Reason = "Rate limit exceeded",
            CurrentCount = limit,
            Limit = limit,
            WindowSize = windowSize,
            RetryAfter = retryAfter
        };
    }

    public static RateLimitResult Blocked(string reason)
    {
        return new RateLimitResult
        {
            IsAllowed = false,
            Reason = reason,
            IsBlocked = true
        };
    }

    public static RateLimitResult BurstDetected(string reason)
    {
        return new RateLimitResult
        {
            IsAllowed = false,
            Reason = reason,
            IsBurstDetected = true
        };
    }
}