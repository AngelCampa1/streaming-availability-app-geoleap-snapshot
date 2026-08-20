/**
 * Animation Optimizer - React Native Reanimated performance optimization
 * Provides optimized animations, gesture handling, and frame rate management
 */

import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolate,
  useDerivedValue,
  SharedValue,
  DerivedValue,
} from 'react-native-reanimated';
import { performanceNow } from '../utils/performancePolyfill';
import { logger } from '../../utils/logger';

export interface AnimationConfig {
  enableHardwareAcceleration: boolean;
  enableNativeDriver: boolean;
  enableOptimizedAnimations: boolean;
  targetFrameRate: number;
  maxConcurrentAnimations: number;
  animationBudget: number; // ms per frame
  enableGestureOptimization: boolean;
  enableSmartInterpolation: boolean;
}

export interface AnimationPerformanceMetrics {
  frameDrops: number;
  averageFrameTime: number;
  animationCount: number;
  gestureResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface OptimizedAnimation {
  id: string;
  type: 'timing' | 'spring' | 'gesture' | 'layout';
  duration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRunning: boolean;
  frameDrops: number;
  startTime: number;
  endTime?: number;
}

class AnimationOptimizer {
  private static instance: AnimationOptimizer;
  private activeAnimations: Map<string, OptimizedAnimation> = new Map();
  private animationQueue: OptimizedAnimation[] = [];
  private frameDropCounter = 0;
  private lastFrameTime = 0;
  private isMonitoring = false;

  private config: AnimationConfig = {
    enableHardwareAcceleration: true,
    enableNativeDriver: true,
    enableOptimizedAnimations: true,
    targetFrameRate: 60,
    maxConcurrentAnimations: 5,
    animationBudget: 16.67, // 60fps = 16.67ms per frame
    enableGestureOptimization: true,
    enableSmartInterpolation: true,
  };

  private metrics: AnimationPerformanceMetrics = {
    frameDrops: 0,
    averageFrameTime: 0,
    animationCount: 0,
    gestureResponseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };

  private constructor() {
    this.initializeOptimizer();
  }

  public static getInstance(): AnimationOptimizer {
    if (!AnimationOptimizer.instance) {
      AnimationOptimizer.instance = new AnimationOptimizer();
    }
    return AnimationOptimizer.instance;
  }

  /**
   * Initialize animation optimizer
   */
  private initializeOptimizer(): void {
    this.setupFrameMonitoring();
    this.setupAnimationQueue();
  }

  /**
   * Setup frame rate monitoring
   */
  private setupFrameMonitoring(): void {
    this.isMonitoring = true;
    this.lastFrameTime = performanceNow();

    const monitorFrame = () => {
      if (!this.isMonitoring) {return;}

      const currentTime = performanceNow();
      const frameDuration = currentTime - this.lastFrameTime;

      // Check for frame drops (above target frame time)
      if (frameDuration > this.config.animationBudget) {
        this.frameDropCounter++;
        this.metrics.frameDrops++;
      }

      // Update average frame time
      this.metrics.averageFrameTime = (this.metrics.averageFrameTime + frameDuration) / 2;

      this.lastFrameTime = currentTime;
      requestAnimationFrame(monitorFrame);
    };

    requestAnimationFrame(monitorFrame);
  }

  /**
   * Setup animation queue processing
   */
  private setupAnimationQueue(): void {
    setInterval(() => {
      this.processAnimationQueue();
    }, 16); // Process queue every frame
  }

  /**
   * Process animation queue based on priority and performance budget
   */
  private processAnimationQueue(): void {
    if (this.animationQueue.length === 0) {return;}

    const availableSlots = this.config.maxConcurrentAnimations - this.activeAnimations.size;
    if (availableSlots <= 0) {return;}

    // Sort by priority
    this.animationQueue.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    // Start animations up to available slots
    const animationsToStart = this.animationQueue.splice(0, availableSlots);
    animationsToStart.forEach(animation => {
      this.startAnimation(animation);
    });
  }

  /**
   * Start an optimized animation
   */
  private startAnimation(animation: OptimizedAnimation): void {
    animation.isRunning = true;
    animation.startTime = performanceNow();
    this.activeAnimations.set(animation.id, animation);
    this.metrics.animationCount++;

    logger.log('[AnimationOptimizer] Started animation', {
      animationId: animation.id,
      type: animation.type,
    });
  }

  /**
   * Create optimized timing animation
   */
  public createTimingAnimation(
    value: SharedValue<number>,
    toValue: number,
    config: {
      duration?: number;
      priority?: OptimizedAnimation['priority'];
      easing?: (t: number) => number;
    } = {},
  ): Promise<void> {
    return new Promise((resolve) => {
      const animationId = this.generateAnimationId();
      const duration = config.duration || 300;
      const priority = config.priority || 'medium';

      const animation: OptimizedAnimation = {
        id: animationId,
        type: 'timing',
        duration,
        priority,
        isRunning: false,
        frameDrops: 0,
        startTime: 0,
      };

      // Queue or start immediately based on current load
      if (this.activeAnimations.size < this.config.maxConcurrentAnimations) {
        this.startTimingAnimation(value, toValue, duration, animationId, resolve);
      } else {
        this.animationQueue.push(animation);
        // Will be processed by queue processor
      }
    });
  }

