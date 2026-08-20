using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Infrastructure.Fakes;

/// <summary>
/// Fake implementation of ITmdbClient that returns deterministic test data.
/// Does NOT make any actual network calls - all data is generated locally.
/// </summary>
public class FakeTmdbClient : ITmdbClient
{
    private readonly Dictionary<int, ContentMetadata> _movies = new();
    private readonly Dictionary<int, ContentMetadata> _tvShows = new();
    private readonly Dictionary<int, PersonDetails> _people = new();
    private readonly List<Genre> _movieGenres;
    private readonly List<Genre> _tvGenres;
    private bool _shouldFail = false;

    public FakeTmdbClient()
    {
        // Initialize default genres
        _movieGenres = new List<Genre>
        {
            new() { Id = 28, Name = "Action" },
            new() { Id = 12, Name = "Adventure" },
            new() { Id = 16, Name = "Animation" },
            new() { Id = 35, Name = "Comedy" },
            new() { Id = 80, Name = "Crime" },
            new() { Id = 99, Name = "Documentary" },
            new() { Id = 18, Name = "Drama" },
            new() { Id = 10751, Name = "Family" },
            new() { Id = 14, Name = "Fantasy" },
            new() { Id = 36, Name = "History" },
            new() { Id = 27, Name = "Horror" },
            new() { Id = 10402, Name = "Music" },
            new() { Id = 9648, Name = "Mystery" },
            new() { Id = 10749, Name = "Romance" },
            new() { Id = 878, Name = "Science Fiction" },
            new() { Id = 53, Name = "Thriller" },
            new() { Id = 10752, Name = "War" },
            new() { Id = 37, Name = "Western" }
        };

        _tvGenres = new List<Genre>
        {
            new() { Id = 10759, Name = "Action & Adventure" },
            new() { Id = 16, Name = "Animation" },
            new() { Id = 35, Name = "Comedy" },
            new() { Id = 80, Name = "Crime" },
            new() { Id = 99, Name = "Documentary" },
            new() { Id = 18, Name = "Drama" },
            new() { Id = 10751, Name = "Family" },
            new() { Id = 10762, Name = "Kids" },
            new() { Id = 9648, Name = "Mystery" },
            new() { Id = 10763, Name = "News" },
            new() { Id = 10764, Name = "Reality" },
            new() { Id = 10765, Name = "Sci-Fi & Fantasy" },
            new() { Id = 10766, Name = "Soap" },
            new() { Id = 10767, Name = "Talk" },
            new() { Id = 10768, Name = "War & Politics" },
            new() { Id = 37, Name = "Western" }
        };

        // Seed with some default content
        SeedDefaultContent();
    }

    /// <summary>
    /// Configure the fake to fail all requests (simulates API unavailability)
    /// </summary>
    public void SetShouldFail(bool shouldFail)
    {
        _shouldFail = shouldFail;
    }

    /// <summary>
    /// Add a movie to the fake database
    /// </summary>
    public void AddMovie(ContentMetadata movie)
    {
        _movies[movie.TmdbId] = movie;
    }

    /// <summary>
    /// Add a TV show to the fake database
    /// </summary>
    public void AddTvShow(ContentMetadata tvShow)
    {
        _tvShows[tvShow.TmdbId] = tvShow;
    }

    /// <summary>
    /// Add a person to the fake database
    /// </summary>
    public void AddPerson(PersonDetails person)
    {
        _people[person.Id] = person;
    }

    /// <summary>
    /// Reset all data to default state
    /// </summary>
    public void Reset()
    {
        _movies.Clear();
        _tvShows.Clear();
        _people.Clear();
        _shouldFail = false;
        SeedDefaultContent();
    }

    private void SeedDefaultContent()
    {
        // Add some default movies
        _movies[550] = CreateMovie(550, "Fight Club", 1999, 8.4, new[] { "Drama", "Thriller" });
        _movies[680] = CreateMovie(680, "Pulp Fiction", 1994, 8.5, new[] { "Thriller", "Crime" });
        _movies[238] = CreateMovie(238, "The Godfather", 1972, 8.7, new[] { "Drama", "Crime" });
        _movies[278] = CreateMovie(278, "The Shawshank Redemption", 1994, 8.7, new[] { "Drama", "Crime" });
        _movies[424] = CreateMovie(424, "Schindler's List", 1993, 8.6, new[] { "Drama", "History", "War" });
        _movies[155] = CreateMovie(155, "The Dark Knight", 2008, 8.5, new[] { "Action", "Crime", "Drama" });
        _movies[13] = CreateMovie(13, "Forrest Gump", 1994, 8.5, new[] { "Comedy", "Drama", "Romance" });
        _movies[120] = CreateMovie(120, "The Lord of the Rings: The Fellowship of the Ring", 2001, 8.4, new[] { "Adventure", "Fantasy", "Action" });

        // Add some default TV shows
        _tvShows[1399] = CreateTvShow(1399, "Game of Thrones", 2011, 8.4, new[] { "Sci-Fi & Fantasy", "Drama", "Action & Adventure" }, 8, 73);
        _tvShows[1396] = CreateTvShow(1396, "Breaking Bad", 2008, 8.9, new[] { "Drama", "Crime" }, 5, 62);
        _tvShows[66732] = CreateTvShow(66732, "Stranger Things", 2016, 8.6, new[] { "Drama", "Mystery", "Sci-Fi & Fantasy" }, 4, 34);
        _tvShows[94997] = CreateTvShow(94997, "House of the Dragon", 2022, 8.4, new[] { "Sci-Fi & Fantasy", "Drama", "Action & Adventure" }, 2, 18);

        // Add some default people
        _people[287] = CreatePerson(287, "Brad Pitt", "Acting");
        _people[819] = CreatePerson(819, "Edward Norton", "Acting");
        _people[1136406] = CreatePerson(1136406, "Tom Holland", "Acting");
        _people[17419] = CreatePerson(17419, "Bryan Cranston", "Acting");
    }

