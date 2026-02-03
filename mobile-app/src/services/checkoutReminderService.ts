import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
  RepeatFrequency,
} from '@notifee/react-native';
import {MMKV} from 'react-native-mmkv';
import {Platform} from 'react-native';

const storage = new MMKV();
const REMINDER_NOTIFICATION_ID_KEY = 'checkout_reminder_notification_id';
const REMINDER_SCHEDULED_KEY = 'checkout_reminder_scheduled';

interface ShiftInfo {
  endTime: string; // Format: "HH:mm"
  checkoutReminderThreshold: number; // Minutes after shift end
}

interface ScheduleReminderParams {
  employeeName: string;
  shiftEndTime: string; // Format: "HH:mm"
  checkoutReminderThreshold?: number; // Minutes after shift end (default: 30)
  checkInTime?: Date;
}

class CheckoutReminderService {
  private initialized = false;

  /**
   * Initialize the checkout reminder service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure the checkout_reminder channel exists
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'checkout_reminder',
          name: 'Checkout Reminders',
          description: 'Reminder to check out at end of shift',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
      }

      this.initialized = true;
      console.log('[CheckoutReminder] Service initialized');
    } catch (error) {
      console.error('[CheckoutReminder] Initialization error:', error);
    }
  }

  /**
   * Schedule a checkout reminder notification
   * Called after successful check-in
   */
  async scheduleReminder(params: ScheduleReminderParams): Promise<string | null> {
    try {
      await this.initialize();

      const {
        employeeName,
        shiftEndTime,
        checkoutReminderThreshold = 30,
      } = params;

      // Cancel any existing reminder first
      await this.cancelReminder();

      // Parse shift end time
      const [endHour, endMinute] = shiftEndTime.split(':').map(Number);
      if (isNaN(endHour) || isNaN(endMinute)) {
        console.error('[CheckoutReminder] Invalid shift end time:', shiftEndTime);
        return null;
      }

      // Calculate reminder time: shift end + threshold
      const now = new Date();
      const reminderTime = new Date(now);
      reminderTime.setHours(endHour, endMinute + checkoutReminderThreshold, 0, 0);

      // If reminder time is in the past (already past shift end + threshold), don't schedule
      if (reminderTime.getTime() <= now.getTime()) {
        console.log('[CheckoutReminder] Reminder time already passed, not scheduling');
        return null;
      }

      // Create the trigger
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: reminderTime.getTime(),
      };

      // Schedule the notification
      const notificationId = await notifee.createTriggerNotification(
        {
          id: 'checkout-reminder',
          title: 'Checkout Reminder',
          body: `Hi ${employeeName}! Don't forget to check out. Your shift ended ${checkoutReminderThreshold} minutes ago.`,
          android: {
            channelId: 'checkout_reminder',
            smallIcon: 'ic_notification',
            pressAction: {
              id: 'default',
            },
            importance: AndroidImportance.HIGH,
            sound: 'default',
          },
          ios: {
            sound: 'default',
            critical: false,
          },
          data: {
            type: 'CHECKOUT_REMINDER',
            scheduledFor: reminderTime.toISOString(),
          },
        },
        trigger,
      );

      // Store the notification ID for later cancellation
      storage.set(REMINDER_NOTIFICATION_ID_KEY, notificationId);
      storage.set(REMINDER_SCHEDULED_KEY, 'true');

      console.log(
        `[CheckoutReminder] Scheduled for ${reminderTime.toLocaleTimeString()} (ID: ${notificationId})`,
      );

      return notificationId;
    } catch (error) {
      console.error('[CheckoutReminder] Error scheduling reminder:', error);
      return null;
    }
  }

  /**
   * Cancel any pending checkout reminder
   * Called after successful check-out
   */
  async cancelReminder(): Promise<void> {
    try {
      const notificationId = storage.getString(REMINDER_NOTIFICATION_ID_KEY);

      if (notificationId) {
        await notifee.cancelNotification(notificationId);
        storage.delete(REMINDER_NOTIFICATION_ID_KEY);
        storage.delete(REMINDER_SCHEDULED_KEY);
        console.log('[CheckoutReminder] Reminder cancelled:', notificationId);
      }

      // Also cancel by ID in case storage was cleared
      await notifee.cancelNotification('checkout-reminder');
    } catch (error) {
      console.error('[CheckoutReminder] Error cancelling reminder:', error);
    }
  }

  /**
   * Check if a reminder is currently scheduled
   */
  isReminderScheduled(): boolean {
    return storage.getString(REMINDER_SCHEDULED_KEY) === 'true';
  }

  /**
   * Get all pending trigger notifications (for debugging)
   */
  async getPendingReminders(): Promise<any[]> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      return notifications.filter(
        n => n.notification.id === 'checkout-reminder',
      );
    } catch (error) {
      console.error('[CheckoutReminder] Error getting pending reminders:', error);
      return [];
    }
  }

  /**
   * Schedule a test reminder (for debugging)
   */
  async scheduleTestReminder(delaySeconds: number = 10): Promise<string | null> {
    try {
      await this.initialize();
      await this.cancelReminder();

      const reminderTime = new Date(Date.now() + delaySeconds * 1000);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: reminderTime.getTime(),
      };

      const notificationId = await notifee.createTriggerNotification(
        {
          id: 'checkout-reminder',
          title: 'Test Checkout Reminder',
          body: `This is a test reminder scheduled ${delaySeconds} seconds ago.`,
          android: {
            channelId: 'checkout_reminder',
            smallIcon: 'ic_notification',
            pressAction: {
              id: 'default',
            },
            importance: AndroidImportance.HIGH,
            sound: 'default',
          },
          ios: {
            sound: 'default',
          },
        },
        trigger,
      );

      storage.set(REMINDER_NOTIFICATION_ID_KEY, notificationId);
      storage.set(REMINDER_SCHEDULED_KEY, 'true');

      console.log(
        `[CheckoutReminder] Test reminder scheduled for ${reminderTime.toLocaleTimeString()}`,
      );

      return notificationId;
    } catch (error) {
      console.error('[CheckoutReminder] Error scheduling test reminder:', error);
      return null;
    }
  }
}

export const checkoutReminderService = new CheckoutReminderService();
export default checkoutReminderService;
