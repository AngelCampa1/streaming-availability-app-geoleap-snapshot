using Microsoft.EntityFrameworkCore;
using Npgsql;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for handling database exceptions consistently across services
/// </summary>
public static class DatabaseExceptionExtensions
{
    /// <summary>
    /// Converts DbUpdateException to a user-friendly ApiErrorResponse
    /// </summary>
    public static ApiErrorResponse ToApiErrorResponse(
        this DbUpdateException exception,
        string correlationId,
        string path,
        string? traceId = null)
    {
        // Check for specific PostgreSQL errors
        if (exception.InnerException is PostgresException pgException)
        {
            return pgException.SqlState switch
            {
                // Unique constraint violation
                "23505" => new ApiErrorBuilder()
                    .WithCode("DUPLICATE_RESOURCE")
                    .WithMessage("A resource with the same unique identifier already exists.")
                    .WithDetails(GetUserFriendlyConstraintMessage(pgException.Message))
                    .WithRetryable(false)
                    .WithSupportContact("Please use a different value or update the existing resource.")
                    .WithCorrelationId(correlationId)
                    .WithPath(path)
                    .WithTraceId(traceId)
                    .Build(),

                // Foreign key violation
                "23503" => new ApiErrorBuilder()
                    .WithCode("INVALID_REFERENCE")
                    .WithMessage("The operation references a resource that doesn't exist.")
                    .WithDetails("Please ensure all referenced resources exist before performing this operation.")
                    .WithRetryable(false)
                    .WithSupportContact("Verify that all related resources exist.")
                    .WithCorrelationId(correlationId)
                    .WithPath(path)
                    .WithTraceId(traceId)
                    .Build(),

                // Deadlock
                "40P01" => new ApiErrorBuilder()
                    .WithCode("DATABASE_CONFLICT")
                    .WithMessage("A database conflict occurred. Please try again.")
                    .WithRetryable(true)
                    .WithRetryAfter(TimeSpan.FromSeconds(5))
                    .WithSupportContact("The operation conflicted with another concurrent operation.")
                    .WithCorrelationId(correlationId)
                    .WithPath(path)
                    .WithTraceId(traceId)
                    .Build(),

                // Default PostgreSQL exception
                _ => new ApiErrorBuilder()
                    .WithCode("DATABASE_ERROR")
                    .WithMessage("A database error occurred while processing your request.")
                    .WithDetails($"PostgreSQL Error {pgException.SqlState}")
                    .WithRetryable(false)
                    .WithSupportContact("Please contact support if the problem persists.")
                    .WithCorrelationId(correlationId)
                    .WithPath(path)
                    .WithTraceId(traceId)
                    .Build()
            };
        }

        // Check for timeout exceptions
        if (exception.InnerException is NpgsqlException npgsqlEx && npgsqlEx.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase))
        {
            return new ApiErrorBuilder()
                .WithCode("DATABASE_TIMEOUT")
                .WithMessage("The database operation took too long to complete.")
                .WithRetryable(true)
                .WithRetryAfter(TimeSpan.FromSeconds(30))
                .WithSupportContact("This is usually temporary. Please try again in a moment.")
                .WithCorrelationId(correlationId)
                .WithPath(path)
                .WithTraceId(traceId)
                .Build();
        }

        // Generic DbUpdateException
        return new ApiErrorBuilder()
            .WithCode("DATABASE_UPDATE_ERROR")
            .WithMessage("Failed to save changes to the database.")
            .WithRetryable(false)
            .WithSupportContact("Please verify your data and try again.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    /// <summary>
    /// Converts DbUpdateConcurrencyException to a user-friendly ApiErrorResponse
    /// </summary>
    public static ApiErrorResponse ToApiErrorResponse(
        this DbUpdateConcurrencyException exception,
        string correlationId,
        string path,
        string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("CONCURRENCY_CONFLICT")
            .WithMessage("The resource was modified by another user since you retrieved it.")
            .WithDetails("Please refresh the resource and try your operation again.")
            .WithRetryable(true)
            .WithRetryAfter(TimeSpan.FromSeconds(2))
            .WithSupportContact("Reload the resource and reapply your changes.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    /// <summary>
    /// Extract user-friendly message from constraint violation
    /// </summary>
    private static string GetUserFriendlyConstraintMessage(string technicalMessage)
    {
        // Extract constraint name if present
        if (technicalMessage.Contains("IX_"))
        {
            return "This value must be unique.";
        }

        if (technicalMessage.Contains("Email"))
        {
            return "An account with this email address already exists.";
        }

        if (technicalMessage.Contains("Username"))
        {
            return "This username is already taken.";
        }

        return "A resource with these values already exists.";
    }

    /// <summary>
    /// Safe wrapper for SaveChangesAsync with comprehensive error handling
    /// </summary>
    public static async Task<ServiceResult> SafeSaveChangesAsync(
        this DbContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await context.SaveChangesAsync(cancellationToken);
            return new ServiceResult { IsSuccess = true };
        }
        catch (DbUpdateConcurrencyException)
        {
            return new ServiceResult
            {
                IsSuccess = false,
                ErrorCode = "CONCURRENCY_CONFLICT",
                ErrorMessage = "The resource was modified by another user. Please refresh and try again."
            };
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx)
        {
            return pgEx.SqlState switch
            {
                "23505" => new ServiceResult
                {
                    IsSuccess = false,
                    ErrorCode = "DUPLICATE_RESOURCE",
                    ErrorMessage = "A resource with the same unique identifier already exists."
                },
                "23503" => new ServiceResult
                {
                    IsSuccess = false,
                    ErrorCode = "INVALID_REFERENCE",
                    ErrorMessage = "The operation references a resource that doesn't exist."
                },
                "40P01" => new ServiceResult
                {
                    IsSuccess = false,
                    ErrorCode = "DATABASE_CONFLICT",
                    ErrorMessage = "A database conflict occurred. Please try again."
                },
                _ => new ServiceResult
                {
                    IsSuccess = false,
                    ErrorCode = "DATABASE_ERROR",
                    ErrorMessage = "A database error occurred while saving changes."
                }
            };
        }
        catch (DbUpdateException)
        {
            return new ServiceResult
            {
                IsSuccess = false,
                ErrorCode = "DATABASE_UPDATE_ERROR",
                ErrorMessage = "Failed to save changes to the database."
            };
        }
        catch (OperationCanceledException)
        {
            return new ServiceResult
            {
                IsSuccess = false,
                ErrorCode = "OPERATION_CANCELLED",
                ErrorMessage = "The operation was cancelled."
            };
        }
        catch (Exception)
        {
            return new ServiceResult
            {
                IsSuccess = false,
                ErrorCode = "INTERNAL_ERROR",
                ErrorMessage = "An unexpected error occurred while saving changes."
            };
        }
    }
}
