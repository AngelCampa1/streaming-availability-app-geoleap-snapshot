using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

public class TaxCalculationService : ITaxCalculationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TaxCalculationService> _logger;
    private readonly IConfiguration _configuration;

    // Tax rates by jurisdiction (in production, this would come from a tax service API)
    private readonly Dictionary<string, Dictionary<string, decimal>> _taxRates = new()
    {
        ["US"] = new Dictionary<string, decimal>
        {
            ["CA"] = 0.0975m, // California sales tax
            ["NY"] = 0.08m,   // New York sales tax  
            ["TX"] = 0.0625m, // Texas sales tax
            ["FL"] = 0.06m,   // Florida sales tax
            ["WA"] = 0.065m   // Washington sales tax
        },
        ["GB"] = new Dictionary<string, decimal> { [""] = 0.20m }, // UK VAT
        ["DE"] = new Dictionary<string, decimal> { [""] = 0.19m }, // Germany VAT
        ["FR"] = new Dictionary<string, decimal> { [""] = 0.20m }, // France VAT
        ["CA"] = new Dictionary<string, decimal> 
        { 
            ["ON"] = 0.13m,   // Ontario HST
            ["BC"] = 0.12m,   // BC PST + GST
            ["QC"] = 0.14975m // Quebec GST + QST
        }
    };

    public TaxCalculationService(
        ApplicationDbContext context,
        ILogger<TaxCalculationService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<TaxCalculationDto> CalculateTaxAsync(decimal amount, string country, string? stateProvince, string? taxId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Calculating tax for amount {Amount} in jurisdiction {Country}/{StateProvince}",
                amount, country, stateProvince);

            // Check if customer is tax exempt
            if (!string.IsNullOrEmpty(taxId))
            {
                var isExempt = await IsTaxExemptAsync(taxId, country, correlationId);
                if (isExempt)
                {
                    return new TaxCalculationDto
                    {
                        TaxType = "exempt",
                        TaxName = "Tax Exempt",
                        Rate = 0,
                        TaxableAmount = amount,
                        TaxAmount = 0,
                        Country = country,
                        StateProvince = stateProvince ?? "",
                        Jurisdiction = $"{country}/{stateProvince}"
                    };
                }
            }

            var jurisdiction = await DetermineTaxJurisdictionAsync(new BillingAddressDto 
            { 
                Country = country, 
                State = stateProvince ?? "" 
            });

            var rate = await GetTaxRateAsync(country, stateProvince, GetTaxType(country));
            var taxAmount = Math.Round(amount * rate, 2);

            return new TaxCalculationDto
            {
                TaxType = GetTaxType(country),
                TaxName = GetTaxName(country, stateProvince),
                Rate = rate,
                TaxableAmount = amount,
                TaxAmount = taxAmount,
                Country = country,
                StateProvince = stateProvince ?? "",
                Jurisdiction = jurisdiction
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate tax for jurisdiction {Country}/{StateProvince}", 
                country, stateProvince);
            throw;
        }
    }

    public async Task<List<TaxCalculationDto>> CalculateMultipleTaxesAsync(List<InvoiceLineItemDto> lineItems, BillingAddressDto billingAddress, string correlationId)
    {
        var taxCalculations = new List<TaxCalculationDto>();
        var totalTaxableAmount = lineItems.Sum(item => item.Amount);

        if (totalTaxableAmount <= 0)
            return taxCalculations;

        try
        {
            var taxCalc = await CalculateTaxAsync(
                totalTaxableAmount, 
                billingAddress.Country, 
                billingAddress.State, 
                billingAddress.TaxId,
                correlationId);

            taxCalculations.Add(taxCalc);

            _logger.LogInformation("Calculated {TaxAmount} tax for {LineItemCount} line items totaling {Amount}",
                taxCalc.TaxAmount, lineItems.Count, totalTaxableAmount);

            return taxCalculations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate taxes for {LineItemCount} line items", lineItems.Count);
            throw;
        }
    }

    public async Task<bool> ValidateTaxIdAsync(string taxId, string taxIdType, string country, string correlationId)
    {
        if (string.IsNullOrEmpty(taxId)) return true; // Tax ID is optional

        try
        {
            return country.ToUpper() switch
            {
                "US" => ValidateUsTaxId(taxId, taxIdType),
                "GB" => ValidateUkVatNumber(taxId),
                "DE" => ValidateEuVatNumber(taxId, "DE"),
                "FR" => ValidateEuVatNumber(taxId, "FR"),
                "CA" => ValidateCanadianTaxId(taxId),
                _ => true // Accept unknown jurisdictions for now
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate tax ID {TaxId} for country {Country}", taxId, country);
            return false;
        }
    }

    public async Task<decimal> GetTaxRateAsync(string country, string? stateProvince, string taxType)
    {
        await Task.CompletedTask; // For async interface compliance

        if (!_taxRates.ContainsKey(country.ToUpper()))
            return 0; // No tax for unsupported countries

        var countryRates = _taxRates[country.ToUpper()];
        var state = stateProvince?.ToUpper() ?? "";

        if (countryRates.ContainsKey(state))
            return countryRates[state];
        
        if (countryRates.ContainsKey(""))
            return countryRates[""];

        return 0;
    }

    public async Task<string> DetermineTaxJurisdictionAsync(BillingAddressDto billingAddress)
    {
        await Task.CompletedTask;
        
        var country = billingAddress.Country.ToUpper();
        var state = billingAddress.State.ToUpper();

        return string.IsNullOrEmpty(state) ? country : $"{country}/{state}";
    }

    public async Task<List<string>> GetSupportedTaxJurisdictionsAsync()
    {
        await Task.CompletedTask;
        
        var jurisdictions = new List<string>();
        
        foreach (var country in _taxRates.Keys)
        {
            foreach (var state in _taxRates[country].Keys)
            {
                jurisdictions.Add(string.IsNullOrEmpty(state) ? country : $"{country}/{state}");
            }
        }

        return jurisdictions;
    }

    public async Task<bool> IsTaxExemptAsync(string taxId, string country, string correlationId)
    {
        await Task.CompletedTask;

        // Basic tax exemption logic - in production this would integrate with tax services
        if (string.IsNullOrEmpty(taxId)) return false;

        // For demo purposes, consider certain patterns as exempt
        return country.ToUpper() switch
        {
            "US" => taxId.StartsWith("EX-") || taxId.Length == 9, // Basic EIN format
            "GB" => taxId.StartsWith("GB") && (taxId.Length == 11 || taxId.Length == 14), // GB + 9 digits OR GB + 12 digits
            _ => false
        };
    }

    public async Task<bool> ValidateInvoiceTaxComplianceAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            var invoice = await _context.Invoices
                .Include(i => i.BillingAddress)
                .Include(i => i.TaxCalculations)
                .Include(i => i.LineItems)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null) return false;

            // Validate tax calculations are present for taxable jurisdictions
            var jurisdiction = await DetermineTaxJurisdictionAsync(MapToBillingAddressDto(invoice.BillingAddress!));
            var expectedRate = await GetTaxRateAsync(invoice.BillingAddress!.Country, invoice.BillingAddress.State, GetTaxType(invoice.BillingAddress.Country));

            if (expectedRate > 0 && !invoice.TaxCalculations.Any())
            {
                _logger.LogWarning("Invoice {InvoiceId} missing tax calculations for taxable jurisdiction {Jurisdiction}",
                    invoiceId, jurisdiction);
                return false;
            }

            // Validate tax amounts match calculations
            var calculatedTotal = invoice.TaxCalculations.Sum(t => t.TaxAmount);
            if (Math.Abs(calculatedTotal - invoice.TaxAmount) > 0.01m)
            {
                _logger.LogWarning("Invoice {InvoiceId} tax amount mismatch: calculated {Calculated}, stored {Stored}",
                    invoiceId, calculatedTotal, invoice.TaxAmount);
                return false;
            }

            _logger.LogInformation("Invoice {InvoiceId} tax compliance validation passed", invoiceId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate tax compliance for invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    public async Task<Dictionary<string, object>> GenerateTaxReportAsync(DateTime startDate, DateTime endDate, string jurisdiction)
    {
        try
        {
            var taxCalculations = await _context.TaxCalculations
                .Include(t => t.Invoice)
                .Where(t => t.Invoice.IssueDate >= startDate && 
                           t.Invoice.IssueDate <= endDate &&
                           t.Jurisdiction == jurisdiction)
                .ToListAsync();

            var report = new Dictionary<string, object>
            {
                ["jurisdiction"] = jurisdiction,
                ["start_date"] = startDate,
                ["end_date"] = endDate,
                ["total_tax_collected"] = taxCalculations.Sum(t => t.TaxAmount),
                ["total_taxable_amount"] = taxCalculations.Sum(t => t.TaxableAmount),
                ["transaction_count"] = taxCalculations.Count,
                ["tax_breakdown"] = taxCalculations
                    .GroupBy(t => t.TaxType)
                    .ToDictionary(g => g.Key, g => new {
                        tax_amount = g.Sum(t => t.TaxAmount),
                        taxable_amount = g.Sum(t => t.TaxableAmount),
                        average_rate = g.Average(t => t.Rate),
                        transaction_count = g.Count()
                    }),
                ["monthly_breakdown"] = taxCalculations
                    .GroupBy(t => t.Invoice.IssueDate.ToString("yyyy-MM"))
                    .ToDictionary(g => g.Key, g => g.Sum(t => t.TaxAmount))
            };

            _logger.LogInformation("Generated tax report for {Jurisdiction} from {StartDate} to {EndDate}: {TotalTax}",
                jurisdiction, startDate, endDate, report["total_tax_collected"]);

            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate tax report for jurisdiction {Jurisdiction}", jurisdiction);
            throw;
        }
    }

    private static string GetTaxType(string country)
    {
        return country.ToUpper() switch
        {
            "US" => "sales_tax",
            "GB" or "DE" or "FR" or "ES" or "IT" or "NL" => "vat",
            "CA" => "gst",
            "AU" => "gst",
            _ => "tax"
        };
    }

    private static string GetTaxName(string country, string? stateProvince = null)
    {
        return country.ToUpper() switch
        {
            "US" => $"{stateProvince ?? "Sales"} Tax",
            "GB" => "VAT",
            "DE" => "Mehrwertsteuer (VAT)",
            "FR" => "TVA (VAT)",
            "CA" => string.IsNullOrEmpty(stateProvince) ? "GST" : $"{stateProvince} Tax",
            "AU" => "GST",
            _ => "Tax"
        };
    }

    private static bool ValidateUsTaxId(string taxId, string taxIdType)
    {
        return taxIdType.ToLower() switch
        {
            "ein" => Regex.IsMatch(taxId, @"^\d{2}-\d{7}$"),
            "ssn" => Regex.IsMatch(taxId, @"^\d{3}-\d{2}-\d{4}$"),
            _ => true
        };
    }

    private static bool ValidateUkVatNumber(string vatNumber)
    {
        // UK VAT number format: GB + 9 digits or GB + 12 digits
        return Regex.IsMatch(vatNumber, @"^GB\d{9}(\d{3})?$");
    }

    private static bool ValidateEuVatNumber(string vatNumber, string countryCode)
    {
        // Basic EU VAT validation - in production would use VIES API
        return vatNumber.StartsWith(countryCode.ToUpper()) && vatNumber.Length >= 8;
    }

    private static bool ValidateCanadianTaxId(string taxId)
    {
        // Canadian business number format: 9 digits + 2-letter program identifier + 4-digit reference
        return Regex.IsMatch(taxId, @"^\d{9}[A-Z]{2}\d{4}$");
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
}