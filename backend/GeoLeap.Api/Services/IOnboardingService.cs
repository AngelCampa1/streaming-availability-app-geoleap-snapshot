using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IOnboardingService
{
    Task<OnboardingStatusResponse> GetOnboardingStatusAsync(Guid userId);
    Task<OnboardingStatusResponse> StartOnboardingAsync(Guid userId, StartOnboardingRequest request);
    Task<OnboardingStatusResponse> UpdateStepAsync(Guid userId, UpdateOnboardingStepRequest request);
    Task<OnboardingStatusResponse> AddStreamingServicesAsync(Guid userId, AddStreamingServicesRequest request);
    Task<bool> RemoveStreamingServiceAsync(Guid userId, RemoveStreamingServiceRequest request);
    Task<OnboardingStatusResponse> AddRegionPreferencesAsync(Guid userId, AddRegionPreferencesRequest request);
    Task<OnboardingStatusResponse> AddContentPreferencesAsync(Guid userId, AddContentPreferencesRequest request);
    Task<OnboardingStatusResponse> CompleteOnboardingAsync(Guid userId, CompleteOnboardingRequest request);
    Task<OnboardingStatusResponse> SkipOnboardingAsync(Guid userId, SkipOnboardingRequest request);
    Task<OnboardingProgressResponse> GetProgressAsync(Guid userId);
    Task<PopularServicesResponse> GetPopularServicesAsync();
    Task<PersonalizationPreferencesResponse> GetPersonalizationPreferencesAsync(Guid userId);
    Task<bool> TrackAnalyticsEventAsync(Guid userId, OnboardingAnalyticsRequest request);
    Task<bool> ResetOnboardingAsync(Guid userId);
}