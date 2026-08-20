using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

/// <summary>
/// Service for calculating language-aware VPN recommendations
/// </summary>
public class VpnLanguageRecommendationService : IVpnLanguageRecommendationService
{
    private readonly ApplicationDbContext _context;
    private readonly IStreamingAvailabilityClient _streamingClient;
    private readonly IVpnRecommendationService _vpnRecommendationService;
    private readonly ILogger<VpnLanguageRecommendationService> _logger;

    // Language score weights
    private const double AudioWeight = 0.6;
    private const double SubtitleWeight = 0.4;

    public VpnLanguageRecommendationService(
        ApplicationDbContext context,
        IStreamingAvailabilityClient streamingClient,
        IVpnRecommendationService vpnRecommendationService,
        ILogger<VpnLanguageRecommendationService> logger)
    {
        _context = context;
        _streamingClient = streamingClient;
        _vpnRecommendationService = vpnRecommendationService;
        _logger = logger;
    }

    /// <summary>
    /// Calculates language compatibility score using formula: (AudioMatch × 0.6) + (SubtitleMatch × 0.4)
    /// </summary>
    public double CalculateLanguageScore(
        List<string> availableAudio,
        List<string> availableSubs,
        List<string> preferredAudio,
        List<string> preferredSubs)
    {
        try
        {
            var audioScore = CalculateAudioMatchScore(availableAudio, preferredAudio);
            var subtitleScore = CalculateSubtitleMatchScore(availableSubs, preferredSubs);

            var totalScore = (audioScore * AudioWeight) + (subtitleScore * SubtitleWeight);

            _logger.LogDebug(
                "Language score calculated: Audio={AudioScore} (weight {AudioWeight}), Subtitle={SubtitleScore} (weight {SubtitleWeight}), Total={TotalScore}",
                audioScore, AudioWeight, subtitleScore, SubtitleWeight, totalScore);

            return Math.Round(totalScore, 3);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating language score");
            return 0.0;
        }
    }

