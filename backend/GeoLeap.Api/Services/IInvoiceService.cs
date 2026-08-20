using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IInvoiceService
{
    // Invoice Generation
    Task<InvoiceDto> GenerateInvoiceAsync(Guid paymentTransactionId, string correlationId);
    Task<InvoiceDto> GenerateSubscriptionInvoiceAsync(Guid subscriptionId, DateTime periodStart, DateTime periodEnd, string correlationId);
    Task<bool> RegenerateInvoiceAsync(Guid invoiceId, string correlationId);

    // Invoice Management
    Task<InvoiceDto?> GetInvoiceAsync(Guid invoiceId, Guid userId);
    Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber, Guid userId);
    Task<List<InvoiceDto>> GetUserInvoicesAsync(Guid userId, InvoiceFilterRequest? filter = null);
    Task<InvoiceAnalyticsDto> GetInvoiceAnalyticsAsync(Guid userId, DateTime? startDate = null, DateTime? endDate = null);

    // PDF Generation
    Task<byte[]> GenerateInvoicePdfAsync(Guid invoiceId, string correlationId);
    Task<bool> RegenerateInvoicePdfAsync(Guid invoiceId, string correlationId);
    Task<string> GetInvoicePdfUrlAsync(Guid invoiceId, Guid userId);

    // Invoice Status Management
    Task<bool> MarkInvoiceAsPaidAsync(Guid invoiceId, Guid paymentTransactionId, string correlationId);
    Task<bool> VoidInvoiceAsync(Guid invoiceId, string reason, string correlationId);
    Task<bool> UpdateInvoiceStatusAsync(Guid invoiceId, string status, string correlationId);

    // Bulk Operations
    Task<bool> ResendInvoiceEmailsAsync(List<Guid> invoiceIds, string correlationId);
    Task<bool> BulkUpdateInvoiceStatusAsync(List<Guid> invoiceIds, string status, string correlationId);
    Task<byte[]> ExportInvoicesAsync(Guid userId, InvoiceFilterRequest filter, string format, string correlationId);

    // Administrative Functions
    Task<List<InvoiceDto>> GetAllInvoicesAsync(InvoiceFilterRequest filter);
    Task<InvoiceAnalyticsDto> GetSystemInvoiceAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<bool> RecalculateInvoiceTaxesAsync(Guid invoiceId, string correlationId);
}

public interface ITaxCalculationService
{
    // Tax Rate Calculation
    Task<TaxCalculationDto> CalculateTaxAsync(decimal amount, string country, string? stateProvince, string? taxId, string correlationId);
    Task<List<TaxCalculationDto>> CalculateMultipleTaxesAsync(List<InvoiceLineItemDto> lineItems, BillingAddressDto billingAddress, string correlationId);
    
    // Tax Validation
    Task<bool> ValidateTaxIdAsync(string taxId, string taxIdType, string country, string correlationId);
    Task<decimal> GetTaxRateAsync(string country, string? stateProvince, string taxType);
    
    // Tax Jurisdiction Management
    Task<string> DetermineTaxJurisdictionAsync(BillingAddressDto billingAddress);
    Task<List<string>> GetSupportedTaxJurisdictionsAsync();
    Task<bool> IsTaxExemptAsync(string taxId, string country, string correlationId);
    
    // Tax Compliance
    Task<bool> ValidateInvoiceTaxComplianceAsync(Guid invoiceId, string correlationId);
    Task<Dictionary<string, object>> GenerateTaxReportAsync(DateTime startDate, DateTime endDate, string jurisdiction);
}

public interface IBillingAddressService
{
    // Address Management
    Task<BillingAddressDto> CreateBillingAddressAsync(Guid userId, CreateBillingAddressRequest request, string correlationId);
    Task<BillingAddressDto> UpdateBillingAddressAsync(Guid userId, Guid addressId, CreateBillingAddressRequest request, string correlationId);
    Task<bool> DeleteBillingAddressAsync(Guid userId, Guid addressId, string correlationId);
    Task<bool> SetDefaultBillingAddressAsync(Guid userId, Guid addressId, string correlationId);

