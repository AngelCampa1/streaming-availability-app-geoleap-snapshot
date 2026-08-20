using GeoLeap.Api.Data;
using GeoLeap.Api.Extensions;
using GeoLeap.Api.Hubs;
using GeoLeap.Api.Middleware;
using GeoLeap.Api.Models;
using System.Runtime.CompilerServices;
using GeoLeap.Api.Services;
using GeoLeap.Api.Services.ValidationRules;
using GeoLeap.Api.Services.ValidationServices;
using GeoLeap.Api.Services.SecurityServices;
using GeoLeap.Api.Services.VpnGuidanceServices;
using GeoLeap.Api.Filters;
using GeoLeap.Api.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;
using GeoLeap.Api.ProgrammaticSeo.Filters;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using HealthChecks.UI.Client;
using Resend;
using GeoLeap.Api.Configuration;
using MaxMind.GeoIP2;
using Microsoft.Extensions.Options;

// Enable testing access to Program class for WebApplicationFactory in .NET 9
[assembly: InternalsVisibleTo("GeoLeap.Api.Tests")]

Console.WriteLine("[GeoLeap] Process starting...");

var builder = WebApplication.CreateBuilder(args);

// Railway sets PORT env var — bind to it so health checks pass
var port = Environment.GetEnvironmentVariable("PORT");
Console.WriteLine($"[GeoLeap] PORT={port ?? "(not set)"}");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Add comprehensive logging first (must be early in pipeline)
builder.AddComprehensiveLogging();

try
{
    Log.Information("Starting GeoLeap API application");

    // Add services to the container.
    // Add enhanced Swagger/OpenAPI documentation
    builder.Services.AddEnhancedSwagger();
    builder.Services.AddControllers(options =>
    {
        // Configure model validation behavior - keep built-in validation active
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = false;

        // Add validation filters - COMMENTED OUT: These filters don't exist yet
        // options.Filters.Add<GeoLeap.Api.Filters.GlobalValidationFilter>();
        // options.Filters.Add<GeoLeap.Api.Filters.BusinessValidationFilter>();
        // options.Filters.Add<GeoLeap.Api.Filters.SecurityValidationFilter>();
        // options.Filters.Add<GeoLeap.Api.Filters.ContentValidationFilter>();
    })
    .AddJsonOptions(options =>
    {
        // Configure JSON serialization to handle edge cases
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Enable automatic ModelState validation for proper validation error responses
        options.SuppressModelStateInvalidFilter = false;
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(x => x.Value.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
            {
                Success = false,
                Message = "Validation failed",
                Errors = errors
            });
        };
    });

// Week 3 Day 3 - Add response compression for API optimization
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();

    // Compress common MIME types
    options.MimeTypes = Microsoft.AspNetCore.ResponseCompression.ResponseCompressionDefaults.MimeTypes.Concat(
        new[] { "application/json", "text/json", "application/xml", "text/xml", "text/plain" });
});

builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest; // Balance speed vs. size
});

builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest; // Balance speed vs. size
});

// Add Response Caching for HTTP caching headers
builder.Services.AddResponseCaching();

// Add Output Caching (.NET 9) for optimized response caching
builder.Services.AddOutputCachingConfiguration();

// Add API Versioning support
builder.Services.AddApiVersioningConfiguration();

// Add routing services (required for endpoint routing)
builder.Services.AddRouting();

// Add Security Services
builder.Services.AddSecurityServices(builder.Configuration);
builder.Services.AddSecureCors();
builder.Services.AddSecureSessions();

// Add Entity Framework with logging
builder.Services.AddDatabaseLogging();

// Add database provider - PostgreSQL for all non-testing environments, will be overridden in tests
if (builder.Environment.EnvironmentName != "Testing")
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

        // VALIDATION FIX: Ensure connection string is configured
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Database connection string 'DefaultConnection' is not configured. " +
                "Please configure ConnectionStrings:DefaultConnection in appsettings.json or environment variables.");
        }

        // Neon-optimized connection pooling: small pool, no keepalive pings,
        // so Neon compute can auto-suspend when idle
        var enhancedConnectionString = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = true,
            MinPoolSize = 0,
            MaxPoolSize = 5,
            ConnectionLifetime = 120,
            ConnectionIdleLifetime = 10,
            Timeout = 20,
            CommandTimeout = 30,
            KeepAlive = 0,
            SslMode = (builder.Environment.IsEnvironment("SelfHosted") || builder.Environment.IsDevelopment()) ? Npgsql.SslMode.Disable : Npgsql.SslMode.Prefer,
        }.ConnectionString;

        ConfigureNpgsqlOptions(options, enhancedConnectionString, builder);
    }, ServiceLifetime.Scoped);

    // Add DbContextFactory for services that need to create their own DbContext instances
    // This is required by WatchlistNotificationService and other background services
    builder.Services.AddDbContextFactory<ApplicationDbContext>(options =>
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Database connection string 'DefaultConnection' is not configured. " +
                "Please configure ConnectionStrings:DefaultConnection in appsettings.json or environment variables.");
        }

        var enhancedConnectionString = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = true,
            MinPoolSize = 0,
            MaxPoolSize = 5,
            ConnectionLifetime = 120,
            ConnectionIdleLifetime = 10,
            Timeout = 20,
            CommandTimeout = 30,
            KeepAlive = 0,
            SslMode = (builder.Environment.IsEnvironment("SelfHosted") || builder.Environment.IsDevelopment()) ? Npgsql.SslMode.Disable : Npgsql.SslMode.Prefer,
        }.ConnectionString;

        ConfigureNpgsqlOptions(options, enhancedConnectionString, builder);
    }, ServiceLifetime.Scoped);
}

// Add Redis - skip Redis entirely in testing environment
if (builder.Environment.EnvironmentName != "Testing")
{
    var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConnectionString))
    {
        // Configure Redis with proper connection options
        var redisOptions = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString);
        redisOptions.AbortOnConnectFail = false;
        redisOptions.ConnectTimeout = 5000;
        redisOptions.SyncTimeout = 5000;

        // SECURITY FIX: Read Redis password from configuration instead of hardcoding empty string
        var redisPassword = builder.Configuration["CacheSettings:Redis:Password"];
        if (!string.IsNullOrEmpty(redisPassword))
        {
            redisOptions.Password = redisPassword;
            Log.Information("Redis password configured from settings");
        }
        else
        {
            Log.Warning("Redis password not configured - using connection without authentication. This is insecure for production.");
        }

        builder.Services.AddStackExchangeRedisCache(options =>
        {
            options.ConfigurationOptions = redisOptions;
        });

        // Add IConnectionMultiplexer for services that need direct Redis access
        builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(provider =>
        {
            return StackExchange.Redis.ConnectionMultiplexer.Connect(redisOptions);
        });
    }
    else
    {
        // Fallback to in-memory caching if Redis is not configured
        // Configure memory cache with cache settings
        var cacheSettings = builder.Configuration.GetSection("CacheSettings:Memory").Get<GeoLeap.Api.Models.MemorySettings>();
        builder.Services.AddMemoryCache(options =>
        {
            if (cacheSettings != null)
            {
                // Don't set SizeLimit to avoid requiring Size on every cache entry
                // This prevents "Cache entry must specify a value for Size when SizeLimit is set" errors
                // options.SizeLimit = cacheSettings.SizeLimit;
                options.CompactionPercentage = cacheSettings.CompactionPercentage;
                options.ExpirationScanFrequency = cacheSettings.ExpirationScanFrequency;
            }
        });
        builder.Services.AddSingleton<Microsoft.Extensions.Caching.Distributed.IDistributedCache, Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache>();

        // FIX: Register factory that returns null for IConnectionMultiplexer when Redis is not configured
        // Redis is not configured - throw exception if Redis is required, otherwise services should use IDistributedCache
        builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
        {
            Log.Warning("Redis is not configured. IConnectionMultiplexer will be unavailable. Services should use IDistributedCache which falls back to memory cache.");
            throw new InvalidOperationException(
                "Redis connection is not configured. " +
                "Configure ConnectionStrings:Redis in appsettings or use IDistributedCache for cache operations. " +
                "If Redis is optional for your deployment, services should depend on IDistributedCache instead of IConnectionMultiplexer directly.");
        });
        builder.Services.AddSingleton<Microsoft.Extensions.Caching.Distributed.IDistributedCache, Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache>();
    }
}
else
{
    // Testing environment - use only in-memory services without SizeLimit to avoid Size requirement
    builder.Services.AddMemoryCache(options =>
    {
        // CRITICAL: No SizeLimit set to avoid Size requirement on cache entries
        // This prevents cache-related test failures
        options.CompactionPercentage = 0.1;
    });
    builder.Services.AddSingleton<Microsoft.Extensions.Caching.Distributed.IDistributedCache, Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache>();
}

