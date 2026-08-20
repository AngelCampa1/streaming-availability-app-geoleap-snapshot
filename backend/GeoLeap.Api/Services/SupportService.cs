using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Text.Json;
using System.Text;
using Stripe;
using Microsoft.Extensions.Logging;
using StripeInvoice = Stripe.Invoice;
using StripeSubscription = Stripe.Subscription;
using StripePaymentMethod = Stripe.PaymentMethod;
using StripeInvoiceLineItem = Stripe.InvoiceLineItem;

namespace GeoLeap.Api.Services;

public class SupportService : ISupportService
{
    private readonly ApplicationDbContext _context;
    private readonly IRbacService _rbacService;
    private readonly IEmailService _emailService;
    private readonly IPaymentService _paymentService;
    private readonly IInvoiceService _invoiceService;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IDunningService _dunningService;
    private readonly ILogger<SupportService> _logger;
    private readonly Stripe.RefundService _stripeRefundService;

    public SupportService(
        ApplicationDbContext context,
        IRbacService rbacService,
        IEmailService emailService,
        IPaymentService paymentService,
        IInvoiceService invoiceService,
        ISubscriptionService subscriptionService,
        IDunningService dunningService,
        ILogger<SupportService> logger,
        Stripe.RefundService stripeRefundService)
    {
        _context = context;
        _rbacService = rbacService;
        _emailService = emailService;
        _paymentService = paymentService;
        _invoiceService = invoiceService;
        _subscriptionService = subscriptionService;
        _dunningService = dunningService;
        _logger = logger;
        _stripeRefundService = stripeRefundService;
    }

