import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiMenu, HiX, HiChevronDown, HiSparkles } from 'react-icons/hi';

const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const productModules = [
    { name: 'Core HR', description: 'Centralized employee data management', featureId: 'core-hr' },
    { name: 'Attendance', description: 'Time tracking & scheduling', featureId: 'attendance' },
    { name: 'Payroll', description: 'Automated payroll processing', featureId: 'payroll' },
    { name: 'Recruitment', description: 'Hiring & onboarding workflows', featureId: 'recruitment' },
    { name: 'Performance', description: 'Goals & performance reviews', featureId: 'performance' },
    { name: 'Leave Management', description: 'Leave requests & approvals', featureId: 'leave' },
  ];

  const handleProductClick = (featureId: string) => {
    setActiveDropdown(null);
    // Scroll to features section
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Dispatch custom event to set active feature
    window.dispatchEvent(new CustomEvent('setActiveFeature', { detail: featureId }));
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-lg shadow-lg shadow-purple-500/5'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/hrzio-logo.png"
              alt="HRZio Logo"
              className={`h-12 w-auto object-contain transition-all duration-300 ${
                scrolled ? '' : 'brightness-0 invert'
              }`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {/* Product Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('product')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className={`flex items-center gap-1 font-medium transition-colors ${
                scrolled ? 'text-secondary-600 hover:text-hrzi-purple' : 'text-white hover:text-white/80'
              }`}>
                Product
                <HiChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'product' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'product' && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl shadow-purple-500/10 border border-purple-100 p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid gap-1">
                    {productModules.map((module) => (
                      <button
                        key={module.name}
                        onClick={() => handleProductClick(module.featureId)}
                        className="flex flex-col p-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all group cursor-pointer text-left w-full"
                      >
                        <span className="font-medium text-secondary-900 group-hover:text-hrzi-purple transition-colors">{module.name}</span>
                        <span className="text-sm text-secondary-500">{module.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="#features" className={`font-medium transition-colors ${
              scrolled ? 'text-secondary-600 hover:text-hrzi-purple' : 'text-white hover:text-white/80'
            }`}>
              Features
            </a>
            <a href="#pricing" className={`font-medium transition-colors ${
              scrolled ? 'text-secondary-600 hover:text-hrzi-purple' : 'text-white hover:text-white/80'
            }`}>
              Pricing
            </a>
            <a href="#testimonials" className={`font-medium transition-colors ${
              scrolled ? 'text-secondary-600 hover:text-hrzi-purple' : 'text-white hover:text-white/80'
            }`}>
              Testimonials
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/login"
              className={`font-medium transition-colors ${
                scrolled ? 'text-secondary-600 hover:text-hrzi-purple' : 'text-white hover:text-white/80'
              }`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`relative group px-6 py-2.5 rounded-xl font-medium transition-all hover:scale-105 ${
                scrolled
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl'
                  : 'bg-white text-purple-700 hover:shadow-lg hover:shadow-white/30'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <HiSparkles className={`w-4 h-4 ${scrolled ? 'text-yellow-300' : 'text-yellow-500'}`} />
                Get Started
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`lg:hidden p-2 rounded-xl transition-colors ${
              scrolled
                ? 'text-secondary-600 hover:text-hrzi-purple hover:bg-purple-50'
                : 'text-white hover:text-white/80 hover:bg-white/10'
            }`}
          >
            {isOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-lg border-t border-purple-100 animate-in slide-in-from-top">
          <div className="px-4 py-6 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider px-3">Product</p>
              {productModules.map((module) => (
                <button
                  key={module.name}
                  onClick={() => {
                    setIsOpen(false);
                    handleProductClick(module.featureId);
                  }}
                  className="block w-full text-left px-3 py-2 text-secondary-600 hover:text-hrzi-purple hover:bg-purple-50 rounded-xl transition-colors"
                >
                  {module.name}
                </button>
              ))}
            </div>
            <div className="border-t border-purple-100 pt-4 space-y-2">
              <a href="#features" className="block px-3 py-2 text-secondary-600 hover:text-hrzi-purple hover:bg-purple-50 rounded-xl" onClick={() => setIsOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="block px-3 py-2 text-secondary-600 hover:text-hrzi-purple hover:bg-purple-50 rounded-xl" onClick={() => setIsOpen(false)}>
                Pricing
              </a>
              <a href="#testimonials" className="block px-3 py-2 text-secondary-600 hover:text-hrzi-purple hover:bg-purple-50 rounded-xl" onClick={() => setIsOpen(false)}>
                Testimonials
              </a>
            </div>
            <div className="border-t border-purple-100 pt-4 space-y-3">
              <Link
                to="/login"
                className="block w-full text-center px-4 py-3 border-2 border-purple-200 text-hrzi-purple rounded-xl font-medium hover:bg-purple-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block w-full text-center px-4 py-3 bg-gradient-to-r from-hrzi-blue via-hrzi-purple to-hrzi-magenta text-white rounded-xl font-medium"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
