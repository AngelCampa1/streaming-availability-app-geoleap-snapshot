using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.RegularExpressions;
using SerilogTimings;

namespace GeoLeap.Api.Services;

public class BillingAddressService : IBillingAddressService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BillingAddressService> _logger;

    public BillingAddressService(
        ApplicationDbContext context,
        ILogger<BillingAddressService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BillingAddressDto> CreateBillingAddressAsync(Guid userId, CreateBillingAddressRequest request, string correlationId)
    {
        using var activity = SerilogTimings.Operation.Begin("CreateBillingAddress");
        
        try
        {
            _logger.LogInformation("Creating billing address for user {UserId}", userId);

            // Validate the address
            var isValid = await ValidateAddressAsync(request, correlationId);
            if (!isValid)
                throw new ArgumentException("Invalid billing address data");

            // If setting as default, remove default flag from other addresses
            if (request.SetAsDefault)
            {
                var existingAddresses = await _context.BillingAddresses
                    .Where(ba => ba.UserId == userId && ba.IsDefault && ba.DeletedAt == null)
                    .ToListAsync();

                foreach (var addr in existingAddresses)
                {
                    addr.IsDefault = false;
                    addr.UpdatedAt = DateTime.UtcNow;
                }
            }

            var billingAddress = new BillingAddress
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CompanyName = request.CompanyName.Trim(),
                FullName = request.FullName.Trim(),
                AddressLine1 = request.AddressLine1.Trim(),
                AddressLine2 = request.AddressLine2.Trim(),
                City = request.City.Trim(),
                State = request.State.Trim(),
                PostalCode = request.PostalCode.Trim(),
                Country = request.Country.ToUpper().Trim(),
                TaxId = request.TaxId.Trim(),
                TaxIdType = request.TaxIdType.ToLower().Trim(),
                IsDefault = request.SetAsDefault,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.BillingAddresses.Add(billingAddress);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created billing address {AddressId} for user {UserId}", 
                billingAddress.Id, userId);

            activity.Complete();
            return MapToBillingAddressDto(billingAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create billing address for user {UserId}", userId);
            throw;
        }
    }

    public async Task<BillingAddressDto> UpdateBillingAddressAsync(Guid userId, Guid addressId, CreateBillingAddressRequest request, string correlationId)
    {
        try
        {
            var address = await _context.BillingAddresses
                .FirstOrDefaultAsync(ba => ba.Id == addressId && ba.UserId == userId && ba.DeletedAt == null);

            if (address == null)
                throw new ArgumentException("Billing address not found");

            // Validate the updated address
            var isValid = await ValidateAddressAsync(request, correlationId);
            if (!isValid)
                throw new ArgumentException("Invalid billing address data");

            // If setting as default, remove default flag from other addresses
            if (request.SetAsDefault && !address.IsDefault)
            {
                var existingDefaults = await _context.BillingAddresses
                    .Where(ba => ba.UserId == userId && ba.IsDefault && ba.Id != addressId && ba.DeletedAt == null)
                    .ToListAsync();

                foreach (var addr in existingDefaults)
                {
                    addr.IsDefault = false;
                    addr.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Update address
            address.CompanyName = request.CompanyName.Trim();
            address.FullName = request.FullName.Trim();
            address.AddressLine1 = request.AddressLine1.Trim();
            address.AddressLine2 = request.AddressLine2.Trim();
            address.City = request.City.Trim();
            address.State = request.State.Trim();
            address.PostalCode = request.PostalCode.Trim();
            address.Country = request.Country.ToUpper().Trim();
            address.TaxId = request.TaxId.Trim();
            address.TaxIdType = request.TaxIdType.ToLower().Trim();
            address.IsDefault = request.SetAsDefault;
            address.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated billing address {AddressId} for user {UserId}", addressId, userId);
            return MapToBillingAddressDto(address);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update billing address {AddressId} for user {UserId}", addressId, userId);
            throw;
        }
    }

    public async Task<bool> DeleteBillingAddressAsync(Guid userId, Guid addressId, string correlationId)
    {
        try
        {
            var address = await _context.BillingAddresses
                .FirstOrDefaultAsync(ba => ba.Id == addressId && ba.UserId == userId && ba.DeletedAt == null);

            if (address == null) return false;

            // Soft delete
            address.DeletedAt = DateTime.UtcNow;
            address.IsActive = false;
            address.UpdatedAt = DateTime.UtcNow;

            // If this was the default, make another address default
            if (address.IsDefault)
            {
                var nextDefault = await _context.BillingAddresses
                    .Where(ba => ba.UserId == userId && ba.Id != addressId && ba.DeletedAt == null)
                    .FirstOrDefaultAsync();

                if (nextDefault != null)
                {
                    nextDefault.IsDefault = true;
                    nextDefault.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted billing address {AddressId} for user {UserId}", addressId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete billing address {AddressId} for user {UserId}", addressId, userId);
            return false;
        }
    }

    public async Task<bool> SetDefaultBillingAddressAsync(Guid userId, Guid addressId, string correlationId)
    {
        try
        {
            // Remove default flag from all user addresses
            var userAddresses = await _context.BillingAddresses
                .Where(ba => ba.UserId == userId && ba.DeletedAt == null)
                .ToListAsync();

            foreach (var addr in userAddresses)
            {
                addr.IsDefault = addr.Id == addressId;
                addr.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Set billing address {AddressId} as default for user {UserId}", addressId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set default billing address {AddressId} for user {UserId}", addressId, userId);
            return false;
        }
    }

    public async Task<List<BillingAddressDto>> GetUserBillingAddressesAsync(Guid userId)
    {
        var addresses = await _context.BillingAddresses
            .Where(ba => ba.UserId == userId && ba.DeletedAt == null)
            .OrderBy(ba => ba.IsDefault ? 0 : 1)
            .ThenByDescending(ba => ba.CreatedAt)
            .ToListAsync();

        return addresses.Select(MapToBillingAddressDto).ToList();
    }

    public async Task<BillingAddressDto?> GetDefaultBillingAddressAsync(Guid userId)
    {
        var address = await _context.BillingAddresses
            .FirstOrDefaultAsync(ba => ba.UserId == userId && ba.IsDefault && ba.DeletedAt == null);

        return address != null ? MapToBillingAddressDto(address) : null;
    }

    public async Task<BillingAddressDto?> GetBillingAddressAsync(Guid userId, Guid addressId)
    {
        var address = await _context.BillingAddresses
            .FirstOrDefaultAsync(ba => ba.Id == addressId && ba.UserId == userId && ba.DeletedAt == null);

        return address != null ? MapToBillingAddressDto(address) : null;
    }

    public async Task<bool> ValidateAddressAsync(CreateBillingAddressRequest request, string correlationId)
    {
        try
        {
            // Basic validation
            if (string.IsNullOrWhiteSpace(request.FullName) ||
                string.IsNullOrWhiteSpace(request.AddressLine1) ||
                string.IsNullOrWhiteSpace(request.City) ||
                string.IsNullOrWhiteSpace(request.PostalCode) ||
                string.IsNullOrWhiteSpace(request.Country))
            {
                return false;
            }

            // Country code validation
            if (request.Country.Length != 2)
                return false;

            // Postal code validation by country
            var isValidPostal = await IsValidPostalCodeAsync(request.PostalCode, request.Country);
            if (!isValidPostal)
                return false;

            // Tax ID validation if provided
            if (!string.IsNullOrEmpty(request.TaxId))
            {
                // Basic format validation - in production would use external service
                var taxIdPattern = request.Country.ToUpper() switch
                {
                    "US" => @"^(\d{2}-\d{7}|\d{3}-\d{2}-\d{4})$", // EIN or SSN format
                    "GB" => @"^GB\d{9}(\d{3})?$", // UK VAT
                    "DE" => @"^DE\d{9}$", // German VAT
                    "CA" => @"^\d{9}[A-Z]{2}\d{4}$", // Canadian BN
                    _ => @"^.+$" // Accept any format for other countries
                };

                if (!Regex.IsMatch(request.TaxId, taxIdPattern))
                {
                    _logger.LogWarning("Invalid tax ID format for country {Country}: {TaxId}", 
                        request.Country, request.TaxId);
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate address for user");
            return false;
        }
    }

    public async Task<BillingAddressDto> StandardizeAddressAsync(BillingAddressDto address, string correlationId)
    {
        // Basic standardization - in production would use address validation service
        address.Country = address.Country.ToUpper();
        address.State = address.State.ToUpper();
        address.City = ToTitleCase(address.City);
        address.AddressLine1 = ToTitleCase(address.AddressLine1);
        address.AddressLine2 = ToTitleCase(address.AddressLine2);

        return address;
    }

    public async Task<bool> IsValidPostalCodeAsync(string postalCode, string country)
    {
        await Task.CompletedTask;

        var pattern = country.ToUpper() switch
        {
            "US" => @"^\d{5}(-\d{4})?$", // US ZIP code
            "CA" => @"^[A-Z]\d[A-Z] \d[A-Z]\d$", // Canadian postal code
            "GB" => @"^[A-Z]{1,2}\d{1,2}[A-Z]? \d[A-Z]{2}$", // UK postcode
            "DE" => @"^\d{5}$", // German postal code
            "FR" => @"^\d{5}$", // French postal code
            "AU" => @"^\d{4}$", // Australian postcode
            _ => @"^.+$" // Accept any format for other countries
        };

        return Regex.IsMatch(postalCode, pattern);
    }

    private BillingAddressDto MapToBillingAddressDto(BillingAddress address)
    {
        return new BillingAddressDto
        {
            Id = address.Id,
            CompanyName = address.CompanyName,
            FullName = address.FullName,
            AddressLine1 = address.AddressLine1,
            AddressLine2 = address.AddressLine2,
            City = address.City,
            State = address.State,
            PostalCode = address.PostalCode,
            Country = address.Country,
            TaxId = address.TaxId,
            TaxIdType = address.TaxIdType,
            IsDefault = address.IsDefault
        };
    }

    private static string ToTitleCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower());
    }
}