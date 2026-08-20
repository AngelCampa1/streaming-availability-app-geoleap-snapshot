using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;
using System.Text;
using SerilogTimings;

namespace GeoLeap.Api.Services;

public class AccountingExportService : IAccountingExportService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AccountingExportService> _logger;
    private readonly ITaxCalculationService _taxService;

    // Chart of Accounts mapping for QuickBooks, Xero, etc.
    private readonly Dictionary<string, string> _chartOfAccountsMapping = new()
    {
        ["subscription_revenue"] = "4000", // Revenue account
        ["sales_tax_collected"] = "2200",  // Sales Tax Payable
        ["vat_collected"] = "2210",        // VAT Payable
        ["processing_fees"] = "5200",      // Processing Fees Expense
        ["refunds"] = "4100"               // Returns and Refunds
    };

    public AccountingExportService(
        ApplicationDbContext context,
        ILogger<AccountingExportService> logger,
        ITaxCalculationService taxService)
    {
        _context = context;
        _logger = logger;
        _taxService = taxService;
    }

    public async Task<byte[]> ExportInvoiceDataAsync(InvoiceFilterRequest filter, string format, string correlationId)
    {
        using var activity = SerilogTimings.Operation.Begin("ExportInvoiceData");
        
        try
        {
            _logger.LogInformation("Exporting invoice data in {Format} format", format);

            var invoices = await GetFilteredInvoicesAsync(filter);
            
            return format.ToLower() switch
            {
                "csv" => await ExportToCsvAsync(invoices, correlationId),
                "excel" => await ExportToExcelAsync(invoices, correlationId),
                "json" => await ExportToJsonAsync(invoices, correlationId),
                "quickbooks" => await ExportToQuickBooksAsync(invoices, correlationId),
                "xero" => await ExportToXeroAsync(invoices, correlationId),
                _ => throw new ArgumentException($"Unsupported export format: {format}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export invoice data in format {Format}", format);
            throw;
        }
    }

    public async Task<byte[]> ExportTaxReportAsync(DateTime startDate, DateTime endDate, string jurisdiction, string format)
    {
        try
        {
            var taxReport = await _taxService.GenerateTaxReportAsync(startDate, endDate, jurisdiction);

            return format.ToLower() switch
            {
                "json" => await ExportToJsonAsync(new List<Dictionary<string, object>> { taxReport }, "tax-report"),
                "csv" => await ExportTaxReportToCsvAsync(taxReport),
                _ => throw new ArgumentException($"Unsupported tax report format: {format}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export tax report for {Jurisdiction}", jurisdiction);
            throw;
        }
    }

    public async Task<byte[]> ExportRevenueReportAsync(DateTime startDate, DateTime endDate, string format)
    {
        try
        {
            var revenueData = await GenerateRevenueReportAsync(startDate, endDate);

            return format.ToLower() switch
            {
                "csv" => await ExportToCsvAsync(revenueData, "revenue-report"),
                "excel" => await ExportToExcelAsync(revenueData, "revenue-report"),
                "json" => await ExportToJsonAsync(revenueData, "revenue-report"),
                _ => throw new ArgumentException($"Unsupported revenue report format: {format}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export revenue report");
            throw;
        }
    }

    public Task<byte[]> ExportToCsvAsync<T>(List<T> data, string correlationId)
    {
        try
        {
            if (!data.Any()) return Task.FromResult(Encoding.UTF8.GetBytes("No data available"));

            var csv = new StringBuilder();
            var properties = typeof(T).GetProperties();

            // Header
            csv.AppendLine(string.Join(",", properties.Select(p => p.Name)));

            // Data rows
            foreach (var item in data)
            {
                var values = properties.Select(p =>
                {
                    var value = p.GetValue(item);
                    return EscapeCsv(value?.ToString() ?? "");
                });
                csv.AppendLine(string.Join(",", values));
            }

            return Task.FromResult(Encoding.UTF8.GetBytes(csv.ToString()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export data to CSV");
            throw;
        }
    }

    public Task<byte[]> ExportToExcelAsync<T>(List<T> data, string correlationId)
    {
        // For now, return CSV format - could enhance with actual Excel library (EPPlus) later
        return ExportToCsvAsync(data, correlationId);
    }

    public Task<byte[]> ExportToJsonAsync<T>(List<T> data, string correlationId)
    {
        try
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var json = JsonSerializer.Serialize(data, options);
            return Task.FromResult(Encoding.UTF8.GetBytes(json));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export data to JSON");
            throw;
        }
    }

    public Task<Dictionary<string, string>> GetChartOfAccountsMappingAsync()
    {
        return Task.FromResult(new Dictionary<string, string>(_chartOfAccountsMapping));
    }

    public Task<bool> UpdateChartOfAccountsMappingAsync(Dictionary<string, string> mapping, string updatedBy)
    {
        try
        {
            _chartOfAccountsMapping.Clear();
            foreach (var kvp in mapping)
            {
                _chartOfAccountsMapping[kvp.Key] = kvp.Value;
            }

            // In production, this would persist to database
            _logger.LogInformation("Updated chart of accounts mapping by {UpdatedBy}", updatedBy);
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update chart of accounts mapping");
            return Task.FromResult(false);
        }
    }

    private async Task<List<InvoiceExportDto>> GetFilteredInvoicesAsync(InvoiceFilterRequest filter)
    {
        var query = _context.Invoices
            .Include(i => i.User)
            .Include(i => i.BillingAddress)
            .Include(i => i.LineItems)
            .Include(i => i.TaxCalculations)
            .AsQueryable();

        // Apply filters
        if (filter.StartDate.HasValue)
            query = query.Where(i => i.IssueDate >= filter.StartDate.Value);
        
        if (filter.EndDate.HasValue)
            query = query.Where(i => i.IssueDate <= filter.EndDate.Value);
        
        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(i => i.Status == filter.Status);

        var invoices = await query.ToListAsync();

        return invoices.Select(i => new InvoiceExportDto
        {
            InvoiceNumber = i.InvoiceNumber,
            CustomerName = i.BillingAddress?.FullName ?? $"{i.User?.FirstName ?? ""} {i.User?.LastName ?? ""}".Trim(),
            CustomerEmail = i.User?.Email ?? "",
            CompanyName = i.BillingAddress?.CompanyName ?? "",
            IssueDate = i.IssueDate,
            DueDate = i.DueDate,
            PaidDate = i.PaidAt,
            Status = i.Status ?? "",
            Subtotal = i.Subtotal,
            TaxAmount = i.TaxAmount,
            Total = i.Total,
            Currency = i.Currency ?? "",
            Description = i.Description ?? "",
            TaxJurisdiction = i.TaxCalculations?.FirstOrDefault()?.Jurisdiction ?? "",
            PaymentMethod = "Credit Card", // From payment transaction
            AccountCode = _chartOfAccountsMapping["subscription_revenue"]
        }).ToList();
    }

    private Task<byte[]> ExportToQuickBooksAsync(List<InvoiceExportDto> invoices, string correlationId)
    {
        try
        {
            var csv = new StringBuilder();

            // QuickBooks CSV format headers
            csv.AppendLine("Invoice No.,Customer,Customer Email,Date,Due Date,Item,Description,Qty,Rate,Amount,Tax");

            foreach (var invoice in invoices)
            {
                csv.AppendLine($"{EscapeCsv(invoice.InvoiceNumber)}," +
                              $"{EscapeCsv(invoice.CustomerName)}," +
                              $"{EscapeCsv(invoice.CustomerEmail)}," +
                              $"{invoice.IssueDate:MM/dd/yyyy}," +
                              $"{invoice.DueDate:MM/dd/yyyy}," +
                              $"Subscription Service," +
                              $"{EscapeCsv(invoice.Description)}," +
                              $"1," +
                              $"{invoice.Subtotal}," +
                              $"{invoice.Subtotal}," +
                              $"{invoice.TaxAmount}");
            }

            _logger.LogInformation("Generated QuickBooks export for {Count} invoices", invoices.Count);
            return Task.FromResult(Encoding.UTF8.GetBytes(csv.ToString()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate QuickBooks export");
            throw;
        }
    }

    private Task<byte[]> ExportToXeroAsync(List<InvoiceExportDto> invoices, string correlationId)
    {
        try
        {
            var csv = new StringBuilder();

            // Xero CSV format headers
            csv.AppendLine("ContactName,EmailAddress,InvoiceNumber,InvoiceDate,DueDate,Description,Quantity,UnitAmount,AccountCode,TaxType,TaxAmount");

            foreach (var invoice in invoices)
            {
                csv.AppendLine($"{EscapeCsv(invoice.CustomerName)}," +
                              $"{EscapeCsv(invoice.CustomerEmail)}," +
                              $"{EscapeCsv(invoice.InvoiceNumber)}," +
                              $"{invoice.IssueDate:dd/MM/yyyy}," +
                              $"{invoice.DueDate:dd/MM/yyyy}," +
                              $"{EscapeCsv(invoice.Description)}," +
                              $"1," +
                              $"{invoice.Subtotal}," +
                              $"{invoice.AccountCode}," +
                              $"OUTPUT," +
                              $"{invoice.TaxAmount}");
            }

            _logger.LogInformation("Generated Xero export for {Count} invoices", invoices.Count);
            return Task.FromResult(Encoding.UTF8.GetBytes(csv.ToString()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate Xero export");
            throw;
        }
    }

    private async Task<List<RevenueReportDto>> GenerateRevenueReportAsync(DateTime startDate, DateTime endDate)
    {
        var invoices = await _context.Invoices
            .Include(i => i.User)
            .Include(i => i.TaxCalculations)
            .Where(i => i.IssueDate >= startDate && i.IssueDate <= endDate && i.Status == "paid")
            .ToListAsync();

        return invoices
            .GroupBy(i => i.IssueDate.Date)
            .Select(g => new RevenueReportDto
            {
                Date = g.Key,
                InvoiceCount = g.Count(),
                GrossRevenue = g.Sum(i => i.Total),
                NetRevenue = g.Sum(i => i.Subtotal),
                TaxCollected = g.Sum(i => i.TaxAmount),
                // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when grouping invoices
                Currency = g.FirstOrDefault()?.Currency ?? "USD",
                AverageInvoiceValue = g.Average(i => i.Total)
            })
            .OrderBy(r => r.Date)
            .ToList();
    }

    private Task<byte[]> ExportTaxReportToCsvAsync(Dictionary<string, object> taxReport)
    {
        var csv = new StringBuilder();

        csv.AppendLine("Jurisdiction,Start Date,End Date,Total Tax Collected,Total Taxable Amount,Transaction Count");
        csv.AppendLine($"{taxReport["jurisdiction"]}," +
                      $"{((DateTime)taxReport["start_date"]).ToString("yyyy-MM-dd")}," +
                      $"{((DateTime)taxReport["end_date"]).ToString("yyyy-MM-dd")}," +
                      $"{taxReport["total_tax_collected"]}," +
                      $"{taxReport["total_taxable_amount"]}," +
                      $"{taxReport["transaction_count"]}");

        return Task.FromResult(Encoding.UTF8.GetBytes(csv.ToString()));
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        
        return value;
    }
}

// Export DTOs
public class InvoiceExportDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TaxJurisdiction { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string AccountCode { get; set; } = string.Empty;
}

public class RevenueReportDto
{
    public DateTime Date { get; set; }
    public int InvoiceCount { get; set; }
    public decimal GrossRevenue { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal TaxCollected { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal AverageInvoiceValue { get; set; }
}