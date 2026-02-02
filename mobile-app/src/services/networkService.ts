/**
 * Network Service - Monitors network connectivity status
 * Used for offline check-in/check-out functionality
 */

import NetInfo, {NetInfoState, NetInfoSubscription} from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  lastChecked: number;
}

type NetworkStatusCallback = (status: NetworkStatus) => void;

class NetworkService {
  private subscription: NetInfoSubscription | null = null;
  private listeners: Set<NetworkStatusCallback> = new Set();
  private currentStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    lastChecked: Date.now(),
  };
  private isInitialized: boolean = false;

  /**
   * Initialize network monitoring
   * Call this in App.tsx on mount
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('[NetworkService] Already initialized');
      return;
    }

    console.log('[NetworkService] Initializing...');

    // Get initial state
    NetInfo.fetch().then(state => {
      this.handleNetworkChange(state);
    });

    // Subscribe to network changes
    this.subscription = NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });

    this.isInitialized = true;
    console.log('[NetworkService] Initialized successfully');
  }

  /**
   * Handle network state change
   */
  private handleNetworkChange(state: NetInfoState): void {
    const previousStatus = this.currentStatus;

    this.currentStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      lastChecked: Date.now(),
    };

    console.log('[NetworkService] Network status changed:', {
      isConnected: this.currentStatus.isConnected,
      isInternetReachable: this.currentStatus.isInternetReachable,
      type: this.currentStatus.type,
    });

    // Notify listeners if status changed
    const wasOnline = previousStatus.isConnected && previousStatus.isInternetReachable;
    const isNowOnline = this.currentStatus.isConnected && this.currentStatus.isInternetReachable;

    if (wasOnline !== isNowOnline) {
      console.log('[NetworkService] Online status changed:', isNowOnline ? 'ONLINE' : 'OFFLINE');
    }

    // Notify all listeners
    this.listeners.forEach(callback => {
      try {
        callback(this.currentStatus);
      } catch (error) {
        console.error('[NetworkService] Error in listener callback:', error);
      }
    });
  }

  /**
   * Subscribe to network status changes
   * @returns Unsubscribe function
   */
  subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);

    // Immediately call with current status
    callback(this.currentStatus);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return {...this.currentStatus};
  }

  /**
   * Check if currently online (connected and internet reachable)
   */
  isOnline(): boolean {
    return this.currentStatus.isConnected && this.currentStatus.isInternetReachable === true;
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.currentStatus.isConnected || this.currentStatus.isInternetReachable === false;
  }

  /**
   * Force refresh network status
   */
  async refresh(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    this.handleNetworkChange(state);
    return this.getStatus();
  }

  /**
   * Check connectivity by making a test request
   * Useful for validating actual internet access
   */
  async checkConnectivity(testUrl?: string): Promise<boolean> {
    try {
      const url = testUrl || 'https://www.google.com/generate_204';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup - call when app unmounts
   */
  destroy(): void {
    console.log('[NetworkService] Destroying...');

    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }

    this.listeners.clear();
    this.isInitialized = false;

    console.log('[NetworkService] Destroyed');
  }
}

// Export singleton instance
export const networkService = new NetworkService();
