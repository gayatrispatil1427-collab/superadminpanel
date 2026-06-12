import { initializeApp } from 'firebase/app';
import { getAuth, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyDkGq0o75ClXLciAdprgvKU-wy8eMGV9ws",
  authDomain: "products-6ee7b.firebaseapp.com",
  projectId: "products-6ee7b",
  storageBucket: "products-6ee7b.firebasestorage.app",
  messagingSenderId: "248505137836",
  appId: "1:248505137836:web:cc0782621618cb721b7d09",
  measurementId: "G-DJCERMSTWE"
};

const app = initializeApp(firebaseConfig);

// Single auth instance — sessionStorage persistence means each browser tab
// gets its own independent session. Logging out in Tab 1 never affects Tab 2.
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(console.error);

// Shared Firestore, Storage, Analytics (tied to same app as auth — this is required
// so Firestore security rules can read request.auth correctly)
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Aliases so both admin and superadmin contexts import from one place
export const adminAuth = auth;
export const superAdminAuth = auth;
