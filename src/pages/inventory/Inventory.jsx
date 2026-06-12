import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, ChevronDown, ChevronUp, Search,
  X, Barcode, CheckCircle2, Clock, AlertTriangle, Trash2, Tag, Edit2
} from 'lucide-react';
import { db } from '../../firebase/config';
import {
  collection, onSnapshot, doc, setDoc, updateDoc,
  deleteDoc, serverTimestamp, getDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = ['In Stock', 'Sold', 'Reserved', 'Defective'];

const statusColor = (s) => {
  if (s === 'In Stock') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (s === 'Sold') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  if (s === 'Reserved') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (s === 'Defective') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-slate-100 text-slate-500';
};

const StatusIcon = ({ status }) => {
  if (status === 'In Stock') return <CheckCircle2 size={13} />;
  if (status === 'Reserved') return <Clock size={13} />;
  if (status === 'Defective') return <AlertTriangle size={13} />;
  return <Tag size={13} />;
};

const Inventory = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});   // { productId: { ...invData, series: [] } }
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [addSeriesModal, setAddSeriesModal] = useState({ open: false, productId: null, productName: '', editSeriesId: null });
  const [addProductModal, setAddProductModal] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ serialNumber: '', color: '', notes: '', status: 'In Stock' });
  const [selectedProductId, setSelectedProductId] = useState('');

  const closeSeriesModal = () => {
    setAddSeriesModal({ open: false, productId: null, productName: '', editSeriesId: null });
    setSeriesForm({ serialNumber: '', color: '', notes: '', status: 'In Stock' });
  };

  // Load all products
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(collection(db, 'admins', currentUser.uid, 'products'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  // Load inventory collection in real-time
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(collection(db, 'admins', currentUser.uid, 'inventory'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        map[d.id] = { ...d.data(), id: d.id };
      });
      setInventoryMap(map);
    });
    return () => unsub();
  }, [currentUser]);

  // Load series sub-collection for each inventory product
  useEffect(() => {
    if (!currentUser?.uid) return;
    const invIds = Object.keys(inventoryMap);
    if (invIds.length === 0) return;

    const unsubscribers = invIds.map(productId => {
      return onSnapshot(collection(db, 'admins', currentUser.uid, 'inventory', productId, 'series'), (snap) => {
        const seriesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        seriesList.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setInventoryMap(prev => ({
          ...prev,
          [productId]: { ...prev[productId], series: seriesList }
        }));
      });
    });

    return () => unsubscribers.forEach(u => u());
  }, [Object.keys(inventoryMap).join(','), currentUser]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Add product to inventory
  const handleAddProductToInventory = async () => {
    if (!selectedProductId) { toast.error('Select a product'); return; }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    try {
      await setDoc(doc(db, 'admins', currentUser.uid, 'inventory', selectedProductId), {
        productId: selectedProductId,
        productName: product.productName || product.name || '',
        brand: product.brand || '',
        modelNumber: product.modelNumber || '',
        price: product.price || 0,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success(`${product.productName} added to inventory!`);
      setAddProductModal(false);
      setSelectedProductId('');
      setExpanded(prev => ({ ...prev, [selectedProductId]: true }));
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to inventory');
    }
  };

  // Add series to a product in inventory
  const handleAddSeries = async () => {
    if (!seriesForm.serialNumber.trim()) { toast.error('Serial number required'); return; }
    const { productId } = addSeriesModal;
    try {
      const seriesId = 'SER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      await setDoc(doc(db, 'admins', currentUser.uid, 'inventory', productId, 'series', seriesId), {
        serialNumber: seriesForm.serialNumber.trim(),
        color: seriesForm.color.trim(),
        notes: seriesForm.notes.trim(),
        status: seriesForm.status,
        createdAt: serverTimestamp()
      });
      // Update parent inventory doc updatedAt + seriesCount
      const existing = inventoryMap[productId]?.series || [];
      await updateDoc(doc(db, 'admins', currentUser.uid, 'inventory', productId), {
        updatedAt: serverTimestamp(),
        seriesCount: existing.length + 1
      });
      toast.success('Series unit added!');
      closeSeriesModal();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add series');
    }
  };

  // Edit a series unit details
  const handleEditSeries = async () => {
    if (!seriesForm.serialNumber.trim()) { toast.error('Serial number required'); return; }
    const { productId, editSeriesId } = addSeriesModal;
    try {
      await updateDoc(doc(db, 'admins', currentUser.uid, 'inventory', productId, 'series', editSeriesId), {
        serialNumber: seriesForm.serialNumber.trim(),
        color: seriesForm.color.trim(),
        notes: seriesForm.notes.trim(),
        status: seriesForm.status,
        updatedAt: serverTimestamp()
      });
      toast.success('Series unit updated!');
      closeSeriesModal();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update series');
    }
  };

  // Delete a series unit
  const handleDeleteSeries = async (productId, seriesId) => {
    if (!window.confirm('Delete this series unit?')) return;
    try {
      await deleteDoc(doc(db, 'admins', currentUser.uid, 'inventory', productId, 'series', seriesId));
      const remaining = (inventoryMap[productId]?.series || []).length - 1;
      await updateDoc(doc(db, 'admins', currentUser.uid, 'inventory', productId), { seriesCount: remaining, updatedAt: serverTimestamp() });
      toast.success('Series unit removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // Delete a product from inventory (including all its series units)
  const handleDeleteInventoryProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this product and all its series units from inventory?')) return;
    try {
      const batch = writeBatch(db);
      
      // Get all series units
      const seriesSnap = await getDocs(collection(db, 'admins', currentUser.uid, 'inventory', productId, 'series'));
      seriesSnap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      
      // Delete parent product doc in inventory
      batch.delete(doc(db, 'admins', currentUser.uid, 'inventory', productId));
      
      await batch.commit();
      toast.success('Product removed from inventory');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove product from inventory');
    }
  };

  // Update series status
  const handleStatusChange = async (productId, seriesId, newStatus) => {
    try {
      await updateDoc(doc(db, 'admins', currentUser.uid, 'inventory', productId, 'series', seriesId), { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const inventoryProducts = products.filter(p => inventoryMap[p.id]);
  const notInInventory = products.filter(p => !inventoryMap[p.id]);

  const filtered = inventoryProducts.filter(p => {
    const name = (p.productName || p.name || '').toLowerCase();
    const brand = (p.brand || '').toLowerCase();
    return name.includes(search.toLowerCase()) || brand.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Package size={26} className="text-violet-600" />
            Inventory
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Track products and their individual series/units in stock.
          </p>
        </div>
        <button
          onClick={() => setAddProductModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-sm shadow-violet-500/30 w-full sm:w-auto justify-center hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus size={18} />
          Add Product to Inventory
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search inventory by product name or brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white transition-all font-medium placeholder-slate-400"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Products', value: inventoryProducts.length, color: 'text-violet-600' },
          {
            label: 'Total Units',
            value: Object.values(inventoryMap).reduce((acc, inv) => acc + (inv.series?.length || 0), 0),
            color: 'text-emerald-600'
          },
          {
            label: 'In Stock',
            value: Object.values(inventoryMap).reduce((acc, inv) =>
              acc + (inv.series?.filter(s => s.status === 'In Stock').length || 0), 0),
            color: 'text-blue-600'
          }
        ].map(stat => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Inventory List */}
      {loading ? (
        <div className="glass-card py-16 text-center text-slate-400">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-20 text-center">
          <Package size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">No inventory products found</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Add a product to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((product) => {
              const inv = inventoryMap[product.id];
              const series = inv?.series || [];
              const isOpen = expanded[product.id];
              const inStockCount = series.filter(s => s.status === 'In Stock').length;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Product Row */}
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    onClick={() => toggleExpand(product.id)}
                  >
                     {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{product.productName}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold">
                          ID: {product.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {product.brand} {product.modelNumber && `· Model: ${product.modelNumber}`} · ₹{parseFloat(product.price || 0).toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{series.length}</span> units
                        </span>
                        <span className="text-xs">
                          <span className="font-bold text-emerald-600">{inStockCount}</span>
                          <span className="text-slate-400"> in stock</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setAddSeriesModal({ open: true, productId: product.id, productName: product.productName, editSeriesId: null });
                          setSeriesForm({ serialNumber: '', color: '', notes: '', status: 'In Stock' });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        <Plus size={13} /> Series
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteInventoryProduct(product.id);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        title="Remove Product from Inventory"
                      >
                        <Trash2 size={16} />
                      </button>
                      <span className="text-slate-400">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </div>
                  </div>

                  {/* Series Table */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100 dark:border-slate-800 px-5 pb-5 pt-3">
                          {series.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">
                              <Barcode size={32} className="mx-auto mb-2 opacity-40" />
                              No series units added yet. Click <strong>+ Series</strong> to add one.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left font-bold">#</th>
                                    <th className="px-4 py-3 text-left font-bold">Serial No.</th>
                                    <th className="px-4 py-3 text-left font-bold">Color</th>
                                    <th className="px-4 py-3 text-left font-bold">Notes</th>
                                    <th className="px-4 py-3 text-left font-bold">Status</th>
                                    <th className="px-4 py-3 text-left font-bold">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {series.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                      <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{s.serialNumber}</td>
                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{s.color || '—'}</td>
                                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[140px] truncate">{s.notes || '—'}</td>
                                      <td className="px-4 py-3">
                                        <select
                                          value={s.status}
                                          onChange={e => handleStatusChange(product.id, s.id, e.target.value)}
                                          onClick={e => e.stopPropagation()}
                                          className={`text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${statusColor(s.status)}`}
                                        >
                                          {STATUS_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => {
                                              setAddSeriesModal({
                                                open: true,
                                                productId: product.id,
                                                productName: product.productName,
                                                editSeriesId: s.id
                                              });
                                              setSeriesForm({
                                                serialNumber: s.serialNumber || '',
                                                color: s.color || '',
                                                notes: s.notes || '',
                                                status: s.status || 'In Stock'
                                              });
                                            }}
                                            className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Edit Series Unit"
                                          >
                                            <Edit2 size={13} />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSeries(product.id, s.id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete Series Unit"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Product to Inventory Modal */}
      <AnimatePresence>
        {addProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAddProductModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-gray-200 dark:border-gray-800 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Product to Inventory</h3>
                <button onClick={() => setAddProductModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              {notInInventory.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">All products are already in inventory!</p>
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Product</label>
                  <select
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white mb-5"
                  >
                    <option value="">— Choose a product —</option>
                    {notInInventory.map(p => (
                      <option key={p.id} value={p.id}>{p.productName} (ID: {p.id})</option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setAddProductModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                    <button
                      onClick={handleAddProductToInventory}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Add to Inventory
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Series Modal */}
      <AnimatePresence>
        {addSeriesModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeSeriesModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-gray-200 dark:border-gray-800 p-6"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl" />
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {addSeriesModal.editSeriesId ? 'Edit Series Unit' : 'Add Series Unit'}
                </h3>
                <button
                  onClick={closeSeriesModal}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                {addSeriesModal.editSeriesId ? 'Editing series for: ' : 'Adding series to: '}
                <span className="font-bold text-violet-600">{addSeriesModal.productName}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Serial Number *</label>
                  <input
                    type="text"
                    value={seriesForm.serialNumber}
                    onChange={e => setSeriesForm(p => ({ ...p, serialNumber: e.target.value }))}
                    placeholder="e.g. SN-2024-00123"
                    autoFocus
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Color</label>
                    <input
                      type="text"
                      value={seriesForm.color}
                      onChange={e => setSeriesForm(p => ({ ...p, color: e.target.value }))}
                      placeholder="e.g. Midnight Black"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
                    <select
                      value={seriesForm.status}
                      onChange={e => setSeriesForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
                  <textarea
                    rows={2}
                    value={seriesForm.notes}
                    onChange={e => setSeriesForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any notes about this unit..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={closeSeriesModal}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >Cancel</button>
                <button
                  onClick={addSeriesModal.editSeriesId ? handleEditSeries : handleAddSeries}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-violet-500/30"
                >
                  {addSeriesModal.editSeriesId ? 'Save Changes' : 'Add Series'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
