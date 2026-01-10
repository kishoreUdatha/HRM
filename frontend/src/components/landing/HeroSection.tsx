import React from 'react';
import { Link } from 'react-router-dom';
import { HiPlay, HiCheck, HiSparkles, HiLightningBolt } from 'react-icons/hi';

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen pt-20 overflow-hidden">
      {/* Vibrant Animated Background */}
      <div className="absolute inset-0">
        {/* Main Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600"></div>

        {/* Animated Mesh Gradient */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-cyan-400 via-transparent to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-l from-pink-400 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Floating Colorful Orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl opacity-40 animate-float"></div>
        <div className="absolute top-20 right-20 w-80 h-80 bg-yellow-400 rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-pink-400 rounded-full blur-3xl opacity-40 animate-float" style={{ animationDelay: '-4s' }}></div>
        <div className="absolute bottom-40 right-1/4 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500 rounded-full blur-3xl opacity-20"></div>

        {/* Sparkle Effects */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-cyan-300 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-lg">
              <HiSparkles className="w-5 h-5 text-yellow-300" />
              <span>AI-Powered HR Platform</span>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2.5 py-1 rounded-full font-bold">NEW</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1] mb-6 drop-shadow-lg">
              Transform Your{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-cyan-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
                  HR Operations
                </span>
              </span>{' '}
              <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                with Intelligence
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Streamline every aspect of human resources with our AI-powered platform.
              From hiring to retiring, manage your entire workforce effortlessly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center gap-2 bg-white text-purple-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl hover:shadow-white/25 hover:scale-105"
              >
                <HiLightningBolt className="w-5 h-5 text-yellow-500" />
                Start Free Trial
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <button className="group inline-flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all border-2 border-white/30">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <HiPlay className="w-6 h-6 text-white ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3">
              {['No credit card required', '14-day free trial', 'Cancel anytime'].map((text) => (
                <div key={text} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <HiCheck className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative lg:ml-8">
            {/* Glow Effect Behind Card */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-3xl blur-2xl opacity-50 scale-105"></div>

            {/* Main Dashboard Card */}
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden animate-float">
              {/* Window Header */}
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/30"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-white/30"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-white/30"></div>
                </div>
                <div className="flex-1 text-center text-sm font-bold text-white">HRZIO Dashboard</div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-purple-50">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { value: '248', label: 'Employees', gradient: 'from-cyan-500 to-blue-600', bg: 'from-cyan-50 to-blue-50' },
                    { value: '96%', label: 'Attendance', gradient: 'from-green-500 to-emerald-600', bg: 'from-green-50 to-emerald-50' },
                    { value: '12', label: 'Open Jobs', gradient: 'from-purple-500 to-pink-600', bg: 'from-purple-50 to-pink-50' },
                  ].map((stat) => (
                    <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-4 border border-white shadow-sm`}>
                      <div className={`text-2xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</div>
                      <div className="text-xs text-gray-600 font-semibold">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Activity Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-gray-800">Recent Activity</span>
                    <span className="text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Live
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: '✅', text: 'Leave approved for John D.', time: '2m ago', gradient: 'from-green-500 to-emerald-600' },
                      { icon: '👋', text: 'New employee Sarah joined', time: '15m ago', gradient: 'from-blue-500 to-purple-600' },
                      { icon: '💰', text: 'Payroll processed for March', time: '1h ago', gradient: 'from-purple-500 to-pink-600' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center text-white text-lg shadow-md`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-700 font-semibold">{activity.text}</div>
                          <div className="text-xs text-gray-400">{activity.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-2xl p-4 border-2 border-green-200 hidden lg:flex items-center gap-3 animate-float" style={{ animationDelay: '-1s' }}>
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <HiCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Payroll Done</div>
                <div className="text-sm text-green-600 font-semibold">248 employees paid</div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-2xl p-4 border-2 border-purple-200 hidden lg:flex items-center gap-3 animate-float" style={{ animationDelay: '-3s' }}>
              <div className="flex -space-x-2">
                {['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-orange-500 to-red-500'].map((gradient, i) => (
                  <div key={i} className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-full border-3 border-white flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                    {['JD', 'SK', 'AL'][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm text-purple-700 font-bold">+15 checked in today</div>
            </div>
          </div>
        </div>

        {/* Client Logos */}
        <div className="mt-20 lg:mt-28">
          <p className="text-center text-white/70 text-sm font-bold mb-10 tracking-widest">TRUSTED BY 500+ FORWARD-THINKING COMPANIES</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {['TechCorp', 'InnovateCo', 'GlobalTech', 'StartupXYZ', 'EnterpriseAI'].map((company) => (
              <div
                key={company}
                className="text-xl font-black text-white/50 hover:text-white/80 transition-colors cursor-default"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
