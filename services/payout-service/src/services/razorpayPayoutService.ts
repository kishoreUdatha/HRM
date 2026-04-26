import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';
import PayoutConfig, { IPayoutConfig } from '../models/PayoutConfig';
import { decrypt } from '../utils/encryption';

// Check if mock mode is enabled
const MOCK_MODE = process.env.MOCK_RAZORPAY === 'true' || process.env.NODE_ENV === 'test';

// Mock ID generator
const generateMockId = (prefix: string) => `${prefix}_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

interface RazorpayContact {
  id: string;
  entity: string;
  name: string;
  contact: string;
  email: string;
  type: string;
  reference_id: string;
  active: boolean;
}

interface RazorpayFundAccount {
  id: string;
  entity: string;
  contact_id: string;
  account_type: string;
  bank_account: {
    ifsc: string;
    bank_name: string;
    name: string;
    notes: any[];
    account_number: string;
  };
  active: boolean;
}

interface RazorpayPayout {
  id: string;
  entity: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  fees: number;
  tax: number;
  status: string;
  purpose: string;
  utr: string | null;
  mode: string;
  reference_id: string;
  narration: string;
  failure_reason: string | null;
  created_at: number;
}

interface PayoutRequest {
  fundAccountId: string;
  amount: number;
  currency?: string;
  mode: 'NEFT' | 'IMPS' | 'RTGS';
  purpose: 'salary' | 'reimbursement' | 'bonus' | 'advance';
  referenceId: string;
  narration: string;
  notes?: Record<string, string>;
}

class RazorpayPayoutService {
  private tenantConfigs: Map<string, { razorpay: Razorpay | null; accountId: string; webhookSecret: string; isMock: boolean }> = new Map();

  /**
   * Check if running in mock mode for a tenant
   */
  private async isMockMode(tenantId: string): Promise<boolean> {
    if (MOCK_MODE) return true;

    const config = await PayoutConfig.findOne({ tenantId, isActive: true });
    // If no credentials, use mock mode
    return !config?.razorpayKeyId || !config?.razorpayKeySecret;
  }

  /**
   * Get or create Razorpay instance for a tenant
   */
  private async getClientForTenant(tenantId: string): Promise<{ razorpay: Razorpay | null; accountId: string; webhookSecret: string; isMock: boolean }> {
    // Check cache first
    if (this.tenantConfigs.has(tenantId)) {
      return this.tenantConfigs.get(tenantId)!;
    }

    // Fetch config from database
    const config = await PayoutConfig.findOne({ tenantId, isActive: true });
    if (!config) {
      throw new Error('Payout configuration not found for tenant');
    }

    const isMock = MOCK_MODE || !config.razorpayKeyId || !config.razorpayKeySecret;

    if (isMock) {
      console.log(`[MOCK MODE] Using mock Razorpay for tenant: ${tenantId}`);
      const mockConfig = {
        razorpay: null,
        accountId: config.razorpayAccountId || 'mock_account_123',
        webhookSecret: '',
        isMock: true,
      };
      this.tenantConfigs.set(tenantId, mockConfig);
      return mockConfig;
    }

    const keyId = decrypt(config.razorpayKeyId);
    const keySecret = decrypt(config.razorpayKeySecret);
    const webhookSecret = config.webhookSecret ? decrypt(config.webhookSecret) : '';

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const clientConfig = {
      razorpay,
      accountId: config.razorpayAccountId,
      webhookSecret,
      isMock: false,
    };

    // Cache for future use
    this.tenantConfigs.set(tenantId, clientConfig);

    return clientConfig;
  }

  /**
   * Clear cached config for tenant (call when config is updated)
   */
  clearTenantCache(tenantId: string): void {
    this.tenantConfigs.delete(tenantId);
  }

  /**
   * Create a Contact (Employee) in Razorpay
   */
  async createContact(tenantId: string, data: {
    name: string;
    email: string;
    phone?: string;
    type?: string;
    referenceId: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayContact> {
    const { razorpay, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Creating contact for: ${data.name}`);
      return {
        id: generateMockId('cont'),
        entity: 'contact',
        name: data.name,
        contact: data.phone || '',
        email: data.email,
        type: data.type || 'employee',
        reference_id: data.referenceId,
        active: true,
      };
    }

    const contact = await (razorpay as any).contacts.create({
      name: data.name,
      email: data.email,
      contact: data.phone || '',
      type: data.type || 'employee',
      reference_id: data.referenceId,
      notes: data.notes || {},
    });

    return contact as RazorpayContact;
  }

  /**
   * Create a Fund Account for an employee
   */
  async createFundAccount(tenantId: string, data: {
    contactId: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  }): Promise<RazorpayFundAccount> {
    const { razorpay, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Creating fund account for contact: ${data.contactId}`);
      return {
        id: generateMockId('fa'),
        entity: 'fund_account',
        contact_id: data.contactId,
        account_type: 'bank_account',
        bank_account: {
          ifsc: data.ifscCode,
          bank_name: 'Mock Bank',
          name: data.accountHolderName,
          notes: [],
          account_number: data.accountNumber.slice(-4).padStart(data.accountNumber.length, 'X'),
        },
        active: true,
      };
    }

    const fundAccount = await (razorpay as any).fundAccount.create({
      contact_id: data.contactId,
      account_type: 'bank_account',
      bank_account: {
        name: data.accountHolderName,
        ifsc: data.ifscCode,
        account_number: data.accountNumber,
      },
    });

    return fundAccount as RazorpayFundAccount;
  }

  /**
   * Validate Fund Account using penny drop (bank account verification)
   */
  async validateFundAccount(tenantId: string, fundAccountId: string): Promise<{
    id: string;
    status: string;
    results: { account_status: string; registered_name: string } | null;
  }> {
    const { razorpay, accountId, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Validating fund account: ${fundAccountId}`);
      return {
        id: generateMockId('fav'),
        status: 'completed',
        results: {
          account_status: 'active',
          registered_name: 'MOCK ACCOUNT HOLDER',
        },
      };
    }

    // Razorpay fund account validation API
    const validation = await (razorpay as any).fundAccount.validate({
      account_number: accountId,
      fund_account_id: fundAccountId,
      amount: 100, // 1 INR in paise
      currency: 'INR',
      notes: {
        purpose: 'Bank account verification',
      },
    });

    return validation;
  }

  /**
   * Create a single payout
   */
  async createPayout(tenantId: string, data: PayoutRequest): Promise<RazorpayPayout> {
    const { razorpay, accountId, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Creating payout: ${data.amount / 100} INR via ${data.mode} to ${data.fundAccountId}`);
      const mockUtr = `MOCK${Date.now()}`;
      return {
        id: generateMockId('pout'),
        entity: 'payout',
        fund_account_id: data.fundAccountId,
        amount: data.amount,
        currency: data.currency || 'INR',
        fees: Math.round(data.amount * 0.002), // Mock 0.2% fee
        tax: Math.round(data.amount * 0.0004), // Mock GST on fees
        status: 'processed', // In mock mode, instant success
        purpose: data.purpose,
        utr: mockUtr,
        mode: data.mode,
        reference_id: data.referenceId,
        narration: data.narration.substring(0, 30),
        failure_reason: null,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const payout = await (razorpay as any).payouts.create({
      account_number: accountId,
      fund_account_id: data.fundAccountId,
      amount: data.amount,
      currency: data.currency || 'INR',
      mode: data.mode,
      purpose: data.purpose,
      queue_if_low_balance: true,
      reference_id: data.referenceId,
      narration: data.narration.substring(0, 30), // Max 30 chars
      notes: data.notes || {},
    });

    return payout as RazorpayPayout;
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(tenantId: string, payoutId: string): Promise<RazorpayPayout> {
    const { razorpay, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Fetching payout status: ${payoutId}`);
      return {
        id: payoutId,
        entity: 'payout',
        fund_account_id: 'fa_mock',
        amount: 5000000,
        currency: 'INR',
        fees: 10000,
        tax: 1800,
        status: 'processed',
        purpose: 'salary',
        utr: `MOCK${Date.now()}`,
        mode: 'IMPS',
        reference_id: 'mock_ref',
        narration: 'Salary payout',
        failure_reason: null,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const payout = await (razorpay as any).payouts.fetch(payoutId);
    return payout as RazorpayPayout;
  }

  /**
   * Cancel a queued payout
   */
  async cancelPayout(tenantId: string, payoutId: string): Promise<RazorpayPayout> {
    const { razorpay, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Cancelling payout: ${payoutId}`);
      return {
        id: payoutId,
        entity: 'payout',
        fund_account_id: 'fa_mock',
        amount: 0,
        currency: 'INR',
        fees: 0,
        tax: 0,
        status: 'cancelled',
        purpose: 'salary',
        utr: null,
        mode: 'IMPS',
        reference_id: 'mock_ref',
        narration: 'Cancelled',
        failure_reason: 'Cancelled by user',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const payout = await (razorpay as any).payouts.cancel(payoutId);
    return payout as RazorpayPayout;
  }

  /**
   * Fetch contact by ID
   */
  async getContact(tenantId: string, contactId: string): Promise<RazorpayContact> {
    const { razorpay } = await this.getClientForTenant(tenantId);

    const contact = await (razorpay as any).contacts.fetch(contactId);
    return contact as RazorpayContact;
  }

  /**
   * Fetch fund account by ID
   */
  async getFundAccount(tenantId: string, fundAccountId: string): Promise<RazorpayFundAccount> {
    const { razorpay } = await this.getClientForTenant(tenantId);

    const fundAccount = await (razorpay as any).fundAccount.fetch(fundAccountId);
    return fundAccount as RazorpayFundAccount;
  }

  /**
   * Deactivate a fund account
   */
  async deactivateFundAccount(tenantId: string, fundAccountId: string): Promise<RazorpayFundAccount> {
    const { razorpay } = await this.getClientForTenant(tenantId);

    // Razorpay doesn't have direct deactivation API
    // We mark our record as inactive instead
    // The fund account itself remains in Razorpay but we won't use it
    const fundAccount = await (razorpay as any).fundAccount.fetch(fundAccountId);
    return fundAccount as RazorpayFundAccount;
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(tenantId: string, body: string, signature: string): Promise<boolean> {
    try {
      const { webhookSecret } = await this.getClientForTenant(tenantId);

      if (!webhookSecret) {
        console.error('Webhook secret not configured for tenant:', tenantId);
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

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

  /**
   * Determine payout method based on amount and config
   */
  determinePayoutMethod(amount: number, config: IPayoutConfig): 'NEFT' | 'IMPS' | 'RTGS' {
    // RTGS for large amounts (typically > 2 lakh)
    if (amount >= config.rtgsThreshold) {
      return 'RTGS';
    }

    // IMPS for smaller amounts (instant but has limits)
    if (amount <= config.impsThreshold) {
      return 'IMPS';
    }

    // NEFT for medium amounts
    return 'NEFT';
  }

  /**
   * Get account balance (requires RazorpayX account)
   */
  async getAccountBalance(tenantId: string): Promise<{ balance: number; currency: string }> {
    const { razorpay, accountId, isMock } = await this.getClientForTenant(tenantId);

    if (isMock) {
      console.log(`[MOCK] Fetching account balance`);
      return {
        balance: 10000000, // Mock 1 lakh INR in paise
        currency: 'INR',
      };
    }

    try {
      const balance = await (razorpay as any).balance.fetch(accountId);
      return {
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw error;
    }
  }
}

export default new RazorpayPayoutService();
