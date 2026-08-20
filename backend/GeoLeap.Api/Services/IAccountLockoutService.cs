namespace GeoLeap.Api.Services;

public interface IAccountLockoutService
{
    Task<bool> IsLockedOutAsync(string email);
    Task RecordFailedAttemptAsync(string email);
    Task ClearFailedAttemptsAsync(string email);
    Task<int> GetFailedAttemptsCountAsync(string email);
    Task<DateTime?> GetLockoutEndAsync(string email);
}