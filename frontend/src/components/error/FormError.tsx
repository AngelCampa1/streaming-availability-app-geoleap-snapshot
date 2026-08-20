'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FormErrorProps {
  error?: string;
  errors?: string[];
  touched?: boolean;
  className?: string;
  variant?: 'inline' | 'block' | 'tooltip';
  showIcon?: boolean;
}

export function FormError({
  error,
  errors,
  touched = true,
  className,
  variant = 'inline',
  showIcon = true,
}: FormErrorProps) {
  const errorList = error ? [error] : errors || [];

  if (!touched || errorList.length === 0) {
    return null;
  }

  const ErrorIcon = () =>
    showIcon ? (
      <svg className="w-3 h-3 text-error flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ) : null;

  if (variant === 'tooltip') {
    return (
      <div className="relative group">
        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-error text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
          {errorList[0]}
          <div className="absolute top-full left-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-error"></div>
        </div>
        {showIcon && <ErrorIcon />}
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <div className={cn('mt-1 p-2 bg-error/10 border border-error/20 rounded text-error text-sm', className)}>
        <div className="flex items-start gap-2">
          <ErrorIcon />
          <div className="flex-1">
            {errorList.length === 1 ? (
              <p>{errorList[0]}</p>
            ) : (
              <ul className="space-y-0.5">
                {errorList.map((err, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-error/70 mt-0.5">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={cn('mt-1 flex items-start gap-1 text-error text-xs', className)}>
      <ErrorIcon />
      <div className="flex-1">
        {errorList.length === 1 ? (
          <span>{errorList[0]}</span>
        ) : (
          <ul className="space-y-0.5">
            {errorList.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Input wrapper with validation styling
export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  errors?: string[];
  touched?: boolean;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function ValidatedInput({
  error,
  errors,
  touched = true,
  label,
  helperText,
  className,
  required,
  ...props
}: ValidatedInputProps) {
  const hasError = touched && (error || (errors && errors.length > 0));
  const id = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className={cn('block text-sm font-medium', hasError ? 'text-error' : 'text-foreground')}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <input
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
        id={id}
        className={cn(
          'block w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          hasError
            ? 'border-error/30 focus:border-error focus:ring-error/20'
            : 'border-input focus:border-primary focus:ring-primary/20',
          'bg-background text-foreground',
          className
        )}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-description` : undefined}
      />

      {helperText && !hasError && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      <div id={`${id}-error`}>
        <FormError error={error} errors={errors} touched={touched} />
      </div>
    </div>
  );
}

// Textarea wrapper with validation styling
export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  errors?: string[];
  touched?: boolean;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function ValidatedTextarea({
  error,
  errors,
  touched = true,
  label,
  helperText,
  className,
  required,
  ...props
}: ValidatedTextareaProps) {
  const hasError = touched && (error || (errors && errors.length > 0));
  const id = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className={cn('block text-sm font-medium', hasError ? 'text-error' : 'text-foreground')}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <textarea
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
        id={id}
        className={cn(
          'block w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 resize-vertical',
          hasError
            ? 'border-error/30 focus:border-error focus:ring-error/20'
            : 'border-input focus:border-primary focus:ring-primary/20',
          'bg-background text-foreground',
          className
        )}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-description` : undefined}
      />

      {helperText && !hasError && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      <div id={`${id}-error`}>
        <FormError error={error} errors={errors} touched={touched} />
      </div>
    </div>
  );
}

// Select wrapper with validation styling
export interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  errors?: string[];
  touched?: boolean;
  label?: string;
  helperText?: string;
  required?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export function ValidatedSelect({
  error,
  errors,
  touched = true,
  label,
  helperText,
  className,
  required,
  options,
  placeholder,
  ...props
}: ValidatedSelectProps) {
  const hasError = touched && (error || (errors && errors.length > 0));
  const id = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className={cn('block text-sm font-medium', hasError ? 'text-error' : 'text-foreground')}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <select
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
        id={id}
        className={cn(
          'block w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          hasError
            ? 'border-error/30 focus:border-error focus:ring-error/20'
            : 'border-input focus:border-primary focus:ring-primary/20',
          'bg-background text-foreground',
          className
        )}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-description` : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {helperText && !hasError && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      <div id={`${id}-error`}>
        <FormError error={error} errors={errors} touched={touched} />
      </div>
    </div>
  );
}

// Form validation summary component
export interface FormValidationSummaryProps {
  errors: Record<string, string | string[]>;
  fieldLabels?: Record<string, string>;
  className?: string;
  title?: string;
  onFieldFocus?: (fieldName: string) => void;
}

export function FormValidationSummary({
  errors,
  fieldLabels = {},
  className,
  title = 'Please correct the following errors:',
  onFieldFocus,
}: FormValidationSummaryProps) {
  const errorEntries = Object.entries(errors).filter(
    ([, error]) => error && (typeof error === 'string' || error.length > 0)
  );

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <div className={cn('p-4 bg-error/10 border border-error/20 rounded-md text-error', className)}>
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-error flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-medium text-sm mb-2">{title}</h3>
          <ul className="space-y-1 text-sm">
            {errorEntries.map(([fieldName, fieldErrors]) => {
              const errorList = typeof fieldErrors === 'string' ? [fieldErrors] : fieldErrors;
              const fieldLabel = fieldLabels[fieldName] || fieldName;

              return errorList.map((error, index) => (
                <li key={`${fieldName}-${index}`} className="flex items-start gap-1">
                  <span className="text-error/70 mt-0.5">•</span>
                  {onFieldFocus ? (
                    <button
                      type="button"
                      onClick={() => onFieldFocus(fieldName)}
                      className="text-left underline hover:no-underline focus:outline-none focus:ring-1 focus:ring-error/30 rounded"
                    >
                      <span className="font-medium">{fieldLabel}:</span> {error}
                    </button>
                  ) : (
                    <span>
                      <span className="font-medium">{fieldLabel}:</span> {error}
                    </span>
                  )}
                </li>
              ));
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Hook for form field validation state
export function useFieldValidation(initialValue: string = '') {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValue(e.target.value);
    if (touched && error) {
      setError(''); // Clear error when user starts typing
    }
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const validate = (validator: (value: string) => string | null) => {
    const validationError = validator(value);
    setError(validationError || '');
    return !validationError;
  };

  const reset = () => {
    setValue(initialValue);
    setTouched(false);
    setError('');
  };

  return {
    value,
    error,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    hasError: touched && !!error,
    isValid: touched && !error,
  };
}
