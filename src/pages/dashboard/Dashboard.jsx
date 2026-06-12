import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserSquare2, Package, Layers, ArrowRight, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-card p-7 border-l-4 relative overflow-hidden"
    style={{ borderLeftColor: color }}
  >
    <div className="absolute -right-6 -top-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-transform duration-500 group-hover:scale-110">
      <Icon size={140} />
    </div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
      </div>
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center bg-opacity-10 dark:bg-opacity-20 shadow-sm border border-white/50 dark:border-white/5"
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        <Icon size={26} strokeWidth={2.5} />
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ employees: 0, customers: 0, products: 0 });

  // Employee-specific state
  const [employeeStages, setEmployeeStages] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  // 1. Admin/SuperAdmin stats listener
  useEffect(() => {
    if (userData?.role === 'employee') return;

    let unsubEmployees = () => {};
    let unsubCustomers = () => {};
    let unsubProducts = () => {};

    const targetAdminId = userData?.role === 'superadmin' ? null : currentUser?.uid;

    if (userData?.role === 'superadmin') {
      unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
        setCounts(prev => ({ ...prev, employees: snapshot.size }));
      }, (error) => console.error("Failed to load employees count:", error));

      unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
        setCounts(prev => ({ ...prev, customers: snapshot.size }));
      }, (error) => console.error("Failed to load customers count:", error));

      unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        setCounts(prev => ({ ...prev, products: snapshot.size }));
      }, (error) => console.error("Failed to load products count:", error));
    } else if (currentUser?.uid) {
      unsubEmployees = onSnapshot(collection(db, 'admins', currentUser.uid, 'employees'), (snapshot) => {
        setCounts(prev => ({ ...prev, employees: snapshot.size }));
      }, (error) => console.error(error));

      unsubProducts = onSnapshot(collection(db, 'admins', currentUser.uid, 'products'), (snapshot) => {
        setCounts(prev => ({ ...prev, products: snapshot.size }));
      }, (error) => console.error(error));
    }

    return () => {
      unsubEmployees();
      unsubCustomers();
      unsubProducts();
    };
  }, [currentUser, userData]);

  // 2. Employee stages listener
  useEffect(() => {
    if (userData?.role !== 'employee' || !userData?.adminId) return;

    setEmpLoading(true);
    const targetAdminId = userData.adminId;
    const activeListeners = [];

    const unsubProducts = onSnapshot(collection(db, 'admins', targetAdminId, 'products'), (snapshot) => {
      // Clear previous listeners
      activeListeners.forEach(unsub => unsub());
      activeListeners.length = 0;

      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (productsList.length === 0) {
        setEmployeeStages([]);
        setEmpLoading(false);
        return;
      }

      let loadedCount = 0;
      productsList.forEach(prod => {
        const u = onSnapshot(collection(db, 'admins', targetAdminId, 'products', prod.id, 'stages'), (stageSnap) => {
          const prodStages = stageSnap.docs.map(d => ({
            id: d.id,
            productId: prod.id,
            productName: prod.productName,
            brand: prod.brand,
            modelNumber: prod.modelNumber,
            ...d.data()
          }));

          const assigned = prodStages.filter(stage =>
            (stage.assignedEmployeeIds && stage.assignedEmployeeIds.includes(currentUser.uid)) ||
            (stage.assignedEmployeeId === currentUser.uid)
          );

          setEmployeeStages(prev => {
            const filtered = prev.filter(s => s.productId !== prod.id);
            return [...filtered, ...assigned];
          });

          loadedCount++;
          if (loadedCount >= productsList.length) {
            setEmpLoading(false);
          }
        }, (err) => {
          console.error(err);
          loadedCount++;
          if (loadedCount >= productsList.length) {
            setEmpLoading(false);
          }
        });
        activeListeners.push(u);
      });
    }, (err) => {
      console.error(err);
      setEmpLoading(false);
    });

    return () => {
      unsubProducts();
      activeListeners.forEach(unsub => unsub());
    };
  }, [currentUser, userData]);

  const isSuperAdmin = userData?.role === 'superadmin';
  const isEmployee = userData?.role === 'employee';

  // Employee Stat calculations
  const uniqueProductsCount = new Set(employeeStages.map(s => s.productId)).size;
  const totalQuestionsCount = employeeStages.reduce((acc, s) => acc + (s.questions || []).length, 0);

  // Render Employee Dashboard
  if (isEmployee) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Employee Task Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Hello, <strong>{userData.name}</strong>. Below are the checklist stages assigned to you.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Assigned Products" value={uniqueProductsCount} icon={Package} color="#3b82f6" delay={0.1} />
          <StatCard title="Assigned Stages" value={employeeStages.length} icon={Layers} color="#8b5cf6" delay={0.2} />
          <StatCard title="Checklist Questions" value={totalQuestionsCount} icon={ClipboardCheck} color="#10b981" delay={0.3} />
        </div>

        {/* Assigned Stages List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Assigned Stages</h3>
          
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Product Name</th>
                    <th className="px-6 py-4 font-medium">Assigned Stage</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Checklist Size</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {empLoading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading assigned stages...
                      </td>
                    </tr>
                  ) : employeeStages.map((stage) => (
                    <tr key={stage.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{stage.productName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{stage.brand} {stage.modelNumber && `· ${stage.modelNumber}`}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{stage.stageName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          stage.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {stage.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {(stage.questions || []).length} Question(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/products/${stage.productId}`)}
                          className="inline-flex items-center gap-1 px-4.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-100 dark:border-blue-900/20 transition-all"
                        >
                          Fill Checklist <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {!empLoading && employeeStages.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                        <CheckCircle2 size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-base text-slate-700 dark:text-slate-300">All Clear!</p>
                        <p className="text-xs text-slate-400 mt-1">No checklist stages have been assigned to you yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Admin/SuperAdmin Dashboard
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Welcome back to your administration panel.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        <StatCard title="Total Employees" value={counts.employees} icon={UserSquare2} color="#3b82f6" delay={0.1} />
        {isSuperAdmin && (
          <StatCard title="Total Customers" value={counts.customers} icon={Users} color="#8b5cf6" delay={0.2} />
        )}
        <StatCard title="Total Products" value={counts.products} icon={Package} color="#10b981" delay={0.3} />
      </div>
    </div>
  );
};

export default Dashboard;
