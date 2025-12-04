import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatbotWidget from '../chatbot/ChatbotWidget';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Header */}
          <Header onMenuClick={() => setIsSidebarOpen(true)} />

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="py-4 px-6 border-t border-secondary-200 bg-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              <p className="text-sm text-secondary-500">
                &copy; {new Date().getFullYear()} HRM SaaS. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-sm text-secondary-500 hover:text-secondary-700">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-secondary-500 hover:text-secondary-700">
                  Terms of Service
                </a>
                <a href="#" className="text-sm text-secondary-500 hover:text-secondary-700">
                  Help
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* AI Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
};

export default Layout;