// Add Error Handling and Resilience Services
builder.Services.Configure<CircuitBreakerOptions>(options =>
{
    options.FailureThreshold = 5;
    options.OpenTimeout = TimeSpan.FromMinutes(1);
    options.HalfOpenMaxRetries = 3;
    options.SamplingDuration = TimeSpan.FromMinutes(10);
    options.MinimumThroughput = 10;
});

builder.Services.AddSingleton<ICircuitBreakerService, CircuitBreakerService>();
builder.Services.AddSingleton<IRateLimitingService, RateLimitingService>(); // Changed to Singleton for middleware injection
builder.Services.AddSingleton<ISecurityValidationService, SecurityValidationService>(); // Changed to Singleton for middleware injection
builder.Services.AddHttpClient(nameof(LeadTurnstileVerifier));
builder.Services.AddScoped<ILeadTurnstileVerifier, LeadTurnstileVerifier>();
builder.Services.AddScoped<IDatabaseResilienceService, DatabaseResilienceService>();

// Configure JWT Settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JWT"));

// Add Identity Services with role support
builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    // Password settings
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredUniqueChars = 1;

    // User settings
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddSignInManager<SignInManager<User>>()
.AddDefaultTokenProviders();

// Configure secure cookie settings for Identity
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.Name = builder.Environment.IsDevelopment()
        ? "GeoLeap.Auth"
        : "__Host-GeoLeap.Auth"; // __Host- prefix for additional security
    options.ExpireTimeSpan = TimeSpan.FromHours(1); // 1 hour session timeout
    options.SlidingExpiration = true; // Extend timeout on activity
    options.LoginPath = "/api/auth/login";
    options.LogoutPath = "/api/auth/logout";
    options.AccessDeniedPath = "/api/auth/access-denied";
});

// Add Database Seeder Service for E2E testing (after Identity is configured)
builder.Services.AddScoped<GeoLeap.Api.Data.Services.IDatabaseSeederService, GeoLeap.Api.Data.Services.DatabaseSeederService>();

// Add Authentication with JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
})
.AddJwtBearer(options =>
{
    var jwtSettings = builder.Configuration.GetSection("JWT").Get<JwtSettings>();
    if (jwtSettings == null)
    {
        throw new InvalidOperationException("JWT configuration is missing");
    }

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers.Append("Token-Expired", "true");
            }
            return Task.CompletedTask;
        },
        // BUG-004 FIX: Extract token from query string for SignalR WebSocket connections
        // COOKIE-AUTH-FIX: Also extract token from httpOnly cookies for browser requests
        OnMessageReceived = context =>
        {
            // First, check for token in Authorization header (already handled by JWT bearer)
            // Then check query string for SignalR
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            // Check if this is a SignalR hub request
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/admin-hub") ||
                 path.StartsWithSegments("/watchlist-hub") ||
                 path.StartsWithSegments("/user-behavior-hub") ||
                 path.StartsWithSegments("/monitoring-hub") ||
                 path.StartsWithSegments("/hubs/preferences") ||
                 path.StartsWithSegments("/watchlistHub")))
            {
                context.Token = accessToken;
                return Task.CompletedTask;
            }

            // COOKIE-AUTH-FIX: Extract JWT from httpOnly cookie for regular API requests
            // This enables browser-based authentication using cookies set during login
            // The cookie is httpOnly, secure, and SameSite=None for cross-origin support
            if (string.IsNullOrEmpty(context.Token))
            {
                var cookieToken = context.Request.Cookies["access_token"];
                if (!string.IsNullOrEmpty(cookieToken))
                {
                    context.Token = cookieToken;
                }
            }

            return Task.CompletedTask;
        }
    };
});

// Add OAuth providers only in non-testing environments
// SESSION3-001 and SESSION3-002 FIX: Enable OAuth authentication handlers
if (builder.Environment.EnvironmentName != "Testing")
{
    // Try real OAuth providers first, fall back to mock providers for development
    var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
    var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
    var useMockOAuth = builder.Configuration.GetValue<bool>("Authentication:UseMockOAuth", false); // Changed default to false for security

    // ✅ SECURITY FIX (HIGH-001): Prevent mock OAuth in production
    if (!builder.Environment.IsDevelopment() && useMockOAuth)
    {
        throw new InvalidOperationException(
            "SECURITY ERROR: Mock OAuth authentication is not allowed in production environments. " +
            "Configure real OAuth providers (Google, Apple) or disable mock OAuth. " +
            "See docs/OAUTH_TOKEN_SECURITY.md for configuration details.");
    }

    // Add Google OAuth authentication
    if (!string.IsNullOrEmpty(googleClientId) && !string.IsNullOrEmpty(googleClientSecret) &&
        googleClientId != "your-google-client-id.apps.googleusercontent.com")
    {
        // Use real Google OAuth when valid credentials are provided
        builder.Services.AddAuthentication()
            .AddGoogle(options =>
            {
                options.ClientId = googleClientId;
                options.ClientSecret = googleClientSecret;
                options.Scope.Add("email");
                options.Scope.Add("profile");
                options.SaveTokens = true;
                options.CallbackPath = "/signin-google";
            });
        Log.Information("Using REAL Google OAuth");
    }
    else if (useMockOAuth)
    {
        // Use mock Google OAuth for development/testing
        builder.Services.AddAuthentication()
            .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, GeoLeap.Api.Authentication.MockGoogleOAuthHandler>(
                "Google", options => { });
        Log.Information("Using MOCK Google OAuth for development");
    }

    // Add Apple OAuth authentication
    var appleClientId = builder.Configuration["Authentication:Apple:ClientId"];
    var appleKeyId = builder.Configuration["Authentication:Apple:KeyId"];
    var appleTeamId = builder.Configuration["Authentication:Apple:TeamId"];
    var applePrivateKey = builder.Configuration["Authentication:Apple:PrivateKey"];

    if (!string.IsNullOrEmpty(appleClientId) && !string.IsNullOrEmpty(appleKeyId) &&
        !string.IsNullOrEmpty(appleTeamId) && !string.IsNullOrEmpty(applePrivateKey) &&
        appleTeamId != "YOUR_TEAM_ID")
    {
        // Use real Apple OAuth when valid credentials are provided
        builder.Services.AddAuthentication()
            .AddApple(options =>
            {
                options.ClientId = appleClientId;
                options.KeyId = appleKeyId;
                options.TeamId = appleTeamId;
                options.PrivateKey = (keyId, cancellationToken) => Task.FromResult(applePrivateKey.AsMemory());
                options.CallbackPath = "/signin-apple";
                options.SaveTokens = true;
            });
        Log.Information("Using REAL Apple OAuth");
    }
    else if (useMockOAuth)
    {
        // Use mock Apple OAuth for development/testing
        builder.Services.AddAuthentication()
            .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, GeoLeap.Api.Authentication.MockAppleOAuthHandler>(
                "Apple", options => { });
        Log.Information("Using MOCK Apple OAuth for development");
    }
}

