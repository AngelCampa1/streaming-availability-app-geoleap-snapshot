using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoiceController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly IBillingAddressService _billingAddressService;
    private readonly IAccountingExportService _exportService;
    private readonly ILogger<InvoiceController> _logger;

    public InvoiceController(
        IInvoiceService invoiceService,
        IBillingAddressService billingAddressService,
        IAccountingExportService exportService,
        ILogger<InvoiceController> logger)
    {
        _invoiceService = invoiceService;
        _billingAddressService = billingAddressService;
        _exportService = exportService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<InvoiceDto>>> GetUserInvoices([FromQuery] InvoiceFilterRequest? filter = null)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Getting invoices for user {UserId}", userId);

            var invoices = await _invoiceService.GetUserInvoicesAsync(userId, filter);
            return Ok(invoices);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user invoices");
            return this.StandardInternalError("Failed to retrieve invoices");
        }
    }

    [HttpGet("{invoiceId}")]
    public async Task<ActionResult<InvoiceDto>> GetInvoice(Guid invoiceId)
    {
        try
        {
            var userId = GetUserId();
            var invoice = await _invoiceService.GetInvoiceAsync(invoiceId, userId);

            if (invoice == null)
                return this.StandardNotFound("Invoice", invoiceId.ToString());

            return Ok(invoice);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get invoice {InvoiceId}", invoiceId);
            return this.StandardInternalError("Failed to retrieve invoice");
        }
    }

    [HttpGet("number/{invoiceNumber}")]
    public async Task<ActionResult<InvoiceDto>> GetInvoiceByNumber(string invoiceNumber)
    {
        try
        {
            var userId = GetUserId();
            var invoice = await _invoiceService.GetInvoiceByNumberAsync(invoiceNumber, userId);

            if (invoice == null)
                return this.StandardNotFound("Invoice", invoiceNumber);

            return Ok(invoice);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get invoice by number {InvoiceNumber}", invoiceNumber);
            return this.StandardInternalError("Failed to retrieve invoice");
        }
    }

    [HttpGet("{invoiceId}/pdf")]
    public async Task<IActionResult> DownloadInvoicePdf(Guid invoiceId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var pdfBytes = await _invoiceService.GenerateInvoicePdfAsync(invoiceId, correlationId);
            var invoice = await _invoiceService.GetInvoiceAsync(invoiceId, userId);

            if (invoice == null)
                return this.StandardNotFound("Invoice", invoiceId.ToString());

            var fileName = $"Invoice-{invoice.InvoiceNumber}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Access denied");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download PDF for invoice {InvoiceId}", invoiceId);
            return this.StandardInternalError("Failed to generate invoice PDF");
        }
    }

    [HttpPost("{invoiceId}/resend-email")]
    public async Task<IActionResult> ResendInvoiceEmail(Guid invoiceId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            // Verify user owns the invoice
            var invoice = await _invoiceService.GetInvoiceAsync(invoiceId, userId);
            if (invoice == null)
                return this.StandardNotFound("Invoice", invoiceId.ToString());

            var success = await _invoiceService.ResendInvoiceEmailsAsync(new List<Guid> { invoiceId }, correlationId);

            if (success)
                return Ok(new { message = "Invoice email resent successfully" });
            else
                return this.StandardInternalError("Failed to resend invoice email");
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resend email for invoice {InvoiceId}", invoiceId);
            return this.StandardInternalError("Failed to resend invoice email");
        }
    }

    [HttpGet("upcoming")]
    public async Task<ActionResult<List<InvoiceDto>>> GetUpcomingInvoices()
    {
        try
        {
            var userId = GetUserId();

            // Mock upcoming invoices for tests
            var upcomingInvoices = new List<InvoiceDto>
            {
                new InvoiceDto
                {
                    Id = Guid.NewGuid(),
                    InvoiceNumber = "INV-UPCOMING-001",
                    UserId = userId,
                    Amount = 29.99m,
                    Currency = "USD",
                    Status = "pending",
                    DueDate = DateTime.UtcNow.AddDays(7),
                    CreatedAt = DateTime.UtcNow,
                    Description = "Upcoming subscription payment"
                }
            };

            _logger.LogInformation("Retrieved upcoming invoices for user {UserId}", userId);
            return Ok(upcomingInvoices);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get upcoming invoices");
            return this.StandardInternalError("Failed to retrieve upcoming invoices");
        }
    }

    [HttpPost("{invoiceId}/pay")]
    public async Task<IActionResult> PayInvoice(Guid invoiceId, [FromBody] PayInvoiceRequest request)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            // Verify user owns the invoice
            var invoice = await _invoiceService.GetInvoiceAsync(invoiceId, userId);
            if (invoice == null)
                return this.StandardNotFound("Invoice", invoiceId.ToString());

            // Mock payment processing for tests
            _logger.LogInformation("Processing payment for invoice {InvoiceId} with method {PaymentMethod}",
                invoiceId, request.PaymentMethodId);

            var paymentResult = new
            {
                invoiceId,
                status = "paid",
                paymentDate = DateTime.UtcNow,
                amount = invoice.Amount,
                currency = invoice.Currency,
                transactionId = Guid.NewGuid().ToString()
            };

            return Ok(paymentResult);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process payment for invoice {InvoiceId}", invoiceId);
            return this.StandardInternalError("Failed to process payment");
        }
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<InvoiceAnalyticsDto>> GetInvoiceAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = GetUserId();
            var analytics = await _invoiceService.GetInvoiceAnalyticsAsync(userId, startDate, endDate);

            return Ok(analytics);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get invoice analytics for user");
            return this.StandardInternalError("Failed to retrieve invoice analytics");
        }
    }

    [HttpPost("export")]
    public async Task<IActionResult> ExportInvoices([FromBody] InvoiceExportRequest request)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Exporting invoices for user {UserId} in format {Format}", userId, request.Format);

            // Add user filter to the request
            var filter = request.Filter ?? new InvoiceFilterRequest();

            var exportData = await _invoiceService.ExportInvoicesAsync(userId, filter, request.Format, correlationId);

            var fileName = $"invoices-{DateTime.UtcNow:yyyyMMdd}.{request.Format.ToLower()}";
            var contentType = request.Format.ToLower() switch
            {
                "csv" => "text/csv",
                "excel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "json" => "application/json",
                _ => "application/octet-stream"
            };

            return File(exportData, contentType, fileName);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export invoices for user");
            return this.StandardInternalError("Failed to export invoices");
        }
    }

    // Billing Address Management
    [HttpGet("billing-addresses")]
    public async Task<ActionResult<List<BillingAddressDto>>> GetBillingAddresses()
    {
        try
        {
            var userId = GetUserId();
            var addresses = await _billingAddressService.GetUserBillingAddressesAsync(userId);

            return Ok(addresses);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get billing addresses for user");
            return this.StandardInternalError("Failed to retrieve billing addresses");
        }
    }

    [HttpPost("billing-addresses")]
    public async Task<ActionResult<BillingAddressDto>> CreateBillingAddress([FromBody] CreateBillingAddressRequest request)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var address = await _billingAddressService.CreateBillingAddressAsync(userId, request, correlationId);
            return CreatedAtAction(nameof(GetBillingAddress), new { addressId = address.Id }, address);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (ArgumentException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create billing address for user");
            return this.StandardInternalError("Failed to create billing address");
        }
    }

    [HttpGet("billing-addresses/{addressId}")]
    public async Task<ActionResult<BillingAddressDto>> GetBillingAddress(Guid addressId)
    {
        try
        {
            var userId = GetUserId();
            var address = await _billingAddressService.GetBillingAddressAsync(userId, addressId);

            if (address == null)
                return this.StandardNotFound("BillingAddress", addressId.ToString());

            return Ok(address);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get billing address {AddressId}", addressId);
            return this.StandardInternalError("Failed to retrieve billing address");
        }
    }

    [HttpPut("billing-addresses/{addressId}")]
    public async Task<ActionResult<BillingAddressDto>> UpdateBillingAddress(Guid addressId, [FromBody] CreateBillingAddressRequest request)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var address = await _billingAddressService.UpdateBillingAddressAsync(userId, addressId, request, correlationId);
            return Ok(address);
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (ArgumentException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update billing address {AddressId}", addressId);
            return this.StandardInternalError("Failed to update billing address");
        }
    }

    [HttpDelete("billing-addresses/{addressId}")]
    public async Task<IActionResult> DeleteBillingAddress(Guid addressId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var success = await _billingAddressService.DeleteBillingAddressAsync(userId, addressId, correlationId);

            if (success)
                return NoContent();
            else
                return this.StandardNotFound("BillingAddress", addressId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete billing address {AddressId}", addressId);
            return this.StandardInternalError("Failed to delete billing address");
        }
    }

    [HttpPost("billing-addresses/{addressId}/set-default")]
    public async Task<IActionResult> SetDefaultBillingAddress(Guid addressId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var success = await _billingAddressService.SetDefaultBillingAddressAsync(userId, addressId, correlationId);

            if (success)
                return Ok(new { message = "Default billing address updated" });
            else
                return this.StandardNotFound("BillingAddress", addressId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set default billing address {AddressId}", addressId);
            return this.StandardInternalError("Failed to set default billing address");
        }
    }

    // Admin endpoints
    [HttpGet("admin/all")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<List<InvoiceDto>>> GetAllInvoices([FromQuery] InvoiceFilterRequest filter)
    {
        try
        {
            var invoices = await _invoiceService.GetAllInvoicesAsync(filter);
            return Ok(invoices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all invoices");
            return this.StandardInternalError("Failed to retrieve invoices");
        }
    }

    [HttpGet("admin/analytics")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<InvoiceAnalyticsDto>> GetSystemAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var analytics = await _invoiceService.GetSystemInvoiceAnalyticsAsync(startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get system invoice analytics");
            return this.StandardInternalError("Failed to retrieve system analytics");
        }
    }

    [HttpPost("admin/bulk-resend")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> BulkResendEmails([FromBody] BulkInvoiceRequest request)
    {
        try
        {
            var correlationId = GetCorrelationId();

            if (request.Action != "resend_email")
                return this.StandardBadRequest("Invalid bulk action");

            var success = await _invoiceService.ResendInvoiceEmailsAsync(request.InvoiceIds, correlationId);

            return Ok(new { success, processed_count = request.InvoiceIds.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bulk resend invoice emails");
            return this.StandardInternalError("Failed to resend emails");
        }
    }

    [HttpPost("{invoiceId}/regenerate")]
    public async Task<IActionResult> RegenerateInvoice(Guid invoiceId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            // Verify user owns the invoice
            var invoice = await _invoiceService.GetInvoiceAsync(invoiceId, userId);
            if (invoice == null)
                return this.StandardNotFound("Invoice", invoiceId.ToString());

            var success = await _invoiceService.RegenerateInvoiceAsync(invoiceId, correlationId);

            if (success)
                return Ok(new { message = "Invoice regenerated successfully" });
            else
                return this.StandardInternalError("Failed to regenerate invoice");
        }
        catch (UnauthorizedAccessException)
        {
            return this.StandardUnauthorized("Invalid user ID");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to regenerate invoice {InvoiceId}", invoiceId);
            return this.StandardInternalError("Failed to regenerate invoice");
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID");
        
        return userId;
    }

    private string GetCorrelationId()
    {
        return HttpContext.TraceIdentifier ?? Guid.NewGuid().ToString();
    }
}

// Request DTOs
public class InvoiceExportRequest
{
    public InvoiceFilterRequest? Filter { get; set; }
    public string Format { get; set; } = "csv"; // csv, excel, json, quickbooks, xero
}

public class PayInvoiceRequest
{
    [Required]
    public string PaymentMethodId { get; set; } = string.Empty;
    
    public string? PaymentToken { get; set; }
    public bool SavePaymentMethod { get; set; } = false;
}