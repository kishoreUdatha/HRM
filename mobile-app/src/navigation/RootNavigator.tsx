import React from 'react';
import {View, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../store/authStore';
import {Colors} from '../theme/colors';

// Auth Screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import TenantDetectionScreen from '../screens/onboarding/TenantDetectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// Main Screens (Employee)
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AttendanceHomeScreen from '../screens/attendance/AttendanceHomeScreen';
import FaceCheckInScreen from '../screens/attendance/FaceCheckInScreen';
import FaceEnrollmentScreen from '../screens/attendance/FaceEnrollmentScreen';
import LeaveHomeScreen from '../screens/leave/LeaveHomeScreen';
import ApplyLeaveScreen from '../screens/leave/ApplyLeaveScreen';
import LeaveDetailScreen from '../screens/leave/LeaveDetailScreen';
import PayslipListScreen from '../screens/payroll/PayslipListScreen';
import PayslipDetailScreen from '../screens/payroll/PayslipDetailScreen';
import MoreScreen from '../screens/more/MoreScreen';
import HolidayCalendarScreen from '../screens/calendar/HolidayCalendarScreen';
import TimesheetHomeScreen from '../screens/timesheet/TimesheetHomeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

// Admin Screens
import {
  AdminDashboardScreen,
  TeamAttendanceScreen,
  TeamLeavesScreen,
  PayrollSummaryScreen,
  EmployeeSalaryDetailScreen,
  EmployeeListScreen,
} from '../screens/admin';

import type {RootStackParamList, MainTabParamList, AdminTabParamList} from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

interface TabIconProps {
  focused: boolean;
  icon: string;
  iconOutline: string;
  activeColor: string;
  bgColor: string;
}

function TabIcon({focused, icon, iconOutline, activeColor, bgColor}: TabIconProps) {
  return (
    <View style={[
      styles.tabIconContainer,
      focused && {backgroundColor: bgColor}
    ]}>
      <Icon
        name={focused ? icon : iconOutline}
        size={26}
        color={focused ? activeColor : '#94A3B8'}
      />
    </View>
  );
}

// Employee Main Tabs
function MainTabs() {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarActiveTintColor: colors.tabHome,
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="home"
              iconOutline="home-outline"
              activeColor={colors.tabHome}
              bgColor={colors.menuProfileBg}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceStack}
        options={{
          tabBarLabel: 'Attendance',
          tabBarActiveTintColor: colors.tabAttendance,
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="clock-check"
              iconOutline="clock-check-outline"
              activeColor={colors.tabAttendance}
              bgColor={colors.menuNotificationsBg}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Leave"
        component={LeaveStack}
        options={{
          tabBarLabel: 'Leave',
          tabBarActiveTintColor: colors.tabLeave,
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="calendar-check"
              iconOutline="calendar-check-outline"
              activeColor={colors.tabLeave}
              bgColor={colors.menuCalendarBg}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Payroll"
        component={PayrollStack}
        options={{
          tabBarLabel: 'Payslips',
          tabBarActiveTintColor: colors.tabPayroll,
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="wallet"
              iconOutline="wallet-outline"
              activeColor={colors.tabPayroll}
              bgColor={colors.menuHelpBg}
            />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarActiveTintColor: colors.tabMore,
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="dots-horizontal-circle"
              iconOutline="dots-horizontal-circle-outline"
              activeColor={colors.tabMore}
              bgColor={colors.menuDarkModeBg}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Admin/Tenant Admin Main Tabs
function AdminTabs() {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarActiveTintColor: '#6366F1',
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="view-dashboard"
              iconOutline="view-dashboard-outline"
              activeColor="#6366F1"
              bgColor="#EEF2FF"
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="TeamAttendance"
        component={TeamAttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarActiveTintColor: '#F59E0B',
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="account-group"
              iconOutline="account-group-outline"
              activeColor="#F59E0B"
              bgColor="#FEF3C7"
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="TeamLeaves"
        component={TeamLeavesScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarActiveTintColor: '#EC4899',
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="calendar-clock"
              iconOutline="calendar-clock-outline"
              activeColor="#EC4899"
              bgColor="#FCE7F3"
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="PayrollSummary"
        component={PayrollSummaryScreen}
        options={{
          tabBarLabel: 'Payroll',
          tabBarActiveTintColor: '#10B981',
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="cash-multiple"
              iconOutline="cash"
              activeColor="#10B981"
              bgColor="#D1FAE5"
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="More"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarActiveTintColor: colors.tabMore,
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              icon="dots-horizontal-circle"
              iconOutline="dots-horizontal-circle-outline"
              activeColor={colors.tabMore}
              bgColor={colors.menuDarkModeBg}
            />
          ),
        }}
      />
    </AdminTab.Navigator>
  );
}

// Attendance Stack
function AttendanceStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AttendanceHome" component={AttendanceHomeScreen} />
    </Stack.Navigator>
  );
}

// Leave Stack
function LeaveStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="LeaveHome" component={LeaveHomeScreen} />
    </Stack.Navigator>
  );
}

// Payroll Stack
function PayrollStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="PayslipList" component={PayslipListScreen} />
    </Stack.Navigator>
  );
}

// More Stack
function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MoreHome" component={MoreScreen} />
    </Stack.Navigator>
  );
}

// Check if user is admin (tenant_admin, hr, or manager)
function isAdminRole(role?: string): boolean {
  return role === 'tenant_admin' || role === 'hr' || role === 'manager' || role === 'super_admin';
}

export default function RootNavigator({isAuthenticated}: RootNavigatorProps) {
  const isOnboarded = useAuthStore(state => state.isOnboarded);
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const user = useAuthStore(state => state.user);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Determine if user should see admin dashboard
  const showAdminDashboard = isAuthenticated && isAdminRole(user?.role);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.background},
      }}>
      {!isAuthenticated ? (
        // Auth Flow
        <>
          {!isOnboarded && (
            <Stack.Screen
              name="Onboarding"
              component={WelcomeScreen}
              options={{animation: 'fade'}}
            />
          )}
          <Stack.Screen
            name="TenantDetection"
            component={TenantDetectionScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{animation: 'slide_from_right'}}
          />
        </>
      ) : (
        // Authenticated Flow
        <>
          {/* Main Tabs - Admin or Employee based on role */}
          <Stack.Screen
            name="MainTabs"
            component={showAdminDashboard ? AdminTabs : MainTabs}
            options={{animation: 'fade'}}
          />

          {/* Shared Screens */}
          <Stack.Screen
            name="FaceCheckIn"
            component={FaceCheckInScreen}
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="FaceCheckOut"
            component={FaceCheckInScreen}
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="FaceEnrollment"
            component={FaceEnrollmentScreen}
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="ApplyLeave"
            component={ApplyLeaveScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="LeaveDetail"
            component={LeaveDetailScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="PayslipDetail"
            component={PayslipDetailScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="TimesheetDetail"
            component={TimesheetHomeScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="HolidayCalendar"
            component={HolidayCalendarScreen}
            options={{animation: 'slide_from_right'}}
          />

          {/* Admin-specific Stack Screens */}
          <Stack.Screen
            name="TeamAttendance"
            component={TeamAttendanceScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="TeamLeaves"
            component={TeamLeavesScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="PayrollSummary"
            component={PayrollSummaryScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="EmployeeSalaryDetail"
            component={EmployeeSalaryDetailScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="EmployeeList"
            component={EmployeeListScreen}
            options={{animation: 'slide_from_right'}}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 50,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
