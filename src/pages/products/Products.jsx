import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, Trash2, X, Image as ImageIcon, Layers } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Default stages auto-assigned to every new product
const DEFAULT_STAGES = [
  {
    stageName: 'Pre-Installation Survey',
    questions: [
      { questionTitle: 'What is the installation site condition?', answerType: 'Short Answer', required: true, description: 'Describe the wall/floor/space condition at site.', options: [] },
      { questionTitle: 'Is the power supply adequate?', answerType: 'Multiple Choice', required: true, description: 'Check voltage and socket type.', options: ['Yes – Standard 220V', 'No – Needs upgrade', 'Partially ready'] },
      { questionTitle: 'Any existing units to be removed?', answerType: 'Checkbox', required: false, description: 'Select all that apply.', options: ['Old AC unit', 'Old wiring', 'Wall bracket'] }
    ]
  },
  {
    stageName: 'Technical Setup & Installation',
    questions: [
      { questionTitle: 'Model number verified on product?', answerType: 'Multiple Choice', required: true, description: 'Check the model number on the label/sticker.', options: ['Yes – Matches', 'No – Mismatch found'] },
      { questionTitle: 'Installation notes', answerType: 'Paragraph', required: false, description: 'Add any technical setup notes or special instructions.', options: [] },
      { questionTitle: 'Voltage at outlet (measured)', answerType: 'Short Answer', required: true, description: 'Use a voltmeter and record the exact reading.', options: [] }
    ]
  },
  {
    stageName: 'Quality Check & Testing',
    questions: [
      { questionTitle: 'Unit powers ON successfully?', answerType: 'Multiple Choice', required: true, description: 'Turn on the unit and verify it starts without error.', options: ['Yes', 'No – Error code', 'No – No response'] },
      { questionTitle: 'Remote / controls working?', answerType: 'Checkbox', required: false, description: 'Test all physical buttons and remote features.', options: ['Power button', 'Mode/function', 'Remote control', 'Display panel'] },
      { questionTitle: 'Test result summary', answerType: 'Paragraph', required: true, description: 'Summarize the overall testing outcome.', options: [] }
    ]
  },
  {
    stageName: 'Handover & Customer Briefing',
    questions: [
      { questionTitle: 'Customer demonstrated how to use?', answerType: 'Multiple Choice', required: true, description: 'Confirm the customer was walked through usage instructions.', options: ['Yes – Full demo done', 'Partial demo', 'Customer refused demo'] },
      { questionTitle: 'Warranty card / documents handed over?', answerType: 'Checkbox', required: true, description: 'Select all documents provided to customer.', options: ['Warranty card', 'User manual', 'Invoice copy', 'Service booklet'] },
      { questionTitle: 'Customer satisfaction rating', answerType: 'Dropdown Menu', required: true, description: 'Ask the customer to rate the installation experience.', options: ['⭐ Poor', '⭐⭐ Below Average', '⭐⭐⭐ Average', '⭐⭐⭐⭐ Good', '⭐⭐⭐⭐⭐ Excellent'] }
    ]
  }
];

// Generate a fresh stages array from the template
const buildDefaultStages = () => {
  return DEFAULT_STAGES.map((stageTemplate, idx) => ({
    id: 'stage_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 6),
    stageName: stageTemplate.stageName,
    stageOrder: idx + 1,
    createdAt: new Date().toISOString(),
    questions: stageTemplate.questions.map((q, qIdx) => ({
      id: 'q_' + Date.now() + '_' + qIdx + '_' + Math.random().toString(36).substr(2, 6),
      questionTitle: q.questionTitle,
      description: q.description || '',
      answerType: q.answerType,
      required: q.required,
      options: q.options || [],
      answer: '',
      createdAt: new Date().toISOString()
    }))
  }));
};

