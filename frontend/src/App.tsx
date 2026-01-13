import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/useAppDispatch';
import { checkAuth } from './features/auth/authSlice';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Landing Page
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import Departments from './pages/Departments';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import LeaveTypes from './pages/LeaveTypes';
import LeaveBalances from './pages/LeaveBalances';
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
import Payroll from './pages/Payroll';
import SalaryStructures from './pages/SalaryStructures';
import OvertimeConfig from './pages/OvertimeConfig';
import OvertimeManagement from './pages/OvertimeManagement';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import Onboarding from './pages/Onboarding';
import Benefits from './pages/Benefits';
import Expenses from './pages/Expenses';
import Timesheets from './pages/Timesheets';
import Compliance from './pages/Compliance';
import Engagement from './pages/Engagement';
import Assets from './pages/Assets';
import Grievances from './pages/Grievances';
import Workforce from './pages/Workforce';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import RoleManagement from './pages/admin/RoleManagement';

// Super Admin Pages
import SuperAdminLogin from './pages/super-admin/SuperAdminLogin';
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import SuperAdminProtectedRoute from './components/super-admin/SuperAdminProtectedRoute';
import PlatformDashboard from './pages/super-admin/PlatformDashboard';
import TenantManagement from './pages/super-admin/TenantManagement';
import TenantDetails from './pages/super-admin/TenantDetails';
import PlatformAnalytics from './pages/super-admin/PlatformAnalytics';
import PlatformNotifications from './pages/super-admin/PlatformNotifications';
import SystemSettings from './pages/super-admin/SystemSettings';
import SystemHealth from './pages/super-admin/SystemHealth';
import BillingDashboard from './pages/super-admin/BillingDashboard';

// Tenant Billing
import BillingSettings from './pages/tenant/BillingSettings';

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
      {/* Public Landing Page */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />

      {/* Public Routes */}
      <Route
        path="/login"
        element={<Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - accessible to all authenticated users */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Employee Management - requires employees:read */}
        <Route path="/employees" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Employees />
          </ProtectedRoute>
        } />
        <Route path="/employees/new" element={
          <ProtectedRoute requiredPermissions={['employees:write']}>
            <EmployeeForm />
          </ProtectedRoute>
        } />
        <Route path="/employees/:id" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <EmployeeForm />
          </ProtectedRoute>
        } />
        <Route path="/departments" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Departments />
          </ProtectedRoute>
        } />
        <Route path="/shifts" element={
          <ProtectedRoute requiredPermissions={['attendance:write', 'employees:write']}>
            <Shifts />
          </ProtectedRoute>
        } />
        <Route path="/org-chart" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <OrgChart />
          </ProtectedRoute>
        } />

        {/* Attendance - requires attendance permissions */}
        <Route path="/attendance" element={
          <ProtectedRoute requiredPermissions={['attendance:read', 'attendance:checkin']}>
            <Attendance />
          </ProtectedRoute>
        } />
        <Route path="/timesheets" element={
          <ProtectedRoute requiredPermissions={['attendance:read']}>
            <Timesheets />
          </ProtectedRoute>
        } />

        {/* Leave Management */}
        <Route path="/leaves" element={
          <ProtectedRoute requiredPermissions={['leaves:read']}>
            <Leaves />
          </ProtectedRoute>
        } />
        <Route path="/leave-types" element={
          <ProtectedRoute requiredPermissions={['leaves:write', 'leaves:approve']}>
            <LeaveTypes />
          </ProtectedRoute>
        } />
        <Route path="/leave-balances" element={
          <ProtectedRoute requiredPermissions={['leaves:approve', 'employees:read']}>
            <LeaveBalances />
          </ProtectedRoute>
        } />

        {/* Payroll */}
        <Route path="/payroll" element={
          <ProtectedRoute requiredPermissions={['payroll:read']}>
            <Payroll />
          </ProtectedRoute>
        } />
        <Route path="/payroll/salary-structures" element={
          <ProtectedRoute requiredPermissions={['payroll:write']}>
            <SalaryStructures />
          </ProtectedRoute>
        } />
        <Route path="/payroll/overtime-config" element={
          <ProtectedRoute requiredPermissions={['payroll:write']}>
            <OvertimeConfig />
          </ProtectedRoute>
        } />
        <Route path="/payroll/overtime" element={
          <ProtectedRoute requiredPermissions={['payroll:read']}>
            <OvertimeManagement />
          </ProtectedRoute>
        } />
        <Route path="/benefits" element={
          <ProtectedRoute requiredPermissions={['payroll:read', 'employees:read']}>
            <Benefits />
          </ProtectedRoute>
        } />
        <Route path="/expenses" element={
          <ProtectedRoute requiredPermissions={['payroll:read']}>
            <Expenses />
          </ProtectedRoute>
        } />

        {/* Recruitment */}
        <Route path="/recruitment" element={
          <ProtectedRoute requiredPermissions={['recruitment:read']}>
            <Recruitment />
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute requiredPermissions={['employees:write', 'recruitment:write']}>
            <Onboarding />
          </ProtectedRoute>
        } />

        {/* HR Features requiring employees:read */}
        <Route path="/performance" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Performance />
          </ProtectedRoute>
        } />
        <Route path="/training" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Training />
          </ProtectedRoute>
        } />
        <Route path="/engagement" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Engagement />
          </ProtectedRoute>
        } />
        <Route path="/assets" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Assets />
          </ProtectedRoute>
        } />
        <Route path="/grievances" element={
          <ProtectedRoute requiredPermissions={['employees:read']}>
            <Grievances />
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute requiredPermissions={['employees:read', 'reports:read']}>
            <Compliance />
          </ProtectedRoute>
        } />

        {/* Documents - employees can access their own */}
        <Route path="/documents" element={
          <ProtectedRoute requiredPermissions={['profile:read']}>
            <Documents />
          </ProtectedRoute>
        } />

        {/* Reports & Analytics */}
        <Route path="/reports" element={
          <ProtectedRoute requiredPermissions={['reports:read']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute requiredPermissions={['reports:read']}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/workforce" element={
          <ProtectedRoute requiredPermissions={['reports:read', 'employees:read']}>
            <Workforce />
          </ProtectedRoute>
        } />

        {/* Profile - accessible to all authenticated users */}
        <Route path="/profile" element={<Profile />} />

        {/* Chat - accessible to all */}
        <Route path="/chat" element={<Chat />} />

        {/* Settings - requires settings permissions */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredPermissions={['settings:read', 'settings:write']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute requiredPermissions={['settings:write']}>
              <BillingSettings />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes - requires users permissions */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredPermissions={['users:read', 'users:write']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredPermissions={['users:read', 'users:write']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requiredPermissions={['users:read']}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute requiredPermissions={['users:write']}>
              <RoleManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Super Admin Routes */}
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />
      <Route
        path="/super-admin"
        element={
          <SuperAdminProtectedRoute>
            <SuperAdminLayout />
          </SuperAdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="dashboard" element={<PlatformDashboard />} />
        <Route path="tenants" element={<TenantManagement />} />
        <Route path="tenants/:id" element={<TenantDetails />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="billing" element={<BillingDashboard />} />
        <Route path="notifications" element={<PlatformNotifications />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="health" element={<SystemHealth />} />
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
