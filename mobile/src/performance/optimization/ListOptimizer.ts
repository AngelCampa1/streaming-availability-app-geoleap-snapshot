/**
 * List Optimizer - High-performance list optimization for FlatList and FlashList
 * Provides windowing, virtualization, and intelligent data management
 */

import React from 'react';
import { /* FlatList, VirtualizedList, */ ListRenderItem, ListRenderItemInfo } from 'react-native';
import { performanceNow } from '../utils/performancePolyfill';
import { logger } from '../../utils/logger';
// import { FlashList } from '@shopify/flash-list';

export interface ListOptimizationConfig {
  enableVirtualization: boolean;
  enableWindowingOptimization: boolean;
  initialNumToRender: number;
  maxToRenderPerBatch: number;
  windowSize: number;
  updateCellsBatchingPeriod: number;
  removeClippedSubviews: boolean;
  enableItemDiffing: boolean;
  enableLazyRendering: boolean;
  cacheSize: number;
}

export interface ListItemData {
  id: string | number;
  data: unknown;
  height?: number;
  cached?: boolean;
  renderCount?: number;
  lastRendered?: number;
}

export interface ListPerformanceMetrics {
  totalItems: number;
  renderedItems: number;
  averageRenderTime: number;
  scrollPerformance: number;
  memoryUsage: number;
  cacheHitRatio: number;
  frameDrops: number;
}

class ListOptimizer {
  private static instance: ListOptimizer;
  private renderCache: Map<string, any> = new Map();
  private itemHeightCache: Map<string, number> = new Map();
  private performanceMetrics: Map<string, ListPerformanceMetrics> = new Map();
  private frameDropCounter = 0;

  private config: ListOptimizationConfig = {
    enableVirtualization: true,
    enableWindowingOptimization: true,
    initialNumToRender: 10,
    maxToRenderPerBatch: 5,
    windowSize: 21,
    updateCellsBatchingPeriod: 50,
    removeClippedSubviews: true,
    enableItemDiffing: true,
    enableLazyRendering: true,
    cacheSize: 200,
  };

  private constructor() {
    this.initializeOptimizer();
  }

  public static getInstance(): ListOptimizer {
    if (!ListOptimizer.instance) {
      ListOptimizer.instance = new ListOptimizer();
    }
    return ListOptimizer.instance;
  }

