import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from './SuperAdminSidebar';
import Navbar from './Navbar';

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] transition-colors duration-300 overflow-x-hidden max-w-full font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive classes */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SuperAdminSidebar closeSidebar={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} isSuperAdmin={true} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
