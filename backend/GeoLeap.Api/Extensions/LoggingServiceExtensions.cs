using Serilog;
using Serilog.Events;
using Serilog.Sinks.SystemConsole.Themes;

namespace GeoLeap.Api.Extensions;

public static class LoggingServiceExtensions
{
    public static WebApplicationBuilder AddComprehensiveLogging(this WebApplicationBuilder builder)
    {
        // Configure Serilog
        var loggerConfiguration = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .Enrich.WithThreadId()
            .Enrich.WithProcessId()
            .Enrich.WithProcessName()
            .Enrich.WithEnvironmentName()
            .Enrich.WithProperty("Application", "GeoLeap.Api")
            .Enrich.WithProperty("Environment", builder.Environment.EnvironmentName);

        // Console sink for all environments (required for Railway/container log collection)
        loggerConfiguration.WriteTo.Console(
            outputTemplate: "{Timestamp:HH:mm:ss} [{Level:u3}] {Environment} {SourceContext}: {Message}{NewLine}{Exception}",
            theme: AnsiConsoleTheme.Code);

        // File sink for local development only (Railway containers may not have writable filesystem)
        if (builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("SelfHosted"))
        {
            loggerConfiguration.WriteTo.File(
                path: "logs/geoleap-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Environment} {SourceContext}: {Message}{NewLine}{Exception}");
        }

        // Sentry sink (sends errors and above to Sentry, breadcrumbs for info and above)
        var sentryDsn = builder.Configuration["Sentry:Dsn"];
        if (!string.IsNullOrEmpty(sentryDsn))
        {
            loggerConfiguration.WriteTo.Sentry(o =>
            {
                o.Dsn = sentryDsn;
                o.MinimumEventLevel = LogEventLevel.Error;
                o.MinimumBreadcrumbLevel = LogEventLevel.Information;
            });
        }

        // Set log level based on environment
        if (builder.Environment.IsDevelopment())
        {
            loggerConfiguration.MinimumLevel.Debug();
            loggerConfiguration.MinimumLevel.Override("Microsoft", LogEventLevel.Information);
            loggerConfiguration.MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information);
            loggerConfiguration.MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Information);
        }
        else if (builder.Environment.IsStaging())
        {
            loggerConfiguration.MinimumLevel.Information();
            loggerConfiguration.MinimumLevel.Override("Microsoft", LogEventLevel.Warning);
        }
        else // Production
        {
            loggerConfiguration.MinimumLevel.Warning();
            loggerConfiguration.MinimumLevel.Override("Microsoft", LogEventLevel.Error);
            loggerConfiguration.MinimumLevel.Override("System", LogEventLevel.Error);
        }

        Log.Logger = loggerConfiguration.CreateLogger();

        builder.Services.AddSerilog(Log.Logger);

        return builder;
    }

    public static void ConfigureRequestLogging(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSerilogRequestLogging(options =>
            {
                options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
                options.GetLevel = (httpContext, elapsed, ex) => LogEventLevel.Information;
                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                {
                    diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value ?? "unknown");
                    diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme ?? "unknown");
                    diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.FirstOrDefault() ?? "unknown");
                    diagnosticContext.Set("ClientIP", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

                    if (httpContext.User?.Identity?.IsAuthenticated == true)
                    {
                        diagnosticContext.Set("UserId", httpContext.User?.Identity?.Name ?? "unknown");
                    }
                };
            });
        }
        else
        {
            app.UseSerilogRequestLogging(options =>
            {
                options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
                options.GetLevel = (httpContext, elapsed, ex) =>
                {
                    if (ex != null) return LogEventLevel.Error;
                    if (httpContext.Response.StatusCode > 499) return LogEventLevel.Error;
                    if (httpContext.Response.StatusCode > 399) return LogEventLevel.Warning;
                    return LogEventLevel.Information;
                };
                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                {
                    diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value ?? "unknown");
                    diagnosticContext.Set("ClientIP", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

                    if (httpContext.User?.Identity?.IsAuthenticated == true)
                    {
                        diagnosticContext.Set("UserId", httpContext.User?.Identity?.Name ?? "unknown");
                    }
                };
            });
        }
    }
}