// Clone stages from an existing product (reset all answers)
const cloneStagesFrom = (sourceStages) => {
  return (sourceStages || []).map((stage, idx) => ({
    ...stage,
    id: 'stage_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 6),
    stageOrder: idx + 1,
    createdAt: new Date().toISOString(),
    questions: (stage.questions || []).map((q, qIdx) => ({
      ...q,
      id: 'q_' + Date.now() + '_' + qIdx + '_' + Math.random().toString(36).substr(2, 6),
      answer: '', // reset answer for new product
      createdAt: new Date().toISOString()
    }))
  }));
};

const Products = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyFromProductId, setCopyFromProductId] = useState('__default__');
  const navigate = useNavigate();

  const categories = ['All', 'AC', 'TV', 'Refrigerator', 'Laptop', 'Mobile', 'Washing Machine'];

  const [formData, setFormData] = useState({
    productName: '',
    category: 'TV',
    brand: '',
    modelNumber: '',
    price: '',
    stock: '',
    description: '',
    status: 'In Stock'
  });
  const [imagesInput, setImagesInput] = useState('');
  const [editId, setEditId] = useState(null);

  // One-time migration: reassign any non-numeric Firestore IDs to clean sequential numbers
  const migrateProductIds = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Separate docs that already have numeric IDs from those that don't
      const numericDocs = allDocs.filter(d => /^\d+$/.test(d.id));
      const nonNumericDocs = allDocs.filter(d => !/^\d+$/.test(d.id));

      if (nonNumericDocs.length === 0) return; // Nothing to migrate

      // Find the highest existing numeric ID to continue from
      const existingNumbers = numericDocs.map(d => parseInt(d.id, 10));
      let nextId = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1001;

      const batch = writeBatch(db);

      for (const prod of nonNumericDocs) {
        const newIdStr = String(nextId++);
        const { id: _oldId, ...data } = prod;

        // Create new document with numeric ID
        batch.set(doc(db, 'products', newIdStr), {
          ...data,
          migratedAt: serverTimestamp()
        });

        // Delete old document with random ID
        batch.delete(doc(db, 'products', prod.id));
      }

      await batch.commit();
      console.log(`✅ Migrated ${nonNumericDocs.length} product(s) to numeric IDs.`);
    } catch (err) {
      console.error('Migration error:', err);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;
    let unsub = null;

    const init = async () => {
      const targetAdminId = userData?.role === 'employee' ? userData.adminId : currentUser.uid;
      if (!targetAdminId) return;

      // Start listener immediately
      unsub = onSnapshot(collection(db, 'admins', targetAdminId, 'products'), (snapshot) => {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        // Sort by numeric ID ascending
        list.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
        setProducts(list);
        setLoading(false);
      }, (error) => {
        console.error('Error loading products:', error);
        setLoading(false);
      });
    };

    init();

    // Cleanup: unsubscribe from Firestore listener on unmount
    return () => {
      if (unsub) unsub();
    };
  }, [currentUser, userData]);

  // Auto-cleanup legacy fields on existing products
  useEffect(() => {
    if (products.length === 0 || !currentUser?.uid) return;
    
    const productsToClean = products.filter(p => 
      p.category !== undefined || 
      p.description !== undefined || 
      p.images !== undefined || 
      p.status !== undefined || 
      p.stock !== undefined
    );

    if (productsToClean.length > 0) {
      productsToClean.forEach(async (prod) => {
        try {
          const prodRef = doc(db, 'admins', currentUser.uid, 'products', prod.id);
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
  }, [products, currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };



  const handleOpenEdit = (prod) => {
    setFormData({
      productName: prod.productName || prod.name || '',
      category: prod.category || 'TV',
      brand: prod.brand || '',
      modelNumber: prod.modelNumber || '',
      price: prod.price ?? '',
      stock: prod.stock ?? '',
      description: prod.description || '',
      status: prod.status || 'In Stock'
    });
    setImagesInput(prod.images ? prod.images.join(', ') : (prod.image ? [prod.image].join(', ') : ''));
    setEditId(prod.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName) {
      toast.error("Product Name is required");
      return;
    }

    const priceNum = parseFloat(formData.price || '0');

    const productData = {
      productName: formData.productName,
      brand: formData.brand || '',
      modelNumber: formData.modelNumber || '',
      price: priceNum,
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'admins', currentUser.uid, 'products', editId), {
          ...productData,
          updatedAt: serverTimestamp(),
          category: deleteField(),
          description: deleteField(),
          images: deleteField(),
          status: deleteField(),
          stock: deleteField()
        });
        toast.success("Product updated successfully");
      } else {
        // Generate sequential numerical ID (e.g., 1001, 1002, 1003...)
        const numericIds = products
          .map(prod => parseInt(prod.id, 10))
          .filter(id => !isNaN(id));
        const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1001;
        const newIdString = String(nextId);

        // Determine which stages to assign
        let assignedStages;
        if (copyFromProductId === '__default__') {
          assignedStages = buildDefaultStages();
        } else {
          const sourceProduct = products.find(p => p.id === copyFromProductId);
          assignedStages = sourceProduct && sourceProduct.stages
            ? cloneStagesFrom(sourceProduct.stages)
            : buildDefaultStages();
        }

        await setDoc(doc(db, 'admins', currentUser.uid, 'products', newIdString), {
          ...productData,
          stages: assignedStages,
          createdAt: serverTimestamp()
        });
        toast.success(`Product added with ID: ${newIdString} and ${assignedStages.length} stages assigned!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error saving product");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, 'admins', currentUser.uid, 'products', id));
        toast.success("Product deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Error deleting product");
      }
    }
  };

  const filteredProducts = products.filter(prod => {
    const name = prod.productName || prod.name || '';
    const brand = prod.brand || '';
    const idStr = prod.id || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idStr.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Products Catalog</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your electronics inventory.</p>
      </div>

      <div className="glass-card p-5">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search products by name, brand, or unique ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all dark:text-white shadow-sm font-medium placeholder-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center glass-card">
            <div className="text-slate-400 dark:text-slate-500 text-4xl mb-3">⏳</div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center glass-card">
            <div className="text-slate-300 dark:text-slate-600 text-5xl mb-3">🔍</div>
            <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">No products found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try a different name, brand, or ID</p>
          </div>
        ) : filteredProducts.map((product) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={product.id}
            className="glass-card overflow-hidden group p-6"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{product.brand}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono select-all font-semibold tracking-wide border border-slate-200/40 dark:border-slate-700/30" title="Product Unique ID">
                      ID: {product.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 tracking-tight" title={product.productName}>
                    {product.productName}
                  </h3>
                  {product.modelNumber && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Model: {product.modelNumber}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ₹{parseFloat(product.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Product Actions Bar inside the card body */}
              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100/70 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 text-xs font-bold transition-all duration-205 active:scale-95 shadow-sm select-none"
                  title={isEmployee ? "View Stages" : "Manage Stages"}
                >
                  <Layers size={14} className="shrink-0" />
                  <span>{isEmployee ? "View Stages" : "Stages"}</span>
                </button>
                {!isEmployee && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold transition-all duration-205 active:scale-95 shadow-sm select-none"
                      title="Edit Product Details"
                    >
                      <Edit2 size={14} className="shrink-0" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100/70 dark:bg-red-955/20 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold transition-all duration-205 active:scale-95 shadow-sm select-none"
                      title="Delete Product"
                    >
                      <Trash2 size={14} className="shrink-0" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {!loading && filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 glass-card">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-1">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl relative z-10 border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editId ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name *</label>
                      <input
                        type="text"
                        name="productName"
                        value={formData.productName}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model Number</label>
                      <input
                        type="text"
                        name="modelNumber"
                        value={formData.modelNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-semibold"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price (₹)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="price"
                        value={formData.price}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData(prev => ({ ...prev, price: val }));
                        }}
                        placeholder="e.g. 54999"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 rounded-b-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-500/30"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
