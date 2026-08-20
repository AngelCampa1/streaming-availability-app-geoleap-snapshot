'use client';

import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Search, Bell, Bookmark, Sparkles } from 'lucide-react';
import type { SearchBlockedResponse } from '@/lib/anonymous-user';

interface SignupRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockData?: SearchBlockedResponse;
}

const benefits = [
  { icon: Search, text: '5 free searches every day' },
  { icon: Bookmark, text: 'Save shows to your watchlist' },
  { icon: Bell, text: 'Get notified when content moves' },
  { icon: Sparkles, text: 'Personalized recommendations' },
];

export function SignupRequiredModal({ isOpen, onClose, blockData }: SignupRequiredModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="search-limit-modal">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-center">
            Create Your Free Account
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {blockData?.message || 'Get 5 searches per day, save to watchlist, track availability'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits list */}
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Search 42 streaming services across 57 countries</span>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link href="/auth/register" className="block">
              <Button className="w-full" size="lg">
                Create Free Account  -  Takes 30 seconds
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground">
              Sign up with Google for instant access
            </p>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SignupRequiredModal;
