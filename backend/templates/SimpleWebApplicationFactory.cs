using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Simple WebApplicationFactory template - copy-paste ready
/// Zero complex inheritance, minimal configuration
/// </summary>
public class SimpleWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Replace database with in-memory for testing
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));

            // Build service provider to seed data if needed
            using var scope = services.BuildServiceProvider().CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Database.EnsureCreated();
        });

        builder.UseEnvironment("Testing");
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            // Cleanup happens automatically with in-memory database
        }
        base.Dispose(disposing);
    }
}

/*
USAGE EXAMPLE:

public class YourControllerTest : IClassFixture<SimpleWebApplicationFactory>
{
    private readonly SimpleWebApplicationFactory _factory;

    public YourControllerTest(SimpleWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Test_Example()
    {
        // Arrange
        using var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/test");

        // Assert
        response.EnsureSuccessStatusCode();
    }
}
*/