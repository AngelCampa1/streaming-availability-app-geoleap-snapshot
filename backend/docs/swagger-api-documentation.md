# GeoLeap API - Swagger/OpenAPI Documentation Guide

## Overview

The GeoLeap API now features comprehensive Swagger/OpenAPI documentation that provides interactive API exploration, testing capabilities, and detailed endpoint descriptions.

## Accessing Swagger UI

### Development Environment
- **URL**: `http://localhost:8020/swagger`
- **Features**: Full interactive testing with authentication support

### Production Environment
- **URL**: `https://api.geoleap.com/swagger`
- **Features**: Read-only documentation (authentication required for testing)

## Key Features

### 1. Interactive API Testing
- Try out API endpoints directly from the browser
- Test request/response payloads
- View real-time responses
- Monitor request duration

### 2. JWT Authentication Support
- **Authorize Button**: Click to enter your Bearer token
- **Token Format**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **How to Get a Token**:
  1. Call `/api/auth/register` or `/api/auth/login`
  2. Copy the `accessToken` from the response
  3. Click "Authorize" button in Swagger UI
  4. Enter: `Bearer {your_token}`
  5. Click "Authorize" then "Close"

### 3. Comprehensive Documentation
- Detailed endpoint descriptions
- Request/response schemas
- Parameter documentation
- Error response codes
- XML comments from code

### 4. Schema Exploration
- View all data models
- Understand request/response structures
- See validation requirements
- Explore nested objects

## API Sections

### Authentication (`/api/auth`)
- **POST /api/auth/register** - Create new user account
- **POST /api/auth/login** - Authenticate and get access token
- **POST /api/auth/refresh** - Refresh expired access token
- **POST /api/auth/logout** - Invalidate current session
- **POST /api/auth/forgot-password** - Request password reset
- **POST /api/auth/reset-password** - Reset password with token

### Content Discovery (`/api/content`)
- **GET /api/content/search** - Search for movies and TV shows
- **GET /api/content/{id}** - Get detailed content information
- **GET /api/content/trending** - Get trending content
- **GET /api/content/popular** - Get popular content
- **GET /api/content/recommendations** - Get personalized recommendations

### Streaming Availability (`/api/streaming`)
- **GET /api/streaming/availability/{contentId}** - Get streaming availability
- **GET /api/streaming/services** - List supported streaming services
- **GET /api/streaming/by-service/{serviceId}** - Get content by streaming service
- **POST /api/streaming/subscriptions** - Add user streaming subscription

### VPN Guidance (`/api/vpn`)
- **GET /api/vpn/providers** - List VPN providers
- **GET /api/vpn/recommendations** - Get VPN recommendations
- **GET /api/vpn/compatibility/{providerId}** - Check VPN-streaming compatibility
- **POST /api/vpn/test-connection** - Test VPN connection
- **GET /api/vpn/performance/{providerId}** - Get VPN performance metrics

### Watchlist (`/api/watchlist`)
- **GET /api/watchlist** - Get user's watchlist
- **POST /api/watchlist** - Add content to watchlist
- **DELETE /api/watchlist/{contentId}** - Remove from watchlist
- **GET /api/watchlist/notifications** - Get availability notifications

### User Profile (`/api/user`)
- **GET /api/user/profile** - Get user profile
- **PUT /api/user/profile** - Update user profile
- **GET /api/user/preferences** - Get user preferences
- **PUT /api/user/preferences** - Update user preferences
- **DELETE /api/user/account** - Delete user account (GDPR)

### Subscriptions (`/api/subscriptions`)
- **GET /api/subscriptions/plans** - Get available subscription plans
- **POST /api/subscriptions/checkout** - Create checkout session
- **GET /api/subscriptions/current** - Get current subscription
- **POST /api/subscriptions/cancel** - Cancel subscription
- **GET /api/subscriptions/invoices** - Get billing invoices

## Common Response Codes

### Success Codes
- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **204 No Content** - Request succeeded with no response body

### Client Error Codes
- **400 Bad Request** - Invalid input parameters or validation errors
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - Valid token but insufficient permissions
- **404 Not Found** - Requested resource not found
- **409 Conflict** - Resource already exists (e.g., duplicate email)
- **429 Too Many Requests** - Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error** - Unexpected server error occurred
- **503 Service Unavailable** - Service temporarily unavailable

## Rate Limiting

