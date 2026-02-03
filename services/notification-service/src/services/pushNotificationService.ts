import admin from 'firebase-admin';

interface PushNotificationOptions {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: {
    channelId?: string;
    priority?: 'high' | 'default' | 'low' | 'min' | 'max';
  };
  ios?: {
    sound?: string;
    badge?: number;
  };
}

interface PushResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}

class PushNotificationService {
  private app: admin.app.App | null = null;
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('[PushNotification] Firebase credentials not configured. Push notifications disabled.');
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.initialized = true;
      console.log('[PushNotification] Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('[PushNotification] Failed to initialize Firebase:', error);
    }
  }

  isEnabled(): boolean {
    return this.initialized && this.app !== null;
  }

  async sendPushNotification(options: PushNotificationOptions): Promise<PushResult> {
    if (!this.isEnabled()) {
      console.warn('[PushNotification] Push notifications not enabled, skipping send');
      return {
        successCount: 0,
        failureCount: options.tokens.length,
        failedTokens: options.tokens,
      };
    }

    if (!options.tokens || options.tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        failedTokens: [],
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: options.tokens,
        notification: {
          title: options.title,
          body: options.body,
        },
        data: options.data,
        android: {
          notification: {
            channelId: options.android?.channelId || 'default',
            priority: options.android?.priority || 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: options.ios?.sound || 'default',
              badge: options.ios?.badge,
              alert: {
                title: options.title,
                body: options.body,
              },
            },
          },
        },
      };

      const response = await this.app!.messaging().sendEachForMulticast(message);

      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(options.tokens[idx]);
          console.error(`[PushNotification] Failed to send to token ${idx}:`, resp.error?.message);
        }
      });

      console.log(`[PushNotification] Sent: ${response.successCount} success, ${response.failureCount} failed`);

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error) {
      console.error('[PushNotification] Error sending push notification:', error);
      return {
        successCount: 0,
        failureCount: options.tokens.length,
        failedTokens: options.tokens,
      };
    }
  }

  async sendLateAttendanceNotification(params: {
    tokens: string[];
    employeeName: string;
    lateByMinutes: number;
    checkInTime: string;
    employeeId: string;
    tenantId: string;
  }): Promise<PushResult> {
    const { tokens, employeeName, lateByMinutes, checkInTime, employeeId, tenantId } = params;

    return this.sendPushNotification({
      tokens,
      title: 'Late Check-in Alert',
      body: `${employeeName} checked in ${lateByMinutes} minutes late at ${checkInTime}`,
      data: {
        type: 'LATE_ATTENDANCE',
        employeeId,
        employeeName,
        lateByMinutes: String(lateByMinutes),
        checkInTime,
        tenantId,
      },
      android: {
        channelId: 'late_attendance',
        priority: 'high',
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
