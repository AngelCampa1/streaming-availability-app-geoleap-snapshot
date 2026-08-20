using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GrowthAnalytics;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Implementation of multi-touch attribution analysis
/// </summary>
public class AttributionService : IAttributionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AttributionService> _logger;
    
    public AttributionService(ApplicationDbContext context, ILogger<AttributionService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task<AttributionResult> CalculateAttributionAsync(Guid conversionEventId, Guid? modelId = null)
    {
        try
        {
            var conversionEvent = await _context.GrowthEvents
                .FirstOrDefaultAsync(e => e.Id == conversionEventId);
            
            if (conversionEvent == null || string.IsNullOrEmpty(conversionEvent.UserId))
            {
                throw new ArgumentException("Conversion event not found or missing user ID");
            }
            
            var model = modelId.HasValue 
                ? await _context.AttributionModels.FindAsync(modelId.Value)
                : await GetDefaultAttributionModelAsync();
            
            if (model == null)
            {
                throw new InvalidOperationException("Attribution model not found");
            }
            
            var journey = await GetUserJourneyAsync(conversionEvent.UserId, conversionEvent.ClientTimestamp, model.LookbackWindowDays);
            
            var result = new AttributionResult
            {
                ConversionEventId = conversionEventId,
                AttributionModelId = model.Id,
                Touches = CalculateAttributionWeights(journey, model),
                CalculatedAt = DateTime.UtcNow
            };
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate attribution for event {ConversionEventId}", conversionEventId);
            throw;
        }
    }
    
    public async Task<IEnumerable<AttributionResult>> CalculateBatchAttributionAsync(IEnumerable<Guid> conversionEventIds, Guid? modelId = null)
    {
        var results = new List<AttributionResult>();
        
        foreach (var eventId in conversionEventIds)
        {
            try
            {
                var result = await CalculateAttributionAsync(eventId, modelId);
                results.Add(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate attribution for event {EventId} in batch", eventId);
                // Continue processing other events
            }
        }
        
        return results;
    }
    
    public async Task<List<AttributionTouch>> GetUserJourneyAsync(string userId, DateTime conversionDate, int lookbackDays = 30)
    {
        var startDate = conversionDate.AddDays(-lookbackDays);
        
        var touchpoints = await _context.GrowthEvents
            .Where(e => e.UserId == userId && 
                       e.ClientTimestamp >= startDate && 
                       e.ClientTimestamp <= conversionDate &&
                       (e.UtmSource != null || e.Referrer != null))
            .OrderBy(e => e.ClientTimestamp)
            .ToListAsync();
        
        var touches = new List<AttributionTouch>();
        var position = 1;
        
        foreach (var touchpoint in touchpoints)
        {
            var touchpointType = DetermineTouchpointType(touchpoint);
            
            touches.Add(new AttributionTouch
            {
                EventId = touchpoint.Id,
                TouchpointType = touchpointType,
                UtmSource = touchpoint.UtmSource,
                UtmMedium = touchpoint.UtmMedium,
                UtmCampaign = touchpoint.UtmCampaign,
                TouchpointTime = touchpoint.ClientTimestamp,
                PositionInJourney = position++,
                TimeToConversion = conversionDate - touchpoint.ClientTimestamp
            });
        }
        
        return touches;
    }
    
    public async Task<AttributionModel> CreateAttributionModelAsync(AttributionModel model)
    {
        model.CreatedAt = DateTime.UtcNow;
        model.UpdatedAt = DateTime.UtcNow;
        
        _context.AttributionModels.Add(model);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created attribution model: {ModelName}", model.Name);
        return model;
    }
    
    public async Task<AttributionModel?> UpdateAttributionModelAsync(Guid modelId, AttributionModel model)
    {
        var existingModel = await _context.AttributionModels.FindAsync(modelId);
        if (existingModel == null) return null;
        
        existingModel.Name = model.Name;
        existingModel.Description = model.Description;
        existingModel.Type = model.Type;
        existingModel.Configuration = model.Configuration;
        existingModel.LookbackWindowDays = model.LookbackWindowDays;
        existingModel.IsActive = model.IsActive;
        existingModel.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Updated attribution model: {ModelId}", modelId);
        return existingModel;
    }
    
    public async Task<IEnumerable<AttributionModel>> GetAttributionModelsAsync()
    {
        return await _context.AttributionModels
            .OrderBy(m => m.Name)
            .ToListAsync();
    }
    
    public async Task<AttributionModel?> GetDefaultAttributionModelAsync()
    {
        return await _context.AttributionModels
            .FirstOrDefaultAsync(m => m.IsDefault && m.IsActive);
    }
    
    public async Task<AttributionSummaryResult> GetAttributionSummaryAsync(DateTime startDate, DateTime endDate, Guid? modelId = null)
    {
        var model = modelId.HasValue 
            ? await _context.AttributionModels.FindAsync(modelId.Value)
            : await GetDefaultAttributionModelAsync();
        
        if (model == null)
        {
            throw new InvalidOperationException("Attribution model not found");
        }
        
        // Get conversion events in date range
        var conversionEvents = await _context.GrowthEvents
            .Where(e => e.Category == "conversion" && 
                       e.ClientTimestamp >= startDate && 
                       e.ClientTimestamp <= endDate &&
                       !string.IsNullOrEmpty(e.UserId))
            .ToListAsync();
        
        var summary = new AttributionSummaryResult
        {
            StartDate = startDate,
            EndDate = endDate,
            AttributionModelId = model.Id,
            ModelName = model.Name,
            TotalConversions = conversionEvents.Count,
            TotalAttributedValue = conversionEvents.Sum(e => e.EventValue ?? 0)
        };
        
        // Calculate channel attribution (simplified for demo)
        var channelData = new Dictionary<string, ChannelAttributionSummary>();
        
        foreach (var conversion in conversionEvents)
        {
            if (!string.IsNullOrEmpty(conversion.UserId))
            {
                var journey = await GetUserJourneyAsync(conversion.UserId, conversion.ClientTimestamp, model.LookbackWindowDays);
                var attributedTouches = CalculateAttributionWeights(journey, model);
                
                foreach (var touch in attributedTouches)
                {
                    var channel = touch.UtmSource ?? "direct";
                    
                    if (!channelData.ContainsKey(channel))
                    {
                        channelData[channel] = new ChannelAttributionSummary
                        {
                            Channel = channel
                        };
                    }
                    
                    channelData[channel].AttributedValue += touch.AttributedValue;
                    if (touch.PositionInJourney == 1)
                        channelData[channel].FirstTouchConversions++;
                    if (touch.PositionInJourney == attributedTouches.Count)
                        channelData[channel].LastTouchConversions++;
                }
            }
        }
        
        summary.Channels = channelData.Values.ToList();
        
        // Calculate percentages
        foreach (var channel in summary.Channels)
        {
            channel.AttributedPercentage = summary.TotalAttributedValue > 0 
                ? channel.AttributedValue / summary.TotalAttributedValue * 100 
                : 0;
        }
        
        return summary;
    }
    
    public async Task<AttributionModelComparisonResult> CompareAttributionModelsAsync(DateTime startDate, DateTime endDate, IEnumerable<Guid> modelIds)
    {
        var models = await _context.AttributionModels
            .Where(m => modelIds.Contains(m.Id))
            .ToListAsync();
        
        var comparison = new AttributionModelComparisonResult
        {
            StartDate = startDate,
            EndDate = endDate
        };
        
        foreach (var model in models)
        {
            var summary = await GetAttributionSummaryAsync(startDate, endDate, model.Id);
            
            comparison.Models.Add(new ModelComparisonSummary
            {
                ModelId = model.Id,
                ModelName = model.Name,
                ModelType = model.Type,
                TotalConversions = summary.TotalConversions,
                TotalAttributedValue = summary.TotalAttributedValue,
                TopChannel = summary.Channels.OrderByDescending(c => c.AttributedValue).FirstOrDefault()?.Channel ?? "",
                TopChannelPercentage = summary.Channels.OrderByDescending(c => c.AttributedValue).FirstOrDefault()?.AttributedPercentage ?? 0
            });
        }
        
        return comparison;
    }
    
    public async Task<IEnumerable<ChannelPerformanceResult>> GetChannelPerformanceAsync(DateTime startDate, DateTime endDate, Guid? modelId = null)
    {
        var summary = await GetAttributionSummaryAsync(startDate, endDate, modelId);
        var performance = new List<ChannelPerformanceResult>();
        
        foreach (var channel in summary.Channels)
        {
            // Get channel traffic data
            var channelEvents = await _context.GrowthEvents
                .Where(e => (e.UtmSource == channel.Channel || (channel.Channel == "direct" && e.UtmSource == null)) &&
                           e.ClientTimestamp >= startDate &&
                           e.ClientTimestamp <= endDate)
                .ToListAsync();
            
            var clicks = channelEvents.Count(e => e.EventName == "page_view");
            var conversions = channelEvents.Count(e => e.Category == "conversion");
            
            performance.Add(new ChannelPerformanceResult
            {
                Channel = channel.Channel,
                Source = channel.Channel,
                Medium = "unknown", // Would be filled from actual data
                Campaign = "unknown", // Would be filled from actual data
                Clicks = clicks,
                Conversions = conversions,
                AttributedValue = channel.AttributedValue,
                ConversionRate = clicks > 0 ? (decimal)conversions / clicks * 100 : 0,
                // Other metrics would be calculated from actual ad spend data
            });
        }
        
        return performance;
    }
    
    private List<AttributionTouch> CalculateAttributionWeights(List<AttributionTouch> journey, AttributionModel model)
    {
        if (!journey.Any()) return journey;
        
        var totalTouchpoints = journey.Count;
        
        return model.Type switch
        {
            AttributionModelType.LastClick => CalculateLastClickAttribution(journey),
            AttributionModelType.FirstClick => CalculateFirstClickAttribution(journey),
            AttributionModelType.Linear => CalculateLinearAttribution(journey),
            AttributionModelType.TimeDecay => CalculateTimeDecayAttribution(journey),
            AttributionModelType.PositionBased => CalculatePositionBasedAttribution(journey),
            _ => CalculateLinearAttribution(journey) // Default fallback
        };
    }
    
    private List<AttributionTouch> CalculateLastClickAttribution(List<AttributionTouch> journey)
    {
        foreach (var touch in journey)
        {
            touch.AttributionWeight = 0;
            touch.AttributedValue = 0;
        }
        
        var lastTouch = journey.LastOrDefault();
        if (lastTouch != null)
        {
            lastTouch.AttributionWeight = 1.0m;
            lastTouch.AttributedValue = 100m; // Placeholder value
        }
        
        return journey;
    }
    
    private List<AttributionTouch> CalculateFirstClickAttribution(List<AttributionTouch> journey)
    {
        foreach (var touch in journey)
        {
            touch.AttributionWeight = 0;
            touch.AttributedValue = 0;
        }
        
        // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when assigning attribution
        if (journey.Any())
        {
            var firstTouch = journey.FirstOrDefault();
            if (firstTouch != null)
            {
                firstTouch.AttributionWeight = 1.0m;
                firstTouch.AttributedValue = 100m; // Placeholder value
            }
        }
        
        return journey;
    }
    
    private List<AttributionTouch> CalculateLinearAttribution(List<AttributionTouch> journey)
    {
        if (!journey.Any()) return journey;
        
        var weight = 1.0m / journey.Count;
        var value = 100m / journey.Count; // Placeholder value
        
        foreach (var touch in journey)
        {
            touch.AttributionWeight = weight;
            touch.AttributedValue = value;
        }
        
        return journey;
    }
    
    private List<AttributionTouch> CalculateTimeDecayAttribution(List<AttributionTouch> journey)
    {
        if (!journey.Any()) return journey;
        
        // Exponential decay - touchpoints closer to conversion get higher weight
        var totalWeight = 0m;
        var halfLife = TimeSpan.FromDays(7); // 7-day half-life
        
        foreach (var touch in journey)
        {
            var daysSinceTouch = touch.TimeToConversion.TotalDays;
            touch.AttributionWeight = (decimal)Math.Pow(2, -daysSinceTouch / halfLife.TotalDays);
            totalWeight += touch.AttributionWeight;
        }
        
        // Normalize weights
        foreach (var touch in journey)
        {
            touch.AttributionWeight /= totalWeight;
            touch.AttributedValue = touch.AttributionWeight * 100m; // Placeholder value
        }
        
        return journey;
    }
    
    private List<AttributionTouch> CalculatePositionBasedAttribution(List<AttributionTouch> journey)
    {
        if (!journey.Any()) return journey;
        
        if (journey.Count == 1)
        {
            journey[0].AttributionWeight = 1.0m;
            journey[0].AttributedValue = 100m;
        }
        else if (journey.Count == 2)
        {
            journey[0].AttributionWeight = 0.4m; // First touch
            journey[1].AttributionWeight = 0.4m; // Last touch
            journey[0].AttributedValue = 40m;
            journey[1].AttributedValue = 40m;
        }
        else
        {
            // 40% first, 40% last, 20% distributed among middle touches
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions in position-based attribution
            var firstTouch = journey.FirstOrDefault();
            var lastTouch = journey.LastOrDefault();

            if (firstTouch != null)
            {
                firstTouch.AttributionWeight = 0.4m;
                firstTouch.AttributedValue = 40m;
            }

            if (lastTouch != null)
            {
                lastTouch.AttributionWeight = 0.4m;
                lastTouch.AttributedValue = 40m;
            }
            
            var middleTouches = journey.Skip(1).Take(journey.Count - 2).ToList();
            if (middleTouches.Any())
            {
                var middleWeight = 0.2m / middleTouches.Count;
                var middleValue = 20m / middleTouches.Count;
                
                foreach (var touch in middleTouches)
                {
                    touch.AttributionWeight = middleWeight;
                    touch.AttributedValue = middleValue;
                }
            }
        }
        
        return journey;
    }
    
    private string DetermineTouchpointType(GrowthEvent touchpoint)
    {
        if (!string.IsNullOrEmpty(touchpoint.UtmMedium))
        {
            return touchpoint.UtmMedium.ToLower() switch
            {
                "cpc" or "ppc" or "paid" => "paid",
                "social" => "social",
                "email" => "email",
                "organic" => "organic",
                _ => "other"
            };
        }
        
        if (!string.IsNullOrEmpty(touchpoint.Referrer))
        {
            return touchpoint.Referrer.Contains("google") || touchpoint.Referrer.Contains("bing") 
                ? "organic" 
                : "referral";
        }
        
        return "direct";
    }
}