// Add Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("role", "Admin"); // Match the case-sensitive claim value from TestAuthenticationHandler
    });
    
    options.AddPolicy("UserOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
    });
    
    options.AddPolicy("PremiumUser", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("subscription", "premium");
    });

});

// Add RBAC Services
builder.Services.AddScoped<IRbacService, RbacService>();

// Add authentication services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAccountLockoutService, AccountLockoutService>();
builder.Services.AddScoped<ISessionService, SessionService>();

// Add password management services
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IPasswordValidationService, PasswordValidationService>();

// Add user profile service
builder.Services.AddScoped<IUserProfileService, UserProfileService>();

// Add onboarding service
builder.Services.AddScoped<IOnboardingService, OnboardingService>();

// Add usage tracking service
builder.Services.AddScoped<IUsageService, UsageService>();

// US-9.1 VPN Guidance System Services
builder.Services.AddScoped<GeoLeap.Api.Services.IVpnProviderService, GeoLeap.Api.Services.VpnProviderService>();
builder.Services.AddScoped<IVpnRecommendationService, VpnRecommendationService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnLanguageRecommendationService, GeoLeap.Api.Services.VpnGuidanceServices.VpnLanguageRecommendationService>();

// Affiliate System Services
// Scoped: AffiliateService does per-request DB work via IDbContextFactory (a scoped
// service) and is only consumed by request-scoped minimal-API endpoint handlers.
// Registering it Singleton fails DI scope validation in Development.
builder.Services.AddScoped<IAffiliateService, AffiliateService>();

// Add streaming service management
builder.Services.AddScoped<IStreamingServiceManagementService, StreamingServiceManagementService>();

// Add email service - Configure based on EmailProvider setting
var emailProvider = builder.Configuration["EmailProvider"] ?? "Mock";

if (emailProvider.Equals("Resend", StringComparison.OrdinalIgnoreCase))
{
    // Register Resend client with DI
    builder.Services.AddOptions();
    builder.Services.AddHttpClient<ResendClient>();
    builder.Services.Configure<ResendClientOptions>(o =>
    {
        o.ApiToken = builder.Configuration["Resend:ApiKey"]
            ?? throw new InvalidOperationException("Resend:ApiKey not configured");
    });
    builder.Services.AddTransient<IResend, ResendClient>();
    builder.Services.AddScoped<IEmailService, ResendEmailService>();
}
else if (emailProvider.Equals("SMTP", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IEmailService, EmailService>();
}
else
{
    // Use MockEmailService for development/testing
    builder.Services.AddScoped<IEmailService, MockEmailService>();
}

// Add Inbound Email Forwarding Service
builder.Services.AddScoped<IInboundEmailForwardingService, InboundEmailForwardingService>();

// Add Feedback Service
builder.Services.AddScoped<IFeedbackService, FeedbackService>();

// Add GDPR Compliance Services
builder.Services.AddScoped<GeoLeap.Api.Services.GDPR.IGdprComplianceService, GeoLeap.Api.Services.GDPR.GdprComplianceService>();
builder.Services.AddScoped<GeoLeap.Api.Services.GDPR.GdprEmailFooterService>();

// Add security services
builder.Services.AddScoped<ISecurityService, SecurityService>();
builder.Services.AddScoped<ISessionManagementService, SessionManagementService>();

// Add logging service
builder.Services.AddScoped<ILoggerService, LoggerService>();

// Add admin management services
builder.Services.AddScoped<IAdminActionLogger, AdminActionLogger>();
builder.Services.AddScoped<IAdminUserManagementService, AdminUserManagementService>();

// Add resilience service for error handling and retry policies
builder.Services.AddSingleton<IResilienceService, ResilienceService>();

// Add programmatic SEO services
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.ISeoTemplateService, GeoLeap.Api.ProgrammaticSeo.Services.SeoTemplateService>();
// Only register SeoBackgroundJobService when Hangfire is enabled (not in development)
if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.ISeoBackgroundJobService, GeoLeap.Api.ProgrammaticSeo.Services.SeoBackgroundJobService>();
}
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IKeywordResearchService, GeoLeap.Api.ProgrammaticSeo.Services.KeywordResearchService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IContentMetadataService, GeoLeap.Api.ProgrammaticSeo.Services.ContentMetadataService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.ISeoPerformanceService, GeoLeap.Api.ProgrammaticSeo.Services.SeoPerformanceService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IContentQualityValidatorService, GeoLeap.Api.ProgrammaticSeo.Services.ContentQualityValidatorService>();

// Add advanced SEO services - US-7.3 Advanced Features
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IAdvancedKeywordResearchService, GeoLeap.Api.ProgrammaticSeo.Services.AdvancedKeywordResearchService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IAdvancedSeoTemplateService, GeoLeap.Api.ProgrammaticSeo.Services.AdvancedSeoTemplateService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IContentGenerationEngineService, GeoLeap.Api.ProgrammaticSeo.Services.ContentGenerationEngineService>();

// Add enhanced validation services
builder.Services.AddScoped<IBusinessValidationService, BusinessValidationService>();
builder.Services.AddScoped<IAdvancedRateLimitingService, AdvancedRateLimitingService>();

// Add Preference Services - US-8.3 Complete Integration
builder.Services.AddPreferenceServices();
builder.Services.AddPreferenceCaching();
builder.Services.AddPreferenceBackgroundServices();

// Configure Sentry for error tracking (only when DSN is configured)
var sentryDsn = builder.Configuration["Sentry:Dsn"];
if (!string.IsNullOrEmpty(sentryDsn))
{
    builder.WebHost.UseSentry(o =>
    {
        builder.Configuration.GetSection("Sentry").Bind(o);
        o.Environment = builder.Environment.EnvironmentName;
    });
    Log.Information("Sentry error tracking configured");
}

// Register Telemetry Service
builder.Services.AddSingleton<ITelemetryService, TelemetryService>();

// Add placeholder SMS service for monitoring alerts (email already registered above)
builder.Services.AddScoped<ISmsService, MockSmsService>();

// Configure Streaming API settings
builder.Services.Configure<StreamingApiSettings>(
    builder.Configuration.GetSection(StreamingApiSettings.SectionName));

// TMDb has been disabled - using RapidAPI Streaming Availability only
// Configuration kept for backward compatibility but not used
builder.Services.Configure<TmdbSettings>(
    builder.Configuration.GetSection(TmdbSettings.SectionName));

// Configure Cache settings
builder.Services.Configure<CacheSettings>(
    builder.Configuration.GetSection(CacheSettings.SectionName));

// Configure Data Validation settings
builder.Services.Configure<ValidationConfiguration>(
    builder.Configuration.GetSection("ValidationConfiguration"));
builder.Services.Configure<QualityMonitoringSettings>(
    builder.Configuration.GetSection("QualityMonitoringSettings"));


