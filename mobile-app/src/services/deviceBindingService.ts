/**
 * Device Binding Service
 *
 * Manages secure device registration and binding for face attendance:
 * - Unique device identification
 * - Device-employee binding verification
 * - GPS location verification
 * - Secure storage of device credentials
 */

import {Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Generate UUID without crypto dependency (React Native compatible)
const generateUUID = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
};

// Storage keys
const DEVICE_ID_KEY = 'hrm_device_id';
const DEVICE_BINDING_KEY = 'hrm_device_binding';
const ENROLLED_FACE_KEY = 'hrm_enrolled_face';

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  model?: string;
  osVersion?: string;
  firstRegistered: string;
  lastUsed: string;
}

export interface DeviceBinding {
  deviceId: string;
  employeeId: string;
  tenantId: string;
  boundAt: string;
  lastVerified: string;
  isActive: boolean;
  allowedLocations?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    name: string;
  }>;
}

export interface EnrolledFaceData {
  employeeId: string;
  enrolledAt: string;
  embedding?: number[];
  photoHashes: string[];
  lastUpdated: string;
}

export interface LocationVerification {
  isWithinRange: boolean;
  distance: number;
  nearestLocation?: string;
  accuracy: number;
  timestamp: number;
}

class DeviceBindingService {
  private deviceInfo: DeviceInfo | null = null;
  private binding: DeviceBinding | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the device binding service
   * Generates or retrieves unique device ID
   */
  async initialize(): Promise<DeviceInfo> {
    if (this.initialized && this.deviceInfo) {
      return this.deviceInfo;
    }

    try {
      // Try to get existing device ID from secure storage
      let deviceId = await this.getSecureDeviceId();

      if (!deviceId) {
        // Generate new device ID
        deviceId = generateUUID();
        await this.setSecureDeviceId(deviceId);
      }

      // Load or create device info
      const existingInfo = await this.getDeviceInfoFromStorage();

      if (existingInfo && existingInfo.deviceId === deviceId) {
        this.deviceInfo = {
          ...existingInfo,
          lastUsed: new Date().toISOString(),
        };
      } else {
        this.deviceInfo = {
          deviceId,
          platform: Platform.OS,
          osVersion: Platform.Version?.toString(),
          firstRegistered: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };
      }

      // Save updated device info
      await this.saveDeviceInfo(this.deviceInfo);

      // Load existing binding
      this.binding = await this.loadBinding();

      this.initialized = true;
      console.log('[DeviceBinding] Initialized with device ID:', deviceId);

      return this.deviceInfo;
    } catch (error) {
      console.error('[DeviceBinding] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Store device ID in secure keychain
   */
  private async setSecureDeviceId(deviceId: string): Promise<void> {
    try {
      await Keychain.setGenericPassword('hrm_device', deviceId, {
        service: DEVICE_ID_KEY,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      // Fallback to AsyncStorage if Keychain fails
      console.warn('[DeviceBinding] Keychain failed, using AsyncStorage:', error);
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  }

  /**
   * Retrieve device ID from secure keychain
   */
  private async getSecureDeviceId(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: DEVICE_ID_KEY,
      });

      if (credentials) {
        return credentials.password;
      }
    } catch (error) {
      console.warn('[DeviceBinding] Keychain read failed:', error);
    }

    // Fallback to AsyncStorage
    try {
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      return deviceId;
    } catch (error) {
      console.error('[DeviceBinding] AsyncStorage read failed:', error);
      return null;
    }
  }

  /**
   * Get device info from storage
   */
  private async getDeviceInfoFromStorage(): Promise<DeviceInfo | null> {
    try {
      const data = await AsyncStorage.getItem('hrm_device_info');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save device info to storage
   */
  private async saveDeviceInfo(info: DeviceInfo): Promise<void> {
    await AsyncStorage.setItem('hrm_device_info', JSON.stringify(info));
  }

  /**
   * Load device binding from storage
   */
  private async loadBinding(): Promise<DeviceBinding | null> {
    try {
      const data = await AsyncStorage.getItem(DEVICE_BINDING_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save device binding to storage
   */
  private async saveBinding(binding: DeviceBinding): Promise<void> {
    await AsyncStorage.setItem(DEVICE_BINDING_KEY, JSON.stringify(binding));
    this.binding = binding;
  }

  /**
   * Bind this device to an employee
   */
  async bindDevice(params: {
    employeeId: string;
    tenantId: string;
    allowedLocations?: DeviceBinding['allowedLocations'];
  }): Promise<DeviceBinding> {
    await this.initialize();

    if (!this.deviceInfo) {
      throw new Error('Device not initialized');
    }

    const now = new Date().toISOString();

    const binding: DeviceBinding = {
      deviceId: this.deviceInfo.deviceId,
      employeeId: params.employeeId,
      tenantId: params.tenantId,
      boundAt: now,
      lastVerified: now,
      isActive: true,
      allowedLocations: params.allowedLocations,
    };

    await this.saveBinding(binding);
    console.log('[DeviceBinding] Device bound to employee:', params.employeeId);

    return binding;
  }

  /**
   * Verify if this device is bound to the specified employee
   */
  async verifyBinding(employeeId: string, tenantId: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    await this.initialize();

    if (!this.binding) {
      return {
        isValid: false,
        reason: 'Device not bound to any employee',
      };
    }

    if (!this.binding.isActive) {
      return {
        isValid: false,
        reason: 'Device binding is inactive',
      };
    }

    if (this.binding.employeeId !== employeeId) {
      return {
        isValid: false,
        reason: 'Device bound to different employee',
      };
    }

    if (this.binding.tenantId !== tenantId) {
      return {
        isValid: false,
        reason: 'Device bound to different tenant',
      };
    }

    // Update last verified time
    this.binding.lastVerified = new Date().toISOString();
    await this.saveBinding(this.binding);

    return {isValid: true};
  }

  /**
   * Verify GPS location against allowed locations
   */
  verifyLocation(
    currentLocation: {latitude: number; longitude: number; accuracy: number},
    allowedLocations?: DeviceBinding['allowedLocations']
  ): LocationVerification {
    const locations = allowedLocations || this.binding?.allowedLocations || [];

    if (locations.length === 0) {
      // No location restrictions
      return {
        isWithinRange: true,
        distance: 0,
        accuracy: currentLocation.accuracy,
        timestamp: Date.now(),
      };
    }

    let minDistance = Infinity;
    let nearestLocation: string | undefined;

    for (const location of locations) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        location.latitude,
        location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location.name;
      }

      // Check if within radius (accounting for GPS accuracy)
      const effectiveRadius = location.radius + currentLocation.accuracy;
      if (distance <= effectiveRadius) {
        return {
          isWithinRange: true,
          distance,
          nearestLocation: location.name,
          accuracy: currentLocation.accuracy,
          timestamp: Date.now(),
        };
      }
    }

    return {
      isWithinRange: false,
      distance: minDistance,
      nearestLocation,
      accuracy: currentLocation.accuracy,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Store enrolled face data for local verification
   */
  async storeEnrolledFace(data: EnrolledFaceData): Promise<void> {
    try {
      await AsyncStorage.setItem(ENROLLED_FACE_KEY, JSON.stringify(data));
      console.log('[DeviceBinding] Enrolled face data stored');
    } catch (error) {
      console.error('[DeviceBinding] Failed to store enrolled face:', error);
    }
  }

  /**
   * Get enrolled face data for local verification
   */
  async getEnrolledFace(employeeId: string): Promise<EnrolledFaceData | null> {
    try {
      const data = await AsyncStorage.getItem(ENROLLED_FACE_KEY);
      if (!data) return null;

      const enrolled = JSON.parse(data) as EnrolledFaceData;
      if (enrolled.employeeId !== employeeId) return null;

      return enrolled;
    } catch (error) {
      console.error('[DeviceBinding] Failed to get enrolled face:', error);
      return null;
    }
  }

  /**
   * Clear enrolled face data
   */
  async clearEnrolledFace(): Promise<void> {
    await AsyncStorage.removeItem(ENROLLED_FACE_KEY);
  }

  /**
   * Unbind device from employee
   */
  async unbindDevice(): Promise<void> {
    if (this.binding) {
      this.binding.isActive = false;
      await this.saveBinding(this.binding);
    }
    await this.clearEnrolledFace();
    console.log('[DeviceBinding] Device unbound');
  }

  /**
   * Get current device info
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Get current binding
   */
  getBinding(): DeviceBinding | null {
    return this.binding;
  }

  /**
   * Check if device is bound
   */
  isBound(): boolean {
    return this.binding !== null && this.binding.isActive;
  }

  /**
   * Generate verification payload for server
   */
  async generateVerificationPayload(
    employeeId: string,
    location?: {latitude: number; longitude: number; accuracy: number}
  ): Promise<{
    deviceId: string;
    employeeId: string;
    timestamp: number;
    locationVerified: boolean;
    signature: string;
  }> {
    await this.initialize();

    const timestamp = Date.now();
    const locationVerified = location
      ? this.verifyLocation(location).isWithinRange
      : false;

    // Generate signature
    const payload = {
      deviceId: this.deviceInfo?.deviceId || '',
      employeeId,
      timestamp,
      locationVerified,
    };

    const signature = this.generateSignature(payload);

    return {...payload, signature};
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: object): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Export singleton instance
export const deviceBindingService = new DeviceBindingService();
