import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (emailOrMobile, password) => {
    try {
      // 1. Try Firebase Auth (Admins / SuperAdmins)
      const credential = await signInWithEmailAndPassword(auth, emailOrMobile, password);
      return credential;
    } catch (authError) {
      // 2. If Auth fails, check if the input is a mobile number for an employee
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        for (const adminDoc of adminsSnap.docs) {
          const empSnap = await getDocs(
            query(collection(db, 'admins', adminDoc.id, 'employees'), where('mobile', '==', emailOrMobile))
          );
          const empDoc = empSnap.docs.find(d => d.data().password === password);
          if (empDoc) {
            const empData = empDoc.data();
            const session = {
              employeeId: empDoc.id,
              adminId: adminDoc.id,
              data: empData
            };
            localStorage.setItem('employeeSession', JSON.stringify(session));
            const mockUser = { uid: empDoc.id, email: emailOrMobile, isEmployee: true };
            const mockUserData = { ...empData, role: 'employee', adminId: adminDoc.id };
            setCurrentUser(mockUser);
            setUserData(mockUserData);
            return { user: mockUser };
          }
        }
      } catch (dbError) {
        console.error('Error checking employee login:', dbError);
      }
      throw authError; // If not found, throw original error
    }
  };

  const logout = () => {
    localStorage.removeItem('employeeSession');
    setCurrentUser(null);
    setUserData(null);
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // New structure: regular admins live in /admins/{uid}
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) {
            setUserData(adminDoc.data());
          } else {
            // Fallback: SuperAdmin profile stored in /users/{uid}
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              setUserData(userDoc.data());
            } else {
              setUserData({ role: 'admin' });
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData({ role: 'admin' });
        }
        setLoading(false);
      } else {
        // No firebase user, check if an employee session exists in localStorage
        const savedSession = localStorage.getItem('employeeSession');
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            setCurrentUser({ uid: session.employeeId, email: session.data.mobile, isEmployee: true });
            setUserData({ ...session.data, role: 'employee', adminId: session.adminId });
          } catch (e) {
            console.error('Error loading employee session:', e);
            setCurrentUser(null);
            setUserData(null);
          }
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = { currentUser, userData, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
