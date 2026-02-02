/**
 * Location Service - Handles GPS coordinates and reverse geocoding
 * Used for capturing employee location during check-in/check-out
 */

import {Platform, PermissionsAndroid, Linking} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface AddressData {
  formattedAddress: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FullLocationData extends LocationData {
  address?: AddressData;
}

export type LocationError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'GPS_DISABLED'
  | 'UNKNOWN';

export interface LocationErrorResult {
  error: LocationError;
  message: string;
}

class LocationService {
  private watchId: number | null = null;

  /**
   * Check if location services are enabled on the device
   */
  async isLocationEnabled(): Promise<boolean> {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        error => {
          // Error code 2 means position unavailable (GPS disabled)
          if (error.code === 2) {
            resolve(false);
          } else {
            // Other errors (permission denied, timeout) - location might be enabled
            resolve(true);
          }
        },
        {enableHighAccuracy: false, timeout: 5000, maximumAge: 60000},
      );
    });
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location for attendance check-in/check-out.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[LocationService] Permission request error:', err);
        return false;
      }
    }

    // iOS - request authorization
    return new Promise(resolve => {
      Geolocation.requestAuthorization();
      // Give iOS time to process the authorization request
      setTimeout(() => resolve(true), 1000);
    });
  }

  /**
   * Check if location permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted;
    }
    // iOS - we can't directly check, assume true if we've requested before
    return true;
  }

  /**
   * Get current location coordinates
   */
  async getCurrentLocation(options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }): Promise<LocationData> {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    };
    const opts = {...defaultOptions, ...options};

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        error => {
          console.error('[LocationService] Error getting location:', error);

          // Try again with lower accuracy if high accuracy fails
          if (opts.enableHighAccuracy) {
            Geolocation.getCurrentPosition(
              position => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  timestamp: position.timestamp,
                });
              },
              err => {
                reject(this.mapGeolocationError(err));
              },
              {...opts, enableHighAccuracy: false, timeout: 30000},
            );
          } else {
            reject(this.mapGeolocationError(error));
          }
        },
        opts,
      );
    });
  }

  /**
   * Reverse geocode coordinates to get address
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<AddressData | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HRMMobileApp/1.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[LocationService] Geocoding request failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data || data.error) {
        console.warn('[LocationService] Geocoding returned error:', data?.error);
        return null;
      }

      const address = data.address || {};

      return {
        formattedAddress: data.display_name || '',
        street: address.road || address.street || address.pedestrian || '',
        city:
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          '',
        state: address.state || address.region || '',
        postalCode: address.postcode || '',
        country: address.country || '',
      };
    } catch (error) {
      console.error('[LocationService] Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get full location with coordinates and address
   */
  async getFullLocation(): Promise<FullLocationData> {
    // First get coordinates
    const location = await this.getCurrentLocation();

    // Then try to get address (don't fail if geocoding fails)
    let address: AddressData | null = null;
    try {
      address = await this.reverseGeocode(location.latitude, location.longitude);
    } catch (error) {
      console.warn('[LocationService] Geocoding failed, continuing without address:', error);
    }

    return {
      ...location,
      address: address || undefined,
    };
  }

  /**
   * Open device location settings
   */
  openLocationSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * Map geolocation error to our error types
   */
  private mapGeolocationError(error: {
    code: number;
    message: string;
  }): LocationErrorResult {
    switch (error.code) {
      case 1:
        return {
          error: 'PERMISSION_DENIED',
          message: 'Location permission denied. Please enable in settings.',
        };
      case 2:
        return {
          error: 'GPS_DISABLED',
          message: 'Location services are disabled. Please enable GPS.',
        };
      case 3:
        return {
          error: 'TIMEOUT',
          message: 'Location request timed out. Please try again.',
        };
      default:
        return {
          error: 'UNKNOWN',
          message: error.message || 'Unable to get location.',
        };
    }
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(latitude: number, longitude: number): string {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(6)}°${latDir}, ${Math.abs(longitude).toFixed(6)}°${lonDir}`;
  }
}

// Export singleton instance
export const locationService = new LocationService();
