import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, MapPin } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { generateId } from '../../firebase/idGenerator';

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'Active'
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading customers: ", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      status: 'Active'
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setFormData({
      name: cust.name,
      email: cust.email,
      phone: cust.phone,
      address: cust.address,
      city: cust.city,
      status: cust.status
    });
    setEditId(cust.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and Email are required");
      return;
    }

    try {
      if (editId) {
        await updateDoc(doc(db, 'customers', editId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success("Customer updated successfully");
      } else {
        const customId = await generateId('customer', 'CUS');
        await addDoc(collection(db, 'customers'), {
          ...formData,
          customId,
          createdAt: serverTimestamp()
        });
        toast.success("Customer added successfully");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error saving customer");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        toast.success("Customer deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Error deleting customer");
      }
    }
  };

  const filteredCustomers = customers.filter(cust => 
    cust.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    cust.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your customer database.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all dark:text-white shadow-sm"
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Info</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.map((cust) => (
                <tr key={cust.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-100 to-pink-50 dark:from-purple-900/40 dark:to-pink-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-800">
                        {cust.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{cust.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {cust.customId || cust.id.slice(0,6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 dark:text-gray-300">{cust.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cust.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{cust.city}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cust.status === 'Active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}>
                      {cust.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(cust)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cust.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No customers found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative z-10 border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editId ? 'Edit Customer' : 'Add New Customer'}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" 
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" 
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                        <input 
                          type="text" 
                          name="phone"
                          value={formData.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 10) {
                              setFormData({ ...formData, phone: val });
                            }
                          }}
                          maxLength="10"
                          pattern="\d{10}"
                          title="Phone number must be exactly 10 digits"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" 
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                      <input 
                        type="text" 
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" 
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                      <input 
                        type="text" 
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" 
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                      <select 
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all appearance-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
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
                    Save Customer
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

export default Customers;
