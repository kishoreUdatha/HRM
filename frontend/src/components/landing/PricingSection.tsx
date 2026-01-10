import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiCheck, HiX, HiSparkles, HiLightningBolt } from 'react-icons/hi';

interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: { name: string; included: boolean }[];
  popular?: boolean;
  cta: string;
  gradient: string;
  bgGradient: string;
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started.',
    monthlyPrice: 99,
    yearlyPrice: 75,
    gradient: 'from-cyan-400 to-blue-600',
    bgGradient: 'from-cyan-500 to-blue-600',
    features: [
      { name: 'Up to 25 employees', included: true },
      { name: 'Core HR & Directory', included: true },
      { name: 'Leave Management', included: true },
      { name: 'Attendance Tracking', included: true },
      { name: 'Basic Reports', included: true },
      { name: 'Email Support', included: true },
      { name: 'Payroll Management', included: false },
      { name: 'Performance Reviews', included: false },
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    description: 'For growing companies with full HR needs.',
    monthlyPrice: 199,
    yearlyPrice: 149,
    popular: true,
    gradient: 'from-purple-400 to-pink-600',
    bgGradient: 'from-purple-500 to-pink-600',
    features: [
      { name: 'Up to 100 employees', included: true },
      { name: 'Everything in Starter', included: true },
      { name: 'Payroll Management', included: true },
      { name: 'Performance Reviews', included: true },
      { name: 'Recruitment Module', included: true },
      { name: 'Advanced Reports', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Custom Workflows', included: true },
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs.',
    monthlyPrice: 349,
    yearlyPrice: 299,
    gradient: 'from-orange-400 to-red-500',
    bgGradient: 'from-orange-500 to-red-500',
    features: [
      { name: 'Unlimited employees', included: true },
      { name: 'Everything in Pro', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'API Access', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'Dedicated Manager', included: true },
      { name: '24/7 Phone Support', included: true },
      { name: 'SLA Guarantee', included: true },
    ],
    cta: 'Contact Sales',
  },
];

const PricingSection: React.FC = () => {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Colorful Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-60 translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full blur-3xl opacity-60 -translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full blur-3xl opacity-40"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-bold mb-6 shadow-lg shadow-green-500/30">
            <HiSparkles className="w-5 h-5 text-yellow-300" />
            <span>Simple Pricing</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-6">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Transparent pricing. No hidden fees. 14-day free trial on all plans.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`font-bold text-lg transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-20 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all shadow-lg shadow-purple-500/30"
          >
            <div
              className={`absolute top-1.5 w-7 h-7 bg-white rounded-full shadow-md transition-all duration-300 ${
                isYearly ? 'translate-x-11' : 'translate-x-1.5'
              }`}
            />
          </button>
          <span className={`font-bold text-lg transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            Yearly
          </span>
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-black px-4 py-2 rounded-full shadow-lg animate-pulse">
            Save 25%
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl transition-all duration-500 ${
                plan.popular
                  ? 'scale-105 lg:scale-110 z-10'
                  : 'hover:scale-105'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-black px-6 py-2.5 rounded-full shadow-xl z-20">
                  Most Popular
                </div>
              )}

              {/* Card with Gradient Border */}
              <div className={`${plan.popular ? `bg-gradient-to-br ${plan.bgGradient} p-[3px] rounded-3xl shadow-2xl` : 'bg-white border-2 border-gray-100 rounded-3xl shadow-xl hover:shadow-2xl'}`}>
                <div className={`${plan.popular ? 'bg-white rounded-[21px]' : ''} p-8 h-full flex flex-col`}>
                  {/* Plan Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-6 shadow-lg self-start`}>
                    <HiLightningBolt className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-500 font-medium mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                        ₹{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-gray-500 font-semibold">/employee/month</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-gray-400 font-medium mt-1">Billed annually</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature.name} className="flex items-center gap-3">
                        {feature.included ? (
                          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <HiCheck className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <HiX className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <span className={`font-medium ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    to={plan.name === 'Enterprise' ? '#contact' : '/register'}
                    className={`block w-full text-center py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                      plan.popular
                        ? `bg-gradient-to-r ${plan.bgGradient} text-white shadow-xl hover:shadow-2xl hover:scale-105`
                        : `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-16">
          <p className="text-gray-600 text-lg">
            Have questions?{' '}
            <a href="#contact" className="font-bold text-purple-600 hover:text-pink-600 transition-colors">
              Contact our sales team
            </a>{' '}
            or check our{' '}
            <a href="#faq" className="font-bold text-purple-600 hover:text-pink-600 transition-colors">
              FAQ
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
