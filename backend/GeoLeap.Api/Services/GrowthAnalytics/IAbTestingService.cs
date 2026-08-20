using GeoLeap.Api.Models.GrowthAnalytics;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Service for A/B testing and experimentation
/// </summary>
public interface IAbTestingService
{
    /// <summary>
    /// Create a new A/B test experiment
    /// </summary>
    Task<AbTestExperiment> CreateExperimentAsync(AbTestExperiment experiment);
    
    /// <summary>
    /// Assign user to a test variant
    /// </summary>
    Task<AbTestAssignment> AssignUserToVariantAsync(Guid experimentId, string userId);
    
    /// <summary>
    /// Get user's current assignment for an experiment
    /// </summary>
    Task<AbTestAssignment?> GetUserAssignmentAsync(Guid experimentId, string userId);
    
    /// <summary>
    /// Track conversion event for A/B test
    /// </summary>
    Task<bool> TrackConversionAsync(Guid experimentId, string userId, string conversionEvent, decimal? value = null);
    
    /// <summary>
    /// Get experiment results and statistics
    /// </summary>
    Task<AbTestResults> GetExperimentResultsAsync(Guid experimentId);
    
    /// <summary>
    /// Get all active experiments
    /// </summary>
    Task<IEnumerable<AbTestExperiment>> GetActiveExperimentsAsync();
    
    /// <summary>
    /// Update experiment status
    /// </summary>
    Task<bool> UpdateExperimentStatusAsync(Guid experimentId, ExperimentStatus status);
}