import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Layers } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, onSnapshot, updateDoc, collection, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import StageAccordion from './components/StageAccordion';
import { useAuth } from '../../context/AuthContext';

const ProductDetails = () => {
  const { currentUser, userData } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [stages, setStages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const isEmployee = userData?.role === 'employee';
  const targetAdminId = isEmployee ? userData.adminId : currentUser?.uid;

  // Real-time listener for product and stages subcollection
  useEffect(() => {
    if (!targetAdminId) return;

    // Listen to product document
    const productRef = doc(db, 'admins', targetAdminId, 'products', id);
    const unsubProduct = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error("Product not found");
        navigate('/products');
      }
    }, (error) => {
      console.error("Error loading product:", error);
      toast.error("Failed to load product details");
    });

    // Listen to stages subcollection
    const stagesRef = collection(db, 'admins', targetAdminId, 'products', id, 'stages');
    const unsubStages = onSnapshot(stagesRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));

      // Filter stages for employees
      const filtered = isEmployee
        ? list.filter(stage => 
            (stage.assignedEmployeeIds && stage.assignedEmployeeIds.includes(currentUser.uid)) ||
            (stage.assignedEmployeeId === currentUser.uid)
          )
        : list;

      setStages(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Error loading stages:", error);
      toast.error("Failed to load stages");
      setLoading(false);
    });

    // Listen to employees list (only for Admin)
    let unsubEmployees = () => {};
    if (!isEmployee) {
      unsubEmployees = onSnapshot(collection(db, 'admins', targetAdminId, 'employees'), (snap) => {
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsubProduct();
      unsubStages();
      unsubEmployees();
    };
  }, [id, navigate, targetAdminId, isEmployee, currentUser]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageEmployeeIds, setNewStageEmployeeIds] = useState([]);
  const [newStageOrder, setNewStageOrder] = useState('');

  // Filter employees assigned to this specific product (or assigned to All Products)
  const productEmployees = employees.filter(emp => !emp.productId || emp.productId === id);

  const handleOpenAddModal = () => {
    setNewStageName('');
    setNewStageEmployeeIds([]);
    setNewStageOrder(stages.length + 1);
    setIsAddModalOpen(true);
  };

  const submitAddStage = async () => {
    if (!newStageName || !newStageName.trim() || isEmployee) return;

    try {
      const newStageId = 'stage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const assignedNames = newStageEmployeeIds.map(empId => {
        const emp = employees.find(e => e.id === empId);
        return emp ? emp.name : '';
      }).filter(Boolean);

      const seqVal = parseInt(newStageOrder, 10) || (stages.length + 1);

      const newStage = {
        stageName: newStageName.trim(),
        stageOrder: seqVal,
        status: 'Active',
        questions: [],
        assignedEmployeeIds: newStageEmployeeIds,
        assignedEmployeeNames: assignedNames,
        assignedEmployeeId: newStageEmployeeIds[0] || '',
        assignedEmployeeName: assignedNames.join(', ') || '',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'admins', targetAdminId, 'products', id, 'stages', newStageId), newStage);
      setIsAddModalOpen(false);
      setNewStageName('');
      setNewStageEmployeeIds([]);
      toast.success("Stage added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add stage");
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (isEmployee) return;
    if (!window.confirm("Are you sure you want to delete this stage and all its questions?")) return;
    try {
      await deleteDoc(doc(db, 'admins', targetAdminId, 'products', id, 'stages', stageId));

      // Reorder remaining stages
      const remainingStages = stages.filter(s => s.id !== stageId);
      const batch = writeBatch(db);
      remainingStages.forEach((s, idx) => {
        batch.update(doc(db, 'admins', targetAdminId, 'products', id, 'stages', s.id), {
          stageOrder: idx + 1
        });
      });
      await batch.commit();
      toast.success("Stage deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete stage");
    }
  };

  const handleUpdateStage = async (stageId, newName) => {
    if (isEmployee) return;
    if (!newName || !newName.trim()) return;
    try {
      await updateDoc(doc(db, 'admins', targetAdminId, 'products', id, 'stages', stageId), {
        stageName: newName.trim(),
        updatedAt: new Date().toISOString()
      });
      toast.success("Stage updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update stage");
    }
  };

  const handleMoveStage = async (index, direction) => {
    if (isEmployee) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedStages = [...stages];

    const temp = updatedStages[index];
    updatedStages[index] = updatedStages[targetIndex];
    updatedStages[targetIndex] = temp;

    try {
      const batch = writeBatch(db);
      updatedStages.forEach((s, idx) => {
        batch.update(doc(db, 'admins', targetAdminId, 'products', id, 'stages', s.id), {
          stageOrder: idx + 1
        });
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reorder stages");
    }
  };

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-gray-500 ml-3 font-medium">Loading product details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="p-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 shadow-sm"
            title="Back to Catalog"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {product.productName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {product.brand} {product.modelNumber && `· Model: ${product.modelNumber}`} · ID: {product.id}
            </p>
          </div>
        </div>

        {!isEmployee && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-blue-605 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30 shrink-0 text-sm"
          >
            <Plus size={18} />
            <span>Add Stage</span>
          </button>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="bg-white/50 dark:bg-gray-850/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 border border-blue-100/50 dark:border-blue-900/30">
            <Layers size={28} />
          </div>
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">No Stages Configured</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
            {isEmployee ? "You have no assigned stages for this product workflow yet." : "No operational stage checkpoints configured for this product workflow yet."}
          </p>
        </div>
      ) : (
        stages.map((stage, index) => (
          <StageAccordion
            key={stage.id}
            productId={id}
            stage={stage}
            index={index}
            totalStages={stages.length}
            allStages={stages}
            adminEmployees={productEmployees}
            onDelete={() => handleDeleteStage(stage.id)}
            onUpdate={(name) => handleUpdateStage(stage.id, name)}
            onMoveUp={() => handleMoveStage(index, 'up')}
            onMoveDown={() => handleMoveStage(index, 'down')}
          />
        ))
      )}

      {/* Add Stage Modal */}
      <AnimatePresence>
        {isAddModalOpen && !isEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">Add Product Stage</h4>
                  <p className="text-xs text-gray-450 dark:text-gray-400 mt-1 leading-relaxed">
                    Create a new operational stage checkpoint for this product workflow.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-505 select-none">
                    Stage Name
                  </label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={e => setNewStageName(e.target.value)}
                    placeholder="e.g., Pre-installation Survey"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-905 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitAddStage();
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-505 select-none">
                    Stage Sequence (Order)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newStageOrder}
                    onChange={e => setNewStageOrder(e.target.value)}
                    placeholder={`e.g., ${stages.length + 1}`}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-905 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all shadow-sm font-semibold"
                  />
                </div>

                {/* Assigned Employees Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-505 select-none">
                    Assign Employees
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    {productEmployees.map(emp => {
                      const isChecked = newStageEmployeeIds.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setNewStageEmployeeIds(newStageEmployeeIds.filter(id => id !== emp.id));
                            } else {
                              setNewStageEmployeeIds([...newStageEmployeeIds, emp.id]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded-sm border-slate-300 text-blue-605 w-3 h-3 pointer-events-none"
                          />
                          {emp.name}
                        </button>
                      );
                    })}
                    {productEmployees.length === 0 && (
                      <p className="text-xs text-gray-400 italic p-2">No employees are assigned to this product.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4.5 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAddStage}
                    disabled={!newStageName.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>Create Stage</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetails;
