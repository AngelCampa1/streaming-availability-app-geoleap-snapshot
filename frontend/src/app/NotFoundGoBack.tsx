'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundGoBack() {
  return (
    <Button variant="outline" size="lg" onClick={() => window.history.back()}>
      <ArrowLeft className="w-5 h-5 mr-2" />
      Go Back
    </Button>
  );
}
