# GeoLeap RBAC System Documentation

## Overview

The GeoLeap Role-Based Access Control (RBAC) system provides comprehensive permission management for the application, ensuring secure access to features and data based on user roles and permissions.

## Architecture

The RBAC system consists of the following core components:

### Database Schema

#### Users Table
Stores user account information and authentication data.

```sql
Users (
    Id uniqueidentifier PRIMARY KEY,
    Email nvarchar(256) NOT NULL UNIQUE,
    PasswordHash nvarchar(256) NOT NULL,
    FirstName nvarchar(100) NOT NULL,
    LastName nvarchar(100) NOT NULL,
    IsActive bit NOT NULL DEFAULT 1,
    EmailConfirmed bit NOT NULL DEFAULT 0,
    CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
    LastLoginAt datetime2 NULL
)
```

#### Roles Table
Defines system and custom roles with hierarchy support.

```sql
Roles (
    Id uniqueidentifier PRIMARY KEY,
    Name nvarchar(100) NOT NULL UNIQUE,
    Description nvarchar(500) NOT NULL,
    IsSystemRole bit NOT NULL DEFAULT 0,
    Priority int NOT NULL DEFAULT 1000,
    IsActive bit NOT NULL DEFAULT 1,
    CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt datetime2 NOT NULL DEFAULT GETUTCDATE()
)
```

**Priority System**: Lower numbers = higher privilege (SuperAdmin = 1, Admin = 10, Premium = 100, User = 500, Guest = 1000)

#### Permissions Table
Defines granular permissions using resource:action format.

```sql
Permissions (
    Id uniqueidentifier PRIMARY KEY,
    Name nvarchar(100) NOT NULL UNIQUE,
    Resource nvarchar(100) NOT NULL,
    Action nvarchar(100) NOT NULL,
    Description nvarchar(500) NOT NULL,
    IsActive bit NOT NULL DEFAULT 1,
    CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE()
)
```

#### UserRoles Table
Links users to roles with audit information.

```sql
UserRoles (
    Id uniqueidentifier PRIMARY KEY,
    UserId uniqueidentifier NOT NULL FOREIGN KEY REFERENCES Users(Id),
    RoleId uniqueidentifier NOT NULL FOREIGN KEY REFERENCES Roles(Id),
    AssignedBy uniqueidentifier NULL FOREIGN KEY REFERENCES Users(Id),
    AssignedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt datetime2 NULL,
    IsActive bit NOT NULL DEFAULT 1,
    UNIQUE(UserId, RoleId)
)
```

#### RolePermissions Table
Links roles to permissions.

```sql
RolePermissions (
    Id uniqueidentifier PRIMARY KEY,
    RoleId uniqueidentifier NOT NULL FOREIGN KEY REFERENCES Roles(Id),
    PermissionId uniqueidentifier NOT NULL FOREIGN KEY REFERENCES Permissions(Id),
    GrantedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
    GrantedBy uniqueidentifier NULL,
    IsActive bit NOT NULL DEFAULT 1,
    UNIQUE(RoleId, PermissionId)
)
```

#### UserAuditLogs Table
Comprehensive audit logging for all RBAC operations.

```sql
UserAuditLogs (
    Id uniqueidentifier PRIMARY KEY,
    UserId uniqueidentifier NOT NULL FOREIGN KEY REFERENCES Users(Id),
    AffectedUserId uniqueidentifier NULL FOREIGN KEY REFERENCES Users(Id),
    RoleId uniqueidentifier NULL FOREIGN KEY REFERENCES Roles(Id),
    PermissionId uniqueidentifier NULL FOREIGN KEY REFERENCES Permissions(Id),
    Action nvarchar(100) NOT NULL,
    Resource nvarchar(100) NOT NULL,
    Details nvarchar(1000) NOT NULL,
    IpAddress nvarchar(50) NOT NULL,
    UserAgent nvarchar(500) NOT NULL,
    Success bit NOT NULL DEFAULT 1,
    Timestamp datetime2 NOT NULL DEFAULT GETUTCDATE()
)
```

## System Roles

### Guest (Priority: 1000)
- **Description**: Unauthenticated users with minimal access
- **Permissions**: Public content access only
- **Use Case**: Visitors browsing public content

### User (Priority: 500)
- **Description**: Authenticated users with basic search access
- **Permissions**:
  - `content:search:basic` - Basic search with paywall
  - `user:profile:view` - View own profile
  - `user:profile:edit` - Edit own profile
  - `user:preferences:manage` - Manage user preferences

### Premium (Priority: 100)
- **Description**: Premium subscribers with full content access
- **Permissions**: All User permissions plus:
  - `content:search:full` - Full search results access
  - `content:details:view` - View detailed content information
  - `user:watchlist:manage` - Manage personal watchlist

### Admin (Priority: 10)
- **Description**: System administrators with user management capabilities
- **Permissions**: All Premium permissions plus:
  - `admin:users:view` - View all users
  - `admin:users:manage` - Create, update, delete users
  - `admin:system:configure` - System configuration access
  - `admin:analytics:view` - Access analytics dashboards

