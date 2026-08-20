using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GrowthAnalytics;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// A/B testing service implementation with statistical analysis
/// </summary>
public class AbTestingService : IAbTestingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AbTestingService> _logger;
    
    public AbTestingService(ApplicationDbContext context, ILogger<AbTestingService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task<AbTestExperiment> CreateExperimentAsync(AbTestExperiment experiment)
    {
        try
        {
            // Validate traffic splits sum to 100%
            var totalSplit = experiment.Variants.Sum(v => v.TrafficSplit);
            if (Math.Abs(totalSplit - 100) > 0.01m)
            {
                throw new ArgumentException($"Variant traffic splits must sum to 100%, got {totalSplit}%");
            }
            
            experiment.CreatedAt = DateTime.UtcNow;
            experiment.UpdatedAt = DateTime.UtcNow;
            
            _context.AbTestExperiments.Add(experiment);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Created A/B test experiment: {ExperimentName} with {VariantCount} variants", 
                experiment.Name, experiment.Variants.Count);
            
            return experiment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create A/B test experiment: {ExperimentName}", experiment.Name);
            throw;
        }
    }
    
    public async Task<AbTestAssignment> AssignUserToVariantAsync(Guid experimentId, string userId)
    {
        try
        {
            // Check if user already assigned
            var existingAssignment = await _context.AbTestAssignments
                .FirstOrDefaultAsync(a => a.ExperimentId == experimentId && a.UserId == userId);
            
            if (existingAssignment != null)
            {
                return existingAssignment;
            }
            
            var experiment = await _context.AbTestExperiments
                .Include(e => e.Variants)
                .FirstOrDefaultAsync(e => e.Id == experimentId);
            
            if (experiment == null || experiment.Status != ExperimentStatus.Active)
            {
                throw new ArgumentException($"Experiment {experimentId} not found or not active");
            }
            
            // Determine if user should be included (traffic allocation)
            var hash = GenerateUserHash(userId, experimentId);
            var trafficPercentile = (hash % 100) + 1;
            
            if (trafficPercentile > experiment.TrafficAllocation)
            {
                // User not in traffic allocation
                return null;
            }
            
            // Assign to variant based on traffic split
            var variantHash = GenerateUserHash(userId + experimentId.ToString(), experimentId);
            var variantPercentile = (variantHash % 100) + 1;
            
            decimal cumulative = 0;
            AbTestVariant? selectedVariant = null;
            
            foreach (var variant in experiment.Variants.OrderBy(v => v.Name))
            {
                cumulative += variant.TrafficSplit;
                if (variantPercentile <= cumulative)
                {
                    selectedVariant = variant;
                    break;
                }
            }
            
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions on fallback variant selection
            if (selectedVariant == null)
            {
                selectedVariant = experiment.Variants.FirstOrDefault();
                if (selectedVariant == null)
                {
                    throw new InvalidOperationException($"Experiment {experimentId} has no variants");
                }
            }
            
            var assignment = new AbTestAssignment
            {
                ExperimentId = experimentId,
                VariantId = selectedVariant.Id,
                UserId = userId,
                AssignedAt = DateTime.UtcNow
            };
            
            _context.AbTestAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            
            _logger.LogDebug("Assigned user {UserId} to variant {VariantName} in experiment {ExperimentName}", 
                userId, selectedVariant.Name, experiment.Name);
            
            return assignment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to assign user {UserId} to experiment {ExperimentId}", userId, experimentId);
            throw;
        }
    }
    
    public async Task<AbTestAssignment?> GetUserAssignmentAsync(Guid experimentId, string userId)
    {
        return await _context.AbTestAssignments
            .Include(a => a.Conversions)
            .FirstOrDefaultAsync(a => a.ExperimentId == experimentId && a.UserId == userId);
    }
    
    public async Task<bool> TrackConversionAsync(Guid experimentId, string userId, string conversionEvent, decimal? value = null)
    {
        try
        {
            var assignment = await GetUserAssignmentAsync(experimentId, userId);
            if (assignment == null)
            {
                return false; // User not in experiment
            }
            
            // Check if conversion already tracked
            var existingConversion = assignment.Conversions
                .FirstOrDefault(c => c.ConversionEvent == conversionEvent);
            
            if (existingConversion != null)
            {
                return true; // Already tracked
            }
            
            var conversion = new AbTestConversion
            {
                AssignmentId = assignment.Id,
                ConversionEvent = conversionEvent,
                Value = value,
                ConvertedAt = DateTime.UtcNow
            };
            
            _context.AbTestConversions.Add(conversion);
            await _context.SaveChangesAsync();
            
            _logger.LogDebug("Tracked conversion {ConversionEvent} for user {UserId} in experiment {ExperimentId}", 
                conversionEvent, userId, experimentId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track conversion for user {UserId} in experiment {ExperimentId}", 
                userId, experimentId);
            return false;
        }
    }
    
    public async Task<AbTestResults> GetExperimentResultsAsync(Guid experimentId)
    {
        try
        {
            var experiment = await _context.AbTestExperiments
                .Include(e => e.Variants)
                .FirstOrDefaultAsync(e => e.Id == experimentId);
            
            if (experiment == null)
            {
                throw new ArgumentException($"Experiment {experimentId} not found");
            }
            
            var assignments = await _context.AbTestAssignments
                .Include(a => a.Conversions)
                .Where(a => a.ExperimentId == experimentId)
                .ToListAsync();
            
            var results = new AbTestResults
            {
                ExperimentId = experimentId,
                ExperimentName = experiment.Name,
                TotalParticipants = assignments.Count,
                CalculatedAt = DateTime.UtcNow
            };
            
            foreach (var variant in experiment.Variants)
            {
                var variantAssignments = assignments.Where(a => a.VariantId == variant.Id).ToList();
                var conversions = variantAssignments.SelectMany(a => a.Conversions).ToList();
                
                var variantResult = new VariantResults
                {
                    VariantId = variant.Id,
                    VariantName = variant.Name,
                    Participants = variantAssignments.Count,
                    Conversions = conversions.Count,
                    ConversionRate = variantAssignments.Count > 0 ? 
                        (decimal)conversions.Count / variantAssignments.Count * 100 : 0,
                    AverageValue = conversions.Where(c => c.Value.HasValue).Average(c => c.Value)
                };
                
                results.VariantResults.Add(variantResult);
            }
            
            // Calculate statistical significance (simplified)
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when getting control variant
            if (results.VariantResults.Count >= 2)
            {
                var control = results.VariantResults.FirstOrDefault(v => v.VariantName.Contains("control", StringComparison.OrdinalIgnoreCase))
                    ?? results.VariantResults.FirstOrDefault();
                var treatment = results.VariantResults.FirstOrDefault(v => control != null && v.VariantId != control.VariantId);
                
                if (treatment != null && control.Participants > 30 && treatment.Participants > 30)
                {
                    results.StatisticalSignificance = CalculateStatisticalSignificance(control, treatment);
                    results.IsSignificant = results.StatisticalSignificance > 0.95;
                    
                    // Calculate lift
                    if (control.ConversionRate > 0)
                    {
                        treatment.Lift = ((treatment.ConversionRate - control.ConversionRate) / control.ConversionRate) * 100;
                    }
                }
            }
            
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get results for experiment {ExperimentId}", experimentId);
            throw;
        }
    }
    
    public async Task<IEnumerable<AbTestExperiment>> GetActiveExperimentsAsync()
    {
        return await _context.AbTestExperiments
            .Include(e => e.Variants)
            .Where(e => e.Status == ExperimentStatus.Active)
            .Where(e => e.StartDate <= DateTime.UtcNow)
            .Where(e => e.EndDate == null || e.EndDate > DateTime.UtcNow)
            .ToListAsync();
    }
    
    public async Task<bool> UpdateExperimentStatusAsync(Guid experimentId, ExperimentStatus status)
    {
        try
        {
            var experiment = await _context.AbTestExperiments
                .FirstOrDefaultAsync(e => e.Id == experimentId);
            
            if (experiment == null)
            {
                return false;
            }
            
            experiment.Status = status;
            experiment.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Updated experiment {ExperimentName} status to {Status}", 
                experiment.Name, status);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update experiment {ExperimentId} status", experimentId);
            return false;
        }
    }
    
    private int GenerateUserHash(string input, Guid salt)
    {
        // Simple hash function for deterministic assignment
        var combined = input + salt.ToString();
        return Math.Abs(combined.GetHashCode());
    }
    
    private double CalculateStatisticalSignificance(VariantResults control, VariantResults treatment)
    {
        // Simplified Z-test for proportions
        if (control.Participants == 0 || treatment.Participants == 0)
            return 0;
        
        var p1 = (double)control.ConversionRate / 100;
        var p2 = (double)treatment.ConversionRate / 100;
        var n1 = control.Participants;
        var n2 = treatment.Participants;
        
        var pooledP = ((p1 * n1) + (p2 * n2)) / (n1 + n2);
        var se = Math.Sqrt(pooledP * (1 - pooledP) * ((1.0 / n1) + (1.0 / n2)));
        
        if (se == 0) return 0;
        
        var z = Math.Abs((p1 - p2) / se);
        
        // Approximate p-value to confidence level conversion
        // This is simplified - in production use proper statistical libraries
        return 1 - (2 * (1 - NormalCdf(z)));
    }
    
    private double NormalCdf(double z)
    {
        // Simplified normal CDF approximation
        return 0.5 * (1 + Erf(z / Math.Sqrt(2)));
    }
    
    private double Erf(double x)
    {
        // Simplified error function approximation
        const double a1 = 0.254829592;
        const double a2 = -0.284496736;
        const double a3 = 1.421413741;
        const double a4 = -1.453152027;
        const double a5 = 1.061405429;
        const double p = 0.3275911;
        
        var sign = Math.Sign(x);
        x = Math.Abs(x);
        
        var t = 1.0 / (1.0 + p * x);
        var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.Exp(-x * x);
        
        return sign * y;
    }
}