using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Advanced friend discovery service with social graph analysis and network mapping
/// </summary>
public class SocialFriendDiscoveryService : ISocialFriendDiscoveryService
{
    private readonly ApplicationDbContext _context;
    private readonly IEnhancedSocialAuthService _socialAuthService;
    private readonly ILoggerService _logger;
    private readonly IPrivacyService _privacyService;
    private readonly HttpClient _httpClient;

    public SocialFriendDiscoveryService(
        ApplicationDbContext context,
        IEnhancedSocialAuthService socialAuthService,
        ILoggerService logger,
        IPrivacyService privacyService,
        HttpClient httpClient)
    {
        _context = context;
        _socialAuthService = socialAuthService;
        _logger = logger;
        _privacyService = privacyService;
        _httpClient = httpClient;
    }

    public async Task<SocialImportResult> ImportFriendsAsync(Guid userId, string? platform = null)
    {
        try
        {
            // Check user consent
            var hasConsent = await _privacyService.HasFriendDiscoveryConsentAsync(userId);
            if (!hasConsent)
            {
                return new SocialImportResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "User has not provided consent for friend discovery",
                    ErrorCode = "NO_CONSENT"
                };
            }

            var importResults = new List<PlatformImportResult>();
            
            // Get user's connected platforms
            var platforms = string.IsNullOrEmpty(platform) 
                ? await GetUserConnectedPlatformsAsync(userId)
                : new List<string> { platform };

            foreach (var platformName in platforms)
            {
                var result = await ImportFriendsFromPlatformAsync(userId, platformName);
                importResults.Add(result);
            }

            var totalImported = importResults.Sum(r => r.ImportedConnections);
            var totalSkipped = importResults.Sum(r => r.SkippedConnections);
            var errors = importResults.Where(r => !string.IsNullOrEmpty(r.Error)).Select(r => r.Error!).ToArray();

            await _logger.LogAsync("INFO", 
                $"Friend import completed for user {userId}. Imported: {totalImported}, Skipped: {totalSkipped}");

            return new SocialImportResult
            {
                IsSuccess = true,
                ImportedConnections = totalImported,
                SkippedConnections = totalSkipped,
                Errors = errors.Length > 0 ? errors : null
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Friend import failed for user {userId}: {ex.Message}");
            return new SocialImportResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Friend import failed",
                ErrorCode = "IMPORT_FAILED"
            };
        }
    }

    public async Task<List<SocialFriend>> DiscoverMutualFriendsAsync(Guid userId, string platform1, string platform2)
    {
        try
        {
            var friends1 = await GetFriendsFromPlatformAsync(userId, platform1);
            var friends2 = await GetFriendsFromPlatformAsync(userId, platform2);

            var mutualFriends = friends1
                .Where(f1 => friends2.Any(f2 => 
                    f1.Username.Equals(f2.Username, StringComparison.OrdinalIgnoreCase) ||
                    f1.DisplayName.Equals(f2.DisplayName, StringComparison.OrdinalIgnoreCase)))
                .Select(f => new SocialFriend
                {
                    Id = f.Id,
                    Username = f.Username,
                    DisplayName = f.DisplayName,
                    ProfileImageUrl = f.ProfileImageUrl,
                    ConnectionType = "mutual",
                    IsRegisteredUser = f.IsRegisteredUser,
                    GeoLeapUserId = f.GeoLeapUserId
                })
                .ToList();

            await _logger.LogAsync("INFO", 
                $"Found {mutualFriends.Count} mutual friends for user {userId} between {platform1} and {platform2}");

            return mutualFriends;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Mutual friend discovery failed: {ex.Message}");
            return new List<SocialFriend>();
        }
    }

    public async Task<List<SocialFriend>> FindGeoLeapUsersInNetworkAsync(Guid userId)
    {
        try
        {
            var userConnections = await _context.SocialRelationship
                .Where(sr => sr.SocialAccount.UserId == userId)
                .ToListAsync();

            var registeredFriends = new List<SocialFriend>();

            foreach (var connection in userConnections)
            {
                // Try to match by social IDs
                var matchedUser = await _context.SocialConnections
                    .Include(sc => sc.User)
                    .FirstOrDefaultAsync(sc => 
                        sc.SocialUserId == connection.RelatedUserId &&
                        sc.Platform == connection.SocialAccount.Platform &&
                        sc.UserId != userId);

                if (matchedUser != null)
                {
                    registeredFriends.Add(new SocialFriend
                    {
                        Id = matchedUser.SocialUserId,
                        Username = connection.RelatedUsername,
                        DisplayName = connection.RelatedDisplayName,
                        ProfileImageUrl = connection.RelatedProfileImage ?? "",
                        ConnectionType = connection.RelationshipType,
                        IsRegisteredUser = true,
                        GeoLeapUserId = matchedUser.UserId
                    });
                }
            }

            // Remove duplicates
            var uniqueFriends = registeredFriends
                .GroupBy(f => f.GeoLeapUserId)
                .Select(g => g.FirstOrDefault())
                .Where(f => f != null)
                .ToList()!;

            await _logger.LogAsync("INFO", 
                $"Found {uniqueFriends.Count} GeoLeap users in network for user {userId}");

            return uniqueFriends;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"GeoLeap user discovery failed: {ex.Message}");
            return new List<SocialFriend>();
        }
    }

    public async Task<SocialGraphAnalysis> AnalyzeSocialGraphAsync(Guid userId)
    {
        try
        {
            var userConnections = await _context.SocialRelationship
                .Include(sr => sr.SocialAccount)
                .Where(sr => sr.SocialAccount.UserId == userId)
                .ToListAsync();

            var analysis = new SocialGraphAnalysis
            {
                UserId = userId,
                TotalConnections = userConnections.Count,
                PlatformBreakdown = userConnections
                    .GroupBy(c => c.SocialAccount.Platform)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ConnectionTypeBreakdown = userConnections
                    .GroupBy(c => c.RelationshipType)
                    .ToDictionary(g => g.Key, g => g.Count()),
                NetworkDensity = CalculateNetworkDensity(userConnections),
                InfluenceScore = CalculateInfluenceScore(userConnections),
                EngagementScore = await CalculateEngagementScoreAsync(userId),
                MutualConnectionsCount = userConnections.Count(c => c.RelationshipType == "mutual"),
                ReachEstimate = CalculateReachEstimate(userConnections),
                AnalyzedAt = DateTime.UtcNow
            };

            // Store analysis for future reference
            await StoreGraphAnalysisAsync(analysis);

            await _logger.LogAsync("INFO", $"Social graph analysis completed for user {userId}");

            return analysis;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Social graph analysis failed: {ex.Message}");
            throw;
        }
    }

    public async Task<List<SocialFriend>> GetRecommendedConnectionsAsync(Guid userId, int limit = 20)
    {
        try
        {
            var recommendations = new List<SocialFriend>();

            // Get user's current connections
            var currentConnections = await _context.SocialRelationship
                .Include(sr => sr.SocialAccount)
                .Where(sr => sr.SocialAccount.UserId == userId)
                .Select(sr => sr.RelatedUserId)
                .ToHashSetAsync();

            // Find friends of friends
            var friendsOfFriends = await _context.SocialRelationship
                .Include(sr => sr.SocialAccount)
                .Where(sr => currentConnections.Contains(sr.SocialAccount.User.Id.ToString()) &&
                            !currentConnections.Contains(sr.RelatedUserId) &&
                            sr.SocialAccount.UserId != userId)
                .GroupBy(sr => sr.RelatedUserId)
                .Select(g => new { UserId = g.Key, MutualCount = g.Count() })
                .OrderByDescending(x => x.MutualCount)
                .Take(limit)
                .ToListAsync();

            foreach (var recommendation in friendsOfFriends)
            {
                var userConnection = await _context.SocialRelationship
                    .Include(sr => sr.SocialAccount)
                    .FirstOrDefaultAsync(sr => sr.RelatedUserId == recommendation.UserId);

                if (userConnection != null)
                {
                    recommendations.Add(new SocialFriend
                    {
                        Id = recommendation.UserId,
                        Username = userConnection.RelatedUsername,
                        DisplayName = userConnection.RelatedDisplayName,
                        ProfileImageUrl = userConnection.RelatedProfileImage ?? "",
                        ConnectionType = "recommended",
                        IsRegisteredUser = await IsGeoLeapUserAsync(recommendation.UserId, userConnection.SocialAccount.Platform)
                    });
                }
            }

            await _logger.LogAsync("INFO", 
                $"Generated {recommendations.Count} connection recommendations for user {userId}");

            return recommendations;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Connection recommendations failed: {ex.Message}");
            return new List<SocialFriend>();
        }
    }

    public async Task<NetworkStrengthAnalysis> AnalyzeNetworkStrengthAsync(Guid userId)
    {
        try
        {
            var connections = await _context.SocialRelationship
                .Include(sr => sr.SocialAccount)
                .Where(sr => sr.SocialAccount.UserId == userId)
                .ToListAsync();

            // ✅ PERFORMANCE: Use Count(predicate) instead of Where().Count() for better efficiency
            var strongConnections = connections.Count(c => c.RelationshipStrength >= 0.7);
            var moderateConnections = connections.Count(c => c.RelationshipStrength >= 0.4 && c.RelationshipStrength < 0.7);
            var weakConnections = connections.Count(c => c.RelationshipStrength < 0.4);

            var analysis = new NetworkStrengthAnalysis
            {
                UserId = userId,
                TotalConnections = connections.Count,
                StrongConnections = strongConnections,
                ModerateConnections = moderateConnections,
                WeakConnections = weakConnections,
                AverageConnectionStrength = connections.Any() ? connections.Average(c => c.RelationshipStrength) : 0,
                NetworkStability = CalculateNetworkStability(connections),
                ConnectivityIndex = CalculateConnectivityIndex(connections),
                AnalyzedAt = DateTime.UtcNow
            };

            await _logger.LogAsync("INFO", $"Network strength analysis completed for user {userId}");

            return analysis;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Network strength analysis failed: {ex.Message}");
            throw;
        }
    }

    public async Task<ServiceResult> UpdateConnectionStrengthAsync(Guid userId, string platform, string friendId, double strength)
    {
        try
        {
            var connection = await _context.SocialRelationship
                .Include(sr => sr.SocialAccount)
                .FirstOrDefaultAsync(sr => 
                    sr.SocialAccount.UserId == userId &&
                    sr.SocialAccount.Platform == platform &&
                    sr.RelatedUserId == friendId);

            if (connection == null)
            {
                return new ServiceResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Connection not found",
                    ErrorCode = "CONNECTION_NOT_FOUND"
                };
            }

            connection.RelationshipStrength = Math.Max(0, Math.Min(1, strength)); // Clamp between 0 and 1
            await _context.SaveChangesAsync();

            await _logger.LogAsync("INFO", 
                $"Updated connection strength for user {userId}, friend {friendId} to {strength}");

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to update connection strength: {ex.Message}");
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to update connection strength",
                ErrorCode = "UPDATE_FAILED"
            };
        }
    }

    #region Private Helper Methods

    private async Task<List<string>> GetUserConnectedPlatformsAsync(Guid userId)
    {
        return await _context.SocialConnections
            .Where(sc => sc.UserId == userId && sc.IsTokenValid)
            .Select(sc => sc.Platform)
            .Distinct()
            .ToListAsync();
    }

    private async Task<PlatformImportResult> ImportFriendsFromPlatformAsync(Guid userId, string platform)
    {
        try
        {
            // Validate token first
            var tokenResult = await _socialAuthService.ValidateAndRefreshTokenAsync(userId, platform);
            if (!tokenResult.IsValid)
            {
                return new PlatformImportResult
                {
                    Platform = platform,
                    ImportedConnections = 0,
                    SkippedConnections = 0,
                    Error = "Invalid or expired token"
                };
            }

            var friends = await FetchFriendsFromPlatformAPIAsync(userId, platform);
            int imported = 0;
            int skipped = 0;

            foreach (var friend in friends)
            {
                var existing = await _context.SocialRelationship
                    .Include(sr => sr.SocialAccount)
                    .AnyAsync(sr => 
                        sr.SocialAccount.UserId == userId &&
                        sr.SocialAccount.Platform == platform &&
                        sr.RelatedUserId == friend.Id);

                if (existing)
                {
                    skipped++;
                    continue;
                }

                // Get or create social account
                var socialAccount = await GetOrCreateSocialAccountAsync(userId, platform);

                var relationship = new SocialRelationship
                {
                    SocialAccountId = socialAccount.Id,
                    RelatedUserId = friend.Id,
                    RelatedUsername = friend.Username,
                    RelatedDisplayName = friend.DisplayName,
                    RelatedProfileImage = friend.ProfileImageUrl,
                    RelationshipType = friend.ConnectionType,
                    EstablishedAt = friend.ConnectedSince ?? DateTime.UtcNow,
                    RelationshipStrength = CalculateInitialRelationshipStrength(friend),
                    GeoLeapUserId = friend.GeoLeapUserId
                };

                _context.SocialRelationship.Add(relationship);
                imported++;
            }

            await _context.SaveChangesAsync();

            return new PlatformImportResult
            {
                Platform = platform,
                ImportedConnections = imported,
                SkippedConnections = skipped
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Platform import failed for {platform}: {ex.Message}");
            return new PlatformImportResult
            {
                Platform = platform,
                ImportedConnections = 0,
                SkippedConnections = 0,
                Error = ex.Message
            };
        }
    }

    private async Task<List<SocialFriend>> FetchFriendsFromPlatformAPIAsync(Guid userId, string platform)
    {
        // This would make actual API calls to each platform
        // For now, return empty list - would need platform-specific implementations
        await Task.Delay(100); // Simulate API call
        return new List<SocialFriend>();
    }

    private async Task<List<SocialFriend>> GetFriendsFromPlatformAsync(Guid userId, string platform)
    {
        return await _context.SocialRelationship
            .Include(sr => sr.SocialAccount)
            .Where(sr => sr.SocialAccount.UserId == userId && sr.SocialAccount.Platform == platform)
            .Select(sr => new SocialFriend
            {
                Id = sr.RelatedUserId,
                Username = sr.RelatedUsername,
                DisplayName = sr.RelatedDisplayName,
                ProfileImageUrl = sr.RelatedProfileImage ?? "",
                ConnectionType = sr.RelationshipType,
                ConnectedSince = sr.EstablishedAt,
                IsRegisteredUser = sr.GeoLeapUserId.HasValue,
                GeoLeapUserId = sr.GeoLeapUserId
            })
            .ToListAsync();
    }

    private async Task<SocialAccount> GetOrCreateSocialAccountAsync(Guid userId, string platform)
    {
        var account = await _context.SocialAccount
            .FirstOrDefaultAsync(sa => sa.UserId == userId && sa.Platform == platform);

        if (account == null)
        {
            account = new SocialAccount
            {
                UserId = userId,
                Platform = platform,
                ConnectedAt = DateTime.UtcNow
            };
            _context.SocialAccount.Add(account);
            await _context.SaveChangesAsync();
        }

        return account;
    }

    private async Task<bool> IsGeoLeapUserAsync(string socialUserId, string platform)
    {
        return await _context.SocialConnections
            .AnyAsync(sc => sc.SocialUserId == socialUserId && sc.Platform == platform);
    }

    private double CalculateInitialRelationshipStrength(SocialFriend friend)
    {
        double strength = 0.5; // Base strength

        // Boost for verified accounts
        if (friend.IsRegisteredUser) strength += 0.2;

        // Boost for mutual connections
        if (friend.ConnectionType == "mutual") strength += 0.2;

        // Boost for recent connections
        if (friend.ConnectedSince.HasValue && friend.ConnectedSince > DateTime.UtcNow.AddDays(-30))
            strength += 0.1;

        return Math.Min(1.0, strength);
    }

    private double CalculateNetworkDensity(List<SocialRelationship> connections)
    {
        if (connections.Count < 2) return 0;
        
        int actualConnections = connections.Count;
        int possibleConnections = connections.Count * (connections.Count - 1) / 2;
        
        return (double)actualConnections / possibleConnections;
    }

    private double CalculateInfluenceScore(List<SocialRelationship> connections)
    {
        return connections.Average(c => c.RelationshipStrength) * Math.Log(connections.Count + 1);
    }

    private async Task<double> CalculateEngagementScoreAsync(Guid userId)
    {
        var recentActivity = await _context.SocialInteraction
            .Include(si => si.SocialAccount)
            .Where(si => si.SocialAccount.UserId == userId && 
                        si.CreatedAt > DateTime.UtcNow.AddDays(-30))
            .CountAsync();

        return Math.Min(1.0, recentActivity / 100.0); // Normalize to 0-1
    }

    private long CalculateReachEstimate(List<SocialRelationship> connections)
    {
        return connections
            .Where(c => c.RelationshipStrength > 0.5)
            .Sum(c => (long)(1000 * c.RelationshipStrength)); // Rough estimate
    }

    private double CalculateNetworkStability(List<SocialRelationship> connections)
    {
        if (!connections.Any()) return 0;

        var recentConnections = connections.Count(c => c.EstablishedAt > DateTime.UtcNow.AddDays(-90));
        var totalConnections = connections.Count;

        return 1.0 - (double)recentConnections / totalConnections; // Higher = more stable
    }

    private double CalculateConnectivityIndex(List<SocialRelationship> connections)
    {
        var strongConnections = connections.Count(c => c.RelationshipStrength >= 0.7);
        return connections.Any() ? (double)strongConnections / connections.Count : 0;
    }

    private async Task StoreGraphAnalysisAsync(SocialGraphAnalysis analysis)
    {
        // Store in a separate table for historical tracking
        // This would be implemented with a SocialGraphAnalysis entity
        await Task.CompletedTask;
    }

    #endregion
}

