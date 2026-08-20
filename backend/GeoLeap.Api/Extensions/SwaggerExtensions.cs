using Swashbuckle.AspNetCore.SwaggerGen;
using System.Reflection;

namespace GeoLeap.Api.Extensions;

public static class SwaggerExtensions
{
    public static IServiceCollection AddEnhancedSwagger(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            var info = new Microsoft.OpenApi.OpenApiInfo();
            info.Title = "GeoLeap API";
            info.Version = "v1";
            info.Description = @"Comprehensive API for GeoLeap platform providing:
- Content discovery across movies and TV shows
- Streaming availability information for 50+ services
- VPN recommendations based on streaming needs
- User authentication and profile management
- Personalized watchlists and recommendations
- Real-time availability monitoring

**Base URL**: `https://api.geoleap.com` (Production) | `http://localhost:8020` (Development)";

            var contact = new Microsoft.OpenApi.OpenApiContact();
            contact.Name = "GeoLeap Support";
            contact.Email = "support@geoleap.com";
            contact.Url = new Uri("https://geoleap.com/support");
            info.Contact = contact;

            var license = new Microsoft.OpenApi.OpenApiLicense();
            license.Name = "Proprietary";
            license.Url = new Uri("https://geoleap.com/license");
            info.License = license;

            options.SwaggerDoc("v1", info);

            // Add JWT authentication to Swagger
            var securityScheme = new Microsoft.OpenApi.OpenApiSecurityScheme();
            securityScheme.Description = @"JWT Authorization header using the Bearer scheme.

**How to use**:
1. Register or login using the `/api/auth/register` or `/api/auth/login` endpoints
2. Copy the `accessToken` from the response
3. Click the 'Authorize' button below
4. Enter: `Bearer {your_token}` (include the word 'Bearer' followed by a space and your token)
5. Click 'Authorize' and then 'Close'

**Example**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`";
            securityScheme.Name = "Authorization";
            securityScheme.In = Microsoft.OpenApi.ParameterLocation.Header;
            securityScheme.Type = Microsoft.OpenApi.SecuritySchemeType.ApiKey;
            securityScheme.Scheme = "Bearer";
            securityScheme.BearerFormat = "JWT";

            options.AddSecurityDefinition("Bearer", securityScheme);

            // Enable annotations
            options.EnableAnnotations();

            // Include XML comments if available
            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
            {
                options.IncludeXmlComments(xmlPath);
            }

            // Add schema examples
            options.EnableAnnotations(enableAnnotationsForInheritance: true, enableAnnotationsForPolymorphism: true);

            // Customize schema IDs to avoid conflicts
            options.CustomSchemaIds(type => type.FullName?.Replace("+", "."));
        });

        return services;
    }
}
