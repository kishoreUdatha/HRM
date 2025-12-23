const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/?authSource=admin';

// Company name generators
const companyPrefixes = ['Tech', 'Global', 'Digital', 'Smart', 'Future', 'Cloud', 'Data', 'Cyber', 'Net', 'Info'];
const companySuffixes = ['Solutions', 'Systems', 'Corp', 'Industries', 'Labs', 'Innovations', 'Dynamics', 'Ventures', 'Partners', 'Works'];
const companyTypes = ['IT', 'Software', 'Consulting', 'Services', 'Media', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Logistics'];

// Plan distribution (realistic mix)
const planDistribution = [
  { plan: 'free', weight: 15 },
  { plan: 'starter', weight: 20 },
  { plan: 'professional', weight: 12 },
  { plan: 'enterprise', weight: 3 },
];

// Status distribution
const statusDistribution = [
  { status: 'active', weight: 35 },
  { status: 'trial', weight: 10 },
  { status: 'inactive', weight: 3 },
  { status: 'suspended', weight: 2 },
];

// Plan pricing (in INR)
const PLAN_PRICING = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 1499, yearly: 14990 },
  professional: { monthly: 3999, yearly: 39990 },
  enterprise: { monthly: 9999, yearly: 99990 },
};

const PLAN_LIMITS = {
  free: { maxEmployees: 10, maxAdmins: 1 },
  starter: { maxEmployees: 50, maxAdmins: 3 },
  professional: { maxEmployees: 200, maxAdmins: 10 },
  enterprise: { maxEmployees: 10000, maxAdmins: 100 },
};

const PLAN_FEATURES = {
  free: ['employees', 'attendance', 'basic_leaves'],
  starter: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
  professional: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
  enterprise: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs'],
};

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getWeightedRandom(distribution) {
  const totalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of distribution) {
    random -= item.weight;
    if (random <= 0) {
      return item.plan || item.status;
    }
  }
  return distribution[0].plan || distribution[0].status;
}

