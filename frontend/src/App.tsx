import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/useAppDispatch';
import { checkAuth } from './features/auth/authSlice';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import Departments from './pages/Departments';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Recruitment from './pages/Recruitment';
import Performance from './pages/Performance';
import Training from './pages/Training';
import Documents from './pages/Documents';
import OrgChart from './pages/OrgChart';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Shifts from './pages/Shifts';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import RoleManagement from './pages/admin/RoleManagement';

// Auth check wrapper
const AuthCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/new" element={<EmployeeForm />} />
        <Route path="/employees/:id" element={<EmployeeForm />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/recruitment" element={<Recruitment />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/training" element={<Training />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/org-chart" element={<OrgChart />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tenant_admin']}>
              <RoleManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <AuthCheck>
          <AppRoutes />
        </AuthCheck>
      </Router>
    </Provider>
  );
};

export default App;
