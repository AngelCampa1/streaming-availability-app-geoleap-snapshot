namespace GeoLeap.Seeder;

public class SeederConfiguration
{
    public string ProfileName { get; set; } = "Standard";
    public string ConnectionString { get; set; } = string.Empty;
    public bool CleanDatabase { get; set; } = false;
    public bool VerifyIntegrity { get; set; } = true;
    public int BatchSize { get; set; } = 1000;
    public int RandomSeed { get; set; } = 12345;

    // Entity counts
    public int UserCount { get; set; } = 100;
    public int AdminCount { get; set; } = 3;
    public int ContentCount { get; set; } = 1000;
    public int MoviesCount { get; set; } = 700;
    public int TvShowsCount { get; set; } = 300;
    public int StreamingServicesCount { get; set; } = 24;
    public int VpnProviderCount { get; set; } = 4;
    public int RatingsPerUser { get; set; } = 10;
    public int SearchEventsPerUser { get; set; } = 50;
    public int BehaviorEventsPerUser { get; set; } = 100;
    public int WatchlistsPerUser { get; set; } = 2;
    public int ItemsPerWatchlist { get; set; } = 8;

    // Data generation options
    public bool UseRealisticDistributions { get; set; } = true;
    public bool GenerateTemporalPatterns { get; set; } = true;
}

public class SeederProfile
{
    public int UserCount { get; set; }
    public int AdminCount { get; set; }
    public int ContentCount { get; set; }
    public int MoviesCount { get; set; }
    public int TvShowsCount { get; set; }
    public int StreamingServicesCount { get; set; }
    public int VpnProviderCount { get; set; }
    public int RatingsPerUser { get; set; }
    public int SearchEventsPerUser { get; set; }
    public int BehaviorEventsPerUser { get; set; }
    public int WatchlistsPerUser { get; set; }
    public int ItemsPerWatchlist { get; set; }
}

public class SeederResult
{
    public bool Success { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public TimeSpan Duration => EndTime - StartTime;
    public List<string> SuccessfulSeeders { get; set; } = new();
    public List<(string SeederName, string Error)> FailedSeeders { get; set; } = new();
    public string? CriticalError { get; set; }
    public Dictionary<string, int> Statistics { get; set; } = new();
}
