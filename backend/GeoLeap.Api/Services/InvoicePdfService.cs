using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using iText.Html2pdf;
using iText.Kernel.Pdf;
using iText.Layout;
using System.Text;
using SerilogTimings;

namespace GeoLeap.Api.Services;

public class InvoicePdfService : IInvoicePdfService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InvoicePdfService> _logger;
    private readonly IConfiguration _configuration;
    private readonly string _pdfStoragePath;

    public InvoicePdfService(
        ApplicationDbContext context,
        ILogger<InvoicePdfService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        
        _pdfStoragePath = _configuration["Storage:InvoicePdfPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "storage", "invoices");
        Directory.CreateDirectory(_pdfStoragePath);
    }

    public async Task<byte[]> GenerateInvoicePdfAsync(InvoiceDto invoice, string correlationId)
    {
        using var activity = SerilogTimings.Operation.Begin("GenerateInvoicePdf");
        
        try
        {
            _logger.LogInformation("Generating PDF for invoice {InvoiceNumber}", invoice.InvoiceNumber);

            // Get template
            var template = await GetInvoiceTemplateAsync("standard", "en", invoice.Currency);
            
            // Generate HTML content
            var htmlContent = await GenerateInvoiceHtmlAsync(invoice, template);
            
            // Convert HTML to PDF
            using var memoryStream = new MemoryStream();
            var converterProperties = new ConverterProperties();
            HtmlConverter.ConvertToPdf(htmlContent, memoryStream, converterProperties);
            
            var pdfBytes = memoryStream.ToArray();
            
            _logger.LogInformation("Generated {Size} byte PDF for invoice {InvoiceNumber}", 
                pdfBytes.Length, invoice.InvoiceNumber);
            
            activity.Complete();
            return pdfBytes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate PDF for invoice {InvoiceNumber}", invoice.InvoiceNumber);
            throw;
        }
    }

    public async Task<bool> GenerateAndStorePdfAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            var invoice = await GetInvoiceDtoAsync(invoiceId);
            if (invoice == null) return false;

            var pdfBytes = await GenerateInvoicePdfAsync(invoice, correlationId);
            var success = await StoreInvoicePdfAsync(invoiceId, pdfBytes, correlationId);

            if (success)
            {
                // Update invoice record
                var invoiceEntity = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
                if (invoiceEntity != null)
                {
                    invoiceEntity.IsPdfGenerated = true;
                    invoiceEntity.PdfGeneratedAt = DateTime.UtcNow;
                    invoiceEntity.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate and store PDF for invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    public async Task<byte[]?> GetStoredInvoicePdfAsync(Guid invoiceId)
    {
        try
        {
            var filePath = Path.Combine(_pdfStoragePath, $"{invoiceId}.pdf");
            
            if (!File.Exists(filePath))
            {
                _logger.LogWarning("PDF file not found for invoice {InvoiceId}", invoiceId);
                return null;
            }

            return await File.ReadAllBytesAsync(filePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve stored PDF for invoice {InvoiceId}", invoiceId);
            return null;
        }
    }

    public async Task<InvoiceTemplate> GetInvoiceTemplateAsync(string templateType, string language, string currency)
    {
        var template = await _context.InvoiceTemplates
            .FirstOrDefaultAsync(t => t.TemplateType == templateType && 
                                    t.Language == language && 
                                    t.Currency == currency && 
                                    t.IsActive);

        if (template == null)
        {
            // Return default template
            template = await _context.InvoiceTemplates
                .FirstOrDefaultAsync(t => t.IsDefault && t.IsActive);
        }

        if (template == null)
        {
            // Create default template if none exists
            template = await CreateDefaultInvoiceTemplateAsync();
        }

        return template;
    }

    public async Task<InvoiceTemplate> CreateInvoiceTemplateAsync(string name, string templateType, string htmlTemplate, string cssStyles, string language, string currency)
    {
        var template = new InvoiceTemplate
        {
            Id = Guid.NewGuid(),
            Name = name,
            TemplateType = templateType,
            HtmlTemplate = htmlTemplate,
            CssStyles = cssStyles,
            Language = language,
            Currency = currency,
            IsActive = true,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        _context.InvoiceTemplates.Add(template);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created invoice template {TemplateName} for {TemplateType}/{Language}/{Currency}",
            name, templateType, language, currency);

        return template;
    }

    public async Task<bool> UpdateInvoiceTemplateAsync(Guid templateId, string htmlTemplate, string cssStyles, string updatedBy)
    {
        try
        {
            var template = await _context.InvoiceTemplates.FirstOrDefaultAsync(t => t.Id == templateId);
            if (template == null) return false;

            template.HtmlTemplate = htmlTemplate;
            template.CssStyles = cssStyles;
            template.UpdatedBy = updatedBy;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated invoice template {TemplateId}", templateId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update invoice template {TemplateId}", templateId);
            return false;
        }
    }

    public async Task<bool> StoreInvoicePdfAsync(Guid invoiceId, byte[] pdfData, string correlationId)
    {
        try
        {
            var filePath = Path.Combine(_pdfStoragePath, $"{invoiceId}.pdf");
            await File.WriteAllBytesAsync(filePath, pdfData);

            _logger.LogInformation("Stored PDF for invoice {InvoiceId} at {FilePath}", invoiceId, filePath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store PDF for invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    public async Task<bool> DeleteInvoicePdfAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            var filePath = Path.Combine(_pdfStoragePath, $"{invoiceId}.pdf");
            
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                _logger.LogInformation("Deleted PDF for invoice {InvoiceId}", invoiceId);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete PDF for invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    public async Task<string> GetInvoicePdfDownloadUrlAsync(Guid invoiceId, Guid userId, TimeSpan? expiration = null)
    {
        // Verify user access
        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId && i.UserId == userId);
        if (invoice == null)
            throw new UnauthorizedAccessException("Invoice not found or access denied");

        // In production, this would generate a secure, time-limited download URL
        var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "https://localhost:7001";
        return $"{baseUrl}/api/invoices/{invoiceId}/pdf";
    }

    public async Task<bool> RegenerateInvoicePdfAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            var invoice = await GetInvoiceDtoAsync(invoiceId);
            if (invoice == null) return false;

            // Delete existing PDF
            await DeleteInvoicePdfAsync(invoiceId, correlationId);

            // Generate new PDF
            return await GenerateAndStorePdfAsync(invoiceId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to regenerate PDF for invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    private async Task<string> GenerateInvoiceHtmlAsync(InvoiceDto invoice, InvoiceTemplate template)
    {
        var html = template.HtmlTemplate;

        // Replace template variables
        html = html.Replace("{{invoice_number}}", invoice.InvoiceNumber);
        html = html.Replace("{{issue_date}}", invoice.IssueDate.ToString("MMMM dd, yyyy"));
        html = html.Replace("{{due_date}}", invoice.DueDate.ToString("MMMM dd, yyyy"));
        html = html.Replace("{{subtotal}}", FormatCurrency(invoice.Subtotal, invoice.Currency));
        html = html.Replace("{{tax_amount}}", FormatCurrency(invoice.TaxAmount, invoice.Currency));
        html = html.Replace("{{total}}", FormatCurrency(invoice.Total, invoice.Currency));
        html = html.Replace("{{currency}}", invoice.Currency);
        html = html.Replace("{{description}}", invoice.Description);

        // Billing address
        if (invoice.BillingAddress != null)
        {
            html = html.Replace("{{billing_name}}", invoice.BillingAddress.FullName);
            html = html.Replace("{{billing_company}}", invoice.BillingAddress.CompanyName);
            html = html.Replace("{{billing_address1}}", invoice.BillingAddress.AddressLine1);
            html = html.Replace("{{billing_address2}}", invoice.BillingAddress.AddressLine2);
            html = html.Replace("{{billing_city}}", invoice.BillingAddress.City);
            html = html.Replace("{{billing_state}}", invoice.BillingAddress.State);
            html = html.Replace("{{billing_postal}}", invoice.BillingAddress.PostalCode);
            html = html.Replace("{{billing_country}}", invoice.BillingAddress.Country);
        }

        // Line items
        var lineItemsHtml = new StringBuilder();
        foreach (var item in invoice.LineItems)
        {
            lineItemsHtml.AppendLine($@"
                <tr>
                    <td>{item.Description}</td>
                    <td>{item.Quantity}</td>
                    <td>{FormatCurrency(item.UnitPrice, item.Currency)}</td>
                    <td>{FormatCurrency(item.Amount, item.Currency)}</td>
                </tr>");
        }
        html = html.Replace("{{line_items}}", lineItemsHtml.ToString());

        // Tax breakdown
        var taxHtml = new StringBuilder();
        foreach (var tax in invoice.TaxCalculations)
        {
            taxHtml.AppendLine($@"
                <tr>
                    <td>{tax.TaxName} ({tax.Rate:P2})</td>
                    <td>{FormatCurrency(tax.TaxAmount, invoice.Currency)}</td>
                </tr>");
        }
        html = html.Replace("{{tax_breakdown}}", taxHtml.ToString());

        // Include CSS
        html = html.Replace("{{styles}}", template.CssStyles);

        return html;
    }

    private async Task<InvoiceTemplate> CreateDefaultInvoiceTemplateAsync()
    {
        var htmlTemplate = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Invoice {{invoice_number}}</title>
    <style>{{styles}}</style>
</head>
<body>
    <div class='invoice-container'>
        <header class='invoice-header'>
            <div class='company-info'>
                <h1>GeoLeap</h1>
                <p>Premium Streaming Discovery Platform</p>
            </div>
            <div class='invoice-info'>
                <h2>INVOICE</h2>
                <p>Invoice #: {{invoice_number}}</p>
                <p>Date: {{issue_date}}</p>
                <p>Due Date: {{due_date}}</p>
            </div>
        </header>

        <section class='billing-info'>
            <div class='bill-to'>
                <h3>Bill To:</h3>
                <p>{{billing_name}}</p>
                <p>{{billing_company}}</p>
                <p>{{billing_address1}}</p>
                <p>{{billing_address2}}</p>
                <p>{{billing_city}}, {{billing_state}} {{billing_postal}}</p>
                <p>{{billing_country}}</p>
            </div>
        </section>

        <section class='invoice-details'>
            <table class='line-items'>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {{line_items}}
                </tbody>
            </table>

            <div class='totals'>
                <table class='totals-table'>
                    <tr>
                        <td>Subtotal:</td>
                        <td>{{subtotal}}</td>
                    </tr>
                    {{tax_breakdown}}
                    <tr class='total-row'>
                        <td><strong>Total:</strong></td>
                        <td><strong>{{total}}</strong></td>
                    </tr>
                </table>
            </div>
        </section>

        <footer class='invoice-footer'>
            <p>Thank you for your business!</p>
            <p>For billing questions, contact support@geoleap.com</p>
        </footer>
    </div>
</body>
</html>";

        var cssStyles = @"
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
.invoice-container { max-width: 800px; margin: 0 auto; }
.invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #0066cc; padding-bottom: 20px; }
.company-info h1 { color: #0066cc; margin: 0; font-size: 28px; }
.company-info p { margin: 5px 0; color: #666; }
.invoice-info { text-align: right; }
.invoice-info h2 { color: #0066cc; margin: 0; font-size: 24px; }
.invoice-info p { margin: 5px 0; }
.billing-info { margin-bottom: 30px; }
.bill-to h3 { color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
.bill-to p { margin: 5px 0; }
.line-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.line-items th { background-color: #f8f9fa; padding: 12px; text-align: left; border: 1px solid #ddd; }
.line-items td { padding: 12px; border: 1px solid #ddd; }
.totals { text-align: right; }
.totals-table { margin-left: auto; min-width: 300px; }
.totals-table td { padding: 8px 12px; }
.total-row { border-top: 2px solid #0066cc; font-size: 18px; }
.invoice-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
.invoice-footer p { margin: 5px 0; }";

        return await CreateInvoiceTemplateAsync(
            "Default Invoice Template",
            "standard",
            htmlTemplate,
            cssStyles,
            "en",
            "USD");
    }

    private async Task<InvoiceDto?> GetInvoiceDtoAsync(Guid invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.BillingAddress)
            .Include(i => i.TaxCalculations)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null) return null;

        return new InvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            Status = invoice.Status,
            Subtotal = invoice.Subtotal,
            TaxAmount = invoice.TaxAmount,
            Total = invoice.Total,
            Currency = invoice.Currency,
            IssueDate = invoice.IssueDate,
            DueDate = invoice.DueDate,
            PaidAt = invoice.PaidAt,
            PeriodStart = invoice.PeriodStart,
            PeriodEnd = invoice.PeriodEnd,
            Description = invoice.Description,
            BillingAddress = invoice.BillingAddress != null ? new BillingAddressDto
            {
                Id = invoice.BillingAddress.Id,
                CompanyName = invoice.BillingAddress.CompanyName,
                FullName = invoice.BillingAddress.FullName,
                AddressLine1 = invoice.BillingAddress.AddressLine1,
                AddressLine2 = invoice.BillingAddress.AddressLine2,
                City = invoice.BillingAddress.City,
                State = invoice.BillingAddress.State,
                PostalCode = invoice.BillingAddress.PostalCode,
                Country = invoice.BillingAddress.Country,
                TaxId = invoice.BillingAddress.TaxId,
                TaxIdType = invoice.BillingAddress.TaxIdType,
                IsDefault = invoice.BillingAddress.IsDefault
            } : null,
            LineItems = invoice.LineItems.Select(li => new InvoiceLineItemDto
            {
                Id = li.Id,
                ItemType = li.ItemType,
                Description = li.Description,
                Quantity = li.Quantity,
                UnitPrice = li.UnitPrice,
                Amount = li.Amount,
                Currency = li.Currency,
                ServicePeriodStart = li.ServicePeriodStart,
                ServicePeriodEnd = li.ServicePeriodEnd
            }).ToList(),
            TaxCalculations = invoice.TaxCalculations.Select(tc => new TaxCalculationDto
            {
                Id = tc.Id,
                TaxType = tc.TaxType,
                TaxName = tc.TaxName,
                Rate = tc.Rate,
                TaxableAmount = tc.TaxableAmount,
                TaxAmount = tc.TaxAmount,
                Country = tc.Country,
                StateProvince = tc.StateProvince,
                Jurisdiction = tc.Jurisdiction
            }).ToList(),
            IsPdfGenerated = invoice.IsPdfGenerated,
            IsEmailSent = invoice.IsEmailSent
        };
    }

    private static string FormatCurrency(decimal amount, string currency)
    {
        return currency.ToUpper() switch
        {
            "USD" => $"${amount:F2}",
            "EUR" => $"€{amount:F2}",
            "GBP" => $"£{amount:F2}",
            "CAD" => $"C${amount:F2}",
            "AUD" => $"A${amount:F2}",
            _ => $"{amount:F2} {currency}"
        };
    }
}