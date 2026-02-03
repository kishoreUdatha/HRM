import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';
import {Platform, AppState, AppStateStatus} from 'react-native';
import {MMKV} from 'react-native-mmkv';
import apiClient from '../api/apiClient';

const storage = new MMKV();
const FCM_TOKEN_KEY = 'fcm_token';
const DEVICE_ID_KEY = 'device_id';

interface NotificationData {
  type?: string;
  employeeId?: string;
  employeeName?: string;
  lateByMinutes?: string;
  checkInTime?: string;
  tenantId?: string;
  [key: string]: string | undefined;
}

class PushNotificationService {
  private initialized = false;
  private foregroundListener: (() => void) | null = null;
  private appStateListener: ((state: AppStateStatus) => void) | null = null;

  /**
   * Generate or retrieve a unique device ID
   */
  private getDeviceId(): string {
    let deviceId = storage.getString(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a random UUID-like string
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
      storage.set(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[PushNotification] Already initialized');
      return;
    }

    try {
      console.log('[PushNotification] Initializing...');

      // Create notification channels for Android
      await this.createNotificationChannels();

      // Request permission
      const permissionGranted = await this.requestPermission();
      if (!permissionGranted) {
        console.log('[PushNotification] Permission not granted');
        return;
      }

      // Set up message handlers
      this.setupMessageHandlers();

      // Handle background notification taps
      await this.handleInitialNotification();

      this.initialized = true;
      console.log('[PushNotification] Initialized successfully');
    } catch (error) {
      console.error('[PushNotification] Initialization error:', error);
    }
  }

  /**
   * Create Android notification channels
   */
  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Default channel for general notifications
      await notifee.createChannel({
        id: 'default',
        name: 'Default Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // Late attendance channel for admin notifications
      await notifee.createChannel({
        id: 'late_attendance',
        name: 'Late Attendance Alerts',
        description: 'Notifications when employees check in late',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // Checkout reminder channel
      await notifee.createChannel({
        id: 'checkout_reminder',
        name: 'Checkout Reminders',
        description: 'Reminder to check out at end of shift',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      console.log('[PushNotification] Notification channels created');
    } catch (error) {
      console.error('[PushNotification] Error creating channels:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('[PushNotification] Permission status:', authStatus);
      return enabled;
    } catch (error) {
      console.error('[PushNotification] Permission error:', error);
      return false;
    }
  }

  /**
   * Set up message handlers for foreground and background
   */
  private setupMessageHandlers(): void {
    // Handle foreground messages
    this.foregroundListener = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('[PushNotification] Foreground message:', remoteMessage);
        await this.displayNotification(remoteMessage);
      },
    );

    // Handle background/quit notification tap
    messaging().onNotificationOpenedApp(
      (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log(
          '[PushNotification] Notification opened app:',
          remoteMessage,
        );
        this.handleNotificationTap(remoteMessage.data as NotificationData);
      },
    );

    // Handle notifee foreground events (notification taps)
    notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS && detail.notification) {
        console.log('[PushNotification] Notifee press:', detail.notification);
        this.handleNotificationTap(
          detail.notification.data as NotificationData,
        );
      }
    });
  }

  /**
   * Handle initial notification if app was opened from quit state
   */
  private async handleInitialNotification(): Promise<void> {
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log(
        '[PushNotification] Initial notification:',
        initialNotification,
      );
      this.handleNotificationTap(
        initialNotification.data as NotificationData,
      );
    }
  }

  /**
   * Display a local notification using notifee
   */
  private async displayNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ): Promise<void> {
    const {notification, data} = remoteMessage;

    if (!notification) return;

    const channelId =
      (data?.type === 'LATE_ATTENDANCE' ? 'late_attendance' : 'default') ||
      'default';

    try {
      await notifee.displayNotification({
        title: notification.title || 'HRM Notification',
        body: notification.body || '',
        data: data as {[key: string]: string | object},
        android: {
          channelId,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
          style:
            notification.body && notification.body.length > 50
              ? {
                  type: AndroidStyle.BIGTEXT,
                  text: notification.body,
                }
              : undefined,
        },
      });
    } catch (error) {
      console.error('[PushNotification] Display notification error:', error);
    }
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  private handleNotificationTap(data?: NotificationData): void {
    if (!data) return;

    console.log('[PushNotification] Notification tap data:', data);

    // Navigation logic based on notification type
    // This will be handled by the app navigation system
    // You can emit an event or use a navigation ref here
    switch (data.type) {
      case 'LATE_ATTENDANCE':
        // Navigate to team attendance or employee details
        console.log(
          '[PushNotification] Navigate to team attendance for:',
          data.employeeName,
        );
        break;
      default:
        // Navigate to notifications screen
        console.log('[PushNotification] Navigate to notifications');
    }
  }

  /**
   * Get the FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('[PushNotification] FCM Token:', token?.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('[PushNotification] Error getting token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend after login
   */
  async registerToken(): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('[PushNotification] No token to register');
        return;
      }

      const deviceId = this.getDeviceId();
      const platform = Platform.OS as 'android' | 'ios';

      console.log('[PushNotification] Registering token with backend...');

      const response = await apiClient.post('/auth/device-token', {
        token,
        platform,
        deviceId,
      });

      if (response.data.success) {
        storage.set(FCM_TOKEN_KEY, token);
        console.log('[PushNotification] Token registered successfully');
      }
    } catch (error) {
      console.error('[PushNotification] Error registering token:', error);
    }
  }

  /**
   * Unregister FCM token from backend on logout
   */
  async unregisterToken(): Promise<void> {
    try {
      const deviceId = this.getDeviceId();

      console.log('[PushNotification] Unregistering token from backend...');

      await apiClient.delete('/auth/device-token', {
        data: {deviceId},
      });

      storage.delete(FCM_TOKEN_KEY);
      console.log('[PushNotification] Token unregistered successfully');
    } catch (error) {
      console.error('[PushNotification] Error unregistering token:', error);
    }
  }

  /**
   * Subscribe to token refresh events
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    return messaging().onTokenRefresh(callback);
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (this.foregroundListener) {
      this.foregroundListener();
      this.foregroundListener = null;
    }
    this.initialized = false;
    console.log('[PushNotification] Service destroyed');
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
