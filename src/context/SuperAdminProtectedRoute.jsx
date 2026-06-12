import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const SuperAdminProtectedRoute = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Ensure only superadmins can access this
  if (userData?.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default SuperAdminProtectedRoute;