    // Address Retrieval
    Task<List<BillingAddressDto>> GetUserBillingAddressesAsync(Guid userId);
    Task<BillingAddressDto?> GetDefaultBillingAddressAsync(Guid userId);
    Task<BillingAddressDto?> GetBillingAddressAsync(Guid userId, Guid addressId);

    // Address Validation
    Task<bool> ValidateAddressAsync(CreateBillingAddressRequest request, string correlationId);
    Task<BillingAddressDto> StandardizeAddressAsync(BillingAddressDto address, string correlationId);
    Task<bool> IsValidPostalCodeAsync(string postalCode, string country);
}

public interface IInvoiceDeliveryService
{
    // Email Delivery
    Task<bool> SendInvoiceEmailAsync(Guid invoiceId, string correlationId);
    Task<bool> ResendInvoiceEmailAsync(Guid invoiceId, string correlationId);
    Task<bool> SendBulkInvoiceEmailsAsync(List<Guid> invoiceIds, string correlationId);

    // Delivery Tracking
    Task<InvoiceDelivery?> GetInvoiceDeliveryAsync(Guid invoiceId, string deliveryMethod);
    Task<List<InvoiceDelivery>> GetInvoiceDeliveriesAsync(Guid invoiceId);
    Task<bool> UpdateDeliveryStatusAsync(Guid deliveryId, string status, string? failureReason = null);

    // Delivery Configuration
    Task<bool> ConfigureDeliveryPreferencesAsync(Guid userId, string preferredMethod, string correlationId);
    Task<string> GetUserDeliveryPreferenceAsync(Guid userId);

    // Retry Management
    Task ProcessFailedDeliveriesAsync();
    Task<bool> RetryFailedDeliveryAsync(Guid deliveryId, string correlationId);
}

public interface IInvoicePdfService
{
    // PDF Generation
    Task<byte[]> GenerateInvoicePdfAsync(InvoiceDto invoice, string correlationId);
    Task<bool> GenerateAndStorePdfAsync(Guid invoiceId, string correlationId);
    Task<byte[]?> GetStoredInvoicePdfAsync(Guid invoiceId);

    // Template Management
    Task<InvoiceTemplate> GetInvoiceTemplateAsync(string templateType, string language, string currency);
    Task<InvoiceTemplate> CreateInvoiceTemplateAsync(string name, string templateType, string htmlTemplate, string cssStyles, string language, string currency);
    Task<bool> UpdateInvoiceTemplateAsync(Guid templateId, string htmlTemplate, string cssStyles, string updatedBy);

    // PDF Storage
    Task<bool> StoreInvoicePdfAsync(Guid invoiceId, byte[] pdfData, string correlationId);
    Task<bool> DeleteInvoicePdfAsync(Guid invoiceId, string correlationId);
    Task<string> GetInvoicePdfDownloadUrlAsync(Guid invoiceId, Guid userId, TimeSpan? expiration = null);
}

public interface IAccountingExportService
{
    // Data Export
    Task<byte[]> ExportInvoiceDataAsync(InvoiceFilterRequest filter, string format, string correlationId);
    Task<byte[]> ExportTaxReportAsync(DateTime startDate, DateTime endDate, string jurisdiction, string format);
    Task<byte[]> ExportRevenueReportAsync(DateTime startDate, DateTime endDate, string format);

    // Export Formats
    Task<byte[]> ExportToCsvAsync<T>(List<T> data, string correlationId);
    Task<byte[]> ExportToExcelAsync<T>(List<T> data, string correlationId);
    Task<byte[]> ExportToJsonAsync<T>(List<T> data, string correlationId);

    // Chart of Accounts Integration
    Task<Dictionary<string, string>> GetChartOfAccountsMappingAsync();
    Task<bool> UpdateChartOfAccountsMappingAsync(Dictionary<string, string> mapping, string updatedBy);
}