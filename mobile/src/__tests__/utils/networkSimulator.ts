import type { NetInfoState } from '@react-native-community/netinfo';

/**
 * NetworkSimulator - Test utility for simulating network state changes
 *
 * This utility allows tests to programmatically control network connectivity
 * state without requiring actual network changes or platform-specific code.
 *
 * @example
 * ```typescript
 * // In your test
 * import { NetworkSimulator } from '../utils/networkSimulator';
 *
 * it('should queue requests when offline', async () => {
 *   NetworkSimulator.goOffline();
 *   // ... test offline behavior
 *
 *   NetworkSimulator.goOnline();
 *   // ... test online behavior
 * });
 * ```
 */
export class NetworkSimulator {
  private static callbacks: Set<(state: NetInfoState) => void> = new Set();
  private static currentState: NetInfoState = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'test-network',
      bssid: '00:00:00:00:00:00',
      strength: 100,
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
      frequency: 2400,
      linkSpeed: 300,
      rxLinkSpeed: 300,
      txLinkSpeed: 300,
    },
  };

  /**
   * Subscribe to network state changes
   * @param callback Function to call when network state changes
   * @returns Unsubscribe function
   */
  static subscribe(callback: (state: NetInfoState) => void): () => void {
    this.callbacks.add(callback);

    // Immediately notify with current state
    callback(this.currentState);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Simulate going offline (no connectivity)
   */
  static goOffline(): void {
    this.currentState = {
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    };
    this.notifySubscribers();
  }

  /**
   * Simulate going online with specified connection type
   * @param type Network connection type (wifi or cellular)
   */
  static goOnline(type: 'wifi' | 'cellular' = 'wifi'): void {
    this.currentState = {
      type,
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: type === 'cellular',
        ssid: type === 'wifi' ? 'test-network' : null,
        bssid: type === 'wifi' ? '00:00:00:00:00:00' : null,
        strength: type === 'wifi' ? 100 : 80,
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        frequency: type === 'wifi' ? 2400 : undefined,
        linkSpeed: type === 'wifi' ? 300 : undefined,
        rxLinkSpeed: type === 'wifi' ? 300 : undefined,
        txLinkSpeed: type === 'wifi' ? 300 : undefined,
        cellularGeneration: type === 'cellular' ? '4g' : undefined,
        carrier: type === 'cellular' ? 'Test Carrier' : undefined,
      },
    };
    this.notifySubscribers();
  }

  /**
   * Simulate poor network quality (slow connection)
   */
  static simulatePoorQuality(): void {
    this.currentState = {
      type: 'cellular',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: true,
        ssid: null,
        bssid: null,
        strength: 20, // Poor signal
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        cellularGeneration: '3g', // Slower 3G connection
        carrier: 'Test Carrier',
      },
    };
    this.notifySubscribers();
  }

  /**
   * Simulate connected but no internet access
   */
  static simulateNoInternet(): void {
    this.currentState = {
      type: 'wifi',
      isConnected: true,
      isInternetReachable: false, // Connected to WiFi but no internet
      details: {
        isConnectionExpensive: false,
        ssid: 'test-network',
        bssid: '00:00:00:00:00:00',
        strength: 100,
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        frequency: 2400,
        linkSpeed: 300,
        rxLinkSpeed: 300,
        txLinkSpeed: 300,
      },
    };
    this.notifySubscribers();
  }

  /**
   * Simulate switching between WiFi and Cellular
   * @param targetType The network type to switch to
   */
  static switchNetworkType(targetType: 'wifi' | 'cellular'): void {
    this.goOnline(targetType);
  }

  /**
   * Get the current simulated network state
   * @returns Current NetInfoState
   */
  static getCurrentState(): NetInfoState {
    return { ...this.currentState };
  }

  /**
   * Reset the simulator to default online state and clear all subscribers
   */
  static reset(): void {
    this.currentState = {
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
        ssid: 'test-network',
        bssid: '00:00:00:00:00:00',
        strength: 100,
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        frequency: 2400,
        linkSpeed: 300,
        rxLinkSpeed: 300,
        txLinkSpeed: 300,
      },
    };
    this.callbacks.clear();
  }

  /**
   * Notify all subscribers of the current state
   */
  private static notifySubscribers(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Error in NetworkSimulator callback:', error);
      }
    });
  }

  /**
   * Get the number of active subscribers (useful for debugging)
   * @returns Number of active subscribers
   */
  static getSubscriberCount(): number {
    return this.callbacks.size;
  }
}
