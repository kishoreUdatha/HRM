import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

interface SuperAdminProtectedRouteProps {
  children: React.ReactNode;
}

const SuperAdminProtectedRoute: React.FC<SuperAdminProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('superAdminAccessToken');
      const role = localStorage.getItem('superAdminRole');

      if (!token || role !== 'super_admin') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Verify token is still valid
        const response = await api.get('/auth/super-admin/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success && response.data.data?.role === 'super_admin') {
          setIsAuthorized(true);
        } else {
          localStorage.removeItem('superAdminAccessToken');
          localStorage.removeItem('superAdminRefreshToken');
          localStorage.removeItem('superAdminRole');
          localStorage.removeItem('superAdminUser');
          setIsAuthorized(false);
        }
      } catch (error) {
        localStorage.removeItem('superAdminAccessToken');
        localStorage.removeItem('superAdminRefreshToken');
        localStorage.removeItem('superAdminRole');
        localStorage.removeItem('superAdminUser');
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SuperAdminProtectedRoute;