  /**
   * Initialize list optimizer
   */
  private initializeOptimizer(): void {
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup performance monitoring for lists
   */
  private setupPerformanceMonitoring(): void {
    // Monitor frame drops
    if (typeof requestAnimationFrame !== 'undefined') {
      let lastFrameTime = performanceNow();

      const checkFrameRate = () => {
        const currentTime = performanceNow();
        const frameDuration = currentTime - lastFrameTime;

        // Detect frame drops (>16.67ms for 60fps)
        if (frameDuration > 16.67) {
          this.frameDropCounter++;
        }

        lastFrameTime = currentTime;
        requestAnimationFrame(checkFrameRate);
      };

      requestAnimationFrame(checkFrameRate);
    }
  }

  /**
   * Create optimized FlatList configuration
   */
  public createOptimizedFlatList<T>(
    data: T[],
    renderItem: (item: T, index: number) => React.ReactElement,
    keyExtractor: (item: T, index: number) => string,
    listId: string = 'default',
  ): any {

    const optimizedRenderItem = this.createOptimizedRenderItem(
      renderItem,
      keyExtractor,
      listId,
    );

    const getItemLayout = this.createItemLayoutFunction(listId);

    return {
      data,
      renderItem: optimizedRenderItem,
      keyExtractor,
      getItemLayout,

      // Performance optimizations
      initialNumToRender: this.config.initialNumToRender,
      maxToRenderPerBatch: this.config.maxToRenderPerBatch,
      windowSize: this.config.windowSize,
      updateCellsBatchingPeriod: this.config.updateCellsBatchingPeriod,
      removeClippedSubviews: this.config.removeClippedSubviews,

      // Memory optimizations
      onEndReachedThreshold: 0.5,
      onScrollToIndexFailed: this.handleScrollToIndexFailed,

      // Performance callbacks
      onViewableItemsChanged: this.createViewableItemsHandler(listId),
      viewabilityConfig: {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
      },
    };
  }

  /**
   * Create optimized FlashList configuration
   */
  public createOptimizedFlashList<T>(
    data: T[],
    renderItem: (item: T, index: number) => React.ReactElement,
    keyExtractor: (item: T, index: number) => string,
    listId: string = 'flash-default',
  ): any {

    const optimizedRenderItem = this.createOptimizedRenderItem(
      renderItem,
      keyExtractor,
      listId,
    );

    const estimatedItemSize = this.getEstimatedItemSize(listId);

    return {
      data,
      renderItem: optimizedRenderItem,
      keyExtractor,
      estimatedItemSize,

      // FlashList specific optimizations
      drawDistance: 250,
      cached: this.config.enableLazyRendering,

      // Performance callbacks
      onViewableItemsChanged: this.createViewableItemsHandler(listId),
      viewabilityConfig: {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
      },
    };
  }

  /**
   * Create optimized render item function with caching
   */
  private createOptimizedRenderItem<T>(
    renderItem: (item: T, index: number) => React.ReactElement,
    keyExtractor: (item: T, index: number) => string,
    listId: string,
  ): ListRenderItem<T> {
    return ({ item, index }: ListRenderItemInfo<T>) => {
      const startTime = performanceNow();
      const itemKey = keyExtractor(item, index);
      const cacheKey = `${listId}-${itemKey}`;

      // Check cache first
      if (this.config.enableLazyRendering && this.renderCache.has(cacheKey)) {
        const cached = this.renderCache.get(cacheKey);
        this.updateRenderMetrics(listId, performanceNow() - startTime, true);
        return cached;
      }

      // Render new item
      const renderedItem = renderItem(item, index);

      // Cache if enabled and within cache size limit
      if (this.config.enableLazyRendering && this.renderCache.size < this.config.cacheSize) {
        this.renderCache.set(cacheKey, renderedItem);
      }

      this.updateRenderMetrics(listId, performanceNow() - startTime, false);
      return renderedItem;
    };
  }

  /**
   * Create item layout function for better performance
   */
  private createItemLayoutFunction(listId: string) {
    return (data: unknown, index: number) => {
      const height = this.getItemHeight(listId, index);
      return {
        length: height,
        offset: height * index,
        index,
      };
    };
  }

  /**
   * Get estimated or cached item height
   */
  private getItemHeight(listId: string, index: number): number {
    const cacheKey = `${listId}-${index}`;
    return this.itemHeightCache.get(cacheKey) || this.getEstimatedItemSize(listId);
  }

  /**
   * Get estimated item size for the list
   */
  private getEstimatedItemSize(_listId: string): number {
    // Calculate average from cached heights
    const heights = Array.from(this.itemHeightCache.values());
    if (heights.length > 0) {
      return heights.reduce((sum, height) => sum + height, 0) / heights.length;
    }
    return 80; // Default estimate
  }

  /**
   * Handle scroll to index failures gracefully
   */
  private handleScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    logger.warn('[ListOptimizer] Scroll to index failed', { info });
    // Could implement retry logic here
  };

  /**
   * Create viewable items change handler
   */
  private createViewableItemsHandler(listId: string) {
    return ({ viewableItems, changed }: any) => {
      // Update performance metrics
      this.updateViewabilityMetrics(listId, viewableItems, changed);

      // Cleanup cache for items that are no longer viewable
      if (this.config.enableLazyRendering) {
        this.cleanupInvisibleItems(listId, viewableItems);
      }
    };
  }

  /**
   * Update render performance metrics
   */
  private updateRenderMetrics(listId: string, renderTime: number, fromCache: boolean): void {
    const metrics = this.performanceMetrics.get(listId) || {
      totalItems: 0,
      renderedItems: 0,
      averageRenderTime: 0,
      scrollPerformance: 60,
      memoryUsage: 0,
      cacheHitRatio: 0,
      frameDrops: 0,
    };

    metrics.renderedItems++;
    metrics.averageRenderTime = (metrics.averageRenderTime + renderTime) / 2;

    if (fromCache) {
      metrics.cacheHitRatio = (metrics.cacheHitRatio * (metrics.renderedItems - 1) + 1) / metrics.renderedItems;
    } else {
      metrics.cacheHitRatio = (metrics.cacheHitRatio * (metrics.renderedItems - 1)) / metrics.renderedItems;
    }

    this.performanceMetrics.set(listId, metrics);
  }

  /**
   * Update viewability metrics
   */
  private updateViewabilityMetrics(listId: string, _viewableItems: unknown[], _changed: unknown[]): void {
    const metrics = this.performanceMetrics.get(listId);
    if (metrics) {
      metrics.frameDrops = this.frameDropCounter;
      metrics.memoryUsage = this.renderCache.size * 1024; // Estimate 1KB per cached item
      this.performanceMetrics.set(listId, metrics);
    }
  }

  /**
   * Cleanup cache for invisible items
   */
  private cleanupInvisibleItems(listId: string, viewableItems: any[]): void {
    const viewableKeys = new Set(
      viewableItems.map(item => `${listId}-${item.key}`),
    );

    // Remove items from cache that are no longer viewable
    for (const [cacheKey] of this.renderCache) {
      if (cacheKey.startsWith(`${listId}-`) && !viewableKeys.has(cacheKey)) {
        this.renderCache.delete(cacheKey);
      }
    }
  }

