'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SearchLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchesUsed?: number;
  searchLimit?: number;
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Modal displayed when users reach their search limit.
 * Auth-aware: anonymous users see signup CTA, authenticated users see upgrade CTA.
 */
export const SearchLimitModal: React.FC<SearchLimitModalProps> = ({
  isOpen,
  onClose,
  searchesUsed = 3,
  searchLimit = 3,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handlePrimaryCTA = () => {
    onClose();
    if (isAuthenticated) {
      router.push('/upgrade');
    } else {
      router.push('/auth/register');
    }
  };

  const handleLogin = () => {
    onClose();
    router.push('/auth/login');
  };

  const progressPercent = searchLimit > 0 ? Math.min((searchesUsed / searchLimit) * 100, 100) : 100;

  const anonymousBenefits = [
    { label: 'Unlimited searches', detail: 'no daily limits' },
    { label: 'Save to watchlist', detail: 'track your favorites' },
    { label: '42 streaming services', detail: 'complete coverage' },
    { label: 'Content alerts', detail: 'know when shows move' },
  ];

  const authenticatedBenefits = [
    { label: 'Unlimited searches', detail: 'no daily limits' },
    { label: 'Ad-free experience', detail: 'clean interface' },
    { label: 'Unlimited watchlist', detail: 'save as many as you want' },
    { label: 'Priority support', detail: 'faster responses' },
  ];

  const benefits = isAuthenticated ? authenticatedBenefits : anonymousBenefits;
  const benefitsTitle = isAuthenticated ? 'Premium benefits include:' : 'Free account includes:';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {isAuthenticated ? "You've hit today's limit" : 'Want unlimited searches?'}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            You&apos;ve used {searchesUsed} of {searchLimit} {searchLimit === 1 ? 'search' : 'searches'} today.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="py-2">
          <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={searchesUsed} aria-valuemin={0} aria-valuemax={searchLimit}>
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {searchesUsed}/{searchLimit} searches used
          </p>
        </div>

        <div className="py-2">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {benefitsTitle}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {benefits.map((benefit) => (
                <li key={benefit.label} className="flex items-center gap-2">
                  <CheckIcon />
                  <span>
                    <strong>{benefit.label}</strong>  -  {benefit.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isAuthenticated && (
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
            >
              Already have an account? Log in
            </button>
          )}
          <button
            onClick={handlePrimaryCTA}
            className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {isAuthenticated ? 'Start 30-Day Free Trial' : 'Sign Up Free  -  Unlimited Searches'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchLimitModal;
