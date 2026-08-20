using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

/// <summary>
/// DTOs for TMDb API responses - these match the exact JSON structure from TMDb
/// TmdbSearchResponse is defined in FilterModels.cs to avoid duplication
/// </summary>

public class TmdbMovieSearchResult
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    
    [JsonPropertyName("original_title")]
    public string? OriginalTitle { get; set; }
    
    [JsonPropertyName("overview")]
    public string? Overview { get; set; }
    
    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; set; }
    
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; set; }
    
    [JsonPropertyName("vote_count")]
    public int VoteCount { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
    
    [JsonPropertyName("backdrop_path")]
    public string? BackdropPath { get; set; }
    
    [JsonPropertyName("genre_ids")]
    public List<int> GenreIds { get; set; } = new();
    
    [JsonPropertyName("original_language")]
    public string? OriginalLanguage { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
    
    [JsonPropertyName("media_type")]
    public string? MediaType { get; set; }
}

public class TmdbTvSearchResult
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("original_name")]
    public string? OriginalName { get; set; }
    
    [JsonPropertyName("overview")]
    public string? Overview { get; set; }
    
    [JsonPropertyName("first_air_date")]
    public string? FirstAirDate { get; set; }
    
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; set; }
    
    [JsonPropertyName("vote_count")]
    public int VoteCount { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
    
    [JsonPropertyName("backdrop_path")]
    public string? BackdropPath { get; set; }
    
    [JsonPropertyName("genre_ids")]
    public List<int> GenreIds { get; set; } = new();
    
    [JsonPropertyName("original_language")]
    public string? OriginalLanguage { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
    
    [JsonPropertyName("origin_country")]
    public List<string> OriginCountry { get; set; } = new();
    
    [JsonPropertyName("media_type")]
    public string? MediaType { get; set; }
}

public class TmdbPersonSearchResult
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("profile_path")]
    public string? ProfilePath { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("known_for_department")]
    public string? KnownForDepartment { get; set; }
    
    [JsonPropertyName("known_for")]
    public List<TmdbKnownForItem> KnownFor { get; set; } = new();
    
    [JsonPropertyName("gender")]
    public int? Gender { get; set; }
    
    [JsonPropertyName("media_type")]
    public string? MediaType { get; set; }
}

public class TmdbKnownForItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("media_type")]
    public string? MediaType { get; set; }
    
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
}

public class TmdbMultiSearchResult
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("media_type")]
    public string? MediaType { get; set; }
    
    // Movie properties
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    
    [JsonPropertyName("original_title")]
    public string? OriginalTitle { get; set; }
    
    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; set; }
    
    // TV properties
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("original_name")]
    public string? OriginalName { get; set; }
    
    [JsonPropertyName("first_air_date")]
    public string? FirstAirDate { get; set; }
    
    // Person properties
    [JsonPropertyName("profile_path")]
    public string? ProfilePath { get; set; }
    
    [JsonPropertyName("known_for_department")]
    public string? KnownForDepartment { get; set; }
    
    // Common properties
    [JsonPropertyName("overview")]
    public string? Overview { get; set; }
    
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; set; }
    
    [JsonPropertyName("vote_count")]
    public int VoteCount { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
    
    [JsonPropertyName("backdrop_path")]
    public string? BackdropPath { get; set; }
    
    [JsonPropertyName("genre_ids")]
    public List<int> GenreIds { get; set; } = new();
    
    [JsonPropertyName("original_language")]
    public string? OriginalLanguage { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
}

public class TmdbMovieDetails
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    
    [JsonPropertyName("original_title")]
    public string? OriginalTitle { get; set; }
    
    [JsonPropertyName("overview")]
    public string? Overview { get; set; }
    
    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; set; }
    
    [JsonPropertyName("runtime")]
    public int? Runtime { get; set; }
    
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; set; }
    
    [JsonPropertyName("vote_count")]
    public int VoteCount { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
    
    [JsonPropertyName("backdrop_path")]
    public string? BackdropPath { get; set; }
    
    [JsonPropertyName("genres")]
    public List<TmdbGenre> Genres { get; set; } = new();
    
    [JsonPropertyName("production_countries")]
    public List<TmdbProductionCountry> ProductionCountries { get; set; } = new();
    
    [JsonPropertyName("spoken_languages")]
    public List<TmdbSpokenLanguage> SpokenLanguages { get; set; } = new();
    
    [JsonPropertyName("original_language")]
    public string? OriginalLanguage { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
    
    [JsonPropertyName("budget")]
    public long? Budget { get; set; }
    
    [JsonPropertyName("revenue")]
    public long? Revenue { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("tagline")]
    public string? Tagline { get; set; }
    
    [JsonPropertyName("homepage")]
    public string? Homepage { get; set; }
    
    [JsonPropertyName("credits")]
    public TmdbCredits? Credits { get; set; }
    
    [JsonPropertyName("external_ids")]
    public TmdbExternalIds? ExternalIds { get; set; }
}

public class TmdbTvDetails
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("original_name")]
    public string? OriginalName { get; set; }
    
    [JsonPropertyName("overview")]
    public string? Overview { get; set; }
    
    [JsonPropertyName("first_air_date")]
    public string? FirstAirDate { get; set; }
    
    [JsonPropertyName("last_air_date")]
    public string? LastAirDate { get; set; }
    
    [JsonPropertyName("number_of_seasons")]
    public int? NumberOfSeasons { get; set; }
    
    [JsonPropertyName("number_of_episodes")]
    public int? NumberOfEpisodes { get; set; }
    
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; set; }
    
    [JsonPropertyName("vote_count")]
    public int VoteCount { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
    
    [JsonPropertyName("backdrop_path")]
    public string? BackdropPath { get; set; }
    
    [JsonPropertyName("genres")]
    public List<TmdbGenre> Genres { get; set; } = new();
    
    [JsonPropertyName("production_countries")]
    public List<TmdbProductionCountry> ProductionCountries { get; set; } = new();
    
    [JsonPropertyName("spoken_languages")]
    public List<TmdbSpokenLanguage> SpokenLanguages { get; set; } = new();
    
    [JsonPropertyName("original_language")]
    public string? OriginalLanguage { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("tagline")]
    public string? Tagline { get; set; }
    
    [JsonPropertyName("homepage")]
    public string? Homepage { get; set; }
    
    [JsonPropertyName("origin_country")]
    public List<string> OriginCountry { get; set; } = new();
    
    [JsonPropertyName("credits")]
    public TmdbCredits? Credits { get; set; }
    
    [JsonPropertyName("external_ids")]
    public TmdbExternalIds? ExternalIds { get; set; }
}