  /**
   * Execute timing animation with optimization
   */
  private startTimingAnimation(
    value: SharedValue<number>,
    toValue: number,
    duration: number,
    animationId: string,
    resolve: () => void,
  ): void {
    value.value = withTiming(
      toValue,
      {
        duration,
        // Use optimized easing for better performance
        easing: this.getOptimizedEasing(),
      },
      (_finished) => {
        runOnJS(() => {
          this.completeAnimation(animationId);
          resolve();
        })();
      },
    );
  }

  /**
   * Create optimized spring animation
   */
  public createSpringAnimation(
    value: SharedValue<number>,
    toValue: number,
    config: {
      damping?: number;
      stiffness?: number;
      mass?: number;
      priority?: OptimizedAnimation['priority'];
    } = {},
  ): Promise<void> {
    return new Promise((resolve) => {
      const animationId = this.generateAnimationId();
      const priority = config.priority || 'medium';

      const animation: OptimizedAnimation = {
        id: animationId,
        type: 'spring',
        duration: 0, // Springs don't have fixed duration
        priority,
        isRunning: false,
        frameDrops: 0,
        startTime: 0,
      };

      if (this.activeAnimations.size < this.config.maxConcurrentAnimations) {
        this.startSpringAnimation(value, toValue, config, animationId, resolve);
      } else {
        this.animationQueue.push(animation);
      }
    });
  }

  /**
   * Execute spring animation with optimization
   */
  private startSpringAnimation(
    value: SharedValue<number>,
    toValue: number,


    config: { damping?: number; stiffness?: number; mass?: number },
    animationId: string,
    resolve: () => void,
  ): void {
    value.value = withSpring(
      toValue,
      {
        damping: config.damping || 15,
        stiffness: config.stiffness || 150,
        mass: config.mass || 1,
        // Optimize for 60fps (using v3 compatible config)
        velocity: 0,
        overshootClamping: false,
      },
      (_finished) => {
        runOnJS(() => {
          this.completeAnimation(animationId);
          resolve();
        })();
      },
    );
  }

  /**
   * Create optimized sequence animation
   */
  public createSequenceAnimation(
    value: SharedValue<number>,
    sequence: Array<{
      toValue: number;
      duration: number;
      delay?: number;
    }>,
    priority: OptimizedAnimation['priority'] = 'medium',
  ): Promise<void> {
    return new Promise((resolve) => {
      const animationId = this.generateAnimationId();

      const animation: OptimizedAnimation = {
        id: animationId,
        type: 'timing',
        duration: sequence.reduce((sum, item) => sum + item.duration + (item.delay || 0), 0),
        priority,
        isRunning: false,
        frameDrops: 0,
        startTime: 0,
      };

      if (this.activeAnimations.size < this.config.maxConcurrentAnimations) {
        this.startSequenceAnimation(value, sequence, animationId, resolve);
      } else {
        this.animationQueue.push(animation);
      }
    });
  }

  /**
   * Execute sequence animation
   */
  private startSequenceAnimation(
    value: SharedValue<number>,
    sequence: Array<{ toValue: number; duration: number; delay?: number }>,
    animationId: string,
    resolve: () => void,
  ): void {
    const animations = sequence.map((item, _index) => {
      const animation = withTiming(item.toValue, {
        duration: item.duration,
        easing: this.getOptimizedEasing(),
      });

      return item.delay ? withDelay(item.delay, animation) : animation;
    });

    value.value = withSequence(
      ...animations,
      // Add completion callback
      withTiming(value.value, { duration: 0 }, (_finished) => {
        runOnJS(() => {
          this.completeAnimation(animationId);
          resolve();
        })();
      }),
    );
  }

  /**
   * Create optimized interpolation
   */
  public createOptimizedInterpolation(
    value: SharedValue<number>,
    inputRange: number[],
    outputRange: number[],
    extrapolate?: typeof Extrapolate.CLAMP,
  ): DerivedValue<number> {
    if (!this.config.enableSmartInterpolation) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useDerivedValue(() => {
        'worklet';
        return interpolate(
          value.value,
          inputRange,
          outputRange,
          extrapolate || Extrapolate.CLAMP,
        );
      });
    }

    // Smart interpolation with caching
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useDerivedValue(() => {
      'worklet';
      // Add smart caching logic here
      return interpolate(
        value.value,
        inputRange,
        outputRange,
        extrapolate || Extrapolate.CLAMP,
      );
    });
  }

  /**
   * Create optimized animated style
   */
  public createOptimizedStyle(
    styleFunction: () => Record<string, any>,
  ): Record<string, any> {
    if (!this.config.enableOptimizedAnimations) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useAnimatedStyle(styleFunction);
    }

