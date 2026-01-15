import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import Invoice from '../models/Invoice';
import PaymentMethod from '../models/PaymentMethod';
import razorpayService, { PLAN_PRICING, PLAN_FEATURES } from '../services/razorpayService';
import mongoose from 'mongoose';

// Get pricing plans
export const getPricingPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = Object.keys(PLAN_PRICING).map((plan) => {
      const pricing = PLAN_PRICING[plan as keyof typeof PLAN_PRICING];
      const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES];
      const yearlyDiscount = razorpayService.getYearlyDiscount(plan as keyof typeof PLAN_PRICING);

      return {
        name: plan,
        displayName: plan.charAt(0).toUpperCase() + plan.slice(1),
        pricing: {
          monthly: pricing.monthly / 100, // Convert paise to rupees
          yearly: pricing.yearly / 100,
          yearlyPerMonth: Math.round(pricing.yearly / 12) / 100,
        },
        features: features.features,
        employeeLimit: features.employeeLimit,
        yearlyDiscount: yearlyDiscount.discountPercent,
        yearlySavings: yearlyDiscount.savings / 100,
      };
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing plans',
    });
  }
};

// Create or get Razorpay customer
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, email, contact } = req.body;

    // Check if subscription already exists for tenant
    let subscription = await Subscription.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (subscription?.razorpayCustomerId) {
      res.json({
        success: true,
        data: { customerId: subscription.razorpayCustomerId },
        message: 'Customer already exists',
      });
      return;
    }

    // Create new customer in Razorpay
    const customer = await razorpayService.createCustomer({
      name,
      email,
      contact,
      notes: { tenantId },
    });

    // Create or update subscription record
    if (subscription) {
      subscription.razorpayCustomerId = customer.id;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        razorpayCustomerId: customer.id,
        plan: 'free',
        status: 'created',
      });
    }

    res.json({
      success: true,
      data: { customerId: customer.id, subscriptionId: subscription._id },
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
    });
  }
};

// Create subscription
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { plan, billingCycle } = req.body;

    if (!['starter', 'professional', 'enterprise'].includes(plan)) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan. Choose from starter, professional, or enterprise',
      });
      return;
    }

    // Get subscription record
    const subscription = await Subscription.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (!subscription?.razorpayCustomerId) {
      res.status(400).json({
        success: false,
        message: 'Customer not found. Please create a customer first.',
      });
      return;
    }

    // Get plan pricing
    const amount = razorpayService.getPlanPricing(plan, billingCycle);

    // For now, create an order instead of subscription (simpler for demo)
    // In production, you'd use Razorpay Subscriptions with pre-created plans
    // Create receipt: max 40 chars (Razorpay limit)
    // Format: sub_<last8charsOfTenantId>_<timestamp>
    const shortTenantId = tenantId.slice(-8);
    const order = await razorpayService.createOrder({
      amount,
      currency: 'INR',
      receipt: `sub_${shortTenantId}_${Date.now()}`,
      notes: {
        tenantId,
        plan,
        billingCycle,
      },
    });

    // Update subscription record
    subscription.plan = plan;
    subscription.billingCycle = billingCycle;
    subscription.amount = amount;
    subscription.status = 'pending';
    await subscription.save();

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    const errorMessage = error.error?.description || error.message || 'Failed to create subscription';
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

