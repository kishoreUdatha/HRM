import React, { useState, useEffect } from 'react';
import { HiLocationMarker, HiPlus, HiPencil, HiTrash, HiExclamationCircle } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import LocationPickerModal from './LocationPickerModal';

interface GeofenceLocation {
  _id?: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  radius: number;
}

interface GeofencingConfig {
  enabled: boolean;
  locations: GeofenceLocation[];
  defaultRadius: number;
  strictMode: boolean;
}

const GeofencingSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GeofencingConfig>({
    enabled: false,
    locations: [],
    defaultRadius: 100,
    strictMode: true,
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<GeofenceLocation | null>(null);

  useEffect(() => {
    fetchGeofencing();
  }, []);

  const fetchGeofencing = async () => {
    try {
      const response = await api.get('/tenants/current/geofencing');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setConfig({
          enabled: data.enabled || false,
          locations: Array.isArray(data.locations) ? data.locations.filter((loc: any) => loc && loc.name) : [],
          defaultRadius: data.defaultRadius || 100,
          strictMode: data.strictMode !== false,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch geo-fencing config:', error);
      toast.error('Failed to load geo-fencing settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setSaving(true);
    try {
      const response = await api.put('/tenants/current/geofencing', {
        enabled,
        defaultRadius: config.defaultRadius,
        strictMode: config.strictMode,
      });
      if (response.data.success) {
        setConfig({ ...config, enabled });
        toast.success(enabled ? 'Geo-fencing enabled' : 'Geo-fencing disabled');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async () => {
    setSaving(true);
    try {
      const response = await api.put('/tenants/current/geofencing', {
        enabled: config.enabled,
        defaultRadius: config.defaultRadius,
        strictMode: config.strictMode,
      });
      if (response.data.success) {
        toast.success('Settings saved');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setShowLocationModal(true);
  };

  const handleEditLocation = (location: GeofenceLocation) => {
    setEditingLocation(location);
    setShowLocationModal(true);
  };

  const handleSaveLocation = async (location: GeofenceLocation) => {
    setSaving(true);
    try {
      if (editingLocation?._id) {
        // Update existing location
        const response = await api.put(`/tenants/current/geofencing/locations/${editingLocation._id}`, location);
        if (response.data.success) {
          // API returns full config with all locations
          const responseData = response.data.data;
          if (responseData && Array.isArray(responseData.locations)) {
            setConfig({
              ...config,
              enabled: responseData.enabled ?? config.enabled,
              defaultRadius: responseData.defaultRadius ?? config.defaultRadius,
              strictMode: responseData.strictMode ?? config.strictMode,
              locations: responseData.locations,
            });
          } else {
            // Fallback to manual update if API doesn't return full config
            setConfig({
              ...config,
              locations: config.locations.map(l =>
                l._id === editingLocation._id ? { ...location, _id: editingLocation._id } : l
              ),
            });
          }
          toast.success('Location updated');
        }
      } else {
        // Add new location
        const response = await api.post('/tenants/current/geofencing/locations', location);
        if (response.data.success) {
          // API returns full config with all locations, not just the new one
          const responseData = response.data.data;
          setConfig({
            ...config,
            enabled: responseData.enabled ?? config.enabled,
            defaultRadius: responseData.defaultRadius ?? config.defaultRadius,
            strictMode: responseData.strictMode ?? config.strictMode,
            locations: Array.isArray(responseData.locations) ? responseData.locations : [...config.locations, location],
          });
          toast.success('Location added');
        }
      }
      setShowLocationModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    setSaving(true);
    try {
      const response = await api.delete(`/tenants/current/geofencing/locations/${locationId}`);
      if (response.data.success) {
        setConfig({
          ...config,
          locations: config.locations.filter(l => l._id !== locationId),
        });
        toast.success('Location deleted');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete location');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary-200 rounded w-1/3"></div>
          <div className="h-4 bg-secondary-200 rounded w-2/3"></div>
          <div className="h-10 bg-secondary-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
      <h2 className="text-lg font-semibold text-secondary-900 mb-2">Geo-Fencing Settings</h2>
      <p className="text-secondary-500 text-sm mb-6">
        Configure location-based attendance validation. When enabled, employees can only check in from their mobile app when they are within the configured radius of an office location.
      </p>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg mb-6">
        <div>
          <h3 className="font-medium text-secondary-900">Enable Geo-Fencing</h3>
          <p className="text-sm text-secondary-500">
            Require employees to be within office location to check in
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            disabled={saving}
          />
          <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Default Radius (meters)
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                value={config.defaultRadius}
                onChange={(e) => setConfig({ ...config, defaultRadius: parseInt(e.target.value) || 100 })}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Applied to locations without a custom radius
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Enforcement Mode
              </label>
              <div className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-secondary-900">Strict Mode</p>
                  <p className="text-xs text-secondary-500">Block check-in if outside geo-fence</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.strictMode}
                    onChange={(e) => setConfig({ ...config, strictMode: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                {config.strictMode
                  ? 'Employees must be within geo-fence to check in'
                  : 'Employees can check in anywhere with a warning'
                }
              </p>
            </div>
          </div>

          <button
            onClick={handleUpdateSettings}
            disabled={saving}
            className="mb-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {/* Office Locations */}
          <div className="border-t border-secondary-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-md font-semibold text-secondary-900">Office Locations</h3>
                <p className="text-sm text-secondary-500">
                  Add office locations where employees can check in
                </p>
              </div>
              <button
                onClick={handleAddLocation}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <HiPlus className="w-4 h-4" />
                Add Location
              </button>
            </div>

            {!config.locations || config.locations.filter(loc => loc && loc.name).length === 0 ? (
              <div className="text-center py-8 bg-secondary-50 rounded-lg">
                <HiLocationMarker className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                <p className="text-secondary-600 font-medium">No locations configured</p>
                <p className="text-secondary-500 text-sm">
                  Add at least one office location for geo-fencing to work
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {config.locations.filter(loc => loc && loc.name).map((location) => (
                  <div
                    key={location._id || `loc-${location.latitude}-${location.longitude}`}
                    className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <HiLocationMarker className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-secondary-900">{location.name}</h4>
                        {location.address && (
                          <p className="text-sm text-secondary-500">{location.address}</p>
                        )}
                        <p className="text-xs text-secondary-400 mt-1">
                          {location.latitude?.toFixed(6) || 0}, {location.longitude?.toFixed(6) || 0} |
                          Radius: {location.radius || 100}m
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg"
                        title="Edit"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => location._id && handleDeleteLocation(location._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {config.enabled && (!config.locations || config.locations.filter(loc => loc && loc.name).length === 0) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <HiExclamationCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Geo-fencing is enabled but no locations are configured. Employees will not be able to check in until at least one location is added.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Location Picker Modal */}
      {showLocationModal && (
        <LocationPickerModal
          location={editingLocation}
          defaultRadius={config.defaultRadius}
          onSave={handleSaveLocation}
          onClose={() => setShowLocationModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
};

export default GeofencingSettings;
