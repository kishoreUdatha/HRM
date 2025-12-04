import React from 'react';
import { Link } from 'react-router-dom';
import { HiHome, HiArrowLeft } from 'react-icons/hi';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-primary-600 opacity-20">404</div>
          <div className="relative -mt-20">
            <svg
              className="w-48 h-48 mx-auto text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={0.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-secondary-900 mb-4">Page Not Found</h1>
        <p className="text-secondary-600 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on
          track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 border border-secondary-200 text-secondary-700 rounded-lg hover:bg-secondary-100 transition-colors"
          >
            <HiArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <HiHome className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t border-secondary-200">
          <p className="text-sm text-secondary-500 mb-4">Need help?</p>
          <div className="flex items-center justify-center gap-6">
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
              Contact Support
            </a>
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
              Help Center
            </a>
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
