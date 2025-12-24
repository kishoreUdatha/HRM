# HRM Mobile App

A React Native mobile application for the HRM SaaS platform, built with React Native CLI and TypeScript.

## Features

- **Face Recognition Attendance**: Check-in and check-out using facial verification with GPS location
- **Leave Management**: Apply for leave, view leave balance, and track request status
- **Holiday Calendar**: View upcoming holidays
- **Timesheet Management**: Track work hours and project time
- **Payslip View**: View and download monthly payslips
- **Push Notifications**: Real-time notifications for leave approvals, attendance reminders
- **Multi-tenant Support**: Company code-based tenant detection

## Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- CocoaPods (for iOS)

## Setup

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### 3. Configure Environment

Update the API base URL in `src/api/apiClient.ts`:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000/api' // Android emulator
  : 'https://your-production-api.com/api';
```

For iOS simulator, use `http://localhost:3000/api` instead.

### 4. Run the App

```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
mobile-app/
├── src/
│   ├── api/                    # API clients and services
│   │   ├── apiClient.ts        # Axios instance with interceptors
│   │   ├── authApi.ts          # Authentication API
│   │   ├── attendanceApi.ts    # Attendance API
│   │   ├── leaveApi.ts         # Leave management API
│   │   ├── payrollApi.ts       # Payroll API
│   │   └── timesheetApi.ts     # Timesheet API
│   ├── components/             # Reusable UI components
│   ├── screens/                # Screen components
│   │   ├── onboarding/         # Welcome, Tenant Detection
│   │   ├── auth/               # Login
│   │   ├── dashboard/          # Dashboard
│   │   ├── attendance/         # Attendance, Face Check-in
│   │   ├── leave/              # Leave management
│   │   ├── payroll/            # Payslips
│   │   ├── timesheet/          # Timesheets
│   │   ├── calendar/           # Holiday calendar
│   │   ├── profile/            # User profile
│   │   ├── notifications/      # Notifications
│   │   └── more/               # Settings and more
│   ├── navigation/             # React Navigation setup
│   ├── store/                  # Zustand state management
│   ├── hooks/                  # Custom hooks
│   ├── utils/                  # Utility functions
│   ├── types/                  # TypeScript types
│   ├── theme/                  # Theme and styling
│   └── services/               # Device services (camera, location, etc.)
├── android/                    # Android native code
├── ios/                        # iOS native code
└── package.json
```

## Key Technologies

- **React Native 0.73** - Mobile framework
- **TypeScript** - Type safety
- **React Navigation 6** - Navigation
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **react-native-vision-camera** - Camera for face capture
- **react-native-geolocation-service** - GPS location
- **react-native-keychain** - Secure token storage
- **react-native-mmkv** - Fast key-value storage
- **Firebase Messaging** - Push notifications
- **react-native-calendars** - Calendar component

## Backend Integration

The app integrates with these backend services via API Gateway (port 3000):

| Service | Endpoint | Description |
|---------|----------|-------------|
| Auth | `/api/auth` | Login, logout, token refresh |
| Tenant | `/api/tenants` | Tenant detection |
| Attendance | `/api/attendance` | Check-in/out, face verification |
| Leave | `/api/leaves` | Leave requests, balances |
| Payroll | `/api/payroll` | Payslips |
| Timesheet | `/api/timesheets` | Time tracking |
| Notifications | `/api/notifications` | Push notifications |

## Face Verification

The face check-in feature uses:
1. **react-native-vision-camera** for capturing selfies
2. **GPS location** for geo-fencing validation
3. Backend face verification (configurable with AWS Rekognition, Azure Face API, etc.)

## Troubleshooting

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Metro Bundler Issues

```bash
npm start -- --reset-cache
```

## Production Build

### Android

```bash
cd android
./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

### iOS

Build using Xcode with Release configuration.

## License

Proprietary - All rights reserved
