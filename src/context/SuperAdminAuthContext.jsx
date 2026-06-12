import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const SuperAdminAuthContext = createContext();

export const useSuperAdminAuth = () => useContext(SuperAdminAuthContext);

export const SuperAdminAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    // Uses the same auth instance as AuthContext — sessions are isolated per-tab
    // because we use browserSessionPersistence (sessionStorage), so each tab
    // has its own independent auth state.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            setUserData({ role: 'superadmin' });
          }
        } catch (error) {
          console.error('Error fetching superadmin user data:', error);
          setUserData({ role: 'superadmin' });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = { currentUser, userData, login, logout, loading };

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {!loading && children}
    </SuperAdminAuthContext.Provider>
  );
};
