using GeoLeap.Api.Models;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public interface IDataRefreshOrchestrator
    {
        Task ScheduleRefreshAsync(RefreshRequest request);
        Task<RefreshStatus> GetRefreshStatusAsync(string contentId);
        Task TriggerImmediateRefreshAsync(string contentId, RefreshPriority priority = RefreshPriority.Standard);
        Task<List<RefreshOperation>> GetActiveRefreshOperationsAsync();
        Task CancelRefreshAsync(string operationId);
        Task<RefreshStatistics> GetRefreshStatisticsAsync(TimeSpan period);
        Task<bool> IsContentStaleAsync(string contentId, ContentType contentType);
        Task<List<string>> GetStaleContentAsync(int maxCount = 100);
    }
}