// Verify payment and activate subscription
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
      return;
    }

    // Get payment details
    const payment = await razorpayService.getPayment(razorpayPaymentId);

    // Update subscription
    const subscription = await Subscription.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    const now = new Date();
    const periodEnd = new Date();
    if (subscription.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    subscription.status = 'active';
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    await subscription.save();

    // Create invoice
    const paymentAmount = Number(payment.amount);
    await Invoice.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      subscriptionId: subscription._id,
      razorpayPaymentId,
      razorpayOrderId,
      invoiceNumber: `INV-${Date.now()}`,
      amount: paymentAmount / 100,
      amountPaid: paymentAmount / 100,
      amountDue: 0,
      currency: payment.currency,
      status: 'paid',
      billingPeriodStart: now,
      billingPeriodEnd: periodEnd,
      dueDate: now,
      paidAt: now,
      lineItems: [
        {
          description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - ${subscription.billingCycle}`,
          quantity: 1,
          unitAmount: paymentAmount / 100,
          amount: paymentAmount / 100,
        },
      ],
    });

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
    });
  }
};

// Get current subscription
export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const subscription = await Subscription.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (!subscription) {
      res.json({
        success: true,
        data: {
          plan: 'free',
          status: 'active',
          features: PLAN_FEATURES.free,
        },
      });
      return;
    }

    const features = PLAN_FEATURES[subscription.plan as keyof typeof PLAN_FEATURES];

    res.json({
      success: true,
      data: {
        plan: subscription.plan,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount / 100,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        features,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { cancelImmediately } = req.body;

    const subscription = await Subscription.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
      return;
    }

    if (cancelImmediately) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    await subscription.save();

    res.json({
      success: true,
      message: cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period',
      data: {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
    });
  }
};

// Get invoices
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const invoices = await Invoice.find({ tenantId: new mongoose.Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Invoice.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
    });
  }
};

// Get invoice by ID
export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ _id: id, tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
      return;
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
    });
  }
};

// =============== ADMIN ENDPOINTS ===============

// Get all subscriptions (admin)
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const plan = req.query.plan as string;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;

    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Subscription.countDocuments(filter);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
    });
  }
};

// Get revenue analytics (admin)
export const getRevenueAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all paid invoices
    const paidInvoices = await Invoice.find({ status: 'paid' });

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubscriptions = await Subscription.find({ status: 'active' });
    let mrr = 0;
    activeSubscriptions.forEach((sub) => {
      if (sub.billingCycle === 'yearly') {
        mrr += sub.amount / 12;
      } else {
        mrr += sub.amount;
      }
    });

    // Calculate ARR
    const arr = mrr * 12;

    // Revenue by plan
    const revenueByPlan: Record<string, number> = {
      starter: 0,
      professional: 0,
      enterprise: 0,
    };

    activeSubscriptions.forEach((sub) => {
      const monthlyAmount = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
      if (revenueByPlan[sub.plan] !== undefined) {
        revenueByPlan[sub.plan] += monthlyAmount;
      }
    });

    // Subscription counts by plan
    const subscriptionsByPlan: Record<string, number> = {
      free: 0,
      starter: 0,
      professional: 0,
      enterprise: 0,
    };

    const allSubscriptions = await Subscription.find({});
    allSubscriptions.forEach((sub) => {
      if (subscriptionsByPlan[sub.plan] !== undefined) {
        subscriptionsByPlan[sub.plan]++;
      }
    });

    // Total revenue
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          status: 'paid',
          paidAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' },
          },
          revenue: { $sum: '$amountPaid' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        mrr: mrr / 100,
        arr: arr / 100,
        totalRevenue: totalRevenue,
        revenueByPlan: Object.fromEntries(
          Object.entries(revenueByPlan).map(([k, v]) => [k, v / 100])
        ),
        subscriptionsByPlan,
        activeSubscriptions: activeSubscriptions.length,
        totalSubscriptions: allSubscriptions.length,
        monthlyRevenue: monthlyRevenue.map((m) => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          revenue: m.revenue,
          invoices: m.count,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
    });
  }
};

// Get all invoices (admin)
export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
    });
  }
};

// Get invoice by ID (admin)
export const getAdminInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
      return;
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
    });
  }
};

// Download invoice as PDF (admin)
export const downloadInvoicePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
      return;
    }

    // Import puppeteer dynamically
    const puppeteer = await import('puppeteer');

    // Generate HTML invoice
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #8B5CF6; }
          .invoice-details { text-align: right; }
          .invoice-number { font-size: 20px; font-weight: bold; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-paid { background: #D1FAE5; color: #065F46; }
          .status-issued { background: #DBEAFE; color: #1E40AF; }
          .status-draft { background: #F3F4F6; color: #374151; }
          .billing-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .billing-section { width: 45%; }
          .billing-section h3 { color: #6B7280; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #F9FAFB; text-align: left; padding: 12px; border-bottom: 2px solid #E5E7EB; font-size: 12px; text-transform: uppercase; color: #6B7280; }
          td { padding: 12px; border-bottom: 1px solid #E5E7EB; }
          .amount-col { text-align: right; }
          .totals { margin-left: auto; width: 300px; }
          .totals tr td { border: none; padding: 8px 12px; }
          .totals .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #E5E7EB; }
          .footer { margin-top: 60px; text-align: center; color: #9CA3AF; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">HRM Platform</div>
          <div class="invoice-details">
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <div style="margin-top: 8px;">
              <span class="status status-${invoice.status}">${invoice.status}</span>
            </div>
          </div>
        </div>

        <div class="billing-info">
          <div class="billing-section">
            <h3>Billing Period</h3>
            <p>${new Date(invoice.billingPeriodStart).toLocaleDateString()} - ${new Date(invoice.billingPeriodEnd).toLocaleDateString()}</p>
            <p style="margin-top: 10px;"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            ${invoice.paidAt ? `<p><strong>Paid On:</strong> ${new Date(invoice.paidAt).toLocaleDateString()}</p>` : ''}
          </div>
          <div class="billing-section">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p><strong>Currency:</strong> ${invoice.currency}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th class="amount-col">Unit Price</th>
              <th class="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lineItems.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td class="amount-col">${invoice.currency} ${(item.unitAmount / 100).toFixed(2)}</td>
                <td class="amount-col">${invoice.currency} ${(item.amount / 100).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td>Subtotal</td>
            <td class="amount-col">${invoice.currency} ${(invoice.amount / 100).toFixed(2)}</td>
          </tr>
          ${invoice.tax ? `
          <tr>
            <td>${invoice.tax.name} (${invoice.tax.rate}%)</td>
            <td class="amount-col">${invoice.currency} ${(invoice.tax.amount / 100).toFixed(2)}</td>
          </tr>
          ` : ''}
          ${invoice.discount ? `
          <tr>
            <td>${invoice.discount.name}</td>
            <td class="amount-col">-${invoice.currency} ${(invoice.discount.amount / 100).toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td>Total</td>
            <td class="amount-col">${invoice.currency} ${(invoice.amount / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Amount Paid</td>
            <td class="amount-col">${invoice.currency} ${(invoice.amountPaid / 100).toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold;">
            <td>Amount Due</td>
            <td class="amount-col">${invoice.currency} ${(invoice.amountDue / 100).toFixed(2)}</td>
          </tr>
        </table>

        ${invoice.notes ? `<p style="color: #6B7280; margin-top: 20px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>HRM Platform - Enterprise Human Resource Management</p>
        </div>
      </body>
      </html>
    `;

    // Generate PDF using puppeteer
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
    });
  }
};

// Update tenant subscription (admin)
export const updateTenantSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { plan, status } = req.body;

    let subscription = await Subscription.findOne({ tenantId });

    if (!subscription) {
      subscription = await Subscription.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        razorpayCustomerId: `manual_${tenantId}`,
        plan: plan || 'free',
        status: status || 'active',
      });
    } else {
      if (plan) subscription.plan = plan;
      if (status) subscription.status = status;
      await subscription.save();
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
    });
  }
};
