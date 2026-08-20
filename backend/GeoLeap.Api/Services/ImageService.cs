using GeoLeap.Api.Models;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for handling TMDb image URLs and optimization
/// </summary>
public interface IImageService
{
    /// <summary>
    /// Get optimized image URL with appropriate sizing
    /// </summary>
    /// <param name="imagePath">TMDb image path</param>
    /// <param name="targetSize">Target image size</param>
    /// <param name="isRetina">Whether to use retina/high DPI sizing</param>
    /// <returns>Complete image URL or placeholder</returns>
    string GetOptimizedImageUrl(string? imagePath, ImageSize targetSize, bool isRetina = false);

    /// <summary>
    /// Construct full TMDB URL from relative path or pass through absolute URL
    /// </summary>
    /// <param name="posterPath">Relative TMDB path (e.g., "/abc123.jpg") or absolute URL</param>
    /// <param name="size">Target image size (default: W500)</param>
    /// <returns>Full TMDB URL or empty string if invalid</returns>
    string ConstructTmdbUrl(string? posterPath, ImageSize size = ImageSize.W500);

    /// <summary>
    /// Get multiple image sizes for responsive design
    /// </summary>
    /// <param name="imagePath">TMDb image path</param>
    /// <param name="sizes">Array of desired sizes</param>
    /// <returns>Dictionary of size to URL mappings</returns>
    Dictionary<ImageSize, string> GetResponsiveImageUrls(string? imagePath, ImageSize[] sizes);

    /// <summary>
    /// Get srcset string for responsive images
    /// </summary>
    /// <param name="imagePath">TMDb image path</param>
    /// <param name="sizes">Array of sizes with their viewport widths</param>
    /// <returns>HTML srcset attribute value</returns>
    string GetImageSrcSet(string? imagePath, (ImageSize size, string descriptor)[] sizes);

    /// <summary>
    /// Get placeholder image URL
    /// </summary>
    /// <param name="type">Type of placeholder (poster, backdrop, profile)</param>
    /// <returns>Placeholder image URL</returns>
    string GetPlaceholderImageUrl(PlaceholderType type = PlaceholderType.Poster);

    /// <summary>
    /// Validate if image path is valid TMDb format
    /// </summary>
    /// <param name="imagePath">Image path to validate</param>
    /// <returns>True if valid TMDb image path</returns>
    bool IsValidImagePath(string? imagePath);
}

public enum PlaceholderType
{
    Poster,
    Backdrop,
    Profile
}

public class ImageService : IImageService
{
    private readonly TmdbSettings _settings;
    private readonly ILogger<ImageService> _logger;
    
    // Size mappings for different use cases
    private static readonly Dictionary<ImageSize, int> SizeWidths = new()
    {
        { ImageSize.W92, 92 },
        { ImageSize.W154, 154 },
        { ImageSize.W185, 185 },
        { ImageSize.W342, 342 },
        { ImageSize.W500, 500 },
        { ImageSize.W780, 780 },
        { ImageSize.W1280, 1280 }
    };
    
    // Retina size upgrades
    private static readonly Dictionary<ImageSize, ImageSize> RetinaSizeMap = new()
    {
        { ImageSize.W92, ImageSize.W185 },
        { ImageSize.W154, ImageSize.W342 },
        { ImageSize.W185, ImageSize.W342 },
        { ImageSize.W342, ImageSize.W500 },
        { ImageSize.W500, ImageSize.W780 },
        { ImageSize.W780, ImageSize.W1280 },
        { ImageSize.W1280, ImageSize.Original },
        { ImageSize.Original, ImageSize.Original }
    };

    public ImageService(IOptionsMonitor<TmdbSettings> settings, ILogger<ImageService> logger)
    {
        _settings = settings.CurrentValue;
        _logger = logger;
    }

    public string GetOptimizedImageUrl(string? imagePath, ImageSize targetSize, bool isRetina = false)
    {
        if (!IsValidImagePath(imagePath))
        {
            _logger.LogDebug("Invalid image path provided: {ImagePath}", imagePath);
            return GetPlaceholderImageUrl();
        }

        var size = isRetina ? GetRetinaSize(targetSize) : targetSize;
        var sizeString = GetSizeString(size);

        var url = $"{_settings.ImageBaseUrl}{sizeString}{imagePath}";

        _logger.LogTrace("Generated image URL: {Url} for path: {ImagePath}, size: {Size}, retina: {IsRetina}",
            url, imagePath, targetSize, isRetina);

        return url;
    }

    public string ConstructTmdbUrl(string? posterPath, ImageSize size = ImageSize.W500)
    {
        if (string.IsNullOrWhiteSpace(posterPath))
            return string.Empty;

        // Already absolute URL - return as-is
        if (posterPath.StartsWith("http://") || posterPath.StartsWith("https://"))
            return posterPath;

        // Construct full TMDB URL from relative path
        if (IsValidImagePath(posterPath))
        {
            return GetOptimizedImageUrl(posterPath, size);
        }

        return string.Empty;
    }

    public Dictionary<ImageSize, string> GetResponsiveImageUrls(string? imagePath, ImageSize[] sizes)
    {
        var result = new Dictionary<ImageSize, string>();
        
        if (!IsValidImagePath(imagePath))
        {
            var placeholder = GetPlaceholderImageUrl();
            foreach (var size in sizes)
            {
                result[size] = placeholder;
            }
            return result;
        }

        foreach (var size in sizes)
        {
            result[size] = GetOptimizedImageUrl(imagePath, size, false);
        }
        
        return result;
    }

