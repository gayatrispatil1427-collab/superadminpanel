import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Layers, X, Search, Users } from 'lucide-react';
import { db } from '../../firebase/config';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc,
  serverTimestamp, getDocs, writeBatch, deleteField
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Firestore structure managed by this component:
 *   /admins/{adminId}/products/{productId}
 *     - productName, category, brand, modelNumber, price, stock,
 *       description, images[], status, createdAt, updatedAt
 *
 * Stages live under:
 *   /admins/{adminId}/products/{productId}/stages/{stageId}
 */

// Default stages template applied to every new product
const DEFAULT_STAGES = [
  { stageName: 'Pre-Installation Survey', stageOrder: 1 },
  { stageName: 'Technical Setup & Installation', stageOrder: 2 },
  { stageName: 'Quality Check & Testing', stageOrder: 3 },
  { stageName: 'Handover & Customer Briefing', stageOrder: 4 },
];

const SuperAdminProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedAdminId, setSelectedAdminId] = useState(location.state?.adminId || '');
  const [admins, setAdmins] = useState([]);
  // allProducts holds { ...productData, adminId } for every product of selected admin
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync selectedAdminId with router state on navigation
  useEffect(() => {
    setSelectedAdminId(location.state?.adminId || '');
  }, [location.state]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editAdminId, setEditAdminId] = useState('');
  const [form, setForm] = useState({
    productName: '', category: 'AC', brand: '', modelNumber: '',
    price: '', stock: '', description: '', status: 'In Stock', imagesInput: ''
  });

  // Load all admins (for the selector dropdown)
  useEffect(() => {
    const unsubAdmins = onSnapshot(collection(db, 'admins'), adminSnap => {
      const adminList = adminSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdmins(adminList);
    });
    return () => unsubAdmins();
  }, []);

  // Listen to products of selected admin only
  useEffect(() => {
    if (!selectedAdminId) {
      setAllProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubProds = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'products'),
      snap => {
        const adminName = admins.find(a => a.id === selectedAdminId)?.name || '';
        const list = snap.docs.map(d => ({
          id: d.id,
          adminId: selectedAdminId,
          adminName,
          ...d.data()
        }));
        list.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        setAllProducts(list);
        setLoading(false);
      },
      err => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsubProds();
  }, [selectedAdminId, admins]);

  // Auto-cleanup legacy fields on existing products
  useEffect(() => {
    if (allProducts.length === 0) return;
    
    const productsToClean = allProducts.filter(p => 
      p.category !== undefined || 
      p.description !== undefined || 
      p.images !== undefined || 
      p.status !== undefined || 
      p.stock !== undefined
    );

    if (productsToClean.length > 0) {
      productsToClean.forEach(async (prod) => {
        try {
          const prodRef = doc(db, 'admins', prod.adminId, 'products', prod.id);
          await updateDoc(prodRef, {
            category: deleteField(),
            description: deleteField(),
            images: deleteField(),
            status: deleteField(),
            stock: deleteField()
          });
        } catch (err) {
          console.error(`Error cleaning up product ${prod.id}:`, err);
        }
      });
    }
  }, [allProducts]);

  // Filtered products based on search query
  const filteredProducts = allProducts.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.productName || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const resetForm = () => setForm({
    productName: '', category: 'AC', brand: '', modelNumber: '',
    price: '', stock: '', description: '', status: 'In Stock', imagesInput: ''
  });

  const openAdd = () => {
    resetForm();
    setEditId(null);
    setEditAdminId(selectedAdminId);
    setIsModalOpen(true);
  };

  const openEdit = (prod) => {
    setEditId(prod.id);
    setEditAdminId(prod.adminId);
    setForm({
      productName: prod.productName || '',
      category: prod.category || 'AC',
      brand: prod.brand || '',
      modelNumber: prod.modelNumber || '',
      price: String(prod.price ?? ''),
      stock: String(prod.stock ?? ''),
      description: prod.description || '',
      status: prod.status || 'In Stock',
      imagesInput: (prod.images || []).join(', ')
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.productName) {
      return toast.error('Product Name is required');
    }
    if (!editAdminId && !editId) {
      // For new products, pick selected admin or first admin
      const targetAdmin = selectedAdminId || admins[0]?.id;
      if (!targetAdmin) return toast.error('No admin found');
      setEditAdminId(targetAdmin);
    }

    const targetAdminId = editAdminId || selectedAdminId || admins[0]?.id;
    if (!targetAdminId) return toast.error('No admin to assign product to');

    const priceNum = parseFloat(form.price || '0');

    const data = {
      productName: form.productName,
      brand: form.brand || '',
      modelNumber: form.modelNumber || '',
      price: priceNum,
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'admins', targetAdminId, 'products', editId), {
          ...data,
          updatedAt: serverTimestamp(),
          category: deleteField(),
          description: deleteField(),
          images: deleteField(),
          status: deleteField(),
          stock: deleteField()
        });
        toast.success('Product updated');
      } else {
        const adminProds = allProducts.filter(p => p.adminId === targetAdminId);
        const numericIds = adminProds.map(p => parseInt(p.id, 10)).filter(n => !isNaN(n));
        const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1001;
        const newIdStr = String(nextId);

        const batch = writeBatch(db);
        batch.set(doc(db, 'admins', targetAdminId, 'products', newIdStr), {
          ...data, createdAt: serverTimestamp()
        });
        DEFAULT_STAGES.forEach(stage => {
          const stageId = 'stage_' + Date.now() + '_' + stage.stageOrder + '_' + Math.random().toString(36).substr(2, 5);
          batch.set(doc(db, 'admins', targetAdminId, 'products', newIdStr, 'stages', stageId), {
            stageName: stage.stageName,
            stageOrder: stage.stageOrder,
            status: 'Active',
            questions: [],
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
        toast.success(`Product added (ID: ${newIdStr}) with ${DEFAULT_STAGES.length} default stages!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error saving product: ' + err.message);
    }
  };

  const handleDelete = async (prod) => {
    if (!window.confirm('Delete this product and all its stages?')) return;
    try {
      const stagesSnap = await getDocs(collection(db, 'admins', prod.adminId, 'products', prod.id, 'stages'));
      const batch = writeBatch(db);
      stagesSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'admins', prod.adminId, 'products', prod.id));
      await batch.commit();
      toast.success('Product deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="text-emerald-500" /> Product Managements
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedAdminId 
              ? `${allProducts.length} product${allProducts.length !== 1 ? 's' : ''} for the selected admin`
              : 'Select an administrator to view their products'
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Admin Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase whitespace-nowrap">Admin:</span>
            <select
              value={selectedAdminId}
              onChange={e => setSelectedAdminId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-750 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
            >
              <option value="">-- Select Admin --</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {selectedAdminId && (
            <button
              onClick={openAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {!selectedAdminId ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
          <Users size={48} className="mx-auto mb-4 text-slate-400 opacity-60" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Administrator Selected</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto text-sm leading-relaxed">
            Please choose an administrator from the dropdown menu above or go to the{" "}
            <span className="font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => navigate('/superadmin/admins')}>
              Admins
            </span>{" "}
            tab to select an admin.
          </p>
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products by name, brand or category..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-lg">
                {searchQuery ? `No products matching "${searchQuery}"` : 'No products found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(prod => (
                <motion.div
                  key={`${prod.adminId}-${prod.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group"
                >
                  {/* Body */}
                  <div className="p-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">{prod.brand}</p>
                    <h3 className="font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">{prod.productName}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">ID: {prod.id}</p>
                    {prod.modelNumber && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Model: {prod.modelNumber}</p>
                    )}
                    {prod.adminName && (
                      <p className="text-xs text-violet-500 mt-0.5 font-medium">Admin: {prod.adminName}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(prod.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => openEdit(prod)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => navigate('/superadmin/stages', { state: { adminId: prod.adminId, productId: prod.id } })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 border border-amber-100 dark:border-amber-900/20 rounded-xl transition-colors"
                      >
                        <Layers size={13} /> Stages
                      </button>
                      <button
                        onClick={() => handleDelete(prod)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/20 rounded-xl transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editId ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  {!editId && !selectedAdminId && admins.length > 1 && (
                    <div className="mt-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Assign to Admin</label>
                      <select
                        value={editAdminId}
                        onChange={e => setEditAdminId(e.target.value)}
                        className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      >
                        {admins.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Product Name *</label>
                    <input required value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Brand</label>
                    <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Model Number</label>
                    <input value={form.modelNumber} onChange={e => setForm({ ...form, modelNumber: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
                    <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>

                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors">Save Product</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminProducts;