public class TmdbGenre
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class TmdbProductionCountry
{
    [JsonPropertyName("iso_3166_1")]
    public string? Iso31661 { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class TmdbSpokenLanguage
{
    [JsonPropertyName("iso_639_1")]
    public string? Iso6391 { get; set; }
    
    [JsonPropertyName("english_name")]
    public string? EnglishName { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class TmdbCredits
{
    [JsonPropertyName("cast")]
    public List<TmdbCastMember> Cast { get; set; } = new();
    
    [JsonPropertyName("crew")]
    public List<TmdbCrewMember> Crew { get; set; } = new();
}

public class TmdbCastMember
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("character")]
    public string? Character { get; set; }
    
    [JsonPropertyName("profile_path")]
    public string? ProfilePath { get; set; }
    
    [JsonPropertyName("order")]
    public int Order { get; set; }
    
    [JsonPropertyName("credit_id")]
    public string? CreditId { get; set; }
    
    [JsonPropertyName("gender")]
    public int? Gender { get; set; }
    
    [JsonPropertyName("known_for_department")]
    public string? KnownForDepartment { get; set; }
    
    [JsonPropertyName("original_name")]
    public string? OriginalName { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("cast_id")]
    public int? CastId { get; set; }
}

public class TmdbCrewMember
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("job")]
    public string? Job { get; set; }
    
    [JsonPropertyName("department")]
    public string? Department { get; set; }
    
    [JsonPropertyName("profile_path")]
    public string? ProfilePath { get; set; }
    
    [JsonPropertyName("credit_id")]
    public string? CreditId { get; set; }
    
    [JsonPropertyName("gender")]
    public int? Gender { get; set; }
    
    [JsonPropertyName("known_for_department")]
    public string? KnownForDepartment { get; set; }
    
    [JsonPropertyName("original_name")]
    public string? OriginalName { get; set; }
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
}

public class TmdbExternalIds
{
    [JsonPropertyName("imdb_id")]
    public string? ImdbId { get; set; }
    
    [JsonPropertyName("facebook_id")]
    public string? FacebookId { get; set; }
    
    [JsonPropertyName("instagram_id")]
    public string? InstagramId { get; set; }
    
    [JsonPropertyName("twitter_id")]
    public string? TwitterId { get; set; }
    
    [JsonPropertyName("tvdb_id")]
    public int? TvdbId { get; set; }
    
    [JsonPropertyName("freebase_mid")]
    public string? FreebaseMid { get; set; }
    
    [JsonPropertyName("freebase_id")]
    public string? FreebaseId { get; set; }
    
    [JsonPropertyName("tvrage_id")]
    public int? TvrageId { get; set; }
    
    [JsonPropertyName("wikidata_id")]
    public string? WikidataId { get; set; }
}

public class TmdbPersonDetails
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("biography")]
    public string? Biography { get; set; }
    
    [JsonPropertyName("birthday")]
    public string? Birthday { get; set; }
    
    [JsonPropertyName("deathday")]
    public string? Deathday { get; set; }
    
    [JsonPropertyName("gender")]
    public int? Gender { get; set; }
    
    [JsonPropertyName("homepage")]
    public string? Homepage { get; set; }
    
    [JsonPropertyName("place_of_birth")]
    public string? PlaceOfBirth { get; set; }
    
    [JsonPropertyName("profile_path")]
    public string? ProfilePath { get; set; }
    
    [JsonPropertyName("also_known_as")]
    public List<string> AlsoKnownAs { get; set; } = new();
    
    [JsonPropertyName("popularity")]
    public double? Popularity { get; set; }
    
    [JsonPropertyName("known_for_department")]
    public string? KnownForDepartment { get; set; }
    
    [JsonPropertyName("adult")]
    public bool Adult { get; set; }
    
    [JsonPropertyName("external_ids")]
    public TmdbExternalIds? ExternalIds { get; set; }
}

public class TmdbGenreResponse
{
    [JsonPropertyName("genres")]
    public List<TmdbGenre> Genres { get; set; } = new();
}