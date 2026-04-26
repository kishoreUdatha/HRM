# HRZio Mobile App - Screenshot Automation

This document explains how to capture screenshots for Google Play Store listing.

## Prerequisites

1. **Android SDK** with emulators configured
2. **ADB** in PATH
3. **Node.js** >= 18
4. (Optional) **Maestro** for advanced UI automation
5. (Optional) **Ruby** + **Fastlane** for Play Store deployment

## Quick Start

### Capture Screenshots

```bash
# Capture all device types
npm run screenshots

# Capture specific device type
npm run screenshots:phone      # Phone (1080x2400)
npm run screenshots:tablet7    # 7" Tablet (1200x1920)
npm run screenshots:tablet10   # 10" Tablet (1600x2560)
```

### Create Emulators (AVDs)

```bash
# Create phone emulator
npm run screenshots:create-avd phone

# Create 7" tablet emulator
npm run screenshots:create-avd tablet-7

# Create 10" tablet emulator
npm run screenshots:create-avd tablet-10
```

## Device Configurations

| Device Type | Resolution | DPI | AVD Name |
|-------------|------------|-----|----------|
| Phone | 1080x2400 | 420 | Pixel_6_API_33 |
| 7" Tablet | 1200x1920 | 213 | Nexus_7_API_33 |
| 10" Tablet | 1600x2560 | 276 | Pixel_Tablet_API_33 |

## Screenshot Output

Screenshots are saved to:
```
fastlane/metadata/android/en-US/images/
├── phoneScreenshots/
│   ├── 01_welcome.png
│   ├── 02_login.png
│   ├── 03_dashboard.png
│   └── ...
├── sevenInchScreenshots/
│   └── ...
└── tenInchScreenshots/
    └── ...
```

## Screens Captured

1. **Welcome Screen** - Onboarding/splash
2. **Login Screen** - Authentication
3. **Dashboard** - Main dashboard with attendance
4. **Face Check-in** - Face recognition camera
5. **Attendance History** - Attendance records
6. **Leave Management** - Leave requests
7. **Payslip** - Salary details
8. **Profile** - User profile

## Using Maestro (Recommended)

[Maestro](https://maestro.mobile.dev/) provides reliable UI automation:

### Install Maestro

```bash
# Windows (using Chocolatey)
choco install maestro

# macOS
brew install maestro

# Linux
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Run Maestro Tests

```bash
# Run all flows
npm run maestro:test

# Record a new flow
npm run maestro:record
```

## Using Fastlane (For CI/CD)

### Install Fastlane

```bash
# Install Ruby first, then:
gem install fastlane

# Or using Bundler
bundle install
```

### Fastlane Commands

```bash
# Build debug APK
bundle exec fastlane android build_debug

# Build release APK
bundle exec fastlane android build_release

# Build release bundle (AAB)
bundle exec fastlane android build_bundle

# Upload to Play Store (internal track)
bundle exec fastlane android deploy_internal

# Upload screenshots only
bundle exec fastlane android upload_screenshots
```

## Google Play Store Requirements

### Phone Screenshots
- Minimum: 2 screenshots
- Maximum: 8 screenshots
- Dimensions: 320-3840px (16:9 or 9:16 ratio)
- Format: PNG or JPEG

### 7" Tablet Screenshots
- Minimum: 0 (optional but recommended)
- Maximum: 8 screenshots
- Dimensions: 320-3840px

### 10" Tablet Screenshots
- Minimum: 0 (optional but recommended)
- Maximum: 8 screenshots
- Dimensions: 320-3840px

## Tips

1. **Use demo data** - Ensure app has realistic demo data for screenshots
2. **Hide sensitive info** - Don't show real user data
3. **Consistent theme** - Use light/dark theme consistently
4. **Status bar** - Consider hiding or styling the status bar
5. **Localization** - Capture screenshots for each supported language

## Troubleshooting

### No devices found
```bash
# Check connected devices
adb devices

# Start emulator manually
emulator -avd Pixel_6_API_33
```

### Screenshot fails
```bash
# Restart ADB server
adb kill-server
adb start-server
```

### Maestro issues
```bash
# Clear Maestro cache
maestro clear
```
