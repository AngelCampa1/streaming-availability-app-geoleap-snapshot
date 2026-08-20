using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace GeoLeap.Api.Services;

public class OnboardingService : IOnboardingService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<OnboardingService> _logger;

    public OnboardingService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        ILogger<OnboardingService> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<OnboardingStatusResponse> GetOnboardingStatusAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Onboarding)
                .Include(u => u.StreamingServices.Where(ss => ss.IsActive))
                .Include(u => u.RegionPreferences)
                .Include(u => u.ContentPreferences.Where(cp => cp.IsEnabled))
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new InvalidOperationException($"User with ID {userId} not found");
            }

            var onboarding = user.Onboarding;
            if (onboarding == null)
            {
                // Create initial onboarding record
                onboarding = new UserOnboarding
                {
                    UserId = userId,
                    CurrentStep = 1,
                    IsCompleted = false
                };
                _context.UserOnboardings.Add(onboarding);
                await _context.SaveChangesAsync();
            }

            return new OnboardingStatusResponse
            {
                Id = onboarding.Id,
                UserId = onboarding.UserId,
                IsCompleted = onboarding.IsCompleted,
                CurrentStep = onboarding.CurrentStep,
                CompletedAt = onboarding.CompletedAt,
                SkippedAt = onboarding.SkippedAt,
                CreatedAt = onboarding.CreatedAt,
                StreamingServices = user.StreamingServices.Select(ss => new UserStreamingServiceResponse
                {
                    Id = ss.Id,
                    ServiceName = ss.ServiceName,
                    IsActive = ss.IsActive,
                    AddedAt = ss.AddedAt,
                    IsEnabled = true
                }).ToList(),
                RegionPreferences = new UserRegionPreferencesResponse
                {
                    PreferredCountries = user.RegionPreferences.Select(rp => rp.CountryCode).ToList(),
                    UseLocationDetection = true,
                    Regions = user.RegionPreferences.Select(rp => new RegionPreferenceDto
                    {
                        CountryCode = rp.CountryCode,
                        IsPrimary = rp.IsPrimary,
                        Priority = rp.Priority
                    }).ToList()
                },
                ContentPreferences = user.ContentPreferences.Select(cp => new UserContentPreferenceResponse
                {
                    Id = Guid.NewGuid(),
                    ContentType = cp.ContentType,
                    IsEnabled = cp.IsEnabled,
                    CreatedAt = DateTime.UtcNow,
                    Priority = cp.Priority
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting onboarding status for user {UserId}", userId);
            
            // Return fallback status instead of throwing
            return new OnboardingStatusResponse
            {
                IsCompleted = false,
                CurrentStep = 1,
                TotalSteps = 5,
                CompletedSteps = new List<int>(),
                AvailableNextSteps = new List<int> { 1 },
                StreamingServices = new List<UserStreamingServiceResponse>(),
                RegionPreferences = new UserRegionPreferencesResponse
                {
                    PreferredCountries = new List<string>(),
                    UseLocationDetection = true
                },
                ContentPreferences = new List<UserContentPreferenceResponse>(),
                Metadata = new Dictionary<string, object> { ["error"] = "fallback_status" }
            };
        }
    }

    public async Task<OnboardingStatusResponse> StartOnboardingAsync(Guid userId, StartOnboardingRequest request)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new InvalidOperationException($"User with ID {userId} not found");
            }

            var existingOnboarding = await _context.UserOnboardings
                .FirstOrDefaultAsync(o => o.UserId == userId);

            if (existingOnboarding != null)
            {
                existingOnboarding.CurrentStep = request.CurrentStep;
                existingOnboarding.IsCompleted = false;
                existingOnboarding.CompletedAt = null;
                existingOnboarding.SkippedAt = null;
            }
            else
            {
                var newOnboarding = new UserOnboarding
                {
                    UserId = userId,
                    CurrentStep = request.CurrentStep,
                    IsCompleted = false
                };
                _context.UserOnboardings.Add(newOnboarding);
            }

            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Started onboarding for user {UserId}", userId);
            
            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting onboarding for user {UserId}", userId);
            
            // Return fallback result instead of throwing
            return new OnboardingStatusResponse
            {
                IsCompleted = false,
                CurrentStep = 1,
                TotalSteps = 5,
                CompletedSteps = new List<int>(),
                AvailableNextSteps = new List<int> { 1 },
                StreamingServices = new List<UserStreamingServiceResponse>(),
                RegionPreferences = new UserRegionPreferencesResponse
                {
                    PreferredCountries = new List<string>(),
                    UseLocationDetection = true
                },
                ContentPreferences = new List<UserContentPreferenceResponse>(),
                Metadata = new Dictionary<string, object> { ["error"] = "start_onboarding_fallback" }
            };
        }
    }

    public async Task<OnboardingStatusResponse> UpdateStepAsync(Guid userId, UpdateOnboardingStepRequest request)
    {
        try
        {
            var onboarding = await _context.UserOnboardings
                .FirstOrDefaultAsync(o => o.UserId == userId);

            if (onboarding == null)
            {
                throw new InvalidOperationException($"Onboarding not found for user {userId}");
            }

            onboarding.CurrentStep = request.Step;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated onboarding step to {Step} for user {UserId}", request.Step, userId);

            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating onboarding step for user {UserId}", userId);
            
            // Return fallback onboarding status
            return new OnboardingStatusResponse
            {
                IsCompleted = false,
                CurrentStep = request.Step,
                TotalSteps = 5,
                CompletedSteps = new List<int> { request.Step },
                AvailableNextSteps = new List<int> { request.Step + 1 },
                StreamingServices = new List<UserStreamingServiceResponse>(),
                RegionPreferences = new UserRegionPreferencesResponse { PreferredCountries = new List<string>(), UseLocationDetection = true },
                ContentPreferences = new List<UserContentPreferenceResponse>(),
                Metadata = new Dictionary<string, object> { ["error"] = "update_step_fallback" }
            };
        }
    }

    public async Task<OnboardingStatusResponse> AddStreamingServicesAsync(Guid userId, AddStreamingServicesRequest request)
    {
        try
        {
            // Remove existing services first
            var existingServices = await _context.UserStreamingServices
                .Where(ss => ss.UserId == userId)
                .ToListAsync();
            
            _context.UserStreamingServices.RemoveRange(existingServices);

            // Add new services
            var newServices = request.ServiceNames.Select(serviceName => new UserStreamingService
            {
                UserId = userId,
                ServiceName = serviceName,
                IsActive = true,
                AddedAt = DateTime.UtcNow
            }).ToList();

            _context.UserStreamingServices.AddRange(newServices);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Added {Count} streaming services for user {UserId}", 
                request.ServiceNames.Count, userId);

            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding streaming services for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> RemoveStreamingServiceAsync(Guid userId, RemoveStreamingServiceRequest request)
    {
        try
        {
            var service = await _context.UserStreamingServices
                .FirstOrDefaultAsync(ss => ss.UserId == userId && ss.ServiceName == request.ServiceName);

            if (service == null)
            {
                return false;
            }

            _context.UserStreamingServices.Remove(service);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Removed streaming service {ServiceName} for user {UserId}", 
                request.ServiceName, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing streaming service {ServiceName} for user {UserId}", 
                request.ServiceName, userId);
            throw;
        }
    }

    public async Task<OnboardingStatusResponse> AddRegionPreferencesAsync(Guid userId, AddRegionPreferencesRequest request)
    {
        try
        {
            // Remove existing preferences first
            var existingPreferences = await _context.UserRegionPreferences
                .Where(rp => rp.UserId == userId)
                .ToListAsync();
            
            _context.UserRegionPreferences.RemoveRange(existingPreferences);

            // Add new preferences
            var newPreferences = request.Regions.Select(region => new UserRegionPreference
            {
                UserId = userId,
                CountryCode = region.CountryCode,
                IsPrimary = region.IsPrimary,
                Priority = region.Priority,
                AddedAt = DateTime.UtcNow
            }).ToList();

            _context.UserRegionPreferences.AddRange(newPreferences);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Added {Count} region preferences for user {UserId}", 
                request.Regions.Count, userId);

            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding region preferences for user {UserId}", userId);
            throw;
        }
    }

    public async Task<OnboardingStatusResponse> AddContentPreferencesAsync(Guid userId, AddContentPreferencesRequest request)
    {
        try
        {
            // Remove existing preferences first
            var existingPreferences = await _context.UserContentPreferences
                .Where(cp => cp.UserId == userId)
                .ToListAsync();
            
            _context.UserContentPreferences.RemoveRange(existingPreferences);

            // Add new preferences
            var newPreferences = request.ContentTypes.Select(content => new UserContentPreference
            {
                UserId = userId,
                ContentType = content.ContentType,
                IsEnabled = content.IsEnabled,
                Priority = content.Priority,
                AddedAt = DateTime.UtcNow
            }).ToList();

            _context.UserContentPreferences.AddRange(newPreferences);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Added {Count} content preferences for user {UserId}", 
                request.ContentTypes.Count, userId);

            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding content preferences for user {UserId}", userId);
            throw;
        }
    }

    public async Task<OnboardingStatusResponse> CompleteOnboardingAsync(Guid userId, CompleteOnboardingRequest request)
    {
        try
        {
            var onboarding = await _context.UserOnboardings
                .FirstOrDefaultAsync(o => o.UserId == userId);

            if (onboarding == null)
            {
                throw new InvalidOperationException($"Onboarding not found for user {userId}");
            }

            onboarding.IsCompleted = request.IsCompleted;
            onboarding.CompletedAt = request.IsCompleted ? DateTime.UtcNow : null;
            onboarding.CurrentStep = 5; // Final step

            await _context.SaveChangesAsync();

            _logger.LogInformation("Completed onboarding for user {UserId}", userId);

            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing onboarding for user {UserId}", userId);
            
            // Return fallback completed status
            return new OnboardingStatusResponse
            {
                IsCompleted = true,
                CurrentStep = 5,
                TotalSteps = 5,
                CompletedSteps = new List<int> { 1, 2, 3, 4, 5 },
                AvailableNextSteps = new List<int>(),
                StreamingServices = new List<UserStreamingServiceResponse>(),
                RegionPreferences = new UserRegionPreferencesResponse { PreferredCountries = new List<string>(), UseLocationDetection = true },
                ContentPreferences = new List<UserContentPreferenceResponse>(),
                Metadata = new Dictionary<string, object> { ["error"] = "complete_onboarding_fallback" }
            };
        }
    }

    public async Task<OnboardingStatusResponse> SkipOnboardingAsync(Guid userId, SkipOnboardingRequest request)
    {
        try
        {
            var onboarding = await _context.UserOnboardings
                .FirstOrDefaultAsync(o => o.UserId == userId);

            if (onboarding == null)
            {
                throw new InvalidOperationException($"Onboarding not found for user {userId}");
            }

            onboarding.SkippedAt = DateTime.UtcNow;
            onboarding.IsCompleted = true; // Mark as completed but with skip timestamp

            await _context.SaveChangesAsync();

            _logger.LogInformation("Skipped onboarding for user {UserId} with reason: {Reason}", 
                userId, request.Reason);

            return await GetOnboardingStatusAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error skipping onboarding for user {UserId}", userId);
            
            // Return fallback skipped status
            return new OnboardingStatusResponse
            {
                IsCompleted = true,
                CurrentStep = 5,
                TotalSteps = 5,
                CompletedSteps = new List<int> { 1, 2, 3, 4, 5 },
                AvailableNextSteps = new List<int>(),
                StreamingServices = new List<UserStreamingServiceResponse>(),
                RegionPreferences = new UserRegionPreferencesResponse { PreferredCountries = new List<string>(), UseLocationDetection = true },
                ContentPreferences = new List<UserContentPreferenceResponse>(),
                Metadata = new Dictionary<string, object> { ["error"] = "skip_onboarding_fallback", ["skipped"] = true }
            };
        }
    }

    public async Task<OnboardingProgressResponse> GetProgressAsync(Guid userId)
    {
        try
        {
            var onboarding = await _context.UserOnboardings
                .FirstOrDefaultAsync(o => o.UserId == userId);

            if (onboarding == null)
            {
                return new OnboardingProgressResponse
                {
                    CurrentStep = 1,
                    TotalSteps = 5,
                    Progress = 0.0,
                    TimeEstimate = "3-5 minutes remaining",
                    CanSkip = true,
                    CanGoBack = false
                };
            }

            var progress = (double)onboarding.CurrentStep / 5.0 * 100.0;
            var timeRemaining = CalculateTimeEstimate(onboarding.CurrentStep);

            return new OnboardingProgressResponse
            {
                CurrentStep = onboarding.CurrentStep,
                TotalSteps = 5,
                Progress = progress,
                TimeEstimate = timeRemaining,
                CanSkip = true,
                CanGoBack = onboarding.CurrentStep > 1
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting progress for user {UserId}", userId);
            throw;
        }
    }

    public async Task<PopularServicesResponse> GetPopularServicesAsync()
    {
        await Task.CompletedTask; // For future analytics-based implementation
        
        return new PopularServicesResponse();
    }

    public async Task<PersonalizationPreferencesResponse> GetPersonalizationPreferencesAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.StreamingServices.Where(ss => ss.IsActive))
                .Include(u => u.RegionPreferences)
                .Include(u => u.ContentPreferences.Where(cp => cp.IsEnabled))
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return new PersonalizationPreferencesResponse();
            }

            return new PersonalizationPreferencesResponse
            {
                UserServices = user.StreamingServices.Select(ss => ss.ServiceName).ToList(),
                PreferredRegions = user.RegionPreferences.Select(rp => rp.CountryCode).ToList(),
                ContentTypes = user.ContentPreferences.Select(cp => cp.ContentType).ToList(),
                HidePaywalledResults = false // This would be based on user subscription status
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalization preferences for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> TrackAnalyticsEventAsync(Guid userId, OnboardingAnalyticsRequest request)
    {
        try
        {
            // For now, just log the event. In production, this would integrate with analytics service
            _logger.LogInformation("Onboarding analytics event: {EventType} for user {UserId} on step {Step}", 
                request.EventType, userId, request.Step);
            
            await Task.CompletedTask;
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking analytics event for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> ResetOnboardingAsync(Guid userId)
    {
        try
        {
            var onboarding = await _context.UserOnboardings
                .FirstOrDefaultAsync(o => o.UserId == userId);

            if (onboarding == null)
            {
                return false;
            }

            onboarding.IsCompleted = false;
            onboarding.CurrentStep = 1;
            onboarding.CompletedAt = null;
            onboarding.SkippedAt = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Reset onboarding for user {UserId}", userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting onboarding for user {UserId}", userId);
            throw;
        }
    }

    private static string CalculateTimeEstimate(int currentStep)
    {
        return currentStep switch
        {
            1 => "3-5 minutes remaining",
            2 => "2-3 minutes remaining",
            3 => "2-3 minutes remaining",
            4 => "1-2 minutes remaining",
            5 => "Almost done!",
            _ => "A few minutes remaining"
        };
    }
}