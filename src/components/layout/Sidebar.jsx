import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Package,
  Warehouse,
  BarChart2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const Sidebar = ({ closeSidebar }) => {
  const { logout, userData } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to log out');
    }
  };

  const isEmployee = userData?.role === 'employee';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Products',  path: '/products', icon: <Package size={18} /> },
    ...(!isEmployee ? [
      { name: 'Employees', path: '/employees', icon: <Users size={18} /> },
      { name: 'Reports',   path: '/reports',  icon: <BarChart2 size={18} /> },
    ] : [])
  ];

  return (
    <div className="w-64 h-full bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300">
      <div className="h-16 px-6 flex items-center justify-between border-b border-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            ElectroAdmin....
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

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group relative text-sm ${isActive
                ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-normal'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={() => {
            handleLogout();
            if (closeSidebar) closeSidebar();
          }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors duration-200 group text-sm font-medium"
        >
          <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
