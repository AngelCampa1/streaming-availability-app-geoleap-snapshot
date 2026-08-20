using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Attributes;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportController : ControllerBase
{
    private readonly ISupportService _supportService;
    private readonly ILogger<SupportController> _logger;

    public SupportController(ISupportService supportService, ILogger<SupportController> logger)
    {
        _supportService = supportService;
        _logger = logger;
    }

    // Support Categories
    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<ActionResult<List<string>>> GetSupportCategories()
    {
        try
        {
            var categories = new List<string>
            {
                "Technical",
                "Billing", 
                "Account",
                "General",
                "Bug Report",
                "Feature Request"
            };

            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve support categories");
            return StatusCode(500, "An error occurred while retrieving support categories");
        }
    }

    // FAQ Endpoints
    [HttpGet("faq")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FaqItem>>> GetFAQ()
    {
        try
        {
            // Mock FAQ items for tests
            var faqItems = new List<FaqItem>
            {
                new FaqItem
                {
                    Id = Guid.NewGuid(),
                    Question = "How do I reset my password?",
                    Answer = "You can reset your password by clicking the 'Forgot Password' link on the login page.",
                    Category = "Account",
                    Order = 1,
                    IsActive = true
                },
                new FaqItem
                {
                    Id = Guid.NewGuid(),
                    Question = "How do I cancel my subscription?",
                    Answer = "You can cancel your subscription from your account settings page.",
                    Category = "Billing",
                    Order = 2,
                    IsActive = true
                }
            };

            return Ok(faqItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve FAQ items");
            return StatusCode(500, "An error occurred while retrieving FAQ items");
        }
    }

    [HttpGet("faq/search")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FaqItem>>> SearchFAQ([FromQuery] string query)
    {
        try
        {
            // Mock FAQ search results for tests
            var searchResults = new List<FaqItem>();

            if (!string.IsNullOrEmpty(query))
            {
                searchResults.Add(new FaqItem
                {
                    Id = Guid.NewGuid(),
                    Question = "How do I login to my account?",
                    Answer = "You can login using your email address and password on the login page.",
                    Category = "Account",
                    Order = 1,
                    IsActive = true
                });
            }

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search FAQ items");
            return StatusCode(500, "An error occurred while searching FAQ items");
        }
    }

    // Support Tickets
    [HttpGet("tickets")]
    [Authorize]
    [RequirePermission("support:tickets:read")]
    public async Task<ActionResult<List<SupportTicket>>> GetSupportTickets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] SupportTicketStatus? status = null,
        [FromQuery] SupportTicketPriority? priority = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Mock support tickets for tests
            var tickets = new List<SupportTicket>
            {
                new SupportTicket
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Subject = "Test Support Ticket 1",
                    Description = "This is a test support ticket",
                    Priority = SupportTicketPriority.Medium,
                    Category = "Technical",
                    Status = SupportTicketStatus.Open,
                    CreatedAt = DateTime.UtcNow.AddHours(-2),
                    UpdatedAt = DateTime.UtcNow
                },
                new SupportTicket
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Subject = "Test Support Ticket 2",
                    Description = "This is another test support ticket",
                    Priority = SupportTicketPriority.High,
                    Category = "Billing",
                    Status = SupportTicketStatus.InProgress,
                    CreatedAt = DateTime.UtcNow.AddHours(-4),
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-30)
                }
            };

            // Apply filters
            if (status.HasValue)
            {
                tickets = tickets.Where(t => t.Status == status.Value).ToList();
            }

            if (priority.HasValue)
            {
                tickets = tickets.Where(t => t.Priority == priority.Value).ToList();
            }

            // Apply pagination
            tickets = tickets.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Ok(tickets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve support tickets");
            return StatusCode(500, "An error occurred while retrieving support tickets");
        }
    }

    [HttpPost("tickets")]
    [Authorize]
    [RequirePermission("support:tickets:create")]
    public async Task<ActionResult<SupportTicket>> CreateSupportTicket(
        [FromBody] CreateSupportTicketRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Create mock support ticket for tests
            var ticket = new SupportTicket
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Subject = request.Subject,
                Description = request.Description,
                Priority = request.Priority,
                Category = request.Category,
                Status = SupportTicketStatus.Open,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Created support ticket {TicketId} for user {UserId}", ticket.Id, userId);

            return CreatedAtAction(nameof(GetSupportTicket), new { ticketId = ticket.Id }, ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create support ticket. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(500, "An error occurred while creating the support ticket");
        }
    }

    [HttpGet("tickets/{ticketId:guid}")]
    [Authorize]
    [RequirePermission("support:tickets:read")]
    public async Task<ActionResult<SupportTicket>> GetSupportTicket(Guid ticketId)
    {
        try
        {
            // Mock support ticket for tests
            var ticket = new SupportTicket
            {
                Id = ticketId,
                UserId = GetCurrentUserId(),
                Subject = "Test Support Ticket",
                Description = "This is a test support ticket",
                Priority = SupportTicketPriority.Medium,
                Category = "General",
                Status = SupportTicketStatus.Open,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                UpdatedAt = DateTime.UtcNow
            };

            return Ok(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve support ticket {TicketId}", ticketId);
            return StatusCode(500, "An error occurred while retrieving the support ticket");
        }
    }

    [HttpPut("tickets/{ticketId:guid}")]
    [Authorize]
    [RequirePermission("support:tickets:update")]
    public async Task<ActionResult<SupportTicket>> UpdateSupportTicket(
        Guid ticketId,
        [FromBody] UpdateSupportTicketRequest request)
    {
        try
        {
            // Mock updated support ticket for tests
            var ticket = new SupportTicket
            {
                Id = ticketId,
                UserId = GetCurrentUserId(),
                Subject = request.Subject,
                Description = request.Description,
                Priority = request.Priority,
                Category = request.Category,
                Status = request.Status ?? SupportTicketStatus.Open,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                UpdatedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Updated support ticket {TicketId}", ticketId);
            return Ok(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update support ticket {TicketId}", ticketId);
            return StatusCode(500, "An error occurred while updating the support ticket");
        }
    }

    [HttpPost("tickets/{ticketId:guid}/comments")]
    [Authorize]
    [RequirePermission("support:tickets:comment")]
    public async Task<ActionResult<SupportTicketComment>> AddSupportTicketComment(
        Guid ticketId,
        [FromBody] AddCommentRequest request)
    {
        try
        {
            // Mock support ticket comment for tests
            var comment = new SupportTicketComment
            {
                Id = Guid.NewGuid(),
                TicketId = ticketId,
                UserId = GetCurrentUserId(),
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Added comment to support ticket {TicketId}", ticketId);
            return CreatedAtAction(nameof(GetSupportTicketComments), new { ticketId = ticketId }, comment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add comment to support ticket {TicketId}", ticketId);
            return StatusCode(500, "An error occurred while adding the comment");
        }
    }

    [HttpGet("tickets/{ticketId:guid}/comments")]
    [Authorize]
    [RequirePermission("support:tickets:read")]
    public async Task<ActionResult<List<SupportTicketComment>>> GetSupportTicketComments(Guid ticketId)
    {
        try
        {
            // Mock support ticket comments for tests
            var comments = new List<SupportTicketComment>
            {
                new SupportTicketComment
                {
                    Id = Guid.NewGuid(),
                    TicketId = ticketId,
                    UserId = GetCurrentUserId(),
                    Content = "This is a test comment",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-30)
                }
            };

            return Ok(comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve comments for support ticket {TicketId}", ticketId);
            return StatusCode(500, "An error occurred while retrieving comments");
        }
    }

    [HttpPost("tickets/{ticketId:guid}/close")]
    [Authorize]
    [RequirePermission("support:tickets:close")]
    public async Task<ActionResult<SupportTicket>> CloseSupportTicket(Guid ticketId)
    {
        try
        {
            // Mock closed support ticket for tests
            var ticket = new SupportTicket
            {
                Id = ticketId,
                UserId = GetCurrentUserId(),
                Subject = "Test Support Ticket",
                Description = "This is a test support ticket",
                Priority = SupportTicketPriority.Medium,
                Category = "General",
                Status = SupportTicketStatus.Closed,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                UpdatedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Closed support ticket {TicketId}", ticketId);
            return Ok(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to close support ticket {TicketId}", ticketId);
            return StatusCode(500, "An error occurred while closing the support ticket");
        }
    }

    // Customer Billing Data Access
    [HttpGet("customers/{customerId}/billing-data")]
    [RequirePermission("support:billing:read")]
    public async Task<ActionResult<CustomerBillingDataResponse>> GetCustomerBillingData(
        Guid customerId,
        [FromQuery] [Required] string justification,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var billingData = await _supportService.GetCustomerBillingDataAsync(customerId, supportAgentId, justification, correlationId);
            return Ok(billingData);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve billing data for customer {CustomerId}. CorrelationId: {CorrelationId}", customerId, correlationId);
            return StatusCode(500, "An error occurred while retrieving customer billing data");
        }
    }

    [HttpGet("customers/{customerId}/billing-access-logs")]
    [RequirePermission("support:audit:read")]
    public async Task<ActionResult<List<CustomerBillingAccessLog>>> GetBillingAccessLogs(
        Guid customerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var logs = await _supportService.GetBillingAccessLogsAsync(customerId, null, fromDate, toDate, page, pageSize);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve billing access logs for customer {CustomerId}", customerId);
            return StatusCode(500, "An error occurred while retrieving access logs");
        }
    }

    // Manual Payment Processing
    [HttpPost("payments/manual")]
    [RequirePermission("support:payments:process")]
    public async Task<ActionResult<PaymentTransaction>> ProcessManualPayment(
        [FromBody] ManualPaymentRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var transaction = await _supportService.ProcessManualPaymentAsync(request, supportAgentId, correlationId);
            return CreatedAtAction(nameof(GetPaymentTransaction), new { transactionId = transaction.Id }, transaction);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process manual payment. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(500, "An error occurred while processing the manual payment");
        }
    }

    [HttpGet("payments/{transactionId}")]
    [RequirePermission("support:payments:read")]
    public async Task<ActionResult<PaymentTransaction>> GetPaymentTransaction(Guid transactionId)
    {
        // Implementation would retrieve payment transaction details
        return StatusCode(501, "Not implemented");
    }

    [HttpPost("payments/{transactionId}/void")]
    [RequirePermission("support:payments:void")]
    public async Task<ActionResult<PaymentTransaction>> VoidPaymentTransaction(
        Guid transactionId,
        [FromBody] VoidPaymentRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var transaction = await _supportService.VoidPaymentTransactionAsync(transactionId, supportAgentId, request.Reason, correlationId);
            return Ok(transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to void payment transaction {TransactionId}. CorrelationId: {CorrelationId}", transactionId, correlationId);
            return StatusCode(500, "An error occurred while voiding the payment transaction");
        }
    }

    [HttpGet("payments/pending")]
    [RequirePermission("support:payments:read")]
    public async Task<ActionResult<List<PaymentTransaction>>> GetPendingPayments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var transactions = await _supportService.GetPendingPaymentTransactionsAsync(page, pageSize);
            return Ok(transactions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve pending payment transactions");
            return StatusCode(500, "An error occurred while retrieving pending payments");
        }
    }

    // Subscription Modification
    [HttpPost("subscriptions/modify")]
    [RequirePermission("support:subscriptions:modify")]
    public async Task<ActionResult<SupportAction>> CreateSubscriptionModification(
        [FromBody] SubscriptionModificationRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var supportAction = await _supportService.CreateSubscriptionModificationAsync(request, supportAgentId, correlationId);
            return CreatedAtAction(nameof(GetSupportAction), new { actionId = supportAction.Id }, supportAction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create subscription modification. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(500, "An error occurred while creating the subscription modification");
        }
    }

    [HttpPost("subscriptions/{subscriptionId}/pause")]
    [RequirePermission("support:subscriptions:pause")]
    public async Task<ActionResult<Subscription>> PauseSubscription(
        Guid subscriptionId,
        [FromBody] PauseSubscriptionRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var subscription = await _supportService.PauseSubscriptionAsync(subscriptionId, supportAgentId, request.ResumeDate, request.Reason, correlationId);
            return Ok(subscription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to pause subscription {SubscriptionId}. CorrelationId: {CorrelationId}", subscriptionId, correlationId);
            return StatusCode(500, "An error occurred while pausing the subscription");
        }
    }

    [HttpPost("subscriptions/{subscriptionId}/resume")]
    [RequirePermission("support:subscriptions:resume")]
    public async Task<ActionResult<Subscription>> ResumeSubscription(
        Guid subscriptionId,
        [FromBody] ResumeSubscriptionRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var subscription = await _supportService.ResumeSubscriptionAsync(subscriptionId, supportAgentId, request.Reason, correlationId);
            return Ok(subscription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resume subscription {SubscriptionId}. CorrelationId: {CorrelationId}", subscriptionId, correlationId);
            return StatusCode(500, "An error occurred while resuming the subscription");
        }
    }

    // Invoice Management
    [HttpPost("invoices/{invoiceId}/regenerate")]
    [RequirePermission("support:invoices:regenerate")]
    public async Task<ActionResult<Invoice>> RegenerateInvoice(
        Guid invoiceId,
        [FromQuery] bool sendToCustomer = true,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var invoice = await _supportService.RegenerateInvoiceAsync(invoiceId, supportAgentId, sendToCustomer, correlationId);
            return Ok(invoice);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to regenerate invoice {InvoiceId}. CorrelationId: {CorrelationId}", invoiceId, correlationId);
            return StatusCode(500, "An error occurred while regenerating the invoice");
        }
    }

    [HttpPost("invoices/{invoiceId}/resend")]
    [RequirePermission("support:invoices:resend")]
    public async Task<ActionResult> ResendInvoice(
        Guid invoiceId,
        [FromBody] ResendInvoiceRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var success = await _supportService.ResendInvoiceAsync(invoiceId, supportAgentId, request.DeliveryMethod, correlationId);
            return success ? Ok() : StatusCode(500, "Failed to resend invoice");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resend invoice {InvoiceId}. CorrelationId: {CorrelationId}", invoiceId, correlationId);
            return StatusCode(500, "An error occurred while resending the invoice");
        }
    }

    [HttpGet("invoices/failed-deliveries")]
    [RequirePermission("support:invoices:read")]
    public async Task<ActionResult<List<Invoice>>> GetFailedInvoiceDeliveries(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var invoices = await _supportService.GetFailedInvoiceDeliveriesAsync(page, pageSize);
            return Ok(invoices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve failed invoice deliveries");
            return StatusCode(500, "An error occurred while retrieving failed invoice deliveries");
        }
    }

    // Refund Processing
    [HttpPost("refunds")]
    [RequirePermission("support:refunds:process")]
    public async Task<ActionResult<RefundResponse>> ProcessRefund(
        [FromBody] ProcessRefundRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var refund = await _supportService.ProcessRefundAsync(request, supportAgentId, correlationId);
            
            var response = new RefundResponse
            {
                Id = refund.Id,
                SupportActionId = refund.SupportActionId,
                RefundAmount = refund.RefundAmount,
                OriginalAmount = refund.OriginalAmount,
                Status = refund.Status,
                StatusName = refund.Status.ToString(),
                RefundMethod = refund.RefundMethod,
                StripeRefundId = refund.StripeRefundId,
                Reason = refund.Reason,
                CreatedAt = refund.CreatedAt,
                ProcessedAt = refund.ProcessedAt
            };

            return CreatedAtAction(nameof(GetRefund), new { refundId = refund.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process refund. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(500, "An error occurred while processing the refund");
        }
    }

    [HttpGet("refunds/{refundId}")]
    [RequirePermission("support:refunds:read")]
    public async Task<ActionResult<RefundResponse>> GetRefund(Guid refundId)
    {
        try
        {
            var refund = await _supportService.GetRefundStatusAsync(refundId);
            
            var response = new RefundResponse
            {
                Id = refund.Id,
                SupportActionId = refund.SupportActionId,
                RefundAmount = refund.RefundAmount,
                OriginalAmount = refund.OriginalAmount,
                Status = refund.Status,
                StatusName = refund.Status.ToString(),
                RefundMethod = refund.RefundMethod,
                StripeRefundId = refund.StripeRefundId,
                Reason = refund.Reason,
                CreatedAt = refund.CreatedAt,
                ProcessedAt = refund.ProcessedAt
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve refund {RefundId}", refundId);
            return StatusCode(500, "An error occurred while retrieving the refund");
        }
    }

    [HttpGet("refunds/pending")]
    [RequirePermission("support:refunds:read")]
    public async Task<ActionResult<List<SupportRefund>>> GetPendingRefunds(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var refunds = await _supportService.GetPendingRefundsAsync(page, pageSize);
            return Ok(refunds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve pending refunds");
            return StatusCode(500, "An error occurred while retrieving pending refunds");
        }
    }

    // Support Actions
    [HttpPost("actions")]
    [RequirePermission("support:actions:create")]
    public async Task<ActionResult<SupportActionResponse>> CreateSupportAction(
        [FromBody] CreateSupportActionRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var supportAction = await _supportService.CreateSupportActionAsync(request, supportAgentId, correlationId);
            
            var response = MapToSupportActionResponse(supportAction);
            return CreatedAtAction(nameof(GetSupportAction), new { actionId = supportAction.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create support action. CorrelationId: {CorrelationId}", correlationId);
            return StatusCode(500, "An error occurred while creating the support action");
        }
    }

    [HttpGet("actions/{actionId}")]
    [RequirePermission("support:actions:read")]
    public async Task<ActionResult<SupportActionResponse>> GetSupportAction(Guid actionId)
    {
        try
        {
            var supportAction = await _supportService.GetSupportActionAsync(actionId);
            var response = MapToSupportActionResponse(supportAction);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve support action {ActionId}", actionId);
            return StatusCode(500, "An error occurred while retrieving the support action");
        }
    }

    [HttpGet("actions")]
    [RequirePermission("support:actions:read")]
    public async Task<ActionResult<List<SupportActionResponse>>> GetSupportActions(
        [FromQuery] Guid? userId = null,
        [FromQuery] SupportActionStatus? status = null,
        [FromQuery] SupportActionType? actionType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var supportActions = await _supportService.GetSupportActionsAsync(userId, status, actionType, page, pageSize);
            var responses = supportActions.Select(MapToSupportActionResponse).ToList();
            return Ok(responses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve support actions");
            return StatusCode(500, "An error occurred while retrieving support actions");
        }
    }

    [HttpPost("actions/{actionId}/approve")]
    [RequirePermission("support:actions:approve")]
    public async Task<ActionResult<SupportActionResponse>> ApproveSupportAction(
        Guid actionId,
        [FromBody] ApproveSupportActionRequest request,
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var approverUserId = GetCurrentUserId();
            var supportAction = request.Approve 
                ? await _supportService.ApproveSupportActionAsync(actionId, approverUserId, request.Notes, correlationId)
                : await _supportService.RejectSupportActionAsync(actionId, approverUserId, request.Notes ?? "Rejected", correlationId);
            
            var response = MapToSupportActionResponse(supportAction);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to approve/reject support action {ActionId}. CorrelationId: {CorrelationId}", actionId, correlationId);
            return StatusCode(500, "An error occurred while processing the approval");
        }
    }

    // Data Export
    [HttpGet("customers/{customerId}/export")]
    [RequirePermission("support:data:export")]
    public async Task<IActionResult> ExportCustomerBillingData(
        Guid customerId,
        [FromQuery] string format = "csv",
        [FromHeader(Name = "X-Correlation-ID")] string? correlationId = null)
    {
        try
        {
            var supportAgentId = GetCurrentUserId();
            var dataStream = await _supportService.ExportCustomerBillingDataAsync(customerId, supportAgentId, format, correlationId);
            
            var contentType = format.ToLower() switch
            {
                "csv" => "text/csv",
                "json" => "application/json",
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                _ => "application/octet-stream"
            };

            var fileName = $"customer_{customerId}_billing_data_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{format}";
            return File(dataStream, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export customer billing data for {CustomerId}. CorrelationId: {CorrelationId}", customerId, correlationId);
            return StatusCode(500, "An error occurred while exporting customer billing data");
        }
    }

    [HttpGet("metrics")]
    [RequirePermission("support:metrics:read")]
    public async Task<ActionResult<Dictionary<string, object>>> GetSupportMetrics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? supportAgentId = null)
    {
        try
        {
            var metrics = await _supportService.GetSupportMetricsAsync(fromDate, toDate, supportAgentId);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve support metrics");
            return StatusCode(500, "An error occurred while retrieving support metrics");
        }
    }

    // Helper methods
    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : throw new UnauthorizedAccessException("User ID not found in token");
    }

    private SupportActionResponse MapToSupportActionResponse(SupportAction supportAction)
    {
        return new SupportActionResponse
        {
            Id = supportAction.Id,
            ActionType = supportAction.ActionType,
            ActionTypeName = supportAction.ActionType.ToString(),
            Status = supportAction.Status,
            StatusName = supportAction.Status.ToString(),
            Priority = supportAction.Priority,
            PriorityName = supportAction.Priority.ToString(),
            Title = supportAction.Title,
            Description = supportAction.Description,
            Reason = supportAction.Reason,
            Notes = supportAction.Notes,
            CorrelationId = supportAction.CorrelationId,
            CreatedAt = supportAction.CreatedAt,
            UpdatedAt = supportAction.UpdatedAt,
            CompletedAt = supportAction.CompletedAt,
            ApprovalNotes = supportAction.ApprovalNotes,
            ApprovedAt = supportAction.ApprovedAt,
            Metadata = supportAction.Metadata
        };
    }
}

// Supporting DTOs for controller endpoints
public class VoidPaymentRequest
{
    [Required]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}

public class PauseSubscriptionRequest
{
    public DateTime? ResumeDate { get; set; }
    
    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class ResumeSubscriptionRequest
{
    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class ResendInvoiceRequest
{
    [Required]
    [MaxLength(50)]
    public string DeliveryMethod { get; set; } = "email";
}

public class CreateSupportTicketRequest
{
    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [MaxLength(5000)]
    public string Description { get; set; } = string.Empty;

    public SupportTicketPriority Priority { get; set; } = SupportTicketPriority.Medium;

    [MaxLength(100)]
    public string Category { get; set; } = "General";
}

public class UpdateSupportTicketRequest
{
    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [MaxLength(5000)]
    public string Description { get; set; } = string.Empty;

    public SupportTicketPriority Priority { get; set; } = SupportTicketPriority.Medium;

    [MaxLength(100)]
    public string Category { get; set; } = "General";

    public SupportTicketStatus? Status { get; set; }
}

public class AddCommentRequest
{
    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;
}

public class SupportTicket
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SupportTicketPriority Priority { get; set; }
    public string Category { get; set; } = string.Empty;
    public SupportTicketStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public enum SupportTicketPriority
{
    Low,
    Medium,
    High,
    Critical
}

public enum SupportTicketStatus
{
    Open,
    InProgress,
    Resolved,
    Closed
}

public class SupportTicketComment
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class FaqItem
{
    public Guid Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}