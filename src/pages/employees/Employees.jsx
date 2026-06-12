import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, Phone, Key, User, Shield, Eye, EyeOff, Package, ChevronDown } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Employees = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    role: '',
    productId: ''
  });
  const [editId, setEditId] = useState(null);

  // Load employees, roles, and products for logged-in admin
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Employees listener
    const unsubEmployees = onSnapshot(
      collection(db, 'admins', currentUser.uid, 'employees'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading employees: ", error);
        setLoading(false);
      }
    );

    // Roles listener to populate dropdown
    const unsubRoles = onSnapshot(
      collection(db, 'admins', currentUser.uid, 'roles'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRoles(list);
      }
    );

    // Products listener to populate dropdown
    const unsubProducts = onSnapshot(
      collection(db, 'admins', currentUser.uid, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(list);
      }
    );

    return () => {
      unsubEmployees();
      unsubRoles();
      unsubProducts();
    };
  }, [currentUser]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      mobile: '',
      password: '',
      role: roles[0]?.roleName || 'Sales Manager',
      productId: ''
    });
    setEditId(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setFormData({
      name: emp.name || '',
      mobile: emp.mobile || '',
      password: emp.password || '',
      role: emp.role || roles[0]?.roleName || 'Sales Manager',
      productId: emp.productId || ''
    });
    setEditId(emp.id);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Employee name is required");
    if (!formData.mobile || formData.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits");
    if (!formData.password) return toast.error("Password is required");
    if (!formData.role) return toast.error("Role is required");

    // Retrieve selected product name to cache inside the employee record
    const selectedProd = products.find(p => p.id === formData.productId);
    const productName = selectedProd ? selectedProd.productName : '';

    const payload = {
      ...formData,
      productName: productName,
      createdByAdminId: currentUser.uid
    };

    const basePath = ['admins', currentUser.uid, 'employees'];

    try {
      if (editId) {
        await updateDoc(doc(db, ...basePath, editId), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        toast.success("Employee updated successfully");
      } else {
        const newId = 'emp_' + Date.now();
        await setDoc(doc(db, ...basePath, newId), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success("Employee added successfully");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error saving employee");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteDoc(doc(db, 'admins', currentUser.uid, 'employees', id));
        toast.success("Employee deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Error deleting employee");
      }
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.mobile?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Manage your staff members and their roles.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all dark:text-white shadow-sm"
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30 shrink-0"
          >
            <Plus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Employee Info</th>
                <th className="px-6 py-4 font-medium">Mobile</th>
                <th className="px-6 py-4 font-medium">Password</th>
                <th className="px-6 py-4 font-medium">Assigned Product</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                        {emp.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{emp.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 dark:text-gray-300 font-medium">{emp.mobile}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-650 dark:text-gray-400 font-mono">{emp.password}</p>
                  </td>
                  <td className="px-6 py-4">
                    {emp.productName ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-955 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        {emp.productName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-450 dark:text-gray-500 italic font-medium">All Products</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-955 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {!loading && filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col relative z-10 border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editId ? 'Edit Employee' : 'Add New Employee'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} /> Name
                    </label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full mt-1.5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium" 
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={14} /> Mobile (10 digits)
                    </label>
                    <input 
                      type="text" 
                      name="mobile"
                      maxLength="10"
                      pattern="\d{10}"
                      title="Mobile number must be exactly 10 digits"
                      value={formData.mobile}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 10) {
                          setFormData({ ...formData, mobile: val });
                        }
                      }}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full mt-1.5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium" 
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Key size={14} /> Password
                    </label>
                    <div className="relative mt-1.5">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        name="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium" 
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield size={14} /> Role
                    </label>
                    {roles.length > 0 ? (
                      <select 
                        name="role"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        className="w-full mt-1.5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium appearance-none"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.roleName}>{r.roleName}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        name="role"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        placeholder="e.g. Sales Manager"
                        className="w-full mt-1.5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium" 
                        required
                      />
                    )}
                  </div>

                </div>
                
                <div className="flex-shrink-0 flex items-center justify-end gap-3 p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-500/30"
                  >
                    Save Employee
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

export default Employees;
