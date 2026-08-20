namespace GeoLeap.Seeder.DataGenerators;

public static class DateTimeGenerator
{
    private static readonly Random _random = new(12345);

    /// <summary>
    /// Generates a timestamp adjusted to peak hours (7 PM - 11 PM)
    /// </summary>
    public static DateTime AdjustToPeakHours(DateTime timestamp)
    {
        // Peak hours: 19:00 - 23:00 (7 PM - 11 PM)
        var hour = _random.Next(19, 23);
        var minute = _random.Next(0, 60);
        var second = _random.Next(0, 60);

        return new DateTime(
            timestamp.Year,
            timestamp.Month,
            timestamp.Day,
            hour,
            minute,
            second,
            DateTimeKind.Utc);
    }

    /// <summary>
    /// Generates realistic inter-event timing with exponential distribution
    /// </summary>
    public static TimeSpan GetInterEventDuration(double averageMinutes = 30.0)
    {
        // Exponential distribution for realistic timing
        var lambda = 1.0 / averageMinutes;
        var u = _random.NextDouble();
        var minutes = -Math.Log(1 - u) / lambda;

        return TimeSpan.FromMinutes(Math.Min(minutes, 1440)); // Cap at 24 hours
    }

    /// <summary>
    /// Generates timestamps with realistic temporal patterns
    /// </summary>
    public static IEnumerable<DateTime> GenerateEventTimestamps(
        DateTime startDate,
        DateTime endDate,
        int count,
        bool usePeakHours = true)
    {
        var timestamps = new List<DateTime>();
        var current = startDate;

        for (int i = 0; i < count; i++)
        {
            // Add random interval
            current = current.Add(GetInterEventDuration());

            // Ensure within bounds
            if (current > endDate)
            {
                current = endDate.AddMinutes(-_random.Next(0, 60));
            }

            // 80% chance of peak hours if enabled
            if (usePeakHours && _random.NextDouble() < 0.8)
            {
                current = AdjustToPeakHours(current);
            }

            timestamps.Add(current);
        }

        return timestamps.OrderBy(t => t);
    }
}
