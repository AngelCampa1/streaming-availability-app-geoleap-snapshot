using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Threading.Channels;

namespace GeoLeap.Api.Services;

public interface IAffiliateService
{
    Task<List<AffiliatePartner>> GetActivePartnersForContextAsync(string? countryCode, string? streamingServiceId, CancellationToken ct = default);
    Task<string> GenerateAffiliateUrlAsync(Guid partnerId, Dictionary<string, string>? overrides = null, CancellationToken ct = default);
    Task TrackClickAsync(AffiliateClickRequest clickData, Guid? userId, string? ipAddress, string? userAgent, string? referrer, CancellationToken ct = default);
    Task<AffiliatePartnerDto> GetPartnerAnalyticsAsync(Guid partnerId, DateTime from, DateTime to, CancellationToken ct = default);
    Task<AffiliateDashboard> GetDashboardAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task RecordConversionAsync(AffiliateConversionRequest data, CancellationToken ct = default);
    Task<List<AffiliatePartner>> GetAllPartnersAsync(int page, int pageSize, bool? activeOnly, CancellationToken ct = default);
    Task<AffiliatePartner?> GetPartnerByIdAsync(Guid id, CancellationToken ct = default);
    Task<AffiliatePartner> CreatePartnerAsync(CreateAffiliatePartnerRequest request, CancellationToken ct = default);
    Task<AffiliatePartner> UpdatePartnerAsync(Guid id, UpdateAffiliatePartnerRequest request, CancellationToken ct = default);
    Task<bool> DeletePartnerAsync(Guid id, CancellationToken ct = default);
    Task<bool> TogglePartnerActiveAsync(Guid id, CancellationToken ct = default);
}

public class AffiliateService : IAffiliateService, IAsyncDisposable
{
    private readonly IDbContextFactory<ApplicationDbContext> _dbContextFactory;
    private readonly ILogger<AffiliateService> _logger;
    private readonly Channel<AffiliateClick> _clickChannel;
    private readonly Task _clickConsumerTask;
    private readonly CancellationTokenSource _cts = new();

