/**
 * Offline Queue Store - Manages offline punch queue with MMKV persistence
 * Stores check-in/check-out punches when offline and syncs when online
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKV} from 'react-native-mmkv';

// Generate UUID without crypto dependency (React Native compatible)
const uuidv4 = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
};

// Separate MMKV instance for offline queue
const storage = new MMKV({id: 'offline-queue'});

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};

export type PunchType = 'check-in' | 'check-out';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export interface OfflineFaceVerification {
  verified: boolean;
  confidence: number;
}

export interface OfflinePunch {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  type: PunchType;
  timestamp: string; // ISO string - original time when punch was made
  location: OfflineLocation;
  faceVerification?: OfflineFaceVerification;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttempt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface OfflineQueueState {
  // Queue of pending punches
  queue: OfflinePunch[];

  // Is currently syncing
  isSyncing: boolean;

  // Last successful sync time
  lastSyncTime: string | null;

  // Actions
  addPunch: (
    punch: Omit<
      OfflinePunch,
      'id' | 'syncStatus' | 'syncAttempts' | 'createdAt'
    >,
  ) => string;
  updatePunchStatus: (
    id: string,
    status: SyncStatus,
    errorMessage?: string,
  ) => void;
  incrementSyncAttempts: (id: string) => void;
  removePunch: (id: string) => void;
  getPendingPunches: () => OfflinePunch[];
  getFailedPunches: () => OfflinePunch[];
  getSyncingPunches: () => OfflinePunch[];
  clearSyncedPunches: () => void;
  clearAllPunches: () => void;
  setSyncing: (isSyncing: boolean) => void;
  updateLastSyncTime: () => void;
  retryFailedPunch: (id: string) => void;
  getPunchCount: () => {
    pending: number;
    syncing: number;
    failed: number;
    total: number;
  };
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      // Initial state
      queue: [],
      isSyncing: false,
      lastSyncTime: null,

      // Add a new punch to the queue
      addPunch: punchData => {
        const id = uuidv4();
        const punch: OfflinePunch = {
          ...punchData,
          id,
          syncStatus: 'pending',
          syncAttempts: 0,
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          queue: [...state.queue, punch],
        }));

        console.log('[OfflineQueue] Added punch:', {
          id,
          type: punch.type,
          employeeName: punch.employeeName,
          timestamp: punch.timestamp,
        });

        return id;
      },

      // Update punch sync status
      updatePunchStatus: (id, status, errorMessage) => {
        set(state => ({
          queue: state.queue.map(punch =>
            punch.id === id
              ? {
                  ...punch,
                  syncStatus: status,
                  errorMessage: errorMessage || punch.errorMessage,
                  lastSyncAttempt: new Date().toISOString(),
                }
              : punch,
          ),
        }));

        console.log('[OfflineQueue] Updated punch status:', {id, status});
      },

      // Increment sync attempts for a punch
      incrementSyncAttempts: id => {
        set(state => ({
          queue: state.queue.map(punch =>
            punch.id === id
              ? {
                  ...punch,
                  syncAttempts: punch.syncAttempts + 1,
                  lastSyncAttempt: new Date().toISOString(),
                }
              : punch,
          ),
        }));
      },

      // Remove a punch from the queue
      removePunch: id => {
        set(state => ({
          queue: state.queue.filter(punch => punch.id !== id),
        }));
        console.log('[OfflineQueue] Removed punch:', id);
      },

      // Get all pending punches (sorted by timestamp)
      getPendingPunches: () => {
        return get()
          .queue.filter(p => p.syncStatus === 'pending')
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
      },

      // Get all failed punches
      getFailedPunches: () => {
        return get().queue.filter(p => p.syncStatus === 'failed');
      },

      // Get all syncing punches
      getSyncingPunches: () => {
        return get().queue.filter(p => p.syncStatus === 'syncing');
      },

      // Clear all synced punches from the queue
      clearSyncedPunches: () => {
        set(state => ({
          queue: state.queue.filter(p => p.syncStatus !== 'synced'),
        }));
        console.log('[OfflineQueue] Cleared synced punches');
      },

      // Clear all punches (for debugging/reset)
      clearAllPunches: () => {
        set({queue: []});
        console.log('[OfflineQueue] Cleared all punches');
      },

      // Set syncing status
      setSyncing: isSyncing => {
        set({isSyncing});
      },

      // Update last sync time
      updateLastSyncTime: () => {
        set({lastSyncTime: new Date().toISOString()});
      },

      // Retry a failed punch
      retryFailedPunch: id => {
        set(state => ({
          queue: state.queue.map(punch =>
            punch.id === id
              ? {
                  ...punch,
                  syncStatus: 'pending' as SyncStatus,
                  errorMessage: undefined,
                }
              : punch,
          ),
        }));
        console.log('[OfflineQueue] Retrying punch:', id);
      },

      // Get punch counts by status
      getPunchCount: () => {
        const queue = get().queue;
        return {
          pending: queue.filter(p => p.syncStatus === 'pending').length,
          syncing: queue.filter(p => p.syncStatus === 'syncing').length,
          failed: queue.filter(p => p.syncStatus === 'failed').length,
          total: queue.length,
        };
      },
    }),
    {
      name: 'offline-queue-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

// Helper hooks for common operations
export const usePendingPunchCount = () => {
  return useOfflineQueueStore(state =>
    state.queue.filter(p => p.syncStatus === 'pending' || p.syncStatus === 'syncing').length,
  );
};

export const useHasPendingPunches = () => {
  return useOfflineQueueStore(state =>
    state.queue.some(p => p.syncStatus === 'pending'),
  );
};
