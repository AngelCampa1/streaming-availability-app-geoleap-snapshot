using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test implementation of IDbContextFactory that shares the same context instance
/// This prevents ObjectDisposedException by ensuring all tests use the same context
/// </summary>
public class InlineTestDbContextFactory : IDbContextFactory<ApplicationDbContext>
{
    private readonly ApplicationDbContext _context;

    public InlineTestDbContextFactory(ApplicationDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public ApplicationDbContext CreateDbContext()
    {
        // Return the same context instance for test scenarios
        // This prevents ObjectDisposedException and ensures data consistency
        return _context;
    }
}