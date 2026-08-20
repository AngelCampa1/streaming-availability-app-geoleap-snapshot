'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap,
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Smartphone,
  Mail,
  TestTube,
  Target,
  BarChart3,
  Clock,
  Trash2,
} from 'lucide-react';
import { useRealTimeNotifications } from './RealTimeNotificationProvider';
import { useToastNotifications } from './NotificationToast';
import { useNotificationAPI } from './NotificationAPI';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  createWatchlistNotification,
  createSecurityNotification,
} from './NotificationTypes';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: NotificationCategory;
  type: NotificationType;
  priority: NotificationPriority;
  hasActions: boolean;
  hasImage: boolean;
  delay?: number;
  count?: number;
  channels: ('push' | 'email' | 'in-app')[];
}

const testScenarios: TestScenario[] = [
  {
    id: 'watchlist-new',
    name: 'New Content Available',
    description: 'Test watchlist notification for newly available content',
    category: 'watchlist',
    type: 'info',
    priority: 'medium',
    hasActions: true,
    hasImage: true,
    channels: ['push', 'in-app'],
  },
  {
    id: 'watchlist-expiring',
    name: 'Content Expiring Soon',
    description: 'Test notification for content leaving platform',
    category: 'watchlist',
    type: 'warning',
    priority: 'high',
    hasActions: true,
    hasImage: true,
    channels: ['push', 'email', 'in-app'],
  },
  {
    id: 'security-login',
    name: 'New Login Alert',
    description: 'Test security notification for new login',
    category: 'security',
    type: 'warning',
    priority: 'high',
    hasActions: true,
    hasImage: false,
    channels: ['push', 'email', 'in-app'],
  },
  {
    id: 'security-critical',
    name: 'Critical Security Alert',
    description: 'Test critical security notification',
    category: 'security',
    type: 'error',
    priority: 'critical',
    hasActions: true,
    hasImage: false,
    channels: ['push', 'email', 'in-app'],
  },
  {
    id: 'system-maintenance',
    name: 'System Maintenance',
    description: 'Test system maintenance notification',
    category: 'system',
    type: 'info',
    priority: 'low',
    hasActions: false,
    hasImage: false,
    channels: ['in-app'],
  },
  {
    id: 'billing-failed',
    name: 'Payment Failed',
    description: 'Test billing notification for failed payment',
    category: 'billing',
    type: 'error',
    priority: 'critical',
    hasActions: true,
    hasImage: false,
    channels: ['push', 'email', 'in-app'],
  },
];

const loadTestScenarios = [
  { name: 'Light Load', count: 5, interval: 2000 },
  { name: 'Medium Load', count: 15, interval: 1000 },
  { name: 'Heavy Load', count: 50, interval: 500 },
  { name: 'Stress Test', count: 100, interval: 100 },
];

interface NotificationTestSuiteProps {
  className?: string;
  showAdvanced?: boolean;
}

