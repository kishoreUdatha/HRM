import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/hrm_billing?authSource=admin';

// Subscription Schema - matching the actual model
const subscriptionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  razorpayCustomerId: { type: String, required: true, index: true },
  razorpaySubscriptionId: { type: String, sparse: true },
  plan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'free' },
  status: { type: String, enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'], default: 'active' },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  cancelledAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  razorpayInvoiceId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  invoiceNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ['draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'expired', 'deleted'], default: 'issued' },
  amount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  amountDue: { type: Number },
  currency: { type: String, default: 'INR' },
  lineItems: [{
    description: String,
    quantity: Number,
    unitAmount: Number,
    amount: Number
  }],
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  dueDate: Date,
  paidAt: Date,
  invoicePdf: String,
  notes: String
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Subscription.deleteMany({});
    await Invoice.deleteMany({});
    console.log('Cleared existing data');

    // Generate ObjectIds for tenants
    const tenantIds = {
      acme: new mongoose.Types.ObjectId(),
      techsolutions: new mongoose.Types.ObjectId(),
      globalhr: new mongoose.Types.ObjectId(),
      startup: new mongoose.Types.ObjectId(),
      oldclient: new mongoose.Types.ObjectId(),
      newbiz: new mongoose.Types.ObjectId(),
      megacorp: new mongoose.Types.ObjectId(),
      smallbiz: new mongoose.Types.ObjectId(),
      innovate: new mongoose.Types.ObjectId(),
      fastgrow: new mongoose.Types.ObjectId()
    };

    // Create sample subscriptions with proper tenantId and razorpayCustomerId
    const subscriptions = await Subscription.insertMany([
      {
        tenantId: tenantIds.acme,
        razorpayCustomerId: 'cust_acme_001',
        plan: 'professional',
        status: 'active',
        billingCycle: 'yearly',
        amount: 39990,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2025-12-31'),
        createdAt: new Date('2024-01-15')
      },
      {
        tenantId: tenantIds.techsolutions,
        razorpayCustomerId: 'cust_techsol_002',
        plan: 'starter',
        status: 'active',
        billingCycle: 'monthly',
        amount: 1499,
        currentPeriodStart: new Date('2024-12-01'),
        currentPeriodEnd: new Date('2025-01-31'),
        createdAt: new Date('2024-06-20')
      },
      {
        tenantId: tenantIds.globalhr,
        razorpayCustomerId: 'cust_globalhr_003',
        plan: 'enterprise',
        status: 'active',
        billingCycle: 'yearly',
        amount: 99990,
        currentPeriodStart: new Date('2024-08-01'),
        currentPeriodEnd: new Date('2025-08-01'),
        createdAt: new Date('2023-08-15')
      },
      {
        tenantId: tenantIds.startup,
        razorpayCustomerId: 'cust_startup_004',
        plan: 'starter',
        status: 'pending',
        billingCycle: 'monthly',
        amount: 1499,
        currentPeriodStart: new Date('2025-01-01'),
        currentPeriodEnd: new Date('2025-02-01'),
        createdAt: new Date('2025-01-01')
      },
      {
        tenantId: tenantIds.oldclient,
        razorpayCustomerId: 'cust_oldclient_005',
        plan: 'professional',
        status: 'halted',
        billingCycle: 'monthly',
        amount: 3999,
        currentPeriodStart: new Date('2024-11-01'),
        currentPeriodEnd: new Date('2024-12-15'),
        createdAt: new Date('2024-03-10')
      },
      {
        tenantId: tenantIds.newbiz,
        razorpayCustomerId: 'cust_newbiz_006',
        plan: 'starter',
        status: 'active',
        billingCycle: 'yearly',
        amount: 14990,
        currentPeriodStart: new Date('2024-11-20'),
        currentPeriodEnd: new Date('2025-11-20'),
        createdAt: new Date('2024-11-20')
      },
      {
        tenantId: tenantIds.megacorp,
        razorpayCustomerId: 'cust_megacorp_007',
        plan: 'enterprise',
        status: 'active',
        billingCycle: 'yearly',
        amount: 99990,
        currentPeriodStart: new Date('2024-07-01'),
        currentPeriodEnd: new Date('2025-07-01'),
        createdAt: new Date('2024-07-01')
      },
      {
        tenantId: tenantIds.smallbiz,
        razorpayCustomerId: 'cust_smallbiz_008',
        plan: 'free',
        status: 'active',
        billingCycle: 'monthly',
        amount: 0,
        currentPeriodStart: new Date('2024-09-05'),
        currentPeriodEnd: new Date('2025-12-31'),
        createdAt: new Date('2024-09-05')
      },
      {
        tenantId: tenantIds.innovate,
        razorpayCustomerId: 'cust_innovate_009',
        plan: 'professional',
        status: 'active',
        billingCycle: 'monthly',
        amount: 3999,
        currentPeriodStart: new Date('2024-12-01'),
        currentPeriodEnd: new Date('2025-01-01'),
        createdAt: new Date('2024-05-15')
      },
      {
        tenantId: tenantIds.fastgrow,
        razorpayCustomerId: 'cust_fastgrow_010',
        plan: 'starter',
        status: 'active',
        billingCycle: 'monthly',
        amount: 1499,
        currentPeriodStart: new Date('2024-12-15'),
        currentPeriodEnd: new Date('2025-01-15'),
        createdAt: new Date('2024-10-01')
      }
    ]);
    console.log(`Created ${subscriptions.length} subscriptions`);

    // Create sample invoices using tenant ObjectIds
    const invoices = await Invoice.insertMany([
      {
        tenantId: tenantIds.acme.toString(),
        subscriptionId: subscriptions[0]._id,
        invoiceNumber: 'INV-202501-000001',
        status: 'paid',
        amount: 39990,
        amountPaid: 39990,
        amountDue: 0,
        lineItems: [{ description: 'Professional Plan - Yearly', quantity: 1, unitAmount: 39990, amount: 39990 }],
        billingPeriodStart: new Date('2024-01-01'),
        billingPeriodEnd: new Date('2025-01-01'),
        paidAt: new Date('2024-01-02'),
        createdAt: new Date('2024-01-01')
      },
      {
        tenantId: tenantIds.techsolutions.toString(),
        subscriptionId: subscriptions[1]._id,
        invoiceNumber: 'INV-202501-000002',
        status: 'paid',
        amount: 1499,
        amountPaid: 1499,
        amountDue: 0,
        lineItems: [{ description: 'Starter Plan - Monthly', quantity: 1, unitAmount: 1499, amount: 1499 }],
        billingPeriodStart: new Date('2024-12-01'),
        billingPeriodEnd: new Date('2025-01-01'),
        paidAt: new Date('2024-12-05'),
        createdAt: new Date('2024-12-01')
      },
      {
        tenantId: tenantIds.globalhr.toString(),
        subscriptionId: subscriptions[2]._id,
        invoiceNumber: 'INV-202501-000003',
        status: 'paid',
        amount: 99990,
        amountPaid: 99990,
        amountDue: 0,
        lineItems: [{ description: 'Enterprise Plan - Yearly', quantity: 1, unitAmount: 99990, amount: 99990 }],
        billingPeriodStart: new Date('2024-08-01'),
        billingPeriodEnd: new Date('2025-08-01'),
        paidAt: new Date('2024-08-03'),
        createdAt: new Date('2024-08-01')
      },
      {
        tenantId: tenantIds.startup.toString(),
        subscriptionId: subscriptions[3]._id,
        invoiceNumber: 'INV-202501-000004',
        status: 'issued',
        amount: 1499,
        amountPaid: 0,
        amountDue: 1499,
        lineItems: [{ description: 'Starter Plan - Monthly', quantity: 1, unitAmount: 1499, amount: 1499 }],
        billingPeriodStart: new Date('2025-01-01'),
        billingPeriodEnd: new Date('2025-02-01'),
        dueDate: new Date('2025-01-15'),
        createdAt: new Date('2025-01-01')
      },
      {
        tenantId: tenantIds.oldclient.toString(),
        subscriptionId: subscriptions[4]._id,
        invoiceNumber: 'INV-202412-000005',
        status: 'expired',
        amount: 3999,
        amountPaid: 0,
        amountDue: 3999,
        lineItems: [{ description: 'Professional Plan - Monthly', quantity: 1, unitAmount: 3999, amount: 3999 }],
        billingPeriodStart: new Date('2024-12-01'),
        billingPeriodEnd: new Date('2025-01-01'),
        dueDate: new Date('2024-12-15'),
        createdAt: new Date('2024-12-01')
      },
      {
        tenantId: tenantIds.newbiz.toString(),
        subscriptionId: subscriptions[5]._id,
        invoiceNumber: 'INV-202411-000006',
        status: 'paid',
        amount: 14990,
        amountPaid: 14990,
        amountDue: 0,
        lineItems: [{ description: 'Starter Plan - Yearly', quantity: 1, unitAmount: 14990, amount: 14990 }],
        billingPeriodStart: new Date('2024-11-20'),
        billingPeriodEnd: new Date('2025-11-20'),
        paidAt: new Date('2024-11-22'),
        createdAt: new Date('2024-11-20')
      },
      {
        tenantId: tenantIds.megacorp.toString(),
        subscriptionId: subscriptions[6]._id,
        invoiceNumber: 'INV-202407-000007',
        status: 'paid',
        amount: 99990,
        amountPaid: 99990,
        amountDue: 0,
        lineItems: [{ description: 'Enterprise Plan - Yearly', quantity: 1, unitAmount: 99990, amount: 99990 }],
        billingPeriodStart: new Date('2024-07-01'),
        billingPeriodEnd: new Date('2025-07-01'),
        paidAt: new Date('2024-07-03'),
        createdAt: new Date('2024-07-01')
      },
      {
        tenantId: tenantIds.innovate.toString(),
        subscriptionId: subscriptions[8]._id,
        invoiceNumber: 'INV-202412-000008',
        status: 'paid',
        amount: 3999,
        amountPaid: 3999,
        amountDue: 0,
        lineItems: [{ description: 'Professional Plan - Monthly', quantity: 1, unitAmount: 3999, amount: 3999 }],
        billingPeriodStart: new Date('2024-12-01'),
        billingPeriodEnd: new Date('2025-01-01'),
        paidAt: new Date('2024-12-02'),
        createdAt: new Date('2024-12-01')
      },
      {
        tenantId: tenantIds.fastgrow.toString(),
        subscriptionId: subscriptions[9]._id,
        invoiceNumber: 'INV-202412-000009',
        status: 'paid',
        amount: 1499,
        amountPaid: 1499,
        amountDue: 0,
        lineItems: [{ description: 'Starter Plan - Monthly', quantity: 1, unitAmount: 1499, amount: 1499 }],
        billingPeriodStart: new Date('2024-12-15'),
        billingPeriodEnd: new Date('2025-01-15'),
        paidAt: new Date('2024-12-16'),
        createdAt: new Date('2024-12-15')
      },
      {
        tenantId: tenantIds.acme.toString(),
        subscriptionId: subscriptions[0]._id,
        invoiceNumber: 'INV-202312-000010',
        status: 'paid',
        amount: 39990,
        amountPaid: 39990,
        amountDue: 0,
        lineItems: [{ description: 'Professional Plan - Yearly', quantity: 1, unitAmount: 39990, amount: 39990 }],
        billingPeriodStart: new Date('2023-01-01'),
        billingPeriodEnd: new Date('2024-01-01'),
        paidAt: new Date('2023-01-03'),
        createdAt: new Date('2023-01-01')
      }
    ]);
    console.log(`Created ${invoices.length} invoices`);

    console.log('\nSeed data created successfully!');
    console.log('\nSummary:');
    console.log(`- ${subscriptions.length} subscriptions`);
    console.log(`- ${invoices.length} invoices`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