### SuperAdmin (Priority: 1)
- **Description**: Super administrators with full system access
- **Permissions**: All permissions, including:
  - `admin:roles:manage` - Manage roles and permissions

## Backend Implementation

### RBAC Service (IRbacService)

The core service providing permission checking and role management:

```csharp
public interface IRbacService
{
    Task<bool> HasPermissionAsync(Guid userId, string permission);
    Task<bool> HasPermissionAsync(Guid userId, string resource, string action);
    Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId);
    Task<IEnumerable<Role>> GetUserRolesAsync(Guid userId);
    Task<bool> AssignRoleAsync(Guid userId, string roleName, Guid? assignedBy = null);
    Task<bool> RemoveRoleAsync(Guid userId, string roleName, Guid? removedBy = null);
    Task<bool> IsInRoleAsync(Guid userId, string roleName);
    Task LogAccessAttemptAsync(Guid userId, string resource, string action, bool success, string? details = null, string? ipAddress = null, string? userAgent = null);
    Task<User?> GetUserWithRolesAsync(Guid userId);
    Task<bool> CanAccessResourceAsync(Guid userId, string resource, string action);
}
```

### Authorization Middleware

Protects API endpoints with automatic permission checking:

```csharp
app.UseMiddleware<AuthorizationMiddleware>();
```

**Route-based Permission Mapping:**
- `/api/admin/users` → `admin:users:view` (GET) / `admin:users:manage` (POST/PUT/DELETE)
- `/api/admin/roles` → `admin:roles:manage`
- `/api/content/search` → `content:search:basic`
- `/api/user/profile` → `user:profile:view` (GET) / `user:profile:edit` (PUT)

### RequirePermission Attribute

Declarative authorization for controllers and actions:

```csharp
[RequirePermission("admin:users:view")]
public async Task<ActionResult> GetUsers()
{
    // Method implementation
}

[RequirePermission("content", "search:full")]
public async Task<ActionResult> SearchFull(string query)
{
    // Method implementation
}
```

### Admin API Endpoints

Complete REST API for user and role management:

```csharp
// User Management
GET /api/admin/users              // List all users with pagination
GET /api/admin/users/{id}         // Get specific user details
POST /api/admin/users/{id}/roles  // Assign role to user
DELETE /api/admin/users/{id}/roles/{roleName}  // Remove role from user

// Role Management
GET /api/admin/roles             // List all roles with permissions
GET /api/admin/permissions       // List all available permissions

// Audit Logging
GET /api/admin/audit-logs        // List audit logs with filtering
```

## Frontend Implementation

### AuthContext and Provider

Centralized authentication and permission state management:

```tsx
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <YourAppComponents />
    </AuthProvider>
  );
}

function SomeComponent() {
  const { user, hasPermission, hasRole, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      {hasPermission('admin:users:view') && (
        <Link href="/admin">Admin Panel</Link>
      )}
    </div>
  );
}
```

### Permission Guard Components

Conditional rendering based on permissions:

```tsx
import { PermissionGuard, AdminOnly, PremiumOnly } from '@/components/auth/PermissionGuard';

// Generic permission checking
<PermissionGuard permissions="content:search:full" fallback={<PremiumUpgrade />}>
  <FullSearchResults />
</PermissionGuard>

// Multiple permissions (any)
<PermissionGuard permissions={['admin:users:view', 'admin:roles:manage']}>
  <AdminPanel />
</PermissionGuard>

// Multiple permissions (all required)
<PermissionGuard permissions={['admin:users:view', 'admin:users:manage']} requireAll>
  <UserManagementPanel />
</PermissionGuard>

// Role-based checking
<PermissionGuard roles="Admin" fallback={<AccessDenied />}>
  <AdminFeatures />
</PermissionGuard>

// Convenience components
<AdminOnly fallback={<AccessDenied />}>
  <AdminDashboard />
</AdminOnly>

<PremiumOnly fallback={<UpgradePrompt />}>
  <PremiumFeatures />
</PremiumOnly>
```

### usePermissions Hook

