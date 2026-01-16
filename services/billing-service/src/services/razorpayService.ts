import Razorpay from 'razorpay';
import crypto from 'crypto';
import SubscriptionPlan, { ISubscriptionPlan } from '../models/SubscriptionPlan';

// Fallback plan pricing configuration (in paise - 100 paise = 1 INR)
// Used only if database plans are not available
const FALLBACK_PLAN_PRICING: Record<string, { monthly: number; yearly: number }> = {
  trial: { monthly: 0, yearly: 0 },
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 149900, yearly: 1499000 },
  professional: { monthly: 399900, yearly: 3999000 },
  enterprise: { monthly: 999900, yearly: 9999000 },
};

// Fallback plan features
const FALLBACK_PLAN_FEATURES: Record<string, { employeeLimit: number; adminLimit: number; features: string[] }> = {
  trial: {
    employeeLimit: 5,
    adminLimit: 1,
    features: ['Basic HR', 'Leave Management', 'Attendance', '14-day trial'],
  },
  free: {
    employeeLimit: 10,
    adminLimit: 1,
    features: ['Basic HR', 'Leave Management', 'Attendance'],
  },
  starter: {
    employeeLimit: 50,
    adminLimit: 3,
    features: ['All Free features', 'Payroll', 'Reports', 'Email Support'],
  },
  professional: {
    employeeLimit: 200,
    adminLimit: 10,
    features: ['All Starter features', 'Performance Management', 'Recruitment', 'API Access', 'Priority Support'],
  },
  enterprise: {
    employeeLimit: -1,
    adminLimit: 100,
    features: ['All Professional features', 'Custom Integrations', 'SSO', 'Dedicated Support', 'SLA'],
  },
};

// Cache for plans to avoid repeated database queries
let plansCache: ISubscriptionPlan[] | null = null;
let plansCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

