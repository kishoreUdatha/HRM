import React, { useState, useEffect } from 'react';
import { HiSparkles, HiLocationMarker, HiBell, HiFingerPrint, HiClock, HiDocumentText, HiCalendar, HiCamera, HiShieldCheck, HiLightningBolt } from 'react-icons/hi';

interface AppScreen {
  id: string;
  title: string;
  gradient: string;
  content: React.ReactNode;
}

// AI Face Scan Animation Component
const FaceScanAnimation: React.FC = () => (
  <div className="relative w-32 h-32 mx-auto">
    {/* Face outline */}
    <div className="absolute inset-0 rounded-full border-4 border-dashed border-cyan-400 animate-spin" style={{ animationDuration: '8s' }}></div>
    {/* Inner scanning circle */}
    <div className="absolute inset-2 rounded-full border-2 border-cyan-300 opacity-60"></div>
    {/* Center face icon */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
        <span className="text-4xl">😊</span>
      </div>
    </div>
    {/* Scanning line */}
    <div className="absolute inset-0 overflow-hidden rounded-full">
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"
           style={{ top: '50%', animation: 'scanLine 2s ease-in-out infinite' }}></div>
    </div>
    {/* Corner brackets */}
    <div className="absolute top-0 left-0 w-6 h-6 border-l-3 border-t-3 border-cyan-400 rounded-tl-lg"></div>
    <div className="absolute top-0 right-0 w-6 h-6 border-r-3 border-t-3 border-cyan-400 rounded-tr-lg"></div>
    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-3 border-b-3 border-cyan-400 rounded-bl-lg"></div>
    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-3 border-b-3 border-cyan-400 rounded-br-lg"></div>
  </div>
);

const MobileAppSection: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState(0);
  const [faceVerified, setFaceVerified] = useState(false);

  // Auto-rotate screens
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 5);
      setFaceVerified(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Simulate face verification
  useEffect(() => {
    if (activeScreen === 0) {
      const timer = setTimeout(() => setFaceVerified(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeScreen]);

  const appScreens: AppScreen[] = [
    {
      id: 'face-punch',
      title: 'AI Face Punch',
      gradient: 'from-cyan-400 to-blue-600',
      content: (
        <div className="h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
          {/* Camera View */}
          <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-4 mb-4 overflow-hidden">
            {/* Simulated camera background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20"></div>
            </div>

            <div className="relative text-center py-2">
              <FaceScanAnimation />

              {/* AI Status */}
              <div className="mt-4 space-y-2">
                {faceVerified ? (
                  <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    <HiShieldCheck className="w-5 h-5" />
                    Face Verified ✓
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 px-4 py-2 rounded-full text-sm font-bold">
                    <HiLightningBolt className="w-5 h-5 animate-pulse" />
                    AI Scanning...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
              <HiLocationMarker className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white text-sm font-semibold">Office - Mumbai</p>
                <p className="text-white/50 text-xs">Within geo-fence ✓</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
              <HiClock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white text-sm font-semibold">9:00 AM</p>
                <p className="text-white/50 text-xs">On time for shift</p>
              </div>
            </div>
          </div>

          {/* Punch Button */}
          <button className={`w-full mt-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
            faceVerified
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30'
              : 'bg-gradient-to-r from-gray-600 to-gray-700 opacity-50'
          }`}>
            {faceVerified ? '✓ Punch In Now' : 'Verifying Face...'}
          </button>
        </div>
      ),
    },
    {
      id: 'attendance',
      title: 'Attendance',
      gradient: 'from-green-400 to-emerald-600',
      content: (
        <div className="h-full bg-gradient-to-b from-green-50 to-emerald-50 p-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <HiShieldCheck className="w-8 h-8 text-white" />
            </div>
            <p className="text-green-700 font-bold">Checked In</p>
            <p className="text-green-600 text-2xl font-black">9:00 AM</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 mb-3">
            <p className="text-xs text-gray-500 mb-2">Today's Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">8h 30m</p>
                <p className="text-xs text-gray-500">Working</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">45m</p>
                <p className="text-xs text-gray-500">Break</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <HiLocationMarker className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Office Location</p>
                <p className="text-xs text-gray-500">Mumbai, Maharashtra</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'leave',
      title: 'Leave',
      gradient: 'from-purple-400 to-pink-600',
      content: (
        <div className="h-full bg-gradient-to-b from-purple-50 to-pink-50 p-4">
          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm mb-3">
            <p className="text-sm font-semibold text-gray-800 mb-3">Leave Balance</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <p className="text-xl font-bold text-purple-600">12</p>
                <p className="text-xs text-gray-500">Casual</p>
              </div>
              <div className="p-2 bg-pink-50 rounded-lg">
                <p className="text-xl font-bold text-pink-600">8</p>
                <p className="text-xs text-gray-500">Sick</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <p className="text-xl font-bold text-orange-500">5</p>
                <p className="text-xs text-gray-500">Earned</p>
              </div>
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold shadow-lg mb-3">
            + Apply Leave
          </button>

          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Vacation Approved</p>
                <p className="text-xs text-gray-500">Dec 25-27, 2025</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'payslip',
      title: 'Payslip',
      gradient: 'from-cyan-400 to-blue-600',
      content: (
        <div className="h-full bg-gradient-to-b from-cyan-50 to-blue-50 p-4">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-4 text-white mb-3 shadow-lg">
            <p className="text-sm opacity-80">Net Salary - Jan 2025</p>
            <p className="text-3xl font-bold">₹85,420</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
              <span className="text-sm text-gray-600">Basic</span>
              <span className="font-semibold text-gray-800">₹50,000</span>
            </div>
            <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
              <span className="text-sm text-gray-600">HRA</span>
              <span className="font-semibold text-gray-800">₹20,000</span>
            </div>
            <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
              <span className="text-sm text-gray-600">Allowances</span>
              <span className="font-semibold text-gray-800">₹25,420</span>
            </div>
            <div className="flex justify-between items-center bg-red-50 rounded-lg p-3">
              <span className="text-sm text-red-600">Deductions</span>
              <span className="font-semibold text-red-600">-₹10,000</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'notifications',
      title: 'Alerts',
      gradient: 'from-orange-400 to-red-500',
      content: (
        <div className="h-full bg-gradient-to-b from-orange-50 to-red-50 p-4">
          <div className="space-y-2">
            {[
              { icon: '🤳', title: 'Face Punch Success', desc: 'Verified & checked in at 9:00 AM', time: 'Now', gradient: 'from-cyan-400 to-blue-500' },
              { icon: '✅', title: 'Leave Approved', desc: 'Your leave request approved', time: '2m', gradient: 'from-green-400 to-emerald-500' },
              { icon: '💰', title: 'Salary Credited', desc: '₹85,420 credited to account', time: '1h', gradient: 'from-cyan-400 to-blue-500' },
              { icon: '📋', title: 'Task Assigned', desc: 'New performance goal', time: '3h', gradient: 'from-purple-400 to-pink-500' },
              { icon: '🎂', title: 'Birthday Today', desc: 'Wish Priya a happy birthday!', time: '5h', gradient: 'from-orange-400 to-red-500' },
            ].map((notif, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${notif.gradient} flex items-center justify-center text-lg flex-shrink-0 shadow-md`}>
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                  <p className="text-xs text-gray-500 truncate">{notif.desc}</p>
                </div>
                <span className="text-xs text-gray-400 font-medium">{notif.time}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const mobileFeatures = [
    { icon: HiCamera, title: 'AI Face Punch', description: 'Selfie attendance with AI facial recognition', gradient: 'from-cyan-400 to-blue-600' },
    { icon: HiLocationMarker, title: 'GPS + Geo-fence', description: 'Location-based attendance verification', gradient: 'from-green-400 to-emerald-600' },
    { icon: HiShieldCheck, title: 'Anti-Spoofing', description: 'Liveness detection prevents photo fraud', gradient: 'from-purple-400 to-pink-600' },
    { icon: HiBell, title: 'Push Notifications', description: 'Real-time alerts for approvals & updates', gradient: 'from-orange-400 to-red-500' },
    { icon: HiClock, title: 'Offline Mode', description: 'Works without internet, syncs when online', gradient: 'from-blue-400 to-indigo-600' },
    { icon: HiDocumentText, title: 'Digital Payslips', description: 'Access salary details anytime, anywhere', gradient: 'from-pink-400 to-rose-600' },
  ];

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"></div>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-20 animate-float"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500 rounded-full blur-3xl opacity-10"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-bold mb-6 border border-white/20">
            <HiSparkles className="w-5 h-5 text-yellow-300" />
            <span>Mobile App</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 drop-shadow-lg">
            HR in Your{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Pocket
            </span>
          </h2>
          <p className="text-xl text-white/70 leading-relaxed">
            Manage everything on the go with our powerful mobile app. Available on iOS and Android.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Phone Mockup */}
          <div className="relative flex justify-center">
            {/* Glow behind phone */}
            <div className={`absolute inset-0 bg-gradient-to-br ${appScreens[activeScreen].gradient} rounded-full blur-3xl opacity-30 scale-75`}></div>

            {/* Phone Frame */}
            <div className="relative">
              {/* Phone Shadow */}
              <div className="absolute inset-0 bg-black/50 rounded-[3rem] blur-2xl transform translate-y-4 scale-95"></div>

              {/* Phone Body */}
              <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                {/* Phone Frame Inner */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden w-[280px] h-[580px] relative">
                  {/* Status Bar */}
                  <div className="bg-gray-900 text-white px-6 py-2 flex justify-between items-center text-xs">
                    <span>9:41</span>
                    <div className="absolute left-1/2 -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-2xl"></div>
                    <div className="flex items-center gap-1">
                      <span>📶</span>
                      <span>🔋</span>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className={`bg-gradient-to-r ${appScreens[activeScreen].gradient} px-4 py-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">H</span>
                        </div>
                        <div>
                          <p className="text-white font-bold">HRZIO</p>
                          <p className="text-white/70 text-xs">Good Morning, Rahul!</p>
                        </div>
                      </div>
                      <HiBell className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Screen Content with Animation */}
                  <div className="h-[420px] overflow-hidden relative">
                    {appScreens.map((screen, index) => (
                      <div
                        key={screen.id}
                        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                          activeScreen === index
                            ? 'opacity-100 translate-x-0'
                            : activeScreen > index
                            ? 'opacity-0 -translate-x-full'
                            : 'opacity-0 translate-x-full'
                        }`}
                      >
                        {screen.content}
                      </div>
                    ))}
                  </div>

                  {/* Bottom Navigation */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3">
                    <div className="flex justify-around">
                      {['🏠', '📊', '📅', '👤'].map((icon, i) => (
                        <div key={i} className={`p-2 rounded-xl ${i === 0 ? 'bg-purple-100' : ''}`}>
                          <span className="text-xl">{icon}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-2xl p-3 animate-float hidden lg:flex items-center gap-2" style={{ animationDelay: '-1s' }}>
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">✓</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Checked In</p>
                  <p className="text-xs text-green-600">9:00 AM</p>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-2xl p-3 animate-float hidden lg:flex items-center gap-2" style={{ animationDelay: '-3s' }}>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🔔</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">3 New</p>
                  <p className="text-xs text-purple-600">Notifications</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Features */}
          <div>
            {/* Screen Indicators */}
            <div className="flex flex-wrap gap-2 mb-8">
              {appScreens.map((screen, index) => (
                <button
                  key={screen.id}
                  onClick={() => {
                    setActiveScreen(index);
                    setFaceVerified(false);
                  }}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    activeScreen === index
                      ? `bg-gradient-to-r ${screen.gradient} text-white shadow-lg scale-105`
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {screen.title}
                </button>
              ))}
            </div>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {mobileFeatures.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <a href="#" className="flex items-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <p className="text-xs opacity-70">Download on the</p>
                  <p className="text-lg font-bold -mt-1">App Store</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left">
                  <p className="text-xs opacity-70">Get it on</p>
                  <p className="text-lg font-bold -mt-1">Google Play</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
