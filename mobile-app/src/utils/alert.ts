import { ALERT_TYPE, Toast, Dialog } from 'react-native-alert-notification';

/**
 * Alert utility functions using react-native-alert-notification
 * Replaces standard Alert.alert() with beautiful toast and dialog notifications
 */

// Toast notifications (auto-dismiss)
export const showToast = {
  success: (title: string, message?: string) => {
    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title,
      textBody: message || '',
      autoClose: 3000,
    });
  },

  error: (title: string, message?: string) => {
    Toast.show({
      type: ALERT_TYPE.DANGER,
      title,
      textBody: message || '',
      autoClose: 4000,
    });
  },

  warning: (title: string, message?: string) => {
    Toast.show({
      type: ALERT_TYPE.WARNING,
      title,
      textBody: message || '',
      autoClose: 3500,
    });
  },

  info: (title: string, message?: string) => {
    Toast.show({
      type: ALERT_TYPE.INFO,
      title,
      textBody: message || '',
      autoClose: 3000,
    });
  },
};

// Dialog notifications (requires user interaction)
export const showDialog = {
  success: (title: string, message?: string, onConfirm?: () => void) => {
    Dialog.show({
      type: ALERT_TYPE.SUCCESS,
      title,
      textBody: message || '',
      button: 'OK',
      onPressButton: () => {
        Dialog.hide();
        onConfirm?.();
      },
    });
  },

  error: (title: string, message?: string, onConfirm?: () => void) => {
    Dialog.show({
      type: ALERT_TYPE.DANGER,
      title,
      textBody: message || '',
      button: 'OK',
      onPressButton: () => {
        Dialog.hide();
        onConfirm?.();
      },
    });
  },

  warning: (title: string, message?: string, onConfirm?: () => void) => {
    Dialog.show({
      type: ALERT_TYPE.WARNING,
      title,
      textBody: message || '',
      button: 'OK',
      onPressButton: () => {
        Dialog.hide();
        onConfirm?.();
      },
    });
  },

  info: (title: string, message?: string, onConfirm?: () => void) => {
    Dialog.show({
      type: ALERT_TYPE.INFO,
      title,
      textBody: message || '',
      button: 'OK',
      onPressButton: () => {
        Dialog.hide();
        onConfirm?.();
      },
    });
  },

  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Confirm',
    type: ALERT_TYPE = ALERT_TYPE.WARNING
  ) => {
    Dialog.show({
      type,
      title,
      textBody: message,
      button: confirmText,
      onPressButton: () => {
        Dialog.hide();
        onConfirm();
      },
    });
    // Note: This library doesn't have native cancel button support
    // For cancel, user can tap outside the dialog
  },
};

// Quick helper to replace Alert.alert patterns
export const alert = {
  // Simple success notification
  success: (message: string) => showToast.success('Success', message),

  // Simple error notification
  error: (message: string) => showToast.error('Error', message),

  // Simple warning notification
  warning: (message: string) => showToast.warning('Warning', message),

  // Simple info notification
  info: (message: string) => showToast.info('Info', message),
};

export { ALERT_TYPE };
