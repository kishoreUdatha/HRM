import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { HiMail, HiLockClosed, HiUser, HiOfficeBuilding, HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { registerOrganization, clearError } from '../features/auth/authSlice';
import { authService } from '../services/authService';

const registerSchema = z
  .object({
    organizationName: z.string().min(2, 'Organization name is required'),
    slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
    adminFirstName: z.string().min(2, 'First name is required'),
    adminLastName: z.string().min(2, 'Last name is required'),
    adminEmail: z.string().email('Invalid email address'),
    adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, error } = useAppSelector((state) => state.auth);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const organizationName = watch('organizationName');
  const slug = watch('slug');

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationName && !slug) {
      const generatedSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', generatedSlug);
    }
  }, [organizationName, slug, setValue]);

  // Check slug availability with debounce
  useEffect(() => {
    if (slug && slug.length >= 3) {
      const timer = setTimeout(async () => {
        setCheckingSlug(true);
        try {
          const available = await authService.checkSlugAvailability(slug);
          setSlugAvailable(available);
        } catch {
          setSlugAvailable(null);
        } finally {
          setCheckingSlug(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setSlugAvailable(null);
    }
  }, [slug]);

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

  const onSubmit = async (data: RegisterFormData) => {
    if (slugAvailable === false) {
      toast.error('Please choose a different organization slug');
      return;
    }

    const { confirmPassword, ...registerData } = data;
    void confirmPassword;
    dispatch(registerOrganization(registerData));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">Create Your Organization</h1>
            <p className="text-secondary-500 mt-2">Start your 14-day free trial</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Organization Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Organization Details</h3>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Organization Name *</label>
                <div className="relative">
                  <HiOfficeBuilding className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Acme Corporation"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.organizationName ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    {...register('organizationName')}
                  />
                </div>
                {errors.organizationName && <p className="text-red-500 text-sm mt-1">{errors.organizationName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Organization Slug *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">https://</span>
                  <input
                    type="text"
                    placeholder="acme"
                    className={`w-full pl-16 pr-24 py-2.5 rounded-lg border ${errors.slug ? 'border-red-500' : slugAvailable === false ? 'border-red-500' : slugAvailable === true ? 'border-green-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    {...register('slug')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">.hrm.com</span>
                  {checkingSlug && (
                    <span className="absolute right-24 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-4 w-4 text-primary-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  )}
                  {!checkingSlug && slugAvailable === true && (
                    <HiCheckCircle className="absolute right-24 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                  {!checkingSlug && slugAvailable === false && (
                    <HiXCircle className="absolute right-24 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                  )}
                </div>
                {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
                {slugAvailable === false && <p className="text-red-500 text-sm mt-1">This slug is already taken</p>}
              </div>
            </div>

            {/* Admin Info */}
            <div className="space-y-4 pt-4 border-t border-secondary-200">
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Admin Account</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">First Name *</label>
                  <div className="relative">
                    <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                    <input
                      type="text"
                      placeholder="John"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.adminFirstName ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                      {...register('adminFirstName')}
                    />
                  </div>
                  {errors.adminFirstName && <p className="text-red-500 text-sm mt-1">{errors.adminFirstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.adminLastName ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    {...register('adminLastName')}
                  />
                  {errors.adminLastName && <p className="text-red-500 text-sm mt-1">{errors.adminLastName.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Work Email *</label>
                <div className="relative">
                  <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="email"
                    placeholder="john@acme.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.adminEmail ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    {...register('adminEmail')}
                  />
                </div>
                {errors.adminEmail && <p className="text-red-500 text-sm mt-1">{errors.adminEmail.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Password *</label>
                <div className="relative">
                  <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="password"
                    placeholder="Create a password"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.adminPassword ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    {...register('adminPassword')}
                  />
                </div>
                {errors.adminPassword && <p className="text-red-500 text-sm mt-1">{errors.adminPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.confirmPassword ? 'border-red-500' : 'border-secondary-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || slugAvailable === false}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Create Organization'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-secondary-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
