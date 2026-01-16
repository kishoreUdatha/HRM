import React, { useState, useRef, useEffect } from 'react';
import { HiCog, HiOfficeBuilding, HiUsers, HiShieldCheck, HiBell, HiColorSwatch, HiPhotograph, HiUpload, HiTrash, HiLocationMarker, HiCreditCard } from 'react-icons/hi';
import { useAppSelector, useAppDispatch } from '../hooks/useAppDispatch';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { setTenant } from '../features/auth/authSlice';
import GeofencingSettings from '../components/settings/GeofencingSettings';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tenant } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Branding state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [branding, setBranding] = useState({
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
  });

  // Billing info state
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    companyName: '',
    email: '',
    address: '',
    taxId: '',
    phone: '',
  });

  // Load current branding and billing from tenant
  useEffect(() => {
    if (tenant) {
      setBranding({
        address: (tenant as any).address || '',
        city: (tenant as any).city || '',
        state: (tenant as any).state || '',
        country: (tenant as any).country || '',
        pincode: (tenant as any).pincode || '',
      });
      setBillingInfo({
        companyName: (tenant as any).billing?.companyName || '',
        email: (tenant as any).billing?.email || '',
        address: (tenant as any).billing?.address || '',
        taxId: (tenant as any).billing?.taxId || '',
        phone: (tenant as any).billing?.phone || '',
      });
      if ((tenant as any).logo) {
        // Build full URL for logo preview
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
        setLogoPreview(`${baseUrl}${(tenant as any).logo}`);
      }
    }
  }, [tenant]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo must be less than 2MB');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error('Only PNG and JPG files are allowed');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await api.post('/tenants/current/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast.success('Logo uploaded successfully');
        setLogoFile(null);
        // Refresh tenant data
        const tenantResponse = await api.get('/tenants/current');
        if (tenantResponse.data.success) {
          dispatch(setTenant(tenantResponse.data.data));
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      const response = await api.delete('/tenants/current/logo');
      if (response.data.success) {
        toast.success('Logo deleted');
        setLogoPreview(null);
        setLogoFile(null);
        // Refresh tenant data
        const tenantResponse = await api.get('/tenants/current');
        if (tenantResponse.data.success) {
          dispatch(setTenant(tenantResponse.data.data));
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete logo');
    }
  };

  const handleBrandingSave = async () => {
    setIsSavingBranding(true);
    try {
      const response = await api.put('/tenants/current/branding', branding);
      if (response.data.success) {
        toast.success('Branding updated successfully');
        // Refresh tenant data
        const tenantResponse = await api.get('/tenants/current');
        if (tenantResponse.data.success) {
          dispatch(setTenant(tenantResponse.data.data));
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update branding');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleBillingSave = async () => {
    setIsSavingBilling(true);
    try {
      const response = await api.put('/tenants/current/billing', billingInfo);
      if (response.data.success) {
        toast.success('Billing info updated successfully');
        // Refresh tenant data
        const tenantResponse = await api.get('/tenants/current');
        if (tenantResponse.data.success) {
          dispatch(setTenant(tenantResponse.data.data));
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update billing info');
    } finally {
      setIsSavingBilling(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: HiCog },
    { id: 'billing-info', name: 'Billing Info', icon: HiCreditCard },
    { id: 'branding', name: 'Branding', icon: HiPhotograph },
    { id: 'geofencing', name: 'Geo-Fencing', icon: HiLocationMarker },
    { id: 'organization', name: 'Organization', icon: HiOfficeBuilding },
    { id: 'users', name: 'Users & Roles', icon: HiUsers },
    { id: 'security', name: 'Security', icon: HiShieldCheck },
    { id: 'notifications', name: 'Notifications', icon: HiBell },
    { id: 'appearance', name: 'Appearance', icon: HiColorSwatch },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-500">Manage your organization's settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border border-secondary-200 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">General Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    defaultValue={tenant?.name}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Organization Slug
                  </label>
                  <input
                    type="text"
                    defaultValue={tenant?.slug}
                    disabled
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg bg-secondary-50 text-secondary-500"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Slug cannot be changed after creation
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Timezone
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                    <option>Asia/Kolkata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Date Format
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing-info' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Billing Information</h2>
              <p className="text-secondary-500 text-sm mb-6">
                Configure your billing details. The billing email will be used for payment receipts and invoices.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Billing Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={billingInfo.email}
                    onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                    placeholder="billing@company.com"
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Payment receipts and invoices will be sent to this email
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={billingInfo.companyName}
                    onChange={(e) => setBillingInfo({ ...billingInfo, companyName: e.target.value })}
                    placeholder="Company Legal Name"
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Billing Address
                  </label>
                  <textarea
                    value={billingInfo.address}
                    onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
                    placeholder="Full billing address"
                    rows={3}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Tax ID / GST Number
                    </label>
                    <input
                      type="text"
                      value={billingInfo.taxId}
                      onChange={(e) => setBillingInfo({ ...billingInfo, taxId: e.target.value })}
                      placeholder="GST/VAT/Tax ID"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={billingInfo.phone}
                      onChange={(e) => setBillingInfo({ ...billingInfo, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleBillingSave}
                  disabled={isSavingBilling}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSavingBilling ? 'Saving...' : 'Save Billing Info'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Company Branding</h2>
              <p className="text-secondary-500 text-sm mb-6">
                Configure your company logo and address. This information will appear on employee payslips.
              </p>

              {/* Logo Upload Section */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-secondary-700 mb-3">
                  Company Logo
                </label>
                <div className="flex items-start gap-6">
                  {/* Logo Preview */}
                  <div className="w-32 h-32 border-2 border-dashed border-secondary-300 rounded-lg flex items-center justify-center bg-secondary-50 overflow-hidden">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <HiPhotograph className="w-12 h-12 text-secondary-400" />
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors flex items-center gap-2"
                      >
                        <HiUpload className="w-4 h-4" />
                        Select Logo
                      </button>
                      {logoFile && (
                        <button
                          onClick={handleLogoUpload}
                          disabled={isUploadingLogo}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {isUploadingLogo ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                      {logoPreview && !logoFile && (
                        <button
                          onClick={handleLogoDelete}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                        >
                          <HiTrash className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-secondary-500">
                      Recommended: PNG or JPG, max 2MB, at least 200x80 pixels
                    </p>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t border-secondary-200 pt-6">
                <label className="block text-sm font-medium text-secondary-700 mb-4">
                  Company Address
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-secondary-500 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={branding.address}
                      onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                      placeholder="123 Main Street, Building A"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">City</label>
                    <input
                      type="text"
                      value={branding.city}
                      onChange={(e) => setBranding({ ...branding, city: e.target.value })}
                      placeholder="Hyderabad"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">State</label>
                    <input
                      type="text"
                      value={branding.state}
                      onChange={(e) => setBranding({ ...branding, state: e.target.value })}
                      placeholder="Telangana"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Country</label>
                    <input
                      type="text"
                      value={branding.country}
                      onChange={(e) => setBranding({ ...branding, country: e.target.value })}
                      placeholder="India"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={branding.pincode}
                      onChange={(e) => setBranding({ ...branding, pincode: e.target.value })}
                      placeholder="500001"
                      className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleBrandingSave}
                  disabled={isSavingBranding}
                  className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSavingBranding ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'geofencing' && <GeofencingSettings />}

          {activeTab === 'organization' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Organization Details
              </h2>
              <div className="space-y-6">
                <div className="p-4 bg-secondary-50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-secondary-900">Current Plan</h3>
                      <p className="text-sm text-secondary-500">
                        {tenant?.subscription?.plan || 'Free'} Plan
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
                      Upgrade Plan
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-secondary-500">Max Employees</p>
                      <p className="font-medium text-secondary-900">
                        {tenant?.subscription?.maxEmployees || 10}
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary-500">Features</p>
                      <p className="font-medium text-secondary-900">
                        {tenant?.subscription?.features?.length || 0} enabled
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Industry
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>Technology</option>
                    <option>Healthcare</option>
                    <option>Finance</option>
                    <option>Education</option>
                    <option>Manufacturing</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Company Size
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>

                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Security Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-secondary-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-secondary-500">
                      Require 2FA for all users in the organization
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-secondary-900">Session Timeout</h3>
                    <p className="text-sm text-secondary-500">
                      Automatically log out inactive users
                    </p>
                  </div>
                  <select className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>Never</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-secondary-900">Password Policy</h3>
                    <p className="text-sm text-secondary-500">
                      Require strong passwords for all users
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Email Notifications', description: 'Receive email updates' },
                  { label: 'Leave Requests', description: 'Notify when leave is requested' },
                  { label: 'New Employees', description: 'Notify when employees join' },
                  { label: 'Attendance Alerts', description: 'Late arrival notifications' },
                  { label: 'Payroll Updates', description: 'Monthly payroll notifications' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-secondary-900">{item.label}</h3>
                      <p className="text-sm text-secondary-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'users' || activeTab === 'appearance') && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
              <HiCog className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Coming Soon</h3>
              <p className="text-secondary-500">
                This feature is currently under development.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
