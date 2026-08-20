using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services
{
    public class ChangeDetector : IChangeDetector
    {
        private readonly ILogger<ChangeDetector> _logger;

        public ChangeDetector(ILogger<ChangeDetector> logger)
        {
            _logger = logger;
        }

        public async Task<bool> HasChangesAsync(object? currentData, object? newData)
        {
            if (currentData == null && newData == null) return false;
            if (currentData == null || newData == null) return true;

            try
            {
                var analysis = await AnalyzeChangesAsync(currentData, newData, string.Empty, ContentType.Unknown);
                return analysis.HasSignificantChanges;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing changes between current and new data");
                return true; // Assume changes exist if we can't analyze
            }
        }

        public async Task<ChangeAnalysis> AnalyzeChangesAsync(object? currentData, object? newData, string contentId, ContentType contentType)
        {
            var analysis = new ChangeAnalysis
            {
                ContentId = contentId,
                ContentType = contentType
            };

            try
            {
                if (currentData == null && newData == null)
                {
                    return analysis;
                }

                if (currentData == null || newData == null)
                {
                    analysis.HasSignificantChanges = true;
                    analysis.Changes.Add(new DataChange
                    {
                        Type = ChangeType.MetadataUpdated,
                        Count = 1,
                        Description = currentData == null ? "New data added" : "Data removed",
                        Details = new List<string> { currentData == null ? "New content added" : "Content removed" }
                    });
                    return analysis;
                }

                // Handle different data types
                if (currentData is StreamingAvailabilityResponse currentStreaming && 
                    newData is StreamingAvailabilityResponse newStreaming)
                {
                    analysis = await AnalyzeStreamingChangesAsync(currentStreaming, newStreaming, contentId, contentType);
                }
                else if (currentData is ContentMetadata currentMetadata && 
                         newData is ContentMetadata newMetadata)
                {
                    analysis = await AnalyzeMetadataChangesAsync(currentMetadata, newMetadata, contentId, contentType);
                }
                else if (currentData is UnifiedContentResponse currentUnified &&
                         newData is UnifiedContentResponse newUnified)
                {
                    analysis = await AnalyzeUnifiedContentChangesAsync(currentUnified, newUnified, contentId, contentType);
                }
                else
                {
                    // Generic object comparison
                    analysis = await AnalyzeGenericChangesAsync(currentData, newData, contentId, contentType);
                }

                _logger.LogDebug("Change analysis completed for content {ContentId}. Has changes: {HasChanges}, Change count: {ChangeCount}",
                    contentId, analysis.HasSignificantChanges, analysis.Changes.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during change analysis for content {ContentId}", contentId);
                analysis.HasSignificantChanges = true; // Assume changes exist if we can't analyze
                analysis.Changes.Add(new DataChange
                {
                    Type = ChangeType.MetadataUpdated,
                    Count = 1,
                    Description = "Error analyzing changes - forcing update",
                    Details = new List<string> { $"Analysis error: {ex.Message}" }
                });
            }

            return analysis;
        }

        private async Task<ChangeAnalysis> AnalyzeStreamingChangesAsync(StreamingAvailabilityResponse current, StreamingAvailabilityResponse updated, string contentId, ContentType contentType)
        {
            var analysis = new ChangeAnalysis
            {
                ContentId = contentId,
                ContentType = contentType
            };

            var currentOptions = current.StreamingOptions?.ToList() ?? new List<StreamingOption>();
            var newOptions = updated.StreamingOptions?.ToList() ?? new List<StreamingOption>();

            // Check for new streaming services
            var newServices = newOptions
                .Where(no => !currentOptions.Any(co => co.ServiceId == no.ServiceId && co.CountryCode == no.CountryCode))
                .ToList();

            // Check for removed streaming services
            var removedServices = currentOptions
                .Where(co => !newOptions.Any(no => no.ServiceId == co.ServiceId && no.CountryCode == co.CountryCode))
                .ToList();

            // Check for price changes
            var priceChanges = newOptions
                .Where(no => currentOptions.Any(co => 
                    co.ServiceId == no.ServiceId && 
                    co.CountryCode == no.CountryCode && 
                    Math.Abs((co.Price ?? 0.0m) - (no.Price ?? 0.0m)) > 0.01m))
                .ToList();

            if (newServices.Any())
            {
                analysis.Changes.Add(new DataChange
                {
                    Type = ChangeType.StreamingServiceAdded,
                    Count = newServices.Count,
                    Description = $"{newServices.Count} new streaming options added",
                    Details = newServices.Select(s => $"{s.ServiceName} in {s.CountryCode}").ToList()
                });
            }

            if (removedServices.Any())
            {
                analysis.Changes.Add(new DataChange
                {
                    Type = ChangeType.StreamingServiceRemoved,
                    Count = removedServices.Count,
                    Description = $"{removedServices.Count} streaming options removed",
                    Details = removedServices.Select(s => $"{s.ServiceName} in {s.CountryCode}").ToList()
                });
            }

            if (priceChanges.Any())
            {
                analysis.Changes.Add(new DataChange
                {
                    Type = ChangeType.PriceChanged,
                    Count = priceChanges.Count,
                    Description = $"{priceChanges.Count} price changes detected",
                    Details = priceChanges.Select(s => $"{s.ServiceName}: ${s.Price}").ToList()
                });
            }

            // Determine if changes are significant
            analysis.HasSignificantChanges = newServices.Any() || removedServices.Any() || priceChanges.Any();

            return await Task.FromResult(analysis);
        }

        private async Task<ChangeAnalysis> AnalyzeMetadataChangesAsync(ContentMetadata current, ContentMetadata updated, string contentId, ContentType contentType)
        {
            var analysis = new ChangeAnalysis
            {
                ContentId = contentId,
                ContentType = contentType
            };

            var changes = new List<DataChange>();

            // Check for title changes
            if (!string.Equals(current.Title, updated.Title, StringComparison.OrdinalIgnoreCase))
            {
                changes.Add(new DataChange
                {
                    Type = ChangeType.TitleChanged,
                    Count = 1,
                    Description = "Title changed",
                    Details = new List<string> { $"'{current.Title}' -> '{updated.Title}'" }
                });
            }

            // Check for rating changes
            if (Math.Abs((current.VoteAverage ?? 0) - (updated.VoteAverage ?? 0)) > 0.1)
            {
                changes.Add(new DataChange
                {
                    Type = ChangeType.RatingChanged,
                    Count = 1,
                    Description = "Rating changed",
                    Details = new List<string> { $"{current.VoteAverage:F1} -> {updated.VoteAverage:F1}" }
                });
            }

            // Check for cast changes
            var currentCastCount = current.Cast?.Count() ?? 0;
            var newCastCount = updated.Cast?.Count() ?? 0;
            var castDifference = newCastCount - currentCastCount;
            
            if (Math.Abs(castDifference) > 0)
            {
                changes.Add(new DataChange
                {
                    Type = ChangeType.CastUpdated,
                    Count = Math.Abs(castDifference),
                    Description = castDifference > 0 ? "Cast members added" : "Cast members removed",
                    Details = new List<string> { $"{Math.Abs(castDifference)} cast member changes" }
                });
            }

            // Check for genre changes
            var currentGenres = current.Genres?.Select(g => g.ToLowerInvariant()).ToHashSet() ?? new HashSet<string>();
            var newGenres = updated.Genres?.Select(g => g.ToLowerInvariant()).ToHashSet() ?? new HashSet<string>();
            
            if (!currentGenres.SetEquals(newGenres))
            {
                changes.Add(new DataChange
                {
                    Type = ChangeType.GenresChanged,
                    Count = 1,
                    Description = "Genres updated",
                    Details = new List<string> { $"Genres changed from [{string.Join(", ", current.Genres ?? new List<string>())}] to [{string.Join(", ", updated.Genres ?? new List<string>())}]" }
                });
            }

            analysis.Changes = changes;
            analysis.HasSignificantChanges = changes.Any(c => 
                c.Type == ChangeType.TitleChanged || 
                c.Type == ChangeType.RatingChanged ||
                (c.Type == ChangeType.CastUpdated && c.Count > 2) ||
                c.Type == ChangeType.GenresChanged);

            return await Task.FromResult(analysis);
        }

        private async Task<ChangeAnalysis> AnalyzeUnifiedContentChangesAsync(UnifiedContentResponse current, UnifiedContentResponse updated, string contentId, ContentType contentType)
        {
            var analysis = new ChangeAnalysis
            {
                ContentId = contentId,
                ContentType = contentType
            };

            var changes = new List<DataChange>();

            // Analyze streaming availability changes
            if (current.StreamingData != null && updated.StreamingData != null)
            {
                var streamingAnalysis = await AnalyzeStreamingChangesAsync(current.StreamingData, updated.StreamingData, contentId, contentType);
                changes.AddRange(streamingAnalysis.Changes);
            }

            // Analyze metadata changes
            if (current.ContentData != null && updated.ContentData != null)
            {
                var metadataAnalysis = await AnalyzeMetadataChangesAsync(current.ContentData, updated.ContentData, contentId, contentType);
                changes.AddRange(metadataAnalysis.Changes);
            }

            // Check for image changes
            if (!string.Equals(current.ContentData?.Images?.PosterUrl, updated.ContentData?.Images?.PosterUrl))
            {
                changes.Add(new DataChange
                {
                    Type = ChangeType.ImageUpdated,
                    Count = 1,
                    Description = "Poster image updated",
                    Details = new List<string> { "Poster URL changed" }
                });
            }

            analysis.Changes = changes;
            analysis.HasSignificantChanges = changes.Any();

            return analysis;
        }

        private async Task<ChangeAnalysis> AnalyzeGenericChangesAsync(object currentData, object newData, string contentId, ContentType contentType)
        {
            var analysis = new ChangeAnalysis
            {
                ContentId = contentId,
                ContentType = contentType
            };

            try
            {
                // Simple hash comparison for generic objects
                var currentHash = currentData.GetHashCode();
                var newHash = newData.GetHashCode();

                if (currentHash != newHash)
                {
                    analysis.HasSignificantChanges = true;
                    analysis.Changes.Add(new DataChange
                    {
                        Type = ChangeType.MetadataUpdated,
                        Count = 1,
                        Description = "Generic data change detected",
                        Details = new List<string> { "Data hash changed" }
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error in generic change analysis for content {ContentId}, assuming changes exist", contentId);
                analysis.HasSignificantChanges = true;
                analysis.Changes.Add(new DataChange
                {
                    Type = ChangeType.MetadataUpdated,
                    Count = 1,
                    Description = "Unable to analyze changes",
                    Details = new List<string> { "Change analysis failed - assuming update needed" }
                });
            }

            return await Task.FromResult(analysis);
        }
    }
}