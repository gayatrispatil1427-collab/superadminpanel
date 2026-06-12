import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Package, Users, ShoppingCart, Activity } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const StatCard = ({ title, value, icon, color, bg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4"
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      <span className={color}>{icon}</span>
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  </motion.div>
);

const Reports = () => {
  const [productCount, setProductCount]   = useState('—');
  const [inStock, setInStock]             = useState('—');
  const [outOfStock, setOutOfStock]       = useState('—');
  const [lowStock, setLowStock]           = useState('—');
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const docs = snap.docs.map(d => d.data());
      setProductCount(docs.length);
      setInStock(docs.filter(p => p.status === 'In Stock').length);
      setOutOfStock(docs.filter(p => p.status === 'Out of Stock').length);
      setLowStock(docs.filter(p => p.status === 'Low Stock').length);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const cards = [
    { title: 'Total Products',  value: loading ? '…' : productCount, icon: <Package size={24} />,      color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',    delay: 0    },
    { title: 'In Stock',        value: loading ? '…' : inStock,       icon: <TrendingUp size={24} />,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', delay: 0.07 },
    { title: 'Low Stock',       value: loading ? '…' : lowStock,      icon: <Activity size={24} />,     color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  delay: 0.14 },
    { title: 'Out of Stock',    value: loading ? '…' : outOfStock,    icon: <ShoppingCart size={24} />, color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20',      delay: 0.21 },
  ];

  // Stock distribution bar
  const total = typeof productCount === 'number' && productCount > 0 ? productCount : 1;
  const inPct  = Math.round((inStock  / total) * 100) || 0;
  const lowPct = Math.round((lowStock / total) * 100) || 0;
  const outPct = Math.round((outOfStock / total) * 100) || 0;

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart2 size={24} className="text-blue-600" />
          Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Inventory & product analytics overview.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      {/* Stock Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
      >
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">Stock Distribution</h3>

        <div className="space-y-4">
          {/* In Stock */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-1.5">
              <span className="text-slate-600 dark:text-slate-300">In Stock</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{inStock} &nbsp;({inPct}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${inPct}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>

          {/* Low Stock */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-1.5">
              <span className="text-slate-600 dark:text-slate-300">Low Stock</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{lowStock} &nbsp;({lowPct}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lowPct}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="h-full bg-amber-400 rounded-full"
              />
            </div>
          </div>

          {/* Out of Stock */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-1.5">
              <span className="text-slate-600 dark:text-slate-300">Out of Stock</span>
              <span className="text-red-600 dark:text-red-400 font-bold">{outOfStock} &nbsp;({outPct}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${outPct}%` }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="h-full bg-red-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> In Stock
          </span>
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Low Stock
          </span>
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Out of Stock
          </span>
        </div>
      </motion.div>

      {/* Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Summary</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-right">Count</th>
              <th className="px-6 py-3 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {[
              { label: 'In Stock',     count: inStock,     pct: inPct,  color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Low Stock',    count: lowStock,    pct: lowPct, color: 'text-amber-600 dark:text-amber-400'   },
              { label: 'Out of Stock', count: outOfStock,  pct: outPct, color: 'text-red-600 dark:text-red-400'       },
            ].map(row => (
              <tr key={row.label} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className={`px-6 py-3.5 font-semibold ${row.color}`}>{row.label}</td>
                <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white">{loading ? '…' : row.count}</td>
                <td className="px-6 py-3.5 text-right text-slate-500 dark:text-slate-400 font-medium">{loading ? '…' : `${row.pct}%`}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 dark:bg-slate-700/20">
              <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">Total</td>
              <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white">{loading ? '…' : productCount}</td>
              <td className="px-6 py-3.5 text-right font-bold text-slate-500 dark:text-slate-400">100%</td>
            </tr>
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default Reports;
