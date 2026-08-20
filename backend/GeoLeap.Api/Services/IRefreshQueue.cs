using GeoLeap.Api.Models;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public interface IRefreshQueue
    {
        Task EnqueueAsync(RefreshOperation operation, bool immediate = false);
        Task<RefreshOperation?> DequeueAsync(CancellationToken cancellationToken = default);
        Task<int> GetQueueLengthAsync(RefreshPriority? priority = null);
        Task RemoveAsync(string operationId);
        Task RequeueAsync(RefreshOperation operation, TimeSpan delay);
        Task<List<RefreshOperation>> GetActiveOperationsAsync();
        Task ClearQueueAsync(RefreshPriority? priority = null);
    }
}