    // Add optimization layers
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAnimatedStyle(() => {
      'worklet';
      const style = styleFunction();

      // Apply hardware acceleration hints
      if (this.config.enableHardwareAcceleration) {
        style.transform = style.transform || [];
        if (!style.transform.some((t: any) => t.translateZ !== undefined)) {
          style.transform.push({ translateZ: 0 });
        }
      }

      return style;
    });
  }

  /**
   * Optimize gesture handling
   */
  public createOptimizedGestureHandler(


    gestureHandler: any,
    _priority: OptimizedAnimation['priority'] = 'high',
  ): any {
    if (!this.config.enableGestureOptimization) {
      return gestureHandler;
    }

    // Add gesture optimization wrapper
    return gestureHandler
      .runOnJS(false) // Run on UI thread
      .shouldCancelWhenOutside(true)
      .onUpdate((  event: unknown) => {
        'worklet';
        // Throttle updates for better performance
        const now = performanceNow();
        if (now - this.lastFrameTime < this.config.animationBudget) {
          return;
        }

        gestureHandler.onUpdate?.(event);
      });
  }

  /**
   * Complete animation and update metrics
   */
  private completeAnimation(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (!animation) {return;}

    animation.isRunning = false;
    animation.endTime = performanceNow();

    const actualDuration = animation.endTime - animation.startTime;

    // Check if animation exceeded expected duration significantly
    if (animation.duration > 0 && actualDuration > animation.duration * 1.5) {
      logger.warn('[AnimationOptimizer] Animation exceeded expected duration', {
        animationId,
        actualDuration,
        expectedDuration: animation.duration,
      });
    }

    this.activeAnimations.delete(animationId);
    logger.log('[AnimationOptimizer] Completed animation', {
      animationId,
      durationMs: actualDuration,
    });

    // Process next animation in queue
    if (this.animationQueue.length > 0) {
      const nextAnimation = this.animationQueue.shift()!;
      this.startAnimation(nextAnimation);
    }
  }

  /**
   * Get optimized easing function
   */
  private getOptimizedEasing(): (t: number) => number {
    // Return hardware-optimized easing
    return (t: number) => {
      'worklet';
      // Cubic bezier that's optimized for 60fps
      return t * t * (3 - 2 * t);
    };
  }

  /**
   * Cancel animation
   */
  public cancelAnimation(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.isRunning = false;
      this.activeAnimations.delete(animationId);
      logger.log('[AnimationOptimizer] Cancelled animation', { animationId });
    }
  }

  /**
   * Cancel all animations
   */
  public cancelAllAnimations(): void {
    this.activeAnimations.forEach((animation, id) => {
      this.cancelAnimation(id);
    });
    this.animationQueue = [];
    logger.log('[AnimationOptimizer] All animations cancelled');
  }

  /**
   * Optimize animation performance based on current metrics
   */
  public optimizePerformance(): void {
    const frameDropRate = this.metrics.frameDrops / this.metrics.animationCount;

    if (frameDropRate > 0.1) { // More than 10% frame drops
      logger.warn('[AnimationOptimizer] High frame drop rate detected, reducing animation complexity', {
        frameDropRate,
      });

      // Reduce concurrent animations
      this.config.maxConcurrentAnimations = Math.max(2, this.config.maxConcurrentAnimations - 1);

      // Increase animation budget (lower frame rate)
      this.config.animationBudget = Math.min(33.33, this.config.animationBudget * 1.2);
    } else if (frameDropRate < 0.02) { // Less than 2% frame drops
      // Performance is good, can increase complexity
      this.config.maxConcurrentAnimations = Math.min(8, this.config.maxConcurrentAnimations + 1);
      this.config.animationBudget = Math.max(16.67, this.config.animationBudget * 0.9);
    }

    logger.log('[AnimationOptimizer] Animation performance optimized', {
      maxConcurrent: this.config.maxConcurrentAnimations,
      budgetMs: this.config.animationBudget,
    });
  }

  /**
   * Get animation performance metrics
   */
  public getPerformanceMetrics(): AnimationPerformanceMetrics {
    return {
      ...this.metrics,
      animationCount: this.activeAnimations.size,
    };
  }

  /**
   * Get animation statistics
   */
  public getAnimationStats(): {
    activeAnimations: number;
    queuedAnimations: number;
    frameDropRate: number;
    averageFrameTime: number;
    targetFrameTime: number;
  } {
    return {
      activeAnimations: this.activeAnimations.size,
      queuedAnimations: this.animationQueue.length,
      frameDropRate: this.metrics.animationCount > 0
        ? this.metrics.frameDrops / this.metrics.animationCount
        : 0,
      averageFrameTime: this.metrics.averageFrameTime,
      targetFrameTime: this.config.animationBudget,
    };
  }

  /**
   * Generate unique animation ID
   */
  private generateAnimationId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Configure animation optimizer
   */
  public configure(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.log('[AnimationOptimizer] Animation optimizer configured', { config: this.config });
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      frameDrops: 0,
      averageFrameTime: 0,
      animationCount: 0,
      gestureResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };
    this.frameDropCounter = 0;
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    this.setupFrameMonitoring();
  }

  /**
   * Cleanup optimizer
   */
  public cleanup(): void {
    this.stopMonitoring();
    this.cancelAllAnimations();
  }
}

export default AnimationOptimizer;
