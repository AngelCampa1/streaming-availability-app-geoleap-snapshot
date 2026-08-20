'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Play, Square, RefreshCw, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface BackgroundJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

interface BackgroundJobsProps {
  jobs: BackgroundJob[];
  onCancelJob: (jobId: string) => Promise<void>;
  onRetryJob: (jobId: string) => Promise<void>;
  onRefresh: () => void;
}

export function BackgroundJobs({ jobs, onCancelJob, onRetryJob, onRefresh }: BackgroundJobsProps) {
  const [loadingJobs, setLoadingJobs] = useState<Set<string>>(new Set());

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

  const handleJobAction = async (action: () => Promise<void>, jobId: string) => {
    try {
      setLoadingJobs(prev => new Set([...prev, jobId]));
      await action();
    } catch (error) {
      console.error('Job action failed:', error);
    } finally {
      setLoadingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationSeconds = Math.floor((durationMs % 60000) / 1000);

    if (durationMinutes > 0) {
      return `${durationMinutes}m ${durationSeconds}s`;
    }
    return `${durationSeconds}s`;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Separate jobs by status for better organization
  const runningJobs = jobs.filter(job => job.status === 'running');
  const pendingJobs = jobs.filter(job => job.status === 'pending');
  const _completedJobs = jobs.filter(job => job.status === 'completed').slice(0, 5);
  const failedJobs = jobs.filter(job => job.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Loader2 className="h-4 w-4 text-info animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningJobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingJobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedJobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                jobs.filter(
                  j => j.status === 'completed' && new Date(j.completedAt!).toDateString() === new Date().toDateString()
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Running Jobs */}
      {runningJobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Running Jobs</CardTitle>
              <CardDescription>Currently executing background tasks</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {runningJobs.map(job => (
                <div key={job.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-info" />
                      <span className="font-medium">{job.name}</span>
                      <Badge variant="default">Running</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJobAction(() => onCancelJob(job.id), job.id)}
                      disabled={loadingJobs.has(job.id)}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(job.progress)}%</span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Started: {formatDateTime(job.startedAt)} • Duration: {formatDuration(job.startedAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Jobs */}
      {failedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Failed Jobs</CardTitle>
            <CardDescription>Jobs that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {failedJobs.map(job => (
                <div key={job.id} className="border border-destructive/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{job.name}</span>
                      <Badge variant="destructive">Failed</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJobAction(() => onRetryJob(job.id), job.id)}
                      disabled={loadingJobs.has(job.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </div>

                  {job.error && <div className="text-sm bg-destructive/10 p-2 rounded text-destructive">{job.error}</div>}

                  <div className="text-xs text-muted-foreground">
                    Started: {formatDateTime(job.startedAt)} • Failed after:{' '}
                    {formatDuration(job.startedAt, job.completedAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>Complete list of background jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(job => {
                const StatusIcon = getStatusIcon(job.status);
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(job.status)}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.status === 'running' ? (
                        <div className="w-24">
                          <Progress value={job.progress} className="h-1" />
                          <span className="text-xs">{Math.round(job.progress)}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {job.status === 'completed' ? '100%' : ' - '}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(job.startedAt)}</TableCell>
                    <TableCell className="text-sm">{formatDuration(job.startedAt, job.completedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {job.status === 'running' && (
                            <DropdownMenuItem
                              onClick={() => handleJobAction(() => onCancelJob(job.id), job.id)}
                              disabled={loadingJobs.has(job.id)}
                            >
                              <Square className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          {job.status === 'failed' && (
                            <DropdownMenuItem
                              onClick={() => handleJobAction(() => onRetryJob(job.id), job.id)}
                              disabled={loadingJobs.has(job.id)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Retry
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No background jobs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
