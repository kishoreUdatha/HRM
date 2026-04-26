import cron from 'node-cron';
import mongoose from 'mongoose';
import PayoutConfig from '../models/PayoutConfig';
import PayoutBatch from '../models/PayoutBatch';
import { processAutomaticPayout } from '../services/payoutProcessingService';
import axios from 'axios';

/**
 * Start the scheduled payout cron job
 * Runs every hour to check for scheduled payouts
 */
export const startScheduledPayoutJob = (): void => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled payout check...');

    try {
      await processScheduledPayouts();
    } catch (error) {
      console.error('Error in scheduled payout job:', error);
    }
  });

  console.log('Scheduled payout job started (runs every hour)');
};

/**
 * Process scheduled payouts for all tenants
 */
const processScheduledPayouts = async (): Promise<void> => {
  const now = new Date();
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Find all tenants with scheduled payout mode
  const configs = await PayoutConfig.find({
    isActive: true,
    payoutMode: 'scheduled',
    scheduledDay: { $exists: true },
    scheduledTime: { $exists: true },
  });

  console.log(`Found ${configs.length} tenants with scheduled payouts`);

  for (const config of configs) {
    try {
      // Check if today is the scheduled day
      if (config.scheduledDay !== currentDay) {
        continue;
      }

      // Parse scheduled time (HH:mm format)
      const [scheduledHour, scheduledMinute] = (config.scheduledTime || '10:00').split(':').map(Number);

      // Check if current time matches scheduled time (within the same hour)
      if (currentHour !== scheduledHour) {
        continue;
      }

      // Only process once per scheduled hour (check if already processed today)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const existingBatch = await PayoutBatch.findOne({
        tenantId: config.tenantId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        createdAt: { $gte: today },
        status: { $nin: ['cancelled', 'failed'] },
      });

      if (existingBatch) {
        console.log(`Payout batch already exists for tenant ${config.tenantId} today`);
        continue;
      }

      console.log(`Processing scheduled payout for tenant: ${config.tenantId}`);

      // Fetch processed payrolls for current month
      const payrollServiceUrl = process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006';
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const response = await axios.get(`${payrollServiceUrl}/api/payroll`, {
        headers: { 'x-tenant-id': config.tenantId.toString() },
        params: {
          month: currentMonth,
          year: currentYear,
          status: 'processed',
          limit: 1000,
        },
      });

      const payrolls = response.data.data?.payrolls || [];

      if (payrolls.length === 0) {
        console.log(`No processed payrolls found for tenant ${config.tenantId}`);
        continue;
      }

      // Check if payouts already exist for these payrolls
      const payrollIds = payrolls.map((p: any) => p._id);
      const existingPayouts = await mongoose.connection.collection('payouts').countDocuments({
        tenantId: config.tenantId,
        payrollId: { $in: payrollIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
        status: { $nin: ['cancelled', 'failed'] },
      });

      if (existingPayouts > 0) {
        console.log(`Payouts already exist for some payrolls for tenant ${config.tenantId}`);
        continue;
      }

      // Trigger automatic payout
      await processAutomaticPayout({
        tenantId: config.tenantId.toString(),
        payrollBatchId: '',
        month: currentMonth,
        year: currentYear,
        payrollIds: payrollIds,
      });

      console.log(`Scheduled payout initiated for tenant: ${config.tenantId}`);

    } catch (error) {
      console.error(`Error processing scheduled payout for tenant ${config.tenantId}:`, error);
    }
  }
};

/**
 * Manually trigger scheduled payout check (for testing)
 */
export const triggerScheduledPayoutCheck = async (): Promise<void> => {
  await processScheduledPayouts();
};
