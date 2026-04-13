import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from '../models/SubscriptionPlan';

dotenv.config();

const PLANS_DATA = [
  {
    planCode: 'free',
    displayName: 'Free Plan',
    description: 'Perfect for small teams getting started',
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'INR',
    },
    limits: {
      maxEmployees: 10,
      maxAdmins: 1,
      maxStorage: 500, // 500MB
      maxApiCalls: 5000,
    },
    features: [
      'employees',
      'attendance',
      'basic_leaves',
    ],
    isActive: true,
    isVisible: true,
    sortOrder: 1,
  },
  {
    planCode: 'starter',
    displayName: 'Starter Plan',
    description: 'Great for growing teams',
    pricing: {
      monthly: 149900, // ₹1,499
      yearly: 1499000, // ₹14,990 (₹1,249/month)
      currency: 'INR',
    },
    limits: {
      maxEmployees: 50,
      maxAdmins: 3,
      maxStorage: 5120, // 5GB
      maxApiCalls: 50000,
    },
    features: [
      'employees',
      'attendance',
      'leaves',
      'basic_payroll',
      'reports',
      'email_support',
    ],
    isActive: true,
    isVisible: true,
    sortOrder: 2,
  },
  {
    planCode: 'professional',
    displayName: 'Professional Plan',
    description: 'Advanced features for established businesses',
    pricing: {
      monthly: 399900, // ₹3,999
      yearly: 3999000, // ₹39,990 (₹3,332/month)
      currency: 'INR',
    },
    limits: {
      maxEmployees: 200,
      maxAdmins: 10,
      maxStorage: 20480, // 20GB
      maxApiCalls: 200000,
    },
    features: [
      'employees',
      'attendance',
      'leaves',
      'payroll',
      'recruitment',
      'reports',
      'analytics',
      'api_access',
      'priority_support',
    ],
    isActive: true,
    isVisible: true,
    sortOrder: 3,
  },
  {
    planCode: 'enterprise',
    displayName: 'Enterprise Plan',
    description: 'Unlimited everything for large organizations',
    pricing: {
      monthly: 999900, // ₹9,999
      yearly: 9999000, // ₹99,990 (₹8,332/month)
      currency: 'INR',
    },
    limits: {
      maxEmployees: -1, // Unlimited
      maxAdmins: 100,
      maxStorage: -1, // Unlimited
      maxApiCalls: -1, // Unlimited
    },
    features: [
      'employees',
      'attendance',
      'leaves',
      'payroll',
      'recruitment',
      'reports',
      'analytics',
      'api_access',
      'custom_integrations',
      'sso',
      'audit_logs',
      'dedicated_support',
      'sla',
      'white_label',
    ],
    isActive: true,
    isVisible: true,
    sortOrder: 4,
  },
];

async function seedPlans() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('[SeedPlans] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[SeedPlans] Connected to MongoDB');

    console.log('[SeedPlans] Clearing existing plans...');
    await SubscriptionPlan.deleteMany({});

    console.log('[SeedPlans] Inserting new plans...');
    const plans = await SubscriptionPlan.insertMany(PLANS_DATA);

    console.log(`[SeedPlans] Successfully seeded ${plans.length} subscription plans:`);
    plans.forEach((plan) => {
      console.log(`  - ${plan.displayName} (${plan.planCode}): ${plan.limits.maxEmployees === -1 ? 'Unlimited' : plan.limits.maxEmployees} employees, ${plan.limits.maxAdmins} admins`);
    });

    await mongoose.connection.close();
    console.log('[SeedPlans] Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('[SeedPlans] Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();