  /**
   * Optimize list data with intelligent chunking
   */
  public optimizeListData<T>(
    data: T[],
    chunkSize: number = 50,
  ): {
    chunks: T[][];
    loadNextChunk: () => T[];
    hasMore: boolean;
  } {
    const chunks: T[][] = [];
    let currentIndex = 0;

    // Create initial chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    const loadNextChunk = (): T[] => {
      if (currentIndex < chunks.length) {
        return chunks[currentIndex++];
      }
      return [];
    };

    return {
      chunks,
      loadNextChunk,
      hasMore: currentIndex < chunks.length,
    };
  }

  /**
   * Create intelligent item differ for better performance
   */
  public createItemDiffer<T>() {
    const previousData = new Map<string, T>();

    return (newData: T[], keyExtractor: (item: T, index: number) => string): T[] => {
      if (!this.config.enableItemDiffing) {
        return newData;
      }

      const diffedData: T[] = [];
      const newDataMap = new Map<string, T>();

      // Build new data map
      newData.forEach((item, _index) => {
        const key = keyExtractor(item, _index);
        newDataMap.set(key, item);
      });

      // Compare with previous data
      newData.forEach((item, _index) => {
        const key = keyExtractor(item, _index);
        const previousItem = previousData.get(key);

        if (!previousItem || !this.deepEqual(item, previousItem)) {
          diffedData.push(item);
        }
      });

      // Update previous data
      previousData.clear();
      newDataMap.forEach((value, key) => {
        previousData.set(key, value);
      });

      return diffedData.length === newData.length ? newData : diffedData;
    };
  }

  /**
   * Deep equality check for item diffing
   */
  private deepEqual(obj1: unknown,
 obj2: unknown): boolean {
    if (obj1 === obj2) {return true;}

    if (obj1 == null || obj2 == null) {return false;}

    if (typeof obj1 !== typeof obj2) {return false;}

    if (typeof obj1 !== 'object') {return obj1 === obj2;}

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {return false;}

    for (const key of keys1) {
      if (!keys2.includes(key)) {return false;}
      if (!this.deepEqual(obj1[key], obj2[key])) {return false;}
    }

    return true;
  }

  /**
   * Set item height for better layout calculations
   */
  public setItemHeight(listId: string, index: number, height: number): void {
    const cacheKey = `${listId}-${index}`;
    this.itemHeightCache.set(cacheKey, height);
  }

  /**
   * Preload items for smoother scrolling
   */
  public preloadItems<T>(
    data: T[],
    renderItem: (item: T, index: number) => React.ReactElement,
    keyExtractor: (item: T, index: number) => string,
    listId: string,
    startIndex: number = 0,
    count: number = 10,
  ): void {
    const endIndex = Math.min(startIndex + count, data.length);

    for (let i = startIndex; i < endIndex; i++) {
      const item = data[i];
      const itemKey = keyExtractor(item, i);
      const cacheKey = `${listId}-${itemKey}`;

      if (!this.renderCache.has(cacheKey)) {
        const renderedItem = renderItem(item, i);
        this.renderCache.set(cacheKey, renderedItem);
      }
    }

    logger.log('[ListOptimizer] Preloaded items for list', {
      listId,
      itemCount: endIndex - startIndex,
    });
  }

  /**
   * Get list performance metrics
   */
  public getListMetrics(listId: string): ListPerformanceMetrics | null {
    return this.performanceMetrics.get(listId) || null;
  }

  /**
   * Get all performance metrics
   */
  public getAllMetrics(): Map<string, ListPerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Clear cache for specific list
   */
  public clearListCache(listId: string): void {
    for (const [key] of this.renderCache) {
      if (key.startsWith(`${listId}-`)) {
        this.renderCache.delete(key);
      }
    }

    for (const [key] of this.itemHeightCache) {
      if (key.startsWith(`${listId}-`)) {
        this.itemHeightCache.delete(key);
      }
    }

    logger.log('[ListOptimizer] Cleared cache for list', { listId });
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.renderCache.clear();
    this.itemHeightCache.clear();
    this.performanceMetrics.clear();
    this.frameDropCounter = 0;
    logger.log('[ListOptimizer] All list caches cleared');
  }

  /**
   * Configure list optimizer
   */
  public configure(newConfig: Partial<ListOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.log('[ListOptimizer] List optimizer configured', { config: this.config });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    renderCacheSize: number;
    heightCacheSize: number;
    totalMemoryUsage: number;
  } {
    return {
      renderCacheSize: this.renderCache.size,
      heightCacheSize: this.itemHeightCache.size,
      totalMemoryUsage: (this.renderCache.size + this.itemHeightCache.size) * 1024, // Estimate
    };
  }
}

export default ListOptimizer;
