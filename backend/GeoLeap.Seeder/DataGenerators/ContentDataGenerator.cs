using Bogus;
using GeoLeap.Api.Models;

namespace GeoLeap.Seeder.DataGenerators;

public class ContentDataGenerator
{
    private readonly int _randomSeed;

    private static readonly Dictionary<string, double> GenreWeights = new()
    {
        { "Drama", 0.25 },
        { "Comedy", 0.20 },
        { "Action", 0.15 },
        { "Thriller", 0.12 },
        { "Horror", 0.08 },
        { "Sci-Fi", 0.07 },
        { "Romance", 0.07 },
        { "Documentary", 0.06 }
    };

    private static readonly string[] MovieTitlePrefixes = new[]
    {
        "The", "A", "An", "My", "Last", "Final", "First", "Dark", "Night", "Day",
        "Secret", "Hidden", "Lost", "Return of", "Rise of", "Fall of"
    };

    private static readonly string[] MovieTitleSuffixes = new[]
    {
        "Journey", "Adventure", "Story", "Legend", "Chronicles", "Saga", "Quest",
        "Mission", "Operation", "Project", "Prophecy", "Destiny", "Beginning", "End"
    };

    public ContentDataGenerator(int randomSeed = 12345)
    {
        _randomSeed = randomSeed;
    }

    public IEnumerable<StreamingContent> GenerateMovies(int count)
    {
        Randomizer.Seed = new Random(_randomSeed);

        var movieFaker = new Faker<StreamingContent>()
            .RuleFor(c => c.Id, f => Guid.NewGuid())
            .RuleFor(c => c.Title, f => GenerateMovieTitle(f))
            .RuleFor(c => c.ContentType, "movie")
            .RuleFor(c => c.Genre, f => f.PickWeighted(
                GenreWeights.Keys.ToList(),
                GenreWeights.Values.ToList()))
            .RuleFor(c => c.ReleaseDate, f => f.Date.Between(
                new DateTime(1970, 1, 1),
                DateTime.UtcNow))
            .RuleFor(c => c.Duration, f => f.Random.Int(70, 180)) // 70-180 minutes
            .RuleFor(c => c.Rating, f => GenerateImdbRating(f))
            .RuleFor(c => c.Overview, f => f.Lorem.Paragraph())
            .RuleFor(c => c.Director, f => $"{f.Name.FirstName()} {f.Name.LastName()}")
            .RuleFor(c => c.PosterUrl, f => $"https://image.tmdb.org/t/p/w500/{f.Random.Hash(40)}.jpg")
            .RuleFor(c => c.IsAvailable, f => f.Random.Bool(0.85f)) // 85% available
            .RuleFor(c => c.CreatedAt, f => DateTime.UtcNow.AddDays(-f.Random.Int(1, 365)));

        return movieFaker.Generate(count);
    }

    public IEnumerable<StreamingContent> GenerateTvShows(int count)
    {
        Randomizer.Seed = new Random(_randomSeed + 1000);

        var tvFaker = new Faker<StreamingContent>()
            .RuleFor(c => c.Id, f => Guid.NewGuid())
            .RuleFor(c => c.Title, f => GenerateTvShowTitle(f))
            .RuleFor(c => c.ContentType, "tv")
            .RuleFor(c => c.Genre, f => f.PickWeighted(
                GenreWeights.Keys.ToList(),
                GenreWeights.Values.ToList()))
            .RuleFor(c => c.ReleaseDate, f => f.Date.Between(
                new DateTime(1990, 1, 1),
                DateTime.UtcNow))
            .RuleFor(c => c.Duration, f => f.Random.Int(20, 60)) // Episode duration
            .RuleFor(c => c.Rating, f => GenerateImdbRating(f))
            .RuleFor(c => c.Overview, f => f.Lorem.Paragraph())
            .RuleFor(c => c.Director, f => $"{f.Name.FirstName()} {f.Name.LastName()}")
            .RuleFor(c => c.PosterUrl, f => $"https://image.tmdb.org/t/p/w500/{f.Random.Hash(40)}.jpg")
            .RuleFor(c => c.IsAvailable, f => f.Random.Bool(0.80f)) // 80% available
            .RuleFor(c => c.CreatedAt, f => DateTime.UtcNow.AddDays(-f.Random.Int(1, 365)));

        return tvFaker.Generate(count);
    }

    private string GenerateMovieTitle(Faker f)
    {
        var format = f.Random.Int(1, 3);
        return format switch
        {
            1 => $"{f.PickRandom(MovieTitlePrefixes)} {f.Commerce.ProductAdjective()} {f.Commerce.ProductName()}",
            2 => $"{f.Commerce.ProductName()}: {f.PickRandom(MovieTitleSuffixes)}",
            _ => $"{f.Commerce.ProductAdjective()} {f.Commerce.ProductName()}"
        };
    }

    private string GenerateTvShowTitle(Faker f)
    {
        var format = f.Random.Int(1, 3);
        return format switch
        {
            1 => $"{f.Commerce.ProductAdjective()} {f.Commerce.Product()}",
            2 => $"The {f.Commerce.ProductName()} Chronicles",
            _ => f.Commerce.ProductName()
        };
    }

    private double GenerateImdbRating(Faker f)
    {
        // Realistic IMDb distribution (slightly right-skewed, average ~7.0)
        var rating = f.Random.GaussianDouble(7.0, 1.5);
        return Math.Round(Math.Clamp(rating, 1.0, 10.0), 1);
    }
}