    public string GetImageSrcSet(string? imagePath, (ImageSize size, string descriptor)[] sizes)
    {
        if (!IsValidImagePath(imagePath))
        {
            return GetPlaceholderImageUrl();
        }

        var srcSetParts = sizes.Select(s => 
            $"{GetOptimizedImageUrl(imagePath, s.size)} {s.descriptor}").ToArray();
        
        return string.Join(", ", srcSetParts);
    }

    public string GetPlaceholderImageUrl(PlaceholderType type = PlaceholderType.Poster)
    {
        return type switch
        {
            PlaceholderType.Poster => "/images/placeholder-poster.jpg",
            PlaceholderType.Backdrop => "/images/placeholder-backdrop.jpg",
            PlaceholderType.Profile => "/images/placeholder-profile.jpg",
            _ => "/images/placeholder-poster.jpg"
        };
    }

    public bool IsValidImagePath(string? imagePath)
    {
        return !string.IsNullOrWhiteSpace(imagePath) && 
               imagePath.StartsWith("/") && 
               imagePath.Length > 1 &&
               !imagePath.Contains("..") && // Security check
               (imagePath.EndsWith(".jpg") || imagePath.EndsWith(".png") || imagePath.EndsWith(".webp"));
    }

    private ImageSize GetRetinaSize(ImageSize originalSize)
    {
        return RetinaSizeMap.TryGetValue(originalSize, out var retinaSize) ? retinaSize : originalSize;
    }

    private string GetSizeString(ImageSize size)
    {
        return size switch
        {
            ImageSize.W92 => "w92",
            ImageSize.W154 => "w154",
            ImageSize.W185 => "w185",
            ImageSize.W342 => "w342",
            ImageSize.W500 => "w500",
            ImageSize.W780 => "w780",
            ImageSize.W1280 => "w1280",
            ImageSize.Original => "original",
            _ => "original"
        };
    }
}

/// <summary>
/// Extension methods for common image sizing scenarios
/// </summary>
public static class ImageServiceExtensions
{
    /// <summary>
    /// Get poster image URLs for different screen sizes
    /// </summary>
    public static Dictionary<ImageSize, string> GetPosterUrls(this IImageService imageService, string? posterPath)
    {
        var sizes = new[] { ImageSize.W185, ImageSize.W342, ImageSize.W500, ImageSize.W780 };
        return imageService.GetResponsiveImageUrls(posterPath, sizes);
    }
    
    /// <summary>
    /// Get backdrop image URLs for different screen sizes
    /// </summary>
    public static Dictionary<ImageSize, string> GetBackdropUrls(this IImageService imageService, string? backdropPath)
    {
        var sizes = new[] { ImageSize.W780, ImageSize.W1280, ImageSize.Original };
        return imageService.GetResponsiveImageUrls(backdropPath, sizes);
    }
    
    /// <summary>
    /// Get profile image URLs for different contexts
    /// </summary>
    public static Dictionary<ImageSize, string> GetProfileUrls(this IImageService imageService, string? profilePath)
    {
        var sizes = new[] { ImageSize.W92, ImageSize.W154, ImageSize.W185, ImageSize.W342 };
        return imageService.GetResponsiveImageUrls(profilePath, sizes);
    }
    
    /// <summary>
    /// Get thumbnail URL (small size for lists and cards)
    /// </summary>
    public static string GetThumbnailUrl(this IImageService imageService, string? imagePath, bool isRetina = false)
    {
        return imageService.GetOptimizedImageUrl(imagePath, ImageSize.W185, isRetina);
    }
    
    /// <summary>
    /// Get poster URL for detail views
    /// </summary>
    public static string GetPosterUrl(this IImageService imageService, string? posterPath, bool isRetina = false)
    {
        return imageService.GetOptimizedImageUrl(posterPath, ImageSize.W500, isRetina);
    }
    
    /// <summary>
    /// Get backdrop URL for hero sections
    /// </summary>
    public static string GetBackdropUrl(this IImageService imageService, string? backdropPath, bool isRetina = false)
    {
        return imageService.GetOptimizedImageUrl(backdropPath, ImageSize.W1280, isRetina);
    }
    
    /// <summary>
    /// Get profile image URL for person cards
    /// </summary>
    public static string GetProfileUrl(this IImageService imageService, string? profilePath, bool isRetina = false)
    {
        return imageService.GetOptimizedImageUrl(profilePath, ImageSize.W185, isRetina);
    }
    
    /// <summary>
    /// Generate responsive image srcset for posters
    /// </summary>
    public static string GetPosterSrcSet(this IImageService imageService, string? posterPath)
    {
        var sizes = new[]
        {
            (ImageSize.W185, "185w"),
            (ImageSize.W342, "342w"),
            (ImageSize.W500, "500w"),
            (ImageSize.W780, "780w")
        };
        
        return imageService.GetImageSrcSet(posterPath, sizes);
    }
    
    /// <summary>
    /// Generate responsive image srcset for backdrops
    /// </summary>
    public static string GetBackdropSrcSet(this IImageService imageService, string? backdropPath)
    {
        var sizes = new[]
        {
            (ImageSize.W780, "780w"),
            (ImageSize.W1280, "1280w"),
            (ImageSize.Original, "1920w")
        };
        
        return imageService.GetImageSrcSet(backdropPath, sizes);
    }
}