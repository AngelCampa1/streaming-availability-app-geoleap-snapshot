using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Hangfire;
using Stripe;
using Polly;
using System.Globalization;
using System.Text.Json;
using SerilogTimings;

namespace GeoLeap.Api.Services;

public class InvoiceService : IInvoiceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InvoiceService> _logger;
    private readonly IAsyncPolicy _retryPolicy;
    private readonly ITaxCalculationService _taxService;
    private readonly IInvoicePdfService _pdfService;
    private readonly IInvoiceDeliveryService _deliveryService;
    private readonly IBillingAddressService _billingAddressService;
    private readonly Stripe.InvoiceService _stripeInvoiceService;

    public InvoiceService(
        ApplicationDbContext context,
        ILogger<InvoiceService> logger,
        ITaxCalculationService taxService,
        IInvoicePdfService pdfService,
        IInvoiceDeliveryService deliveryService,
        IBillingAddressService billingAddressService)
    {
        _context = context;
        _logger = logger;
        _taxService = taxService;
        _pdfService = pdfService;
        _deliveryService = deliveryService;
        _billingAddressService = billingAddressService;
        _stripeInvoiceService = new Stripe.InvoiceService();

        _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (exception, timespan, retryCount, context) =>
                {
                    _logger.LogWarning("Retry {RetryCount} for invoice operation after {Delay}ms: {ExceptionMessage}",
                        retryCount, timespan.TotalMilliseconds, exception.Message);
                });
    }

    public async Task<InvoiceDto> GenerateInvoiceAsync(Guid paymentTransactionId, string correlationId)
    {
        using var activity = SerilogTimings.Operation.Begin("GenerateInvoice");
        
        try
        {
            _logger.LogInformation("Starting invoice generation for payment transaction {PaymentTransactionId}", 
                paymentTransactionId);

            var transaction = await _context.PaymentTransactions
                .Include(t => t.User)
                .Include(t => t.PaymentMethod)
                .FirstOrDefaultAsync(t => t.Id == paymentTransactionId);

            if (transaction == null)
                throw new ArgumentException("Payment transaction not found", nameof(paymentTransactionId));

            if (transaction.Status != "succeeded")
                throw new InvalidOperationException("Cannot generate invoice for non-successful payment");

            // Check if invoice already exists
            var existingInvoice = await _context.Invoices
                .FirstOrDefaultAsync(i => i.PaymentTransactionId == paymentTransactionId);
            if (existingInvoice != null)
            {
                _logger.LogInformation("Invoice already exists for payment transaction {PaymentTransactionId}", 
                    paymentTransactionId);
                return await MapToInvoiceDtoAsync(existingInvoice);
            }

            // Get billing address
            var billingAddress = await _billingAddressService.GetDefaultBillingAddressAsync(transaction.UserId);
            if (billingAddress == null)
            {
                _logger.LogWarning("No billing address found for user {UserId}, creating default", transaction.UserId);
                // Create minimal billing address from user data
                billingAddress = await CreateDefaultBillingAddressAsync(transaction.User, correlationId);
            }

            // Generate invoice number
            var invoiceNumber = await GenerateInvoiceNumberAsync();

            // Create invoice
            var invoice = new GeoLeap.Api.Models.Invoice
            {
                Id = Guid.NewGuid(),
                InvoiceNumber = invoiceNumber,
                UserId = transaction.UserId,
                PaymentTransactionId = paymentTransactionId,
                StripeInvoiceId = "", // Will be updated if we sync with Stripe
                Status = transaction.Status == "succeeded" ? "paid" : "open",
                Subtotal = transaction.Amount,
                TaxAmount = 0, // Will be calculated
                DiscountAmount = 0,
                Total = transaction.Amount,
                Currency = transaction.Currency,
                IssueDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(30),
                PaidAt = transaction.Status == "succeeded" ? transaction.ProcessedAt : null,
                PeriodStart = DateTime.UtcNow.Date,
                PeriodEnd = DateTime.UtcNow.Date.AddMonths(1),
                Description = transaction.Description,
                BillingAddressId = billingAddress.Id,
                CorrelationId = correlationId,
                Metadata = new Dictionary<string, object>
                {
                    ["payment_transaction_id"] = paymentTransactionId,
                    ["stripe_payment_intent_id"] = transaction.StripePaymentIntentId
                }
            };

            // Add line items
            var lineItem = new GeoLeap.Api.Models.InvoiceLineItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                ItemType = "subscription",
                Description = transaction.Description,
                Quantity = 1,
                UnitPrice = transaction.Amount,
                Amount = transaction.Amount,
                Currency = transaction.Currency,
                ServicePeriodStart = invoice.PeriodStart,
                ServicePeriodEnd = invoice.PeriodEnd,
                Metadata = new Dictionary<string, object>
                {
                    ["payment_transaction_id"] = paymentTransactionId
                }
            };

            invoice.LineItems.Add(lineItem);

            // Calculate taxes
            var taxCalculations = await _taxService.CalculateMultipleTaxesAsync(
                new List<InvoiceLineItemDto> { MapToLineItemDto(lineItem) },
                billingAddress,
                correlationId);

            foreach (var taxCalc in taxCalculations)
            {
                invoice.TaxCalculations.Add(new TaxCalculation
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoice.Id,
                    TaxType = taxCalc.TaxType,
                    TaxName = taxCalc.TaxName,
                    Rate = taxCalc.Rate,
                    TaxableAmount = taxCalc.TaxableAmount,
                    TaxAmount = taxCalc.TaxAmount,
                    Country = taxCalc.Country,
                    StateProvince = taxCalc.StateProvince,
                    Jurisdiction = taxCalc.Jurisdiction,
                    TaxServiceProvider = "internal"
                });
            }

            // Update totals
            invoice.TaxAmount = taxCalculations.Sum(t => t.TaxAmount);
            invoice.Total = invoice.Subtotal + invoice.TaxAmount - invoice.DiscountAmount;

            // Save to database
            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            // Generate PDF asynchronously
            // FIXED: Week 1 Day 5 - Use Hangfire with private methods (local functions not allowed in expression trees)
            BackgroundJob.Enqueue(() => SafeGeneratePdfAsync(invoice.Id, correlationId));

            // Send email asynchronously
            // FIXED: Week 1 Day 5 - Use Hangfire with private methods (local functions not allowed in expression trees)
            BackgroundJob.Enqueue(() => SafeSendInvoiceEmailAsync(invoice.Id, correlationId));

            _logger.LogInformation("Invoice {InvoiceNumber} generated successfully for payment {PaymentTransactionId}",
                invoice.InvoiceNumber, paymentTransactionId);

            activity.Complete();
            return await MapToInvoiceDtoAsync(invoice);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate invoice for payment transaction {PaymentTransactionId}", 
                paymentTransactionId);
            throw;
        }
    }

    public async Task<InvoiceDto> GenerateSubscriptionInvoiceAsync(Guid subscriptionId, DateTime periodStart, DateTime periodEnd, string correlationId)
    {
        using var activity = SerilogTimings.Operation.Begin("GenerateSubscriptionInvoice");
        
        try
        {
            var subscription = await _context.Subscriptions
                .Include(s => s.User)
                .Include(s => s.StripeCustomer)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId);

            if (subscription == null)
                throw new ArgumentException("Subscription not found", nameof(subscriptionId));

            var billingAddress = await _billingAddressService.GetDefaultBillingAddressAsync(subscription.UserId);
            if (billingAddress == null)
            {
                billingAddress = await CreateDefaultBillingAddressAsync(subscription.User, correlationId);
            }

            var invoiceNumber = await GenerateInvoiceNumberAsync();

            var invoice = new GeoLeap.Api.Models.Invoice
            {
                Id = Guid.NewGuid(),
                InvoiceNumber = invoiceNumber,
                UserId = subscription.UserId,
                SubscriptionId = subscriptionId,
                Status = "open",
                Subtotal = subscription.Amount,
                TaxAmount = 0,
                DiscountAmount = 0,
                Total = subscription.Amount,
                Currency = subscription.Currency,
                IssueDate = DateTime.UtcNow,
                DueDate = periodEnd,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                Description = $"GeoLeap {CultureInfo.CurrentCulture.TextInfo.ToTitleCase(subscription.PlanType)} Subscription",
                BillingAddressId = billingAddress.Id,
                CorrelationId = correlationId,
                Metadata = new Dictionary<string, object>
                {
                    ["subscription_id"] = subscriptionId,
                    ["stripe_subscription_id"] = subscription.StripeSubscriptionId
                }
            };

            var lineItem = new GeoLeap.Api.Models.InvoiceLineItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                ItemType = "subscription",
                Description = $"GeoLeap {subscription.PlanType} - {periodStart:MMM dd} to {periodEnd:MMM dd, yyyy}",
                Quantity = 1,
                UnitPrice = subscription.Amount,
                Amount = subscription.Amount,
                Currency = subscription.Currency,
                ServicePeriodStart = periodStart,
                ServicePeriodEnd = periodEnd,
                StripePriceId = subscription.StripePriceId
            };

            invoice.LineItems.Add(lineItem);

            // Calculate taxes
            var taxCalculations = await _taxService.CalculateMultipleTaxesAsync(
                new List<InvoiceLineItemDto> { MapToLineItemDto(lineItem) },
                billingAddress,
                correlationId);

            foreach (var taxCalc in taxCalculations)
            {
                invoice.TaxCalculations.Add(new TaxCalculation
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoice.Id,
                    TaxType = taxCalc.TaxType,
                    TaxName = taxCalc.TaxName,
                    Rate = taxCalc.Rate,
                    TaxableAmount = taxCalc.TaxableAmount,
                    TaxAmount = taxCalc.TaxAmount,
                    Country = taxCalc.Country,
                    StateProvince = taxCalc.StateProvince,
                    Jurisdiction = taxCalc.Jurisdiction,
                    TaxServiceProvider = "internal"
                });
            }

            invoice.TaxAmount = taxCalculations.Sum(t => t.TaxAmount);
            invoice.Total = invoice.Subtotal + invoice.TaxAmount - invoice.DiscountAmount;

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            // Generate PDF and send email asynchronously
            // FIXED: Week 1 Day 4 - Use Hangfire for reliable background job execution
            BackgroundJob.Enqueue(() => _pdfService.GenerateAndStorePdfAsync(invoice.Id, correlationId));
            BackgroundJob.Enqueue(() => _deliveryService.SendInvoiceEmailAsync(invoice.Id, correlationId));

            _logger.LogInformation("Subscription invoice {InvoiceNumber} generated for subscription {SubscriptionId}",
                invoice.InvoiceNumber, subscriptionId);

            activity.Complete();
            return await MapToInvoiceDtoAsync(invoice);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate subscription invoice for {SubscriptionId}", subscriptionId);
            throw;
        }
    }

    public async Task<bool> RegenerateInvoiceAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            var invoice = await _context.Invoices
                .Include(i => i.LineItems)
                .Include(i => i.BillingAddress)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null) return false;

            // Recalculate taxes
            var billingAddressDto = MapToBillingAddressDto(invoice.BillingAddress!);
            var lineItemDtos = invoice.LineItems.Select(MapToLineItemDto).ToList();
            
            var taxCalculations = await _taxService.CalculateMultipleTaxesAsync(lineItemDtos, billingAddressDto, correlationId);

            // Clear existing tax calculations
            _context.TaxCalculations.RemoveRange(invoice.TaxCalculations);

            // Add new tax calculations
            foreach (var taxCalc in taxCalculations)
            {
                invoice.TaxCalculations.Add(new TaxCalculation
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoice.Id,
                    TaxType = taxCalc.TaxType,
                    TaxName = taxCalc.TaxName,
                    Rate = taxCalc.Rate,
                    TaxableAmount = taxCalc.TaxableAmount,
                    TaxAmount = taxCalc.TaxAmount,
                    Country = taxCalc.Country,
                    StateProvince = taxCalc.StateProvince,
                    Jurisdiction = taxCalc.Jurisdiction,
                    TaxServiceProvider = "internal"
                });
            }

            // Update totals
            invoice.TaxAmount = taxCalculations.Sum(t => t.TaxAmount);
            invoice.Total = invoice.Subtotal + invoice.TaxAmount - invoice.DiscountAmount;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Regenerate PDF
            await _pdfService.GenerateAndStorePdfAsync(invoiceId, correlationId);

            _logger.LogInformation("Invoice {InvoiceId} regenerated successfully", invoiceId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to regenerate invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    public async Task<InvoiceDto?> GetInvoiceAsync(Guid invoiceId, Guid userId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.BillingAddress)
            .Include(i => i.TaxCalculations)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.UserId == userId);

        return invoice != null ? await MapToInvoiceDtoAsync(invoice) : null;
    }

    public async Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber, Guid userId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.BillingAddress)
            .Include(i => i.TaxCalculations)
            .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber && i.UserId == userId);

        return invoice != null ? await MapToInvoiceDtoAsync(invoice) : null;
    }

    public async Task<List<InvoiceDto>> GetUserInvoicesAsync(Guid userId, InvoiceFilterRequest? filter = null)
    {
        var query = _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.BillingAddress)
            .Include(i => i.TaxCalculations)
            .Where(i => i.UserId == userId);

        if (filter != null)
        {
            if (filter.StartDate.HasValue)
                query = query.Where(i => i.IssueDate >= filter.StartDate.Value);
            
            if (filter.EndDate.HasValue)
                query = query.Where(i => i.IssueDate <= filter.EndDate.Value);
            
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(i => i.Status == filter.Status);
            
            if (!string.IsNullOrEmpty(filter.Currency))
                query = query.Where(i => i.Currency == filter.Currency);
            
            if (filter.MinAmount.HasValue)
                query = query.Where(i => i.Total >= filter.MinAmount.Value);
            
            if (filter.MaxAmount.HasValue)
                query = query.Where(i => i.Total <= filter.MaxAmount.Value);
        }

        // Apply sorting
        var sortBy = filter?.SortBy ?? "IssueDate";
        var sortOrder = filter?.SortOrder ?? "desc";
        
        query = sortBy.ToLower() switch
        {
            "issuedate" => sortOrder == "asc" ? query.OrderBy(i => i.IssueDate) : query.OrderByDescending(i => i.IssueDate),
            "amount" => sortOrder == "asc" ? query.OrderBy(i => i.Total) : query.OrderByDescending(i => i.Total),
            "status" => sortOrder == "asc" ? query.OrderBy(i => i.Status) : query.OrderByDescending(i => i.Status),
            "invoicenumber" => sortOrder == "asc" ? query.OrderBy(i => i.InvoiceNumber) : query.OrderByDescending(i => i.InvoiceNumber),
            _ => query.OrderByDescending(i => i.IssueDate)
        };

        // Apply pagination
        var page = filter?.Page ?? 1;
        var pageSize = Math.Min(filter?.PageSize ?? 20, 100);
        
        var invoices = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var results = new List<InvoiceDto>();
        foreach (var invoice in invoices)
        {
            results.Add(await MapToInvoiceDtoAsync(invoice));
        }

        return results;
    }

    public async Task<InvoiceAnalyticsDto> GetInvoiceAnalyticsAsync(Guid userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.Invoices.Where(i => i.UserId == userId);
        
        if (startDate.HasValue)
            query = query.Where(i => i.IssueDate >= startDate.Value);
        
        if (endDate.HasValue)
            query = query.Where(i => i.IssueDate <= endDate.Value);

        var invoices = await query.ToListAsync();

        var analytics = new InvoiceAnalyticsDto
        {
            TotalRevenue = invoices.Where(i => i.Status == "paid").Sum(i => i.Total),
            TotalInvoices = invoices.Count,
            PaidInvoices = invoices.Count(i => i.Status == "paid"),
            UnpaidInvoices = invoices.Count(i => i.Status != "paid"),
            AverageInvoiceAmount = invoices.Any() ? Math.Round(invoices.Average(i => i.Total), 6) : 0,
            RevenueByMonth = invoices
                .Where(i => i.Status == "paid")
                .GroupBy(i => i.IssueDate.ToString("yyyy-MM"))
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Total)),
            InvoicesByStatus = invoices
                .GroupBy(i => i.Status)
                .ToDictionary(g => g.Key, g => g.Count()),
            TaxByJurisdiction = invoices
                .SelectMany(i => i.TaxCalculations)
                .GroupBy(t => t.Jurisdiction)
                .ToDictionary(g => g.Key, g => g.Sum(t => t.TaxAmount))
        };

        return analytics;
    }

    public async Task<byte[]> GenerateInvoicePdfAsync(Guid invoiceId, string correlationId)
    {
        return await _pdfService.GenerateInvoicePdfAsync(await GetInvoiceByIdAsync(invoiceId), correlationId);
    }

    public async Task<bool> RegenerateInvoicePdfAsync(Guid invoiceId, string correlationId)
    {
        return await _pdfService.GenerateAndStorePdfAsync(invoiceId, correlationId);
    }

    public async Task<string> GetInvoicePdfUrlAsync(Guid invoiceId, Guid userId)
    {
        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId && i.UserId == userId);
        if (invoice == null) throw new ArgumentException("Invoice not found");

        return await _pdfService.GetInvoicePdfDownloadUrlAsync(invoiceId, userId);
    }

    public async Task<bool> MarkInvoiceAsPaidAsync(Guid invoiceId, Guid paymentTransactionId, string correlationId)
    {
        try
        {
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) return false;

            invoice.Status = "paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentTransactionId = paymentTransactionId;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice {InvoiceId} marked as paid", invoiceId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark invoice {InvoiceId} as paid", invoiceId);
            return false;
        }
    }

    public async Task<bool> VoidInvoiceAsync(Guid invoiceId, string reason, string correlationId)
    {
        try
        {
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) return false;

            invoice.Status = "void";
            invoice.Notes += $"\n[VOIDED: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] {reason}";
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice {InvoiceId} voided: {Reason}", invoiceId, reason);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to void invoice {InvoiceId}", invoiceId);
            return false;
        }
    }

    public async Task<bool> UpdateInvoiceStatusAsync(Guid invoiceId, string status, string correlationId)
    {
        try
        {
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) return false;

            var validStatuses = new[] { "draft", "open", "paid", "void", "uncollectible" };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status: {status}");

            invoice.Status = status;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice {InvoiceId} status updated to {Status}", invoiceId, status);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update invoice {InvoiceId} status", invoiceId);
            return false;
        }
    }

    public async Task<bool> ResendInvoiceEmailsAsync(List<Guid> invoiceIds, string correlationId)
    {
        var successCount = 0;
        
        foreach (var invoiceId in invoiceIds)
        {
            try
            {
                var success = await _deliveryService.ResendInvoiceEmailAsync(invoiceId, correlationId);
                if (success) successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resend email for invoice {InvoiceId}", invoiceId);
            }
        }

        _logger.LogInformation("Resent {SuccessCount} of {TotalCount} invoice emails", successCount, invoiceIds.Count);
        return successCount == invoiceIds.Count;
    }

    public async Task<bool> BulkUpdateInvoiceStatusAsync(List<Guid> invoiceIds, string status, string correlationId)
    {
        try
        {
            var invoices = await _context.Invoices
                .Where(i => invoiceIds.Contains(i.Id))
                .ToListAsync();

            foreach (var invoice in invoices)
            {
                invoice.Status = status;
                invoice.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk updated {Count} invoices to status {Status}", invoices.Count, status);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bulk update invoice status to {Status}", status);
            return false;
        }
    }

    public async Task<byte[]> ExportInvoicesAsync(Guid userId, InvoiceFilterRequest filter, string format, string correlationId)
    {
        var invoices = await GetUserInvoicesAsync(userId, filter);
        
        return format.ToLower() switch
        {
            "csv" => await GenerateCsvExportAsync(invoices),
            "excel" => await GenerateExcelExportAsync(invoices),
            "json" => await GenerateJsonExportAsync(invoices),
            _ => throw new ArgumentException($"Unsupported export format: {format}")
        };
    }

    public async Task<List<InvoiceDto>> GetAllInvoicesAsync(InvoiceFilterRequest filter)
    {
        var query = _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.BillingAddress)
            .Include(i => i.TaxCalculations)
            .Include(i => i.User)
            .AsQueryable();

        // Apply filters (similar to GetUserInvoicesAsync but without userId filter)
        if (filter.StartDate.HasValue)
            query = query.Where(i => i.IssueDate >= filter.StartDate.Value);
        
        if (filter.EndDate.HasValue)
            query = query.Where(i => i.IssueDate <= filter.EndDate.Value);
        
        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(i => i.Status == filter.Status);
        
        if (!string.IsNullOrEmpty(filter.Currency))
            query = query.Where(i => i.Currency == filter.Currency);
        
        if (filter.MinAmount.HasValue)
            query = query.Where(i => i.Total >= filter.MinAmount.Value);
        
        if (filter.MaxAmount.HasValue)
            query = query.Where(i => i.Total <= filter.MaxAmount.Value);

        var page = filter.Page;
        var pageSize = Math.Min(filter.PageSize, 100);
        
        var invoices = await query
            .OrderByDescending(i => i.IssueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var results = new List<InvoiceDto>();
        foreach (var invoice in invoices)
        {
            results.Add(await MapToInvoiceDtoAsync(invoice));
        }

        return results;
    }

    public async Task<InvoiceAnalyticsDto> GetSystemInvoiceAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.Invoices.AsQueryable();
        
        if (startDate.HasValue)
            query = query.Where(i => i.IssueDate >= startDate.Value);
        
        if (endDate.HasValue)
            query = query.Where(i => i.IssueDate <= endDate.Value);

        var invoices = await query.ToListAsync();

        return new InvoiceAnalyticsDto
        {
            TotalRevenue = invoices.Where(i => i.Status == "paid").Sum(i => i.Total),
            TotalInvoices = invoices.Count,
            PaidInvoices = invoices.Count(i => i.Status == "paid"),
            UnpaidInvoices = invoices.Count(i => i.Status != "paid"),
            AverageInvoiceAmount = invoices.Any() ? Math.Round(invoices.Average(i => i.Total), 6) : 0,
            RevenueByMonth = invoices
                .Where(i => i.Status == "paid")
                .GroupBy(i => i.IssueDate.ToString("yyyy-MM"))
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Total)),
            InvoicesByStatus = invoices
                .GroupBy(i => i.Status)
                .ToDictionary(g => g.Key, g => g.Count()),
            TaxByJurisdiction = invoices
                .SelectMany(i => i.TaxCalculations)
                .GroupBy(t => t.Jurisdiction)
                .ToDictionary(g => g.Key, g => g.Sum(t => t.TaxAmount))
        };
    }

    public async Task<bool> RecalculateInvoiceTaxesAsync(Guid invoiceId, string correlationId)
    {
        return await RegenerateInvoiceAsync(invoiceId, correlationId);
    }

    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var month = DateTime.UtcNow.Month;
        
        var lastInvoice = await _context.Invoices
            .Where(i => i.InvoiceNumber.StartsWith($"INV-{year}-"))
            .OrderByDescending(i => i.InvoiceNumber)
            .FirstOrDefaultAsync();

        var nextNumber = 1;
        if (lastInvoice != null)
        {
            var parts = lastInvoice.InvoiceNumber.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"INV-{year}-{nextNumber:D6}";
    }

    private async Task<BillingAddressDto> CreateDefaultBillingAddressAsync(User user, string correlationId)
    {
        var request = new CreateBillingAddressRequest
        {
            FullName = $"{user.FirstName} {user.LastName}".Trim(),
            AddressLine1 = "Address Not Provided",
            City = "Unknown",
            PostalCode = "00000",
            Country = "US",
            SetAsDefault = true
        };

        return await _billingAddressService.CreateBillingAddressAsync(user.Id, request, correlationId);
    }

    private async Task<InvoiceDto> MapToInvoiceDtoAsync(GeoLeap.Api.Models.Invoice invoice)
    {
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
            BillingAddress = invoice.BillingAddress != null ? MapToBillingAddressDto(invoice.BillingAddress) : null,
            LineItems = invoice.LineItems?.Select(MapToLineItemDto).ToList() ?? new List<InvoiceLineItemDto>(),
            TaxCalculations = invoice.TaxCalculations?.Select(MapToTaxCalculationDto).ToList() ?? new List<TaxCalculationDto>(),
            IsPdfGenerated = invoice.IsPdfGenerated,
            IsEmailSent = invoice.IsEmailSent
        };
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

    private InvoiceLineItemDto MapToLineItemDto(GeoLeap.Api.Models.InvoiceLineItem item)
    {
        return new InvoiceLineItemDto
        {
            Id = item.Id,
            ItemType = item.ItemType,
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            Amount = item.Amount,
            Currency = item.Currency,
            ServicePeriodStart = item.ServicePeriodStart,
            ServicePeriodEnd = item.ServicePeriodEnd
        };
    }

    private TaxCalculationDto MapToTaxCalculationDto(TaxCalculation tax)
    {
        return new TaxCalculationDto
        {
            Id = tax.Id,
            TaxType = tax.TaxType,
            TaxName = tax.TaxName,
            Rate = tax.Rate,
            TaxableAmount = tax.TaxableAmount,
            TaxAmount = tax.TaxAmount,
            Country = tax.Country,
            StateProvince = tax.StateProvince,
            Jurisdiction = tax.Jurisdiction
        };
    }

    private async Task<InvoiceDto> GetInvoiceByIdAsync(Guid invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.BillingAddress)
            .Include(i => i.TaxCalculations)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
            throw new ArgumentException("Invoice not found", nameof(invoiceId));

        return await MapToInvoiceDtoAsync(invoice);
    }

    private async Task<byte[]> GenerateCsvExportAsync(List<InvoiceDto> invoices)
    {
        var csv = "Invoice Number,Status,Amount,Currency,Issue Date,Due Date,Paid Date,Description\n";
        
        foreach (var invoice in invoices)
        {
            csv += $"{invoice.InvoiceNumber},{invoice.Status},{invoice.Total},{invoice.Currency}," +
                   $"{invoice.IssueDate:yyyy-MM-dd},{invoice.DueDate:yyyy-MM-dd}," +
                   $"{invoice.PaidAt?.ToString("yyyy-MM-dd") ?? ""},{EscapeCsv(invoice.Description)}\n";
        }
        
        return System.Text.Encoding.UTF8.GetBytes(csv);
    }

    private async Task<byte[]> GenerateExcelExportAsync(List<InvoiceDto> invoices)
    {
        // For now, return CSV format - could enhance with actual Excel library later
        return await GenerateCsvExportAsync(invoices);
    }

    private async Task<byte[]> GenerateJsonExportAsync(List<InvoiceDto> invoices)
    {
        var json = JsonSerializer.Serialize(invoices, new JsonSerializerOptions { WriteIndented = true });
        return System.Text.Encoding.UTF8.GetBytes(json);
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

    /// <summary>
    /// Safe PDF generation with error handling for Hangfire background job
    /// FIXED: Week 1 Day 5 - Private method required for Hangfire (expression trees don't support local functions)
    /// </summary>
    public async Task SafeGeneratePdfAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            await _pdfService.GenerateAndStorePdfAsync(invoiceId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate PDF for invoice {InvoiceId} (CorrelationId: {CorrelationId})",
                invoiceId, correlationId);
        }
    }

    /// <summary>
    /// Safe email sending with error handling for Hangfire background job
    /// FIXED: Week 1 Day 5 - Private method required for Hangfire (expression trees don't support local functions)
    /// </summary>
    public async Task SafeSendInvoiceEmailAsync(Guid invoiceId, string correlationId)
    {
        try
        {
            await _deliveryService.SendInvoiceEmailAsync(invoiceId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email for invoice {InvoiceId} (CorrelationId: {CorrelationId})",
                invoiceId, correlationId);
        }
    }
}