Comprehensive permission checking utilities:

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function NavigationMenu() {
  const {
    canViewUsers,
    canManageUsers,
    isAdmin,
    isPremium,
    canAccessAdminPanel,
    hasFullContentAccess,
  } = usePermissions();

  return (
    <nav>
      <Link href="/">Home</Link>
      {isPremium && <Link href="/premium">Premium Features</Link>}
      {canAccessAdminPanel && <Link href="/admin">Admin</Link>}
    </nav>
  );
}
```

### Admin Interface Components

Complete admin panel for user and role management:

- **Admin Dashboard**: Overview statistics and quick actions
- **User Management**: List, search, and assign roles to users
- **Role Management**: View roles, permissions, and user counts
- **Audit Logs**: Review access attempts and administrative actions

## Permission Categories

### Content Access Permissions
- `content:search:basic` - Basic search with paywall restrictions
- `content:search:full` - Full search results without restrictions
- `content:details:view` - View detailed content information and metadata

### User Management Permissions
- `user:profile:view` - View own user profile
- `user:profile:edit` - Edit own user profile
- `user:watchlist:manage` - Manage personal watchlist
- `user:preferences:manage` - Manage user preferences and settings

### Administrative Permissions
- `admin:users:view` - View all users in the system
- `admin:users:manage` - Create, update, and delete user accounts
- `admin:roles:manage` - Manage roles and permission assignments
- `admin:system:configure` - Access system configuration settings
- `admin:analytics:view` - Access analytics dashboards and reports

## Security Features

### Opt-out Security Model
- All API endpoints are protected by default
- Public endpoints must be explicitly whitelisted
- Reduces risk of accidentally exposing protected resources

### Comprehensive Audit Logging
- All permission checks are logged with user, IP, and timestamp
- Role assignments and removals are tracked with who made the change
- Failed access attempts are logged for security monitoring
- Audit logs include correlation information for troubleshooting

### Permission Caching
- User permissions are cached in memory for performance
- Cache expires automatically after 15 minutes
- Cache is invalidated immediately when roles change
- Prevents database queries on every permission check

### Input Validation and Sanitization
- All user inputs are validated server-side
- SQL injection prevention through parameterized queries
- XSS protection with proper output encoding
- Rate limiting on authentication endpoints

## Usage Examples

### Backend Permission Checking

```csharp
// In a controller
[RequirePermission("content:search:full")]
public async Task<ActionResult<SearchResults>> SearchFull(string query)
{
    var results = await _searchService.SearchFullAsync(query);
    return Ok(results);
}

// In a service
public async Task<bool> CanUserAccessPremiumContent(Guid userId)
{
    return await _rbacService.HasPermissionAsync(userId, "content:search:full");
}

// Role assignment
await _rbacService.AssignRoleAsync(userId, "Premium", currentUserId);

// Audit logging
await _rbacService.LogAccessAttemptAsync(userId, "content", "search:full", true, 
    "Premium search executed successfully", ipAddress, userAgent);
```

### Frontend Permission Usage

```tsx
// Hook usage
const { canSearchFull, isPremium, hasPermission } = usePermissions();

// Component rendering
return (
  <div>
    {canSearchFull ? (
      <FullSearchInterface />
    ) : (
      <BasicSearchWithUpgrade />
    )}
    
    <PermissionGuard permissions="user:watchlist:manage">
      <WatchlistButton contentId={content.id} />
    </PermissionGuard>
    
    <AdminOnly>
      <AdminToolbar />
    </AdminOnly>
  </div>
);

// API calls with permission context
const { user, isAuthenticated } = useAuth();

if (isAuthenticated && user.permissions.includes('content:search:full')) {
  const results = await apiCall('/api/content/search/full', { query });
} else {
  const results = await apiCall('/api/content/search/basic', { query });
}
```

## Testing

### Backend Tests
- Unit tests for RbacService covering all permission scenarios
- Integration tests for authorization middleware
- Controller tests with mocked RBAC service
- Database seed data tests for role/permission integrity

### Frontend Tests
- Component tests for PermissionGuard with various scenarios
- Hook tests for usePermissions and useAuth
- Integration tests for admin interface workflows

## Performance Considerations

### Caching Strategy
- User permissions cached for 15 minutes in memory
- Role assignments cached separately from permissions
- Cache invalidation on role changes
- Monitoring cache hit rates for optimization

### Database Optimization
- Indexes on frequently queried columns (User.Email, Role.Name, Permission.Name)
- Composite indexes on junction tables (UserRoles, RolePermissions)
- Audit log indexes for timestamp-based queries
- Connection pooling for high-throughput scenarios

## Monitoring and Maintenance

### Audit Log Analysis
- Regular review of failed access attempts
- Monitoring for unusual permission usage patterns
- Automated alerts for suspicious activity
- Data retention policies for audit logs

### Permission Reviews
- Quarterly reviews of role assignments
- Regular cleanup of unused permissions
- Validation of permission inheritance chains
- Documentation updates for new permissions

## Future Extensibility

The RBAC system is designed for future expansion:

### Resource-Level Permissions
Support for granular resource access (e.g., per-content permissions)

### Time-Based Roles
Temporary role assignments with automatic expiration

### External Identity Integration
SAML, OAuth, and other identity provider integration

### Advanced Permission Policies
Conditional permissions based on context, time, or other factors

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user role assignments in admin panel
   - Verify permission mappings in RolePermissions table
   - Review audit logs for failed access attempts

2. **Cache Issues**
   - User permissions may be cached; wait 15 minutes or restart application
   - Role changes should invalidate cache immediately

3. **Database Constraint Errors**
   - Ensure foreign key relationships are maintained
   - Check for duplicate role assignments

### Debug Tools

- Admin audit log viewer for access pattern analysis
- Database queries for role/permission verification
- Logging configuration for detailed permission checks

This comprehensive RBAC system provides enterprise-level security and user management capabilities while maintaining flexibility for future enhancements.