export function NotificationTestSuite({ className = '', showAdvanced: _showAdvanced = true }: NotificationTestSuiteProps) {
  const { sendNotification, clearAll, notifications, unreadCount } = useRealTimeNotifications();
  const toastSystem = useToastNotifications();
  const { isLoading, error } = useNotificationAPI();

  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    Array<{
      scenario: string;
      success: boolean;
      error?: string;
      timestamp: Date;
      duration: number;
    }>
  >([]);

  const [customNotification, setCustomNotification] = useState({
    title: 'Test Notification',
    message: 'This is a test notification message',
    type: 'info' as NotificationType,
    category: 'system' as NotificationCategory,
    priority: 'medium' as NotificationPriority,
    hasActions: false,
    channels: ['in-app'] as ('push' | 'email' | 'in-app')[],
  });

  const [loadTest, setLoadTest] = useState({
    isRunning: false,
    scenario: loadTestScenarios[0],
    progress: 0,
    sent: 0,
    errors: 0,
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<{
    startTime?: number;
    endTime?: number;
    totalNotifications: number;
    successfulNotifications: number;
    failedNotifications: number;
    averageResponseTime: number;
  }>({
    totalNotifications: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    averageResponseTime: 0,
  });

  // Run individual test scenario
  const runTestScenario = useCallback(
    async (scenario: TestScenario) => {
      const startTime = Date.now();

      try {
        let notification;

        // Create different types of notifications based on scenario
        switch (scenario.id) {
          case 'watchlist-new':
            notification = createWatchlistNotification('Breaking Bad Season 5', 'Netflix', 'breaking-bad-s5', 'new');
            break;
          case 'watchlist-expiring':
            notification = createWatchlistNotification('The Office', 'Netflix', 'the-office', 'expiring');
            break;
          case 'security-login':
            notification = createSecurityNotification('login', 'high');
            break;
          case 'security-critical':
            notification = createSecurityNotification('suspicious_activity', 'critical');
            break;
          default:
            notification = {
              id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: scenario.name,
              message: scenario.description,
              type: scenario.type,
              category: scenario.category,
              priority: scenario.priority,
              timestamp: new Date().toISOString(),
              channels: scenario.channels,
              data: {
                title: scenario.name,
                message: scenario.description,
                type: scenario.type,
                category: scenario.category,
                priority: scenario.priority,
                actions: scenario.hasActions
                  ? [
                      {
                        id: 'primary',
                        label: 'Take Action',
                        type: 'primary' as const,
                        url: '/test-action',
                      },
                    ]
                  : undefined,
                metadata: {
                  source: 'test-suite',
                  imageUrl: scenario.hasImage ? '/images/test-notification.jpg' : undefined,
                },
              },
            };
        }

        await sendNotification(notification as never);

        const duration = Date.now() - startTime;

        setTestResults(prev => [
          ...prev,
          {
            scenario: scenario.name,
            success: true,
            timestamp: new Date(),
            duration,
          },
        ]);

        setPerformanceMetrics(prev => ({
          ...prev,
          totalNotifications: prev.totalNotifications + 1,
          successfulNotifications: prev.successfulNotifications + 1,
          averageResponseTime:
            (prev.averageResponseTime * prev.totalNotifications + duration) / (prev.totalNotifications + 1),
        }));
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setTestResults(prev => [
          ...prev,
          {
            scenario: scenario.name,
            success: false,
            error: errorMessage,
            timestamp: new Date(),
            duration,
          },
        ]);

        setPerformanceMetrics(prev => ({
          ...prev,
          totalNotifications: prev.totalNotifications + 1,
          failedNotifications: prev.failedNotifications + 1,
        }));
      }
    },
    [sendNotification]
  );

  // Run all test scenarios
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setPerformanceMetrics({
      startTime: Date.now(),
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0,
      averageResponseTime: 0,
    });

    for (const scenario of testScenarios) {
      await runTestScenario(scenario);
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setPerformanceMetrics(prev => ({
      ...prev,
      endTime: Date.now(),
    }));

    setIsRunning(false);
  };

  // Send custom notification
  const sendCustomNotification = async () => {
    try {
      const notification = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: customNotification.title,
        message: customNotification.message,
        type: customNotification.type,
        category: customNotification.category,
        priority: customNotification.priority,
        timestamp: new Date().toISOString(),
        channels: customNotification.channels,
        data: {
          title: customNotification.title,
          message: customNotification.message,
          type: customNotification.type,
          category: customNotification.category,
          priority: customNotification.priority,
          actions: customNotification.hasActions
            ? [
                {
                  id: 'test',
                  label: 'Test Action',
                  type: 'primary' as const,
                },
              ]
            : undefined,
          metadata: {
            source: 'custom-test',
          },
        },
      };

      await sendNotification(notification as never);

      toastSystem.showSuccess('Custom Notification Sent', 'Your test notification was sent successfully');
    } catch (error) {
      toastSystem.showError('Failed to Send', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Run load test
  const runLoadTest = async () => {
    setLoadTest(prev => ({
      ...prev,
      isRunning: true,
      progress: 0,
      sent: 0,
      errors: 0,
    }));

    const scenario = loadTest.scenario;

    for (let i = 0; i < scenario.count; i++) {
      try {
        const notification = {
          id: `load-test-${i}-${Date.now()}`,
          title: `Load Test Notification ${i + 1}`,
          message: `This is load test notification ${i + 1} of ${scenario.count}`,
          type: 'info' as NotificationType,
          category: 'system' as NotificationCategory,
          priority: 'low' as NotificationPriority,
          timestamp: new Date().toISOString(),
          channels: ['in-app' as const],
          data: {
            title: `Load Test Notification ${i + 1}`,
            message: `This is load test notification ${i + 1} of ${scenario.count}`,
            type: 'info',
            category: 'system',
            priority: 'low',
            metadata: {
              source: 'load-test',
              testBatch: scenario.name,
              batchIndex: i,
            },
          },
        };

        await sendNotification(notification as never);

        setLoadTest(prev => ({
          ...prev,
          sent: prev.sent + 1,
          progress: Math.round(((i + 1) / scenario.count) * 100),
        }));
      } catch (_error) {
        setLoadTest(prev => ({
          ...prev,
          errors: prev.errors + 1,
          progress: Math.round(((i + 1) / scenario.count) * 100),
        }));
      }

      // Delay between notifications
      if (i < scenario.count - 1) {
        await new Promise(resolve => setTimeout(resolve, scenario.interval));
      }
    }

    setLoadTest(prev => ({ ...prev, isRunning: false }));
  };

  // Clear test data
  const clearTestData = () => {
    setTestResults([]);
    setPerformanceMetrics({
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0,
      averageResponseTime: 0,
    });
    clearAll();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TestTube className="w-6 h-6 text-foreground" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Notification Test Suite</h2>
            <p className="text-sm text-muted-foreground">Test and validate notification functionality</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline">{notifications.length} notifications</Badge>
          <Badge variant={unreadCount > 0 ? 'default' : 'secondary'}>{unreadCount} unread</Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="custom">Custom Test</TabsTrigger>
          <TabsTrigger value="load">Load Testing</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Test Scenarios */}
        <TabsContent value="scenarios" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Predefined Test Scenarios</h3>
            <div className="flex items-center space-x-2">
              <Button onClick={runAllTests} disabled={isRunning || isLoading} className="flex items-center space-x-2">
                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Run All Tests</span>
              </Button>
              <Button variant="outline" onClick={clearTestData} className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testScenarios.map(scenario => (
              <Card key={scenario.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      <CardDescription className="text-sm">{scenario.description}</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runTestScenario(scenario)}
                      disabled={isRunning || isLoading}
                      className="ml-2"
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="text-xs">
                        {scenario.type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant={scenario.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                        {scenario.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {scenario.category}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Channels:</span>
                      <div className="flex space-x-1">
                        {scenario.channels.map(channel => (
                          <div key={channel} className="text-xs text-muted-foreground">
                            {channel === 'push' && <Smartphone className="w-3 h-3" />}
                            {channel === 'email' && <Mail className="w-3 h-3" />}
                            {channel === 'in-app' && <Monitor className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Test */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Test Notification</CardTitle>
              <CardDescription>Build and send a custom notification to test specific scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={customNotification.title}
                    onChange={e => setCustomNotification(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Notification title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={customNotification.type}
                    onValueChange={(value: NotificationType) =>
                      setCustomNotification(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={customNotification.category}
                    onValueChange={(value: NotificationCategory) =>
                      setCustomNotification(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="watchlist">Watchlist</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={customNotification.priority}
                    onValueChange={(value: NotificationPriority) =>
                      setCustomNotification(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={customNotification.message}
                  onChange={e => setCustomNotification(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Notification message"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={customNotification.hasActions}
                    onCheckedChange={checked => setCustomNotification(prev => ({ ...prev, hasActions: checked }))}
                  />
                  <label className="text-sm">Include Actions</label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Channels: {customNotification.channels.join(', ')}
                </div>
                <Button onClick={sendCustomNotification} disabled={isLoading} className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Send Test</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Load Testing */}
        <TabsContent value="load" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Load Testing</CardTitle>
              <CardDescription>Test system performance with multiple notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Test Scenario</label>
                  <Select
                    value={loadTest.scenario.name}
                    onValueChange={value => {
                      const scenario = loadTestScenarios.find(s => s.name === value);
                      if (scenario) {
                        setLoadTest(prev => ({ ...prev, scenario }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {loadTestScenarios.map(scenario => (
                        <SelectItem key={scenario.name} value={scenario.name}>
                          {scenario.name} ({scenario.count} notifications)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={runLoadTest}
                    disabled={loadTest.isRunning}
                    className="flex items-center space-x-2 w-full"
                  >
                    {loadTest.isRunning ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Target className="w-4 h-4" />
                    )}
                    <span>Start Load Test</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{loadTest.scenario.count}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">{loadTest.sent}</div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-error">{loadTest.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{loadTest.progress}%</div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                </div>
              </div>

              {loadTest.isRunning && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadTest.progress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results" className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Performance Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{performanceMetrics.totalNotifications}</div>
                  <div className="text-sm text-muted-foreground">Total Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{performanceMetrics.successfulNotifications}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-error">{performanceMetrics.failedNotifications}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(performanceMetrics.averageResponseTime)}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
              </div>

              {performanceMetrics.startTime && performanceMetrics.endTime && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Test duration: {Math.round((performanceMetrics.endTime - performanceMetrics.startTime) / 1000)}s
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Test Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {testResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No test results yet. Run some tests to see results here.
                    </div>
                  ) : (
                    testResults
                      .slice()
                      .reverse()
                      .map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            result.success ? 'border-success/20 bg-success/10' : 'border-error/20 bg-error/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {result.success ? (
                                <CheckCircle className="w-4 h-4 text-success" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-error" />
                              )}
                              <span className="font-medium">{result.scenario}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{result.duration}ms</div>
                          </div>

                          {result.error && <div className="mt-2 text-sm text-error">Error: {result.error}</div>}

                          <div className="mt-1 text-xs text-muted-foreground">{result.timestamp.toLocaleTimeString()}</div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
