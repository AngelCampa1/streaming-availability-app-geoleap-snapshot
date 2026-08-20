'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Infinity, MapPin, Filter, Headphones, Clock } from 'lucide-react';
import type { SearchBlockedResponse } from '@/lib/anonymous-user';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, getPremiumTrialCopy, premiumPlan } from '@/lib/pricing';

interface UpgradeRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockData?: SearchBlockedResponse;
}

const premiumBenefits = [
  { icon: Infinity, text: 'Unlimited searches' },
  { icon: MapPin, text: 'VPN location recommendations' },
  { icon: Filter, text: 'Advanced filters & sorting' },
  { icon: Headphones, text: 'Priority support' },
];

function formatTimeUntilReset(resetsAt: string | null): string {
  if (!resetsAt) return '';

  const resetTime = new Date(resetsAt);
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) return 'Resets soon';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Resets in ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `Resets in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export function UpgradeRequiredModal({ isOpen, onClose, blockData }: UpgradeRequiredModalProps) {
  const [timeUntilReset, setTimeUntilReset] = useState(() =>
    formatTimeUntilReset(blockData?.resetsAt ?? null)
  );
  const planPrice = formatPlanPrice(premiumPlan);
  const monthlyEquivalent = formatPremiumMonthlyEquivalent();
  const trialCopy = getPremiumTrialCopy();

  // Update countdown every minute
  useEffect(() => {
    if (!blockData?.resetsAt) return;

    const interval = setInterval(() => {
      setTimeUntilReset(formatTimeUntilReset(blockData.resetsAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [blockData?.resetsAt]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-center">
            You&apos;ve used all 5 free searches today
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {blockData?.message || 'Upgrade to Premium for unlimited searches'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reset countdown */}
          {blockData?.resetsAt && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{timeUntilReset}</span>
            </div>
          )}

          {/* Premium benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Premium benefits:
            </p>
            {premiumBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link href={blockData?.upgradeUrl || '/pricing'} className="block">
              <Button className="w-full" size="lg">
                Start {trialCopy} - then {planPrice} (about {monthlyEquivalent})
              </Button>
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              {planPrice} - about {monthlyEquivalent}
            </p>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onClose}
            >
              I&apos;ll wait for searches to reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeRequiredModal;