    private ContentMetadata CreateMovie(int tmdbId, string title, int year, double rating, string[] genres)
    {
        return new ContentMetadata
        {
            TmdbId = tmdbId,
            Id = tmdbId,
            Title = title,
            OriginalTitle = title,
            Overview = $"This is the overview for {title}. A great movie from {year}.",
            Description = $"This is the description for {title}.",
            ReleaseDate = new DateTime(year, 1, 1),
            Type = TmdbContentType.Movie,
            VoteAverage = rating,
            VoteCount = 10000 + (tmdbId % 5000),
            Popularity = 50.0 + (tmdbId % 100),
            PosterPath = $"/poster_{tmdbId}.jpg",
            BackdropPath = $"/backdrop_{tmdbId}.jpg",
            Genres = genres.ToList(),
            Cast = new List<CastMember>
            {
                new() { PersonId = 287, Name = "Brad Pitt", Character = "Main Character", Order = 0 },
                new() { PersonId = 819, Name = "Edward Norton", Character = "Supporting Character", Order = 1 }
            },
            Crew = new List<CrewMember>
            {
                new() { PersonId = 7467, Name = "David Fincher", Job = "Director", Department = "Directing" }
            },
            Runtime = 120 + (tmdbId % 60),
            Adult = false,
            OriginalLanguage = "en",
            Year = year,
            Rating = rating
        };
    }

    private ContentMetadata CreateTvShow(int tmdbId, string title, int year, double rating, string[] genres, int seasons, int episodes)
    {
        return new ContentMetadata
        {
            TmdbId = tmdbId,
            Id = tmdbId,
            Title = title,
            OriginalTitle = title,
            Overview = $"This is the overview for {title}. A great TV series from {year}.",
            Description = $"This is the description for {title}.",
            ReleaseDate = new DateTime(year, 1, 1),
            Type = TmdbContentType.TvSeries,
            VoteAverage = rating,
            VoteCount = 5000 + (tmdbId % 3000),
            Popularity = 40.0 + (tmdbId % 80),
            PosterPath = $"/poster_tv_{tmdbId}.jpg",
            BackdropPath = $"/backdrop_tv_{tmdbId}.jpg",
            Genres = genres.ToList(),
            Cast = new List<CastMember>
            {
                new() { PersonId = 17419, Name = "Bryan Cranston", Character = "Main Character", Order = 0 }
            },
            NumberOfSeasons = seasons,
            NumberOfEpisodes = episodes,
            Adult = false,
            OriginalLanguage = "en",
            Year = year,
            Rating = rating
        };
    }

    private PersonDetails CreatePerson(int id, string name, string knownFor)
    {
        return new PersonDetails
        {
            Id = id,
            Name = name,
            Biography = $"{name} is a talented {knownFor.ToLower()} professional with many years of experience in the industry.",
            Birthday = new DateTime(1970 + (id % 30), 1, 1),
            Gender = 2,
            ProfilePath = $"/profile_{id}.jpg",
            Popularity = 20.0 + (id % 50),
            KnownForDepartment = knownFor
        };
    }

    public Task<SearchResponse<ContentMetadata>> SearchMultiAsync(string query, int page = 1, string language = "en-US", bool includeAdult = false)
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        var queryLower = query.ToLowerInvariant();
        var results = new List<ContentMetadata>();

        results.AddRange(_movies.Values.Where(m => m.Title.ToLowerInvariant().Contains(queryLower)));
        results.AddRange(_tvShows.Values.Where(t => t.Title.ToLowerInvariant().Contains(queryLower)));