function generateCompanyName() {
  const type = getRandomItem(companyTypes);
  if (Math.random() > 0.5) {
    return `${getRandomItem(companyPrefixes)} ${type} ${getRandomItem(companySuffixes)}`;
  }
  return `${type} ${getRandomItem(companySuffixes)}`;
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateRandomDate(monthsAgo) {
  const date = new Date();
  date.setMonth(date.getMonth() - Math.floor(Math.random() * monthsAgo));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date;
}

function generateInvoiceNumber(index, date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(index).padStart(6, '0')}`;
}

async function seedData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const tenantDb = client.db('hrm_tenants');
    const billingDb = client.db('hrm_billing');

    const tenantsCollection = tenantDb.collection('tenants');
    const subscriptionsCollection = billingDb.collection('subscriptions');
    const invoicesCollection = billingDb.collection('invoices');

    // Clear existing seed data (optional - comment out to append)
    console.log('Clearing existing data...');
    await tenantsCollection.deleteMany({ _id: { $exists: true } });
    await subscriptionsCollection.deleteMany({ _id: { $exists: true } });
    await invoicesCollection.deleteMany({ _id: { $exists: true } });

    const tenants = [];
    const subscriptions = [];
    const invoices = [];

    console.log('Generating 50 tenant records...');

    for (let i = 1; i <= 50; i++) {
      const companyName = generateCompanyName();
      const slug = generateSlug(companyName) + '-' + i;
      const plan = getWeightedRandom(planDistribution);
      const status = plan === 'free' ? 'active' : getWeightedRandom(statusDistribution);
      const billingCycle = Math.random() > 0.3 ? 'monthly' : 'yearly';
      const createdAt = generateRandomDate(12);

      const tenantId = new ObjectId();

      // Calculate subscription dates
      const startDate = new Date(createdAt);
      const endDate = new Date(startDate);
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Extend endDate for active subscriptions to future
      if (status === 'active' && endDate < new Date()) {
        while (endDate < new Date()) {
          if (billingCycle === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }
        }
      }

      const amount = PLAN_PRICING[plan][billingCycle];

      // Create tenant
      const tenant = {
        _id: tenantId,
        name: companyName,
        slug: slug,
        domain: `${slug}.hrm.local`,
        settings: {
          timezone: getRandomItem(['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Singapore']),
          dateFormat: 'YYYY-MM-DD',
          currency: 'INR',
          language: 'en',
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: '09:00', end: '18:00' },
          leavePolicy: {
            casualLeaves: 12,
            sickLeaves: 12,
            annualLeaves: 15,
            maternityLeaves: 90,
            paternityLeaves: 10,
            carryForward: true,
            maxCarryForward: 5,
          },
          attendanceSettings: {
            allowRemoteCheckIn: true,
            requireGeolocation: false,
            allowFlexibleHours: Math.random() > 0.5,
            graceTimeMins: 15,
            halfDayHours: 4,
            fullDayHours: 8,
          },
        },
        subscription: {
          plan: plan,
          maxEmployees: PLAN_LIMITS[plan].maxEmployees,
          maxAdmins: PLAN_LIMITS[plan].maxAdmins,
          features: PLAN_FEATURES[plan],
          startDate: startDate,
          endDate: endDate,
          billingCycle: billingCycle,
          amount: amount,
          currency: 'INR',
        },
        billing: {
          companyName: companyName,
          address: `${Math.floor(Math.random() * 999) + 1} Business Park, ${getRandomItem(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'])}`,
          taxId: `GSTIN${String(Math.floor(Math.random() * 9999999999)).padStart(10, '0')}`,
          email: `billing@${slug}.com`,
          phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        },
        status: status,
        trialEndsAt: status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
        createdAt: createdAt,
        updatedAt: new Date(),
      };

      tenants.push(tenant);

      // Create subscription (for non-free plans)
      if (plan !== 'free') {
        const subscriptionId = new ObjectId();
        const subscription = {
          _id: subscriptionId,
          tenantId: tenantId,
          razorpayCustomerId: `cust_${tenantId.toString().substring(0, 14)}`,
          razorpaySubscriptionId: `sub_${subscriptionId.toString().substring(0, 14)}`,
          plan: plan,
          billingCycle: billingCycle,
          status: status === 'active' ? 'active' : (status === 'trial' ? 'authenticated' : 'cancelled'),
          amount: amount,
          currency: 'INR',
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          trialEndsAt: status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
          cancelAtPeriodEnd: status === 'cancelled',
          cancelledAt: status === 'cancelled' ? new Date() : null,
          metadata: {
            tenantName: companyName,
            tenantSlug: slug,
          },
          createdAt: createdAt,
          updatedAt: new Date(),
        };

        subscriptions.push(subscription);

        // Generate invoices for active and past subscriptions
        if (status === 'active' || status === 'cancelled') {
          let invoiceDate = new Date(startDate);
          let invoiceIndex = invoices.length + 1;

          // Generate historical invoices
          const maxInvoices = billingCycle === 'monthly' ? 6 : 1;
          for (let j = 0; j < maxInvoices && invoiceDate < new Date(); j++) {
            const invoiceId = new ObjectId();
            const periodStart = new Date(invoiceDate);
            const periodEnd = new Date(invoiceDate);

            if (billingCycle === 'monthly') {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            } else {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            }

            const dueDate = new Date(periodStart);
            dueDate.setDate(dueDate.getDate() + 15);

            const invoice = {
              _id: invoiceId,
              tenantId: tenantId,
              subscriptionId: subscriptionId,
              razorpayInvoiceId: `inv_${invoiceId.toString().substring(0, 14)}`,
              razorpayPaymentId: `pay_${invoiceId.toString().substring(0, 14)}`,
              invoiceNumber: generateInvoiceNumber(invoiceIndex, periodStart),
              amount: amount,
              amountPaid: amount,
              amountDue: 0,
              currency: 'INR',
              status: 'paid',
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              dueDate: dueDate,
              paidAt: new Date(periodStart.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
              lineItems: [
                {
                  description: `HRM ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`,
                  quantity: 1,
                  unitAmount: amount,
                  amount: amount,
                },
              ],
              tax: {
                name: 'GST',
                rate: 18,
                amount: Math.round(amount * 0.18),
              },
              notes: `Subscription for ${companyName}`,
              metadata: {
                tenantName: companyName,
                plan: plan,
                billingCycle: billingCycle,
              },
              createdAt: periodStart,
              updatedAt: periodStart,
            };

            invoices.push(invoice);
            invoiceIndex++;

            if (billingCycle === 'monthly') {
              invoiceDate.setMonth(invoiceDate.getMonth() + 1);
            } else {
              invoiceDate.setFullYear(invoiceDate.getFullYear() + 1);
            }
          }
        }
      }

      console.log(`Created tenant ${i}/50: ${companyName} (${plan}, ${status})`);
    }

    // Insert all data
    console.log('\nInserting tenants...');
    await tenantsCollection.insertMany(tenants);
    console.log(`Inserted ${tenants.length} tenants`);

    console.log('Inserting subscriptions...');
    if (subscriptions.length > 0) {
      await subscriptionsCollection.insertMany(subscriptions);
    }
    console.log(`Inserted ${subscriptions.length} subscriptions`);

    console.log('Inserting invoices...');
    if (invoices.length > 0) {
      await invoicesCollection.insertMany(invoices);
    }
    console.log(`Inserted ${invoices.length} invoices`);

    // Summary
    console.log('\n=== Seed Data Summary ===');
    console.log(`Total Tenants: ${tenants.length}`);
    console.log(`Total Subscriptions: ${subscriptions.length}`);
    console.log(`Total Invoices: ${invoices.length}`);

    // Plan breakdown
    const planCounts = tenants.reduce((acc, t) => {
      acc[t.subscription.plan] = (acc[t.subscription.plan] || 0) + 1;
      return acc;
    }, {});
    console.log('\nPlan Distribution:');
    Object.entries(planCounts).forEach(([plan, count]) => {
      console.log(`  ${plan}: ${count}`);
    });

    // Status breakdown
    const statusCounts = tenants.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    console.log('\nStatus Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Calculate MRR
    const mrr = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billingCycle === 'monthly') {
          return sum + s.amount;
        } else {
          return sum + (s.amount / 12);
        }
      }, 0);
    console.log(`\nEstimated MRR: ₹${Math.round(mrr).toLocaleString()}`);

    console.log('\nSeed data created successfully!');

  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedData().catch(console.error);
