using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

public class ApiCostManager : IApiCostManager
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly IOptionsMonitor<StreamingApiSettings> _settings;
    private readonly ILogger<ApiCostManager> _logger;
    private readonly INotificationService _notificationService;

    public ApiCostManager(
        ApplicationDbContext context,
        IDistributedCache cache,
        IOptionsMonitor<StreamingApiSettings> settings,
        ILogger<ApiCostManager> logger,
        INotificationService notificationService)
    {
        _context = context;
        _cache = cache;
        _settings = settings;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<bool> CanMakeApiCallAsync()
    {
        try
        {
            var settings = _settings.CurrentValue;
            var dailyCost = await GetDailyCostAsync();
            var monthlyCost = await GetMonthlyCostAsync();

            // Check daily budget
            if (dailyCost >= settings.DailyBudgetLimit)
            {
                _logger.LogWarning("Daily budget limit reached: ${DailyCost} >= ${DailyLimit}", 
                    dailyCost, settings.DailyBudgetLimit);
                return false;
            }

            // Check monthly budget
            if (monthlyCost >= settings.MonthlyBudgetLimit)
            {
                _logger.LogWarning("Monthly budget limit reached: ${MonthlyCost} >= ${MonthlyLimit}", 
                    monthlyCost, settings.MonthlyBudgetLimit);
                return false;
            }

            // Check threshold warnings
            await CheckBudgetThresholdsAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if API call can be made");
            // In case of error, allow the call but log the issue
            return true;
        }
    }

    public async Task<decimal> GetDailyCostAsync()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var cacheKey = $"daily_cost_{today:yyyyMMdd}";

            // Try cache first
            var cachedCost = await _cache.GetStringAsync(cacheKey);
            if (decimal.TryParse(cachedCost, out var cost))
            {
                return cost;
            }

            // Get from database
            var dailyCost = await _context.ApiUsageRecords
                .Where(r => r.Timestamp >= today && r.Timestamp < today.AddDays(1))
                .SumAsync(r => r.EstimatedCost);

            // Cache for 1 minute
            await _cache.SetStringAsync(cacheKey, dailyCost.ToString(),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1)
                });

            return dailyCost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting daily cost");
            return 0;
        }
    }

    public async Task<decimal> GetMonthlyCostAsync()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1);
            var cacheKey = $"monthly_cost_{monthStart:yyyyMM}";

            // Try cache first
            var cachedCost = await _cache.GetStringAsync(cacheKey);
            if (decimal.TryParse(cachedCost, out var cost))
            {
                return cost;
            }

            // Get from database
            var monthlyCost = await _context.ApiUsageRecords
                .Where(r => r.Timestamp >= monthStart && r.Timestamp < monthStart.AddMonths(1))
                .SumAsync(r => r.EstimatedCost);

            // Cache for 5 minutes
            await _cache.SetStringAsync(cacheKey, monthlyCost.ToString(),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                });

            return monthlyCost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting monthly cost");
            return 0;
        }
    }

    public async Task CheckBudgetThresholdsAsync()
    {
        try
        {
            var settings = _settings.CurrentValue;
            var dailyCost = await GetDailyCostAsync();
            var monthlyCost = await GetMonthlyCostAsync();

            // Check daily budget thresholds
            if (dailyCost >= settings.DailyBudgetLimit * 0.9m) // 90% of daily budget
            {
                var alertKey = $"daily_budget_alert_{DateTime.UtcNow:yyyyMMdd}";
                var alertSent = await _cache.GetStringAsync(alertKey);
                
                if (string.IsNullOrEmpty(alertSent))
                {
                    await _notificationService.SendBudgetAlertAsync(
                        $"Daily budget 90% reached: ${dailyCost:F2} / ${settings.DailyBudgetLimit:F2}",
                        new Dictionary<string, object>
                        {
                            ["daily_cost"] = dailyCost,
                            ["daily_limit"] = settings.DailyBudgetLimit,
                            ["percentage"] = (dailyCost / settings.DailyBudgetLimit * 100)
                        });

                    // Mark alert as sent for today
                    await _cache.SetStringAsync(alertKey, "sent",
                        new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
                        });
                }
            }

            // Check monthly budget thresholds
            var monthlyThresholds = new[] { 0.5m, 0.8m, 0.9m }; // 50%, 80%, 90%
            
            foreach (var threshold in monthlyThresholds)
            {
                if (monthlyCost >= settings.MonthlyBudgetLimit * threshold)
                {
                    var alertKey = $"monthly_budget_alert_{DateTime.UtcNow:yyyyMM}_{(int)(threshold * 100)}";
                    var alertSent = await _cache.GetStringAsync(alertKey);

                    if (string.IsNullOrEmpty(alertSent))
                    {
                        await _notificationService.SendBudgetAlertAsync(
                            $"Monthly budget {threshold * 100}% reached: ${monthlyCost:F2} / ${settings.MonthlyBudgetLimit:F2}",
                            new Dictionary<string, object>
                            {
                                ["monthly_cost"] = monthlyCost,
                                ["monthly_limit"] = settings.MonthlyBudgetLimit,
                                ["percentage"] = (monthlyCost / settings.MonthlyBudgetLimit * 100),
                                ["threshold"] = threshold * 100
                            });

                        // Mark alert as sent for this month and threshold
                        await _cache.SetStringAsync(alertKey, "sent",
                            new DistributedCacheEntryOptions
                            {
                                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(31)
                            });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking budget thresholds");
        }
    }

    public async Task<bool> IsWithinBudgetAsync(decimal additionalCost)
    {
        try
        {
            var settings = _settings.CurrentValue;
            var dailyCost = await GetDailyCostAsync();
            var monthlyCost = await GetMonthlyCostAsync();

            return (dailyCost + additionalCost) <= settings.DailyBudgetLimit &&
                   (monthlyCost + additionalCost) <= settings.MonthlyBudgetLimit;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if within budget");
            return true; // Allow on error
        }
    }
}