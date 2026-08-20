using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IStreamingDataNormalizer
{
    StreamingAvailabilityResponse NormalizeResponse(ExternalApiResponse externalResponse);
    StreamingAvailabilityResponse ConvertToLegacyResponse(StreamingAvailabilityShow show);
    StreamingAvailabilityResponse ConvertToLegacyResponse(V2ShowResult v2Show);
    SearchResponse<GlobalSearchResult> NormalizeSearchResponse(List<ExternalApiResponse> externalResults, int totalResults, int page, int pageSize);
    StreamingOption NormalizeStreamingOption(string countryCode, ExternalStreamingOption external);
    ContentType MapContentType(string externalType);
    StreamingType MapStreamingType(string externalType);
    string CleanTitle(string title);
    string GetImageUrl(ExternalImageSet? imageSet);
    List<string> ExtractAudioLanguages(List<ExternalAudio> audios);
    List<string> ExtractSubtitleLanguages(List<ExternalSubtitle> subtitles);
    DateTime? ConvertUnixTimestamp(long? unixTimestamp);
    decimal? ParsePrice(ExternalPrice? price);
    ShowStreamingDetails NormalizeShowDetails(V2ShowResult v2Show, List<string>? userServiceIds = null, string? userCountry = null);
}