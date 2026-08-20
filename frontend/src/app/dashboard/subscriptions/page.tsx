'use client';

import { SubscriptionManager } from '@/components/SubscriptionManager';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <AppLayout>
      <div className="py-8 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Streaming Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage your streaming subscriptions to discover VPN-accessible content
          </p>
        </div>

        {/* Subscription Manager */}
        <SubscriptionManager />

        {/* Helpful Info */}
        <Card className="bg-info/10 border-info/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info/20">
                <CheckCircle className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-info mb-2">How VPN Streaming Works</h3>
                <ul className="space-y-1 text-sm text-info/90">
                  <li>• Add your existing streaming subscriptions (Netflix, HBO, Disney+, etc.)</li>
                  <li>• When you search for content, we&apos;ll show you which countries have it on your services</li>
                  <li>• Connect your VPN to those countries and watch content you already pay for</li>
                  <li>• No need to buy additional subscriptions or rent movies separately</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
