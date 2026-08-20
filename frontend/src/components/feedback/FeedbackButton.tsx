'use client';

import * as React from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackDialog } from './FeedbackDialog';
import { cn } from '@/lib/utils';

interface FeedbackButtonProps {
  className?: string;
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'sm:bottom-6 sm:right-6',
          className
        )}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
