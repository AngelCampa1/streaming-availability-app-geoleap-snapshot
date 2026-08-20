using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IPopularContentService
{
    Task<List<PopularContent>> GetPopularContentAsync(int limit = 100);
    Task<List<string>> GetPopularSearchQueriesAsync(int limit = 50);
    Task TrackContentRequestAsync(string contentId, ContentType contentType, string title);
    Task TrackSearchQueryAsync(string query);
    Task<List<PopularContent>> GetTrendingContentAsync(int limit = 50);
    Task<List<string>> GetTrendingSearchQueriesAsync(int limit = 25);
}