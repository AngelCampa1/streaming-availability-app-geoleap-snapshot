using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

public class Invoice
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? StripeCustomerId { get; set; }
    public StripeCustomer? StripeCustomer { get; set; }

    public Guid? PaymentTransactionId { get; set; }
    public PaymentTransaction? PaymentTransaction { get; set; }

    public Guid? SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }

    [MaxLength(100)]
    public string StripeInvoiceId { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // draft, open, paid, void, uncollectible

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; } = 0;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public DateTime? PaidAt { get; set; }

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Notes { get; set; } = string.Empty;

    public Guid? BillingAddressId { get; set; }
    public BillingAddress? BillingAddress { get; set; }

    [MaxLength(50)]
    public string InvoiceTemplate { get; set; } = "standard";

    [MaxLength(5)]
    public string Language { get; set; } = "en";

    public bool IsPdfGenerated { get; set; } = false;
    public DateTime? PdfGeneratedAt { get; set; }
    public bool IsEmailSent { get; set; } = false;
    public DateTime? EmailSentAt { get; set; }

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<InvoiceLineItem> LineItems { get; set; } = new();
    public List<TaxCalculation> TaxCalculations { get; set; } = new();
    public List<InvoiceDelivery> Deliveries { get; set; } = new();
}

public class InvoiceLineItem
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string ItemType { get; set; } = string.Empty; // subscription, usage, discount, tax

    [Required]
    [MaxLength(255)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public int Quantity { get; set; } = 1;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    public DateTime? ServicePeriodStart { get; set; }
    public DateTime? ServicePeriodEnd { get; set; }

    [MaxLength(100)]
    public string StripePriceId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string StripeProductId { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class BillingAddress
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [MaxLength(255)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string AddressLine1 { get; set; } = string.Empty;

    [MaxLength(255)]
    public string AddressLine2 { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(100)]
    public string State { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string PostalCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(2)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(50)]
    public string TaxId { get; set; } = string.Empty; // VAT number, tax ID, etc.

    [MaxLength(100)]
    public string TaxIdType { get; set; } = string.Empty; // vat, ssn, ein, etc.

    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public List<Invoice> Invoices { get; set; } = new();
}

public class TaxCalculation
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string TaxType { get; set; } = string.Empty; // vat, sales_tax, gst, etc.

    [Required]
    [MaxLength(100)]
    public string TaxName { get; set; } = string.Empty; // "VAT", "Sales Tax", "GST"

    [Required]
    [Column(TypeName = "decimal(18,4)")]
    public decimal Rate { get; set; } // Tax rate as decimal (0.20 for 20%)

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxableAmount { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [MaxLength(2)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(10)]
    public string StateProvince { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Jurisdiction { get; set; } = string.Empty;

    [MaxLength(100)]
    public string TaxServiceProvider { get; set; } = string.Empty; // stripe_tax, taxjar, etc.

    [MaxLength(100)]
    public string ExternalTaxId { get; set; } = string.Empty;

    public Dictionary<string, object> TaxDetails { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class InvoiceDelivery
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string DeliveryMethod { get; set; } = string.Empty; // email, download, webhook

    [Required]
    [MaxLength(255)]
    public string DeliveryAddress { get; set; } = string.Empty; // email address

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // pending, sent, delivered, failed, bounced

    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? FailedAt { get; set; }

    [MaxLength(1000)]
    public string FailureReason { get; set; } = string.Empty;

    public int AttemptCount { get; set; } = 0;
    public DateTime? NextRetryAt { get; set; }

    [MaxLength(100)]
    public string MessageId { get; set; } = string.Empty; // Email service message ID

    [MaxLength(100)]
    public string DeliveryTrackingId { get; set; } = string.Empty;

    public Dictionary<string, object> DeliveryMetadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class InvoiceTemplate
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string TemplateType { get; set; } = string.Empty; // standard, business, premium

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public string HtmlTemplate { get; set; } = string.Empty;

    [Required]
    public string CssStyles { get; set; } = string.Empty;

    [MaxLength(5)]
    public string Language { get; set; } = "en";

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    [MaxLength(100)]
    public string CreatedBy { get; set; } = string.Empty;

    [MaxLength(100)]
    public string UpdatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// DTOs for API responses
public class InvoiceDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public decimal Amount { get; set; } // Alias for Total for backwards compatibility
    public string Currency { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Description { get; set; } = string.Empty;
    public BillingAddressDto? BillingAddress { get; set; }
    public List<InvoiceLineItemDto> LineItems { get; set; } = new();
    public List<TaxCalculationDto> TaxCalculations { get; set; } = new();
    public bool IsPdfGenerated { get; set; }
    public bool IsEmailSent { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class InvoiceLineItemDto
{
    public Guid Id { get; set; }
    public string ItemType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public DateTime? ServicePeriodStart { get; set; }
    public DateTime? ServicePeriodEnd { get; set; }
}

public class TaxCalculationDto
{
    public Guid Id { get; set; }
    public string TaxType { get; set; } = string.Empty;
    public string TaxName { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public string Country { get; set; } = string.Empty;
    public string StateProvince { get; set; } = string.Empty;
    public string Jurisdiction { get; set; } = string.Empty;
}

public class BillingAddressDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string AddressLine2 { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty;
    public string TaxIdType { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

// Request DTOs
public class CreateBillingAddressRequest
{
    [MaxLength(255)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string AddressLine1 { get; set; } = string.Empty;

    [MaxLength(255)]
    public string AddressLine2 { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(100)]
    public string State { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string PostalCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(2)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(50)]
    public string TaxId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string TaxIdType { get; set; } = string.Empty;

    public bool SetAsDefault { get; set; } = false;
}

public class InvoiceFilterRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Status { get; set; }
    public string? Currency { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "IssueDate";
    public string SortOrder { get; set; } = "desc";
}

public class BulkInvoiceRequest
{
    [Required]
    public List<Guid> InvoiceIds { get; set; } = new();

    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty; // resend_email, regenerate_pdf, mark_paid
}

public class InvoiceAnalyticsDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalInvoices { get; set; }
    public int PaidInvoices { get; set; }
    public int UnpaidInvoices { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
    public Dictionary<string, decimal> RevenueByMonth { get; set; } = new();
    public Dictionary<string, int> InvoicesByStatus { get; set; } = new();
    public Dictionary<string, decimal> TaxByJurisdiction { get; set; } = new();
}