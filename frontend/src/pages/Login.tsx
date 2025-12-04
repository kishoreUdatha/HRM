import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HiMail, HiLockClosed, HiOfficeBuilding } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { login, clearError, getTenantBySlug } from '../features/auth/authSlice';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, isAuthenticated, error, tenant } = useAppSelector((state) => state.auth);
  const [tenantSlug, setTenantSlug] = useState(searchParams.get('org') || '');
  const [tenantVerified, setTenantVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Verify tenant when slug is entered
  const handleVerifyTenant = async () => {
    if (tenantSlug.trim()) {
      try {
        await dispatch(getTenantBySlug(tenantSlug)).unwrap();
        setTenantVerified(true);
        toast.success('Organization found!');
      } catch {
        toast.error('Organization not found');
        setTenantVerified(false);
      }
    }
  };

  const onSubmit = (data: LoginFormData) => {
    if (!tenant) {
      toast.error('Please verify your organization first');
      return;
    }
    dispatch(login({ ...data, tenantId: tenant._id }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">Welcome Back</h1>
            <p className="text-secondary-500 mt-2">Sign in to your HRM account</p>
          </div>

          {/* Tenant Selection */}
          {!tenantVerified ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Organization Slug
                </label>
                <div className="relative">
                  <HiOfficeBuilding className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                    placeholder="your-company"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <p className="text-xs text-secondary-500 mt-1">
                  Enter your organization's unique identifier
                </p>
              </div>

              <button
                onClick={handleVerifyTenant}
                disabled={!tenantSlug.trim()}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Continue
              </button>

              <div className="text-center">
                <Link to="/register" className="text-primary-600 hover:text-primary-700 text-sm">
                  Create a new organization
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Tenant Info */}
              {tenant && (
                <div className="mb-6 p-4 bg-primary-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-secondary-900">{tenant.name}</p>
                    <p className="text-sm text-secondary-500">{tenant.slug}.hrm.com</p>
                  </div>
                  <button
                    onClick={() => {
                      setTenantVerified(false);
                      setTenantSlug('');
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                  <div className="relative">
                    <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.email ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Password</label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                    <input
                      type="password"
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.password ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                      {...register('password')}
                    />
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Register Link */}
          <p className="mt-6 text-center text-secondary-600">
            Don't have an organization?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
