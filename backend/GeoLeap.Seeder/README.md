# GeoLeap Database Seeder

Production-ready database seeding tool for GeoLeap with realistic test data generation.

## Quick Start

```bash
# Navigate to seeder directory
cd backend/GeoLeap.Seeder

# Standard seeding (100 users, 1000 content items)
dotnet run

# Or use NPM script from backend folder
cd backend
npm run seed
```

## Features

- ✅ **Realistic Data**: Uses Bogus library for authentic user demographics, content titles, and temporal patterns
- ✅ **Three Profiles**: Minimal (10 users), Standard (100 users), Large (1000 users)
- ✅ **Idempotent**: Safe to re-run without duplicating data
- ✅ **Fast**: Seeds 100 users + 1000 content items in ~2 minutes
- ✅ **Validated**: Post-seeding integrity checks ensure data quality
- ✅ **Extensible**: Easy to add new seeders following the BaseSeeder pattern

## Prerequisites

1. **SQL Server 2022** running (Docker or Azure)
2. **Migrations Applied**: Run `dotnet ef database update` in GeoLeap.Api first
3. **Connection String**: Configured in appsettings.json or via CLI

```bash
# Apply migrations first
cd backend/GeoLeap.Api
dotnet ef database update
```

## Usage

### Basic Commands

```bash
# Standard profile (default)
dotnet run

# Minimal profile (quick test data)
dotnet run -- --profile Minimal

# Large profile (stress testing)
dotnet run -- --profile Large

# Clean database before seeding
dotnet run -- --clean

# Custom user/content counts
dotnet run -- --users 500 --content 5000

# Skip verification
dotnet run -- --skip-verification
```

### NPM Scripts (Convenience)

```bash
cd backend

npm run seed              # Standard profile
npm run seed:minimal      # Minimal profile
npm run seed:clean        # Clean + Standard
```

## Seeding Profiles

| Profile | Users | Content | Events | Time |
|---------|-------|---------|--------|------|
| **Minimal** | 10 | 50 | 500 | ~10s |
| **Standard** | 100 | 1,000 | 50,000 | ~2min |
| **Large** | 1,000 | 10,000 | 500,000 | ~15min |

## Test Accounts Created

| Email | Password | Role | Subscription |
|-------|----------|------|--------------|
| admin@geoleap.test | Admin123! | Admin | Premium Annual |
| premium@geoleap.test | Premium123! | User | Premium Annual |
| freeuser@geoleap.test | Free123! | User | Free |
| testuser@geoleap.test | Test123! | User | Free |

## Data Generated

### Users & Authentication
- Users with realistic demographics (US 35%, UK 15%, CA 10%, etc.)
- Roles: Admin, User, PremiumUser, Support
- OAuth profiles (Google/Apple)
- Security settings (2FA, password history, sessions)

### Content
- **Movies**: Realistic titles, genres (Drama 25%, Comedy 20%, Action 15%)
- **TV Shows**: Series with episode data
- **Streaming Services**: Netflix, Disney+, Hulu, HBO Max, etc. (24 total)
- **Availability**: 5000+ content-service-country combinations

### VPN Providers
- NordVPN, ExpressVPN, Surfshark, CyberGhost
- Server locations (200+ across 60-100 countries)
- Ratings (500+ user ratings)
- Streaming compatibility matrix

### User Activity
- Search analytics (5000+ search queries with patterns)
- User behavior events (10000+ events with temporal patterns)
- Watchlists (2 per user, 8 items each)
- Content ratings (10+ per user)

### Subscriptions & Payments
- Active subscriptions (30% of users)
- Payment transactions (successful, failed, refunded)
- Invoices (100+ with PDF generation data)
- Failed payments with dunning campaigns

## Configuration

Edit `appsettings.json` to customize:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,9020;Database=GeoLeap;..."
  },
  "Seeding": {
    "DefaultProfile": "Standard",
    "BatchSize": 1000,
    "RandomSeed": 12345,
    "Profiles": {
      "Minimal": { "UserCount": 10, "ContentCount": 50 },
      "Standard": { "UserCount": 100, "ContentCount": 1000 },
      "Large": { "UserCount": 1000, "ContentCount": 10000 }
    }
  }
}
```

## Architecture

```
GeoLeap.Seeder/
├── Program.cs                  # CLI entry point
├── SeederOrchestrator.cs       # Main orchestration
├── SeederConfiguration.cs      # Configuration model
├── DataGenerators/             # Realistic data generators
│   ├── UserDataGenerator.cs
│   ├── ContentDataGenerator.cs
│   └── DateTimeGenerator.cs
├── Seeders/                    # Entity-specific seeders
│   ├── Base/
│   │   ├── ISeeder.cs
│   │   └── BaseSeeder.cs
│   ├── UserSeeder.cs           # Users, roles, auth
│   ├── ContentSeeder.cs        # Streaming content
│   └── VpnSeeder.cs            # VPN providers
└── Validators/
    └── SeedingValidator.cs     # Post-seeding validation
```

## Adding New Seeders

1. Create seeder class extending `BaseSeeder<T>`:

```csharp
public class MySeeder : BaseSeeder<MyEntity>
{
    public override string Name => "My Entity";
    public override int Order => 10; // Dependency order

    public override async Task<bool> IsAlreadySeededAsync(...)
    {
        return await _context.MyEntities.AnyAsync(cancellationToken);
    }

    protected override Task<IEnumerable<MyEntity>> GenerateEntitiesAsync(...)
    {
        // Use Bogus to generate realistic data
        var faker = new Faker<MyEntity>()
            .RuleFor(e => e.Name, f => f.Company.CompanyName())
            .RuleFor(e => e.CreatedAt, f => f.Date.Past());

        return Task.FromResult<IEnumerable<MyEntity>>(
            faker.Generate(config.MyEntityCount));
    }
}
```

2. Register in `Program.cs`:

```csharp
services.AddTransient<ISeeder, MySeeder>();
```

## Troubleshooting

**Issue**: Connection string not configured
- **Solution**: Set `ConnectionStrings:DefaultConnection` in appsettings.json

**Issue**: Foreign key constraint violation
- **Solution**: Ensure migrations applied (`dotnet ef database update`)

**Issue**: Seeding slow (>10 minutes for Standard)
- **Solution**: Increase batch size in appsettings.json (`"BatchSize": 2000`)

**Issue**: Out of memory errors
- **Solution**: Reduce batch size or use `--profile Minimal`

## Validation

After seeding, the validator checks:
- ✅ Entity counts match expectations
- ✅ No orphaned records (referential integrity)
- ✅ Realistic data distributions (power law, temporal patterns)

Example output:
```
Users: 100
Roles: 4
StreamingServices: 24
StreamingContent: 1000
VpnProviders: 4
VpnRatings: 500
Watchlists: 200
WatchlistItems: 1600

Seeding completed in 127.5s
Successful: 10/10
```

## Performance Tips

1. **Disable change tracking** (already implemented in BaseSeeder)
2. **Use batch inserts** (configurable batch size)
3. **Run seeders in dependency order** (automatic)
4. **Use compiled queries** for repeated checks
5. **Consider EFCore.BulkExtensions** for massive datasets (10k+ entities)

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Seed Test Database
  run: |
    cd backend/GeoLeap.Seeder
    dotnet run -- --profile Minimal --skip-verification
  env:
    ConnectionStrings__DefaultConnection: ${{ secrets.TEST_DB_CONNECTION }}
```

## License

Part of the GeoLeap project. See main repository LICENSE.

---

**Need Help?** Check [E2E Test Plan](../../docs/testing/e2e-test-plan.md) for complete testing documentation.
