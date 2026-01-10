import React, { useState, useEffect } from 'react';
import {
  HiUsers,
  HiClock,
  HiCurrencyDollar,
  HiUserAdd,
  HiChartBar,
  HiCalendar,
  HiClipboardCheck,
  HiDocumentText,
  HiCog,
  HiShieldCheck,
  HiSparkles
} from 'react-icons/hi';

interface Feature {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  highlights: string[];
}

interface FeaturePreviewData {
  stats: { label: string; value: string }[];
  items: { icon: string; text: string; subtext: string }[];
}

const featurePreviewData: Record<string, FeaturePreviewData> = {
  'core-hr': {
    stats: [
      { label: 'Total Employees', value: '248' },
      { label: 'Departments', value: '12' },
      { label: 'Active Users', value: '235' },
    ],
    items: [
      { icon: '👤', text: 'Rahul Sharma', subtext: 'Engineering • Full Time' },
      { icon: '👤', text: 'Priya Patel', subtext: 'Marketing • Full Time' },
      { icon: '👤', text: 'Amit Kumar', subtext: 'Sales • Contract' },
    ],
  },
  'attendance': {
    stats: [
      { label: 'Present Today', value: '235' },
      { label: 'On Leave', value: '8' },
      { label: 'Late Arrivals', value: '5' },
    ],
    items: [
      { icon: '✅', text: 'Check-in: 9:00 AM', subtext: 'Rahul Sharma • Office' },
      { icon: '✅', text: 'Check-in: 9:15 AM', subtext: 'Priya Patel • Remote' },
      { icon: '⏰', text: 'Late: 10:30 AM', subtext: 'Amit Kumar • Office' },
    ],
  },
  'payroll': {
    stats: [
      { label: 'Total Payroll', value: '₹45.2L' },
      { label: 'Employees', value: '248' },
      { label: 'Processed', value: '100%' },
    ],
    items: [
      { icon: '💰', text: 'March 2025 Payroll', subtext: 'Processed • ₹45.2 Lakhs' },
      { icon: '📄', text: 'Tax Deductions', subtext: 'TDS: ₹8.5L • PF: ₹2.1L' },
      { icon: '✅', text: 'Bank Transfer', subtext: 'Completed • 248 employees' },
    ],
  },
  'recruitment': {
    stats: [
      { label: 'Open Positions', value: '12' },
      { label: 'Applications', value: '156' },
      { label: 'Interviews', value: '24' },
    ],
    items: [
      { icon: '💼', text: 'Senior Developer', subtext: '45 applications • Screening' },
      { icon: '💼', text: 'Product Manager', subtext: '32 applications • Interview' },
      { icon: '💼', text: 'UX Designer', subtext: '28 applications • Offer Sent' },
    ],
  },
  'performance': {
    stats: [
      { label: 'Avg Rating', value: '4.2' },
      { label: 'Reviews Done', value: '180' },
      { label: 'Goals Set', value: '520' },
    ],
    items: [
      { icon: '⭐', text: 'Q1 Performance Review', subtext: '180/248 completed' },
      { icon: '🎯', text: 'Goals Achievement', subtext: '78% on track' },
      { icon: '📈', text: 'Top Performer', subtext: 'Priya Patel • 4.9 rating' },
    ],
  },
  'leave': {
    stats: [
      { label: 'Pending', value: '8' },
      { label: 'Approved', value: '45' },
      { label: 'Rejected', value: '3' },
    ],
    items: [
      { icon: '🏖️', text: 'Casual Leave', subtext: 'Rahul Sharma • 2 days' },
      { icon: '🤒', text: 'Sick Leave', subtext: 'Amit Kumar • 1 day' },
      { icon: '✈️', text: 'Vacation', subtext: 'Priya Patel • 5 days' },
    ],
  },
};

const features: Feature[] = [
  {
    id: 'core-hr',
    name: 'Core HR',
    tagline: 'Centralized Employee Management',
    description: 'Manage all employee information in one secure, centralized location. From personal details to employment history, everything at your fingertips.',
    icon: HiUsers,
    gradient: 'from-cyan-400 to-blue-600',
    bgGradient: 'from-cyan-500 to-blue-600',
    highlights: ['Complete employee profiles', 'Department & team management', 'Organization chart', 'Document management']
  },
  {
    id: 'attendance',
    name: 'Attendance',
    tagline: 'Smart Time Tracking',
    description: 'Track attendance with precision using geo-fencing, biometric integration, and mobile check-ins. Real-time visibility into your workforce.',
    icon: HiClock,
    gradient: 'from-green-400 to-emerald-600',
    bgGradient: 'from-green-500 to-emerald-600',
    highlights: ['GPS & geo-fence tracking', 'Shift management', 'Overtime tracking', 'Real-time reports']
  },
  {
    id: 'payroll',
    name: 'Payroll',
    tagline: 'Automated Payroll Processing',
    description: 'Run error-free payroll in minutes. Automatic tax calculations, statutory compliance, and seamless salary disbursement.',
    icon: HiCurrencyDollar,
    gradient: 'from-purple-400 to-pink-600',
    bgGradient: 'from-purple-500 to-pink-600',
    highlights: ['One-click payroll', 'Tax calculations', 'Salary structures', 'Pay slip generation']
  },
  {
    id: 'recruitment',
    name: 'Recruitment',
    tagline: 'Hire the Best Talent',
    description: 'Streamline your hiring process from job posting to offer letter. Track candidates, schedule interviews, and onboard seamlessly.',
    icon: HiUserAdd,
    gradient: 'from-orange-400 to-red-500',
    bgGradient: 'from-orange-500 to-red-500',
    highlights: ['Job posting management', 'Applicant tracking', 'Interview scheduling', 'Automated onboarding']
  },
  {
    id: 'performance',
    name: 'Performance',
    tagline: 'Drive Employee Growth',
    description: 'Set goals, conduct reviews, and track performance. Foster a culture of continuous feedback and development.',
    icon: HiChartBar,
    gradient: 'from-blue-400 to-indigo-600',
    bgGradient: 'from-blue-500 to-indigo-600',
    highlights: ['Goal management', '360-degree feedback', 'Performance reviews', 'Development plans']
  },
  {
    id: 'leave',
    name: 'Leave Management',
    tagline: 'Effortless Leave Tracking',
    description: 'Manage leave requests, approvals, and balances with ease. Customizable leave policies for different employee groups.',
    icon: HiCalendar,
    gradient: 'from-pink-400 to-rose-600',
    bgGradient: 'from-pink-500 to-rose-600',
    highlights: ['Custom leave policies', 'Quick approvals', 'Balance tracking', 'Holiday calendar']
  },
];

