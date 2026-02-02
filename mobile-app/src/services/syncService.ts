/**
 * Sync Service - Handles automatic syncing of offline punches
 * Monitors network status and syncs pending punches when online
 */

import {networkService, NetworkStatus} from './networkService';
import {
  useOfflineQueueStore,
  OfflinePunch,
} from '../store/offlineQueueStore';
import {attendanceApi} from '../api/attendanceApi';
import {showToast} from '../utils/alert';

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL = 30000; // 30 seconds
const SYNC_DELAY_AFTER_ONLINE = 2000; // 2 seconds delay after coming online

class SyncService {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  private isInitialized: boolean = false;
  private isSyncInProgress: boolean = false;

  /**
   * Initialize sync service - call from App.tsx
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('[SyncService] Already initialized');
      return;
    }

    console.log('[SyncService] Initializing...');

    // Listen for network status changes
    this.networkUnsubscribe = networkService.subscribe(
      this.handleNetworkChange.bind(this),
    );

    // Start periodic sync check
    this.startPeriodicSync();

    // Try initial sync if online
    if (networkService.isOnline()) {
      this.syncPendingPunches();
    }

    this.isInitialized = true;
    console.log('[SyncService] Initialized successfully');
  }

  /**
   * Handle network status change
   */
  private handleNetworkChange(status: NetworkStatus): void {
    const isOnline = status.isConnected && status.isInternetReachable;

    if (isOnline) {
      console.log('[SyncService] Network restored, scheduling sync...');
      // Delay sync slightly to allow network to stabilize
      setTimeout(() => {
        this.syncPendingPunches();
      }, SYNC_DELAY_AFTER_ONLINE);
    }
  }

  /**
   * Sync all pending punches
   */
  async syncPendingPunches(): Promise<{synced: number; failed: number}> {
    const store = useOfflineQueueStore.getState();

    // Prevent concurrent syncs
    if (this.isSyncInProgress || store.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping...');
      return {synced: 0, failed: 0};
    }

    const pendingPunches = store.getPendingPunches();

    if (pendingPunches.length === 0) {
      console.log('[SyncService] No pending punches to sync');
      return {synced: 0, failed: 0};
    }

    // Check if online
    if (!networkService.isOnline()) {
      console.log('[SyncService] Offline, skipping sync');
      return {synced: 0, failed: 0};
    }

    console.log(
      `[SyncService] Starting sync of ${pendingPunches.length} punch(es)...`,
    );

    this.isSyncInProgress = true;
    store.setSyncing(true);

    let synced = 0;
    let failed = 0;

    for (const punch of pendingPunches) {
      try {
        // Update status to syncing
        store.updatePunchStatus(punch.id, 'syncing');

        // Sync the punch
        await this.syncSinglePunch(punch);

        // Mark as synced
        store.updatePunchStatus(punch.id, 'synced');
        synced++;

        console.log(`[SyncService] Synced punch ${punch.id} successfully`);
      } catch (error: any) {
        console.error(`[SyncService] Failed to sync punch ${punch.id}:`, error);

        // Increment attempt count
        store.incrementSyncAttempts(punch.id);
        const updatedPunch = store.queue.find(p => p.id === punch.id);
        const attempts = updatedPunch?.syncAttempts || punch.syncAttempts + 1;

        if (attempts >= MAX_RETRY_ATTEMPTS) {
          // Max retries reached, mark as failed
          store.updatePunchStatus(
            punch.id,
            'failed',
            error.message || 'Failed after multiple attempts',
          );
          failed++;
        } else {
          // Will retry later
          store.updatePunchStatus(
            punch.id,
            'pending',
            error.message || 'Sync failed, will retry',
          );
        }
      }
    }

    this.isSyncInProgress = false;
    store.setSyncing(false);
    store.updateLastSyncTime();

    // Clean up synced punches
    store.clearSyncedPunches();

    // Show notifications
    if (synced > 0) {
      showToast.success(
        'Sync Complete',
        `${synced} offline punch${synced > 1 ? 'es' : ''} synced successfully`,
      );
    }
    if (failed > 0) {
      showToast.error(
        'Sync Failed',
        `${failed} punch${failed > 1 ? 'es' : ''} failed to sync`,
      );
    }

    console.log(`[SyncService] Sync complete: ${synced} synced, ${failed} failed`);

    return {synced, failed};
  }

  /**
   * Sync a single punch
   */
  private async syncSinglePunch(punch: OfflinePunch): Promise<void> {
    const request = {
      employeeId: punch.employeeId,
      location: {
        latitude: punch.location.latitude,
        longitude: punch.location.longitude,
        address: punch.location.address,
      },
      originalTimestamp: punch.timestamp,
      confidence: punch.faceVerification?.confidence,
      isOffline: true,
    };

    if (punch.type === 'check-in') {
      const response = await attendanceApi.confirmOfflineCheckIn(request);
      if (!response.success) {
        throw new Error(response.message || 'Failed to sync check-in');
      }
    } else {
      const response = await attendanceApi.confirmOfflineCheckOut(request);
      if (!response.success) {
        throw new Error(response.message || 'Failed to sync check-out');
      }
    }
  }

  /**
   * Start periodic sync check
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (networkService.isOnline()) {
        const store = useOfflineQueueStore.getState();
        const pendingCount = store.getPendingPunches().length;

        if (pendingCount > 0) {
          console.log(
            `[SyncService] Periodic sync check: ${pendingCount} pending punch(es)`,
          );
          this.syncPendingPunches();
        }
      }
    }, SYNC_INTERVAL);

    console.log(
      `[SyncService] Started periodic sync every ${SYNC_INTERVAL / 1000}s`,
    );
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<{synced: number; failed: number}> {
    console.log('[SyncService] Manual sync triggered');
    return this.syncPendingPunches();
  }

  /**
   * Retry all failed punches
   */
  async retryFailedPunches(): Promise<{synced: number; failed: number}> {
    const store = useOfflineQueueStore.getState();
    const failedPunches = store.getFailedPunches();

    if (failedPunches.length === 0) {
      console.log('[SyncService] No failed punches to retry');
      return {synced: 0, failed: 0};
    }

    console.log(`[SyncService] Retrying ${failedPunches.length} failed punch(es)`);

    // Reset failed punches to pending
    failedPunches.forEach(punch => {
      store.retryFailedPunch(punch.id);
    });

    // Trigger sync
    return this.syncPendingPunches();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
    lastSyncTime: string | null;
  } {
    const store = useOfflineQueueStore.getState();
    const counts = store.getPunchCount();

    return {
      isSyncing: store.isSyncing,
      pendingCount: counts.pending,
      failedCount: counts.failed,
      lastSyncTime: store.lastSyncTime,
    };
  }

  /**
   * Cleanup - call when app unmounts
   */
  destroy(): void {
    console.log('[SyncService] Destroying...');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.isInitialized = false;

    console.log('[SyncService] Destroyed');
  }
}

// Export singleton instance
export const syncService = new SyncService();
