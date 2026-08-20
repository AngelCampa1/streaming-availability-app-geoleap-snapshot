using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Extensions;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CostManagementController : ControllerBase
{
    private readonly IApiCostTracker _costTracker;
    private readonly IBudgetManager _budgetManager;
    private readonly ICostOptimizationEngine _optimizationEngine;
    private readonly IProviderCostCalculator _costCalculator;
    private readonly ILogger<CostManagementController> _logger;

    public CostManagementController(
        IApiCostTracker costTracker,
        IBudgetManager budgetManager,
        ICostOptimizationEngine optimizationEngine,
        IProviderCostCalculator costCalculator,
        ILogger<CostManagementController> logger)
    {
        _costTracker = costTracker;
        _budgetManager = budgetManager;
        _optimizationEngine = optimizationEngine;
        _costCalculator = costCalculator;
        _logger = logger;
    }

    /// <summary>
    /// Get current budget status and utilization
    /// </summary>
    [HttpGet("budget/status")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<BudgetStatus>> GetBudgetStatus()
    {
        try
        {
            var status = await _budgetManager.GetBudgetStatusAsync();
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get budget status");
            return StatusCode(500, "An error occurred while retrieving budget status");
        }
    }

    /// <summary>
    /// Get cost breakdown for a specified period
    /// </summary>
    [HttpGet("costs/breakdown")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<List<CostBreakdown>>> GetCostBreakdown([FromQuery] int days = 30)
    {
        try
        {
            if (days < 1 || days > 365)
                return this.StandardBadRequest("Days must be between 1 and 365");

            var period = TimeSpan.FromDays(days);
            var breakdown = await _costTracker.GetCostBreakdownAsync(period);
            return Ok(breakdown);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get cost breakdown for {Days} days", days);
            return StatusCode(500, "An error occurred while retrieving cost breakdown");
        }
    }

    /// <summary>
    /// Get cost forecast for upcoming days
    /// </summary>
    [HttpGet("costs/forecast")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<CostForecast>> GetCostForecast([FromQuery] int daysAhead = 30)
    {
        try
        {
            if (daysAhead < 1 || daysAhead > 90)
                return this.StandardBadRequest("DaysAhead must be between 1 and 90");

            var forecast = await _costTracker.GenerateCostForecastAsync(daysAhead);
            return Ok(forecast);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate cost forecast for {DaysAhead} days", daysAhead);
            return StatusCode(500, "An error occurred while generating cost forecast");
        }
    }

    /// <summary>
    /// Get current month's total API costs
    /// </summary>
    [HttpGet("costs/current-month")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<decimal>> GetCurrentMonthCost([FromQuery] string? providerId = null)
    {
        try
        {
            var cost = await _costTracker.GetCurrentMonthCostAsync(providerId);
            return Ok(cost);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get current month cost for provider {ProviderId}", providerId);
            return StatusCode(500, "An error occurred while retrieving current month cost");
        }
    }

    /// <summary>
    /// Get daily API costs for a specific date
    /// </summary>
    [HttpGet("costs/daily")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<decimal>> GetDailyCost([FromQuery] DateTime date, [FromQuery] string? providerId = null)
    {
        try
        {
            if (date > DateTime.UtcNow.Date)
                return this.StandardBadRequest("Cannot retrieve costs for future dates");

            var cost = await _costTracker.GetDailyCostAsync(date, providerId);
            return Ok(cost);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get daily cost for {Date} and provider {ProviderId}", date, providerId);
            return StatusCode(500, "An error occurred while retrieving daily cost");
        }
    }

    /// <summary>
    /// Get budget utilization for a specific period
    /// </summary>
    [HttpGet("budget/utilization")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<BudgetUtilization>> GetBudgetUtilization([FromQuery] BudgetPeriod period = BudgetPeriod.Monthly)
    {
        try
        {
            var utilization = await _budgetManager.GetBudgetUtilizationAsync(period);
            return Ok(utilization);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get budget utilization for period {Period}", period);
            return StatusCode(500, "An error occurred while retrieving budget utilization");
        }
    }

    /// <summary>
    /// Check current budget thresholds and get active alerts
    /// </summary>
    [HttpGet("budget/alerts")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<List<BudgetAlert>>> CheckBudgetAlerts()
    {
        try
        {
            var alerts = await _budgetManager.CheckBudgetThresholdsAsync();
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check budget alerts");
            return StatusCode(500, "An error occurred while checking budget alerts");
        }
    }

    /// <summary>
    /// Set budget limit for a category and period
    /// </summary>
    [HttpPost("budget/limits")]
    [RequirePermission("CostManagement", "Write")]
    public async Task<ActionResult> SetBudgetLimit([FromBody] SetBudgetLimitRequest request)
    {
        try
        {
            if (request.Limit <= 0)
                return this.StandardBadRequest("Budget limit must be greater than 0");

            await _budgetManager.SetBudgetLimitAsync(request.Category, request.Limit, request.Period);
            return Ok(new { message = "Budget limit set successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set budget limit for category {Category}", request.Category);
            return StatusCode(500, "An error occurred while setting budget limit");
        }
    }

    /// <summary>
    /// Generate cost optimization recommendations
    /// </summary>
    [HttpGet("optimization/recommendations")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<List<CostOptimizationRecommendation>>> GetOptimizationRecommendations()
    {
        try
        {
            var recommendations = await _optimizationEngine.GenerateRecommendationsAsync();
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate optimization recommendations");
            return StatusCode(500, "An error occurred while generating optimization recommendations");
        }
    }

    /// <summary>
    /// Analyze the impact of a specific optimization recommendation
    /// </summary>
    [HttpPost("optimization/analyze")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<OptimizationImpactAnalysis>> AnalyzeOptimizationImpact([FromBody] CostOptimizationRecommendation recommendation)
    {
        try
        {
            var analysis = await _optimizationEngine.AnalyzeOptimizationImpactAsync(recommendation);
            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze optimization impact for recommendation {Type}", recommendation.Type);
            return StatusCode(500, "An error occurred while analyzing optimization impact");
        }
    }

    /// <summary>
    /// Mark an optimization recommendation as implemented
    /// </summary>
    [HttpPost("optimization/recommendations/{recommendationId}/implement")]
    [RequirePermission("CostManagement", "Write")]
    public async Task<ActionResult> MarkRecommendationImplemented(Guid recommendationId)
    {
        try
        {
            await _optimizationEngine.MarkRecommendationAsImplementedAsync(recommendationId);
            return Ok(new { message = "Recommendation marked as implemented" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark recommendation {Id} as implemented", recommendationId);
            return StatusCode(500, "An error occurred while marking recommendation as implemented");
        }
    }

    /// <summary>
    /// Compare costs across different providers for a specific endpoint
    /// </summary>
    [HttpGet("providers/comparison")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<ProviderCostComparison>> CompareProviderCosts([FromQuery] string endpoint, [FromQuery] int days = 30)
    {
        try
        {
            if (days < 1 || days > 90)
                return this.StandardBadRequest("Days must be between 1 and 90");

            var period = TimeSpan.FromDays(days);
            var comparison = await _costCalculator.CompareProviderCostsAsync(endpoint, period);
            return Ok(comparison);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to compare provider costs for endpoint {Endpoint}", endpoint);
            return StatusCode(500, "An error occurred while comparing provider costs");
        }
    }

    /// <summary>
    /// Check if an API call can be made within budget constraints
    /// </summary>
    [HttpPost("budget/check")]
    [RequirePermission("CostManagement", "Read")]
    public async Task<ActionResult<BudgetCheckResponse>> CheckBudgetForApiCall([FromBody] BudgetCheckRequest request)
    {
        try
        {
            if (request.EstimatedCost < 0)
                return this.StandardBadRequest("Estimated cost cannot be negative");

            var canMakeCall = await _budgetManager.CanMakeApiCallAsync(request.ProviderId, request.EstimatedCost);
            
            var response = new BudgetCheckResponse
            {
                CanMakeCall = canMakeCall,
                ProviderId = request.ProviderId,
                EstimatedCost = request.EstimatedCost,
                CheckedAt = DateTime.UtcNow,
                Reason = canMakeCall ? "Within budget limits" : "Would exceed budget limits"
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check budget for API call to provider {ProviderId}", request.ProviderId);
            return StatusCode(500, "An error occurred while checking budget constraints");
        }
    }
}

// DTOs
public class SetBudgetLimitRequest
{
    public string Category { get; set; } = string.Empty;
    public decimal Limit { get; set; }
    public BudgetPeriod Period { get; set; }
}

public class BudgetCheckRequest
{
    public string ProviderId { get; set; } = string.Empty;
    public decimal EstimatedCost { get; set; }
}

public class BudgetCheckResponse
{
    public bool CanMakeCall { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public decimal EstimatedCost { get; set; }
    public DateTime CheckedAt { get; set; }
    public string Reason { get; set; } = string.Empty;
}