// TMDb HttpClient removed - using DisabledTmdbClient instead

// Add HttpClient for CDN optimization service
builder.Services.AddHttpClient<CdnOptimizationService>();

// Add Polly for resilience policies
builder.Services.AddScoped<IStreamingApiErrorHandler, StreamingApiErrorHandler>();

// Add streaming API services
builder.Services.AddScoped<IStreamingAvailabilityClient, StreamingAvailabilityClient>();
builder.Services.AddScoped<IStreamingDataNormalizer, StreamingDataNormalizer>();
builder.Services.AddScoped<IApiUsageTracker, ApiUsageTracker>();
builder.Services.AddScoped<IApiCostManager, ApiCostManager>();

// Add VPN streaming availability services
builder.Services.AddScoped<IUserStreamingSubscriptionService, UserStreamingSubscriptionService>();

// Configure MaxMind GeoLite2 for IP geolocation (replaces ip-api.com)
builder.Services.Configure<MaxMindSettings>(builder.Configuration.GetSection(MaxMindSettings.SectionName));
builder.Services.AddSingleton(provider =>
{
    var settings = provider.GetRequiredService<IOptions<MaxMindSettings>>().Value;
    var logger = provider.GetRequiredService<ILogger<GeoLocationService>>();
    var env = provider.GetRequiredService<IWebHostEnvironment>();

    // Resolve database path (support both absolute and relative paths)
    var dbPath = Path.IsPathRooted(settings.DatabasePath)
        ? settings.DatabasePath
        : Path.Combine(env.ContentRootPath, settings.DatabasePath);

    if (File.Exists(dbPath))
    {
        try
        {
            logger.LogInformation("Loading MaxMind GeoLite2 database from {Path}", dbPath);
            return new DatabaseReader(dbPath);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load MaxMind database from {Path}", dbPath);
            return (DatabaseReader?)null;
        }
    }
    else
    {
        logger.LogWarning("MaxMind database not found at {Path}. Geolocation will default to 'us'. " +
            "Download GeoLite2-Country.mmdb from https://www.maxmind.com/en/geolite2/signup", dbPath);
        return (DatabaseReader?)null;
    }
});
builder.Services.AddScoped<IGeoLocationService, GeoLocationService>();

// Notification services - US-8.2 Enhanced Notification System
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<INotificationEngine, NotificationEngine>();
builder.Services.AddScoped<INotificationPreferencesService, NotificationPreferencesService>();
builder.Services.AddScoped<INotificationTemplateService, NotificationTemplateService>();
builder.Services.AddScoped<IAvailabilityMonitoringService, AvailabilityMonitoringService>();

// TMDb disabled - using stub client that returns empty results
// Search uses RapidAPI Streaming Availability only
builder.Services.AddScoped<ITmdbClient, DisabledTmdbClient>();
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<IContentLinkingService, ContentLinkingService>();
builder.Services.AddScoped<ILocalizedContentService, LocalizedContentService>();

// Add Caching Service for service layer
builder.Services.AddScoped<ICachingService, CachingService>();

// Add Redis Cache Service with cache-aside pattern
builder.Services.AddScoped<IRedisCacheService, RedisCacheService>();

// Add Cache services
builder.Services.AddScoped<ICacheKeyService, CacheKeyService>();
builder.Services.AddScoped<ICacheTtlManager, CacheTtlManager>();
builder.Services.AddScoped<ICacheMetricsCollector, CacheMetricsCollector>();
builder.Services.AddScoped<ICachePersistenceService, CachePersistenceService>();
builder.Services.AddScoped<ICacheInvalidationService, CacheInvalidationService>();
builder.Services.AddScoped<ICacheService, MultiLevelCacheService>();
builder.Services.AddScoped<IPopularContentService, PopularContentService>();

// Add Data Validation services
builder.Services.AddScoped<IDataValidationService, DataValidationService>();
builder.Services.AddScoped<IValidationRuleEngine, ValidationRuleEngine>();
builder.Services.AddScoped<IBusinessRuleValidationService, BusinessRuleValidationService>();
builder.Services.AddScoped<IDataEnrichmentService, DataEnrichmentService>();
builder.Services.AddScoped<IDataReconciliationService, DataReconciliationService>();
builder.Services.AddScoped<IDataConsistencyChecker, DataConsistencyChecker>();

// Add Enhanced Social Media Integration Services
builder.Services.AddHttpClient<EnhancedSocialAuthService>();
builder.Services.AddScoped<IEnhancedSocialAuthService, EnhancedSocialAuthService>();
builder.Services.AddScoped<ISocialFriendDiscoveryService, SocialFriendDiscoveryService>();
builder.Services.AddScoped<ISocialRecommendationEngine, SocialRecommendationEngine>();
builder.Services.AddScoped<IPrivacyService, EnhancedPrivacyService>();
builder.Services.AddScoped<ISocialProofCalculationService, SocialProofCalculationService>();
builder.Services.AddScoped<ISocialTokenService, SocialTokenService>();
builder.Services.AddScoped<ISocialPlatformProviderFactory, SocialPlatformProviderFactory>();

// Add individual platform providers for dependency injection
builder.Services.AddScoped<FacebookProvider>();
builder.Services.AddScoped<TwitterProvider>();
builder.Services.AddScoped<InstagramProvider>();
builder.Services.AddScoped<TikTokProvider>();

builder.Services.AddSingleton<IQualityMetricsCollector, QualityMetricsCollector>();
builder.Services.AddSingleton<IAlertingService, AlertingService>();

// Add API Cost Management services
builder.Services.Configure<CostManagementSettings>(
    builder.Configuration.GetSection("CostManagementSettings"));
builder.Services.AddScoped<IApiCostTracker, ApiCostTracker>();
builder.Services.AddScoped<IBudgetManager, BudgetManager>();
builder.Services.AddScoped<IProviderCostCalculator, ProviderCostCalculator>();
builder.Services.AddScoped<ICostOptimizationEngine, CostOptimizationEngine>();

// Add Data Validation rules and enrichers
builder.Services.AddScoped<ContentMetadataValidationRule>();
builder.Services.AddScoped<StreamingAvailabilityValidationRule>();
builder.Services.AddScoped<ContentCompletenessScore>();
builder.Services.AddScoped<DataFreshnessScore>();
builder.Services.AddScoped<ContentConsistencyScore>();
builder.Services.AddScoped<AvailabilityCoverageScore>();
builder.Services.AddScoped<DataAccuracyScore>();
builder.Services.AddScoped<StreamingRichnessScore>();
builder.Services.AddScoped<MissingGenreEnricher>();
builder.Services.AddScoped<MissingOverviewEnricher>();
builder.Services.AddScoped<MissingRuntimeEnricher>();
builder.Services.AddScoped<CountryNameEnricher>();

// Add Alert handlers
builder.Services.AddScoped<IAlertHandler, ConsoleAlertHandler>();
builder.Services.AddScoped<IAlertHandler, EmailAlertHandler>();

// Add API Abstraction Layer services
builder.Services.Configure<ProviderConfiguration>(
    builder.Configuration.GetSection("ProviderConfiguration"));

// Core provider management services
builder.Services.AddScoped<IProviderManager, ProviderManager>();
builder.Services.AddScoped<IProviderSelector, ProviderSelector>();
builder.Services.AddScoped<IDataTransformationService, DataTransformationService>();

// Provider implementations
builder.Services.AddScoped<IDataProvider, TmdbDataProvider>();
builder.Services.AddScoped<IDataProvider, StreamingAvailabilityDataProvider>();