    /// <summary>
    /// Ranks VPN recommendations by combining language and VPN quality scores
    /// </summary>
    public async Task<List<VpnRecommendationDto>> RankVpnRecommendationsByLanguageAsync(
        List<VpnRecommendationDto> recommendations,
        string contentId,
        List<string> preferredAudio,
        List<string> preferredSubs,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Ranking VPN recommendations by language for content {ContentId}", contentId);

            // Fetch real streaming details from API
            ShowStreamingDetails? streamingDetails = null;
            try
            {
                streamingDetails = await _streamingClient.GetShowDetailsAsync(
                    contentId,
                    userServiceIds: null,
                    userCountry: null,
                    cancellationToken);

                _logger.LogInformation("Retrieved streaming details for {ContentId} with {CountryCount} countries",
                    contentId, streamingDetails?.TotalCountries ?? 0);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch streaming details for {ContentId}, using fallback data", contentId);
            }

            foreach (var recommendation in recommendations)
            {
                foreach (var provider in recommendation.RecommendedProviders)
                {
                    // Get VPN server locations for this provider
                    var providerServerCountries = await _context.VpnServerLocations
                        .Where(sl => sl.VpnProviderId == provider.Id)
                        .Select(sl => sl.CountryCode.ToLower())
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    // Calculate best language score across all countries where VPN has servers
                    var bestLanguageScore = 0.0;
                    var bestAudioLangs = new List<string>();
                    var bestSubLangs = new List<string>();

                    if (streamingDetails?.AvailabilityByCountry != null && streamingDetails.AvailabilityByCountry.Any())
                    {
                        foreach (var countryCode in providerServerCountries)
                        {
                            if (streamingDetails.AvailabilityByCountry.TryGetValue(countryCode, out var countryInfo))
                            {
                                // Extract all available languages from services in this country
                                var audioLangs = countryInfo.Services
                                    .SelectMany(s => s.AudioLanguages)
                                    .Distinct()
                                    .ToList();

                                var subLangs = countryInfo.Services
                                    .SelectMany(s => s.SubtitleLanguages)
                                    .Distinct()
                                    .ToList();

                                var score = CalculateLanguageScore(
                                    audioLangs,
                                    subLangs,
                                    preferredAudio,
                                    preferredSubs);

                                if (score > bestLanguageScore)
                                {
                                    bestLanguageScore = score;
                                    bestAudioLangs = audioLangs;
                                    bestSubLangs = subLangs;
                                }
                            }
                        }
                    }
                    else
                    {
                        // Fallback: use default English language data
                        _logger.LogDebug("No streaming details available for {ContentId}, using fallback", contentId);
                        bestAudioLangs = new List<string> { "en" };
                        bestSubLangs = new List<string> { "en" };
                        bestLanguageScore = CalculateLanguageScore(bestAudioLangs, bestSubLangs, preferredAudio, preferredSubs);
                    }

                    provider.LanguageCompatibilityScore = bestLanguageScore;
                    provider.AudioLanguages = bestAudioLangs;
                    provider.SubtitleLanguages = bestSubLangs;
                    provider.LanguageMatchQuality = GetLanguageMatchQuality(bestLanguageScore);
                    provider.LanguageWarnings = GetLanguageAvailabilityWarnings(
                        bestAudioLangs,
                        bestSubLangs,
                        preferredAudio,
                        preferredSubs);
                }
            }

            // Reorder by combined score
            var rankedRecommendations = recommendations
                .Select(r => new
                {
                    Recommendation = r,
                    CombinedScore = r.RecommendedProviders.Any()
                        ? r.RecommendedProviders.Average(p =>
                            (p.LanguageCompatibilityScore * 0.5) + ((p.OverallRating ?? 0) / 5.0 * 0.5))
                        : 0.0
                })
                .OrderByDescending(x => x.CombinedScore)
                .Select(x => x.Recommendation)
                .ToList();

            return rankedRecommendations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ranking VPN recommendations by language for content {ContentId}", contentId);
            return recommendations;
        }
    }

    /// <summary>
    /// Gets content-specific VPN recommendations with language compatibility analysis
    /// </summary>
    public async Task<ContentVpnRecommendationDto?> GetContentVpnRecommendationsAsync(
        string contentId,
        List<string>? audioLanguages,
        List<string>? subtitleLanguages,
        string? contentType,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Getting content VPN recommendations for {ContentId}", contentId);

            var preferredAudio = audioLanguages ?? new List<string>();
            var preferredSubs = subtitleLanguages ?? new List<string>();

            // Fetch real streaming details from API
            ShowStreamingDetails? streamingDetails = null;
            var countryLanguageData = new Dictionary<string, CountryLanguageAvailability>();

            try
            {
                streamingDetails = await _streamingClient.GetShowDetailsAsync(
                    contentId,
                    userServiceIds: null,
                    userCountry: null,
                    cancellationToken);

                _logger.LogInformation("Retrieved streaming details for {ContentId}: {Title} available in {CountryCount} countries",
                    contentId, streamingDetails?.Title ?? "Unknown", streamingDetails?.TotalCountries ?? 0);

                // Build country language availability from real API data
                if (streamingDetails?.AvailabilityByCountry != null)
                {
                    foreach (var (countryCode, countryInfo) in streamingDetails.AvailabilityByCountry)
                    {
                        // Extract all unique languages from all services in this country
                        var audioLangs = countryInfo.Services
                            .SelectMany(s => s.AudioLanguages)
                            .Distinct()
                            .ToList();

                        var subLangs = countryInfo.Services
                            .SelectMany(s => s.SubtitleLanguages)
                            .Distinct()
                            .ToList();

                        // Calculate language score for this country
                        var languageScore = CalculateLanguageScore(
                            audioLangs,
                            subLangs,
                            preferredAudio,
                            preferredSubs);

                        countryLanguageData[countryCode.ToUpper()] = new CountryLanguageAvailability
                        {
                            CountryCode = countryCode.ToUpper(),
                            CountryName = countryInfo.CountryName,
                            AudioLanguages = audioLangs,
                            SubtitleLanguages = subLangs,
                            LanguageScore = languageScore,
                            IsRecommended = languageScore >= 0.7 // Recommend countries with 70%+ language match
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch streaming details for {ContentId}, using fallback data", contentId);

                // Fallback to default English-speaking countries
                countryLanguageData = new Dictionary<string, CountryLanguageAvailability>
                {
                    ["US"] = new() { CountryCode = "US", CountryName = "United States", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" }, LanguageScore = 0.8, IsRecommended = true },
                    ["GB"] = new() { CountryCode = "GB", CountryName = "United Kingdom", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" }, LanguageScore = 0.8, IsRecommended = true }
                };
            }

            // Get top VPN providers with streaming support
            var providers = await _context.VpnProviders
                .Include(p => p.ServerLocations)
                .Where(p => p.IsActive && p.SupportsStreaming)
                .OrderByDescending(p => p.OverallRating)
                .Take(10) // Get more providers to match with countries
                .ToListAsync(cancellationToken);

            // Get countries where content has best language availability
            var topLanguageCountries = countryLanguageData
                .Where(kvp => kvp.Value.IsRecommended)
                .OrderByDescending(kvp => kvp.Value.LanguageScore)
                .Select(kvp => kvp.Key.ToLower())
                .ToList();

            // Score and filter VPN providers based on server presence in high-scoring countries
            var recommendations = new List<VpnProviderDto>();

            foreach (var provider in providers)
            {
                var providerServerCountries = await _context.VpnServerLocations
                    .Where(sl => sl.VpnProviderId == provider.Id)
                    .Select(sl => sl.CountryCode.ToLower())
                    .Distinct()
                    .ToListAsync(cancellationToken);

                // Find best language match among countries where provider has servers
                var bestLanguageScore = 0.0;
                var bestAudioLangs = new List<string>();
                var bestSubLangs = new List<string>();
                var matchedCountries = new List<string>();

                foreach (var countryCode in providerServerCountries)
                {
                    if (countryLanguageData.TryGetValue(countryCode.ToUpper(), out var countryData))
                    {
                        if (countryData.LanguageScore > bestLanguageScore)
                        {
                            bestLanguageScore = countryData.LanguageScore;
                            bestAudioLangs = countryData.AudioLanguages;
                            bestSubLangs = countryData.SubtitleLanguages;
                        }

                        if (countryData.IsRecommended)
                        {
                            matchedCountries.Add(countryCode);
                        }
                    }
                }

                // Only recommend providers that have servers in countries with good language availability
                if (bestLanguageScore >= 0.5 || matchedCountries.Any())
                {
                    recommendations.Add(new VpnProviderDto
                    {
                        Id = provider.Id,
                        Name = provider.Name,
                        Description = provider.Description,
                        WebsiteUrl = provider.WebsiteUrl,
                        AffiliateUrl = provider.AffiliateUrl,
                        LogoUrl = provider.LogoUrl,
                        MonthlyPrice = provider.MonthlyPrice,
                        AnnualPrice = provider.AnnualPrice,
                        HasFreeTrial = provider.HasFreeTrial,
                        FreeTrialDays = provider.FreeTrialDays,
                        ServerCount = provider.ServerCount,
                        CountryCount = provider.CountryCount,
                        SupportsStreaming = provider.SupportsStreaming,
                        OverallRating = provider.OverallRating,
                        LanguageCompatibilityScore = bestLanguageScore,
                        AudioLanguages = bestAudioLangs.Any() ? bestAudioLangs : new List<string> { "en" },
                        SubtitleLanguages = bestSubLangs.Any() ? bestSubLangs : new List<string> { "en" },
                        LanguageMatchQuality = GetLanguageMatchQuality(bestLanguageScore),
                        LanguageWarnings = GetLanguageAvailabilityWarnings(
                            bestAudioLangs,
                            bestSubLangs,
                            preferredAudio,
                            preferredSubs)
                    });
                }
            }

            // Sort by combined score: language compatibility (60%) + VPN rating (40%)
            recommendations = recommendations
                .OrderByDescending(p => (p.LanguageCompatibilityScore * 0.6) + ((p.OverallRating ?? 0) / 5.0 * 0.4))
                .Take(5)
                .ToList();

            var confidenceScore = CalculateConfidenceScore(recommendations, streamingDetails);

            return new ContentVpnRecommendationDto
            {
                ContentId = contentId,
                ContentTitle = streamingDetails?.Title ?? $"Content {contentId}",
                RecommendedProviders = recommendations,
                CountryAvailability = countryLanguageData,
                RecommendationReason = GetRecommendationReason(recommendations, preferredAudio, preferredSubs),
                RecommendationType = VpnRecommendationType.BestForStreaming,
                ConfidenceScore = confidenceScore,
                Criteria = new Dictionary<string, object>
                {
                    ["languageAware"] = true,
                    ["preferredAudioLanguages"] = preferredAudio,
                    ["preferredSubtitleLanguages"] = preferredSubs,
                    ["totalCountriesAnalyzed"] = countryLanguageData.Count,
                    ["recommendedCountries"] = countryLanguageData.Count(kvp => kvp.Value.IsRecommended),
                    ["dataSource"] = streamingDetails != null ? "real_api" : "fallback"
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting content VPN recommendations for {ContentId}", contentId);
            return null;
        }
    }

    /// <summary>
    /// Generates user-friendly warnings about language availability
    /// </summary>
    public List<string> GetLanguageAvailabilityWarnings(
        List<string> availableAudio,
        List<string> availableSubs,
        List<string> preferredAudio,
        List<string> preferredSubs)
    {
        var warnings = new List<string>();

        try
        {
            // Check audio availability
            if (preferredAudio.Any())
            {
                var hasPreferredAudio = preferredAudio.Any(pa =>
                    availableAudio.Any(aa => aa.Equals(pa, StringComparison.OrdinalIgnoreCase)));

                if (!hasPreferredAudio)
                {
                    var hasOriginalAudio = availableAudio.Any(aa =>
                        aa.Equals("original", StringComparison.OrdinalIgnoreCase) ||
                        aa.Equals("en", StringComparison.OrdinalIgnoreCase));

                    if (hasOriginalAudio)
                    {
                        warnings.Add("Your preferred audio language is not available. Original audio only.");
                    }
                    else
                    {
                        warnings.Add($"Your preferred audio language ({string.Join(", ", preferredAudio)}) is not available.");
                    }
                }
            }

            // Check subtitle availability
            if (preferredSubs.Any())
            {
                var hasPreferredSubs = preferredSubs.Any(ps =>
                    availableSubs.Any(as_ => as_.Equals(ps, StringComparison.OrdinalIgnoreCase)));

                if (!hasPreferredSubs)
                {
                    var hasEnglishSubs = availableSubs.Any(s =>
                        s.Equals("en", StringComparison.OrdinalIgnoreCase) ||
                        s.Equals("english", StringComparison.OrdinalIgnoreCase));

                    if (hasEnglishSubs)
                    {
                        warnings.Add("Your preferred subtitles are not available. English subtitles available as fallback.");
                    }
                    else if (availableSubs.Any())
                    {
                        warnings.Add($"Your preferred subtitles are not available. Available: {string.Join(", ", availableSubs)}");
                    }
                    else
                    {
                        warnings.Add("No subtitles available in your preferred language.");
                    }
                }
            }

            // Warning if no audio or subtitles available at all
            if (!availableAudio.Any() && !availableSubs.Any())
            {
                warnings.Add("No language information available for this content in this region.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating language availability warnings");
        }

        return warnings;
    }

    #region Private Helper Methods

    /// <summary>
    /// Calculates audio match score: Perfect=1.0, Partial=0.5, Original only=0.3, None=0.0
    /// </summary>
    private double CalculateAudioMatchScore(List<string> availableAudio, List<string> preferredAudio)
    {
        if (!preferredAudio.Any()) return 1.0; // No preference = perfect match
        if (!availableAudio.Any()) return 0.0; // No audio data

        // Perfect match: preferred audio language is available
        var hasPerfectMatch = preferredAudio.Any(pa =>
            availableAudio.Any(aa => aa.Equals(pa, StringComparison.OrdinalIgnoreCase)));

        if (hasPerfectMatch) return 1.0;

        // Partial match: multiple audio tracks available (might include preferred)
        if (availableAudio.Count > 1) return 0.5;

        // Original only: only original audio available
        var hasOriginalAudio = availableAudio.Any(aa =>
            aa.Equals("original", StringComparison.OrdinalIgnoreCase) ||
            aa.Equals("en", StringComparison.OrdinalIgnoreCase));

        if (hasOriginalAudio) return 0.3;

        return 0.0;
    }

    /// <summary>
    /// Calculates subtitle match score: All=1.0, Some=0.6, English fallback=0.3, None=0.0
    /// </summary>
    private double CalculateSubtitleMatchScore(List<string> availableSubs, List<string> preferredSubs)
    {
        if (!preferredSubs.Any()) return 1.0; // No preference = perfect match
        if (!availableSubs.Any()) return 0.0; // No subtitles

        // All preferred subtitles available
        var allAvailable = preferredSubs.All(ps =>
            availableSubs.Any(as_ => as_.Equals(ps, StringComparison.OrdinalIgnoreCase)));

        if (allAvailable) return 1.0;

        // Some preferred subtitles available
        var someAvailable = preferredSubs.Any(ps =>
            availableSubs.Any(as_ => as_.Equals(ps, StringComparison.OrdinalIgnoreCase)));

        if (someAvailable) return 0.6;

        // English fallback available
        var hasEnglishSubs = availableSubs.Any(s =>
            s.Equals("en", StringComparison.OrdinalIgnoreCase) ||
            s.Equals("english", StringComparison.OrdinalIgnoreCase));

        if (hasEnglishSubs) return 0.3;

        return 0.0;
    }

    /// <summary>
    /// Maps language score to quality label
    /// </summary>
    private string GetLanguageMatchQuality(double score)
    {
        return score switch
        {
            >= 0.9 => "Perfect",
            >= 0.7 => "Good",
            >= 0.4 => "Partial",
            _ => "Limited"
        };
    }

    /// <summary>
    /// Calculates confidence score based on data availability and quality
    /// </summary>
    private double CalculateConfidenceScore(List<VpnProviderDto> recommendations, ShowStreamingDetails? streamingDetails)
    {
        if (!recommendations.Any())
            return 0.0;

        double confidence = 0.5; // Base confidence

        // Increase confidence if we have real streaming data
        if (streamingDetails != null && streamingDetails.TotalCountries > 0)
        {
            confidence += 0.2;

            // More countries = higher confidence
            if (streamingDetails.TotalCountries >= 10)
                confidence += 0.1;

            // Language data availability
            var countriesWithLanguages = streamingDetails.AvailabilityByCountry
                .Count(kvp => kvp.Value.Services.Any(s => s.AudioLanguages.Any() || s.SubtitleLanguages.Any()));

            if (countriesWithLanguages > 0)
                confidence += 0.1;
        }

        // Quality of recommendations
        var avgLanguageScore = recommendations.Average(r => r.LanguageCompatibilityScore);
        if (avgLanguageScore >= 0.8)
            confidence += 0.1;

        return Math.Min(confidence, 1.0);
    }

    /// <summary>
    /// Generates human-readable recommendation reason
    /// </summary>
    private string GetRecommendationReason(List<VpnProviderDto> recommendations, List<string> preferredAudio, List<string> preferredSubs)
    {
        if (!recommendations.Any())
            return "No VPN providers found with suitable language availability";

        var avgScore = recommendations.Average(r => r.LanguageCompatibilityScore);
        var hasPreferences = preferredAudio.Any() || preferredSubs.Any();

        if (!hasPreferences)
            return "Top VPN providers for streaming this content";

        return avgScore switch
        {
            >= 0.9 => "Excellent language match! These VPNs provide perfect access to your preferred audio and subtitles.",
            >= 0.7 => "Good language match! These VPNs offer your preferred audio or subtitle options.",
            >= 0.5 => "Partial language match. Some of your language preferences are available with these VPNs.",
            _ => "Limited language match. Your preferred languages may not be fully available, but these VPNs provide the best available options."
        };
    }

    /// <summary>
    /// Gets country recommendations for content with VPN providers as secondary information
    /// NEW: Country-first approach that prioritizes countries by language availability
    /// </summary>
    public async Task<ContentCountryRecommendationsDto?> GetCountryRecommendationsForContentAsync(
        string contentId,
        List<string>? audioLanguages,
        List<string>? subtitleLanguages,
        string? streamingService = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Getting country recommendations for content {ContentId} (country-first approach)", contentId);

            var preferredAudio = audioLanguages ?? new List<string>();
            var preferredSubs = subtitleLanguages ?? new List<string>();

            // Fetch streaming details from API
            ShowStreamingDetails? streamingDetails = null;
            bool usedFallbackData = false;
            try
            {
                streamingDetails = await _streamingClient.GetShowDetailsAsync(
                    contentId,
                    userServiceIds: null,
                    userCountry: null,
                    cancellationToken);

                _logger.LogInformation("Retrieved streaming details: {Title} in {CountryCount} countries",
                    streamingDetails?.Title ?? "Unknown", streamingDetails?.TotalCountries ?? 0);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch streaming details for {ContentId}, will use fallback VPN-only recommendations", contentId);
                usedFallbackData = true;
                // Generate fallback recommendations without streaming availability data
                streamingDetails = GenerateFallbackStreamingDetails(contentId);
            }

            if (streamingDetails?.AvailabilityByCountry == null || !streamingDetails.AvailabilityByCountry.Any())
            {
                _logger.LogWarning("No country availability data for content {ContentId}, using fallback", contentId);
                usedFallbackData = true;
                streamingDetails = GenerateFallbackStreamingDetails(contentId);
            }

            // Get all active VPN providers with their server locations
            var vpnProviders = await _context.VpnProviders
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => p.IsActive && p.SupportsStreaming)
                .ToListAsync(cancellationToken);

            // Build country recommendations
            var countryRecommendations = new List<CountryRecommendationDto>();

            foreach (var (countryCode, countryInfo) in streamingDetails.AvailabilityByCountry)
            {
                // Extract languages from all services in this country
                var audioLangs = countryInfo.Services
                    .SelectMany(s => s.AudioLanguages)
                    .Distinct()
                    .ToList();

                var subLangs = countryInfo.Services
                    .SelectMany(s => s.SubtitleLanguages)
                    .Distinct()
                    .ToList();

                // Calculate language score
                var languageScore = CalculateLanguageScore(audioLangs, subLangs, preferredAudio, preferredSubs);
                var matchQuality = GetLanguageMatchQuality(languageScore);

                // Generate language highlights
                var highlights = GenerateLanguageHighlights(audioLangs, subLangs, preferredAudio, preferredSubs);

                // Find VPN providers with servers in this country
                var vpnProvidersForCountry = vpnProviders
                    .Where(p => p.ServerLocations.Any(sl =>
                        sl.CountryCode.Equals(countryCode, StringComparison.OrdinalIgnoreCase)))
                    .Select(p => new
                    {
                        Provider = p,
                        ServerCount = p.ServerLocations
                            .Where(sl => sl.CountryCode.Equals(countryCode, StringComparison.OrdinalIgnoreCase))
                            .Sum(sl => sl.ServerCount)
                    })
                    .ToList();

                // Get streaming services for this country
                var streamingServices = countryInfo.Services
                    .Select(s => s.ServiceName)
                    .Distinct()
                    .ToList();

                var vpnSummaries = vpnProvidersForCountry
                    .Select(vp => new VpnProviderSummary
                    {
                        Id = vp.Provider.Id,
                        Name = vp.Provider.Name,
                        LogoUrl = vp.Provider.LogoUrl,
                        ServerCountInCountry = vp.ServerCount,
                        OverallRating = vp.Provider.OverallRating,
                        MonthlyPrice = vp.Provider.MonthlyPrice,
                        AffiliateUrl = vp.Provider.AffiliateUrl,
                        WorksWithNetflix = vp.Provider.StreamingCompatibilities
                            .Any(sc => sc.StreamingService.Name.Contains("Netflix", StringComparison.OrdinalIgnoreCase)
                                && sc.Status == VpnStreamingStatus.WorksReliably),
                        WorksWithPrimeVideo = vp.Provider.StreamingCompatibilities
                            .Any(sc => sc.StreamingService.Name.Contains("Prime", StringComparison.OrdinalIgnoreCase)
                                && sc.Status == VpnStreamingStatus.WorksReliably),
                        WorksWithDisneyPlus = vp.Provider.StreamingCompatibilities
                            .Any(sc => sc.StreamingService.Name.Contains("Disney", StringComparison.OrdinalIgnoreCase)
                                && sc.Status == VpnStreamingStatus.WorksReliably)
                    })
                    .OrderByDescending(v => v.OverallRating)
                    .ThenBy(v => v.MonthlyPrice)
                    .ToList();

                countryRecommendations.Add(new CountryRecommendationDto
                {
                    CountryCode = countryCode.ToUpper(),
                    CountryName = countryInfo.CountryName,
                    CountryFlag = Utilities.CountryFlagHelper.GetFlag(countryCode),
                    AudioLanguages = audioLangs,
                    SubtitleLanguages = subLangs,
                    LanguageScore = languageScore,
                    LanguageMatchQuality = matchQuality,
                    LanguageHighlights = highlights,
                    AvailableVpnProviders = vpnSummaries,
                    StreamingServices = streamingServices,
                    Rank = 0 // Will be set after sorting
                });
            }

            // Sort countries by combined score: Language (70%) + VPN availability (20%) + Service count (10%)
            countryRecommendations = countryRecommendations
                .OrderByDescending(c =>
                    (c.LanguageScore * 0.7) +
                    (Math.Min(c.AvailableVpnProviders.Count / 5.0, 1.0) * 0.2) +
                    (Math.Min(c.StreamingServices.Count / 3.0, 1.0) * 0.1))
                .ToList();

            // Assign ranks
            for (int i = 0; i < countryRecommendations.Count; i++)
            {
                countryRecommendations[i].Rank = i + 1;
            }

            var perfectMatchCount = countryRecommendations.Count(c => c.LanguageScore >= 0.9);
            var goodMatchCount = countryRecommendations.Count(c => c.LanguageScore >= 0.7 && c.LanguageScore < 0.9);

            var confidenceScore = CalculateCountryRecommendationConfidence(
                countryRecommendations,
                streamingDetails,
                vpnProviders.Count);

            return new ContentCountryRecommendationsDto
            {
                ContentId = contentId,
                ContentTitle = streamingDetails.Title ?? $"Content {contentId}",
                UserAudioLanguages = preferredAudio,
                UserSubtitleLanguages = preferredSubs,
                Countries = countryRecommendations.Take(15).ToList(), // Bug 10 fix: renamed to match frontend
                TotalCountriesAnalyzed = countryRecommendations.Count,
                CountriesWithPerfectMatch = perfectMatchCount,
                CountriesWithGoodMatch = goodMatchCount,
                ConfidenceScore = confidenceScore,
                DataSource = "real_api",
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting country recommendations for content {ContentId}", contentId);
            return null;
        }
    }

    /// <summary>
    /// Generates language highlights for a country
    /// </summary>
    private List<string> GenerateLanguageHighlights(
        List<string> audioLangs,
        List<string> subLangs,
        List<string> preferredAudio,
        List<string> preferredSubs)
    {
        var highlights = new List<string>();

        // Check audio match
        if (preferredAudio.Any())
        {
            var matchedAudio = preferredAudio.Where(pa =>
                audioLangs.Any(al => al.Equals(pa, StringComparison.OrdinalIgnoreCase))).ToList();

            if (matchedAudio.Any())
            {
                highlights.Add($"Audio available: {string.Join(", ", matchedAudio)}");
            }
        }
        else if (audioLangs.Any())
        {
            highlights.Add($"{audioLangs.Count} audio language{(audioLangs.Count > 1 ? "s" : "")} available");
        }

        // Check subtitle match
        if (preferredSubs.Any())
        {
            var matchedSubs = preferredSubs.Where(ps =>
                subLangs.Any(sl => sl.Equals(ps, StringComparison.OrdinalIgnoreCase))).ToList();

            if (matchedSubs.Any())
            {
                highlights.Add($"Subtitles available: {string.Join(", ", matchedSubs)}");
            }
        }
        else if (subLangs.Any())
        {
            highlights.Add($"{subLangs.Count} subtitle language{(subLangs.Count > 1 ? "s" : "")} available");
        }

        return highlights;
    }

    /// <summary>
    /// Calculates confidence score for country recommendations
    /// </summary>
    private double CalculateCountryRecommendationConfidence(
        List<CountryRecommendationDto> countries,
        ShowStreamingDetails streamingDetails,
        int totalVpnProviders)
    {
        double confidence = 0.5; // Base confidence

        // More countries = higher confidence
        if (countries.Count >= 10)
            confidence += 0.15;
        else if (countries.Count >= 5)
            confidence += 0.1;

        // Language data quality
        var countriesWithLanguages = countries.Count(c => c.AudioLanguages.Any() || c.SubtitleLanguages.Any());
        if (countriesWithLanguages > 0)
            confidence += 0.1;

        // VPN coverage
        var avgVpnCount = countries.Any() ? countries.Average(c => c.AvailableVpnProviders.Count) : 0;
        if (avgVpnCount >= 3)
            confidence += 0.15;
        else if (avgVpnCount >= 1)
            confidence += 0.1;

        // High language match quality
        var highQualityMatches = countries.Count(c => c.LanguageScore >= 0.8);
        if (highQualityMatches > 0)
            confidence += 0.1;

        return Math.Min(confidence, 1.0);
    }

    /// <summary>
    /// Generates fallback streaming details when the external API is unavailable
    /// This provides a degraded but functional experience showing VPN providers
    /// for common streaming countries without specific availability data
    /// </summary>
    private ShowStreamingDetails GenerateFallbackStreamingDetails(string contentId)
    {
        _logger.LogInformation("Generating fallback streaming details for content {ContentId}", contentId);

        // Common streaming countries with major services (fallback data)
        var fallbackCountries = new Dictionary<string, CountryStreamingInfo>
        {
            ["us"] = new CountryStreamingInfo
            {
                CountryName = "United States",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en", "es" } },
                    new() { ServiceId = "prime", ServiceName = "Amazon Prime Video", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" } },
                    new() { ServiceId = "disney", ServiceName = "Disney+", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" } }
                }
            },
            ["gb"] = new CountryStreamingInfo
            {
                CountryName = "United Kingdom",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" } },
                    new() { ServiceId = "prime", ServiceName = "Amazon Prime Video", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" } }
                }
            },
            ["ca"] = new CountryStreamingInfo
            {
                CountryName = "Canada",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "en", "fr" }, SubtitleLanguages = new List<string> { "en", "fr" } },
                    new() { ServiceId = "prime", ServiceName = "Amazon Prime Video", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en", "fr" } }
                }
            },
            ["de"] = new CountryStreamingInfo
            {
                CountryName = "Germany",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "de", "en" }, SubtitleLanguages = new List<string> { "de", "en" } },
                    new() { ServiceId = "prime", ServiceName = "Amazon Prime Video", AudioLanguages = new List<string> { "de" }, SubtitleLanguages = new List<string> { "de" } }
                }
            },
            ["fr"] = new CountryStreamingInfo
            {
                CountryName = "France",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "fr", "en" }, SubtitleLanguages = new List<string> { "fr", "en" } }
                }
            },
            ["au"] = new CountryStreamingInfo
            {
                CountryName = "Australia",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" } },
                    new() { ServiceId = "stan", ServiceName = "Stan", AudioLanguages = new List<string> { "en" }, SubtitleLanguages = new List<string> { "en" } }
                }
            },
            ["jp"] = new CountryStreamingInfo
            {
                CountryName = "Japan",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "ja", "en" }, SubtitleLanguages = new List<string> { "ja", "en" } }
                }
            },
            ["es"] = new CountryStreamingInfo
            {
                CountryName = "Spain",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "es", "en" }, SubtitleLanguages = new List<string> { "es", "en" } }
                }
            },
            ["mx"] = new CountryStreamingInfo
            {
                CountryName = "Mexico",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "es" }, SubtitleLanguages = new List<string> { "es", "en" } }
                }
            },
            ["br"] = new CountryStreamingInfo
            {
                CountryName = "Brazil",
                Services = new List<ServiceAvailability>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix", AudioLanguages = new List<string> { "pt" }, SubtitleLanguages = new List<string> { "pt", "en" } }
                }
            }
        };

        return new ShowStreamingDetails
        {
            Id = contentId,
            Title = "Content",
            TotalCountries = fallbackCountries.Count,
            AvailabilityByCountry = fallbackCountries
        };
    }

    #endregion
}
