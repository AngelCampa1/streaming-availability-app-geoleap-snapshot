using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test implementation of IDbContextFactory for integration tests
/// Reuses the same context instance to avoid database connection issues
/// </summary>
public class TestDbContextFactory : IDbContextFactory<ApplicationDbContext>
{
    private readonly ApplicationDbContext _context;

    public TestDbContextFactory(ApplicationDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public ApplicationDbContext CreateDbContext()
    {
        // Return the same context instance for test scenarios
        // This ensures all operations use the same in-memory database
        return _context;
    }
}