// Full content data service with provider management
builder.Services.AddScoped<IContentDataService, FullContentDataService>();

// Add Search services - using mock implementation for now
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IAutocompleteService, AutocompleteService>();
builder.Services.AddScoped<IAdvancedFilterService, AdvancedFilterService>();
builder.Services.AddScoped<IContentFilterService, ContentFilterService>();

// Add Search Limit services (2-step conversion funnel)
builder.Services.AddScoped<ISearchLimitService, SearchLimitService>();
builder.Services.AddScoped<IAnonymousUserService, AnonymousUserService>();

// Add Content services for frontend content pages
builder.Services.AddScoped<IContentService, ContentService>();

// Add Search Performance Optimization services
builder.Services.Configure<DatabaseOptimizationOptions>(
    builder.Configuration.GetSection("DatabaseOptimization"));
builder.Services.Configure<ProgressiveLoadingOptions>(
    builder.Configuration.GetSection("ProgressiveLoading"));
builder.Services.Configure<CdnOptimizationOptions>(
    builder.Configuration.GetSection("CdnOptimization"));
builder.Services.Configure<AutoScalingOptions>(
    builder.Configuration.GetSection("AutoScaling"));
builder.Services.AddScoped<IDatabaseOptimizationService, DatabaseOptimizationService>();
builder.Services.AddScoped<IProgressiveLoadingService, ProgressiveLoadingService>();
builder.Services.AddScoped<ICdnOptimizationService, CdnOptimizationService>();
builder.Services.AddScoped<IAutoScalingService, AutoScalingService>();

// Add Paywall services
builder.Services.AddScoped<IPaywallService, PaywallService>();

// Add Ranking services
builder.Services.AddScoped<IRankingService, RankingService>();
builder.Services.AddScoped<IFuzzyMatchingService, FuzzyMatchingService>();

// Add A/B Testing services
builder.Services.AddScoped<IABTestingService, ABTestingService>();

// Add Search Analytics services
builder.Services.AddScoped<ISearchAnalyticsService, SearchAnalyticsService>();

// Add Payment Processing services
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IPaymentMethodService, PaymentMethodService>();
builder.Services.AddScoped<IDunningService, DunningService>();
builder.Services.AddScoped<IGracePeriodService, GracePeriodService>();
builder.Services.AddScoped<IPaymentRetryService, PaymentRetryService>();
builder.Services.AddScoped<ISubscriptionErrorHandlingService, SubscriptionErrorHandlingService>();
builder.Services.AddScoped<ISubscriptionRecoveryService, SubscriptionRecoveryService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();

// Add Promotion services (Stripe Coupons/Promotion Codes)
builder.Services.AddScoped<IPromotionService, PromotionService>();

// Add Subscription Analytics service
builder.Services.AddScoped<ISubscriptionAnalyticsService, SubscriptionAnalyticsService>();

// Add Mobile IAP Subscription services
builder.Services.AddScoped<IMobileSubscriptionService, MobileSubscriptionService>();
builder.Services.AddScoped<IIosReceiptVerificationService, IosReceiptVerificationService>();
builder.Services.AddScoped<IAndroidReceiptVerificationService, AndroidReceiptVerificationService>();

// Add Watchlist System services
builder.Services.AddScoped<IWatchlistService, WatchlistService>();
builder.Services.AddScoped<IWatchlistNotificationService, WatchlistNotificationService>();
builder.Services.AddScoped<IWatchlistAvailabilityService, WatchlistAvailabilityService>();
builder.Services.AddScoped<IWatchlistRealtimeService, WatchlistRealtimeService>();

// US-8.4 Content Recommendation System Services
builder.Services.AddScoped<IContentRatingService, ContentRatingService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();

// US-8.2 Enhanced Notification System Services
// Registered inside the ENABLE_BACKGROUND_SERVICES gate below

// Add Invoice and Billing services
builder.Services.AddScoped<ITaxCalculationService, TaxCalculationService>();
builder.Services.AddScoped<IInvoicePdfService, InvoicePdfService>();
builder.Services.AddScoped<IBillingAddressService, BillingAddressService>();
builder.Services.AddScoped<IInvoiceDeliveryService, InvoiceDeliveryService>();
builder.Services.AddScoped<IAccountingExportService, AccountingExportService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();

// Add Dunning services
builder.Services.AddScoped<IDunningService, DunningService>();

// Configure Stripe services for Support
builder.Services.AddScoped<Stripe.RefundService>(provider =>
{
    var configuration = provider.GetRequiredService<IConfiguration>();
    var stripeSecretKey = configuration["Stripe:SecretKey"];
    return new Stripe.RefundService();
});

// Add Customer Support services
builder.Services.AddScoped<ISupportService, SupportService>();

// Add comprehensive Admin services
builder.Services.AddScoped<IBusinessMetricsService, BusinessMetricsService>();
// Add comprehensive Admin services
builder.Services.AddScoped<IAdvancedAdminUserService, AdvancedAdminUserService>();
// builder.Services.AddScoped<IAdminNotificationService, AdminNotificationService>();
// builder.Services.AddScoped<IAdminAuditService, AdminAuditService>();
// builder.Services.AddScoped<IAdminDataExportService, AdminDataExportService>();
// builder.Services.AddScoped<IAdminSessionService, AdminSessionService>();
// builder.Services.AddScoped<ISystemHealthService, SystemHealthService>();
// builder.Services.AddScoped<IConfigurationManagementService, ConfigurationManagementService>();

// Add Notification services - BASIC IMPLEMENTATIONS WORKING
builder.Services.AddScoped<IPushNotificationService, PushNotificationService>();
builder.Services.AddScoped<ISmsService, SmsService>();

// Social Sharing Services
builder.Services.AddScoped<ISocialSharingService, SocialSharingService>();
builder.Services.AddScoped<IMetaTagGenerationService, MetaTagGenerationService>();
builder.Services.AddScoped<IShareLinkService, ShareLinkService>();
builder.Services.AddScoped<ISocialSharingAnalyticsService, SocialSharingAnalyticsService>();

// Social Media OAuth Authentication Services
builder.Services.AddScoped<ISocialAuthService, SocialAuthService>();
builder.Services.AddScoped<ISocialTokenService, SocialTokenService>();
builder.Services.AddScoped<ISocialPlatformProviderFactory, SocialPlatformProviderFactory>();
// Removed: Using enhanced version above
builder.Services.AddScoped<IPrivacyService, PrivacyService>();
builder.Services.AddScoped<ISocialActivityService, SocialActivityService>();

// Social Media Platform Providers
builder.Services.AddScoped<FacebookProvider>();
builder.Services.AddScoped<TwitterProvider>();
builder.Services.AddScoped<InstagramProvider>();
builder.Services.AddScoped<TikTokProvider>();

// Growth Analytics Services - Event tracking and multi-touch attribution
builder.Services.AddScoped<GeoLeap.Api.Services.GrowthAnalytics.IGrowthTrackingService, GeoLeap.Api.Services.GrowthAnalytics.GrowthTrackingService>();
builder.Services.AddScoped<GeoLeap.Api.Services.GrowthAnalytics.IAttributionService, GeoLeap.Api.Services.GrowthAnalytics.AttributionService>();
builder.Services.AddScoped<GeoLeap.Api.Services.GrowthAnalytics.IGrowthAnalyticsBackgroundService, GeoLeap.Api.Services.GrowthAnalytics.GrowthAnalyticsBackgroundService>();
builder.Services.AddScoped<GeoLeap.Api.Services.GrowthAnalytics.IAbTestingService, GeoLeap.Api.Services.GrowthAnalytics.AbTestingService>();
builder.Services.AddScoped<GeoLeap.Api.Services.GrowthAnalytics.IGrowthAlertsService, GeoLeap.Api.Services.GrowthAnalytics.GrowthAlertsService>();