### Default Limits
- **Global**: 1000 requests per minute per user/IP
- **Search endpoints**: 200 requests per minute
- **Content endpoints**: 100 requests per minute
- **SEO API**: 300 requests per minute

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field1": ["Error message 1", "Error message 2"],
    "field2": ["Error message"]
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "correlationId": "abc123-def456-ghi789"
}
```

## Best Practices

### 1. Authentication
- Store JWT tokens securely (never in localStorage for sensitive apps)
- Refresh tokens before they expire
- Handle 401 responses by re-authenticating
- Clear tokens on logout

### 2. Error Handling
- Always check the `success` field in responses
- Log `correlationId` for support requests
- Handle rate limit errors with exponential backoff
- Display user-friendly error messages

### 3. Performance
- Use pagination for list endpoints
- Cache responses when appropriate
- Minimize unnecessary API calls
- Use ETags for conditional requests

### 4. Testing
- Test in development environment first
- Use Swagger UI for quick testing
- Verify all error scenarios
- Test rate limiting behavior

## Configuration Files

### Backend Configuration
- **Swagger Extensions**: `backend/GeoLeap.Api/Extensions/SwaggerExtensions.cs`
- **Program.cs Swagger Setup**: Lines 39-40 (AddEnhancedSwagger)
- **Program.cs Swagger UI**: Lines 1013-1027 (UseSwagger/UseSwaggerUI)
- **XML Documentation**: Enabled in `GeoLeap.Api.csproj`

### Package Dependencies
```xml
<PackageReference Include="Swashbuckle.AspNetCore" Version="10.0.1" />
<PackageReference Include="Swashbuckle.AspNetCore.Annotations" Version="10.0.1" />
<PackageReference Include="Swashbuckle.AspNetCore.Filters" Version="10.0.0" />
```

## Adding Controller Documentation

### Basic Example
```csharp
/// <summary>
/// Get content by ID
/// </summary>
/// <param name="id">Content ID</param>
/// <returns>Content details</returns>
/// <response code="200">Content found</response>
/// <response code="404">Content not found</response>
[HttpGet("{id}")]
[ProducesResponseType(typeof(ContentResponse), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
public async Task<IActionResult> GetContent(int id)
{
    // Implementation
}
```

### Using Swagger Annotations
```csharp
[HttpPost]
[SwaggerOperation(
    Summary = "Create new content",
    Description = "Creates a new content item with full metadata",
    OperationId = "CreateContent",
    Tags = new[] { "Content Management" }
)]
[SwaggerResponse(201, "Content created successfully", typeof(ContentResponse))]
[SwaggerResponse(400, "Invalid input", typeof(ApiErrorResponse))]
public async Task<IActionResult> CreateContent([FromBody] CreateContentRequest request)
{
    // Implementation
}
```

## Customization Options

### Swagger UI Customization
The Swagger UI is configured in `Program.cs` with:
- Deep linking enabled
- Filtering enabled
- Try-it-out enabled by default
- Request duration display
- Model expansion depth: 2 levels
- Operation IDs displayed

### Schema Customization
- Inheritance and polymorphism annotations enabled
- Custom schema IDs to avoid naming conflicts
- XML comments included when available

## Troubleshooting

### Swagger UI Not Loading
1. Check that the application is running
2. Verify the URL is `/swagger` not `/api/swagger`
3. Check browser console for JavaScript errors
4. Clear browser cache

### Authentication Not Working
1. Verify token format: `Bearer {token}` (with space)
2. Check token hasn't expired
3. Ensure token was obtained from login/register
4. Try logging out and back in

### Missing Endpoint Documentation
1. Ensure XML documentation is enabled in csproj
2. Add XML comments to controller methods
3. Rebuild the project
4. Clear Swagger cache

### Build Errors
1. Verify all Swashbuckle packages are installed
2. Check Program.cs has correct using statements
3. Ensure SwaggerExtensions.cs is in Extensions folder
4. Run `dotnet restore` and `dotnet build`

## Support

For issues or questions:
- **Documentation**: https://geoleap.com/docs/api
- **Support Email**: support@geoleap.com
- **GitHub Issues**: https://github.com/geoleap/api/issues

## Version History

### v1.0.0 (2025-01-15)
- Initial Swagger/OpenAPI implementation
- JWT authentication support
- Comprehensive endpoint documentation
- Interactive API testing
- XML comment integration
- Custom schema generation
