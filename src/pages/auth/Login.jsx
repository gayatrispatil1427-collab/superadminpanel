import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { db, auth } from '../../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      let user;
      let role = 'admin';

      // Attempt normal login
      try {
        const userCredential = await login(email, password);
        user = userCredential.user;
        if (localStorage.getItem('employeeSession')) {
          toast.success('Successfully logged in!');
          navigate('/');
          return;
        }
      } catch (authError) {
        // If credentials match default superadmin, attempt to register/seed it
        if (email.toLowerCase() === 'superadmin@example.com' && password === 'SuperAdmin@123') {
          try {
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const userCredential = await createUserWithEmailAndPassword(auth, 'superadmin@example.com', 'SuperAdmin@123');
            user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
              name: 'Super Admin',
              email: 'superadmin@example.com',
              role: 'superadmin',
              status: 'active',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            });
            role = 'superadmin';
          } catch (seedError) {
            if (seedError.code === 'auth/email-already-in-use') {
              throw authError; // Original invalid password error
            }
            throw seedError;
          }
        } else {
          throw authError;
        }
      }

      // Check role from Firestore — admins in /admins/{uid}, SuperAdmin in /users/{uid}
      if (user && role !== 'superadmin') {
        // Check /admins first (new structure for regular admins)
        const adminDocRef  = doc(db, 'admins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);

        if (!adminDocSnap.exists()) {
          // Check /users for superadmin record
          const userDocRef  = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            role = userDocSnap.data().role || 'admin';
            await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
          } else {
            // First-time login for an admin — create their record in /admins
            await setDoc(adminDocRef, {
              email: user.email,
              role: 'admin',
              isActive: true,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            });
          }
        } else {
          role = adminDocSnap.data().role || 'admin';
          await setDoc(adminDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        }
      }

      toast.success('Successfully logged in!');
      if (role === 'superadmin') {
        navigate('/superadmin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      if (err.code && err.code.includes('permission-denied')) {
        toast.error('Login successful, but missing Firestore permissions.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
      } else {
        toast.error('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background circles for glassmorphism */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 dark:bg-slate-800/40 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto mb-4">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">ElectroAdmin</h2>
          <p className="text-slate-400 mt-2 text-sm">Please sign in to access the administrator panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 text-sm mt-4 flex items-center justify-center"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
