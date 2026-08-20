'use client';

import { useState, useEffect } from 'react';
import { validatePasswordStrength, PasswordStrengthResult } from '@/lib/api';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  onStrengthChange?: (result: PasswordStrengthResult) => void;
}

export function PasswordStrengthIndicator({
  password,
  className = '',
  onStrengthChange,
}: PasswordStrengthIndicatorProps) {
  const [strengthResult, setStrengthResult] = useState<PasswordStrengthResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkStrength = async () => {
      if (!password) {
        setStrengthResult(null);
        return;
      }

      setIsChecking(true);
      try {
        const result = await validatePasswordStrength(password);
        setStrengthResult(result);
        onStrengthChange?.(result);
      } catch (error) {
        console.error('Error checking password strength:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce password strength checking
    const timeoutId = setTimeout(checkStrength, 300);
    return () => clearTimeout(timeoutId);
  }, [password, onStrengthChange]);

  if (!password || !strengthResult) {
    return null;
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'VeryWeak':
        return 'bg-destructive';
      case 'Weak':
        return 'bg-destructive/80';
      case 'Fair':
        return 'bg-warning';
      case 'Strong':
        return 'bg-success';
      case 'VeryStrong':
        return 'bg-success';
      default:
        return 'bg-muted';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'VeryWeak':
        return 'Very Weak';
      case 'Weak':
        return 'Weak';
      case 'Fair':
        return 'Fair';
      case 'Strong':
        return 'Strong';
      case 'VeryStrong':
        return 'Very Strong';
      default:
        return 'Unknown';
    }
  };

  const getStrengthTextColor = (strength: string) => {
    switch (strength) {
      case 'VeryWeak':
        return 'text-destructive';
      case 'Weak':
        return 'text-destructive';
      case 'Fair':
        return 'text-warning';
      case 'Strong':
        return 'text-success';
      case 'VeryStrong':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  const strengthPercentage = (strengthResult.score / 10) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strengthResult.strength)}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      {/* Strength Text */}
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${getStrengthTextColor(strengthResult.strength)}`}>
          {isChecking ? 'Checking...' : `Password Strength: ${getStrengthText(strengthResult.strength)}`}
        </span>
        <span className="text-xs text-muted-foreground">{strengthResult.score}/10</span>
      </div>

      {/* Requirements Status */}
      {!strengthResult.meetsRequirements && (
        <div className="text-xs text-error bg-error/10 p-2 rounded border border-error/20">
          ⚠️ Password does not meet minimum requirements
        </div>
      )}

      {/* Feedback */}
      {strengthResult.feedback.length > 0 && (
        <div className="space-y-1">
          {strengthResult.feedback.map((feedback, index) => (
            <div key={index} className="text-xs text-muted-foreground flex items-start">
              <span className="mr-1">•</span>
              <span>{feedback}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