        return Task.FromResult(CreateSearchResponse(results, page, 20));
    }

    public Task<SearchResponse<ContentMetadata>> SearchMoviesAsync(string query, int page = 1, string language = "en-US", int? year = null, int? primaryReleaseYear = null, bool includeAdult = false)
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        var queryLower = query.ToLowerInvariant();
        var results = _movies.Values
            .Where(m => m.Title.ToLowerInvariant().Contains(queryLower))
            .Where(m => !year.HasValue || m.Year == year)
            .Where(m => !primaryReleaseYear.HasValue || m.Year == primaryReleaseYear)
            .ToList();

        return Task.FromResult(CreateSearchResponse(results, page, 20));
    }

    public Task<SearchResponse<ContentMetadata>> SearchTvShowsAsync(string query, int page = 1, string language = "en-US", int? firstAirDateYear = null, bool includeAdult = false)
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        var queryLower = query.ToLowerInvariant();
        var results = _tvShows.Values
            .Where(t => t.Title.ToLowerInvariant().Contains(queryLower))
            .Where(t => !firstAirDateYear.HasValue || t.Year == firstAirDateYear)
            .ToList();

        return Task.FromResult(CreateSearchResponse(results, page, 20));
    }

    public Task<ContentMetadata?> GetMovieDetailsAsync(int movieId, string language = "en-US", string? appendToResponse = "credits,external_ids")
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        _movies.TryGetValue(movieId, out var movie);
        return Task.FromResult(movie);
    }

    public Task<ContentMetadata?> GetTvShowDetailsAsync(int tvId, string language = "en-US", string? appendToResponse = "credits,external_ids")
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        _tvShows.TryGetValue(tvId, out var tvShow);
        return Task.FromResult(tvShow);
    }

    public Task<PersonDetails?> GetPersonDetailsAsync(int personId, string language = "en-US", string? appendToResponse = "external_ids")
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        _people.TryGetValue(personId, out var person);
        return Task.FromResult(person);
    }

    public Task<List<Genre>> GetMovieGenresAsync(string language = "en-US")
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        return Task.FromResult(_movieGenres.ToList());
    }

    public Task<List<Genre>> GetTvGenresAsync(string language = "en-US")
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        return Task.FromResult(_tvGenres.ToList());
    }

    public string GetImageUrl(string? imagePath, ImageSize size = ImageSize.Original)
    {
        if (string.IsNullOrEmpty(imagePath))
            return string.Empty;

        var sizeStr = size switch
        {
            ImageSize.W92 => "w92",
            ImageSize.W154 => "w154",
            ImageSize.W185 => "w185",
            ImageSize.W342 => "w342",
            ImageSize.W500 => "w500",
            ImageSize.W780 => "w780",
            ImageSize.W1280 => "w1280",
            _ => "original"
        };

        return $"https://image.tmdb.org/t/p/{sizeStr}{imagePath}";
    }

    public Task<TmdbConfiguration?> GetConfigurationAsync()
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        return Task.FromResult<TmdbConfiguration?>(new TmdbConfiguration
        {
            Images = new TmdbImageConfiguration
            {
                BaseUrl = "http://image.tmdb.org/t/p/",
                SecureBaseUrl = "https://image.tmdb.org/t/p/",
                BackdropSizes = new List<string> { "w300", "w780", "w1280", "original" },
                LogoSizes = new List<string> { "w45", "w92", "w154", "w185", "w300", "w500", "original" },
                PosterSizes = new List<string> { "w92", "w154", "w185", "w342", "w500", "w780", "original" },
                ProfileSizes = new List<string> { "w45", "w185", "h632", "original" },
                StillSizes = new List<string> { "w92", "w185", "w300", "original" }
            },
            ChangeKeys = new List<string> { "adult", "air_date", "also_known_as", "biography", "birthday" }
        });
    }

    public Task<List<ContentMetadata>> GetPopularMoviesAsync(int page = 1, CancellationToken cancellationToken = default)
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        var results = _movies.Values
            .OrderByDescending(m => m.Popularity)
            .Skip((page - 1) * 20)
            .Take(20)
            .ToList();

        return Task.FromResult(results);
    }

    public Task<List<ContentMetadata>> GetPopularTvShowsAsync(int page = 1, CancellationToken cancellationToken = default)
    {
        if (_shouldFail)
            throw new HttpRequestException("Simulated TMDB API failure");

        var results = _tvShows.Values
            .OrderByDescending(t => t.Popularity)
            .Skip((page - 1) * 20)
            .Take(20)
            .ToList();

        return Task.FromResult(results);
    }

    private static SearchResponse<ContentMetadata> CreateSearchResponse(List<ContentMetadata> allResults, int page, int pageSize)
    {
        var skip = (page - 1) * pageSize;
        var results = allResults.Skip(skip).Take(pageSize).ToList();

        return new SearchResponse<ContentMetadata>
        {
            Results = results,
            Page = page,
            PageSize = pageSize,
            TotalResults = allResults.Count,
            HasMore = skip + results.Count < allResults.Count
        };
    }
}