const additionalFeatures = [
  { name: 'Compliance', icon: HiShieldCheck, description: 'Stay compliant with labor laws', gradient: 'from-emerald-400 to-teal-600' },
  { name: 'Reports', icon: HiDocumentText, description: 'Insightful HR analytics', gradient: 'from-blue-400 to-violet-600' },
  { name: 'Workflows', icon: HiClipboardCheck, description: 'Automate HR processes', gradient: 'from-orange-400 to-pink-600' },
  { name: 'Settings', icon: HiCog, description: 'Fully customizable platform', gradient: 'from-purple-400 to-indigo-600' },
];

const FeaturesSection: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string>('core-hr');

  // Listen for custom event from navbar to change active feature
  useEffect(() => {
    const handleSetActiveFeature = (event: CustomEvent) => {
      setActiveFeature(event.detail);
    };

    window.addEventListener('setActiveFeature', handleSetActiveFeature as EventListener);
    return () => {
      window.removeEventListener('setActiveFeature', handleSetActiveFeature as EventListener);
    };
  }, []);

  const selectedFeature = features.find(f => f.id === activeFeature) || features[0];

  return (
    <section id="features" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Colorful Background Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full blur-3xl opacity-60 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-60 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full blur-3xl opacity-50 translate-y-1/2"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-full text-sm font-bold mb-6 shadow-lg shadow-purple-500/30">
            <HiSparkles className="w-5 h-5 text-yellow-300" />
            <span>Powerful Features</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-6">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Manage Your Workforce
            </span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            A complete HR suite designed to simplify complex processes and empower your HR team.
          </p>
        </div>

        {/* Feature Tabs - Colorful Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              className={`group px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 ${
                activeFeature === feature.id
                  ? `bg-gradient-to-r ${feature.gradient} text-white shadow-xl scale-105`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <feature.icon className={`w-5 h-5 ${activeFeature === feature.id ? 'text-white' : 'text-gray-400'}`} />
                {feature.name}
              </span>
            </button>
          ))}
        </div>

        {/* Feature Detail */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24">
          {/* Left - Feature Info */}
          <div className="order-2 lg:order-1">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br ${selectedFeature.gradient} mb-8 shadow-2xl`}>
              <selectedFeature.icon className="w-12 h-12 text-white" />
            </div>

            <h3 className="text-4xl font-black text-gray-900 mb-3">
              {selectedFeature.name}
            </h3>
            <p className={`text-xl font-bold bg-gradient-to-r ${selectedFeature.gradient} bg-clip-text text-transparent mb-4`}>
              {selectedFeature.tagline}
            </p>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              {selectedFeature.description}
            </p>

            <ul className="space-y-4">
              {selectedFeature.highlights.map((highlight, index) => (
                <li key={index} className="flex items-center gap-4 group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedFeature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-semibold text-lg">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Feature Visual with Colorful Background */}
          <div className="relative order-1 lg:order-2">
            {/* Colorful Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${selectedFeature.bgGradient} rounded-3xl blur-2xl opacity-40 scale-105`}></div>

            <div className={`relative bg-gradient-to-br ${selectedFeature.bgGradient} rounded-3xl p-2 shadow-2xl`}>
              <div className="bg-white rounded-[20px] p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedFeature.gradient} flex items-center justify-center shadow-lg`}>
                    <selectedFeature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-black text-gray-900 text-lg">{selectedFeature.name} Dashboard</span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {featurePreviewData[selectedFeature.id]?.stats.map((stat, idx) => (
                    <div key={idx} className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-100`}>
                      <div className={`text-2xl font-black bg-gradient-to-r ${selectedFeature.gradient} bg-clip-text text-transparent`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500 font-semibold">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Activity/Items List */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-gray-700">Recent Activity</span>
                    <span className="text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Live
                    </span>
                  </div>
                  <div className="space-y-3">
                    {featurePreviewData[selectedFeature.id]?.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedFeature.gradient} flex items-center justify-center text-lg shadow-md`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 font-semibold truncate">{item.text}</div>
                          <div className="text-xs text-gray-500">{item.subtext}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features Grid - Very Colorful */}
        <div className="pt-16">
          <h3 className="text-3xl font-black text-gray-900 text-center mb-12">
            Plus Many More{' '}
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature) => (
              <div
                key={feature.name}
                className={`group relative text-center p-8 rounded-3xl bg-gradient-to-br ${feature.gradient} overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer`}
              >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                <div className="relative">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-5 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-black text-white mb-2 text-xl">{feature.name}</h4>
                  <p className="text-sm text-white/80 font-medium">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
