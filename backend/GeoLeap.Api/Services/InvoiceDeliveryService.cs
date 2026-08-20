using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Polly;
using SerilogTimings;

namespace GeoLeap.Api.Services;

public class InvoiceDeliveryService : IInvoiceDeliveryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InvoiceDeliveryService> _logger;
    private readonly IEmailService _emailService;
    private readonly IInvoicePdfService _pdfService;
    private readonly IAsyncPolicy _retryPolicy;

    public InvoiceDeliveryService(
        ApplicationDbContext context,
        ILogger<InvoiceDeliveryService> logger,
        IEmailService emailService,
        IInvoicePdfService pdfService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
        _pdfService = pdfService;

        _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (exception, timespan, retryCount, context) =>
                {
                    _logger.LogWarning("Retry {RetryCount} for email delivery after {Delay}ms: {ExceptionMessage}",
                        retryCount, timespan.TotalMilliseconds, exception.Message);
                });
    }

    public async Task<bool> SendInvoiceEmailAsync(Guid invoiceId, string correlationId)
    {
        using var activity = SerilogTimings.Operation.Begin("SendInvoiceEmail");
        
        try
        {
            var invoice = await _context.Invoices
                .Include(i => i.User)
                .Include(i => i.BillingAddress)
                .Include(i => i.LineItems)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null)
            {
                _logger.LogWarning("Invoice {InvoiceId} not found for email delivery", invoiceId);
                return false;
            }

            // Check if already sent recently
            var recentDelivery = await _context.InvoiceDeliveries
                .Where(d => d.InvoiceId == invoiceId && 
                           d.DeliveryMethod == "email" && 
                           d.Status == "delivered" &&
                           d.SentAt > DateTime.UtcNow.AddHours(-1))
                .FirstOrDefaultAsync();

            if (recentDelivery != null)
            {
                _logger.LogInformation("Invoice {InvoiceId} already delivered recently, skipping", invoiceId);
                return true;
            }

            // Create delivery record
            var delivery = new InvoiceDelivery
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                DeliveryMethod = "email",
                DeliveryAddress = invoice.User.Email,
                Status = "pending",
                AttemptCount = 1,
                CreatedAt = DateTime.UtcNow
            };

            _context.InvoiceDeliveries.Add(delivery);
            await _context.SaveChangesAsync();

            try
            {
                // Get PDF attachment
                byte[]? pdfAttachment = null;
                if (invoice.IsPdfGenerated)
                {
                    pdfAttachment = await _pdfService.GetStoredInvoicePdfAsync(invoiceId);
                }

                // If PDF not generated, generate it now
                if (pdfAttachment == null)
                {
                    _logger.LogInformation("Generating PDF for invoice {InvoiceId} before email delivery", invoiceId);
                    await _pdfService.GenerateAndStorePdfAsync(invoiceId, correlationId);
                    pdfAttachment = await _pdfService.GetStoredInvoicePdfAsync(invoiceId);
                }

                // Prepare email content
                var subject = $"Invoice {invoice.InvoiceNumber} - GeoLeap";
                var emailBody = GenerateInvoiceEmailBody(invoice);

                // Send email with PDF attachment
                var emailSent = await _retryPolicy.ExecuteAsync(async () =>
                {
                    if (pdfAttachment != null)
                    {
                        var attachments = new Dictionary<string, byte[]>
                        {
                            [$"Invoice-{invoice.InvoiceNumber}.pdf"] = pdfAttachment
                        };
                        return await _emailService.SendEmailWithAttachmentsAsync(
                            invoice.User.Email,
                            subject,
                            emailBody,
                            attachments,
                            correlationId);
                    }
                    else
                    {
                        return await _emailService.SendPlainEmailAsync(
                            invoice.User.Email,
                            subject,
                            emailBody,
                            correlationId);
                    }
                });

                if (emailSent)
                {
                    // Update delivery status
                    delivery.Status = "sent";
                    delivery.SentAt = DateTime.UtcNow;
                    delivery.UpdatedAt = DateTime.UtcNow;

                    // Update invoice
                    invoice.IsEmailSent = true;
                    invoice.EmailSentAt = DateTime.UtcNow;
                    invoice.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Invoice {InvoiceNumber} email sent successfully to {Email}",
                        invoice.InvoiceNumber, invoice.User.Email);

                    activity.Complete();
                    return true;
                }
                else
                {
                    delivery.Status = "failed";
                    delivery.FailedAt = DateTime.UtcNow;
                    delivery.FailureReason = "Email service failed";
                    delivery.NextRetryAt = DateTime.UtcNow.AddMinutes(15);
                    await _context.SaveChangesAsync();

                    _logger.LogError("Failed to send invoice {InvoiceNumber} email to {Email}",
                        invoice.InvoiceNumber, invoice.User.Email);
                    return false;
                }
            }
            catch (Exception ex)
            {
                delivery.Status = "failed";
                delivery.FailedAt = DateTime.UtcNow;
                delivery.FailureReason = ex.Message;
                delivery.NextRetryAt = DateTime.UtcNow.AddMinutes(15);
                await _context.SaveChangesAsync();

                _logger.LogError(ex, "Exception while sending invoice {InvoiceId} email", invoiceId);
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send invoice {InvoiceId} email", invoiceId);
            return false;
        }
    }

    public async Task<bool> ResendInvoiceEmailAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Resending invoice {InvoiceId} email", invoiceId);

            // Update any failed deliveries to retry
            var failedDeliveries = await _context.InvoiceDeliveries
                .Where(d => d.InvoiceId == invoiceId && 
                           d.DeliveryMethod == "email" && 
                           d.Status == "failed")
                .ToListAsync();

            foreach (var delivery in failedDeliveries)
            {
                delivery.Status = "pending";
                delivery.NextRetryAt = DateTime.UtcNow;
                delivery.AttemptCount++;
                delivery.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return await SendInvoiceEmailAsync(invoiceId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resend invoice {InvoiceId} email", invoiceId);
            return false;
        }
    }

    public async Task<bool> SendBulkInvoiceEmailsAsync(List<Guid> invoiceIds, string correlationId)
    {
        var successCount = 0;
        
        foreach (var invoiceId in invoiceIds)
        {
            try
            {
                var success = await SendInvoiceEmailAsync(invoiceId, correlationId);
                if (success) successCount++;
                
                // Small delay between emails to avoid overwhelming email service
                await Task.Delay(100);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send bulk email for invoice {InvoiceId}", invoiceId);
            }
        }

        _logger.LogInformation("Sent {SuccessCount} of {TotalCount} bulk invoice emails", 
            successCount, invoiceIds.Count);

        return successCount == invoiceIds.Count;
    }

    public async Task<InvoiceDelivery?> GetInvoiceDeliveryAsync(Guid invoiceId, string deliveryMethod)
    {
        return await _context.InvoiceDeliveries
            .FirstOrDefaultAsync(d => d.InvoiceId == invoiceId && d.DeliveryMethod == deliveryMethod);
    }

    public async Task<List<InvoiceDelivery>> GetInvoiceDeliveriesAsync(Guid invoiceId)
    {
        return await _context.InvoiceDeliveries
            .Where(d => d.InvoiceId == invoiceId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> UpdateDeliveryStatusAsync(Guid deliveryId, string status, string? failureReason = null)
    {
        try
        {
            var delivery = await _context.InvoiceDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId);
            if (delivery == null) return false;

            delivery.Status = status;
            delivery.UpdatedAt = DateTime.UtcNow;

            switch (status)
            {
                case "delivered":
                    delivery.DeliveredAt = DateTime.UtcNow;
                    break;
                case "failed":
                    delivery.FailedAt = DateTime.UtcNow;
                    delivery.FailureReason = failureReason ?? "";
                    delivery.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, delivery.AttemptCount) * 5);
                    break;
                case "sent":
                    delivery.SentAt = DateTime.UtcNow;
                    break;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated delivery {DeliveryId} status to {Status}", deliveryId, status);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update delivery {DeliveryId} status", deliveryId);
            return false;
        }
    }

    public async Task<bool> ConfigureDeliveryPreferencesAsync(Guid userId, string preferredMethod, string correlationId)
    {
        try
        {
            // Store delivery preferences in user metadata or configuration table
            // For now, we'll assume email is the only supported method
            _logger.LogInformation("Configured delivery preference {Method} for user {UserId}", 
                preferredMethod, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to configure delivery preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<string> GetUserDeliveryPreferenceAsync(Guid userId)
    {
        // Default to email delivery
        return "email";
    }

    public async Task ProcessFailedDeliveriesAsync()
    {
        try
        {
            var failedDeliveries = await _context.InvoiceDeliveries
                .Where(d => d.Status == "failed" && 
                           d.NextRetryAt <= DateTime.UtcNow &&
                           d.AttemptCount < 5)
                .ToListAsync();

            _logger.LogInformation("Processing {Count} failed deliveries for retry", failedDeliveries.Count);

            foreach (var delivery in failedDeliveries)
            {
                try
                {
                    var success = await RetryFailedDeliveryAsync(delivery.Id, $"retry-{Guid.NewGuid()}");
                    if (success)
                    {
                        _logger.LogInformation("Successfully retried delivery {DeliveryId}", delivery.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to retry delivery {DeliveryId}", delivery.Id);
                }

                // Add delay between retries
                await Task.Delay(200);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process failed deliveries");
        }
    }

    public async Task<bool> RetryFailedDeliveryAsync(Guid deliveryId, string correlationId)
    {
        try
        {
            var delivery = await _context.InvoiceDeliveries
                .Include(d => d.Invoice)
                .FirstOrDefaultAsync(d => d.Id == deliveryId);

            if (delivery == null) return false;

            delivery.Status = "pending";
            delivery.AttemptCount++;
            delivery.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await SendInvoiceEmailAsync(delivery.InvoiceId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retry delivery {DeliveryId}", deliveryId);
            return false;
        }
    }

    private string GenerateInvoiceEmailBody(Invoice invoice)
    {
        var statusText = invoice.Status switch
        {
            "paid" => "Thank you for your payment!",
            "open" => $"Payment is due by {invoice.DueDate:MMMM dd, yyyy}",
            _ => ""
        };

        return $@"
Dear {invoice.BillingAddress?.FullName ?? $"{invoice.User.FirstName} {invoice.User.LastName}".Trim()},

{statusText}

Please find attached your invoice for GeoLeap services.

Invoice Details:
- Invoice Number: {invoice.InvoiceNumber}
- Amount: {FormatCurrency(invoice.Total, invoice.Currency)}
- Service Period: {invoice.PeriodStart:MMM dd} - {invoice.PeriodEnd:MMM dd, yyyy}

If you have any questions about this invoice, please don't hesitate to contact our support team.

Thank you for choosing GeoLeap!

Best regards,
The GeoLeap Team

---
This is an automated message. Please do not reply directly to this email.
For support, please visit: https://geoleap.com/support
";
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