// Authentication Types and Interfaces

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  socialConnections: SocialConnection[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface SocialConnection {
  provider: SocialProvider;
  providerId: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  connectedAt: string;
}

export type SocialProvider = 'google' | 'apple' | 'facebook';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType?: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// @deprecated Use LoginCredentials instead - kept for backward compatibility
export interface UserCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface BiometricSettings {
  enabled: boolean;
  type: BiometricType;
  promptMessage: string;
}

export type BiometricType = 'TouchID' | 'FaceID' | 'Fingerprint' | 'None';

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricAvailable: boolean;
  biometricType: BiometricType;
  error: string | null;
}

export interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  loginWithSocial: (provider: SocialProvider) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (request: ResetPasswordRequest) => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export interface OAuthConfig {
  google: {
    webClientId: string;
    iosClientId: string;
  };
  facebook: {
    appId: string;
  };
  apple: {
    serviceId: string;
  };
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number; // minutes
  sessionTimeout: number; // minutes
  twoFactorEnabled: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  currentStep: number;
  completed: boolean;
}

export interface OAuthResult {
  tokens: AuthTokens;
  user?: User;
}

// Type validation utilities
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export class AuthTypeValidator {
  /**
   * Validate login credentials
   */
  static validateLoginCredentials(credentials: LoginCredentials): ValidationResult {
    const errors: string[] = [];

    if (!credentials.email || credentials.email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (!credentials.password || credentials.password.length === 0) {
      errors.push('Password is required');
    }

    const emailValidation = this.validateEmail(credentials.email);
    if (!emailValidation.isValid && emailValidation.errors) {
      errors.push(...emailValidation.errors);
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : [] };
  }

  /**
   * Validate register credentials
   */
  static validateRegisterCredentials(credentials: RegisterCredentials): ValidationResult {
    const errors: string[] = [];

    if (!credentials.email || credentials.email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailValidation = this.validateEmail(credentials.email);
      if (!emailValidation.isValid && emailValidation.errors) {
        errors.push(...emailValidation.errors);
      }
    }

    if (!credentials.password || credentials.password.length === 0) {
      errors.push('Password is required');
    } else {
      if (credentials.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
    }

    if (!credentials.confirmPassword || credentials.confirmPassword.length === 0) {
      errors.push('Password confirmation is required');
    }

    if (credentials.password !== credentials.confirmPassword) {
      errors.push('Passwords do not match');
    }

    if (!credentials.agreeToTerms) {
      errors.push('You must agree to the terms and conditions');
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : [] };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, errors: ['Invalid email format'] };
    }
    return { isValid: true, errors: [] };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password || password.length === 0) {
      errors.push('Password is required');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Additional password validation can be added here
    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : [] };
  }

  /**
   * Validate reset password request
   */
  static validateResetPasswordRequest(request: ResetPasswordRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.token || request.token.trim().length === 0) {
      errors.push('Reset token is required');
    }

    const passwordValidation = this.validatePassword(request.newPassword);
    if (!passwordValidation.isValid && passwordValidation.errors) {
      errors.push(...passwordValidation.errors);
    }

    if (!request.confirmPassword || request.confirmPassword.length === 0) {
      errors.push('Password confirmation is required');
    }

    if (request.newPassword !== request.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : [] };
  }

  /**
   * Validate forgot password request
   */
  static validateForgotPasswordRequest(request: ForgotPasswordRequest): ValidationResult {
    return this.validateEmail(request.email);
  }
}
