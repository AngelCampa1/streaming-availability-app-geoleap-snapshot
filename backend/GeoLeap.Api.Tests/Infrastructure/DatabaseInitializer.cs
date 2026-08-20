using GeoLeap.Api.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Database initializer to ensure the schema is created during WebApplicationFactory startup
/// This fixes the HealthController 500 error caused by missing database schema
/// </summary>
public interface IDatabaseInitializer
{
    Task InitializeAsync();
}

public class DatabaseInitializer : IDatabaseInitializer, IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    
    public DatabaseInitializer(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    
    public async Task InitializeAsync()
    {
        try
        {
            Console.WriteLine("💾 CRITICAL FIX: Initializing database schema...");
            
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            await dbContext.Database.EnsureCreatedAsync();
            
            Console.WriteLine("✅ Database schema initialized successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Database initialization error: {ex.Message}");
            throw;
        }
    }
    
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await InitializeAsync();
    }
    
    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}