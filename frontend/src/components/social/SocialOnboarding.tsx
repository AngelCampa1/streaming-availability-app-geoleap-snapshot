'use client';

import React, { useState, useCallback } from 'react';
import {
  Users,
  Shield,
  Settings,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  UserPlus,
  Eye,
  Globe,
  Lock,
  Star,
  Heart,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';
import { SocialLoginGroup, COMMON_PROVIDERS } from './SocialLoginButton';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType<{ onNext: () => void; onBack: () => void; onSkip?: () => void }>;
  skippable?: boolean;
  required?: boolean;
}

interface SocialOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialStep?: number;
  showSkipAll?: boolean;
}

// Step 1: Welcome and Privacy
function WelcomeStep({ onNext }: { onNext: () => void; onBack: () => void; onSkip?: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
        <Users size={32} className="text-primary" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Social Features!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Connect with friends, discover new content, and share your favorite movies and shows. Your privacy is our
          priority - you control what you share and with whom.
        </p>
      </div>

      <div className="bg-primary/5 p-4 rounded-lg text-left">
        <h3 className="font-semibold text-primary mb-2">What you can do:</h3>
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-primary" />
            <span>Find friends from your social networks</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-primary" />
            <span>Get personalized recommendations from friends</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-primary" />
            <span>Share reviews and ratings</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-primary" />
            <span>See what friends are watching</span>
          </li>
        </ul>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        Let&apos;s Get Started
        <ArrowRight size={20} className="inline ml-2" />
      </button>
    </div>
  );
}

// Step 2: Privacy Settings
function PrivacyStep({ onNext, onBack }: { onNext: () => void; onBack: () => void; onSkip?: () => void }) {
  const { updatePrivacySettings, user: _user } = useSocialAuth();
  const [settings, setSettings] = useState({
    allowSocialLogin: true,
    sharePersonalInfo: false,
    allowFriendDiscovery: true,
    showOnlineStatus: false,
  });

  const handleNext = async () => {
    try {
      await updatePrivacySettings(settings);
      onNext();
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
          <Shield size={24} className="text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Privacy Settings</h2>
        <p className="text-muted-foreground">Choose how you want to interact socially. You can change these anytime.</p>
      </div>

      <div className="space-y-4">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Globe size={18} className="text-primary" />
                <span className="font-medium text-foreground">Allow Social Login</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Enable signing in with social media accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowSocialLogin}
                onChange={e => setSettings(prev => ({ ...prev, allowSocialLogin: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <UserPlus size={18} className="text-accent" />
                <span className="font-medium text-foreground">Friend Discovery</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Let friends find you and discover new friends</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowFriendDiscovery}
                onChange={e => setSettings(prev => ({ ...prev, allowFriendDiscovery: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Lock size={18} className="text-warning" />
                <span className="font-medium text-foreground">Share Personal Info</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Share profile information with connected services</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sharePersonalInfo}
                onChange={e => setSettings(prev => ({ ...prev, sharePersonalInfo: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Eye size={18} className="text-success" />
                <span className="font-medium text-foreground">Show Online Status</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Display when you&apos;re active to friends</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={e => setSettings(prev => ({ ...prev, showOnlineStatus: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 border border-border text-foreground py-3 px-6 rounded-lg hover:bg-muted transition-colors font-medium"
        >
          <ArrowLeft size={20} className="inline mr-2" />
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Continue
          <ArrowRight size={20} className="inline ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 3: Connect Social Accounts
function ConnectAccountsStep({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}) {
  const { connections } = useSocialAuth();
  const [connectedCount, setConnectedCount] = useState(connections.length);

  const handleConnectionSuccess = () => {
    setConnectedCount(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
          <Settings size={24} className="text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Connect Your Accounts</h2>
        <p className="text-muted-foreground">
          Connect your social media accounts to find friends and get better recommendations.
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground">Connected Accounts</span>
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{connectedCount} connected</span>
        </div>

        <SocialLoginGroup
          providers={COMMON_PROVIDERS}
          variant="connect"
          layout="vertical"
          onSuccess={handleConnectionSuccess}
          onError={(provider, error) => {
            console.error(`Failed to connect ${provider}:`, error);
          }}
        />
      </div>

      <div className="bg-primary/5 p-4 rounded-lg">
        <h3 className="font-semibold text-primary mb-2">Why connect?</h3>
        <ul className="space-y-1 text-sm text-foreground">
          <li>• Find friends who are already using the platform</li>
          <li>• Get recommendations based on what friends are watching</li>
          <li>• Share your favorite content more easily</li>
          <li>• See trending content in your network</li>
        </ul>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 border border-border text-foreground py-3 px-6 rounded-lg hover:bg-muted transition-colors font-medium"
        >
          <ArrowLeft size={20} className="inline mr-2" />
          Back
        </button>
        {onSkip && (
          <button onClick={onSkip} className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors">
            Skip for now
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Continue
          <ArrowRight size={20} className="inline ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 4: Complete Setup
function CompleteStep({ onNext }: { onNext: () => void; onBack: () => void; onSkip?: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
        <CheckCircle size={32} className="text-success" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re All Set!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your social features are now active. Start exploring content, finding friends, and sharing your favorites!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Star size={20} className="text-primary" />
          </div>
          <div className="text-sm font-medium text-foreground">Rate & Review</div>
          <div className="text-xs text-muted-foreground">Share your opinions</div>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-accent" />
          </div>
          <div className="text-sm font-medium text-foreground">Find Friends</div>
          <div className="text-xs text-muted-foreground">Connect with others</div>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Heart size={20} className="text-success" />
          </div>
          <div className="text-sm font-medium text-foreground">Discover</div>
          <div className="text-xs text-muted-foreground">Get recommendations</div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-success text-white py-3 px-6 rounded-lg hover:bg-success/90 transition-colors font-medium"
      >
        Start Using Social Features
      </button>
    </div>
  );
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Introduction to social features',
    icon: Users,
    component: WelcomeStep,
    skippable: false,
    required: true,
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Configure privacy settings',
    icon: Shield,
    component: PrivacyStep,
    skippable: false,
    required: true,
  },
  {
    id: 'connect',
    title: 'Connect',
    description: 'Link social accounts',
    icon: Settings,
    component: ConnectAccountsStep,
    skippable: true,
    required: false,
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Setup complete',
    icon: CheckCircle,
    component: CompleteStep,
    skippable: false,
    required: true,
  },
];

export function SocialOnboarding({
  isOpen,
  onClose,
  onComplete,
  initialStep = 0,
  showSkipAll = true,
}: SocialOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const handleNext = useCallback(() => {
    const step = ONBOARDING_STEPS[currentStep];
    setCompletedSteps(prev => [...prev, step.id]);

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Completed all steps
      onComplete();
      onClose();
    }
  }, [currentStep, onComplete, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
      onClose();
    }
  }, [currentStep, onComplete, onClose]);

  const handleSkipAll = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const StepComponent = currentStepData.component;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              {ONBOARDING_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep
                      ? 'bg-primary'
                      : index < currentStep || completedSteps.includes(step.id)
                        ? 'bg-primary/30'
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {showSkipAll && currentStep < ONBOARDING_STEPS.length - 1 && (
              <button onClick={handleSkipAll} className="text-muted-foreground hover:text-foreground text-sm">
                Skip all
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <StepComponent
            onNext={handleNext}
            onBack={handleBack}
            onSkip={currentStepData.skippable ? handleSkip : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default SocialOnboarding;
