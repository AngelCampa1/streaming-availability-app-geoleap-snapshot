using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IUsageService
{
    Task<UserUsageDto> GetUserUsageAsync(Guid userId);
    Task<bool> IncrementSearchUsageAsync(Guid userId);
    Task<bool> CanPerformSearchAsync(Guid userId);
    Task<int> GetRemainingSearchesAsync(Guid userId);
}
