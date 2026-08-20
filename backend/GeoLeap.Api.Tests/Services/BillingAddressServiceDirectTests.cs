using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class BillingAddressServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<BillingAddressService>> _mockLogger;
    private readonly BillingAddressService _service;
    private readonly Guid _userId;
    private readonly Guid _otherUserId;
    private readonly string _correlationId;

    public BillingAddressServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;
        _context = new ApplicationDbContext(options);

        _mockLogger = new Mock<ILogger<BillingAddressService>>();
        _service = new BillingAddressService(_context, _mockLogger.Object);

        _userId = Guid.NewGuid();
        _otherUserId = Guid.NewGuid();
        _correlationId = Guid.NewGuid().ToString();

        SeedTestData();
    }

    private void SeedTestData()
    {
        // Create test users
        var users = new List<User>
        {
            new User
            {
                Id = _userId,
                Email = "user@test.com",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = _otherUserId,
                Email = "other@test.com",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow
            }
        };
        _context.Users.AddRange(users);

        // Seed existing billing addresses
        var addresses = new List<BillingAddress>
        {
            new BillingAddress
            {
                Id = Guid.NewGuid(),
                UserId = _userId,
                FullName = "John Doe",
                CompanyName = "Acme Corp",
                AddressLine1 = "123 Main St",
                AddressLine2 = "Suite 100",
                City = "New York",
                State = "NY",
                PostalCode = "10001",
                Country = "US",
                TaxId = "12-3456789",
                TaxIdType = "ein",
                IsDefault = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new BillingAddress
            {
                Id = Guid.NewGuid(),
                UserId = _userId,
                FullName = "John Doe",
                CompanyName = "",
                AddressLine1 = "456 Oak Ave",
                AddressLine2 = "",
                City = "Los Angeles",
                State = "CA",
                PostalCode = "90001",
                Country = "US",
                TaxId = "",
                TaxIdType = "",
                IsDefault = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-15)
            },
            new BillingAddress
            {
                Id = Guid.NewGuid(),
                UserId = _otherUserId,
                FullName = "Jane Smith",
                CompanyName = "Other Corp",
                AddressLine1 = "789 Elm St",
                AddressLine2 = "",
                City = "Chicago",
                State = "IL",
                PostalCode = "60601",
                Country = "US",
                TaxId = "",
                TaxIdType = "",
                IsDefault = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-20)
            }
        };
        _context.BillingAddresses.AddRange(addresses);
        _context.SaveChanges();
    }

    #region CreateBillingAddressAsync Tests (7 tests)

    [Fact]
    public async Task CreateBillingAddressAsync_WithValidData_CreatesAddress()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Alice Johnson",
            CompanyName = "Tech Solutions",
            AddressLine1 = "100 Tech Blvd",
            AddressLine2 = "Floor 5",
            City = "San Francisco",
            State = "CA",
            PostalCode = "94102",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.CreateBillingAddressAsync(_userId, request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Alice Johnson", result.FullName);
        Assert.Equal("Tech Solutions", result.CompanyName);
        Assert.Equal("100 Tech Blvd", result.AddressLine1);
        Assert.False(result.IsDefault);

        // Verify in database
        var dbAddress = await _context.BillingAddresses.FirstOrDefaultAsync(ba => ba.Id == result.Id);
        Assert.NotNull(dbAddress);
        Assert.Equal("US", dbAddress.Country);
    }

    [Fact]
    public async Task CreateBillingAddressAsync_WithSetAsDefault_RemovesOtherDefaults()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Bob Wilson",
            CompanyName = "",
            AddressLine1 = "200 New St",
            AddressLine2 = "",
            City = "Boston",
            State = "MA",
            PostalCode = "02101",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = true
        };

        // Act
        var result = await _service.CreateBillingAddressAsync(_userId, request, _correlationId);

        // Assert
        Assert.True(result.IsDefault);

        // Verify old default was unset
        var addresses = await _context.BillingAddresses
            .Where(ba => ba.UserId == _userId && ba.DeletedAt == null)
            .ToListAsync();

        var defaultCount = addresses.Count(a => a.IsDefault);
        Assert.Equal(1, defaultCount);
        Assert.Equal(result.Id, addresses.First(a => a.IsDefault).Id);
    }

    [Fact]
    public async Task CreateBillingAddressAsync_WithInvalidData_ThrowsException()
    {
        // Arrange - Missing required field
        var request = new CreateBillingAddressRequest
        {
            FullName = "", // Empty required field
            CompanyName = "",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "City",
            State = "ST",
            PostalCode = "12345",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateBillingAddressAsync(_userId, request, _correlationId));
    }

    [Fact]
    public async Task CreateBillingAddressAsync_WithInvalidPostalCode_ThrowsException()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test User",
            CompanyName = "",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "City",
            State = "ST",
            PostalCode = "INVALID", // Invalid US postal code
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateBillingAddressAsync(_userId, request, _correlationId));
    }

    [Fact]
    public async Task CreateBillingAddressAsync_WithInvalidTaxId_ThrowsException()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test User",
            CompanyName = "Test Corp",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "City",
            State = "ST",
            PostalCode = "12345",
            Country = "US",
            TaxId = "INVALID", // Invalid US EIN format
            TaxIdType = "ein",
            SetAsDefault = false
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateBillingAddressAsync(_userId, request, _correlationId));
    }

    [Fact]
    public async Task CreateBillingAddressAsync_WithTaxId_CreatesAddressWithTaxId()
    {
        // Arrange - Valid US EIN
        var request = new CreateBillingAddressRequest
        {
            FullName = "Tax Corp Owner",
            CompanyName = "Tax Corp",
            AddressLine1 = "123 Tax St",
            AddressLine2 = "",
            City = "Tax City",
            State = "TX",
            PostalCode = "75001",
            Country = "US",
            TaxId = "12-3456789",
            TaxIdType = "ein",
            SetAsDefault = false
        };

        // Act
        var result = await _service.CreateBillingAddressAsync(_userId, request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("12-3456789", result.TaxId);
        Assert.Equal("ein", result.TaxIdType);
    }

    [Fact]
    public async Task CreateBillingAddressAsync_TrimsInputFields()
    {
        // Arrange - Input with extra whitespace
        // Note: Country must be 2 chars for validation (validated before trimming)
        var request = new CreateBillingAddressRequest
        {
            FullName = "  Spaced Name  ",
            CompanyName = "  Spaced Company  ",
            AddressLine1 = "  123 Spaced St  ",
            AddressLine2 = "  Suite 100  ",
            City = "  Spaced City  ",
            State = "  CA  ",
            PostalCode = "94102", // Postal code validated before trimming
            Country = "US", // Country validated before trimming (must be exactly 2 chars)
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.CreateBillingAddressAsync(_userId, request, _correlationId);

        // Assert - Fields should be trimmed
        Assert.Equal("Spaced Name", result.FullName);
        Assert.Equal("Spaced Company", result.CompanyName);
        Assert.Equal("123 Spaced St", result.AddressLine1);
        Assert.Equal("Suite 100", result.AddressLine2);
        Assert.Equal("Spaced City", result.City);
        Assert.Equal("CA", result.State);
        Assert.Equal("94102", result.PostalCode);
        Assert.Equal("US", result.Country);
    }

    #endregion

    #region UpdateBillingAddressAsync Tests (5 tests)

    [Fact]
    public async Task UpdateBillingAddressAsync_WithValidData_UpdatesAddress()
    {
        // Arrange
        var existingAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && !ba.IsDefault);

        var request = new CreateBillingAddressRequest
        {
            FullName = "Updated Name",
            CompanyName = "Updated Corp",
            AddressLine1 = "Updated Street",
            AddressLine2 = "Updated Suite",
            City = "Updated City",
            State = "TX",
            PostalCode = "75001",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.UpdateBillingAddressAsync(_userId, existingAddress.Id, request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.FullName);
        Assert.Equal("Updated Corp", result.CompanyName);
        Assert.Equal("Updated Street", result.AddressLine1);

        // Verify in database
        var dbAddress = await _context.BillingAddresses.FindAsync(existingAddress.Id);
        Assert.NotNull(dbAddress);
        Assert.Equal("Updated City", dbAddress.City);
    }

    [Fact]
    public async Task UpdateBillingAddressAsync_SetAsDefault_UpdatesDefaultFlag()
    {
        // Arrange
        var nonDefaultAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && !ba.IsDefault);

        var request = new CreateBillingAddressRequest
        {
            FullName = "Test Name",
            CompanyName = "",
            AddressLine1 = "Test St",
            AddressLine2 = "",
            City = "Test City",
            State = "CA",
            PostalCode = "90001",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = true
        };

        // Act
        var result = await _service.UpdateBillingAddressAsync(_userId, nonDefaultAddress.Id, request, _correlationId);

        // Assert
        Assert.True(result.IsDefault);

        // Verify only one default exists
        var addresses = await _context.BillingAddresses
            .Where(ba => ba.UserId == _userId && ba.DeletedAt == null)
            .ToListAsync();

        Assert.Equal(1, addresses.Count(a => a.IsDefault));
    }

    [Fact]
    public async Task UpdateBillingAddressAsync_WithNonExistentAddress_ThrowsException()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test",
            CompanyName = "",
            AddressLine1 = "Test",
            AddressLine2 = "",
            City = "Test",
            State = "CA",
            PostalCode = "90001",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateBillingAddressAsync(_userId, nonExistentId, request, _correlationId));
    }

    [Fact]
    public async Task UpdateBillingAddressAsync_WithDifferentUserId_ThrowsException()
    {
        // Arrange - Try to update another user's address
        var otherUserAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _otherUserId);

        var request = new CreateBillingAddressRequest
        {
            FullName = "Hacker",
            CompanyName = "",
            AddressLine1 = "Test",
            AddressLine2 = "",
            City = "Test",
            State = "CA",
            PostalCode = "90001",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateBillingAddressAsync(_userId, otherUserAddress.Id, request, _correlationId));
    }

    [Fact]
    public async Task UpdateBillingAddressAsync_WithInvalidData_ThrowsException()
    {
        // Arrange
        var existingAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId);

        var request = new CreateBillingAddressRequest
        {
            FullName = "", // Invalid - empty required field
            CompanyName = "",
            AddressLine1 = "Test",
            AddressLine2 = "",
            City = "Test",
            State = "CA",
            PostalCode = "90001",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateBillingAddressAsync(_userId, existingAddress.Id, request, _correlationId));
    }

    #endregion

    #region DeleteBillingAddressAsync Tests (4 tests)

    [Fact]
    public async Task DeleteBillingAddressAsync_WithValidAddress_SoftDeletesAddress()
    {
        // Arrange
        var address = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && !ba.IsDefault);

        // Act
        var result = await _service.DeleteBillingAddressAsync(_userId, address.Id, _correlationId);

        // Assert
        Assert.True(result);

        // Verify soft delete
        var dbAddress = await _context.BillingAddresses.FindAsync(address.Id);
        Assert.NotNull(dbAddress);
        Assert.NotNull(dbAddress.DeletedAt);
        Assert.False(dbAddress.IsActive);
    }

    [Fact]
    public async Task DeleteBillingAddressAsync_DeletesDefaultAddress_AssignsNewDefault()
    {
        // Arrange
        var defaultAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && ba.IsDefault);

        // Act
        var result = await _service.DeleteBillingAddressAsync(_userId, defaultAddress.Id, _correlationId);

        // Assert
        Assert.True(result);

        // Verify a new default was assigned
        var remainingAddresses = await _context.BillingAddresses
            .Where(ba => ba.UserId == _userId && ba.DeletedAt == null)
            .ToListAsync();

        Assert.NotEmpty(remainingAddresses);
        Assert.Contains(remainingAddresses, a => a.IsDefault);
    }

    [Fact]
    public async Task DeleteBillingAddressAsync_WithNonExistentAddress_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.DeleteBillingAddressAsync(_userId, nonExistentId, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteBillingAddressAsync_WithDifferentUserId_ReturnsFalse()
    {
        // Arrange - Try to delete another user's address
        var otherUserAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _otherUserId);

        // Act
        var result = await _service.DeleteBillingAddressAsync(_userId, otherUserAddress.Id, _correlationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region SetDefaultBillingAddressAsync Tests (3 tests)

    [Fact]
    public async Task SetDefaultBillingAddressAsync_WithValidAddress_SetsAsDefault()
    {
        // Arrange
        var nonDefaultAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && !ba.IsDefault);

        // Act
        var result = await _service.SetDefaultBillingAddressAsync(_userId, nonDefaultAddress.Id, _correlationId);

        // Assert
        Assert.True(result);

        // Verify it's now default
        var dbAddress = await _context.BillingAddresses.FindAsync(nonDefaultAddress.Id);
        Assert.NotNull(dbAddress);
        Assert.True(dbAddress.IsDefault);

        // Verify only one default
        var defaultCount = await _context.BillingAddresses
            .CountAsync(ba => ba.UserId == _userId && ba.IsDefault && ba.DeletedAt == null);
        Assert.Equal(1, defaultCount);
    }

    [Fact]
    public async Task SetDefaultBillingAddressAsync_UnsetsOtherDefaults()
    {
        // Arrange
        var oldDefault = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && ba.IsDefault);
        var newDefault = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && !ba.IsDefault);

        // Act
        await _service.SetDefaultBillingAddressAsync(_userId, newDefault.Id, _correlationId);

        // Assert
        var oldDefaultRefreshed = await _context.BillingAddresses.FindAsync(oldDefault.Id);
        Assert.NotNull(oldDefaultRefreshed);
        Assert.False(oldDefaultRefreshed.IsDefault);
    }

    [Fact]
    public async Task SetDefaultBillingAddressAsync_WithNonExistentAddress_ReturnsTrue()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.SetDefaultBillingAddressAsync(_userId, nonExistentId, _correlationId);

        // Assert - Method returns true even if address doesn't exist (doesn't validate)
        Assert.True(result);
    }

    #endregion

    #region GetUserBillingAddressesAsync Tests (3 tests)

    [Fact]
    public async Task GetUserBillingAddressesAsync_ReturnsUserAddresses()
    {
        // Act
        var result = await _service.GetUserBillingAddressesAsync(_userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count); // User has 2 addresses
        Assert.All(result, addr => Assert.NotEqual(Guid.Empty, addr.Id));
    }

    [Fact]
    public async Task GetUserBillingAddressesAsync_OrdersByDefaultFirst()
    {
        // Act
        var result = await _service.GetUserBillingAddressesAsync(_userId);

        // Assert
        Assert.True(result[0].IsDefault); // Default should be first
        Assert.False(result[1].IsDefault);
    }

    [Fact]
    public async Task GetUserBillingAddressesAsync_ExcludesDeletedAddresses()
    {
        // Arrange - Soft delete one address
        var address = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId && !ba.IsDefault);
        address.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserBillingAddressesAsync(_userId);

        // Assert
        Assert.Equal(1, result.Count); // Only 1 active address remains
    }

    #endregion

    #region GetDefaultBillingAddressAsync Tests (2 tests)

    [Fact]
    public async Task GetDefaultBillingAddressAsync_ReturnsDefaultAddress()
    {
        // Act
        var result = await _service.GetDefaultBillingAddressAsync(_userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsDefault);
        Assert.Equal("John Doe", result.FullName);
    }

    [Fact]
    public async Task GetDefaultBillingAddressAsync_WithNoDefault_ReturnsNull()
    {
        // Arrange - Remove all defaults
        var addresses = await _context.BillingAddresses
            .Where(ba => ba.UserId == _userId)
            .ToListAsync();
        foreach (var addr in addresses)
        {
            addr.IsDefault = false;
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetDefaultBillingAddressAsync(_userId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetBillingAddressAsync Tests (3 tests)

    [Fact]
    public async Task GetBillingAddressAsync_WithValidId_ReturnsAddress()
    {
        // Arrange
        var existingAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _userId);

        // Act
        var result = await _service.GetBillingAddressAsync(_userId, existingAddress.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(existingAddress.Id, result.Id);
        Assert.Equal(existingAddress.FullName, result.FullName);
    }

    [Fact]
    public async Task GetBillingAddressAsync_WithNonExistentId_ReturnsNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetBillingAddressAsync(_userId, nonExistentId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetBillingAddressAsync_WithDifferentUserId_ReturnsNull()
    {
        // Arrange
        var otherUserAddress = await _context.BillingAddresses
            .FirstAsync(ba => ba.UserId == _otherUserId);

        // Act
        var result = await _service.GetBillingAddressAsync(_userId, otherUserAddress.Id);

        // Assert
        Assert.Null(result); // Should not return another user's address
    }

    #endregion

    #region ValidateAddressAsync Tests (6 tests)

    [Fact]
    public async Task ValidateAddressAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Valid User",
            CompanyName = "Valid Corp",
            AddressLine1 = "123 Valid St",
            AddressLine2 = "",
            City = "Valid City",
            State = "CA",
            PostalCode = "94102",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.ValidateAddressAsync(request, _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateAddressAsync_WithMissingRequiredFields_ReturnsFalse()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "", // Missing
            CompanyName = "",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "", // Missing
            State = "CA",
            PostalCode = "94102",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.ValidateAddressAsync(request, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateAddressAsync_WithInvalidCountryCode_ReturnsFalse()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test User",
            CompanyName = "",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "Test City",
            State = "ST",
            PostalCode = "12345",
            Country = "USA", // Should be 2 characters
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.ValidateAddressAsync(request, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateAddressAsync_WithInvalidPostalCode_ReturnsFalse()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test User",
            CompanyName = "",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "Test City",
            State = "CA",
            PostalCode = "INVALID",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            SetAsDefault = false
        };

        // Act
        var result = await _service.ValidateAddressAsync(request, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateAddressAsync_WithInvalidTaxId_ReturnsFalse()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test User",
            CompanyName = "Test Corp",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "Test City",
            State = "CA",
            PostalCode = "12345",
            Country = "US",
            TaxId = "INVALID",
            TaxIdType = "ein",
            SetAsDefault = false
        };

        // Act
        var result = await _service.ValidateAddressAsync(request, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateAddressAsync_WithValidTaxId_ReturnsTrue()
    {
        // Arrange
        var request = new CreateBillingAddressRequest
        {
            FullName = "Test User",
            CompanyName = "Test Corp",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "Test City",
            State = "CA",
            PostalCode = "12345",
            Country = "US",
            TaxId = "12-3456789", // Valid EIN format
            TaxIdType = "ein",
            SetAsDefault = false
        };

        // Act
        var result = await _service.ValidateAddressAsync(request, _correlationId);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region StandardizeAddressAsync Tests (3 tests)

    [Fact]
    public async Task StandardizeAddressAsync_StandardizesCountryAndState()
    {
        // Arrange
        var address = new BillingAddressDto
        {
            Id = Guid.NewGuid(),
            FullName = "Test User",
            CompanyName = "Test Corp",
            AddressLine1 = "123 test st",
            AddressLine2 = "suite 100",
            City = "new york",
            State = "ny",
            PostalCode = "10001",
            Country = "us",
            TaxId = "",
            TaxIdType = "",
            IsDefault = false
        };

        // Act
        var result = await _service.StandardizeAddressAsync(address, _correlationId);

        // Assert
        Assert.Equal("US", result.Country); // Uppercase
        Assert.Equal("NY", result.State); // Uppercase
    }

    [Fact]
    public async Task StandardizeAddressAsync_AppliesTitleCase()
    {
        // Arrange
        var address = new BillingAddressDto
        {
            Id = Guid.NewGuid(),
            FullName = "Test User",
            CompanyName = "Test Corp",
            AddressLine1 = "123 main street",
            AddressLine2 = "suite 100",
            City = "los angeles",
            State = "CA",
            PostalCode = "90001",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            IsDefault = false
        };

        // Act
        var result = await _service.StandardizeAddressAsync(address, _correlationId);

        // Assert
        Assert.Equal("123 Main Street", result.AddressLine1);
        Assert.Equal("Suite 100", result.AddressLine2);
        Assert.Equal("Los Angeles", result.City);
    }

    [Fact]
    public async Task StandardizeAddressAsync_HandlesEmptyFields()
    {
        // Arrange
        var address = new BillingAddressDto
        {
            Id = Guid.NewGuid(),
            FullName = "Test User",
            CompanyName = "",
            AddressLine1 = "123 Test St",
            AddressLine2 = "",
            City = "City",
            State = "CA",
            PostalCode = "12345",
            Country = "US",
            TaxId = "",
            TaxIdType = "",
            IsDefault = false
        };

        // Act
        var result = await _service.StandardizeAddressAsync(address, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("", result.CompanyName);
        Assert.Equal("", result.AddressLine2);
    }

    #endregion

    #region IsValidPostalCodeAsync Tests (6 tests)

    [Fact]
    public async Task IsValidPostalCodeAsync_US_ValidatesZipCode()
    {
        // Arrange & Act & Assert
        Assert.True(await _service.IsValidPostalCodeAsync("12345", "US"));
        Assert.True(await _service.IsValidPostalCodeAsync("12345-6789", "US"));
        Assert.False(await _service.IsValidPostalCodeAsync("1234", "US"));
        Assert.False(await _service.IsValidPostalCodeAsync("INVALID", "US"));
    }

    [Fact]
    public async Task IsValidPostalCodeAsync_CA_ValidatesCanadianPostalCode()
    {
        // Arrange & Act & Assert
        Assert.True(await _service.IsValidPostalCodeAsync("A1B 2C3", "CA"));
        Assert.False(await _service.IsValidPostalCodeAsync("12345", "CA"));
        Assert.False(await _service.IsValidPostalCodeAsync("ABC123", "CA"));
    }

    [Fact]
    public async Task IsValidPostalCodeAsync_GB_ValidatesUKPostcode()
    {
        // Arrange & Act & Assert
        Assert.True(await _service.IsValidPostalCodeAsync("SW1A 1AA", "GB"));
        Assert.True(await _service.IsValidPostalCodeAsync("W1A 1AA", "GB"));
        Assert.False(await _service.IsValidPostalCodeAsync("12345", "GB"));
    }

    [Fact]
    public async Task IsValidPostalCodeAsync_DE_ValidatesGermanPostalCode()
    {
        // Arrange & Act & Assert
        Assert.True(await _service.IsValidPostalCodeAsync("12345", "DE"));
        Assert.False(await _service.IsValidPostalCodeAsync("1234", "DE"));
        Assert.False(await _service.IsValidPostalCodeAsync("123456", "DE"));
    }

    [Fact]
    public async Task IsValidPostalCodeAsync_AU_ValidatesAustralianPostcode()
    {
        // Arrange & Act & Assert
        Assert.True(await _service.IsValidPostalCodeAsync("2000", "AU"));
        Assert.False(await _service.IsValidPostalCodeAsync("200", "AU"));
        Assert.False(await _service.IsValidPostalCodeAsync("20000", "AU"));
    }

    [Fact]
    public async Task IsValidPostalCodeAsync_OtherCountries_AcceptsAnyFormat()
    {
        // Arrange & Act & Assert - Other countries accept any format
        Assert.True(await _service.IsValidPostalCodeAsync("ABC123", "XX"));
        Assert.True(await _service.IsValidPostalCodeAsync("12345", "YY"));
        Assert.True(await _service.IsValidPostalCodeAsync("ANY-FORMAT", "ZZ"));
    }

    #endregion

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
