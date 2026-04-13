import React from 'react';
import { Link } from 'react-router-dom';
import { HiMail, HiPhone, HiLocationMarker, HiSparkles, HiLightningBolt } from 'react-icons/hi';

const footerLinks = {
  product: [
    { name: 'Core HR', href: '#features' },
    { name: 'Attendance', href: '#features' },
    { name: 'Payroll', href: '#features' },
    { name: 'Recruitment', href: '#features' },
    { name: 'Performance', href: '#features' },
    { name: 'Leave Management', href: '#features' },
  ],
  company: [
    { name: 'About Us', href: '#about' },
    { name: 'Careers', href: '#careers' },
    { name: 'Blog', href: '#blog' },
    { name: 'Press', href: '#press' },
    { name: 'Partners', href: '#partners' },
  ],
  resources: [
    { name: 'Documentation', href: '#docs' },
    { name: 'Help Center', href: '#help' },
    { name: 'API Reference', href: '#api' },
    { name: 'Webinars', href: '#webinars' },
    { name: 'Case Studies', href: '#case-studies' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy', isRoute: true },
    { name: 'Terms of Service', href: '/terms', isRoute: true },
    { name: 'Cookie Policy', href: '#cookies' },
    { name: 'GDPR', href: '#gdpr' },
    { name: 'Security', href: '#security' },
  ],
};

const socialLinks = [
  { name: 'Twitter', href: '#', gradient: 'from-cyan-400 to-blue-500', icon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>
  )},
  { name: 'LinkedIn', href: '#', gradient: 'from-blue-500 to-indigo-600', icon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  )},
  { name: 'GitHub', href: '#', gradient: 'from-purple-500 to-pink-600', icon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  )},
  { name: 'YouTube', href: '#', gradient: 'from-red-500 to-orange-500', icon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )},
];

const FooterSection: React.FC = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* Colorful CTA Section */}
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 relative">
        {/* Floating Orbs */}
        <div className="absolute top-0 left-10 w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-cyan-400 rounded-full blur-3xl opacity-20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 lg:p-14 text-center lg:text-left lg:flex lg:items-center lg:justify-between border border-white/20">
            <div className="mb-8 lg:mb-0">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                <HiSparkles className="w-7 h-7 text-yellow-300" />
                <span className="text-yellow-300 font-bold text-lg">Start Today</span>
              </div>
              <h3 className="text-4xl lg:text-5xl font-black text-white mb-3 drop-shadow-lg">
                Ready to transform your HR?
              </h3>
              <p className="text-white/80 text-xl">
                Get started today and see the difference.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-700 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                <HiLightningBolt className="w-5 h-5 text-yellow-500" />
                Get Started
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
              >
                Talk to Sales
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer - Dark with colorful accents */}
      <div className="bg-gray-900 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="text-white font-black text-2xl">H</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    HRZIO
                  </span>
                  <span className="text-[10px] text-gray-500 tracking-widest font-bold">SMART HR PLATFORM</span>
                </div>
              </Link>
              <p className="text-gray-400 mb-6 max-w-sm leading-relaxed">
                The smartest HR software for modern teams. Streamline your HR operations and focus on what matters most - your people.
              </p>
              <div className="space-y-3">
                <a href="mailto:hello@hrzi.com" className="flex items-center gap-3 text-gray-400 hover:text-cyan-400 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <HiMail className="w-5 h-5" />
                  </div>
                  <span className="font-medium">hello@hrzi.com</span>
                </a>
                <a href="tel:+1234567890" className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <HiPhone className="w-5 h-5" />
                  </div>
                  <span className="font-medium">+1 (234) 567-890</span>
                </a>
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                    <HiLocationMarker className="w-5 h-5" />
                  </div>
                  <span className="font-medium">San Francisco, CA</span>
                </div>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-black text-white mb-5 text-lg">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-gray-400 hover:text-cyan-400 transition-colors font-medium">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-black text-white mb-5 text-lg">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-gray-400 hover:text-purple-400 transition-colors font-medium">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="font-black text-white mb-5 text-lg">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-gray-400 hover:text-pink-400 transition-colors font-medium">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-black text-white mb-5 text-lg">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    {link.isRoute ? (
                      <Link to={link.href} className="text-gray-400 hover:text-orange-400 transition-colors font-medium">
                        {link.name}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-gray-400 hover:text-orange-400 transition-colors font-medium">
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="relative border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm font-medium">
                &copy; {new Date().getFullYear()} HRZIO. All rights reserved.
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className={`w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gradient-to-br hover:${social.gradient} transition-all hover:scale-110 hover:shadow-lg`}
                    aria-label={social.name}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
