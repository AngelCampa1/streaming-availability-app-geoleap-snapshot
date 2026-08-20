using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Endpoints;

public static class AffiliateAdminEndpoints
{
    public static void MapAffiliateAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin/affiliates")
            .RequireAuthorization("Admin");

        // GET / - List all partners (pagination)
        group.MapGet("/", async (
            IAffiliateService affiliateService,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool? activeOnly = null,
            CancellationToken ct = default) =>
        {
            var partners = await affiliateService.GetAllPartnersAsync(page, pageSize, activeOnly, ct);
            return Results.Ok(partners);
        });

        // GET /dashboard
        group.MapGet("/dashboard", async (
            IAffiliateService affiliateService,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            CancellationToken ct = default) =>
        {
            var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
            var toDate = to ?? DateTime.UtcNow;
            var dashboard = await affiliateService.GetDashboardAsync(fromDate, toDate, ct);
            return Results.Ok(dashboard);
        });

        // GET /{id}
        group.MapGet("/{id:guid}", async (
            Guid id,
            IAffiliateService affiliateService,
            CancellationToken ct = default) =>
        {
            var partner = await affiliateService.GetPartnerByIdAsync(id, ct);
            return partner is null ? Results.NotFound() : Results.Ok(partner);
        });

        // GET /{id}/analytics
        group.MapGet("/{id:guid}/analytics", async (
            Guid id,
            IAffiliateService affiliateService,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            CancellationToken ct = default) =>
        {
            try
            {
                var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
                var toDate = to ?? DateTime.UtcNow;
                var analytics = await affiliateService.GetPartnerAnalyticsAsync(id, fromDate, toDate, ct);
                return Results.Ok(analytics);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        // POST / - Create partner
        group.MapPost("/", async (
            [FromBody] CreateAffiliatePartnerRequest request,
            IAffiliateService affiliateService,
            CancellationToken ct = default) =>
        {
            var partner = await affiliateService.CreatePartnerAsync(request, ct);
            return Results.Created($"/api/admin/affiliates/{partner.Id}", partner);
        });

        // PUT /{id} - Update partner
        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateAffiliatePartnerRequest request,
            IAffiliateService affiliateService,
            CancellationToken ct = default) =>
        {
            try
            {
                var partner = await affiliateService.UpdatePartnerAsync(id, request, ct);
                return Results.Ok(partner);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        // DELETE /{id} - Soft delete
        group.MapDelete("/{id:guid}", async (
            Guid id,
            IAffiliateService affiliateService,
            CancellationToken ct = default) =>
        {
            var deleted = await affiliateService.DeletePartnerAsync(id, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        // PATCH /{id}/toggle - Toggle active status
        group.MapMethods("/{id:guid}/toggle", ["PATCH"], async (
            Guid id,
            IAffiliateService affiliateService,
            CancellationToken ct = default) =>
        {
            var isActive = await affiliateService.TogglePartnerActiveAsync(id, ct);
            return Results.Ok(new { id, isActive });
        });
    }
}
