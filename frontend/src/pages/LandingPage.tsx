import React from 'react';
import PublicNavbar from '../components/landing/PublicNavbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import MobileAppSection from '../components/landing/MobileAppSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import PricingSection from '../components/landing/PricingSection';
import FooterSection from '../components/landing/FooterSection';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <MobileAppSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <FooterSection />
    </div>
  );
};

export default LandingPage;
