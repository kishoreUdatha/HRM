import React from 'react';
import { HiStar, HiSparkles } from 'react-icons/hi';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
  gradient: string;
  metric?: {
    value: string;
    label: string;
  };
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'HR Director',
    company: 'TechCorp Inc.',
    avatar: 'SJ',
    gradient: 'from-cyan-400 to-blue-600',
    content: 'HRZIO transformed our HR operations. We reduced payroll processing time by 80% and our employees love the self-service portal.',
    rating: 5,
    metric: { value: '80%', label: 'Faster Payroll' }
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'CEO',
    company: 'StartupXYZ',
    avatar: 'MC',
    gradient: 'from-purple-400 to-pink-600',
    content: 'As a fast-growing startup, we needed an HR system that could scale with us. HRZIO delivered exactly that with amazing features.',
    rating: 5,
    metric: { value: '50+', label: 'Hours Saved' }
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'People Ops Manager',
    company: 'GlobalTech',
    avatar: 'ER',
    gradient: 'from-orange-400 to-red-500',
    content: 'The attendance tracking with geo-fencing has been a game-changer for our field teams. Absolutely brilliant solution!',
    rating: 5,
    metric: { value: '99%', label: 'Accuracy' }
  },
  {
    id: 4,
    name: 'David Park',
    role: 'Finance Director',
    company: 'InnovateCo',
    avatar: 'DP',
    gradient: 'from-green-400 to-emerald-600',
    content: 'The integration between payroll and attendance is seamless. No more manual calculations or spreadsheet errors!',
    rating: 5,
    metric: { value: '100%', label: 'Compliance' }
  },
];

const stats = [
  { value: '500+', label: 'Companies', gradient: 'from-cyan-400 to-blue-600', bgGradient: 'from-cyan-500 to-blue-600' },
  { value: '50K+', label: 'Employees', gradient: 'from-purple-400 to-pink-600', bgGradient: 'from-purple-500 to-pink-600' },
  { value: '99.9%', label: 'Uptime', gradient: 'from-green-400 to-emerald-600', bgGradient: 'from-green-500 to-emerald-600' },
  { value: '4.9/5', label: 'Rating', gradient: 'from-orange-400 to-red-500', bgGradient: 'from-orange-500 to-red-500' },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Colorful Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-400 rounded-full blur-3xl opacity-30 animate-float"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-400 rounded-full blur-3xl opacity-20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-bold mb-6 border border-white/30">
            <HiSparkles className="w-5 h-5 text-yellow-300" />
            <span>Customer Stories</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 drop-shadow-lg">
            Loved by{' '}
            <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
              HR Teams
            </span>{' '}
            Everywhere
          </h2>
          <p className="text-xl text-white/80 leading-relaxed">
            See how companies are transforming their HR operations with HRZIO.
          </p>
        </div>

        {/* Stats Row - Colorful Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="relative group text-center p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className={`text-4xl sm:text-5xl font-black text-white mb-2 drop-shadow-lg`}>
                {stat.value}
              </div>
              <div className="text-white/80 font-bold">{stat.label}</div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.bgGradient} rounded-b-3xl`}></div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="group relative bg-white rounded-3xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
              {/* Colorful Top Border */}
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${testimonial.gradient} rounded-t-3xl`}></div>

              {/* Rating */}
              <div className="flex gap-1 mb-5 pt-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <HiStar key={i} className="w-6 h-6 text-yellow-400 fill-current drop-shadow" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 text-lg mb-8 leading-relaxed font-medium">
                "{testimonial.content}"
              </p>

              {/* Author & Metric */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-black text-gray-900 text-lg">{testimonial.name}</div>
                    <div className="text-sm text-gray-500 font-semibold">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
                {testimonial.metric && (
                  <div className="text-right hidden sm:block">
                    <div className={`text-3xl font-black bg-gradient-to-r ${testimonial.gradient} bg-clip-text text-transparent`}>
                      {testimonial.metric.value}
                    </div>
                    <div className="text-xs text-gray-500 font-bold">{testimonial.metric.label}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Awards Section */}
        <div className="mt-20 text-center">
          <p className="text-white/60 text-sm font-bold mb-8 tracking-widest">RECOGNIZED BY INDUSTRY LEADERS</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { title: 'G2 Leader', subtitle: 'HR Software 2025', gradient: 'from-cyan-400 to-blue-600' },
              { title: 'Capterra', subtitle: 'Top Rated 2025', gradient: 'from-purple-400 to-pink-600' },
              { title: 'Software Advice', subtitle: 'Front Runner', gradient: 'from-orange-400 to-red-500' },
            ].map((award) => (
              <div
                key={award.title}
                className="group flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${award.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <HiStar className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-black text-white">{award.title}</div>
                  <div className="text-xs text-white/60 font-semibold">{award.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