// User Behavior Analytics Services - Comprehensive user behavior tracking and analysis
builder.Services.AddScoped<GeoLeap.Api.Services.UserBehavior.IUserBehaviorAnalyticsService, GeoLeap.Api.Services.UserBehavior.UserBehaviorAnalyticsServiceV2>();
// Registered inside the ENABLE_BACKGROUND_SERVICES gate below

// Extended User Behavior Analytics Services - New comprehensive analytics system
builder.Services.AddScoped<IUserBehaviorService, UserBehaviorService>();
builder.Services.AddHttpContextAccessor(); // Required for UserBehaviorService

// SEO Services
builder.Services.AddScoped<ISeoMetadataService, SeoMetadataService>();
builder.Services.AddScoped<IStructuredDataService, StructuredDataService>();
builder.Services.AddScoped<ISitemapService, SitemapService>();
builder.Services.AddScoped<IPerformanceMonitoringService, PerformanceMonitoringService>();
builder.Services.AddScoped<ISeoAnalyticsService, SeoAnalyticsService>();
builder.Services.AddScoped<ISeoContentCachingService, SeoContentCachingService>();

// Programmatic SEO Services
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.ISeoTemplateService, GeoLeap.Api.ProgrammaticSeo.Services.SeoTemplateService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IKeywordResearchService, GeoLeap.Api.ProgrammaticSeo.Services.KeywordResearchService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IContentMetadataService, GeoLeap.Api.ProgrammaticSeo.Services.ContentMetadataService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.ISeoPerformanceService, GeoLeap.Api.ProgrammaticSeo.Services.SeoPerformanceService>();
// Only register SeoBackgroundJobService when Hangfire is enabled (not in development)
if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.ISeoBackgroundJobService, GeoLeap.Api.ProgrammaticSeo.Services.SeoBackgroundJobService>();
}

// Advanced SEO Services - US-7.3 Advanced Features
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IAdvancedKeywordResearchService, GeoLeap.Api.ProgrammaticSeo.Services.AdvancedKeywordResearchService>();
builder.Services.AddScoped<GeoLeap.Api.ProgrammaticSeo.Services.IAdvancedSeoTemplateService, GeoLeap.Api.ProgrammaticSeo.Services.AdvancedSeoTemplateService>();

// Add HttpClient for SEO services
builder.Services.AddHttpClient<GeoLeap.Api.ProgrammaticSeo.Services.ContentMetadataService>();
builder.Services.AddHttpClient<GeoLeap.Api.ProgrammaticSeo.Services.KeywordResearchService>();
builder.Services.AddHttpClient<GeoLeap.Api.ProgrammaticSeo.Services.SeoPerformanceService>();

// US-9.1 VPN Guidance System Services
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnProviderService, GeoLeap.Api.Services.VpnGuidanceServices.VpnProviderService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnRatingService, GeoLeap.Api.Services.VpnGuidanceServices.VpnRatingService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnAnalyticsService, GeoLeap.Api.Services.VpnGuidanceServices.VpnAnalyticsService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnStreamingCompatibilityService, GeoLeap.Api.Services.VpnGuidanceServices.VpnStreamingCompatibilityService>();

// Real VPN Testing Services - New Implementation
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnConnectionTestingService, GeoLeap.Api.Services.VpnGuidanceServices.VpnConnectionTestingService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IStreamingServiceTestingService, GeoLeap.Api.Services.VpnGuidanceServices.StreamingServiceTestingService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnProviderApiService, GeoLeap.Api.Services.VpnGuidanceServices.VpnProviderApiService>();
builder.Services.AddScoped<GeoLeap.Api.Services.VpnGuidanceServices.IVpnPerformanceMonitoringService, GeoLeap.Api.Services.VpnGuidanceServices.VpnPerformanceMonitoringService>();

// Configure VPN Provider API options
builder.Services.Configure<GeoLeap.Api.Services.VpnGuidanceServices.VpnProviderApiOptions>(
    builder.Configuration.GetSection("VpnProviderApi"));

// Add HttpClient for VPN testing services
builder.Services.AddHttpClient<GeoLeap.Api.Services.VpnGuidanceServices.VpnConnectionTestingService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
    client.DefaultRequestHeaders.Add("User-Agent", "GeoLeap-TestAgent/1.0");
});

builder.Services.AddHttpClient<GeoLeap.Api.Services.VpnGuidanceServices.StreamingServiceTestingService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
});

builder.Services.AddHttpClient<GeoLeap.Api.Services.VpnGuidanceServices.VpnProviderApiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "GeoLeap-API-Client/1.0");
});

// Additional VPN Services (service registrations - implementations exist via mocked interfaces)

// US-9.1 Streaming Deep Link Services
builder.Services.AddScoped<IStreamingDeepLinkService, StreamingDeepLinkService>();

// Add Hangfire for background jobs (only when explicitly enabled via ENABLE_HANGFIRE=true)
// RE-ENABLED: Week 1 Day 2 - Using PostgreSQL, Hangfire works properly
var enableHangfire = Environment.GetEnvironmentVariable("ENABLE_HANGFIRE");
if (builder.Environment.EnvironmentName != "Testing" && string.Equals(enableHangfire, "true", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")),
            new Hangfire.PostgreSql.PostgreSqlStorageOptions
            {
                QueuePollInterval = TimeSpan.FromSeconds(30)
            }));

    builder.Services.AddHangfireServer(options =>
    {
        options.WorkerCount = 2;
        options.Queues = new[] { "default", "critical", "background" };
        options.SchedulePollingInterval = TimeSpan.FromSeconds(30);
    });
}

// SEO services use the existing ApplicationDbContext - no separate context needed

// Add Backup and Disaster Recovery services
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<IDisasterRecoveryService, DisasterRecoveryService>();

// ASO (App Store Optimization) Services - FIXED: All interface methods now implemented with correct Guid userId signatures
builder.Services.AddScoped<IAsoService, AsoService>();

// Add SignalR for real-time admin notifications
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});

// Add Data Refresh services
builder.Services.Configure<RefreshConfiguration>(
    builder.Configuration.GetSection("RefreshConfiguration"));
builder.Services.AddScoped<IChangeDetector, ChangeDetector>();
builder.Services.AddScoped<IRefreshQueue, RefreshQueue>();
builder.Services.AddScoped<IDataRefreshOrchestrator, DataRefreshOrchestrator>();
builder.Services.AddScoped<IBatchRefreshProcessor, BatchRefreshProcessor>();

// Add background services only when explicitly enabled (disabled by default to reduce DB CPU on Neon)
var enableBackgroundServices = Environment.GetEnvironmentVariable("ENABLE_BACKGROUND_SERVICES");
if (builder.Environment.EnvironmentName != "Testing" && string.Equals(enableBackgroundServices, "true", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddHostedService<NotificationDigestService>();
    builder.Services.AddHostedService<GeoLeap.Api.Services.UserBehavior.UserBehaviorBackgroundService>();
    builder.Services.AddHostedService<CacheWarmingService>();
    builder.Services.AddHostedService<ProviderRegistrationService>();
    builder.Services.AddHostedService<DataQualityMonitor>();
    builder.Services.AddHostedService<RefreshProcessor>();
    builder.Services.AddHostedService<SubscriptionMonitoringService>();
    builder.Services.AddHostedService<WatchlistBackgroundService>();
    builder.Services.AddHostedService<TokenCleanupService>();
}

// Add Health Checks for Kubernetes/Docker orchestration
// Liveness probe: checks if app is running
// Readiness probe: checks if app is ready to serve requests (DB, Redis, etc.)
var healthChecks = builder.Services.AddHealthChecks();

var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(dbConnectionString))
{
    healthChecks.AddNpgSql(
        dbConnectionString,
        name: "database",
        failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
        tags: new[] { "ready", "db" });
}