    public AffiliateService(IDbContextFactory<ApplicationDbContext> dbContextFactory, ILogger<AffiliateService> logger)
    {
        _dbContextFactory = dbContextFactory;
        _logger = logger;
        _clickChannel = Channel.CreateBounded<AffiliateClick>(new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true
        });
        _clickConsumerTask = Task.Run(() => ConsumeClicksAsync(_cts.Token));
    }

    public async Task<List<AffiliatePartner>> GetActivePartnersForContextAsync(
        string? countryCode, string? streamingServiceId, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partners = await db.AffiliatePartners
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.Priority)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        // Filter by target countries if specified
        if (!string.IsNullOrEmpty(countryCode))
        {
            partners = partners.Where(p =>
            {
                if (p.TargetCountries == null) return true; // null = all countries
                try
                {
                    var countries = JsonSerializer.Deserialize<string[]>(p.TargetCountries);
                    return countries != null && countries.Contains(countryCode, StringComparer.OrdinalIgnoreCase);
                }
                catch { return true; }
            }).ToList();
        }

        // Filter by target streaming services if specified
        if (!string.IsNullOrEmpty(streamingServiceId))
        {
            partners = partners.Where(p =>
            {
                if (p.TargetStreamingServices == null) return true; // null = all services
                try
                {
                    var services = JsonSerializer.Deserialize<string[]>(p.TargetStreamingServices);
                    return services != null && services.Contains(streamingServiceId, StringComparer.OrdinalIgnoreCase);
                }
                catch { return true; }
            }).ToList();
        }

        return partners;
    }

    public async Task<string> GenerateAffiliateUrlAsync(
        Guid partnerId, Dictionary<string, string>? overrides = null, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partner = await db.AffiliatePartners.FindAsync(new object[] { partnerId }, ct)
            ?? throw new KeyNotFoundException($"Affiliate partner {partnerId} not found");

        var url = partner.AffiliateUrlTemplate;

        // Apply template parameters
        if (!string.IsNullOrEmpty(partner.TemplateParameters))
        {
            try
            {
                var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(partner.TemplateParameters)
                    ?? new Dictionary<string, string>();

                // Apply overrides
                if (overrides != null)
                {
                    foreach (var kv in overrides) parameters[kv.Key] = kv.Value;
                }

                // Substitute placeholders
                foreach (var kv in parameters)
                {
                    url = url.Replace($"{{{kv.Key}}}", kv.Value, StringComparison.OrdinalIgnoreCase);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse template parameters for partner {PartnerId}", partnerId);
            }
        }
        else if (overrides != null)
        {
            foreach (var kv in overrides)
            {
                url = url.Replace($"{{{kv.Key}}}", kv.Value, StringComparison.OrdinalIgnoreCase);
            }
        }

        return url;
    }

    public async Task TrackClickAsync(
        AffiliateClickRequest clickData, Guid? userId, string? ipAddress,
        string? userAgent, string? referrer, CancellationToken ct = default)
    {
        try
        {
            var generatedUrl = await GenerateAffiliateUrlAsync(clickData.PartnerId, null, ct);

            var click = new AffiliateClick
            {
                AffiliatePartnerId = clickData.PartnerId,
                UserId = userId,
                AnonymousId = clickData.AnonymousId,
                ContentId = clickData.ContentId,
                ContentTitle = clickData.ContentTitle,
                CountryCode = clickData.CountryCode,
                StreamingService = clickData.StreamingService,
                Platform = clickData.Platform,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Referrer = referrer,
                GeneratedUrl = generatedUrl,
                ClickedAt = DateTime.UtcNow
            };

            await _clickChannel.Writer.WriteAsync(click, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enqueue affiliate click for partner {PartnerId}", clickData.PartnerId);
        }
    }

    public async Task<AffiliatePartnerDto> GetPartnerAnalyticsAsync(
        Guid partnerId, DateTime from, DateTime to, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partner = await db.AffiliatePartners.FindAsync(new object[] { partnerId }, ct)
            ?? throw new KeyNotFoundException($"Partner {partnerId} not found");

        var clicks = await db.AffiliateClicks
            .Where(c => c.AffiliatePartnerId == partnerId && c.ClickedAt >= from && c.ClickedAt <= to)
            .CountAsync(ct);

        var conversions = await db.AffiliateConversions
            .Where(c => c.AffiliatePartnerId == partnerId && c.ConvertedAt >= from && c.ConvertedAt <= to)
            .ToListAsync(ct);

        return new AffiliatePartnerDto
        {
            Id = partner.Id,
            Name = partner.Name,
            LogoUrl = partner.LogoUrl,
            AffiliateUrlTemplate = partner.AffiliateUrlTemplate,
            Priority = partner.Priority,
            IsActive = partner.IsActive,
            CommissionRate = partner.CommissionRate,
            CommissionType = partner.CommissionType,
            FlatCommission = partner.FlatCommission,
            VpnProviderId = partner.VpnProviderId,
            CreatedAt = partner.CreatedAt,
            TotalClicks = clicks,
            TotalConversions = conversions.Count,
            TotalRevenue = conversions.Sum(c => c.Revenue)
        };
    }

    public async Task<AffiliateDashboard> GetDashboardAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var clicks = await db.AffiliateClicks
            .Where(c => c.ClickedAt >= from && c.ClickedAt <= to)
            .CountAsync(ct);

        var conversions = await db.AffiliateConversions
            .Where(c => c.ConvertedAt >= from && c.ConvertedAt <= to)
            .ToListAsync(ct);

        var topPartners = await db.AffiliatePartners
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.Priority)
            .Take(5)
            .Select(p => new AffiliatePartnerDto
            {
                Id = p.Id,
                Name = p.Name,
                LogoUrl = p.LogoUrl,
                AffiliateUrlTemplate = p.AffiliateUrlTemplate,
                Priority = p.Priority,
                IsActive = p.IsActive,
                CommissionRate = p.CommissionRate,
                CommissionType = p.CommissionType,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(ct);

        return new AffiliateDashboard
        {
            TotalClicks = clicks,
            TotalConversions = conversions.Count,
            TotalRevenue = conversions.Sum(c => c.Revenue),
            TotalCommission = conversions.Sum(c => c.Commission),
            ConversionRate = clicks > 0 ? (double)conversions.Count / clicks * 100 : 0,
            TopPartners = topPartners,
            From = from,
            To = to
        };
    }

    public async Task RecordConversionAsync(AffiliateConversionRequest data, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);

        var partnerExists = await db.AffiliatePartners.AnyAsync(p => p.Id == data.PartnerId, ct);
        if (!partnerExists)
        {
            _logger.LogWarning("RecordConversionAsync: partner {PartnerId} not found — dropping postback", data.PartnerId);
            return;
        }

        var conversion = new AffiliateConversion
        {
            AffiliatePartnerId = data.PartnerId,
            AffiliateClickId = data.ClickId,
            ExternalConversionId = data.ExternalConversionId,
            Revenue = data.Revenue,
            Commission = data.Commission,
            Status = "pending",
            ConvertedAt = DateTime.UtcNow
        };

        db.AffiliateConversions.Add(conversion);
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<AffiliatePartner>> GetAllPartnersAsync(
        int page, int pageSize, bool? activeOnly, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var query = db.AffiliatePartners.AsQueryable();

        if (activeOnly == true)
            query = query.Where(p => p.IsActive);

        return await query
            .OrderByDescending(p => p.Priority)
            .ThenBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<AffiliatePartner?> GetPartnerByIdAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        return await db.AffiliatePartners.FindAsync(new object[] { id }, ct);
    }

    public async Task<AffiliatePartner> CreatePartnerAsync(
        CreateAffiliatePartnerRequest request, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partner = new AffiliatePartner
        {
            Name = request.Name,
            LogoUrl = request.LogoUrl,
            AffiliateUrlTemplate = request.AffiliateUrlTemplate,
            TemplateParameters = request.TemplateParameters,
            Priority = request.Priority,
            CommissionRate = request.CommissionRate,
            CommissionType = request.CommissionType,
            FlatCommission = request.FlatCommission,
            TargetCountries = request.TargetCountries != null
                ? JsonSerializer.Serialize(request.TargetCountries) : null,
            TargetStreamingServices = request.TargetStreamingServices != null
                ? JsonSerializer.Serialize(request.TargetStreamingServices) : null,
            VpnProviderId = request.VpnProviderId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.AffiliatePartners.Add(partner);
        await db.SaveChangesAsync(ct);
        return partner;
    }

    public async Task<AffiliatePartner> UpdatePartnerAsync(
        Guid id, UpdateAffiliatePartnerRequest request, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partner = await db.AffiliatePartners.FindAsync(new object[] { id }, ct)
            ?? throw new KeyNotFoundException($"Partner {id} not found");

        if (request.Name != null) partner.Name = request.Name;
        if (request.LogoUrl != null) partner.LogoUrl = request.LogoUrl;
        if (request.AffiliateUrlTemplate != null) partner.AffiliateUrlTemplate = request.AffiliateUrlTemplate;
        if (request.TemplateParameters != null) partner.TemplateParameters = request.TemplateParameters;
        if (request.Priority.HasValue) partner.Priority = request.Priority.Value;
        if (request.IsActive.HasValue) partner.IsActive = request.IsActive.Value;
        if (request.CommissionRate.HasValue) partner.CommissionRate = request.CommissionRate.Value;
        if (request.CommissionType != null) partner.CommissionType = request.CommissionType;
        if (request.FlatCommission.HasValue) partner.FlatCommission = request.FlatCommission.Value;
        if (request.TargetCountries != null)
            partner.TargetCountries = JsonSerializer.Serialize(request.TargetCountries);
        if (request.TargetStreamingServices != null)
            partner.TargetStreamingServices = JsonSerializer.Serialize(request.TargetStreamingServices);

        partner.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return partner;
    }

    public async Task<bool> DeletePartnerAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partner = await db.AffiliatePartners.FindAsync(new object[] { id }, ct);
        if (partner == null) return false;

        partner.IsActive = false;
        partner.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> TogglePartnerActiveAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await _dbContextFactory.CreateDbContextAsync(ct);
        var partner = await db.AffiliatePartners.FindAsync(new object[] { id }, ct);
        if (partner == null) return false;

        partner.IsActive = !partner.IsActive;
        partner.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return partner.IsActive;
    }

    public async ValueTask DisposeAsync()
    {
        _clickChannel.Writer.Complete();
        try
        {
            await _clickConsumerTask.WaitAsync(TimeSpan.FromSeconds(5));
        }
        catch (TimeoutException)
        {
            _logger.LogWarning("AffiliateService: click consumer did not drain within 5s — cancelling");
        }
        finally
        {
            _cts.Cancel();
            _cts.Dispose();
        }
    }

    private async Task ConsumeClicksAsync(CancellationToken cancellationToken = default)
    {
        const int maxBatchSize = 50;
        var flushInterval = TimeSpan.FromSeconds(30);
        var batch = new List<AffiliateClick>();

        while (!cancellationToken.IsCancellationRequested)
        {
            // Read items with a timeout so we flush periodically even with low traffic
            using var flushCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            flushCts.CancelAfter(flushInterval);

            try
            {
                while (batch.Count < maxBatchSize)
                {
                    var click = await _clickChannel.Reader.ReadAsync(flushCts.Token);
                    batch.Add(click);
                }
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                // Flush timeout reached — write whatever we have
            }
            catch (OperationCanceledException)
            {
                break; // App shutting down
            }
            catch (ChannelClosedException)
            {
                break; // Channel completed during disposal
            }

            if (batch.Count > 0)
            {
                try
                {
                    await using var db = await _dbContextFactory.CreateDbContextAsync();
                    db.AffiliateClicks.AddRange(batch);
                    await db.SaveChangesAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to persist {Count} affiliate clicks", batch.Count);
                }

                batch.Clear();
            }
        }

        // Drain remaining items on shutdown
        while (_clickChannel.Reader.TryRead(out var remaining))
        {
            batch.Add(remaining);
        }

        if (batch.Count > 0)
        {
            try
            {
                await using var db = await _dbContextFactory.CreateDbContextAsync();
                db.AffiliateClicks.AddRange(batch);
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist {Count} remaining affiliate clicks on shutdown", batch.Count);
            }
        }
    }
}
