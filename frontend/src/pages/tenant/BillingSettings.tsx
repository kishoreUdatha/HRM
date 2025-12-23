import React, { useState, useEffect } from 'react';
import {
  HiCreditCard,
  HiDocumentText,
  HiCube,
  HiDownload,
  HiCheckCircle,
  HiExclamationCircle,
  HiClock,
  HiArrowUp,
  HiOfficeBuilding,
  HiCalendar,
  HiCurrencyRupee,
  HiUsers,
  HiShieldCheck,
  HiLightningBolt,
  HiStar,
} from 'react-icons/hi';

interface Plan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  employeeLimit: number;
  popular?: boolean;
}

interface Subscription {
  _id: string;
  plan: string;
  status: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  invoicePdf?: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: ['Up to 5 employees', 'Basic HR features', 'Email support', '1 admin user'],
    employeeLimit: 5,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 1499, yearly: 14990 },
    features: [
      'Up to 25 employees',
      'All HR features',
      'Leave management',
      'Attendance tracking',
      'Priority email support',
      '3 admin users',
    ],
    employeeLimit: 25,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: { monthly: 3999, yearly: 39990 },
    features: [
      'Up to 100 employees',
      'All Starter features',
      'Payroll management',
      'Performance reviews',
      'Custom reports',
      'Phone support',
      '10 admin users',
    ],
    employeeLimit: 100,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 9999, yearly: 99990 },
    features: [
      'Unlimited employees',
      'All Professional features',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Unlimited admin users',
    ],
    employeeLimit: -1,
  },
];

const BillingSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subscription' | 'invoices' | 'upgrade'>('subscription');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Fetch current subscription
      const subResponse = await fetch('/api/billing/subscriptions/current', { headers });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        if (subData.success && subData.data) {
          setSubscription(subData.data);
        }
      }

      // Fetch invoices
      const invResponse = await fetch('/api/billing/invoices', { headers });
      if (invResponse.ok) {
        const invData = await invResponse.json();
        if (invData.success) {
          setInvoices(invData.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;

    try {
      setUpgradeLoading(planId);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/billing/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planId,
          billingCycle,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.razorpayOrderId) {
        // Initialize Razorpay payment
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
          amount: data.data.amount,
          currency: 'INR',
          name: 'HRM Platform',
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan - ${billingCycle}`,
          order_id: data.data.razorpayOrderId,
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            // Verify payment
            const verifyResponse = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              alert('Payment successful! Your subscription has been activated.');
              fetchBillingData();
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            email: localStorage.getItem('userEmail') || '',
          },
          theme: {
            color: '#6366f1',
          },
        };

        const razorpay = new (window as unknown as { Razorpay: new (options: object) => { open: () => void } }).Razorpay(options);
        razorpay.open();
      } else {
        alert(data.message || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/billing/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert('Subscription cancelled. You will have access until the end of your billing period.');
        fetchBillingData();
      } else {
        alert(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'past_due':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getCurrentPlan = () => {
    return plans.find((p) => p.id === (subscription?.plan || 'free')) || plans[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your subscription plan and billing information</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'subscription', label: 'Current Plan', icon: HiCube },
            { id: 'invoices', label: 'Invoices', icon: HiDocumentText },
            { id: 'upgrade', label: 'Upgrade', icon: HiArrowUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Current Plan Tab */}
      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                <p className="text-gray-500 text-sm mt-1">Your active subscription details</p>
              </div>
              {subscription && subscription.plan !== 'free' && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <HiCube className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900">{getCurrentPlan().name} Plan</h4>
                <p className="text-gray-500">
                  {subscription?.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} billing
                </p>
              </div>
            </div>

            {subscription && subscription.plan !== 'free' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <HiCalendar className="w-4 h-4" />
                    Current Period
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <HiCurrencyRupee className="w-4 h-4" />
                    Amount
                  </div>
                  <p className="font-medium text-gray-900">{formatCurrency(subscription.amount / 100)}</p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Plan Features</h5>
              <ul className="space-y-2">
                {getCurrentPlan().features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-600">
                    <HiCheckCircle className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {subscription && subscription.plan !== 'free' && !subscription.cancelAtPeriodEnd && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancelSubscription}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Cancel Subscription
                </button>
              </div>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <HiExclamationCircle className="w-5 h-5" />
                  <span className="font-medium">Subscription Ending</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Your subscription will end on {formatDate(subscription.currentPeriodEnd)}.
                  You can upgrade again anytime.
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HiUsers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Employee Limit</p>
                  <p className="text-xl font-bold text-gray-900">
                    {getCurrentPlan().employeeLimit === -1 ? 'Unlimited' : getCurrentPlan().employeeLimit}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <HiShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Support Level</p>
                  <p className="text-xl font-bold text-gray-900">
                    {getCurrentPlan().id === 'enterprise'
                      ? 'Dedicated'
                      : getCurrentPlan().id === 'professional'
                      ? 'Phone'
                      : 'Email'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white">
              <HiLightningBolt className="w-8 h-8 mb-3" />
              <h4 className="font-semibold mb-1">Need More?</h4>
              <p className="text-primary-100 text-sm mb-4">
                Upgrade your plan to unlock more features and capacity.
              </p>
              <button
                onClick={() => setActiveTab('upgrade')}
                className="w-full py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
            <p className="text-gray-500 text-sm mt-1">Download and view your past invoices</p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <HiDocumentText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-1">No invoices yet</h4>
              <p className="text-gray-500">Your invoices will appear here after your first payment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <HiDocumentText className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {formatCurrency(invoice.amount / 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {invoice.invoicePdf && (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                          >
                            <HiDownload className="w-4 h-4" />
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upgrade Tab */}
      {activeTab === 'upgrade' && (
        <div className="space-y-6">
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-xl inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs text-green-600 font-semibold">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === (subscription?.plan || 'free');
              const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border-2 p-6 ${
                    plan.popular
                      ? 'border-primary-500 shadow-lg'
                      : isCurrentPlan
                      ? 'border-green-500'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {price === 0 ? 'Free' : formatCurrency(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                      )}
                    </div>
                    {plan.employeeLimit > 0 && (
                      <p className="text-sm text-gray-500 mt-2">Up to {plan.employeeLimit} employees</p>
                    )}
                    {plan.employeeLimit === -1 && (
                      <p className="text-sm text-gray-500 mt-2">Unlimited employees</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <HiCheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan || plan.id === 'free' || upgradeLoading === plan.id}
                    className={`w-full py-3 rounded-xl font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.id === 'free'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {upgradeLoading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.id === 'free' ? (
                      'Free Plan'
                    ) : (
                      'Upgrade Now'
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* FAQ or Additional Info */}
          <div className="bg-gray-50 rounded-xl p-6 mt-8">
            <h4 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-1">Can I change my plan anytime?</h5>
                <p className="text-sm text-gray-600">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">What payment methods do you accept?</h5>
                <p className="text-sm text-gray-600">
                  We accept all major credit/debit cards, UPI, net banking, and popular wallets via Razorpay.
                </p>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">Is there a free trial?</h5>
                <p className="text-sm text-gray-600">
                  Yes! Start with our Free plan and upgrade when you need more features or employees.
                </p>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">Can I cancel anytime?</h5>
                <p className="text-sm text-gray-600">
                  Yes, you can cancel your subscription anytime. You'll retain access until the end of your billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSettings;
