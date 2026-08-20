'use client';

import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { PaymentRecoveryDashboard } from '../../../components/payment/PaymentRecoveryDashboard';
import { PaymentRecoveryAnalytics } from '../../../components/payment/PaymentRecoveryAnalytics';
import { GracePeriodNotification } from '../../../components/payment/GracePeriodNotification';
import { CreditCard, BarChart3, Clock, ArrowLeft, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentRecoveryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics'>('dashboard');

  const tabButtons = [
    {
      id: 'dashboard' as const,
      label: 'Payment Recovery',
      icon: CreditCard,
      description: 'Manage failed payments and retry attempts',
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      description: 'View recovery performance and metrics',
    },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Payment Recovery Center</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grace Period Global Notification */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <GracePeriodNotification dismissible={false} compact={false} />
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Card>
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabButtons.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {tabButtons.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-muted-foreground">{tabButtons.find(tab => tab.id === activeTab)?.description}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <PaymentRecoveryDashboard />}

        {activeTab === 'analytics' && <PaymentRecoveryAnalytics showDatePicker={true} defaultDateRange={30} />}
      </div>

      {/* Footer Help */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="border-primary/30 bg-primary/10">
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-2">Payment Recovery Help</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    • <strong>Grace Period:</strong> Your subscription remains active while we resolve payment issues
                  </p>
                  <p>
                    • <strong>Automatic Retries:</strong> We&apos;ll automatically retry failed payments using
                    intelligent scheduling
                  </p>
                  <p>
                    • <strong>Manual Recovery:</strong> You can retry payments immediately or update your payment method
                  </p>
                  <p>
                    • <strong>Support:</strong> Contact our team if you need assistance resolving payment issues
                  </p>
                </div>
                <div className="flex items-center space-x-3 mt-4">
                  <Button
                    size="sm"
                    onClick={() => window.open('/support', '_blank')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open('/help/payment-issues', '_blank')}>
                    Payment Help Guide
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
