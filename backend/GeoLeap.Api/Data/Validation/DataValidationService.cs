using GeoLeap.Api.Models;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Data.Validation;

/// <summary>
/// Comprehensive data validation service for all entity operations
/// </summary>
public class DataValidationService : IDataValidationService
{
    private readonly ILogger<DataValidationService> _logger;
    private readonly IValidator<User> _userValidator;
    private readonly IValidator<SearchableContent> _contentValidator;
    private readonly IValidator<PaymentTransaction> _paymentValidator;
    private readonly IValidator<Subscription> _subscriptionValidator;

    public DataValidationService(
        ILogger<DataValidationService> logger,
        IValidator<User> userValidator,
        IValidator<SearchableContent> contentValidator,
        IValidator<PaymentTransaction> paymentValidator,
        IValidator<Subscription> subscriptionValidator)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _userValidator = userValidator ?? throw new ArgumentNullException(nameof(userValidator));
        _contentValidator = contentValidator ?? throw new ArgumentNullException(nameof(contentValidator));
        _paymentValidator = paymentValidator ?? throw new ArgumentNullException(nameof(paymentValidator));
        _subscriptionValidator = subscriptionValidator ?? throw new ArgumentNullException(nameof(subscriptionValidator));
    }

    public async Task<ValidationResult<User>> ValidateUserAsync(User user, CancellationToken cancellationToken = default)
    {
        try
        {
            var validationResult = await _userValidator.ValidateAsync(user, cancellationToken);
            return new ValidationResult<User>
            {
                IsValid = validationResult.IsValid,
                Entity = user,
                Errors = validationResult.Errors.Select(e => new ValidationError
                {
                    PropertyName = e.PropertyName,
                    ErrorMessage = e.ErrorMessage,
                    ErrorCode = e.ErrorCode,
                    AttemptedValue = e.AttemptedValue
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating user: {UserId}", user.Id);
            return new ValidationResult<User>
            {
                IsValid = false,
                Entity = user,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        ErrorMessage = "Validation failed due to internal error",
                        ErrorCode = "VALIDATION_ERROR"
                    }
                }
            };
        }
    }

    public async Task<ValidationResult<SearchableContent>> ValidateContentAsync(SearchableContent content, CancellationToken cancellationToken = default)
    {
        try
        {
            var validationResult = await _contentValidator.ValidateAsync(content, cancellationToken);
            return new ValidationResult<SearchableContent>
            {
                IsValid = validationResult.IsValid,
                Entity = content,
                Errors = validationResult.Errors.Select(e => new ValidationError
                {
                    PropertyName = e.PropertyName,
                    ErrorMessage = e.ErrorMessage,
                    ErrorCode = e.ErrorCode,
                    AttemptedValue = e.AttemptedValue
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating content: {ContentId}", content.Id);
            return new ValidationResult<SearchableContent>
            {
                IsValid = false,
                Entity = content,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        ErrorMessage = "Content validation failed due to internal error",
                        ErrorCode = "VALIDATION_ERROR"
                    }
                }
            };
        }
    }

    public async Task<ValidationResult<PaymentTransaction>> ValidatePaymentAsync(PaymentTransaction payment, CancellationToken cancellationToken = default)
    {
        try
        {
            var validationResult = await _paymentValidator.ValidateAsync(payment, cancellationToken);
            return new ValidationResult<PaymentTransaction>
            {
                IsValid = validationResult.IsValid,
                Entity = payment,
                Errors = validationResult.Errors.Select(e => new ValidationError
                {
                    PropertyName = e.PropertyName,
                    ErrorMessage = e.ErrorMessage,
                    ErrorCode = e.ErrorCode,
                    AttemptedValue = e.AttemptedValue
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating payment: {PaymentId}", payment.Id);
            return new ValidationResult<PaymentTransaction>
            {
                IsValid = false,
                Entity = payment,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        ErrorMessage = "Payment validation failed due to internal error",
                        ErrorCode = "VALIDATION_ERROR"
                    }
                }
            };
        }
    }

    public async Task<ValidationResult<Subscription>> ValidateSubscriptionAsync(Subscription subscription, CancellationToken cancellationToken = default)
    {
        try
        {
            var validationResult = await _subscriptionValidator.ValidateAsync(subscription, cancellationToken);
            return new ValidationResult<Subscription>
            {
                IsValid = validationResult.IsValid,
                Entity = subscription,
                Errors = validationResult.Errors.Select(e => new ValidationError
                {
                    PropertyName = e.PropertyName,
                    ErrorMessage = e.ErrorMessage,
                    ErrorCode = e.ErrorCode,
                    AttemptedValue = e.AttemptedValue
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating subscription: {SubscriptionId}", subscription.Id);
            return new ValidationResult<Subscription>
            {
                IsValid = false,
                Entity = subscription,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        ErrorMessage = "Subscription validation failed due to internal error",
                        ErrorCode = "VALIDATION_ERROR"
                    }
                }
            };
        }
    }

    public async Task<BatchValidationResult<T>> ValidateBatchAsync<T>(IEnumerable<T> entities, Func<T, Task<ValidationResult<T>>> validator, CancellationToken cancellationToken = default)
    {
        var results = new List<ValidationResult<T>>();
        var validEntities = new List<T>();
        var invalidEntities = new List<T>();
        var allErrors = new List<ValidationError>();

        foreach (var entity in entities)
        {
            var result = await validator(entity);
            results.Add(result);

            if (result.IsValid)
            {
                validEntities.Add(entity);
            }
            else
            {
                invalidEntities.Add(entity);
                allErrors.AddRange(result.Errors);
            }
        }

        return new BatchValidationResult<T>
        {
            IsValid = invalidEntities.Count == 0,
            Results = results,
            ValidEntities = validEntities,
            InvalidEntities = invalidEntities,
            AllErrors = allErrors,
            TotalCount = results.Count,
            ValidCount = validEntities.Count,
            InvalidCount = invalidEntities.Count
        };
    }

    public ValidationResult<T> ValidateBusinessRules<T>(T entity, Func<T, IEnumerable<ValidationError>> businessRuleValidator) where T : class
    {
        try
        {
            var errors = businessRuleValidator(entity).ToList();
            return new ValidationResult<T>
            {
                IsValid = errors.Count == 0,
                Entity = entity,
                Errors = errors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating business rules for entity type: {EntityType}", typeof(T).Name);
            return new ValidationResult<T>
            {
                IsValid = false,
                Entity = entity,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        ErrorMessage = "Business rule validation failed due to internal error",
                        ErrorCode = "BUSINESS_RULE_ERROR"
                    }
                }
            };
        }
    }

    public ValidationResult<T> ValidateDataIntegrity<T>(T entity, Func<T, IEnumerable<ValidationError>> integrityValidator) where T : class
    {
        try
        {
            var errors = integrityValidator(entity).ToList();
            return new ValidationResult<T>
            {
                IsValid = errors.Count == 0,
                Entity = entity,
                Errors = errors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating data integrity for entity type: {EntityType}", typeof(T).Name);
            return new ValidationResult<T>
            {
                IsValid = false,
                Entity = entity,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        ErrorMessage = "Data integrity validation failed due to internal error",
                        ErrorCode = "DATA_INTEGRITY_ERROR"
                    }
                }
            };
        }
    }
}

// Supporting classes for validation results
public interface IDataValidationService
{
    Task<ValidationResult<User>> ValidateUserAsync(User user, CancellationToken cancellationToken = default);
    Task<ValidationResult<SearchableContent>> ValidateContentAsync(SearchableContent content, CancellationToken cancellationToken = default);
    Task<ValidationResult<PaymentTransaction>> ValidatePaymentAsync(PaymentTransaction payment, CancellationToken cancellationToken = default);
    Task<ValidationResult<Subscription>> ValidateSubscriptionAsync(Subscription subscription, CancellationToken cancellationToken = default);
    Task<BatchValidationResult<T>> ValidateBatchAsync<T>(IEnumerable<T> entities, Func<T, Task<ValidationResult<T>>> validator, CancellationToken cancellationToken = default);
    ValidationResult<T> ValidateBusinessRules<T>(T entity, Func<T, IEnumerable<ValidationError>> businessRuleValidator) where T : class;
    ValidationResult<T> ValidateDataIntegrity<T>(T entity, Func<T, IEnumerable<ValidationError>> integrityValidator) where T : class;
}

public class ValidationResult<T>
{
    public bool IsValid { get; set; }
    public T Entity { get; set; } = default!;
    public List<ValidationError> Errors { get; set; } = new();
    public string? Summary => IsValid ? "Valid" : $"{Errors.Count} validation errors";
}

public class BatchValidationResult<T>
{
    public bool IsValid { get; set; }
    public List<ValidationResult<T>> Results { get; set; } = new();
    public List<T> ValidEntities { get; set; } = new();
    public List<T> InvalidEntities { get; set; } = new();
    public List<ValidationError> AllErrors { get; set; } = new();
    public int TotalCount { get; set; }
    public int ValidCount { get; set; }
    public int InvalidCount { get; set; }
    public double SuccessRate => TotalCount > 0 ? (double)ValidCount / TotalCount * 100 : 0;
}

public class ValidationError
{
    public string PropertyName { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public object? AttemptedValue { get; set; }
    public Dictionary<string, object>? CustomState { get; set; }
}