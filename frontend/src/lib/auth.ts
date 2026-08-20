export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailConfirmed: boolean;
  roles: string[];
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiration?: string;
  errors?: string[];
}

export interface AuthContext {
  user: User | null;
  permissions: string[];
  roles: string[];
  login: (email: string, password: string, rememberMe?: boolean, redirectTo?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string
  ) => Promise<AuthResponse>;
  logoutAllSessions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiring: boolean;
  extendSession: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const DEFAULT_PERMISSIONS = {
  // Content Access
  CONTENT_SEARCH_BASIC: 'content:search:basic',
  CONTENT_SEARCH_FULL: 'content:search:full',
  CONTENT_DETAILS_VIEW: 'content:details:view',

  // User Management
  USER_PROFILE_VIEW: 'user:profile:view',
  USER_PROFILE_EDIT: 'user:profile:edit',
  USER_WATCHLIST_MANAGE: 'user:watchlist:manage',
  USER_PREFERENCES_MANAGE: 'user:preferences:manage',

  // Admin Permissions
  ADMIN_USERS_VIEW: 'admin:users:view',
  ADMIN_USERS_MANAGE: 'admin:users:manage',
  ADMIN_ROLES_MANAGE: 'admin:roles:manage',
  ADMIN_SYSTEM_CONFIGURE: 'admin:system:configure',
  ADMIN_ANALYTICS_VIEW: 'admin:analytics:view',
} as const;

export const ROLES = {
  GUEST: 'Guest',
  USER: 'User',
  PREMIUM: 'Premium',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'SuperAdmin',
} as const;