var redisConnectionStringForHealth = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnectionStringForHealth))
{
    healthChecks.AddRedis(
        redisConnectionString: redisConnectionStringForHealth,
        name: "redis-cache",
        failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
        tags: new[] { "ready", "cache" });
}

healthChecks.AddCheck<GeoLeap.Api.HealthChecks.CustomHealthCheck>(
    name: "application",
    failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
    tags: new[] { "ready", "app" });

// Add Rate Limiting with comprehensive policies (disabled in Testing environment to prevent test failures)
if (builder.Environment.EnvironmentName != "Testing")
{
    builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100, // Reduced from 1000 for better security
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0 // No queuing for global limiter
            });
    });

    // Authentication endpoints - STRICT LIMITS
    options.AddPolicy("AuthPolicy", context =>
    {
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5, // Only 5 auth attempts per minute per IP
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // Search API rate limiting policy
    options.AddPolicy("SearchPolicy", context =>
    {
        return RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new SlidingWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 50, // Reduced from 200 for better security
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 2,
                QueueLimit = 0
            });
    });

    // Content API rate limiting policy
    options.AddPolicy("ContentPolicy", context =>
    {
        return RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new SlidingWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 50, // Reduced from 100 for better security
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 2,
                QueueLimit = 0
            });
    });

    // SEO API rate limiting policy
    options.AddPolicy("SeoApiPolicy", context =>
    {
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100, // Reduced from 300 for better security
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // Default policy - fallback for endpoints that don't specify a policy
    // BUG FIX: Some endpoints may request "DefaultPolicy" which wasn't previously defined
    options.AddPolicy("DefaultPolicy", context =>
    {
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100, // General default: 100 requests per minute
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // Configure rejection response
    options.OnRejected = async (context, _) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = retryAfter.TotalSeconds.ToString();
        }

        await context.HttpContext.Response.WriteAsync(
            System.Text.Json.JsonSerializer.Serialize(new
            {
                Success = false,
                Message = "Rate limit exceeded. Please try again later.",
                StatusCode = 429
            })
        );
    };
    });
}

var app = builder.Build();

// Configure the HTTP request pipeline.

// CRITICAL: Enable request body buffering for webhook endpoints FIRST
// This must be before ANY other middleware that might read the body
// Stripe webhook signature verification requires the raw, unmodified body
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/webhooks"))
    {
        context.Request.EnableBuffering();
    }
    await next();
});

// Correlation ID middleware (should be first for request tracking)
app.UseMiddleware<CorrelationIdMiddleware>();

// Week 3 Day 3 - Response compression (early in pipeline for maximum effectiveness)
app.UseResponseCompression();

// Output Caching middleware (.NET 9 - high-performance caching)
app.UseOutputCache();

// Request logging middleware (after correlation ID)
app.ConfigureRequestLogging();

// Request/Response logging middleware - DISABLED due to response buffering bug
// Bug causes empty response bodies when middleware replaces context.Response.Body stream
//if (app.Environment.IsDevelopment())
//{
//    app.UseMiddleware<RequestResponseLoggingMiddleware>();
//}

// E2E Bug Fix Phase 2: Reordered middleware pipeline
// CORS must come EARLY before any security checks block preflight requests
if (app.Environment.IsDevelopment())
{
    app.UseCors("Development");
}
else
{
    app.UseCors("Production");
}

// Security headers (early but after CORS)
app.UseMiddleware<SecurityHeadersMiddleware>();

// Session (needed for auth cookies and CSRF)
app.UseSession();

// Authentication and Authorization - BEFORE error handling
// This ensures proper 401/403 responses instead of generic 500 errors
app.UseAuthentication();
app.UseAuthorization();

// Error handling - AFTER auth so auth exceptions are properly handled
if (!string.IsNullOrEmpty(sentryDsn))
{
    app.UseSentryTracing();
}
app.UseMiddleware<ErrorHandlingMiddleware>();

// Security validation and input validation
app.UseMiddleware<SecurityValidationMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<InputValidationMiddleware>();

// Enable Swagger UI in all environments (with authentication in production)
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "GeoLeap API v1");
    options.RoutePrefix = "swagger"; // Swagger UI at /swagger
    options.DocumentTitle = "GeoLeap API Documentation";
    options.DisplayRequestDuration();
    options.EnableDeepLinking();
    options.EnableFilter();
    options.EnableTryItOutByDefault();

    // Customize the UI
    options.DefaultModelsExpandDepth(2);
    options.DefaultModelRendering(Swashbuckle.AspNetCore.SwaggerUI.ModelRendering.Model);
    options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    options.DisplayOperationId();
});

// HTTPS redirection - RE-ENABLED for production (Week 1 Day 2)
// Keep disabled in development for easier local testing
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Rate limiting (disabled in Testing environment)
if (app.Environment.EnvironmentName != "Testing")
{
    app.UseRateLimiter();
}

// Rate limiting for login attempts
app.UseMiddleware<LoginRateLimitMiddleware>();

// Rate limiting for password reset attempts (prevents distributed attacks)
app.UseMiddleware<PasswordResetRateLimitMiddleware>();


// Additional security headers middleware (after authentication)
app.Use(async (context, next) =>
{
    // Additional security headers not covered by SecurityHeadersMiddleware

    // Only add Strict-Transport-Security in production with HTTPS
    if (!app.Environment.IsDevelopment() && context.Request.IsHttps)
    {
        context.Response.Headers.TryAdd("Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload");
    }

    // Prevent caching of authentication-related responses
    if (context.Request.Path.StartsWithSegments("/api/auth"))
    {
        context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
        context.Response.Headers["Pragma"] = "no-cache";
        context.Response.Headers["Expires"] = "0";
    }

    await next();
});

// RBAC Authorization Middleware - RE-ENABLED (Week 1 Day 2)
app.UseMiddleware<AuthorizationMiddleware>();

// Content Filtering Middleware (after authentication, applies user preferences)
app.UseContentFiltering();

app.MapControllers();

// US-9.1: Map VPN Guidance minimal API endpoints
app.MapVpnGuidanceEndpoints();

// Affiliate Admin endpoints
app.MapAffiliateAdminEndpoints();

// Lead capture endpoints (email capture from marketing pages)
app.MapLeadEndpoints();

// Map Health Check Endpoints for Kubernetes/Docker orchestration
// /health/live - Liveness probe: checks if app is running (always returns healthy if app is running)
// /health/ready - Readiness probe: checks if app can serve requests (checks DB, Redis, etc.)
// /health - Full health check with detailed JSON response including all dependencies
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // Liveness only checks if app is running (no dependency checks)
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"), // Only check dependencies tagged with "ready"
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse // Detailed JSON response
});

app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse // Full detailed health check JSON
});

// Map content routes for SEO-friendly URLs
app.MapGet("/content/{slug}", async (string slug, IContentService contentService) =>
{
    // Determine content type from slug or use default logic
    var contentType = slug.Contains("-tv") || slug.Contains("-series") ? "tv" : "movie";
    var content = await contentService.GetContentBySlugAsync(contentType, slug);
    
    if (content == null)
    {
        // Try alternate content type
        contentType = contentType == "movie" ? "tv" : "movie";
        content = await contentService.GetContentBySlugAsync(contentType, slug);
    }
    
    return content != null ? Results.Ok(content) : Results.NotFound();
});

