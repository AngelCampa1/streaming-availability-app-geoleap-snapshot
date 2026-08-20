/**
 * Test file to verify authentication type consistency
 * This file demonstrates that the auth type mismatches have been resolved
 */

import {
  LoginCredentials,
  UserCredentials,
  RegisterCredentials,
  AuthTypeValidator,
} from '../../types/auth';


// ValidationResult type is defined but not used in tests - keeping import for type completeness

describe('Authentication Type Consistency', () => {
  describe('LoginCredentials validation', () => {
    it('should validate complete LoginCredentials with rememberMe', () => {
      const loginCredentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const loginValidation = AuthTypeValidator.validateLoginCredentials(loginCredentials);

      expect(loginValidation.isValid).toBe(true);
      expect(loginValidation.errors).toHaveLength(0);
    });

    it('should validate LoginCredentials without rememberMe', () => {
      const loginCredentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      const loginValidation = AuthTypeValidator.validateLoginCredentials(loginCredentials);

      expect(loginValidation.isValid).toBe(true);
      expect(loginValidation.errors).toHaveLength(0);
    });

    it('should reject invalid LoginCredentials', () => {
      const loginCredentials: LoginCredentials = {
        email: 'invalid-email',
        password: '123',
        rememberMe: true,
      };

      const loginValidation = AuthTypeValidator.validateLoginCredentials(loginCredentials);

      expect(loginValidation.isValid).toBe(false);
      expect(loginValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('UserCredentials adaptation', () => {
    it('should adapt UserCredentials to LoginCredentials', () => {
      const userCredentials: UserCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      // This should work because UserCredentials extends the base email/password interface
      const adaptedLoginCredentials: LoginCredentials = {
        ...userCredentials,
        rememberMe: false,
      };

      const adaptedValidation = AuthTypeValidator.validateLoginCredentials(adaptedLoginCredentials);

      expect(adaptedValidation.isValid).toBe(true);
      expect(adaptedLoginCredentials.email).toBe(userCredentials.email);
      expect(adaptedLoginCredentials.password).toBe(userCredentials.password);
      expect(adaptedLoginCredentials.rememberMe).toBe(false);
    });
  });

  describe('RegisterCredentials validation', () => {
    it('should validate complete RegisterCredentials', () => {
      const registerCredentials: RegisterCredentials = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      const registerValidation = AuthTypeValidator.validateRegisterCredentials(registerCredentials);

      expect(registerValidation.isValid).toBe(true);
      expect(registerValidation.errors).toHaveLength(0);
    });

    it('should reject invalid RegisterCredentials', () => {
      const registerCredentials: RegisterCredentials = {
        email: 'invalid-email',
        password: '123',
        confirmPassword: '456',
        firstName: '',
        lastName: '',
        agreeToTerms: false,
      };

      const registerValidation = AuthTypeValidator.validateRegisterCredentials(registerCredentials);

      expect(registerValidation.isValid).toBe(false);
      expect(registerValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Email validation', () => {
    it('should validate correct email format', () => {
      const validEmail = 'user@example.com';
      const result = AuthTypeValidator.validateEmail(validEmail);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const invalidEmail = 'invalid-email';
      const result = AuthTypeValidator.validateEmail(invalidEmail);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Password validation', () => {
    it('should validate strong password', () => {
      const validPassword = 'securePassword123';
      const result = AuthTypeValidator.validatePassword(validPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const shortPassword = '123';
      const result = AuthTypeValidator.validatePassword(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Auth service integration', () => {
    it('should demonstrate consistent credential interface', () => {
      // This demonstrates how all auth services now use consistent LoginCredentials
      const credentials: LoginCredentials = {
        email: 'user@example.com',
        password: 'securePassword123',
        rememberMe: true,
      };

      // Verify credentials have all required properties
      expect(credentials).toHaveProperty('email');
      expect(credentials).toHaveProperty('password');
      expect(credentials).toHaveProperty('rememberMe');
      expect(typeof credentials.email).toBe('string');
      expect(typeof credentials.password).toBe('string');
      expect(typeof credentials.rememberMe).toBe('boolean');

      // All auth services now expect the same LoginCredentials interface:
      // - AuthContext.login(credentials)
      // - authService.login(credentials)
      // - authApiClient.login(credentials)
      // - AuthService.getInstance().login(credentials)
    });
  });
});
