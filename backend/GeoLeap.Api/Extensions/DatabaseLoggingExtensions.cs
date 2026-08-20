using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace GeoLeap.Api.Extensions;

public static class DatabaseLoggingExtensions
{
    public static void AddDatabaseLogging(this IServiceCollection services)
    {
        services.AddSingleton<DatabaseCommandInterceptor>();
    }

    public static void ConfigureDatabaseLogging(this DbContextOptionsBuilder options)
    {
        options.AddInterceptors(new DatabaseCommandInterceptor());
        
        // Enable sensitive data logging in development only
        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
        {
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        }
    }
}

public class DatabaseCommandInterceptor : DbCommandInterceptor
{
    private readonly ILogger<DatabaseCommandInterceptor> _logger;

    public DatabaseCommandInterceptor()
    {
        // Using a static logger factory for cases where DI is not available
        var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        _logger = loggerFactory.CreateLogger<DatabaseCommandInterceptor>();
    }

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result)
    {
        LogCommandExecuting(command, eventData);
        return result;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        LogCommandExecuting(command, eventData);
        return new ValueTask<InterceptionResult<DbDataReader>>(result);
    }

    public override DbDataReader ReaderExecuted(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result)
    {
        LogCommandExecuted(command, eventData);
        return result;
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        LogCommandExecuted(command, eventData);
        return new ValueTask<DbDataReader>(result);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result)
    {
        LogCommandExecuting(command, eventData);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        LogCommandExecuting(command, eventData);
        return new ValueTask<InterceptionResult<int>>(result);
    }

    public override int NonQueryExecuted(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result)
    {
        LogCommandExecuted(command, eventData);
        return result;
    }

    public override ValueTask<int> NonQueryExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        LogCommandExecuted(command, eventData);
        return new ValueTask<int>(result);
    }

    private void LogCommandExecuting(DbCommand command, CommandEventData eventData)
    {
        var commandId = eventData.CommandId;
        var connectionId = eventData.ConnectionId;

        _logger.LogDebug("Executing database command {CommandId} on connection {ConnectionId}: {CommandText}",
            commandId, connectionId, command.CommandText);
    }

    private void LogCommandExecuted(DbCommand command, CommandExecutedEventData eventData)
    {
        var duration = eventData.Duration.TotalMilliseconds;
        var commandId = eventData.CommandId;
        var connectionId = eventData.ConnectionId;

        if (duration > 1000) // Log slow queries (> 1 second)
        {
            _logger.LogWarning("Slow database query detected! Command {CommandId} on connection {ConnectionId} took {Duration}ms: {CommandText}",
                commandId, connectionId, duration, command.CommandText);
        }
        else if (duration > 100) // Log moderately slow queries (> 100ms)
        {
            _logger.LogInformation("Database command {CommandId} on connection {ConnectionId} completed in {Duration}ms",
                commandId, connectionId, duration);
        }
        else
        {
            _logger.LogDebug("Database command {CommandId} on connection {ConnectionId} completed in {Duration}ms",
                commandId, connectionId, duration);
        }
    }

    public override void CommandFailed(DbCommand command, CommandErrorEventData eventData)
    {
        var duration = eventData.Duration.TotalMilliseconds;
        var commandId = eventData.CommandId;
        var connectionId = eventData.ConnectionId;

        _logger.LogError(eventData.Exception,
            "Database command {CommandId} on connection {ConnectionId} failed after {Duration}ms: {CommandText}",
            commandId, connectionId, duration, command.CommandText);
    }

    public override Task CommandFailedAsync(DbCommand command, CommandErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        CommandFailed(command, eventData);
        return Task.CompletedTask;
    }
}