using GeoLeap.Api.Models;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public interface IChangeDetector
    {
        Task<bool> HasChangesAsync(object? currentData, object? newData);
        Task<ChangeAnalysis> AnalyzeChangesAsync(object? currentData, object? newData, string contentId, ContentType contentType);
    }
}