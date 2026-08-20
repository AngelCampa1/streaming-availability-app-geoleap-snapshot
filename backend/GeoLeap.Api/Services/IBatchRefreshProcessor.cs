using GeoLeap.Api.Models;
using static GeoLeap.Api.Services.BatchRefreshProcessor;

namespace GeoLeap.Api.Services;

public interface IBatchRefreshProcessor
{
    Task ProcessBatchRefreshAsync(BatchRefreshRequest request);
    Task ProcessStaleContentRefreshAsync(int maxCount = 1000, RefreshPriority priority = RefreshPriority.Standard);
    Task ProcessPopularContentRefreshAsync(TimeSpan period, int maxCount = 500, RefreshPriority priority = RefreshPriority.High);
    Task ProcessScheduledRefreshAsync();
    Task<BatchRefreshStatus> GetBatchRefreshStatusAsync(string batchId);
}