using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing user watchlists
/// </summary>
public interface IWatchlistService
{
    // Watchlist CRUD operations
    Task<WatchlistDetailDto> CreateWatchlistAsync(Guid userId, CreateWatchlistDto dto);
    Task<WatchlistDetailDto?> GetWatchlistAsync(Guid watchlistId, Guid userId);
    Task<List<WatchlistSummaryDto>> GetUserWatchlistsAsync(Guid userId, bool includeShared = true);
    Task<WatchlistDetailDto?> UpdateWatchlistAsync(Guid watchlistId, Guid userId, UpdateWatchlistDto dto);
    Task<bool> DeleteWatchlistAsync(Guid watchlistId, Guid userId);
    
    // Watchlist item operations
    Task<WatchlistItemDto> AddItemToWatchlistAsync(Guid watchlistId, Guid userId, AddWatchlistItemDto dto);
    Task<WatchlistItemDto?> UpdateWatchlistItemAsync(Guid itemId, Guid userId, UpdateWatchlistItemDto dto);
    Task<bool> RemoveItemFromWatchlistAsync(Guid itemId, Guid userId);
    Task<bool> MoveItemToWatchlistAsync(Guid itemId, Guid targetWatchlistId, Guid userId);
    Task<List<WatchlistItemDto>> GetWatchlistItemsAsync(Guid watchlistId, Guid userId, int page = 1, int pageSize = 50);
    
    // Bulk operations
    Task<BulkOperationResult> BulkOperationAsync(Guid userId, BulkWatchlistItemOperationDto dto);
    
    // Watchlist categories
    Task<WatchlistCategoryDto> CreateCategoryAsync(Guid userId, CreateWatchlistCategoryDto dto);
    Task<List<WatchlistCategoryDto>> GetUserCategoriesAsync(Guid userId);
    Task<WatchlistCategoryDto?> UpdateCategoryAsync(Guid categoryId, Guid userId, CreateWatchlistCategoryDto dto);
    Task<bool> DeleteCategoryAsync(Guid categoryId, Guid userId);

    // Watchlist views
    Task<List<WatchlistViewDto>> GetUserViewsAsync(Guid userId);
    Task<WatchlistViewDto> CreateViewAsync(Guid userId, CreateWatchlistViewDto dto);
    Task<WatchlistViewDto?> UpdateViewAsync(Guid viewId, Guid userId, CreateWatchlistViewDto dto);
    Task<bool> DeleteViewAsync(Guid viewId, Guid userId);

    // Item availability
    Task<List<WatchlistItemAvailabilityDto>?> GetItemAvailabilityAsync(Guid itemId, Guid userId);
    Task<bool> RefreshItemAvailabilityAsync(Guid itemId, Guid userId);
    
    // Sharing functionality
    Task<WatchlistShareDto> ShareWatchlistAsync(Guid watchlistId, Guid userId, ShareWatchlistDto dto);
    Task<bool> RevokeWatchlistShareAsync(Guid shareId, Guid userId);
    Task<List<WatchlistShareDto>> GetWatchlistSharesAsync(Guid watchlistId, Guid userId);
    Task<WatchlistDetailDto?> GetSharedWatchlistAsync(string shareToken);
    Task<bool> AcceptWatchlistShareAsync(Guid shareId, Guid userId);
    
    // Analytics and insights
    Task<WatchlistAnalyticsDto> GetUserAnalyticsAsync(Guid userId);
    Task<List<WatchlistActivityDto>> GetWatchlistActivitiesAsync(Guid watchlistId, Guid userId, int page = 1, int pageSize = 20);
    
    // Export functionality
    Task<ExportResult> ExportWatchlistsAsync(Guid userId, WatchlistExportDto dto);
    
    // Search and filtering
    Task<List<WatchlistSummaryDto>> SearchWatchlistsAsync(Guid userId, string query, int page = 1, int pageSize = 10);
    Task<List<WatchlistItemDto>> SearchWatchlistItemsAsync(Guid watchlistId, Guid userId, string query, int page = 1, int pageSize = 20);
    
    // Availability tracking
    Task UpdateItemAvailabilityAsync(Guid itemId, List<WatchlistItemAvailabilityDto> availability);
    Task<List<WatchlistItemDto>> GetItemsWithAvailabilityChangesAsync(Guid userId, DateTime since);
    
    // Notification settings
    Task<WatchlistNotificationSettingsDto> GetNotificationSettingsAsync(Guid userId);
    Task<WatchlistNotificationSettingsDto> UpdateNotificationSettingsAsync(Guid userId, WatchlistNotificationSettingsDto dto);
}

/// <summary>
/// Result of bulk operations on watchlist items
/// </summary>
public class BulkOperationResult
{
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public bool IsSuccess => FailureCount == 0;
}

/// <summary>
/// Result of export operations
/// </summary>
public class ExportResult
{
    public string FileName { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = string.Empty;
    public int RecordCount { get; set; }
}