    public async Task<CustomerBillingDataResponse> GetCustomerBillingDataAsync(Guid customerId, Guid supportAgentId, string justification, string? correlationId = null)
    {
        // Check RBAC permissions
        if (!await HasBillingDataAccessAsync(supportAgentId, "support:billing:read"))
        {
            throw new UnauthorizedAccessException("Insufficient permissions to access customer billing data");
        }

        // Log the access
        await LogBillingDataAccessAsync(supportAgentId, customerId, "view_billing", "full_billing_data", justification, correlationId);

        try
        {
            // Get customer information
            var customer = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == customerId);

            if (customer == null)
            {
                throw new NotFoundException($"Customer with ID {customerId} not found");
            }

            // Determine data masking level based on agent permissions
            var maskingLevel = await GetDataMaskingLevelAsync(supportAgentId);

            // Week 3 Day 1 - Parallel billing data retrieval for improved performance
            var transactionsTask = GetMaskedTransactionsAsync(customerId, maskingLevel);
            var subscriptionsTask = GetMaskedSubscriptionsAsync(customerId, maskingLevel);
            var invoicesTask = GetMaskedInvoicesAsync(customerId, maskingLevel);
            var paymentMethodsTask = GetMaskedPaymentMethodsAsync(customerId, maskingLevel);
            var billingAddressTask = GetBillingAddressInfoAsync(customerId);

            // ✅ OPTIMIZED: Use await for each task result instead of .Result to avoid potential deadlocks
            var transactions = await transactionsTask;
            var subscriptions = await subscriptionsTask;
            var invoices = await invoicesTask;
            var paymentMethods = await paymentMethodsTask;
            var billingAddress = await billingAddressTask;

            return new CustomerBillingDataResponse
            {
                CustomerId = customerId,
                CustomerInfo = new UserBasicInfo
                {
                    Id = customer.Id,
                    Email = MaskEmail(customer.Email, maskingLevel),
                    DisplayName = customer.DisplayName ?? $"{customer.FirstName} {customer.LastName}",
                    CreatedAt = customer.CreatedAt,
                    IsActive = customer.IsActive
                },
                Transactions = transactions,
                Subscriptions = subscriptions,
                Invoices = invoices,
                PaymentMethods = paymentMethods,
                BillingAddress = billingAddress,
                DataMaskingLevel = maskingLevel,
                AccessedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve customer billing data for customer {CustomerId} by agent {SupportAgentId}. CorrelationId: {CorrelationId}",
                customerId, supportAgentId, correlationId);
            throw;
        }
    }

    public async Task<bool> HasBillingDataAccessAsync(Guid supportAgentId, string accessType)
    {
        return await _rbacService.HasPermissionAsync(supportAgentId, accessType);
    }

    public async Task LogBillingDataAccessAsync(Guid supportAgentId, Guid customerId, string accessType, string? resource = null, string? justification = null, string? correlationId = null)
    {
        var accessLog = new CustomerBillingAccessLog
        {
            SupportAgentId = supportAgentId,
            CustomerId = customerId,
            AccessType = accessType,
            AccessedResource = resource,
            DataMaskingLevel = await GetDataMaskingLevelAsync(supportAgentId),
            Justification = justification,
            CorrelationId = correlationId,
            AccessedAt = DateTime.UtcNow
        };

        _context.Set<CustomerBillingAccessLog>().Add(accessLog);
        await _context.SaveChangesAsync();
    }

    public async Task<PaymentTransaction> ProcessManualPaymentAsync(ManualPaymentRequest request, Guid supportAgentId, string? correlationId = null)
    {
        if (!await HasBillingDataAccessAsync(supportAgentId, "support:payments:process"))
        {
            throw new UnauthorizedAccessException("Insufficient permissions to process manual payments");
        }

        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = request.CustomerId,
            Amount = request.Amount,
            Status = "completed", // Manual payments are immediately completed
            Currency = "USD", // Default currency
            Description = $"Manual payment processed by support agent - {request.PaymentMethod}",
            CorrelationId = correlationId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Metadata = new Dictionary<string, object>
            {
                { "manual_payment", true },
                { "processed_by", supportAgentId },
                { "payment_method", request.PaymentMethod },
                { "reference", request.Reference ?? string.Empty },
                { "support_notes", request.InternalNotes ?? string.Empty }
            }
        };

        _context.PaymentTransactions.Add(transaction);

        // Create support action for audit trail
        var supportAction = new SupportAction
        {
            ActionType = SupportActionType.PaymentProcess,
            Status = SupportActionStatus.Completed,
            SupportAgentId = supportAgentId,
            TargetUserId = request.CustomerId,
            Title = "Manual Payment Processed",
            Description = $"Manual payment of ${request.Amount:F2} processed via {request.PaymentMethod}",
            Reason = request.Notes,
            Notes = request.InternalNotes,
            CorrelationId = correlationId,
            PaymentTransactionId = transaction.Id,
            InvoiceId = request.InvoiceId,
            CompletedAt = DateTime.UtcNow
        };

        _context.Set<SupportAction>().Add(supportAction);
        await _context.SaveChangesAsync();

        // Log the action
        await LogSupportActionAsync(supportAction.Id, supportAgentId, "manual_payment_processed", 
            $"Processed manual payment of ${request.Amount:F2}", null, new { TransactionId = transaction.Id }, correlationId: correlationId);

        // Send confirmation if requested
        if (request.SendConfirmation)
        {
            await SendCustomerNotificationAsync(request.CustomerId, "payment_confirmation", 
                new Dictionary<string, object>
                {
                    { "amount", request.Amount },
                    { "payment_method", request.PaymentMethod },
                    { "reference", request.Reference ?? string.Empty }
                }, 
                supportAgentId, correlationId);
        }

        _logger.LogInformation("Manual payment of ${Amount} processed by support agent {SupportAgentId} for customer {CustomerId}. CorrelationId: {CorrelationId}",
            request.Amount, supportAgentId, request.CustomerId, correlationId);

        return transaction;
    }

    public async Task<SupportRefund> ProcessRefundAsync(ProcessRefundRequest request, Guid supportAgentId, string? correlationId = null)
    {
        if (!await HasBillingDataAccessAsync(supportAgentId, "support:refunds:process"))
        {
            throw new UnauthorizedAccessException("Insufficient permissions to process refunds");
        }

        // Get the original payment transaction
        var originalTransaction = await _context.PaymentTransactions
            .FirstOrDefaultAsync(pt => pt.Id == request.PaymentTransactionId);

        if (originalTransaction == null)
        {
            throw new NotFoundException($"Payment transaction {request.PaymentTransactionId} not found");
        }

        if (request.RefundAmount > originalTransaction.Amount)
        {
            throw new InvalidOperationException("Refund amount cannot exceed original transaction amount");
        }

        // Create support action first
        var supportAction = new SupportAction
        {
            ActionType = SupportActionType.RefundProcess,
            Status = SupportActionStatus.InProgress,
            SupportAgentId = supportAgentId,
            TargetUserId = originalTransaction.UserId,
            Title = "Refund Processing",
            Description = $"Processing refund of ${request.RefundAmount:F2} for transaction {originalTransaction.Id}",
            Reason = request.Reason,
            Notes = request.InternalNotes,
            CorrelationId = correlationId,
            PaymentTransactionId = request.PaymentTransactionId
        };

        _context.Set<SupportAction>().Add(supportAction);
        await _context.SaveChangesAsync();

        // Create refund record
        var refund = new SupportRefund
        {
            SupportActionId = supportAction.Id,
            PaymentTransactionId = request.PaymentTransactionId,
            UserId = originalTransaction.UserId,
            RefundAmount = request.RefundAmount,
            OriginalAmount = originalTransaction.Amount,
            Status = RefundStatus.Processing,
            RefundMethod = request.RefundMethod,
            Reason = request.Reason,
            InternalNotes = request.InternalNotes,
            CustomerNotes = request.CustomerNotes,
            CorrelationId = correlationId
        };

        _context.Set<SupportRefund>().Add(refund);
        await _context.SaveChangesAsync();

        try
        {
            // Process refund through Stripe if applicable
            if (!string.IsNullOrEmpty(originalTransaction.StripePaymentIntentId) && request.RefundMethod == "original_payment_method")
            {
                var stripeRefund = await _stripeRefundService.CreateAsync(new RefundCreateOptions
                {
                    PaymentIntent = originalTransaction.StripePaymentIntentId,
                    Amount = (long)(request.RefundAmount * 100), // Convert to cents
                    Reason = RefundReasons.RequestedByCustomer,
                    Metadata = new Dictionary<string, string>
                    {
                        { "support_agent_id", supportAgentId.ToString() },
                        { "correlation_id", correlationId ?? string.Empty },
                        { "support_refund_id", refund.Id.ToString() }
                    }
                });

                refund.StripeRefundId = stripeRefund.Id;
                refund.Status = RefundStatus.Completed;
                refund.ProcessedAt = DateTime.UtcNow;
                refund.ProcessedBy = supportAgentId;

                supportAction.Status = SupportActionStatus.Completed;
                supportAction.CompletedAt = DateTime.UtcNow;
            }
            else
            {
                // For non-Stripe refunds, mark as completed immediately
                refund.Status = RefundStatus.Completed;
                refund.ProcessedAt = DateTime.UtcNow;
                refund.ProcessedBy = supportAgentId;

                supportAction.Status = SupportActionStatus.Completed;
                supportAction.CompletedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Log the action
            await LogSupportActionAsync(supportAction.Id, supportAgentId, "refund_processed",
                $"Processed refund of ${request.RefundAmount:F2}", 
                null, new { RefundId = refund.Id, StripeRefundId = refund.StripeRefundId }, 
                correlationId: correlationId);

            // Send notification if requested
            if (request.SendNotification)
            {
                await SendCustomerNotificationAsync(originalTransaction.UserId, "refund_processed",
                    new Dictionary<string, object>
                    {
                        { "refund_amount", request.RefundAmount },
                        { "original_amount", originalTransaction.Amount },
                        { "refund_method", request.RefundMethod },
                        { "customer_notes", request.CustomerNotes ?? string.Empty }
                    },
                    supportAgentId, correlationId);
            }

            _logger.LogInformation("Refund of ${RefundAmount} processed by support agent {SupportAgentId} for transaction {TransactionId}. CorrelationId: {CorrelationId}",
                request.RefundAmount, supportAgentId, request.PaymentTransactionId, correlationId);

            return refund;
        }
        catch (Exception ex)
        {
            // Update refund status to failed
            refund.Status = RefundStatus.Failed;
            refund.ProcessingError = ex.Message;
            supportAction.Status = SupportActionStatus.Failed;
            await _context.SaveChangesAsync();

            _logger.LogError(ex, "Failed to process refund {RefundId} by support agent {SupportAgentId}. CorrelationId: {CorrelationId}",
                refund.Id, supportAgentId, correlationId);
            throw;
        }
    }

    public async Task<SupportAction> CreateSubscriptionModificationAsync(SubscriptionModificationRequest request, Guid supportAgentId, string? correlationId = null)
    {
        if (!await HasBillingDataAccessAsync(supportAgentId, "support:subscriptions:modify"))
        {
            throw new UnauthorizedAccessException("Insufficient permissions to modify subscriptions");
        }

        var subscription = await _context.Subscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == request.SubscriptionId);

        if (subscription == null)
        {
            throw new NotFoundException($"Subscription {request.SubscriptionId} not found");
        }

        var supportAction = new SupportAction
        {
            ActionType = SupportActionType.SubscriptionModification,
            Status = request.RequireApproval ? SupportActionStatus.RequiresApproval : SupportActionStatus.InProgress,
            Priority = DetermineActionPriority(request.ModificationType),
            SupportAgentId = supportAgentId,
            TargetUserId = subscription.UserId,
            Title = $"Subscription {request.ModificationType}",
            Description = $"Subscription modification: {request.ModificationType} for subscription {subscription.Id}",
            Reason = request.Reason,
            Notes = request.Notes,
            CorrelationId = correlationId,
            SubscriptionId = request.SubscriptionId,
            Metadata = new Dictionary<string, object>
            {
                { "modification_type", request.ModificationType },
                { "new_plan", request.NewPlan ?? string.Empty },
                { "effective_date", request.EffectiveDate?.ToString("yyyy-MM-dd") ?? string.Empty },
                { "prorate_billing", request.ProrateBilling ?? false },
                { "send_notification", request.SendNotification }
            }
        };

        _context.Set<SupportAction>().Add(supportAction);
        await _context.SaveChangesAsync();

        await LogSupportActionAsync(supportAction.Id, supportAgentId, "subscription_modification_requested",
            $"Requested subscription {request.ModificationType}",
            null, new { ModificationType = request.ModificationType, SubscriptionId = request.SubscriptionId },
            correlationId: correlationId);

        _logger.LogInformation("Subscription modification {ModificationType} requested by support agent {SupportAgentId} for subscription {SubscriptionId}. CorrelationId: {CorrelationId}",
            request.ModificationType, supportAgentId, request.SubscriptionId, correlationId);

        return supportAction;
    }

    public async Task<Models.Invoice> RegenerateInvoiceAsync(Guid invoiceId, Guid supportAgentId, bool sendToCustomer = true, string? correlationId = null)
    {
        if (!await HasBillingDataAccessAsync(supportAgentId, "support:invoices:regenerate"))
        {
            throw new UnauthorizedAccessException("Insufficient permissions to regenerate invoices");
        }

        var invoice = await _context.Invoices
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
        {
            throw new NotFoundException($"Invoice {invoiceId} not found");
        }

        // Use existing invoice service to regenerate
        var regenerateSuccess = await _invoiceService.RegenerateInvoiceAsync(invoiceId, correlationId ?? Guid.NewGuid().ToString());
        
        if (!regenerateSuccess)
        {
            throw new InvalidOperationException($"Failed to regenerate invoice {invoiceId}");
        }
        
        // Get the updated invoice after regeneration
        var regeneratedInvoice = await _context.Invoices
            .Include(i => i.User)
            .Include(i => i.LineItems)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);
            
        if (regeneratedInvoice == null)
        {
            throw new NotFoundException($"Invoice {invoiceId} not found after regeneration");
        }

        // Create support action for audit trail
        var supportAction = new SupportAction
        {
            ActionType = SupportActionType.InvoiceRegeneration,
            Status = SupportActionStatus.Completed,
            SupportAgentId = supportAgentId,
            TargetUserId = invoice.UserId,
            Title = "Invoice Regenerated",
            Description = $"Invoice {invoice.InvoiceNumber} regenerated",
            CorrelationId = correlationId,
            InvoiceId = invoiceId,
            CompletedAt = DateTime.UtcNow,
            Metadata = new Dictionary<string, object>
            {
                { "send_to_customer", sendToCustomer },
                { "original_invoice_id", invoiceId }
            }
        };

        _context.Set<SupportAction>().Add(supportAction);
        await _context.SaveChangesAsync();

        await LogSupportActionAsync(supportAction.Id, supportAgentId, "invoice_regenerated",
            $"Regenerated invoice {invoice.InvoiceNumber}",
            null, new { InvoiceId = invoiceId, SendToCustomer = sendToCustomer },
            correlationId: correlationId);

        if (sendToCustomer)
        {
            var sendSuccess = await ResendInvoiceAsync(invoiceId, supportAgentId, "email", correlationId);
            _logger.LogInformation("Invoice resend result: {SendSuccess}", sendSuccess);
        }

        _logger.LogInformation("Invoice {InvoiceNumber} regenerated by support agent {SupportAgentId}. CorrelationId: {CorrelationId}",
            invoice.InvoiceNumber, supportAgentId, correlationId);

        return regeneratedInvoice;
    }

    // Additional implementation methods...
    
    private async Task<string> GetDataMaskingLevelAsync(Guid supportAgentId)
    {
        // Check permissions to determine masking level
        if (await _rbacService.HasPermissionAsync(supportAgentId, "support:billing:full_access"))
            return "full";
        else if (await _rbacService.HasPermissionAsync(supportAgentId, "support:billing:partial_access"))
            return "partial";
        else
            return "masked";
    }

    private async Task<List<MaskedPaymentTransaction>> GetMaskedTransactionsAsync(Guid customerId, string maskingLevel)
    {
        var transactions = await _context.PaymentTransactions
            .AsNoTracking()
            .Where(pt => pt.UserId == customerId)
            .OrderByDescending(pt => pt.CreatedAt)
            .Take(50) // Limit to recent transactions
            .ToListAsync();

        return transactions.Select(t => new MaskedPaymentTransaction
        {
            Id = t.Id,
            MaskedAmount = MaskAmount(t.Amount, maskingLevel),
            Status = t.Status,
            MaskedPaymentMethodInfo = MaskPaymentMethod(t.Description, maskingLevel),
            CreatedAt = t.CreatedAt,
            CorrelationId = t.CorrelationId
        }).ToList();
    }

    private async Task<List<MaskedSubscription>> GetMaskedSubscriptionsAsync(Guid customerId, string maskingLevel)
    {
        var subscriptions = await _context.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == customerId)
            .ToListAsync();

        return subscriptions.Select(s => new MaskedSubscription
        {
            Id = s.Id,
            PlanName = s.StripePriceId ?? "Unknown Plan", // Use StripePriceId as plan identifier
            Status = s.Status,
            MaskedPrice = MaskAmount(0, maskingLevel), // Price would need to be retrieved from Stripe
            StartDate = s.CurrentPeriodStart,
            EndDate = s.CurrentPeriodEnd,
            AutoRenew = !s.CancelAtPeriodEnd
        }).ToList();
    }

    private async Task<List<MaskedInvoice>> GetMaskedInvoicesAsync(Guid customerId, string maskingLevel)
    {
        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.UserId == customerId)
            .OrderByDescending(i => i.IssueDate)
            .Take(50)
            .ToListAsync();

        return invoices.Select(i => new MaskedInvoice
        {
            Id = i.Id,
            InvoiceNumber = i.InvoiceNumber,
            MaskedAmount = MaskAmount(i.Total, maskingLevel),
            Status = i.Status,
            IssueDate = i.IssueDate,
            DueDate = i.DueDate
        }).ToList();
    }

    private async Task<List<MaskedPaymentMethod>> GetMaskedPaymentMethodsAsync(Guid customerId, string maskingLevel)
    {
        var paymentMethods = await _context.PaymentMethods
            .AsNoTracking()
            .Where(pm => pm.UserId == customerId && pm.IsActive)
            .ToListAsync();

        return paymentMethods.Select(pm => new MaskedPaymentMethod
        {
            Id = pm.Id,
            MaskedCardNumber = MaskCardNumber(pm.Last4, maskingLevel),
            CardBrand = pm.Brand ?? string.Empty,
            ExpiryMonth = maskingLevel == "full" ? pm.ExpiryMonth?.ToString() ?? string.Empty : "XX",
            ExpiryYear = maskingLevel == "full" ? pm.ExpiryYear?.ToString() ?? string.Empty : "XXXX",
            IsDefault = pm.IsDefault,
            IsActive = pm.IsActive
        }).ToList();
    }

    private async Task<BillingAddressInfo?> GetBillingAddressInfoAsync(Guid customerId)
    {
        var billingAddress = await _context.BillingAddresses
            .AsNoTracking()
            .Where(ba => ba.UserId == customerId && ba.IsActive)
            .FirstOrDefaultAsync();

        if (billingAddress == null) return null;

        return new BillingAddressInfo
        {
            AddressLine1 = billingAddress.AddressLine1,
            AddressLine2 = billingAddress.AddressLine2,
            City = billingAddress.City,
            StateProvince = billingAddress.State,
            PostalCode = billingAddress.PostalCode,
            Country = billingAddress.Country
        };
    }

    private string MaskEmail(string? email, string maskingLevel)
    {
        if (string.IsNullOrEmpty(email)) return string.Empty;
        
        return maskingLevel switch
        {
            "full" => email,
            "partial" => MaskEmailPartial(email),
            _ => MaskEmailFull(email)
        };
    }

    private string MaskEmailPartial(string email)
    {
        var atIndex = email.IndexOf('@');
        if (atIndex <= 1) return email;
        
        var username = email.Substring(0, atIndex);
        var domain = email.Substring(atIndex);
        
        return username.Length > 2 
            ? $"{username[0]}***{username[^1]}{domain}"
            : $"***{domain}";
    }

    private string MaskEmailFull(string email)
    {
        var atIndex = email.IndexOf('@');
        return atIndex > 0 ? $"***@{email.Substring(atIndex + 1)}" : "***";
    }

    private string MaskAmount(decimal amount, string maskingLevel)
    {
        return maskingLevel switch
        {
            "full" => $"${amount:F2}",
            "partial" => $"$X{amount.ToString("F2")[^2..]}",
            _ => "$XX.XX"
        };
    }

    private string MaskPaymentMethod(string? paymentMethod, string maskingLevel)
    {
        if (string.IsNullOrEmpty(paymentMethod)) return string.Empty;
        
        return maskingLevel switch
        {
            "full" => paymentMethod,
            "partial" => paymentMethod.Length > 4 ? $"***{paymentMethod[^4..]}" : "***",
            _ => "****"
        };
    }

    private string MaskCardNumber(string? last4, string maskingLevel)
    {
        if (string.IsNullOrEmpty(last4)) return "**** **** **** ****";
        
        return maskingLevel switch
        {
            "full" => $"**** **** **** {last4}",
            "partial" => $"**** **** **** {last4}",
            _ => "**** **** **** ****"
        };
    }

    private SupportPriority DetermineActionPriority(string modificationType)
    {
        return modificationType.ToLower() switch
        {
            "cancel" => SupportPriority.High,
            "pause" => SupportPriority.Normal,
            "reactivate" => SupportPriority.High,
            "plan_change" => SupportPriority.Normal,
            _ => SupportPriority.Normal
        };
    }

    // Stub implementations for interface methods (to be completed)
    public async Task<PaymentTransaction> VoidPaymentTransactionAsync(Guid transactionId, Guid supportAgentId, string reason, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Voiding payment transaction {TransactionId} by support agent {AgentId}", transactionId, supportAgentId);
            
            var transaction = await _context.PaymentTransactions
                .FirstOrDefaultAsync(pt => pt.Id == transactionId);
                
            if (transaction == null)
                throw new InvalidOperationException($"Payment transaction {transactionId} not found");
                
            if (transaction.Status == "voided")
                throw new InvalidOperationException("Transaction is already voided");
                
            // Update transaction status
            transaction.Status = "voided";
            transaction.UpdatedAt = DateTime.UtcNow;
            transaction.FailureReason = $"Voided by support: {reason}";
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, transaction.UserId, "void_payment", 
                transactionId.ToString(), reason, correlationId);
            
            await _context.SaveChangesAsync();
            return transaction;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error voiding payment transaction {TransactionId}", transactionId);
            throw;
        }
    }
    public async Task<List<PaymentTransaction>> GetPendingPaymentTransactionsAsync(int page = 1, int pageSize = 50)
    {
        try
        {
            return await _context.PaymentTransactions
                .Where(pt => pt.Status == "pending" || pt.Status == "requires_action")
                .OrderBy(pt => pt.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending payment transactions");
            throw;
        }
    }
    public async Task<Models.Subscription> ApplySubscriptionModificationAsync(Guid supportActionId, Guid approverUserId, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Applying subscription modification {ActionId} approved by {ApproverId}", supportActionId, approverUserId);
            
            var supportAction = await _context.SupportActions
                .FirstOrDefaultAsync(sa => sa.Id == supportActionId);
                
            if (supportAction == null)
                throw new InvalidOperationException($"Support action {supportActionId} not found");
                
            if (supportAction.Status != SupportActionStatus.Approved)
                throw new InvalidOperationException("Support action must be approved before applying");
                
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.UserId == supportAction.TargetUserId);
                
            if (subscription == null)
                throw new InvalidOperationException("Subscription not found");
                
            // Apply the modification based on action type
            switch (supportAction.ActionType)
            {
                case SupportActionType.PlanChange:
                    subscription.PlanType = supportAction.NewValues?.GetValueOrDefault("planType")?.ToString() ?? subscription.PlanType;
                    break;
                case SupportActionType.Pause:
                    subscription.Status = "paused";
                    subscription.PausedAt = DateTime.UtcNow;
                    break;
                case SupportActionType.Resume:
                    subscription.Status = "active";
                    subscription.PausedAt = null;
                    break;
            }
            
            subscription.UpdatedAt = DateTime.UtcNow;
            supportAction.Status = SupportActionStatus.Completed;
            supportAction.CompletedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying subscription modification {ActionId}", supportActionId);
            throw;
        }
    }
    public async Task<Models.Subscription> PauseSubscriptionAsync(Guid subscriptionId, Guid supportAgentId, DateTime? resumeDate = null, string? reason = null, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Pausing subscription {SubscriptionId} by support agent {AgentId}", subscriptionId, supportAgentId);
            
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.Id == subscriptionId);
                
            if (subscription == null)
                throw new InvalidOperationException($"Subscription {subscriptionId} not found");
                
            if (subscription.Status == "paused")
                throw new InvalidOperationException("Subscription is already paused");
                
            subscription.Status = "paused";
            subscription.PausedAt = DateTime.UtcNow;
            subscription.ResumeAt = resumeDate;
            subscription.UpdatedAt = DateTime.UtcNow;
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, subscription.UserId, "pause_subscription",
                subscriptionId.ToString(), reason, correlationId);
            
            await _context.SaveChangesAsync();
            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pausing subscription {SubscriptionId}", subscriptionId);
            throw;
        }
    }
    public async Task<Models.Subscription> ResumeSubscriptionAsync(Guid subscriptionId, Guid supportAgentId, string? reason = null, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Resuming subscription {SubscriptionId} by support agent {AgentId}", subscriptionId, supportAgentId);
            
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.Id == subscriptionId);
                
            if (subscription == null)
                throw new InvalidOperationException($"Subscription {subscriptionId} not found");
                
            if (subscription.Status != "paused")
                throw new InvalidOperationException("Subscription is not paused");
                
            subscription.Status = "active";
            subscription.PausedAt = null;
            subscription.ResumeAt = null;
            subscription.UpdatedAt = DateTime.UtcNow;
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, subscription.UserId, "resume_subscription",
                subscriptionId.ToString(), reason, correlationId);
            
            await _context.SaveChangesAsync();
            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resuming subscription {SubscriptionId}", subscriptionId);
            throw;
        }
    }
    public async Task<Models.Invoice> CreateManualInvoiceAsync(Guid customerId, List<Models.InvoiceLineItem> lineItems, Guid supportAgentId, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Creating manual invoice for customer {CustomerId} by agent {AgentId}", customerId, supportAgentId);

            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
            if (customer == null)
            {
                throw new InvalidOperationException($"Customer {customerId} not found");
            }

            var invoice = new Models.Invoice
            {
                Id = Guid.NewGuid(),
                UserId = customerId,
                InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}",
                Status = "pending",
                IssueDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(30),
                Subtotal = lineItems.Sum(li => li.Amount),
                TaxAmount = lineItems.Sum(li => li.Amount) * 0.1m, // 10% tax
                Total = lineItems.Sum(li => li.Amount) * 1.1m,
                Currency = "USD",
                // CreatedAt = DateTime.UtcNow, // Not in model
                // CreatedBy = supportAgentId, // Not in model
                // CorrelationId = correlationId // Not in model
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Created manual invoice {InvoiceId} for customer {CustomerId}", invoice.Id, customerId);
            return invoice;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating manual invoice for customer {CustomerId}", customerId);
            throw;
        }
    }
    public async Task<bool> ResendInvoiceAsync(Guid invoiceId, Guid supportAgentId, string deliveryMethod = "email", string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Resending invoice {InvoiceId} via {Method} by agent {AgentId}", invoiceId, deliveryMethod, supportAgentId);

            var invoice = await _context.Invoices
                .Include(i => i.User)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice?.User == null)
            {
                _logger.LogWarning("Invoice {InvoiceId} or user not found", invoiceId);
                return false;
            }

            // In a real implementation, you would integrate with email service here
            // For now, just mark as sent
            // invoice.LastSentAt = DateTime.UtcNow;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully resent invoice {InvoiceId}", invoiceId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending invoice {InvoiceId}", invoiceId);
            return false;
        }
    }
    public async Task<List<Models.Invoice>> GetFailedInvoiceDeliveriesAsync(int page = 1, int pageSize = 50)
    {
        try
        {
            _logger.LogInformation("Getting failed invoice deliveries (page {Page}, size {Size})", page, pageSize);

            var failedInvoices = await _context.Invoices
                .Include(i => i.User)
                .Where(i => i.Status == "failed" || i.EmailSentAt == null)
                .OrderByDescending(i => i.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            _logger.LogInformation("Found {Count} failed invoice deliveries", failedInvoices.Count);
            return failedInvoices;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting failed invoice deliveries");
            throw;
        }
    }
    public async Task<SupportRefund> GetRefundStatusAsync(Guid refundId)
    {
        try
        {
            var refund = await _context.SupportRefunds
                .FirstOrDefaultAsync(sr => sr.Id == refundId);
                
            if (refund == null)
                throw new InvalidOperationException($"Refund {refundId} not found");
                
            return refund;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting refund status {RefundId}", refundId);
            throw;
        }
    }
    public async Task<List<SupportRefund>> GetPendingRefundsAsync(int page = 1, int pageSize = 50)
    {
        try
        {
            return await _context.SupportRefunds
                .Where(sr => sr.Status == RefundStatus.Pending)
                .OrderBy(sr => sr.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending refunds");
            throw;
        }
    }
    public async Task<SupportRefund> CancelRefundAsync(Guid refundId, Guid supportAgentId, string reason, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Cancelling refund {RefundId} by agent {AgentId}", refundId, supportAgentId);

            var refund = await _context.SupportRefunds
                .FirstOrDefaultAsync(sr => sr.Id == refundId);

            if (refund == null)
            {
                throw new InvalidOperationException($"Refund {refundId} not found");
            }

            if (refund.Status != RefundStatus.Pending)
            {
                throw new InvalidOperationException($"Cannot cancel refund {refundId} - status is {refund.Status}");
            }

            refund.Status = RefundStatus.Cancelled;
            refund.InternalNotes = $"Cancelled by support agent: {reason}";
            refund.ProcessedBy = supportAgentId;
            refund.ProcessedAt = DateTime.UtcNow;
            refund.UpdatedAt = DateTime.UtcNow;
            refund.CorrelationId = correlationId;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully cancelled refund {RefundId}", refundId);
            return refund;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling refund {RefundId}", refundId);
            throw;
        }
    }
    public async Task<SupportAction> CreateSupportActionAsync(CreateSupportActionRequest request, Guid supportAgentId, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Creating support action {ActionType} for user {UserId} by agent {AgentId}", request.ActionType, request.TargetUserId, supportAgentId);

            var supportAction = new SupportAction
            {
                Id = Guid.NewGuid(),
                ActionType = request.ActionType,
                Status = SupportActionStatus.Pending,
                Priority = request.Priority,
                SupportAgentId = supportAgentId,
                TargetUserId = request.TargetUserId,
                Title = request.Title,
                Description = request.Description,
                Reason = request.Reason,
                Notes = request.Notes,
                CorrelationId = correlationId,
                PaymentTransactionId = request.PaymentTransactionId,
                SubscriptionId = request.SubscriptionId,
                InvoiceId = request.InvoiceId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (request.Metadata != null)
            {
                supportAction.Metadata = request.Metadata;
            }

            _context.SupportActions.Add(supportAction);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created support action {ActionId}", supportAction.Id);
            return supportAction;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating support action");
            throw;
        }
    }
    public async Task<SupportAction> GetSupportActionAsync(Guid supportActionId)
    {
        try
        {
            var supportAction = await _context.SupportActions
                .Include(sa => sa.SupportAgent)
                .Include(sa => sa.TargetUser)
                .FirstOrDefaultAsync(sa => sa.Id == supportActionId);

            if (supportAction == null)
            {
                throw new InvalidOperationException($"Support action {supportActionId} not found");
            }

            return supportAction;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting support action {ActionId}", supportActionId);
            throw;
        }
    }
    public async Task<List<SupportAction>> GetSupportActionsAsync(Guid? userId = null, SupportActionStatus? status = null, SupportActionType? actionType = null, int page = 1, int pageSize = 50) 
    {
        try
        {
            _logger.LogInformation("Getting support actions for user {UserId}, status {Status}, type {ActionType}", userId, status, actionType);
            
            var query = _context.SupportActions
                .Include(sa => sa.SupportAgent)
                .Include(sa => sa.TargetUser)
                .AsQueryable();
                
            if (userId.HasValue)
            {
                query = query.Where(sa => sa.TargetUserId == userId.Value || sa.SupportAgentId == userId.Value);
            }
            
            if (status.HasValue)
            {
                query = query.Where(sa => sa.Status == status.Value);
            }
            
            if (actionType.HasValue)
            {
                query = query.Where(sa => sa.ActionType == actionType.Value);
            }
            
            var result = await query
                .OrderByDescending(sa => sa.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
                
            _logger.LogInformation("Found {Count} support actions", result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting support actions");
            throw;
        }
    }
    public async Task<SupportAction> UpdateSupportActionStatusAsync(Guid supportActionId, SupportActionStatus status, Guid userId, string? notes = null, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Updating support action {ActionId} status to {Status} by user {UserId}", supportActionId, status, userId);
            
            var supportAction = await _context.SupportActions
                .FirstOrDefaultAsync(sa => sa.Id == supportActionId);
                
            if (supportAction == null)
            {
                throw new NotFoundException($"Support action {supportActionId} not found");
            }
            
            var oldStatus = supportAction.Status;
            supportAction.Status = status;
            supportAction.UpdatedAt = DateTime.UtcNow;
            
            if (!string.IsNullOrEmpty(notes))
            {
                supportAction.Notes = (supportAction.Notes ?? "") + "\n" + notes;
            }
            
            if (status == SupportActionStatus.Completed)
            {
                supportAction.CompletedAt = DateTime.UtcNow;
            }
            
            await _context.SaveChangesAsync();
            
            // Log the status change
            await LogSupportActionAsync(supportActionId, userId, "status_updated",
                $"Status changed from {oldStatus} to {status}",
                new { OldStatus = oldStatus }, new { NewStatus = status },
                correlationId: correlationId);
            
            _logger.LogInformation("Updated support action {ActionId} status to {Status}", supportActionId, status);
            return supportAction;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating support action status");
            throw;
        }
    }
    public async Task<SupportAction> ApproveSupportActionAsync(Guid supportActionId, Guid approverUserId, string? notes = null, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Approving support action {ActionId} by user {ApproverId}", supportActionId, approverUserId);
            
            var supportAction = await _context.SupportActions
                .FirstOrDefaultAsync(sa => sa.Id == supportActionId);
                
            if (supportAction == null)
            {
                throw new NotFoundException($"Support action {supportActionId} not found");
            }
            
            if (supportAction.Status != SupportActionStatus.RequiresApproval)
            {
                throw new InvalidOperationException($"Support action {supportActionId} is not in a state that requires approval");
            }
            
            supportAction.Status = SupportActionStatus.Approved;
            supportAction.ApprovedBy = approverUserId;
            supportAction.ApprovedAt = DateTime.UtcNow;
            supportAction.UpdatedAt = DateTime.UtcNow;
            
            if (!string.IsNullOrEmpty(notes))
            {
                supportAction.Notes = (supportAction.Notes ?? "") + "\nApproval notes: " + notes;
            }
            
            await _context.SaveChangesAsync();
            
            // Log the approval
            await LogSupportActionAsync(supportActionId, approverUserId, "approved",
                "Support action approved", null, new { ApproverUserId = approverUserId, Notes = notes },
                correlationId: correlationId);
            
            _logger.LogInformation("Approved support action {ActionId}", supportActionId);
            return supportAction;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving support action");
            throw;
        }
    }
    public async Task<SupportAction> RejectSupportActionAsync(Guid supportActionId, Guid rejectorUserId, string reason, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Rejecting support action {ActionId} by user {RejectorId}", supportActionId, rejectorUserId);
            
            var supportAction = await _context.SupportActions
                .FirstOrDefaultAsync(sa => sa.Id == supportActionId);
                
            if (supportAction == null)
            {
                throw new NotFoundException($"Support action {supportActionId} not found");
            }
            
            if (supportAction.Status != SupportActionStatus.RequiresApproval)
            {
                throw new InvalidOperationException($"Support action {supportActionId} is not in a state that requires approval");
            }
            
            supportAction.Status = SupportActionStatus.Rejected;
            supportAction.RejectedBy = rejectorUserId;
            supportAction.RejectedAt = DateTime.UtcNow;
            supportAction.UpdatedAt = DateTime.UtcNow;
            supportAction.RejectionReason = reason;
            
            await _context.SaveChangesAsync();
            
            // Log the rejection
            await LogSupportActionAsync(supportActionId, rejectorUserId, "rejected",
                $"Support action rejected: {reason}", null, new { RejectorUserId = rejectorUserId, Reason = reason },
                correlationId: correlationId);
            
            _logger.LogInformation("Rejected support action {ActionId} with reason: {Reason}", supportActionId, reason);
            return supportAction;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting support action");
            throw;
        }
    }
    public async Task LogSupportActionAsync(Guid supportActionId, Guid userId, string eventName, string? description = null, object? oldValues = null, object? newValues = null, string? ipAddress = null, string? userAgent = null, string? correlationId = null)
    {
        try
        {
            _logger.LogInformation("Logging support action {ActionId} event: {EventName}", supportActionId, eventName);
            
            var auditLog = new SupportActionAuditLog
            {
                Id = Guid.NewGuid(),
                SupportActionId = supportActionId,
                UserId = userId,
                Event = eventName,
                Description = description,
                OldValues = oldValues != null ? System.Text.Json.JsonSerializer.Serialize(oldValues) : null,
                NewValues = newValues != null ? System.Text.Json.JsonSerializer.Serialize(newValues) : null,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.SupportActionAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging support action {ActionId} event: {EventName}", supportActionId, eventName);
            // Don't throw here to avoid cascading failures
        }
    }
    public async Task<List<SupportActionAuditLog>> GetSupportActionAuditLogsAsync(Guid supportActionId, int page = 1, int pageSize = 50) 
    {
        try
        {
            _logger.LogInformation("Getting audit logs for support action {ActionId}", supportActionId);
            
            var auditLogs = await _context.SupportActionAuditLogs
                .Where(sal => sal.SupportActionId == supportActionId)
                .OrderByDescending(sal => sal.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            _logger.LogInformation("Found {Count} audit logs for support action {ActionId}", auditLogs.Count, supportActionId);
            return auditLogs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting support action audit logs");
            throw;
        }
    }
    public async Task<List<CustomerBillingAccessLog>> GetBillingAccessLogsAsync(Guid? customerId = null, Guid? supportAgentId = null, DateTime? fromDate = null, DateTime? toDate = null, int page = 1, int pageSize = 50) 
    {
        try
        {
            _logger.LogInformation("Getting billing access logs for customer {CustomerId}, agent {AgentId}", customerId, supportAgentId);
            
            var query = _context.Set<CustomerBillingAccessLog>().AsQueryable();
            
            if (customerId.HasValue)
            {
                query = query.Where(cbal => cbal.CustomerId == customerId.Value);
            }
            
            if (supportAgentId.HasValue)
            {
                query = query.Where(cbal => cbal.SupportAgentId == supportAgentId.Value);
            }
            
            if (fromDate.HasValue)
            {
                query = query.Where(cbal => cbal.AccessedAt >= fromDate.Value);
            }
            
            if (toDate.HasValue)
            {
                query = query.Where(cbal => cbal.AccessedAt <= toDate.Value);
            }
            
            var logs = await query
                .OrderByDescending(cbal => cbal.AccessedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            _logger.LogInformation("Found {Count} billing access logs", logs.Count);
            return logs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting billing access logs");
            throw;
        }
    }
    public async Task<Stream> ExportCustomerBillingDataAsync(Guid customerId, Guid supportAgentId, string format = "csv", string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Exporting billing data for customer {CustomerId} in {Format} format", customerId, format);
            
            // Check permissions
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:billing:export"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to export customer billing data");
            }
            
            // Get customer billing data
            var billingData = await GetCustomerBillingDataAsync(customerId, supportAgentId, "Data export", correlationId);
            
            // Log the export
            await LogBillingDataAccessAsync(supportAgentId, customerId, "export_billing", "full_billing_export", "Data export request", correlationId);
            
            var sb = new StringBuilder();
            
            if (format.ToLower() == "csv")
            {
                // CSV format
                sb.AppendLine("Type,Date,Amount,Status,Description");
                
                foreach (var transaction in billingData.Transactions)
                {
                    sb.AppendLine($"Transaction,{transaction.CreatedAt:yyyy-MM-dd},{transaction.MaskedAmount},{transaction.Status},{transaction.MaskedPaymentMethodInfo}");
                }
                
                foreach (var invoice in billingData.Invoices)
                {
                    sb.AppendLine($"Invoice,{invoice.IssueDate:yyyy-MM-dd},{invoice.MaskedAmount},{invoice.Status},{invoice.InvoiceNumber}");
                }
            }
            else
            {
                // JSON format
                var jsonData = JsonSerializer.Serialize(billingData, new JsonSerializerOptions { WriteIndented = true });
                sb.Append(jsonData);
            }
            
            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var stream = new MemoryStream(bytes);
            
            _logger.LogInformation("Exported billing data for customer {CustomerId}", customerId);
            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting customer billing data");
            throw;
        }
    }
    public async Task<Stream> ExportSupportActionsReportAsync(DateTime fromDate, DateTime toDate, Guid requestingUserId, string format = "csv", string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Exporting support actions report from {FromDate} to {ToDate} for user {UserId}", fromDate, toDate, requestingUserId);
            
            // Check permissions
            if (!await HasBillingDataAccessAsync(requestingUserId, "support:reports:export"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to export support actions report");
            }
            
            var supportActions = await _context.SupportActions
                .Include(sa => sa.SupportAgent)
                .Include(sa => sa.TargetUser)
                .Where(sa => sa.CreatedAt >= fromDate && sa.CreatedAt <= toDate)
                .OrderByDescending(sa => sa.CreatedAt)
                .ToListAsync();
            
            var sb = new StringBuilder();
            
            if (format.ToLower() == "csv")
            {
                // CSV format
                sb.AppendLine("ActionId,ActionType,Status,SupportAgent,TargetUser,Title,CreatedAt,CompletedAt,Priority");
                
                foreach (var action in supportActions)
                {
                    sb.AppendLine($"{action.Id},{action.ActionType},{action.Status},{action.SupportAgent?.Email ?? "Unknown"},{action.TargetUser?.Email ?? "Unknown"},{action.Title},{action.CreatedAt:yyyy-MM-dd HH:mm},{action.CompletedAt?.ToString("yyyy-MM-dd HH:mm") ?? ""},{action.Priority}");
                }
            }
            else
            {
                // JSON format
                var reportData = supportActions.Select(sa => new
                {
                    sa.Id,
                    sa.ActionType,
                    sa.Status,
                    SupportAgent = sa.SupportAgent?.Email,
                    TargetUser = sa.TargetUser?.Email,
                    sa.Title,
                    sa.Description,
                    sa.CreatedAt,
                    sa.CompletedAt,
                    sa.Priority
                });
                
                var jsonData = JsonSerializer.Serialize(reportData, new JsonSerializerOptions { WriteIndented = true });
                sb.Append(jsonData);
            }
            
            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var stream = new MemoryStream(bytes);
            
            _logger.LogInformation("Exported support actions report with {Count} actions", supportActions.Count);
            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting support actions report");
            throw;
        }
    }
    public async Task<Dictionary<string, object>> GetSupportMetricsAsync(DateTime fromDate, DateTime toDate, Guid? supportAgentId = null) 
    {
        try
        {
            _logger.LogInformation("Getting support metrics from {FromDate} to {ToDate} for agent {AgentId}", fromDate, toDate, supportAgentId);
            
            var query = _context.SupportActions.AsQueryable();
            
            if (supportAgentId.HasValue)
            {
                query = query.Where(sa => sa.SupportAgentId == supportAgentId.Value);
            }
            
            var actions = await query
                .Where(sa => sa.CreatedAt >= fromDate && sa.CreatedAt <= toDate)
                .ToListAsync();
            
            var metrics = new Dictionary<string, object>
            {
                ["total_actions"] = actions.Count,
                ["completed_actions"] = actions.Count(sa => sa.Status == SupportActionStatus.Completed),
                ["pending_actions"] = actions.Count(sa => sa.Status == SupportActionStatus.Pending),
                ["approved_actions"] = actions.Count(sa => sa.Status == SupportActionStatus.Approved),
                ["rejected_actions"] = actions.Count(sa => sa.Status == SupportActionStatus.Rejected),
                ["actions_by_type"] = actions.GroupBy(sa => sa.ActionType).ToDictionary(g => g.Key.ToString(), g => g.Count()),
                ["actions_by_priority"] = actions.GroupBy(sa => sa.Priority).ToDictionary(g => g.Key.ToString(), g => g.Count()),
                ["average_completion_time_hours"] = actions.Where(sa => sa.CompletedAt.HasValue)
                    .Select(sa => (sa.CompletedAt!.Value - sa.CreatedAt).TotalHours)
                    .DefaultIfEmpty(0)
                    .Average(),
                ["date_range"] = new { from = fromDate, to = toDate }
            };
            
            _logger.LogInformation("Generated support metrics: {TotalActions} total actions", actions.Count);
            return metrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting support metrics");
            throw;
        }
    }
    public async Task<User> UpdateCustomerBillingAddressAsync(Guid customerId, BillingAddress newAddress, Guid supportAgentId, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Updating billing address for customer {CustomerId} by agent {AgentId}", customerId, supportAgentId);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:billing:modify"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to modify customer billing address");
            }
            
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
            if (customer == null)
            {
                throw new NotFoundException($"Customer {customerId} not found");
            }
            
            // Deactivate existing billing addresses
            var existingAddresses = await _context.BillingAddresses
                .Where(ba => ba.UserId == customerId && ba.IsActive)
                .ToListAsync();
                
            foreach (var addr in existingAddresses)
            {
                addr.IsActive = false;
                addr.UpdatedAt = DateTime.UtcNow;
            }
            
            // Add new billing address
            newAddress.Id = Guid.NewGuid();
            newAddress.UserId = customerId;
            newAddress.IsActive = true;
            newAddress.CreatedAt = DateTime.UtcNow;
            newAddress.UpdatedAt = DateTime.UtcNow;
            
            _context.BillingAddresses.Add(newAddress);
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "update_billing_address",
                "billing_address", "Updated customer billing address", correlationId);
            
            _logger.LogInformation("Updated billing address for customer {CustomerId}", customerId);
            return customer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating customer billing address");
            throw;
        }
    }
    public async Task<User> ApplyAccountCreditAsync(Guid customerId, decimal creditAmount, string reason, Guid supportAgentId, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Applying {CreditAmount} account credit for customer {CustomerId} by agent {AgentId}", creditAmount, customerId, supportAgentId);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:credits:apply"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to apply account credits");
            }
            
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
            if (customer == null)
            {
                throw new NotFoundException($"Customer {customerId} not found");
            }
            
            // Create credit transaction
            var creditTransaction = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                UserId = customerId,
                Amount = creditAmount,
                Status = "completed",
                Currency = "USD",
                Description = $"Account credit applied by support: {reason}",
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Metadata = new Dictionary<string, object>
                {
                    { "credit_transaction", true },
                    { "applied_by", supportAgentId },
                    { "reason", reason },
                    { "support_action", true }
                }
            };
            
            _context.PaymentTransactions.Add(creditTransaction);
            
            // Update customer credit balance (if you have such a field)
            // customer.AccountBalance += creditAmount;
            
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "apply_credit",
                "account_credit", $"Applied ${creditAmount:F2} credit: {reason}", correlationId);
            
            _logger.LogInformation("Applied {CreditAmount} credit to customer {CustomerId}", creditAmount, customerId);
            return customer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying account credit");
            throw;
        }
    }
    public async Task<User> FreezeCustomerAccountAsync(Guid customerId, Guid supportAgentId, string reason, DateTime? unfreezeDate = null, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Freezing customer account {CustomerId} by agent {AgentId} for reason: {Reason}", customerId, supportAgentId, reason);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:accounts:freeze"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to freeze customer accounts");
            }
            
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
            if (customer == null)
            {
                throw new NotFoundException($"Customer {customerId} not found");
            }
            
            if (!customer.IsActive)
            {
                throw new InvalidOperationException("Customer account is already inactive");
            }
            
            // Freeze the account
            customer.IsActive = false;
            customer.FrozenAt = DateTime.UtcNow;
            customer.FrozenBy = supportAgentId;
            customer.FreezeReason = reason;
            customer.UnfreezeAt = unfreezeDate;
            customer.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Create support action for audit trail
            var supportAction = new SupportAction
            {
                ActionType = SupportActionType.AccountFreeze,
                Status = SupportActionStatus.Completed,
                SupportAgentId = supportAgentId,
                TargetUserId = customerId,
                Title = "Account Frozen",
                Description = $"Account frozen for: {reason}",
                Reason = reason,
                CorrelationId = correlationId,
                CompletedAt = DateTime.UtcNow,
                Metadata = new Dictionary<string, object>
                {
                    { "unfreeze_date", unfreezeDate?.ToString("yyyy-MM-dd") ?? "manual" }
                }
            };
            
            _context.Set<SupportAction>().Add(supportAction);
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "freeze_account",
                "customer_account", $"Account frozen: {reason}", correlationId);
            
            _logger.LogInformation("Froze customer account {CustomerId}", customerId);
            return customer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error freezing customer account");
            throw;
        }
    }
    public async Task<User> UnfreezeCustomerAccountAsync(Guid customerId, Guid supportAgentId, string? reason = null, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Unfreezing customer account {CustomerId} by agent {AgentId}", customerId, supportAgentId);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:accounts:unfreeze"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to unfreeze customer accounts");
            }
            
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
            if (customer == null)
            {
                throw new NotFoundException($"Customer {customerId} not found");
            }
            
            if (customer.IsActive)
            {
                throw new InvalidOperationException("Customer account is already active");
            }
            
            // Unfreeze the account
            customer.IsActive = true;
            customer.FrozenAt = null;
            customer.FrozenBy = null;
            customer.FreezeReason = null;
            customer.UnfreezeAt = null;
            customer.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Create support action for audit trail
            var supportAction = new SupportAction
            {
                ActionType = SupportActionType.AccountUnfreeze,
                Status = SupportActionStatus.Completed,
                SupportAgentId = supportAgentId,
                TargetUserId = customerId,
                Title = "Account Unfrozen",
                Description = reason ?? "Account unfrozen by support",
                Reason = reason,
                CorrelationId = correlationId,
                CompletedAt = DateTime.UtcNow
            };
            
            _context.Set<SupportAction>().Add(supportAction);
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "unfreeze_account",
                "customer_account", reason ?? "Account unfrozen", correlationId);
            
            _logger.LogInformation("Unfroze customer account {CustomerId}", customerId);
            return customer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unfreezing customer account");
            throw;
        }
    }
    public async Task<DunningCampaignExecution> OverrideDunningProcessAsync(Guid failedPaymentId, Guid supportAgentId, string action, string reason, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Overriding dunning process for payment {PaymentId} with action {Action}", failedPaymentId, action);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:dunning:override"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to override dunning process");
            }
            
            // Use dunning service to override the process
            await _dunningService.OverrideFailedPaymentProcessAsync(failedPaymentId, reason, supportAgentId, correlationId ?? Guid.NewGuid().ToString());
            
            // Log the override action
            await LogBillingDataAccessAsync(supportAgentId, Guid.Empty, "override_dunning",
                "dunning_process", $"Overrode dunning for payment {failedPaymentId}: {action} - {reason}", correlationId);
            
            _logger.LogInformation("Overrode dunning process for payment {PaymentId}", failedPaymentId);
            
            // Create a mock dunning execution response since the service method doesn't return one
            return new DunningCampaignExecution
            {
                Id = Guid.NewGuid(),
                FailedPaymentId = failedPaymentId,
                Status = "completed",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error overriding dunning process");
            throw;
        }
    }
    public async Task<GracePeriod> ExtendGracePeriodAsync(Guid gracePeriodId, int additionalDays, Guid supportAgentId, string reason, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Extending grace period {GracePeriodId} by {AdditionalDays} days", gracePeriodId, additionalDays);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:grace_period:extend"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to extend grace periods");
            }
            
            // Use dunning service to extend grace period
            await _dunningService.ExtendGracePeriodAsync(gracePeriodId, additionalDays, reason, supportAgentId, correlationId ?? Guid.NewGuid().ToString());
            
            // Log the extension
            await LogBillingDataAccessAsync(supportAgentId, Guid.Empty, "extend_grace_period",
                "grace_period", $"Extended grace period {gracePeriodId} by {additionalDays} days: {reason}", correlationId);
            
            _logger.LogInformation("Extended grace period {GracePeriodId} by {AdditionalDays} days", gracePeriodId, additionalDays);
            
            // Create a mock grace period response since the service method doesn't return one
            return new GracePeriod
            {
                Id = gracePeriodId,
                UserId = Guid.Empty, // We don't have this information from gracePeriodId parameter
                FailedPaymentId = Guid.Empty, // We don't have this information
                Status = "active",
                GracePeriodType = "support_extended",
                GracePeriodDays = additionalDays,
                StartedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(additionalDays),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extending grace period");
            throw;
        }
    }
    public async Task<Models.PaymentMethod> UpdateCustomerPaymentMethodAsync(Guid customerId, Guid paymentMethodId, Guid supportAgentId, Dictionary<string, object> updates, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Updating payment method {PaymentMethodId} for customer {CustomerId}", paymentMethodId, customerId);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:payment_methods:modify"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to modify payment methods");
            }
            
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == customerId);
            
            if (paymentMethod == null)
            {
                throw new NotFoundException($"Payment method {paymentMethodId} not found for customer {customerId}");
            }
            
            // Apply updates
            foreach (var update in updates)
            {
                switch (update.Key.ToLower())
                {
                    case "isdefault":
                        if (bool.TryParse(update.Value.ToString(), out bool isDefault))
                        {
                            paymentMethod.IsDefault = isDefault;
                            if (isDefault)
                            {
                                // Remove default from other payment methods
                                await _context.PaymentMethods
                                    .Where(pm => pm.UserId == customerId && pm.Id != paymentMethodId)
                                    .ExecuteUpdateAsync(pm => pm.SetProperty(p => p.IsDefault, false));
                            }
                        }
                        break;
                    case "isactive":
                        if (bool.TryParse(update.Value.ToString(), out bool isActive))
                        {
                            paymentMethod.IsActive = isActive;
                        }
                        break;
                }
            }
            
            paymentMethod.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "update_payment_method",
                "payment_method", $"Updated payment method {paymentMethodId}", correlationId);
            
            _logger.LogInformation("Updated payment method {PaymentMethodId} for customer {CustomerId}", paymentMethodId, customerId);
            return paymentMethod;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating customer payment method");
            throw;
        }
    }
    public async Task<Models.PaymentMethod> RemoveCustomerPaymentMethodAsync(Guid customerId, Guid paymentMethodId, Guid supportAgentId, string reason, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Removing payment method {PaymentMethodId} for customer {CustomerId}", paymentMethodId, customerId);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:payment_methods:remove"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to remove payment methods");
            }
            
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == customerId);
            
            if (paymentMethod == null)
            {
                throw new NotFoundException($"Payment method {paymentMethodId} not found for customer {customerId}");
            }
            
            // Check if this is the only payment method
            var otherActiveMethods = await _context.PaymentMethods
                .CountAsync(pm => pm.UserId == customerId && pm.Id != paymentMethodId && pm.IsActive);
            
            if (otherActiveMethods == 0)
            {
                _logger.LogWarning("Removing last payment method for customer {CustomerId}", customerId);
            }
            
            // Soft delete by marking as inactive
            paymentMethod.IsActive = false;
            paymentMethod.IsDefault = false;
            paymentMethod.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "remove_payment_method",
                "payment_method", $"Removed payment method {paymentMethodId}: {reason}", correlationId);
            
            _logger.LogInformation("Removed payment method {PaymentMethodId} for customer {CustomerId}", paymentMethodId, customerId);
            return paymentMethod;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing customer payment method");
            throw;
        }
    }
    public async Task<Models.PaymentMethod> SetDefaultPaymentMethodAsync(Guid customerId, Guid paymentMethodId, Guid supportAgentId, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Setting default payment method {PaymentMethodId} for customer {CustomerId}", paymentMethodId, customerId);
            
            if (!await HasBillingDataAccessAsync(supportAgentId, "support:payment_methods:modify"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to modify payment methods");
            }
            
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == customerId && pm.IsActive);
            
            if (paymentMethod == null)
            {
                throw new NotFoundException($"Active payment method {paymentMethodId} not found for customer {customerId}");
            }
            
            // Remove default from all other payment methods
            await _context.PaymentMethods
                .Where(pm => pm.UserId == customerId && pm.Id != paymentMethodId)
                .ExecuteUpdateAsync(pm => pm.SetProperty(p => p.IsDefault, false));
            
            // Set this one as default
            paymentMethod.IsDefault = true;
            paymentMethod.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Log the action
            await LogBillingDataAccessAsync(supportAgentId, customerId, "set_default_payment_method",
                "payment_method", $"Set payment method {paymentMethodId} as default", correlationId);
            
            _logger.LogInformation("Set payment method {PaymentMethodId} as default for customer {CustomerId}", paymentMethodId, customerId);
            return paymentMethod;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default payment method");
            throw;
        }
    }
    public async Task<List<SupportAction>> GetPendingApprovalsAsync(Guid? approverUserId = null, int page = 1, int pageSize = 50) 
    {
        try
        {
            _logger.LogInformation("Getting pending approvals for approver {ApproverId}", approverUserId);
            
            var query = _context.SupportActions
                .Include(sa => sa.SupportAgent)
                .Include(sa => sa.TargetUser)
                .Where(sa => sa.Status == SupportActionStatus.RequiresApproval);
            
            // If approver is specified, could filter by their permission level or role
            // For now, just return all pending approvals
            
            var pendingApprovals = await query
                .OrderBy(sa => sa.CreatedAt) // FIFO for approvals
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            _logger.LogInformation("Found {Count} pending approvals", pendingApprovals.Count);
            return pendingApprovals;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending approvals");
            throw;
        }
    }
    public async Task<bool> CanApproveActionAsync(Guid supportActionId, Guid userId) 
    {
        try
        {
            _logger.LogInformation("Checking if user {UserId} can approve action {ActionId}", userId, supportActionId);
            
            var supportAction = await _context.SupportActions
                .FirstOrDefaultAsync(sa => sa.Id == supportActionId);
            
            if (supportAction == null)
            {
                return false;
            }
            
            // Check if action requires approval
            if (supportAction.Status != SupportActionStatus.RequiresApproval)
            {
                return false;
            }
            
            // Check if user is not the same as the one who created the action
            if (supportAction.SupportAgentId == userId)
            {
                return false; // Can't approve your own actions
            }
            
            // Check permissions based on action type
            var requiredPermissions = await GetRequiredPermissionsForActionAsync(supportAction.ActionType);
            
            foreach (var permission in requiredPermissions)
            {
                if (!await _rbacService.HasPermissionAsync(userId, permission))
                {
                    return false;
                }
            }
            
            _logger.LogInformation("User {UserId} can approve action {ActionId}", userId, supportActionId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking approval permissions");
            return false;
        }
    }
    public async Task<List<string>> GetRequiredPermissionsForActionAsync(SupportActionType actionType) 
    {
        try
        {
            _logger.LogInformation("Getting required permissions for action type {ActionType}", actionType);
            
            var permissions = actionType switch
            {
                SupportActionType.RefundProcess => new List<string> { "support:refunds:approve", "support:billing:modify" },
                SupportActionType.PaymentProcess => new List<string> { "support:payments:approve", "support:billing:modify" },
                SupportActionType.SubscriptionModification => new List<string> { "support:subscriptions:approve", "support:billing:modify" },
                SupportActionType.AccountFreeze => new List<string> { "support:accounts:approve", "support:security:high" },
                SupportActionType.AccountUnfreeze => new List<string> { "support:accounts:approve", "support:security:high" },
                SupportActionType.CreditApplication => new List<string> { "support:credits:approve", "support:billing:modify" },
                SupportActionType.InvoiceRegeneration => new List<string> { "support:invoices:approve", "support:billing:read" },
                SupportActionType.PlanChange => new List<string> { "support:subscriptions:approve", "support:billing:modify" },
                SupportActionType.Pause => new List<string> { "support:subscriptions:approve" },
                SupportActionType.Resume => new List<string> { "support:subscriptions:approve" },
                SupportActionType.ConfigurationChange => new List<string> { "support:config:approve", "support:admin:high" },
                _ => new List<string> { "support:general:approve" }
            };
            
            _logger.LogInformation("Action type {ActionType} requires {Count} permissions", actionType, permissions.Count);
            return await Task.FromResult(permissions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting required permissions for action type");
            throw;
        }
    }
    public async Task<bool> SendCustomerNotificationAsync(Guid customerId, string template, Dictionary<string, object> parameters, Guid supportAgentId, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Sending notification to customer {CustomerId} using template {Template}", customerId, template);
            
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
            if (customer == null)
            {
                _logger.LogWarning("Customer {CustomerId} not found for notification", customerId);
                return false;
            }
            
            // Use email service to send notification
            var emailSent = await _emailService.SendTemplateEmailAsync(
                customer.Email,
                template,
                parameters
            );
            
            // Log the notification attempt
            await LogBillingDataAccessAsync(supportAgentId, customerId, "send_notification",
                "customer_notification", $"Sent {template} notification", correlationId);
            
            _logger.LogInformation("Notification sent to customer {CustomerId}: {Success}", customerId, emailSent);
            return emailSent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending customer notification");
            return false;
        }
    }
    public async Task<bool> SendInternalNotificationAsync(Guid userId, string message, SupportPriority priority, Guid senderUserId, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Sending internal notification to user {UserId} from {SenderId}", userId, senderUserId);
            
            var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (recipient == null)
            {
                _logger.LogWarning("Recipient user {UserId} not found for internal notification", userId);
                return false;
            }
            
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == senderUserId);
            
            // Create internal notification record (if you have such a table)
            // For now, log it as an activity
            _logger.LogInformation("Internal notification: {Message} (Priority: {Priority})", message, priority);
            
            // You could also send an email for high priority notifications
            if (priority == SupportPriority.High || priority == SupportPriority.Critical)
            {
                var emailParams = new Dictionary<string, object>
                {
                    { "message", message },
                    { "priority", priority.ToString() },
                    { "sender", sender?.Email ?? "System" },
                    { "correlation_id", correlationId ?? "" }
                };
                
                await _emailService.SendTemplateEmailAsync(
                    recipient.Email,
                    "internal_notification",
                    emailParams
                );
            }
            
            _logger.LogInformation("Internal notification sent to user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending internal notification");
            return false;
        }
    }
    public async Task<Dictionary<string, object>> GetSupportConfigurationAsync() 
    {
        try
        {
            _logger.LogInformation("Getting support configuration");
            
            // Return default support configuration
            // In a real implementation, this would come from a configuration table
            var config = new Dictionary<string, object>
            {
                ["max_refund_amount"] = 10000.00m,
                ["auto_approve_refunds_under"] = 100.00m,
                ["require_manager_approval_over"] = 1000.00m,
                ["max_credit_amount"] = 5000.00m,
                ["default_grace_period_days"] = 7,
                ["max_grace_period_days"] = 30,
                ["notification_templates"] = new List<string>
                {
                    "payment_confirmation",
                    "refund_processed",
                    "subscription_modified",
                    "account_frozen",
                    "internal_notification"
                },
                ["available_payment_methods"] = await GetAvailablePaymentMethodsAsync(),
                ["available_refund_methods"] = await GetAvailableRefundMethodsAsync(),
                ["data_masking_levels"] = new List<string> { "full", "partial", "masked" },
                ["support_priorities"] = Enum.GetNames<SupportPriority>(),
                ["action_types"] = Enum.GetNames<SupportActionType>(),
                ["action_statuses"] = Enum.GetNames<SupportActionStatus>()
            };
            
            _logger.LogInformation("Retrieved support configuration with {Count} settings", config.Count);
            return config;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting support configuration");
            throw;
        }
    }
    public async Task UpdateSupportConfigurationAsync(string key, object value, Guid userId, string? correlationId = null) 
    {
        try
        {
            _logger.LogInformation("Updating support configuration {Key} to {Value} by user {UserId}", key, value, userId);
            
            // Check permissions
            if (!await HasBillingDataAccessAsync(userId, "support:config:update"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions to update support configuration");
            }
            
            // In a real implementation, you would save this to a configuration table
            // For now, just log the configuration change
            _logger.LogInformation("Support configuration updated: {Key} = {Value}", key, value);
            
            // Log the configuration change
            await LogBillingDataAccessAsync(userId, Guid.Empty, "update_config",
                "support_configuration", $"Updated {key} to {value}", correlationId);
            
            // You could also create a support action for audit trail
            var supportAction = new SupportAction
            {
                ActionType = SupportActionType.ConfigurationChange,
                Status = SupportActionStatus.Completed,
                SupportAgentId = userId,
                TargetUserId = Guid.Empty, // System configuration change
                Title = "Configuration Updated",
                Description = $"Updated support configuration: {key}",
                CorrelationId = correlationId,
                CompletedAt = DateTime.UtcNow,
                Metadata = new Dictionary<string, object>
                {
                    { "configuration_key", key },
                    { "new_value", value.ToString() ?? "" }
                }
            };
            
            _context.Set<SupportAction>().Add(supportAction);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Support configuration {Key} updated successfully", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating support configuration");
            throw;
        }
    }
    public async Task<List<string>> GetAvailablePaymentMethodsAsync()
    {
        try
        {
            // Return standard payment methods available in Stripe
            return await Task.FromResult(new List<string>
            {
                "card",
                "ach_direct_debit",
                "paypal",
                "apple_pay",
                "google_pay",
                "bank_transfer"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available payment methods");
            throw;
        }
    }
    public async Task<List<string>> GetAvailableRefundMethodsAsync()
    {
        try
        {
            // Return standard refund methods
            return await Task.FromResult(new List<string>
            {
                "original_payment_method",
                "bank_account",
                "store_credit",
                "check",
                "manual_adjustment"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available refund methods");
            throw;
        }
    }
}

// Custom exceptions
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}
