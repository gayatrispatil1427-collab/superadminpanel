import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Employees from './pages/employees/Employees';
import Customers from './pages/customers/Customers';
import Products from './pages/products/Products';
import ProductDetails from './pages/products/ProductDetails';
import Settings from './pages/settings/Settings';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Inventory from './pages/inventory/Inventory';
import Reports from './pages/reports/Reports';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import SuperAdminProtectedRoute from './context/SuperAdminProtectedRoute';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminAdmins from './pages/superadmin/SuperAdminAdmins';
import SuperAdminProducts from './pages/superadmin/SuperAdminProducts';
import SuperAdminStages from './pages/superadmin/SuperAdminStages';
import SuperAdminRoles from './pages/superadmin/SuperAdminRoles';
import SuperAdminEmployees from './pages/superadmin/SuperAdminEmployees';

function App() {
  useEffect(() => {
    // Demo seed removed
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetails />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports"   element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Super Admin Routes */}
          <Route
            path="/superadmin"
            element={
              <SuperAdminProtectedRoute>
                <SuperAdminLayout />
              </SuperAdminProtectedRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="admins" element={<SuperAdminAdmins />} />
            <Route path="admins/add" element={<SuperAdminAdmins />} />
            <Route path="products" element={<SuperAdminProducts />} />
            <Route path="products/add" element={<SuperAdminProducts />} />
            <Route path="stages" element={<SuperAdminStages />} />
            <Route path="stages/add" element={<SuperAdminStages />} />
            <Route path="roles" element={<SuperAdminRoles />} />
            <Route path="roles/add" element={<SuperAdminRoles />} />
            <Route path="employees" element={<SuperAdminEmployees />} />
            <Route path="employees/add" element={<SuperAdminEmployees />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