/// <summary>
/// Platform-specific import result
/// </summary>
public class PlatformImportResult
{
    public string Platform { get; set; } = string.Empty;
    public int ImportedConnections { get; set; }
    public int SkippedConnections { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Social graph analysis result
/// </summary>
public class SocialGraphAnalysis
{
    public Guid UserId { get; set; }
    public int TotalConnections { get; set; }
    public Dictionary<string, int> PlatformBreakdown { get; set; } = new();
    public Dictionary<string, int> ConnectionTypeBreakdown { get; set; } = new();
    public double NetworkDensity { get; set; }
    public double InfluenceScore { get; set; }
    public double EngagementScore { get; set; }
    public int MutualConnectionsCount { get; set; }
    public long ReachEstimate { get; set; }
    public DateTime AnalyzedAt { get; set; }
}

/// <summary>
/// Network strength analysis result
/// </summary>
public class NetworkStrengthAnalysis
{
    public Guid UserId { get; set; }
    public int TotalConnections { get; set; }
    public int StrongConnections { get; set; }
    public int ModerateConnections { get; set; }
    public int WeakConnections { get; set; }
    public double AverageConnectionStrength { get; set; }
    public double NetworkStability { get; set; }
    public double ConnectivityIndex { get; set; }
    public DateTime AnalyzedAt { get; set; }
}

/// <summary>
/// Interface for social friend discovery service
/// </summary>
public interface ISocialFriendDiscoveryService
{
    Task<SocialImportResult> ImportFriendsAsync(Guid userId, string? platform = null);
    Task<List<SocialFriend>> DiscoverMutualFriendsAsync(Guid userId, string platform1, string platform2);
    Task<List<SocialFriend>> FindGeoLeapUsersInNetworkAsync(Guid userId);
    Task<SocialGraphAnalysis> AnalyzeSocialGraphAsync(Guid userId);
    Task<List<SocialFriend>> GetRecommendedConnectionsAsync(Guid userId, int limit = 20);
    Task<NetworkStrengthAnalysis> AnalyzeNetworkStrengthAsync(Guid userId);
    Task<ServiceResult> UpdateConnectionStrengthAsync(Guid userId, string platform, string friendId, double strength);
}