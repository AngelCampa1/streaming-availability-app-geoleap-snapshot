using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Endpoints;

/// <summary>
/// US-9.1 VPN Guidance System - Minimal API Endpoints
/// Provides public endpoints for VPN guidance, community ratings, and streaming deep links
/// </summary>
public static class VpnGuidanceEndpoints
{
    public static void MapVpnGuidanceEndpoints(this WebApplication app)
    {
        var vpnGroup = app.MapGroup("/api/vpn");
        var communityGroup = app.MapGroup("/api/community");
        var streamingGroup = app.MapGroup("/api/streaming");
        var legalGroup = app.MapGroup("/api/legal");
        var affiliateGroup = app.MapGroup("/api/affiliate");

        // VPN Provider Endpoints
        vpnGroup.MapGet("/providers", async (
            [FromServices] IVpnProviderService vpnProviderService,
            [FromQuery] bool? featured = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] bool? supportsStreaming = null,
            [FromQuery] string? streamingService = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            try
            {
                var providers = await vpnProviderService.GetProvidersAsync(
                    featured, maxPrice, supportsStreaming, streamingService, page, pageSize);
                return Results.Ok(providers);
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        vpnGroup.MapGet("/providers/recommendations", async (
            [FromServices] IVpnRecommendationService recommendationService,
            [FromQuery] string? region = null,
            [FromQuery] bool streamingOptimized = false,
            [FromQuery] string? budget = null) =>
        {
            try
            {
                var recommendations = await recommendationService.GetRecommendationsAsync(
                    Guid.Empty, VpnRecommendationType.BestOverall, null, null, null);
                return Results.Ok(recommendations);
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        vpnGroup.MapGet("/providers/comparison", async (
            [FromServices] IVpnProviderService vpnProviderService,
            [FromQuery] string? providerIds = null) =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(providerIds))
                {
                    return Results.BadRequest("At least 2 provider IDs required");
                }

                // Parse comma-separated GUIDs
                var ids = providerIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(id => Guid.TryParse(id.Trim(), out var guid) ? guid : Guid.Empty)
                    .Where(id => id != Guid.Empty)
                    .ToList();

                if (ids.Count < 2)
                {
                    return Results.BadRequest("At least 2 valid provider IDs required");
                }

                var comparison = await vpnProviderService.CompareProvidersAsync(
                    ids, true, true, true, false);
                return Results.Ok(comparison);
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        vpnGroup.MapPost("/providers/rate", (
            [FromServices] IVpnProviderService vpnProviderService,
            [FromBody] object ratingData) =>
        {
            try
            {
                return Results.Accepted();
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        // Community Rating Endpoints
        communityGroup.MapGet("/ratings", () =>
        {
            try
            {
                return Results.Ok(new List<object>());
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        communityGroup.MapGet("/reviews", () =>
        {
            try
            {
                return Results.Ok(new List<object>());
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        communityGroup.MapGet("/ratings/trending", () =>
        {
            try
            {
                return Results.Ok(new List<object>());
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        communityGroup.MapPost("/ratings", ([FromBody] object ratingData) =>
        {
            try
            {
                return Results.Accepted();
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        communityGroup.MapGet("/ratings/aggregate", (
            [FromQuery] string? provider = null,
            [FromQuery] string? service = null) =>
        {
            try
            {
                return Results.Ok(new { provider, service, averageRating = 0, totalRatings = 0 });
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        // Streaming Deep Link Endpoints
        streamingGroup.MapGet("/deeplinks/{service}", (string service) =>
        {
            try
            {
                return Results.Ok(new { service, links = new List<object>() });
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        streamingGroup.MapPost("/deeplinks/generate", ([FromBody] object linkRequest) =>
        {
            try
            {
                return Results.Accepted();
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        streamingGroup.MapPost("/deeplinks/track", (
            [FromServices] IStreamingDeepLinkService? deepLinkService,
            [FromBody] object trackingData) =>
        {
            try
            {
                if (deepLinkService != null)
                {
                    // Future implementation
                }
                return Results.Accepted();
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        // Legal Disclaimer Endpoints
        legalGroup.MapGet("/disclaimers", () =>
        {
            try
            {
                return Results.Ok(new List<object>());
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        legalGroup.MapGet("/disclaimers/{type}", (string type) =>
        {
            try
            {
                return Results.Ok(new { type, content = "Legal disclaimer content" });
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).AllowAnonymous();

        legalGroup.MapPut("/disclaimers/{type}", (
            string type,
            [FromBody] object disclaimerUpdate) =>
        {
            try
            {
                return Results.Accepted();
            }
            catch
            {
                return Results.StatusCode(501); // Not Implemented
            }
        }).RequireAuthorization("AdminOnly");

        // Affiliate Endpoints - Real Implementation
        affiliateGroup.MapGet("/recommend", async (
            [FromServices] IAffiliateService affiliateService,
            [FromQuery] string? countryCode = null,
            [FromQuery] string? streamingService = null,
            [FromQuery] string? contentId = null,
            CancellationToken ct = default) =>
        {
            var partners = await affiliateService.GetActivePartnersForContextAsync(countryCode, streamingService, ct);
            var dtos = partners.Select(p => new AffiliatePartnerDto
            {
                Id = p.Id,
                Name = p.Name,
                LogoUrl = p.LogoUrl,
                AffiliateUrlTemplate = string.Empty, // Don't expose template structure publicly
                Priority = p.Priority,
                IsActive = p.IsActive,
                CommissionRate = p.CommissionRate,
                CommissionType = p.CommissionType,
                VpnProviderId = p.VpnProviderId,
                CreatedAt = p.CreatedAt
            }).ToList();

            return Results.Ok(new AffiliateRecommendationResponse
            {
                Partners = dtos,
                CountryCode = countryCode,
                StreamingService = streamingService,
                ContentId = contentId
            });
        }).AllowAnonymous();

        affiliateGroup.MapPost("/click", async (
            [FromServices] IAffiliateService affiliateService,
            [FromBody] AffiliateClickRequest clickRequest,
            HttpContext httpContext,
            CancellationToken ct = default) =>
        {
            var userId = httpContext.User.Identity?.IsAuthenticated == true
                ? Guid.TryParse(httpContext.User.FindFirst("sub")?.Value ?? httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : (Guid?)null
                : null;

            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var ua = httpContext.Request.Headers.UserAgent.ToString();
            var referrer = httpContext.Request.Headers.Referer.ToString();

            // Fire and forget - don't await
            _ = affiliateService.TrackClickAsync(clickRequest, userId, ip, ua, referrer, CancellationToken.None);

            // Generate and return the affiliate URL
            try
            {
                var url = await affiliateService.GenerateAffiliateUrlAsync(clickRequest.PartnerId, null, ct);
                return Results.Ok(new { url });
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        }).AllowAnonymous();

        affiliateGroup.MapPost("/conversion-postback", async (
            [FromServices] IAffiliateService affiliateService,
            [FromServices] IConfiguration configuration,
            [FromBody] AffiliateConversionRequest conversionRequest,
            HttpContext httpContext,
            CancellationToken ct = default) =>
        {
            // Validate API key against configured secret
            var apiKey = httpContext.Request.Headers["X-Affiliate-Api-Key"].ToString();
            var configuredSecret = configuration["Affiliate:PostbackSecret"] ?? string.Empty;

            if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(configuredSecret))
                return Results.Unauthorized();

            // Constant-time comparison to prevent timing attacks
            var keyBytes = System.Text.Encoding.UTF8.GetBytes(apiKey);
            var secretBytes = System.Text.Encoding.UTF8.GetBytes(configuredSecret);
            if (!System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(keyBytes, secretBytes))
                return Results.Unauthorized();

            await affiliateService.RecordConversionAsync(conversionRequest, ct);
            return Results.Ok(new { success = true });
        });

        affiliateGroup.MapGet("/links", async (
            [FromServices] IAffiliateService affiliateService,
            CancellationToken ct = default) =>
        {
            var partners = await affiliateService.GetActivePartnersForContextAsync(null, null, ct);
            return Results.Ok(partners);
        }).AllowAnonymous();

        affiliateGroup.MapGet("/performance", async (
            [FromServices] IAffiliateService affiliateService,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            CancellationToken ct = default) =>
        {
            var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
            var toDate = to ?? DateTime.UtcNow;
            var dashboard = await affiliateService.GetDashboardAsync(fromDate, toDate, ct);
            return Results.Ok(dashboard);
        }).RequireAuthorization();

        affiliateGroup.MapGet("/commission", async (
            [FromServices] IAffiliateService affiliateService,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            CancellationToken ct = default) =>
        {
            var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
            var toDate = to ?? DateTime.UtcNow;
            var dashboard = await affiliateService.GetDashboardAsync(fromDate, toDate, ct);
            return Results.Ok(new
            {
                totalCommission = dashboard.TotalCommission,
                pendingCommission = 0m,
                totalRevenue = dashboard.TotalRevenue
            });
        }).RequireAuthorization();
    }
}
