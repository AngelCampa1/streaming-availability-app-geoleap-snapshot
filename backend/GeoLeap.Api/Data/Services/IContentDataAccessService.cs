using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Interface for Content data access operations
/// </summary>
public interface IContentDataAccessService
{
    Task<SearchableContent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<SearchableContent>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<SearchableContent> CreateAsync(SearchableContent content, CancellationToken cancellationToken = default);
    Task<SearchableContent> UpdateAsync(SearchableContent content, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SearchableContent?> GetByTitleAsync(string title, CancellationToken cancellationToken = default);
    Task<(IEnumerable<SearchableContent> Content, int TotalCount)> SearchAsync(
        string? query = null,
        ContentType? contentType = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
}