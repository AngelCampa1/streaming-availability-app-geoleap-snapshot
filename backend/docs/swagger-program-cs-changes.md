# Program.cs Changes for Enhanced Swagger

## Change 1: Replace AddOpenApi with AddEnhancedSwagger

**Find (around line 39)**:
```csharp
// Add services to the container.
builder.Services.AddOpenApi();
```

**Replace with**:
```csharp
// Add services to the container.
// Add enhanced Swagger/OpenAPI documentation
builder.Services.AddEnhancedSwagger();
```

## Change 2: Replace MapOpenApi with Swagger UI Configuration

**Find (around line 1011-1014)**:
```csharp
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
```

**Replace with**:
```csharp
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
```

## Instructions

Due to file locking issues during automated editing, please manually apply these changes to `Program.cs`:
1. Open `backend/GeoLeap.Api/Program.cs`
2. Make Change 1 around line 39
3. Make Change 2 around line 1011-1014
4. Save the file
