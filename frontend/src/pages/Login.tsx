import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
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
      // Redirect to the original page they were trying to access, or dashboard as fallback
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

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
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-purple-950 to-secondary-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-hrzi-cyan/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-hrzi-purple/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-hrzi-magenta/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-md">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-500/20 p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-hrzi-cyan via-hrzi-blue to-hrzi-purple rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="text-white font-bold text-2xl">H</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-hrzi-magenta rounded-full animate-pulse"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-secondary-900">Welcome Back</h1>
            <p className="text-secondary-500 mt-2">Sign in to your <span className="bg-gradient-to-r from-hrzi-blue to-hrzi-purple bg-clip-text text-transparent font-semibold">HRZIO</span> account</p>
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
                className="w-full bg-gradient-to-r from-hrzi-blue via-hrzi-purple to-hrzi-magenta hover:shadow-lg hover:shadow-purple-500/30 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50"
              >
                Continue
              </button>

              <div className="text-center">
                <Link to="/register" className="text-hrzi-purple hover:text-hrzi-magenta text-sm font-medium transition-colors">
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
                  className="w-full bg-gradient-to-r from-hrzi-blue via-hrzi-purple to-hrzi-magenta hover:shadow-lg hover:shadow-purple-500/30 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
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
            <Link to="/register" className="text-hrzi-purple hover:text-hrzi-magenta font-semibold transition-colors">
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
