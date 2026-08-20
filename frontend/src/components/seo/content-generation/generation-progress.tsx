'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, AlertTriangle, Clock, X, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface GenerationJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  pagesGenerated: number;
  estimatedRemaining?: number;
  errors?: string[];
  request: {
    templateId: string;
    batchSize: number;
    priority: string;
    targetKeywords: string[];
  };
}

interface GenerationProgressProps {
  jobs: GenerationJob[];
  onCancelJob: (jobId: string) => Promise<void>;
}

export function GenerationProgress({ jobs, onCancelJob }: GenerationProgressProps) {
  const [cancellingJob, setCancellingJob] = useState<string | null>(null);

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generation Progress</CardTitle>
          <CardDescription>No active generation jobs</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'running':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'running':
        return Loader2;
      case 'pending':
        return Clock;
      case 'failed':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await onCancelJob(jobId);
      setCancellingJob(null);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const formatEstimatedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation Progress</CardTitle>
        <CardDescription>Active page generation jobs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map(job => {
          const StatusIcon = getStatusIcon(job.status);
          const isActive = job.status === 'pending' || job.status === 'running';

          return (
            <div key={job.jobId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <StatusIcon className={`h-4 w-4 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                  <span className="font-medium">Batch Generation ({job.request.batchSize} pages)</span>
                  <Badge variant={getStatusColor(job.status)}>{job.status}</Badge>
                </div>

                {isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancellingJob(job.jobId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              {isActive && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Progress: {job.pagesGenerated} / {job.request.batchSize}
                    </span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                  {job.estimatedRemaining && (
                    <p className="text-xs text-muted-foreground">
                      Est. remaining: {formatEstimatedTime(job.estimatedRemaining)}
                    </p>
                  )}
                </div>
              )}

              {/* Job Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    Priority: {job.request.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Keywords: {job.request.targetKeywords.length}
                  </Badge>
                </div>

                {job.request.targetKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.request.targetKeywords.slice(0, 5).map(keyword => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {job.request.targetKeywords.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{job.request.targetKeywords.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Errors */}
              {job.errors && job.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  <div className="space-y-1">
                    {job.errors.map((error, index) => (
                      <p key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {job.status === 'completed' && (
                <div className="flex items-center space-x-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Successfully generated {job.pagesGenerated} pages</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={!!cancellingJob} onOpenChange={() => setCancellingJob(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Generation Job</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this generation job? Any progress will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Running</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancellingJob && handleCancelJob(cancellingJob)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Cancel Job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