app.MapGet("/content/{type}/{slug}", async (string type, string slug, IContentService contentService) =>
{
    var content = await contentService.GetContentBySlugAsync(type, slug);
    return content != null ? Results.Ok(content) : Results.NotFound();
});

// Map SignalR hubs for real-time admin features
app.MapHub<AdminHub>("/admin-hub");

// Map Watchlist SignalR hub for real-time updates
app.MapHub<WatchlistHub>("/watchlist-hub");

// Map User Behavior SignalR hub for real-time analytics updates
app.MapHub<UserBehaviorHub>("/user-behavior-hub");

// Map Monitoring SignalR hub for real-time monitoring updates
app.MapHub<MonitoringHub>("/monitoring-hub");

// Preference endpoints are handled by PreferencesController (api/preferences)
// No additional minimal-API mapping required.

// Run database migrations (skip when SKIP_DB_MIGRATIONS=true for DB-only deploy workflow)
var skipMigrations = Environment.GetEnvironmentVariable("SKIP_DB_MIGRATIONS");
if (app.Environment.EnvironmentName != "Testing" && skipMigrations != "true")
{
    try
    {
        var migrationTimeout = GetMigrationTimeout(app.Environment);
        using var migrationCts = new CancellationTokenSource(migrationTimeout);
        using var migrationScope = app.Services.CreateScope();
        var db = migrationScope.ServiceProvider.GetRequiredService<GeoLeap.Api.Data.ApplicationDbContext>();
        db.Database.SetCommandTimeout(migrationTimeout);
        await db.Database.MigrateAsync(migrationCts.Token);
        if (app.Environment.IsProduction())
        {
            await AssertRequiredProductionIndexesAsync(db, migrationCts.Token);
        }
        Log.Information("Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        Log.Fatal(ex, "Database migration failed at startup");
        throw;
    }
}
else if (skipMigrations == "true")
{
    if (app.Environment.IsProduction())
    {
        Log.Fatal("SKIP_DB_MIGRATIONS=true is not allowed in Production");
        throw new InvalidOperationException("SKIP_DB_MIGRATIONS=true is not allowed in Production.");
    }

    Log.Information("Database migrations skipped (SKIP_DB_MIGRATIONS=true)");
}

static TimeSpan GetMigrationTimeout(IWebHostEnvironment environment)
{
    var configuredSeconds = Environment.GetEnvironmentVariable("DB_MIGRATION_TIMEOUT_SECONDS");
    if (int.TryParse(configuredSeconds, out var seconds) && seconds > 0)
    {
        return TimeSpan.FromSeconds(seconds);
    }

    return environment.IsProduction()
        ? TimeSpan.FromMinutes(10)
        : TimeSpan.FromSeconds(30);
}

static async Task AssertRequiredProductionIndexesAsync(GeoLeap.Api.Data.ApplicationDbContext db, CancellationToken cancellationToken)
{
    var requiredIndexes = new[]
    {
        "IX_MobileSubscriptions_TransactionId",
        "IX_MobileSubscriptions_OriginalTransactionId",
        "IX_MobileSubscriptions_PurchaseToken"
    };

    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State == System.Data.ConnectionState.Closed;
    if (shouldClose)
    {
        await connection.OpenAsync(cancellationToken);
    }

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = ANY (current_schemas(false))
              AND tablename = 'MobileSubscriptions'
              AND indexname IN (
                  'IX_MobileSubscriptions_TransactionId',
                  'IX_MobileSubscriptions_OriginalTransactionId',
                  'IX_MobileSubscriptions_PurchaseToken'
              );
            """;

        var foundIndexes = new HashSet<string>(StringComparer.Ordinal);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            foundIndexes.Add(reader.GetString(0));
        }

        var missingIndexes = requiredIndexes.Where(index => !foundIndexes.Contains(index)).ToArray();
        if (missingIndexes.Length > 0)
        {
            throw new InvalidOperationException(
                $"Required production replay-prevention indexes are missing: {string.Join(", ", missingIndexes)}");
        }
    }
    finally
    {
        if (shouldClose)
        {
            await connection.CloseAsync();
        }
    }
}

// Seed test users for development (skip for testing environment)
if (app.Environment.EnvironmentName != "Testing" && app.Environment.IsDevelopment())
{
    try
    {
        await GeoLeap.Api.Data.TestUserSeeder.SeedTestUsersAsync(app.Services);

        // Seed sample content for E2E testing
        using var scope = app.Services.CreateScope();
        var seederService = scope.ServiceProvider.GetRequiredService<GeoLeap.Api.Data.Services.IDatabaseSeederService>();
        await seederService.SeedContentAsync();
        Log.Information("Sample content seeded for E2E testing");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error seeding test data");
    }
}

// Configure Hangfire dashboard AFTER database is created (only in production with Hangfire enabled)
if (app.Environment.EnvironmentName != "Testing" && !app.Environment.IsDevelopment() && string.Equals(Environment.GetEnvironmentVariable("ENABLE_HANGFIRE"), "true", StringComparison.OrdinalIgnoreCase))
{
    app.UseHangfireDashboard("/admin/jobs", new DashboardOptions
    {
        Authorization = new[] { new HangfireDashboardAuthorizationFilter() }
    });

    // Initialize SEO background jobs AFTER migrations
    using (var scope = app.Services.CreateScope())
    {
        var seoJobService = scope.ServiceProvider.GetRequiredService<GeoLeap.Api.ProgrammaticSeo.Services.ISeoBackgroundJobService>();
        await seoJobService.InitializeRecurringJobsAsync();

        // SEO models are part of ApplicationDbContext - no separate initialization needed
    }
}

// Initialize default preferences (all environments except Testing)
// Idempotent: skips seeding if preference categories already exist.
if (app.Environment.EnvironmentName != "Testing")
{
    try
    {
        using var prefScope = app.Services.CreateScope();
        var prefService = prefScope.ServiceProvider.GetRequiredService<IPreferenceService>();
        await prefService.SeedDefaultPreferencesAsync();
        Log.Information("Default preferences initialized");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Failed to initialize default preferences — non-fatal, continuing startup");
    }
}

Log.Information("GeoLeap API application started successfully");

app.Run();

}
catch (Exception ex)
{
    Console.Error.WriteLine($"[GeoLeap] FATAL: {ex}");
    Log.Fatal(ex, "GeoLeap API application terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

// Make Program accessible for testing in .NET 9
// CRITICAL: The partial Program class enables WebApplicationFactory<Program> access
public partial class Program
{
    /// <summary>
    /// Shared EF Core + Npgsql configuration for both DbContext and DbContextFactory.
    /// Keeps connection settings in sync and avoids duplication.
    /// </summary>
    internal static void ConfigureNpgsqlOptions(
        DbContextOptionsBuilder options, string connectionString, WebApplicationBuilder builder)
    {
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.CommandTimeout(30);
            npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            npgsqlOptions.MaxBatchSize(100);
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
            npgsqlOptions.MigrationsAssembly("GeoLeap.Api");
        });

        options.EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
        options.EnableDetailedErrors(builder.Environment.IsDevelopment());
        options.EnableServiceProviderCaching();
        options.EnableThreadSafetyChecks(builder.Environment.IsDevelopment());
        options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
    }
}

// VPN Services
