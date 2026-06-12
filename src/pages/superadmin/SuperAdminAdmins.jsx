import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Package, ShieldAlert, Mail, Phone, User, Eye, EyeOff, Key } from 'lucide-react';
import { db, firebaseConfig, auth } from '../../firebase/config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateEmail, updatePassword } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Firestore structure managed by this component:
 *   /admins/{adminId}
 *     - name, email, phone, role, isActive, createdAt, updatedAt
 *
 * Each admin doc is also the parent for:
 *   /admins/{adminId}/products/{productId}
 *   /admins/{adminId}/roles/{roleId}
 */
const SuperAdminAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'admin', isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Listen to the top-level /admins collection
    const unsubAdmins = onSnapshot(collection(db, 'admins'), snapshot => {
      setAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubAdmins();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', email: '', phone: '', password: '', role: 'admin', isActive: true });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEdit = (admin) => {
    setEditingId(admin.id);
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: admin.password || '',
      role: admin.role || 'admin',
      isActive: admin.isActive !== false
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and Email are required');

    try {
      const data = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        isActive: form.isActive,
        password: form.password || '',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const oldAdmin = admins.find(a => a.id === editingId);
        const emailChanged = oldAdmin && oldAdmin.email !== form.email;
        const passwordChanged = oldAdmin && form.password && oldAdmin.password !== form.password;

        if (emailChanged || passwordChanged) {
          const oldEmail = oldAdmin ? oldAdmin.email : form.email;
          const oldPassword = oldAdmin ? (oldAdmin.password || '') : '';

          if (oldPassword) {
            const secondaryApp = getApps().find(app => app.name === 'SecondaryAdminApp')
              || initializeApp(firebaseConfig, 'SecondaryAdminApp');
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await signInWithEmailAndPassword(secondaryAuth, oldEmail, oldPassword);
            if (emailChanged) {
              await updateEmail(userCredential.user, form.email);
            }
            if (passwordChanged) {
              await updatePassword(userCredential.user, form.password);
            }
            await secondaryAuth.signOut();
          } else {
            console.warn("Could not update Firebase Auth: old password not stored in Firestore.");
          }
        }

        // Update existing admin doc
        await updateDoc(doc(db, 'admins', editingId), data);
        toast.success('Admin updated');
      } else {
        if (!form.password) return toast.error('Password is required for new admins');

        // Use a secondary Firebase app so we don't sign out the current SuperAdmin
        const secondaryApp = getApps().find(app => app.name === 'SecondaryAdminApp')
          || initializeApp(firebaseConfig, 'SecondaryAdminApp');
        const secondaryAuth = getAuth(secondaryApp);

        // Register user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
        const newUid = userCredential.user.uid;

        data.createdAt = new Date().toISOString();

        // Save admin record under /admins/{newUid}
        await setDoc(doc(db, 'admins', newUid), data);

        await secondaryAuth.signOut();
        toast.success('Admin created successfully!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save admin: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?\nThis will also remove their products, stages, and roles.')) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
      toast.success('Admin deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete admin');
    }
  };

  const toggleStatus = async (admin) => {
    try {
      const newStatus = admin.isActive === false ? true : false;
      await updateDoc(doc(db, 'admins', admin.id), { isActive: newStatus });
      toast.success(newStatus ? 'Admin activated' : 'Admin deactivated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-500" /> Admin Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">Create and manage admin accounts. Each admin owns their own products and roles.</p>
        </div>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus size={16} /> Add Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map(admin => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={admin.id}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative group"
          >
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => openEdit(admin)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:bg-slate-700 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleDelete(admin.id)} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{admin.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${admin.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {admin.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-100 uppercase tracking-wider">Role: {admin.role}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Mail size={14} className="text-slate-400" /> {admin.email}
              </div>
              {admin.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Phone size={14} className="text-slate-400" /> {admin.phone}
                </div>
              )}
              {admin.password && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-mono">
                  <Key size={14} className="text-slate-400" /> Password: {admin.password}
                </div>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/superadmin/products', { state: { adminId: admin.id } })}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 rounded-xl text-xs font-bold transition-colors"
              >
                <Package size={14} /> Products
              </button>
              <button
                onClick={() => navigate('/superadmin/employees', { state: { adminId: admin.id } })}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-xl text-xs font-bold transition-colors"
              >
                <Users size={14} /> Employees
              </button>
            </div>

            <button
              onClick={() => toggleStatus(admin)}
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${admin.isActive !== false
                ? 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 dark:bg-slate-700 dark:hover:bg-amber-900/30 dark:text-slate-300 dark:hover:text-amber-400'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400'
                }`}
            >
              {admin.isActive !== false ? 'Deactivate Account' : 'Activate Account'}
            </button>
          </motion.div>
        ))}
        {admins.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 col-span-full text-center py-12">No admins yet. Click "Add Admin" to get started.</p>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
                {editingId ? 'Edit Admin' : 'Add New Admin'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  <div className="col-span-2 relative">
                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                    <div className="relative mt-1">
                      <input
                        required={!editingId}
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone (Mobile No.)</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 10) {
                          setForm({ ...form, phone: val });
                        }
                      }}
                      maxLength="10"
                      pattern="\d{10}"
                      title="Phone number must be exactly 10 digits"
                      className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                    <input
                      required
                      type="text"
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      placeholder="Type role name (e.g. sales manager, designer)"
                      className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-800 dark:text-slate-250"
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors">Save Admin</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminAdmins;
