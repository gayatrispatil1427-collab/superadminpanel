import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Store, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, storage, auth } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { currentUser } = useAuth();
  
  // Profile State
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    bio: '',
    photoURL: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Security State
  const [securityData, setSecurityData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Admin Profile', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'store', name: 'Store Details', icon: Store },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser) {
        setProfileData(prev => ({
          ...prev,
          fullName: currentUser.displayName || 'Admin User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Admin User')}&background=eff6ff&color=2563eb&size=128`
        }));
        
        try {
          const docRef = doc(db, 'admin_profiles', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileData(prev => ({
              ...prev,
              bio: data.bio || '',
            }));
          }
        } catch (error) {
          console.error('Error fetching admin profile:', error);
        }
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      const storageRef = ref(storage, `admin_avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      setProfileData(prev => ({ ...prev, photoURL }));
      toast.success('Avatar uploaded temporarily. Save changes to apply.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }
  };

  const saveProfileChanges = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const promises = [];
      
      if (currentUser.displayName !== profileData.fullName || currentUser.photoURL !== profileData.photoURL) {
        promises.push(updateProfile(auth.currentUser, {
          displayName: profileData.fullName,
          photoURL: profileData.photoURL
        }));
      }

      if (currentUser.email !== profileData.email) {
        promises.push(updateEmail(auth.currentUser, profileData.email));
      }

      await Promise.all(promises);

      const docRef = doc(db, 'admin_profiles', currentUser.uid);
      await setDoc(docRef, {
        bio: profileData.bio,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please re-login to update your email address');
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecurityChange = (e) => {
    setSecurityData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateSecurityPassword = async () => {
    if (!securityData.newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser, securityData.newPassword);
      toast.success('Password updated successfully');
      setSecurityData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please re-login to update your password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your admin account and system preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="glass-card p-3 flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm border border-blue-100/50 dark:border-blue-800/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon size={18} className={activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass-card p-8 min-h-[500px]">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Profile Information</h3>
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      accept="image/png, image/jpeg" 
                      className="hidden" 
                    />
                    <div 
                      onClick={handleImageClick}
                      className="w-24 h-24 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center overflow-hidden cursor-pointer group"
                    >
                      <img src={profileData.photoURL} alt="Admin" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-900/90 px-2 py-1 rounded">Change</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Admin Avatar</h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">PNG, JPG up to 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-medium shadow-sm" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-medium shadow-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bio</label>
                    <textarea 
                      rows="3" 
                      name="bio"
                      value={profileData.bio}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all resize-none font-medium shadow-sm"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={saveProfileChanges}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Security Settings</h3>
                
                <div className="space-y-8">
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Shield size={22} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">Two-Factor Authentication</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Add an extra layer of security to your account.</p>
                      </div>
                    </div>
                    <button className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-300">
                      Enable
                    </button>
                  </div>

                  <div className="space-y-5 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Change Password</h4>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                      <input 
                        type="password" 
                        name="newPassword"
                        value={securityData.newPassword}
                        onChange={handleSecurityChange}
                        placeholder="••••••••" 
                        className="w-full max-w-md px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-medium shadow-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                      <input 
                        type="password" 
                        name="confirmPassword"
                        value={securityData.confirmPassword}
                        onChange={handleSecurityChange}
                        placeholder="••••••••" 
                        className="w-full max-w-md px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all font-medium shadow-sm" 
                      />
                    </div>
                    <button 
                      onClick={updateSecurityPassword}
                      disabled={isUpdatingPassword || !securityData.newPassword}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Placeholder for other tabs */}
          {(activeTab === 'notifications' || activeTab === 'store') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400"
            >
              <Smartphone size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Coming Soon</p>
              <p className="text-sm">These settings are currently under development.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

