using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Seeder.DataGenerators;
using GeoLeap.Seeder.Seeders.Base;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Seeder.Seeders;

public class ContentSeeder : BaseSeeder<StreamingContent>
{
    public override string Name => "Streaming Content";
    public override int Order => 2;

    public ContentSeeder(ApplicationDbContext context, ILogger<ContentSeeder> logger)
        : base(context, logger)
    {
    }

    public override async Task<bool> IsAlreadySeededAsync(CancellationToken cancellationToken = default)
    {
        return await _context.StreamingContents.AnyAsync(cancellationToken);
    }

    protected override Task<IEnumerable<StreamingContent>> GenerateEntitiesAsync(
        SeederConfiguration config,
        CancellationToken cancellationToken = default)
    {
        var generator = new ContentDataGenerator(config.RandomSeed);

        var movies = generator.GenerateMovies(config.MoviesCount).ToList();
        var tvShows = generator.GenerateTvShows(config.TvShowsCount).ToList();

        var allContent = movies.Concat(tvShows).ToList();

        _logger.LogInformation("Generated {MovieCount} movies and {TvCount} TV shows",
            movies.Count, tvShows.Count);

        return Task.FromResult<IEnumerable<StreamingContent>>(allContent);
    }
}
