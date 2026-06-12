import React, { useState, useEffect } from 'react';
import { Users, Package, Layers, Key } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({ admins: 0, products: 0, roles: 0, stages: 0 });

  // ── Aggregate stats across all admin subcollections ──────────────────────
  useEffect(() => {
    const unsubAdmins = onSnapshot(collection(db, 'admins'), async (snap) => {
      const adminCount = snap.size;
      let totalProducts = 0;
      let totalStages = 0;

      // Count unique roles from admin documents' `role` field
      const roleSet = new Set();
      snap.docs.forEach((adminDoc) => {
        const data = adminDoc.data();
        if (data.role) roleSet.add(data.role.toLowerCase().trim());
      });

      // For each admin, count their products and stages
      const promises = snap.docs.map(async (adminDoc) => {
        const adminId = adminDoc.id;

        // Count products
        const productsSnap = await getDocs(collection(db, 'admins', adminId, 'products'));
        totalProducts += productsSnap.size;

        // Count stages (nested under each product)
        const stagePromises = productsSnap.docs.map(async (productDoc) => {
          const stagesSnap = await getDocs(
            collection(db, 'admins', adminId, 'products', productDoc.id, 'stages')
          );
          totalStages += stagesSnap.size;
        });
        await Promise.all(stagePromises);
      });

      await Promise.all(promises);

      setStats({
        admins: adminCount,
        products: totalProducts,
        roles: roleSet.size,
        stages: totalStages,
      });
    });

    return () => unsubAdmins();
  }, []);

  const statCards = [
    { title: 'Total Admins', value: stats.admins, icon: <Users size={24} className="text-blue-500" />, bg: 'bg-blue-500/10' },
    { title: 'Total Products', value: stats.products, icon: <Package size={24} className="text-emerald-500" />, bg: 'bg-emerald-500/10' },
    { title: 'Total Roles', value: stats.roles, icon: <Key size={24} className="text-purple-500" />, bg: 'bg-purple-500/10' },
    { title: 'Total Stages', value: stats.stages, icon: <Layers size={24} className="text-amber-500" />, bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">System overview — new hierarchical structure</p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            key={stat.title}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
