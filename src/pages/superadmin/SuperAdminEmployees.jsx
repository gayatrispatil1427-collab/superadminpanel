import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Key, ChevronDown, Eye, EyeOff, Phone, User, Shield, Package } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Firestore structure managed by this component:
 *   /admins/{adminId}/employees/{employeeId}
 *     - name, mobile, password, role, productId, productName, createdAt, updatedAt
 */

const SuperAdminEmployees = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(location.state?.adminId || '');

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: '',
    role: '',
    productId: ''
  });

  // Load all admins
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), snap => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load employees, roles & products for selected admin
  useEffect(() => {
    if (!selectedAdminId) {
      setEmployees([]);
      setRoles([]);
      setProducts([]);
      return;
    }

    // Employees listener
    const unsubEmployees = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'employees'),
      snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Roles listener (to populate role selector)
    const unsubRoles = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'roles'),
      snap => setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Products listener (to populate product selector)
    const unsubProducts = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'products'),
      snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubEmployees();
      unsubRoles();
      unsubProducts();
    };
  }, [selectedAdminId]);

  const openAdd = () => {
    if (!selectedAdminId) return toast.error('Please select an admin first');
    setEditingId(null);
    setForm({
      name: '',
      mobile: '',
      password: '',
      role: roles[0]?.roleName || 'Sales Manager',
      productId: ''
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name || '',
      mobile: emp.mobile || '',
      password: emp.password || '',
      role: emp.role || roles[0]?.roleName || 'Sales Manager',
      productId: emp.productId || ''
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Employee Name is required');
    if (!form.mobile || form.mobile.length !== 10) return toast.error('Mobile number must be exactly 10 digits');
    if (!form.password) return toast.error('Password is required');
    if (!form.role) return toast.error('Role is required');

    const selectedProd = products.find(p => p.id === form.productId);
    const productName = selectedProd ? selectedProd.productName : '';

    const payload = {
      ...form,
      productName: productName,
      createdByAdminId: selectedAdminId
    };

    const basePath = ['admins', selectedAdminId, 'employees'];

    try {
      if (editingId) {
        await updateDoc(doc(db, ...basePath, editingId), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        toast.success('Employee updated');
      } else {
        const newId = 'emp_' + Date.now();
        await setDoc(doc(db, ...basePath, newId), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Employee added');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteDoc(doc(db, 'admins', selectedAdminId, 'employees', id));
      toast.success('Employee deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete employee');
    }
  };

  const selectedAdmin = admins.find(a => a.id === selectedAdminId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-500" /> Employee Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage employees assigned to the namespace of each administrator.
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={!selectedAdminId}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Admin Selector */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
          <ChevronDown size={14} /> Select Admin to Manage Employees
        </label>
        <div className="relative mt-1">
          <select
            value={selectedAdminId}
            onChange={e => setSelectedAdminId(e.target.value)}
            className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-slate-800 dark:text-white"
          >
            <option value="">— Select an Admin —</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Employees Grid */}
      {selectedAdminId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map(emp => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative group"
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => openEdit(emp)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:bg-slate-700 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(emp.id)} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-650 dark:bg-slate-700 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                  {emp.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{emp.name}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                    {emp.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span>{emp.mobile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-slate-400" />
                  <span className="font-mono">Password: {emp.password}</span>
                </div>
                {emp.productName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Package size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-955 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/20 truncate">
                      Product: {emp.productName}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Package size={14} className="text-slate-455" />
                    <span className="text-xs text-slate-450 italic">All Products</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {employees.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400 col-span-full text-center py-10">
              No employees for <strong>{selectedAdmin?.name}</strong>. Click "Add Employee" to create one.
            </p>
          )}
        </div>
      )}

      {!selectedAdminId && (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">Select an admin above to view and manage their employees</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">
                {editingId ? 'Edit Employee' : 'Add Employee'}
              </h3>
              {selectedAdmin && (
                <p className="text-xs text-slate-400 mb-5">Admin: <strong>{selectedAdmin.name}</strong></p>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} /> Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone size={14} /> Mobile (10 digits)
                  </label>
                  <input
                    required
                    type="text"
                    maxLength="10"
                    pattern="\d{10}"
                    title="Mobile number must be exactly 10 digits"
                    value={form.mobile}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 10) {
                        setForm({ ...form, mobile: val });
                      }
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={14} /> Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter employee password"
                      className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={14} /> Role
                  </label>
                  {roles.length > 0 ? (
                    <select
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.roleName}>{r.roleName}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      placeholder="e.g. Sales Manager"
                      className="w-full mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                    />
                  )}
                </div>


                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors">Save Employee</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminEmployees;
