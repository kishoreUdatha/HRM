import * as Keychain from 'react-native-keychain';
import type {AuthTokens} from '../types';

const AUTH_SERVICE = 'com.hrmobile.auth';

export const authStorage = {
  /**
   * Store tokens securely using Keychain
   */
  async setTokens(tokens: AuthTokens): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(
        'auth_tokens',
        JSON.stringify(tokens),
        {service: AUTH_SERVICE}
      );
      return true;
    } catch (error) {
      console.error('Error storing tokens:', error);
      return false;
    }
  },

  /**
   * Retrieve tokens from secure storage
   */
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({service: AUTH_SERVICE});
      if (credentials) {
        return JSON.parse(credentials.password) as AuthTokens;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  },

  /**
   * Clear stored tokens
   */
  async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({service: AUTH_SERVICE});
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  },

  /**
   * Check if tokens exist
   */
  async hasTokens(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  },
};

// Biometric authentication support
export const biometricAuth = {
  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<{available: boolean; biometryType: string | null}> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return {
        available: biometryType !== null,
        biometryType,
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return {available: false, biometryType: null};
    }
  },

  /**
   * Store value with biometric protection
   */
  async setSecureValue(key: string, value: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: `${AUTH_SERVICE}.biometric.${key}`,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });
      return true;
    } catch (error) {
      console.error('Error storing secure value:', error);
      return false;
    }
  },

  /**
   * Retrieve value with biometric authentication
   */
  async getSecureValue(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `${AUTH_SERVICE}.biometric.${key}`,
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: 'Verify your identity to continue',
          cancel: 'Cancel',
        },
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving secure value:', error);
      return null;
    }
  },
};
