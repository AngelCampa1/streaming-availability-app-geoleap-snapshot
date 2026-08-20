using Bogus;
using GeoLeap.Api.Models;

namespace GeoLeap.Seeder.DataGenerators;

public class UserDataGenerator
{
    private readonly int _randomSeed;

    private static readonly string[] CountryCodes = new[]
    {
        "US", "GB", "CA", "AU", "DE", "FR", "JP", "IN", "ES", "BR",
        "IT", "MX", "NL", "SE", "KR", "CN", "RU", "PL", "AR", "ZA"
    };

    private static readonly Dictionary<string, double> CountryWeights = new()
    {
        { "US", 0.35 },
        { "GB", 0.15 },
        { "CA", 0.10 },
        { "AU", 0.08 },
        { "DE", 0.07 },
        { "FR", 0.06 },
        { "JP", 0.05 },
        { "IN", 0.04 },
        { "ES", 0.03 },
        { "BR", 0.03 },
        { "IT", 0.02 },
        { "NL", 0.01 },
        { "SE", 0.01 }
    };

    private static readonly Dictionary<string, double> SubscriptionTierWeights = new()
    {
        { "free", 0.65 },
        { "premium_monthly", 0.15 },
        { "premium_annual", 0.10 },
        { "basic", 0.10 }
    };

    public UserDataGenerator(int randomSeed = 12345)
    {
        _randomSeed = randomSeed;
    }

    public IEnumerable<User> GenerateUsers(int count, bool includeAdmins = false)
    {
        Randomizer.Seed = new Random(_randomSeed);

        var userFaker = new Faker<User>()
            .RuleFor(u => u.Id, f => Guid.NewGuid())
            .RuleFor(u => u.Email, f => f.Internet.Email())
            .RuleFor(u => u.UserName, (f, u) => u.Email)
            .RuleFor(u => u.NormalizedEmail, (f, u) => u.Email.ToUpperInvariant())
            .RuleFor(u => u.NormalizedUserName, (f, u) => u.Email.ToUpperInvariant())
            .RuleFor(u => u.FirstName, f => f.Name.FirstName())
            .RuleFor(u => u.LastName, f => f.Name.LastName())
            .RuleFor(u => u.Country, f => f.PickWeighted(
                CountryWeights.Keys.ToList(),
                CountryWeights.Values.ToList()))
            .RuleFor(u => u.Language, f => "en")
            .RuleFor(u => u.Timezone, f => f.PickRandom(
                "America/New_York", "Europe/London", "America/Toronto", "Australia/Sydney",
                "Europe/Berlin", "Europe/Paris", "Asia/Tokyo", "Asia/Kolkata"))
            .RuleFor(u => u.SubscriptionTier, f => f.PickWeighted(
                SubscriptionTierWeights.Keys.ToList(),
                SubscriptionTierWeights.Values.ToList()))
            .RuleFor(u => u.IsActive, f => f.Random.Bool(0.95f)) // 95% active
            .RuleFor(u => u.EmailConfirmed, f => f.Random.Bool(0.90f)) // 90% confirmed
            .RuleFor(u => u.TwoFactorEnabled, f => f.Random.Bool(0.25f)) // 25% use 2FA
            .RuleFor(u => u.PhoneNumberConfirmed, f => f.Random.Bool(0.30f))
            .RuleFor(u => u.CreatedAt, f => f.Date.Between(
                DateTime.UtcNow.AddYears(-2),
                DateTime.UtcNow.AddDays(-1)))
            .RuleFor(u => u.LastLoginAt, (f, u) => f.Date.Between(
                u.CreatedAt,
                DateTime.UtcNow))
            .RuleFor(u => u.OnboardingCompletedAt, (f, u) =>
                u.EmailConfirmed ? f.Date.Between(u.CreatedAt, u.CreatedAt.AddDays(7)) : (DateTime?)null)
            .RuleFor(u => u.ProfileImageUrl, f => f.Random.Bool(0.40f)
                ? f.Internet.Avatar()
                : null)
            .RuleFor(u => u.Bio, f => f.Random.Bool(0.20f)
                ? f.Lorem.Sentence()
                : null)
            .RuleFor(u => u.IsSuspended, f => false)
            .RuleFor(u => u.SecurityStamp, f => Guid.NewGuid().ToString())
            .RuleFor(u => u.ConcurrencyStamp, f => Guid.NewGuid().ToString());

        return userFaker.Generate(count);
    }

    public IEnumerable<User> GenerateTestAccounts()
    {
        return new List<User>
        {
            CreateTestUser("admin@geoleap.test", "Admin", "User", "US", "premium_annual", isAdmin: true),
            CreateTestUser("premium@geoleap.test", "Premium", "User", "US", "premium_annual"),
            CreateTestUser("freeuser@geoleap.test", "Free", "User", "US", "free"),
            CreateTestUser("testuser@geoleap.test", "Test", "User", "US", "free")
        };
    }

    private User CreateTestUser(
        string email,
        string firstName,
        string lastName,
        string country,
        string subscriptionTier,
        bool isAdmin = false)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            UserName = email,
            NormalizedEmail = email.ToUpperInvariant(),
            NormalizedUserName = email.ToUpperInvariant(),
            FirstName = firstName,
            LastName = lastName,
            Country = country,
            Language = "en",
            Timezone = "America/New_York",
            SubscriptionTier = subscriptionTier,
            IsActive = true,
            EmailConfirmed = true,
            TwoFactorEnabled = isAdmin,
            CreatedAt = DateTime.UtcNow.AddMonths(-6),
            LastLoginAt = DateTime.UtcNow.AddHours(-2),
            OnboardingCompletedAt = DateTime.UtcNow.AddMonths(-6).AddDays(1),
            SecurityStamp = Guid.NewGuid().ToString(),
            ConcurrencyStamp = Guid.NewGuid().ToString()
        };
    }
}