class RazorpayService {
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn('Razorpay credentials not configured. Billing features will be limited.');
    }

    this.razorpay = new Razorpay({
      key_id: keyId || 'rzp_test_placeholder',
      key_secret: keySecret || 'placeholder_secret',
    });

    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  // Create a Razorpay customer
  async createCustomer(data: {
    name: string;
    email: string;
    contact?: string;
    notes?: Record<string, string>;
  }) {
    try {
      const customer = await this.razorpay.customers.create({
        name: data.name,
        email: data.email,
        contact: data.contact || '',
        notes: data.notes || {},
      });
      return customer;
    } catch (error) {
      console.error('Error creating Razorpay customer:', error);
      throw error;
    }
  }

  // Create a subscription plan
  async createPlan(data: {
    name: string;
    description: string;
    amount: number;
    currency?: string;
    period: 'monthly' | 'yearly';
  }) {
    try {
      const plan = await this.razorpay.plans.create({
        period: data.period === 'monthly' ? 'monthly' : 'yearly',
        interval: 1,
        item: {
          name: data.name,
          description: data.description,
          amount: data.amount,
          currency: data.currency || 'INR',
        },
      });
      return plan;
    } catch (error) {
      console.error('Error creating Razorpay plan:', error);
      throw error;
    }
  }

  // Create a subscription
  async createSubscription(data: {
    planId: string;
    customerId: string;
    totalCount?: number;
    notes?: Record<string, string>;
  }) {
    try {
      const subscriptionOptions = {
        plan_id: data.planId,
        customer_id: data.customerId,
        total_count: data.totalCount || 12,
        customer_notify: 1,
        notes: data.notes || {},
      };
      const subscription = await this.razorpay.subscriptions.create(subscriptionOptions as any);
      return subscription;
    } catch (error) {
      console.error('Error creating Razorpay subscription:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error fetching Razorpay subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, cancelAtEnd: boolean = true) {
    try {
      const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, cancelAtEnd);
      return subscription;
    } catch (error) {
      console.error('Error cancelling Razorpay subscription:', error);
      throw error;
    }
  }

  // Pause subscription
  async pauseSubscription(subscriptionId: string) {
    try {
      const subscription = await this.razorpay.subscriptions.pause(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error pausing Razorpay subscription:', error);
      throw error;
    }
  }

  // Resume subscription
  async resumeSubscription(subscriptionId: string) {
    try {
      const subscription = await this.razorpay.subscriptions.resume(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error resuming Razorpay subscription:', error);
      throw error;
    }
  }

  // Create an order for one-time payment
  async createOrder(data: {
    amount: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    try {
      const order = await this.razorpay.orders.create({
        amount: data.amount,
        currency: data.currency || 'INR',
        receipt: data.receipt,
        notes: data.notes || {},
      });
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Fetch payment details
  async getPayment(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching Razorpay payment:', error);
      throw error;
    }
  }

  // Create invoice
  async createInvoice(data: {
    customerId: string;
    lineItems: Array<{
      name: string;
      description?: string;
      amount: number;
      quantity?: number;
    }>;
    expireBy?: number;
    notes?: Record<string, string>;
  }) {
    try {
      const invoice = await this.razorpay.invoices.create({
        type: 'invoice',
        customer_id: data.customerId,
        line_items: data.lineItems.map((item) => ({
          name: item.name,
          description: item.description || '',
          amount: item.amount,
          quantity: item.quantity || 1,
        })),
        expire_by: data.expireBy || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        sms_notify: 1,
        email_notify: 1,
        notes: data.notes || {},
      });
      return invoice;
    } catch (error) {
      console.error('Error creating Razorpay invoice:', error);
      throw error;
    }
  }

  // Fetch invoices for a subscription
  async getSubscriptionInvoices(subscriptionId: string) {
    try {
      const invoices = await this.razorpay.invoices.all({
        subscription_id: subscriptionId,
      });
      return invoices;
    } catch (error) {
      console.error('Error fetching subscription invoices:', error);
      throw error;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        console.error('Webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');

      // Handle buffer length mismatch - signatures must be same length for timing-safe comparison
      const signatureBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Verify payment signature (for client-side payment verification)
  verifyPaymentSignature(data: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        console.error('Razorpay key secret not configured');
        return false;
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${data.orderId}|${data.paymentId}`)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(data.signature, 'utf8');
      const generatedBuffer = Buffer.from(generatedSignature, 'utf8');

      if (signatureBuffer.length !== generatedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, generatedBuffer);
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  // Verify subscription payment signature
  verifySubscriptionSignature(data: {
    subscriptionId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        console.error('Razorpay key secret not configured');
        return false;
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${data.paymentId}|${data.subscriptionId}`)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(data.signature, 'utf8');
      const generatedBuffer = Buffer.from(generatedSignature, 'utf8');

      if (signatureBuffer.length !== generatedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, generatedBuffer);
    } catch (error) {
      console.error('Error verifying subscription signature:', error);
      return false;
    }
  }

  // Refresh plans cache from database
  async refreshPlansCache(): Promise<ISubscriptionPlan[]> {
    try {
      const plans = await SubscriptionPlan.find({ isActive: true });
      plansCache = plans;
      plansCacheTime = Date.now();
      return plans;
    } catch (error) {
      console.error('Error refreshing plans cache:', error);
      return [];
    }
  }

  // Get all plans from database (with caching)
  async getPlansFromDb(): Promise<ISubscriptionPlan[]> {
    const now = Date.now();
    if (plansCache && (now - plansCacheTime) < CACHE_TTL) {
      return plansCache;
    }
    return this.refreshPlansCache();
  }

  // Get a specific plan from database
  async getPlanFromDb(planCode: string): Promise<ISubscriptionPlan | null> {
    const plans = await this.getPlansFromDb();
    return plans.find(p => p.planCode === planCode) || null;
  }

  // Get pricing for a plan (async - fetches from database)
  async getPlanPricingAsync(planCode: string, cycle: 'monthly' | 'yearly'): Promise<number> {
    const plan = await this.getPlanFromDb(planCode);
    if (plan) {
      return plan.pricing[cycle];
    }
    // Fallback to hardcoded values if plan not found in database
    const fallback = FALLBACK_PLAN_PRICING[planCode];
    return fallback ? fallback[cycle] : 0;
  }

  // Get plan features (async - fetches from database)
  async getPlanFeaturesAsync(planCode: string): Promise<{ employeeLimit: number; adminLimit: number; features: string[] }> {
    const plan = await this.getPlanFromDb(planCode);
    if (plan) {
      return {
        employeeLimit: plan.limits.maxEmployees,
        adminLimit: plan.limits.maxAdmins,
        features: plan.features,
      };
    }
    // Fallback to hardcoded values if plan not found in database
    return FALLBACK_PLAN_FEATURES[planCode] || FALLBACK_PLAN_FEATURES.free;
  }

  // Calculate discount for yearly billing (async - fetches from database)
  async getYearlyDiscountAsync(planCode: string): Promise<{ savings: number; discountPercent: number }> {
    const plan = await this.getPlanFromDb(planCode);
    if (plan) {
      const monthlyTotal = plan.pricing.monthly * 12;
      const yearlyPrice = plan.pricing.yearly;
      const savings = monthlyTotal - yearlyPrice;
      const discountPercent = monthlyTotal > 0 ? Math.round((savings / monthlyTotal) * 100) : 0;
      return { savings, discountPercent };
    }
    // Fallback
    const fallback = FALLBACK_PLAN_PRICING[planCode];
    if (fallback) {
      const monthlyTotal = fallback.monthly * 12;
      const yearlyPrice = fallback.yearly;
      const savings = monthlyTotal - yearlyPrice;
      const discountPercent = monthlyTotal > 0 ? Math.round((savings / monthlyTotal) * 100) : 0;
      return { savings, discountPercent };
    }
    return { savings: 0, discountPercent: 0 };
  }

  // Legacy synchronous methods (use fallback data)
  // Kept for backward compatibility
  getPlanPricing(plan: string, cycle: 'monthly' | 'yearly'): number {
    const fallback = FALLBACK_PLAN_PRICING[plan];
    return fallback ? fallback[cycle] : 0;
  }

  getPlanFeatures(plan: string): { employeeLimit: number; adminLimit: number; features: string[] } {
    return FALLBACK_PLAN_FEATURES[plan] || FALLBACK_PLAN_FEATURES.free;
  }

  getYearlyDiscount(plan: string): { savings: number; discountPercent: number } {
    const fallback = FALLBACK_PLAN_PRICING[plan];
    if (fallback) {
      const monthlyTotal = fallback.monthly * 12;
      const yearlyPrice = fallback.yearly;
      const savings = monthlyTotal - yearlyPrice;
      const discountPercent = monthlyTotal > 0 ? Math.round((savings / monthlyTotal) * 100) : 0;
      return { savings, discountPercent };
    }
    return { savings: 0, discountPercent: 0 };
  }
}

export default new RazorpayService();
