import cron from 'node-cron';
import Subscription from '../models/Subscription';
import notificationClient from '../services/notificationClient';
import tenantClient from '../services/tenantClient';

interface ExpiryNotificationLog {
  tenantId: string;
  daysUntilExpiry: number;
  sentAt: Date;
}

// In-memory cache to track sent notifications (prevents duplicate emails)
// In production, you might want to store this in Redis or database
const sentNotifications: Map<string, ExpiryNotificationLog> = new Map();

function formatPlanName(plan: string): string {
  if (!plan) return 'Unknown';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function getNotificationKey(tenantId: string, daysUntilExpiry: number): string {
  const today = new Date().toISOString().split('T')[0];
  return `${tenantId}-${daysUntilExpiry}-${today}`;
}

function hasAlreadySentNotification(tenantId: string, daysUntilExpiry: number): boolean {
  const key = getNotificationKey(tenantId, daysUntilExpiry);
  return sentNotifications.has(key);
}

function markNotificationSent(tenantId: string, daysUntilExpiry: number): void {
  const key = getNotificationKey(tenantId, daysUntilExpiry);
  sentNotifications.set(key, {
    tenantId,
    daysUntilExpiry,
    sentAt: new Date(),
  });
}

// Clean up old notification records (older than 24 hours)
function cleanupOldNotifications(): void {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const [key, log] of sentNotifications.entries()) {
    if (log.sentAt < oneDayAgo) {
      sentNotifications.delete(key);
    }
  }
}

async function checkExpiringSubscriptions(): Promise<void> {
  console.log('[SubscriptionExpiryJob] Starting expiry check...');

  try {
    // Clean up old notification records
    cleanupOldNotifications();

    const now = new Date();

    // Define the reminder intervals (in days)
    const reminderDays = [7, 3, 0];

    for (const daysUntilExpiry of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysUntilExpiry);

      // Set to start of day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      // Set to end of day
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Find subscriptions expiring on the target date
      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        currentPeriodEnd: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      console.log(`[SubscriptionExpiryJob] Found ${expiringSubscriptions.length} subscriptions expiring in ${daysUntilExpiry} days`);

      for (const subscription of expiringSubscriptions) {
        const tenantId = subscription.tenantId.toString();

        // Skip if we've already sent this notification today
        if (hasAlreadySentNotification(tenantId, daysUntilExpiry)) {
          console.log(`[SubscriptionExpiryJob] Already sent ${daysUntilExpiry}-day reminder to tenant ${tenantId} today, skipping`);
          continue;
        }

        // Fetch tenant details
        const tenant = await tenantClient.getTenantBillingInfo(tenantId);
        if (!tenant || !tenant.billingEmail) {
          console.log(`[SubscriptionExpiryJob] No billing email for tenant ${tenantId}, skipping`);
          continue;
        }

        // Send appropriate notification
        if (daysUntilExpiry === 0) {
          // Plan expires today
          await notificationClient.sendPlanExpired(tenantId, {
            email: tenant.billingEmail,
            tenantName: tenant.name,
            planName: formatPlanName(subscription.plan),
            expiryDate: subscription.currentPeriodEnd?.toLocaleDateString(),
          });
          console.log(`[SubscriptionExpiryJob] Sent plan expired email to ${tenant.billingEmail}`);
        } else {
          // Plan expiring soon
          await notificationClient.sendPlanExpiring(tenantId, {
            email: tenant.billingEmail,
            tenantName: tenant.name,
            planName: formatPlanName(subscription.plan),
            amount: subscription.amount,
            currency: subscription.currency || 'INR',
            billingCycle: subscription.billingCycle,
            expiryDate: subscription.currentPeriodEnd?.toLocaleDateString(),
            daysUntilExpiry,
          });
          console.log(`[SubscriptionExpiryJob] Sent ${daysUntilExpiry}-day expiry reminder to ${tenant.billingEmail}`);
        }

        // Mark notification as sent
        markNotificationSent(tenantId, daysUntilExpiry);
      }
    }

    console.log('[SubscriptionExpiryJob] Expiry check completed');
  } catch (error) {
    console.error('[SubscriptionExpiryJob] Error checking expiring subscriptions:', error);
  }
}

export function startSubscriptionExpiryJob(): void {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[SubscriptionExpiryJob] Running scheduled job...');
    await checkExpiringSubscriptions();
  });

  console.log('[SubscriptionExpiryJob] Scheduled to run daily at 9:00 AM');

  // Also run immediately on startup (optional, useful for testing)
  if (process.env.RUN_EXPIRY_CHECK_ON_STARTUP === 'true') {
    console.log('[SubscriptionExpiryJob] Running initial check on startup...');
    checkExpiringSubscriptions();
  }
}

// Export for manual triggering (useful for testing)
export { checkExpiringSubscriptions };
