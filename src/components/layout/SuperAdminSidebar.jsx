import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const SuperAdminSidebar = ({ closeSidebar }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to log out');
    }
  };

  const navLinks = [
    { title: "Dashboard",  path: "/superadmin",          icon: <LayoutDashboard size={18} />, exact: true  },
    { title: "Admins",     path: "/superadmin/admins",    icon: <Users size={18} />                         },
    { title: "Products",   path: "/superadmin/products",  icon: <Package size={18} />                       },
    { title: "Employees",  path: "/superadmin/employees", icon: <Users size={18} />                         },
  ];

  return (
    <div className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300">
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <ShieldAlert className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            SuperAdmin
          </h1>
        </div>
        {closeSidebar && (
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6 space-y-1.5">
        {navLinks.map((link) => (
          <div key={link.path} className="px-3">
            <NavLink
              to={link.path}
              end={link.exact}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group text-sm font-medium ${isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 transition-colors'}>
                    {link.icon}
                  </span>
                  <span>{link.title}</span>
                </>
              )}
            </NavLink>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            handleLogout();
            if (closeSidebar) closeSidebar();
          }}
          className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-xl text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 border border-transparent transition-all duration-300 group text-sm font-medium"
        >
          <LogOut size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default SuperAdminSidebar;
