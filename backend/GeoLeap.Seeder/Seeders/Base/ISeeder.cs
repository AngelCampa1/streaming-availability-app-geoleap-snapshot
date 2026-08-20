namespace GeoLeap.Seeder.Seeders.Base;

public interface ISeeder
{
    string Name { get; }
    int Order { get; }
    Task SeedAsync(SeederConfiguration config, CancellationToken cancellationToken = default);
    Task<bool> IsAlreadySeededAsync(CancellationToken cancellationToken = default);
}
