using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Manages test data seeding, cleanup, and isolation across different test categories
    /// Provides pre-built data sets for common testing scenarios
    /// </summary>
    public class TestDataManager : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly List<object> _seededEntities = new();
        private bool _disposed = false;

        public TestDataManager(ApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        /// <summary>
        /// Seed minimal data set for unit tests (fast, essential data only)
        /// </summary>
        public async Task SeedUnitTestData()
        {
            // Unit tests typically don't need database data
            // This method is here for completeness
            await Task.CompletedTask;
        }

        /// <summary>
        /// Seed comprehensive data set for integration tests
        /// </summary>
        public async Task SeedIntegrationTestData()
        {
            await SeedUsers();
            await SeedContent();
            await SeedSubscriptions();
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Seed full data set for E2E tests (complete scenarios)
        /// </summary>
        public async Task SeedE2ETestData()
        {
            await SeedUsers();
            await SeedContent();
            await SeedSubscriptions();
            await SeedPaymentMethods();
            await SeedStreamingServices();
            await SeedUserPreferences();
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Create test users with different roles and states
        /// </summary>
        private async Task SeedUsers()
        {
            var users = new[]
            {
                new User
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Email = "test@example.com",
                    Name = "Test User",
                    EmailVerified = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                new User
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Email = "admin@example.com",
                    Name = "Admin User",
                    EmailVerified = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-60)
                },
                new User
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Email = "premium@example.com",
                    Name = "Premium User",
                    EmailVerified = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-10)
                }
            };

            foreach (var user in users)
            {
                if (!await _context.Users.AnyAsync(u => u.Id == user.Id))
                {
                    _context.Users.Add(user);
                    _seededEntities.Add(user);
                }
            }
        }

        /// <summary>
        /// Create test content items
        /// </summary>
        private async Task SeedContent()
        {
            var contentItems = new[]
            {
                new ContentItem
                {
                    Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Title = "Test Movie 1",
                    Type = "movie",
                    Year = 2023,
                    Rating = 8.5,
                    CreatedAt = DateTime.UtcNow.AddDays(-15)
                },
                new ContentItem
                {
                    Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                    Title = "Test Series 1",
                    Type = "series",
                    Year = 2022,
                    Rating = 9.0,
                    CreatedAt = DateTime.UtcNow.AddDays(-20)
                }
            };

            foreach (var item in contentItems)
            {
                if (!await _context.ContentItems.AnyAsync(c => c.Id == item.Id))
                {
                    _context.ContentItems.Add(item);
                    _seededEntities.Add(item);
                }
            }
        }

        /// <summary>
        /// Create test subscriptions
        /// </summary>
        private async Task SeedSubscriptions()
        {
            var subscriptions = new[]
            {
                new UserSubscription
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                    UserId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    PlanType = "premium",
                    Status = "active",
                    StartDate = DateTime.UtcNow.AddDays(-30),
                    EndDate = DateTime.UtcNow.AddDays(30)
                }
            };

            foreach (var subscription in subscriptions)
            {
                if (!await _context.UserSubscriptions.AnyAsync(s => s.Id == subscription.Id))
                {
                    _context.UserSubscriptions.Add(subscription);
                    _seededEntities.Add(subscription);
                }
            }
        }

        /// <summary>
        /// Create test payment methods (E2E only)
        /// </summary>
        private async Task SeedPaymentMethods()
        {
            var paymentMethods = new[]
            {
                new PaymentMethod
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
                    UserId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Type = "card",
                    Last4 = "4242",
                    ExpiryMonth = 12,
                    ExpiryYear = 2025,
                    IsDefault = true
                }
            };

            foreach (var method in paymentMethods)
            {
                if (!await _context.PaymentMethods.AnyAsync(p => p.Id == method.Id))
                {
                    _context.PaymentMethods.Add(method);
                    _seededEntities.Add(method);
                }
            }
        }

        /// <summary>
        /// Create test streaming services (E2E only)
        /// </summary>
        private async Task SeedStreamingServices()
        {
            var services = new[]
            {
                new StreamingService
                {
                    Id = Guid.Parse("88888888-8888-8888-8888-888888888888"),
                    Name = "Test Netflix",
                    BaseUrl = "https://api.test-netflix.com",
                    IsActive = true
                },
                new StreamingService
                {
                    Id = Guid.Parse("99999999-9999-9999-9999-999999999999"),
                    Name = "Test Hulu",
                    BaseUrl = "https://api.test-hulu.com",
                    IsActive = true
                }
            };

            foreach (var service in services)
            {
                if (!await _context.StreamingServices.AnyAsync(s => s.Id == service.Id))
                {
                    _context.StreamingServices.Add(service);
                    _seededEntities.Add(service);
                }
            }
        }

        /// <summary>
        /// Create test user preferences (E2E only)
        /// </summary>
        private async Task SeedUserPreferences()
        {
            var preferences = new[]
            {
                new UserContentPreference
                {
                    Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                    UserId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Genre = "Action",
                    Weight = 0.8
                },
                new UserContentPreference
                {
                    Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                    UserId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Genre = "Comedy",
                    Weight = 0.6
                }
            };

            foreach (var preference in preferences)
            {
                if (!await _context.UserContentPreferences.AnyAsync(p => p.Id == preference.Id))
                {
                    _context.UserContentPreferences.Add(preference);
                    _seededEntities.Add(preference);
                }
            }
        }

        /// <summary>
        /// Clean up all seeded test data
        /// </summary>
        public async Task CleanupTestData()
        {
            try
            {
                // Remove seeded entities in reverse order
                for (int i = _seededEntities.Count - 1; i >= 0; i--)
                {
                    var entity = _seededEntities[i];
                    var entry = _context.Entry(entity);
                    
                    if (entry.State != EntityState.Detached)
                    {
                        _context.Remove(entity);
                    }
                }

                await _context.SaveChangesAsync();
                _seededEntities.Clear();
            }
            catch (Exception ex)
            {
                // Log cleanup failure but don't throw
                Console.WriteLine($"Warning: Test data cleanup failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Reset database to clean state
        /// </summary>
        public async Task ResetDatabase()
        {
            await _context.Database.EnsureDeletedAsync();
            await _context.Database.EnsureCreatedAsync();
            _seededEntities.Clear();
        }

        public void Dispose()
        {
            if (_disposed) return;

            CleanupTestData().GetAwaiter().GetResult();
            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }

    // Placeholder entity classes - these should be replaced with actual models from the application
    public class User
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool EmailVerified { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ContentItem
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Year { get; set; }
        public double Rating { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UserSubscription
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string PlanType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class PaymentMethod
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Last4 { get; set; } = string.Empty;
        public int ExpiryMonth { get; set; }
        public int ExpiryYear { get; set; }
        public bool IsDefault { get; set; }
    }

    public class StreamingService
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class UserContentPreference
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Genre { get; set; } = string.Empty;
        public double Weight { get; set; }
    }
}