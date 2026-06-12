import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Seed data definitions (declared outside component to avoid hoisting/recreation issues)
const getSeededNotifications = (superAdmin) => {
  const baseTime = Date.now();
  if (superAdmin) {
    return [
      {
        id: 'seed-1',
        title: 'Welcome to SuperAdmin Panel',
        description: 'You can now view overall analytics, configure admins, and map system products.',
        type: 'info',
        time: new Date(baseTime - 12 * 65 * 1000).toISOString(),
        read: false,
        link: '/superadmin'
      },
      {
        id: 'seed-2',
        title: 'Connection Active',
        description: 'Database live query sync established with Firestore.',
        type: 'success',
        time: new Date(baseTime - 45 * 60 * 1000).toISOString(),
        read: true,
      }
    ];
  } else {
    return [
      {
        id: 'seed-1',
        title: 'Welcome to ElectroAdmin',
        description: 'Start managing your localized products, onboard employees, and configure stages.',
        type: 'info',
        time: new Date(baseTime - 15 * 60 * 1000).toISOString(),
        read: false,
        link: '/'
      },
      {
        id: 'seed-2',
        title: 'Low Stock Level Set',
        description: 'Standard product warning alerts are configured for inventory under 5 units.',
        type: 'warning',
        time: new Date(baseTime - 180 * 60 * 1000).toISOString(),
        read: true,
        link: '/products'
      }
    ];
  }
};

