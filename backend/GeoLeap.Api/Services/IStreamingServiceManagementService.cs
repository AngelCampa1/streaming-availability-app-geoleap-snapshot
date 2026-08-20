using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IStreamingServiceManagementService
{
    // User streaming service management
    Task<UserStreamingServicesResponse> GetUserStreamingServicesAsync(Guid userId, string? countryCode = null);
    Task<UserStreamingServiceDto> AddUserStreamingServiceAsync(Guid userId, AddStreamingServiceRequest request);
    Task<UserStreamingServiceDto> UpdateUserStreamingServiceAsync(Guid userId, Guid streamingServiceId, UpdateStreamingServicePreferencesRequest request);
    Task<bool> RemoveUserStreamingServiceAsync(Guid userId, Guid streamingServiceId);
    Task<List<UserStreamingServiceDto>> GetActiveUserStreamingServicesAsync(Guid userId);
    
    // Streaming service catalog
    Task<List<StreamingServiceCatalogDto>> GetAllStreamingServicesAsync(string? countryCode = null);
    Task<StreamingServiceCatalogDto?> GetStreamingServiceAsync(Guid streamingServiceId);
    Task<List<StreamingServiceCatalogDto>> GetStreamingServicesByCategoryAsync(string category, string? countryCode = null);
    Task<List<StreamingServiceCatalogDto>> GetStreamingServicesByTypeAsync(StreamingServiceType type, string? countryCode = null);
    
    // Recommendations
    Task<StreamingServiceRecommendationResponse> GetRecommendedStreamingServicesAsync(Guid userId, StreamingServiceRecommendationRequest request);
    Task<List<StreamingServiceCatalogDto>> GetPopularStreamingServicesAsync(string? countryCode = null, int limit = 10);
    
    // Bulk operations
    Task<List<UserStreamingServiceDto>> BulkAddUserStreamingServicesAsync(Guid userId, List<AddStreamingServiceRequest> requests);
    Task<bool> BulkRemoveUserStreamingServicesAsync(Guid userId, List<Guid> streamingServiceIds);
    
    // Analytics
    Task<Dictionary<string, int>> GetUserStreamingServiceStatsAsync(Guid userId);
    Task<bool> HasUserSelectedStreamingServicesAsync(Guid userId);
}