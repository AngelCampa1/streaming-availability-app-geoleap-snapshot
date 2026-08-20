using Microsoft.Extensions.Caching.Distributed;
using System.Collections.Concurrent;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public class AccountLockoutService : IAccountLockoutService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<AccountLockoutService> _logger;
    private const int MaxAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan AttemptsWindow = TimeSpan.FromMinutes(15);

    // Per-email locks to prevent TOCTOU race conditions in read-modify-write operations
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _emailLocks = new();

    public AccountLockoutService(IDistributedCache cache, ILogger<AccountLockoutService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    private static SemaphoreSlim GetLock(string email) =>
        _emailLocks.GetOrAdd(email.ToLowerInvariant(), _ => new SemaphoreSlim(1, 1));

    public async Task<bool> IsLockedOutAsync(string email)
    {
        try
        {
            var key = GetLockoutKey(email);
            var lockoutInfoJson = await _cache.GetStringAsync(key);
            
            if (string.IsNullOrEmpty(lockoutInfoJson))
                return false;

            var lockoutInfo = JsonSerializer.Deserialize<LockoutInfo>(lockoutInfoJson);
            
            if (lockoutInfo == null)
                return false;

            // Check if lockout period has expired
            if (lockoutInfo.IsLocked && lockoutInfo.LockoutEnd <= DateTime.UtcNow)
            {
                await ClearFailedAttemptsAsync(email);
                return false;
            }

            return lockoutInfo.IsLocked;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking lockout status for email: {Email}", email);
            return false; // Default to not locked on error
        }
    }

    public async Task RecordFailedAttemptAsync(string email)
    {
        var emailLock = GetLock(email);
        await emailLock.WaitAsync();
        try
        {
            var key = GetLockoutKey(email);
            var lockoutInfoJson = await _cache.GetStringAsync(key);

            var lockoutInfo = string.IsNullOrEmpty(lockoutInfoJson)
                ? new LockoutInfo { Email = email }
                : JsonSerializer.Deserialize<LockoutInfo>(lockoutInfoJson) ?? new LockoutInfo { Email = email };

            // Clean old attempts outside the window
            var cutoff = DateTime.UtcNow.Subtract(AttemptsWindow);
            lockoutInfo.Attempts = lockoutInfo.Attempts.Where(a => a > cutoff).ToList();

            // Add current attempt
            lockoutInfo.Attempts.Add(DateTime.UtcNow);

            // Check if we should lock the account
            if (lockoutInfo.Attempts.Count >= MaxAttempts)
            {
                lockoutInfo.IsLocked = true;
                lockoutInfo.LockoutEnd = DateTime.UtcNow.Add(LockoutDuration);

                _logger.LogWarning("Account locked due to {AttemptCount} failed attempts: {Email}",
                    lockoutInfo.Attempts.Count, email);
            }

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = lockoutInfo.IsLocked
                    ? LockoutDuration
                    : AttemptsWindow
            };

            await _cache.SetStringAsync(key, JsonSerializer.Serialize(lockoutInfo), options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording failed attempt for email: {Email}", email);
        }
        finally
        {
            emailLock.Release();
        }
    }

    public async Task ClearFailedAttemptsAsync(string email)
    {
        try
        {
            var key = GetLockoutKey(email);
            await _cache.RemoveAsync(key);
            
            _logger.LogInformation("Cleared failed attempts for email: {Email}", email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing failed attempts for email: {Email}", email);
        }
    }

    public async Task<int> GetFailedAttemptsCountAsync(string email)
    {
        try
        {
            var key = GetLockoutKey(email);
            var lockoutInfoJson = await _cache.GetStringAsync(key);
            
            if (string.IsNullOrEmpty(lockoutInfoJson))
                return 0;

            var lockoutInfo = JsonSerializer.Deserialize<LockoutInfo>(lockoutInfoJson);
            
            if (lockoutInfo == null)
                return 0;

            // Clean old attempts outside the window
            var cutoff = DateTime.UtcNow.Subtract(AttemptsWindow);
            var recentAttempts = lockoutInfo.Attempts.Where(a => a > cutoff).ToList();
            
            return recentAttempts.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting failed attempts count for email: {Email}", email);
            return 0;
        }
    }

    public async Task<DateTime?> GetLockoutEndAsync(string email)
    {
        try
        {
            var key = GetLockoutKey(email);
            var lockoutInfoJson = await _cache.GetStringAsync(key);
            
            if (string.IsNullOrEmpty(lockoutInfoJson))
                return null;

            var lockoutInfo = JsonSerializer.Deserialize<LockoutInfo>(lockoutInfoJson);
            
            return lockoutInfo?.IsLocked == true ? lockoutInfo.LockoutEnd : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lockout end time for email: {Email}", email);
            return null;
        }
    }

    private static string GetLockoutKey(string email) => $"lockout_{email.ToLowerInvariant()}";

    private class LockoutInfo
    {
        public string Email { get; set; } = string.Empty;
        public List<DateTime> Attempts { get; set; } = new();
        public bool IsLocked { get; set; }
        public DateTime? LockoutEnd { get; set; }
    }
}