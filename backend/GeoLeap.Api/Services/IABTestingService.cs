using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IABTestingService
{
    Task<string> CreateABTestAsync(CreateABTestRequest request, string createdBy, CancellationToken cancellationToken = default);
    
    Task<ABTest?> GetABTestAsync(string testId, CancellationToken cancellationToken = default);
    
    Task<List<ABTest>> GetActiveABTestsAsync(CancellationToken cancellationToken = default);
    
    Task<ABTestAssignmentResult> AssignUserToTestAsync(string userId, string sessionId, CancellationToken cancellationToken = default);
    
    Task<ABTestAssignmentResult?> GetUserAssignmentAsync(string userId, CancellationToken cancellationToken = default);
    
    Task RecordABTestResultAsync(Models.ABTestResult result, CancellationToken cancellationToken = default);
    
    Task<ABTestMetrics> GetABTestMetricsAsync(string testId, CancellationToken cancellationToken = default);
    
    Task<bool> StartABTestAsync(string testId, CancellationToken cancellationToken = default);
    
    Task<bool> PauseABTestAsync(string testId, CancellationToken cancellationToken = default);
    
    Task<bool> CompleteABTestAsync(string testId, CancellationToken cancellationToken = default);
    
    Task<bool> DeleteABTestAsync(string testId, CancellationToken cancellationToken = default);
    
    Task<List<Models.ABTestResult>> GetABTestResultsAsync(string testId, DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);
    
    Task<RankingConfiguration> GetRankingConfigurationForUserAsync(string userId, CancellationToken cancellationToken = default);
    
    // Additional methods expected by tests
    Task<ABExperiment> CreateExperimentAsync(CreateExperimentRequest request, CancellationToken cancellationToken = default);
    Task<bool> StartExperimentAsync(Guid experimentId, CancellationToken cancellationToken = default);
    Task<bool> StopExperimentAsync(Guid experimentId, string? reason = null, CancellationToken cancellationToken = default);
    Task<List<Models.ABTestResult>> GetExperimentResultsAsync(string testId, CancellationToken cancellationToken = default);
    Task<bool> ShouldUserParticipateAsync(string userId, string testId, CancellationToken cancellationToken = default);
    Task<List<ABTest>> GetRunningExperimentsAsync(string? userId = null, CancellationToken cancellationToken = default);
}