using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class BudgetManager : IBudgetManager
{
    private readonly IApiCostTracker _costTracker;
    private readonly IAlertingService _alertingService;
    private readonly ICacheService _cacheService;
    private readonly ApplicationDbContext _context;
    private readonly IOptionsMonitor<CostManagementSettings> _budgetConfig;
    private readonly ILogger<BudgetManager> _logger;

    public BudgetManager(
        IApiCostTracker costTracker,
        IAlertingService alertingService,
        ICacheService cacheService,
        ApplicationDbContext context,
        IOptionsMonitor<CostManagementSettings> budgetConfig,
        ILogger<BudgetManager> logger)
    {
        _costTracker = costTracker;
        _alertingService = alertingService;
        _cacheService = cacheService;
        _context = context;
        _budgetConfig = budgetConfig;
        _logger = logger;
    }

    public async Task<bool> CanMakeApiCallAsync(string providerId, decimal estimatedCost)
    {
        var currentCosts = await _costTracker.GetCurrentMonthCostAsync();
        var dailyCosts = await _costTracker.GetDailyCostAsync(DateTime.UtcNow);
        
        var monthlyLimit = _budgetConfig.CurrentValue.BudgetConfiguration.MonthlyLimit;
        var dailyLimit = _budgetConfig.CurrentValue.BudgetConfiguration.DailyLimit;
        var providerLimits = _budgetConfig.CurrentValue.BudgetConfiguration.ProviderLimits;

        // Check monthly limit
        if (currentCosts + estimatedCost > monthlyLimit)
        {
            _logger.LogWarning("API call blocked: Monthly budget limit would be exceeded. Current: ${Current}, Limit: ${Limit}",
                currentCosts, monthlyLimit);
            return false;
        }

        // Check daily limit
        if (dailyCosts + estimatedCost > dailyLimit)
        {
            _logger.LogWarning("API call blocked: Daily budget limit would be exceeded. Current: ${Current}, Limit: ${Limit}",
                dailyCosts, dailyLimit);
            return false;
        }

        // Check provider-specific limit
        if (providerLimits.TryGetValue(providerId, out var providerLimit))
        {
            var providerCosts = await _costTracker.GetCurrentMonthCostAsync(providerId);
            if (providerCosts + estimatedCost > providerLimit)
            {
                _logger.LogWarning("API call blocked: Provider budget limit would be exceeded. Provider: {ProviderId}, Current: ${Current}, Limit: ${Limit}",
                    providerId, providerCosts, providerLimit);
                return false;
            }
        }

        return true;
    }

    public async Task<BudgetStatus> GetBudgetStatusAsync()
    {
        var monthlySpent = await _costTracker.GetCurrentMonthCostAsync();
        var dailySpent = await _costTracker.GetDailyCostAsync(DateTime.UtcNow);
        
        var config = _budgetConfig.CurrentValue.BudgetConfiguration;
        var monthlyBudget = config.MonthlyLimit;
        var dailyBudget = config.DailyLimit;

        var daysInMonth = DateTime.DaysInMonth(DateTime.UtcNow.Year, DateTime.UtcNow.Month);
        var dayOfMonth = DateTime.UtcNow.Day;
        var daysRemaining = daysInMonth - dayOfMonth + 1;

        var utilizationPercentage = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0;
        var averageDailySpend = dayOfMonth > 0 ? monthlySpent / dayOfMonth : 0;
        var projectedMonthlySpend = averageDailySpend * daysInMonth;

        var providerStatuses = new List<ProviderBudgetStatus>();
        foreach (var providerLimit in config.ProviderLimits)
        {
            var providerSpent = await _costTracker.GetCurrentMonthCostAsync(providerLimit.Key);
            var providerUtilization = providerLimit.Value > 0 ? (providerSpent / providerLimit.Value) * 100 : 0;

            providerStatuses.Add(new ProviderBudgetStatus
            {
                ProviderId = providerLimit.Key,
                Budget = providerLimit.Value,
                Spent = providerSpent,
                Remaining = Math.Max(0, providerLimit.Value - providerSpent),
                UtilizationPercentage = providerUtilization
            });
        }

        return new BudgetStatus
        {
            MonthlyBudget = monthlyBudget,
            MonthlySpent = monthlySpent,
            MonthlyRemaining = Math.Max(0, monthlyBudget - monthlySpent),
            DailyBudget = dailyBudget,
            DailySpent = dailySpent,
            UtilizationPercentage = utilizationPercentage,
            ProviderStatuses = providerStatuses,
            DaysRemainingInMonth = daysRemaining,
            ProjectedMonthlySpend = projectedMonthlySpend
        };
    }

    public async Task<List<BudgetAlert>> CheckBudgetThresholdsAsync()
    {
        var alerts = new List<BudgetAlert>();
        var currentCosts = await _costTracker.GetCurrentMonthCostAsync();
        var monthlyLimit = _budgetConfig.CurrentValue.BudgetConfiguration.MonthlyLimit;

        var utilizationPercentage = monthlyLimit > 0 ? (currentCosts / monthlyLimit) * 100 : 0;
        var thresholds = _budgetConfig.CurrentValue.BudgetConfiguration.AlertThresholds ?? new[] { 80m, 90m, 95m };

        // Find the highest exceeded threshold to avoid alert spam
        var exceededThresholds = thresholds.Where(t => utilizationPercentage >= t).OrderByDescending(t => t);
        var highestExceededThreshold = exceededThresholds.FirstOrDefault();
        
        if (highestExceededThreshold > 0 && !await WasAlertSentAsync(highestExceededThreshold))
        {
            var alert = new BudgetAlert
            {
                Id = Guid.NewGuid(),
                Type = BudgetAlertType.ThresholdExceeded,
                Threshold = highestExceededThreshold,
                CurrentUtilization = utilizationPercentage,
                CurrentCost = currentCosts,
                BudgetLimit = monthlyLimit,
                Timestamp = DateTime.UtcNow
            };

            alerts.Add(alert);
            
            // Save alert to database
            await _context.BudgetAlerts.AddAsync(alert);
            await _context.SaveChangesAsync();

            await _alertingService.SendBudgetAlertAsync(alert);
            await MarkAlertAsSentAsync(highestExceededThreshold);

            _logger.LogWarning("Budget threshold alert: {Threshold}% exceeded. Current: ${Current} ({Percentage}%)",
                highestExceededThreshold, currentCosts, utilizationPercentage);
        }

        // Check provider-specific thresholds
        await CheckProviderThresholdsAsync(alerts);

        // Check forecast overrun
        await CheckForecastOverrunAsync(alerts);

        return alerts;
    }

    public async Task SetBudgetLimitAsync(string category, decimal limit, BudgetPeriod period)
    {
        var existingBudget = await _context.BudgetConfigurations
            .FirstOrDefaultAsync(bc => bc.Category == category && bc.Period == period && bc.IsActive);

        if (existingBudget != null)
        {
            existingBudget.Limit = limit;
            existingBudget.UpdatedAt = DateTime.UtcNow;
            _context.BudgetConfigurations.Update(existingBudget);
        }
        else
        {
            var newBudget = new BudgetConfiguration
            {
                Id = Guid.NewGuid(),
                Category = category,
                Limit = limit,
                Period = period,
                IsActive = true
            };

            await _context.BudgetConfigurations.AddAsync(newBudget);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Budget limit set: Category={Category}, Period={Period}, Limit=${Limit}",
            category, period, limit);
    }

    public async Task<BudgetUtilization> GetBudgetUtilizationAsync(BudgetPeriod period)
    {
        var (periodStart, periodEnd) = GetPeriodDates(period);
        
        var records = await _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= periodStart && acr.Timestamp <= periodEnd)
            .ToListAsync();

        var dailyBreakdown = records
            .GroupBy(acr => acr.Timestamp.Date)
            .Select(g => new DailyUtilization
            {
                Date = g.Key,
                DailyCost = g.Sum(acr => acr.EstimatedCost),
                CallCount = g.Count(),
                ProviderCosts = g.GroupBy(acr => acr.ProviderId)
                    .ToDictionary(pg => pg.Key, pg => pg.Sum(acr => acr.EstimatedCost))
            })
            .OrderBy(d => d.Date)
            .ToList();

        var totalSpent = dailyBreakdown.Sum(d => d.DailyCost);
        var totalBudget = await GetBudgetForPeriodAsync(period);

        return new BudgetUtilization
        {
            TotalBudget = totalBudget,
            TotalSpent = totalSpent,
            UtilizationPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
            Period = period,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            DailyBreakdown = dailyBreakdown
        };
    }

    private async Task<bool> WasAlertSentAsync(decimal threshold)
    {
        var cacheKey = $"budget-alert:{DateTime.UtcNow:yyyy-MM}:{threshold}";
        return await _cacheService.ExistsAsync(cacheKey);
    }

    private async Task MarkAlertAsSentAsync(decimal threshold)
    {
        var cacheKey = $"budget-alert:{DateTime.UtcNow:yyyy-MM}:{threshold}";
        await _cacheService.SetAsync(cacheKey, true, TimeSpan.FromDays(31));
    }

    private async Task CheckProviderThresholdsAsync(List<BudgetAlert> alerts)
    {
        var providerLimits = _budgetConfig.CurrentValue.BudgetConfiguration.ProviderLimits;
        
        foreach (var providerLimit in providerLimits)
        {
            var providerCosts = await _costTracker.GetCurrentMonthCostAsync(providerLimit.Key);
            var providerUtilization = providerLimit.Value > 0 ? (providerCosts / providerLimit.Value) * 100 : 0;

            if (providerUtilization >= 90 && !await WasProviderAlertSentAsync(providerLimit.Key, 90))
            {
                var alert = new BudgetAlert
                {
                    Id = Guid.NewGuid(),
                    Type = BudgetAlertType.ProviderLimitExceeded,
                    Threshold = 90m,
                    CurrentUtilization = providerUtilization,
                    CurrentCost = providerCosts,
                    BudgetLimit = providerLimit.Value,
                    ProviderId = providerLimit.Key,
                    Timestamp = DateTime.UtcNow
                };

                alerts.Add(alert);
                await _context.BudgetAlerts.AddAsync(alert);
                await _alertingService.SendBudgetAlertAsync(alert);
                await MarkProviderAlertAsSentAsync(providerLimit.Key, 90);
            }
        }
    }

    private async Task CheckForecastOverrunAsync(List<BudgetAlert> alerts)
    {
        var forecast = await _costTracker.GenerateCostForecastAsync(30);
        var monthlyLimit = _budgetConfig.CurrentValue.BudgetConfiguration.MonthlyLimit;
        var currentMonthCosts = await _costTracker.GetCurrentMonthCostAsync();

        var remainingDaysInMonth = DateTime.DaysInMonth(DateTime.UtcNow.Year, DateTime.UtcNow.Month) - DateTime.UtcNow.Day;
        var forecastForRemainingDays = forecast.DailyForecasts
            .Where(f => f.Date.Month == DateTime.UtcNow.Month)
            .Sum(f => f.PredictedCost);

        var projectedMonthlyTotal = currentMonthCosts + forecastForRemainingDays;

        if (projectedMonthlyTotal > monthlyLimit * 1.1m && !await WasForecastAlertSentAsync())
        {
            var alert = new BudgetAlert
            {
                Id = Guid.NewGuid(),
                Type = BudgetAlertType.ForecastOverrun,
                Threshold = 100m,
                CurrentUtilization = (projectedMonthlyTotal / monthlyLimit) * 100,
                CurrentCost = currentMonthCosts,
                BudgetLimit = monthlyLimit,
                Timestamp = DateTime.UtcNow
            };

            alerts.Add(alert);
            await _context.BudgetAlerts.AddAsync(alert);
            await _alertingService.SendBudgetAlertAsync(alert);
            await MarkForecastAlertAsSentAsync();
        }
    }

    private async Task<bool> WasProviderAlertSentAsync(string providerId, decimal threshold)
    {
        var cacheKey = $"provider-alert:{DateTime.UtcNow:yyyy-MM}:{providerId}:{threshold}";
        return await _cacheService.ExistsAsync(cacheKey);
    }

    private async Task MarkProviderAlertAsSentAsync(string providerId, decimal threshold)
    {
        var cacheKey = $"provider-alert:{DateTime.UtcNow:yyyy-MM}:{providerId}:{threshold}";
        await _cacheService.SetAsync(cacheKey, true, TimeSpan.FromDays(31));
    }

    private async Task<bool> WasForecastAlertSentAsync()
    {
        var cacheKey = $"forecast-alert:{DateTime.UtcNow:yyyy-MM}";
        return await _cacheService.ExistsAsync(cacheKey);
    }

    private async Task MarkForecastAlertAsSentAsync()
    {
        var cacheKey = $"forecast-alert:{DateTime.UtcNow:yyyy-MM}";
        await _cacheService.SetAsync(cacheKey, true, TimeSpan.FromDays(31));
    }

    private (DateTime start, DateTime end) GetPeriodDates(BudgetPeriod period)
    {
        var now = DateTime.UtcNow;
        return period switch
        {
            BudgetPeriod.Daily => (now.Date, now.Date.AddDays(1).AddTicks(-1)),
            BudgetPeriod.Weekly => (now.AddDays(-(int)now.DayOfWeek).Date, now.AddDays(7 - (int)now.DayOfWeek - 1).Date.AddDays(1).AddTicks(-1)),
            BudgetPeriod.Monthly => (new DateTime(now.Year, now.Month, 1), new DateTime(now.Year, now.Month, 1).AddMonths(1).AddTicks(-1)),
            BudgetPeriod.Quarterly => GetQuarterDates(now),
            BudgetPeriod.Yearly => (new DateTime(now.Year, 1, 1), new DateTime(now.Year, 12, 31, 23, 59, 59)),
            _ => (now.Date, now.Date.AddDays(1).AddTicks(-1))
        };
    }

    private (DateTime start, DateTime end) GetQuarterDates(DateTime now)
    {
        var quarter = (now.Month - 1) / 3 + 1;
        var quarterStartMonth = (quarter - 1) * 3 + 1;
        var start = new DateTime(now.Year, quarterStartMonth, 1);
        var end = start.AddMonths(3).AddTicks(-1);
        return (start, end);
    }

    private async Task<decimal> GetBudgetForPeriodAsync(BudgetPeriod period)
    {
        var budget = await _context.BudgetConfigurations
            .FirstOrDefaultAsync(bc => bc.Period == period && bc.IsActive);

        return budget?.Limit ?? _budgetConfig.CurrentValue.BudgetConfiguration.MonthlyLimit;
    }
}