import React, { useState, useEffect } from 'react';
import { Key, Plus, Edit2, Trash2, Package, ChevronDown, Users } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * Firestore structure managed by this component:
 *   /admins/{adminId}/roles/{roleId}
 *     - roleName, permissions{ product{}, admin{} }, createdAt, updatedAt
 */

const SuperAdminRoles = () => {
  const location = useLocation();
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(location.state?.adminId || '');

  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    roleName: '',
    permissions: {
      product: { view: false, create: false, edit: false, delete: false },
    }
  });

  // Load all admins
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), snap => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load roles for selected admin
  useEffect(() => {
    if (!selectedAdminId) { setRoles([]); return; }
    const unsub = onSnapshot(
      collection(db, 'admins', selectedAdminId, 'roles'),
      snap => setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [selectedAdminId]);

  const emptyForm = () => ({
    roleName: '',
    permissions: {
      product: { view: true, create: true, edit: true, delete: true },
    }
  });

  const openAdd = () => {
    if (!selectedAdminId) return toast.error('Please select an admin first');
    setEditingId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEdit = (role) => {
    setEditingId(role.id);
    setForm({
      roleName: role.roleName || '',
      permissions: role.permissions || emptyForm().permissions
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.roleName) return toast.error('Role Name is required');

    const basePath = ['admins', selectedAdminId, 'roles'];

    try {
      if (editingId) {
        await updateDoc(doc(db, ...basePath, editingId), {
          ...form, updatedAt: serverTimestamp()
        });
        toast.success('Role updated');
      } else {
        const newId = 'role_' + Date.now();
        await setDoc(doc(db, ...basePath, newId), {
          ...form, createdAt: serverTimestamp()
        });
        toast.success('Role added');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save role');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this role? Users assigned this role may lose access.')) return;
    try {
      await deleteDoc(doc(db, 'admins', selectedAdminId, 'roles', id));
      toast.success('Role deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete role');
    }
  };


  const selectedAdmin = admins.find(a => a.id === selectedAdminId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="text-purple-500" /> Role Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Define RBAC roles per admin. Roles are scoped to each admin's namespace.
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={!selectedAdminId}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Role
        </button>
      </div>

      {/* Admin Selector */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
          <Users size={14} /> Select Admin to Manage Roles
        </label>
        <div className="relative mt-1">
          <select
            value={selectedAdminId}
            onChange={e => setSelectedAdminId(e.target.value)}
            className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none appearance-none font-medium text-slate-800 dark:text-white"
          >
            <option value="">— Select an Admin —</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Roles Grid */}
      {selectedAdminId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map(role => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Key size={16} />
                  </div>
                  {role.roleName}
                </h3>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openEdit(role)} className="p-2 bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-purple-600 dark:bg-slate-700 dark:hover:bg-purple-900/30 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(role.id)} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {roles.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400 col-span-full text-center py-10">
              No roles for <strong>{selectedAdmin?.name}</strong>. Click "Add Role" to define one.
            </p>
          )}
        </div>
      )}

      {!selectedAdminId && (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
          <Key size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">Select an admin above to view and manage their roles</p>
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
                {editingId ? 'Edit Role' : 'Create Role'}
              </h3>
              {selectedAdmin && (
                <p className="text-xs text-slate-400 mb-5">Admin: <strong>{selectedAdmin.name}</strong></p>
              )}
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Role Name</label>
                  <input
                    required
                    value={form.roleName}
                    onChange={e => setForm({ ...form, roleName: e.target.value })}
                    placeholder="e.g. Sales Manager"
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>



                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors">Save Role</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminRoles;