const Navbar = ({ toggleSidebar, isSuperAdmin }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  
  const notificationsRef = useRef(null);
  const sessionStartTime = useRef(new Date());

  // Handle Theme Change
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Seed / Load Notifications based on logged-in user (deferred to prevent synchronous setState lint error)
  useEffect(() => {
    const loadData = () => {
      const userId = currentUser?.uid || 'guest';
      const saved = localStorage.getItem(`notifications_${userId}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        const seeded = getSeededNotifications(isSuperAdmin);
        setNotifications(seeded);
        localStorage.setItem(`notifications_${userId}`, JSON.stringify(seeded));
      }
    };
    
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [currentUser, isSuperAdmin]);

  // Handle Outside Clicks to Close Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to Firestore for Real-time Updates
  useEffect(() => {
    if (!currentUser) return;

    const addDynamicNotification = (newNotif) => {
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        const updated = [newNotif, ...prev];
        const userId = currentUser?.uid || 'guest';
        localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
        return updated;
      });

      // Show professional glass-style toast
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-slate-100 dark:border-slate-800 p-4 transition-all duration-300 cursor-pointer`}
          onClick={() => {
            toast.dismiss(t.id);
            if (newNotif.link) navigate(newNotif.link);
          }}
        >
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5 text-blue-500">
                <Bell size={20} className="animate-bounce" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {newNotif.title}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {newNotif.description}
                </p>
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={(event) => {
                event.stopPropagation();
                toast.dismiss(t.id);
              }}
              className="bg-transparent rounded-lg p-1 inline-flex text-slate-400 hover:text-slate-500 focus:outline-none"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    };

    let unsubAdmins;
    let unsubProducts;
    let unsubEmployees;

    if (isSuperAdmin) {
      // Listen for newly added admins (SuperAdmin view)
      unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.createdAt ? new Date(data.createdAt) : null;
            if (createdAt && createdAt > sessionStartTime.current) {
              addDynamicNotification({
                id: `admins-${change.doc.id}`,
                title: 'New Admin Registered',
                description: `${data.name || 'An admin'} (${data.email}) has registered.`,
                type: 'success',
                time: new Date().toISOString(),
                read: false,
                link: '/superadmin/admins'
              });
            }
          }
        });
      });
    } else {
      // Listen for products (Regular Admin view)
      unsubProducts = onSnapshot(collection(db, 'admins', currentUser.uid, 'products'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.createdAt ? new Date(data.createdAt) : null;
            if (createdAt && createdAt > sessionStartTime.current) {
              addDynamicNotification({
                id: `products-${change.doc.id}`,
                title: 'Product Created',
                description: `Product "${data.name}" has been successfully added.`,
                type: 'success',
                time: new Date().toISOString(),
                read: false,
                link: '/products'
              });
            }
          }
        });
      });

      // Listen for employees (Regular Admin view)
      unsubEmployees = onSnapshot(collection(db, 'admins', currentUser.uid, 'employees'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.createdAt ? new Date(data.createdAt) : null;
            if (createdAt && createdAt > sessionStartTime.current) {
              addDynamicNotification({
                id: `employees-${change.doc.id}`,
                title: 'Employee Added',
                description: `Employee "${data.name}" has been onboarded.`,
                type: 'success',
                time: new Date().toISOString(),
                read: false,
                link: '/employees'
              });
            }
          }
        });
      });
    }

    return () => {
      if (unsubAdmins) unsubAdmins();
      if (unsubProducts) unsubProducts();
      if (unsubEmployees) unsubEmployees();
    };
  }, [currentUser, isSuperAdmin, navigate]);

  // Notification Operations
  const handleMarkAsRead = (id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const userId = currentUser?.uid || 'guest';
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      const userId = currentUser?.uid || 'guest';
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
      return updated;
    });
    toast.success('All marked as read');
  };

  const handleDeleteNotification = (event, id) => {
    event.stopPropagation();
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      const userId = currentUser?.uid || 'guest';
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
      return updated;
    });
    toast.success('Notification deleted');
  };

  const handleClearAll = () => {
    setNotifications([]);
    const userId = currentUser?.uid || 'guest';
    localStorage.setItem(`notifications_${userId}`, JSON.stringify([]));
    toast.success('Cleared all notifications');
  };

  const formatRelativeTime = (dateString) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getNotificationIconDetails = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-100 dark:border-emerald-900/30'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />,
          bg: 'bg-amber-50 dark:bg-amber-950/45 border border-amber-100 dark:border-amber-900/30'
        };
      case 'info':
      default:
        return {
          icon: <Info size={15} className="text-blue-600 dark:text-blue-400" />,
          bg: 'bg-blue-50 dark:bg-blue-950/45 border border-blue-100 dark:border-blue-900/30'
        };
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <header className="h-16 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors md:hidden"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-250 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all duration-300"
            aria-label="Toggle theme mode"
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform duration-500" /> : <Moon size={18} className="text-indigo-600 dark:text-indigo-400" />}
          </button>

          {/* Notifications Dropdown Container */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-855 hover:text-slate-800 dark:hover:text-slate-250 border transition-all duration-300 relative ${
                showNotifications 
                  ? 'bg-slate-50 dark:bg-slate-855 text-slate-800 dark:text-slate-250 border-slate-200 dark:border-slate-700' 
                  : 'border-transparent hover:border-slate-100 dark:hover:border-slate-800'
              }`}
              aria-label="View notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full px-1 shadow-sm shadow-red-500/35 border border-white dark:border-[#0f172a] animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Menu Panel */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2.5 w-[310px] sm:w-[380px] bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden"
                >
                  {/* Panel Header */}
                  <div className="px-4.5 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Notifications</h3>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                        {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 px-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="text-xs font-bold text-red-500 hover:text-red-650 dark:text-red-400 dark:hover:text-red-300 transition-colors ml-1.5"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex border-b border-slate-100 dark:border-slate-800/60 px-2 bg-slate-50/50 dark:bg-slate-900/35">
                    <button
                      onClick={() => setFilter('all')}
                      className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all duration-200 ${
                        filter === 'all'
                          ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-450'
                          : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter('unread')}
                      className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all duration-200 ${
                        filter === 'unread'
                          ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-450'
                          : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Unread {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                  </div>

                  {/* List of Messages */}
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40 custom-scrollbar">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notif) => {
                        const iconData = getNotificationIconDetails(notif.type);
                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              handleMarkAsRead(notif.id);
                              setShowNotifications(false);
                              if (notif.link) navigate(notif.link);
                            }}
                            className={`flex items-start gap-3.5 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/25 cursor-pointer transition-colors relative group ${
                              !notif.read ? 'bg-blue-50/20 dark:bg-blue-950/5' : ''
                            }`}
                          >
                            {/* Type Icon */}
                            <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center flex-shrink-0 ${iconData.bg}`}>
                              {iconData.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-baseline justify-between gap-1">
                                <p className={`text-xs font-bold truncate text-slate-900 dark:text-slate-100 ${!notif.read ? 'text-blue-900 dark:text-blue-300' : ''}`}>
                                  {notif.title}
                                </p>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                                  {formatRelativeTime(notif.time)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed break-words">
                                {notif.description}
                              </p>
                            </div>

                            {/* Unread indicator / Delete button */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                              {!notif.read && (
                                <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full group-hover:scale-0 transition-transform duration-200"></span>
                              )}
                              <button
                                onClick={(event) => handleDeleteNotification(event, notif.id)}
                                className="p-1 rounded-lg text-slate-350 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 shrink-0"
                                title="Dismiss notification"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Empty state indicator */
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 mb-3.5">
                          <Bell className="text-slate-300 dark:text-slate-600" size={20} />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">All caught up!</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                          {filter === 'unread' ? 'No unread notifications to display.' : 'You have no notifications at this time.'}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
