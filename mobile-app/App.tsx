import React, {useEffect, useRef} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {AlertNotificationRoot} from 'react-native-alert-notification';

import RootNavigator from './src/navigation/RootNavigator';
import {useAuthStore} from './src/store/authStore';
import {Colors} from './src/theme/colors';
import {networkService} from './src/services/networkService';
import {syncService} from './src/services/syncService';
import {pushNotificationService} from './src/services/pushNotificationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    },
  },
});

function App(): React.JSX.Element {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const wasAuthenticated = useRef(false);

  // Initialize network and sync services on app start
  useEffect(() => {
    console.log('[App] Initializing services...');

    // Initialize network monitoring
    networkService.initialize();

    // Initialize sync service (will sync pending punches when online)
    syncService.initialize();

    // Initialize push notification service
    pushNotificationService.initialize();

    return () => {
      // Cleanup on unmount
      syncService.destroy();
      pushNotificationService.destroy();
    };
  }, []);

  // Register/unregister FCM token on auth state change
  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current) {
      // User just logged in - register FCM token
      console.log('[App] User authenticated, registering FCM token...');
      pushNotificationService.registerToken();
    } else if (!isAuthenticated && wasAuthenticated.current) {
      // User just logged out - unregister FCM token
      console.log('[App] User logged out, unregistering FCM token...');
      pushNotificationService.unregisterToken();
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={isDarkMode ? Colors.dark.background : Colors.light.background}
          />
          <AlertNotificationRoot>
            <NavigationContainer>
              <RootNavigator isAuthenticated={isAuthenticated} />
            </NavigationContainer>
          </AlertNotificationRoot>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
