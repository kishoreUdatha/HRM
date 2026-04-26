#!/usr/bin/env node
/**
 * HRZio Mobile App - Automated Screenshot Capture for Google Play Store
 *
 * This script automates the capture of screenshots for:
 * - Phone (1080x1920, 1080x2340)
 * - 7" Tablet (1200x1920)
 * - 10" Tablet (1600x2560)
 *
 * Usage: node scripts/screenshot-automation.js [device-type]
 * device-type: phone | tablet-7 | tablet-10 | all
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Screenshot configurations for different device types
const DEVICE_CONFIGS = {
  phone: {
    name: 'Pixel_6_API_33',
    resolution: '1080x2400',
    dpi: 420,
    outputDir: 'phoneScreenshots',
    avdName: 'Pixel_6_API_33'
  },
  'tablet-7': {
    name: 'Nexus_7_API_33',
    resolution: '1200x1920',
    dpi: 213,
    outputDir: 'sevenInchScreenshots',
    avdName: 'Nexus_7_API_33'
  },
  'tablet-10': {
    name: 'Pixel_Tablet_API_33',
    resolution: '1600x2560',
    dpi: 276,
    outputDir: 'tenInchScreenshots',
    avdName: 'Pixel_Tablet_API_33'
  }
};

// Screens to capture with navigation flows
const SCREENS_TO_CAPTURE = [
  {
    name: '01_welcome',
    description: 'Welcome/Onboarding Screen',
    flow: 'welcome'
  },
  {
    name: '02_login',
    description: 'Login Screen',
    flow: 'login'
  },
  {
    name: '03_dashboard',
    description: 'Dashboard with attendance',
    flow: 'dashboard',
    requiresAuth: true
  },
  {
    name: '04_face_checkin',
    description: 'Face Recognition Check-in',
    flow: 'face-checkin',
    requiresAuth: true
  },
  {
    name: '05_attendance_history',
    description: 'Attendance History',
    flow: 'attendance',
    requiresAuth: true
  },
  {
    name: '06_leave_management',
    description: 'Leave Management',
    flow: 'leaves',
    requiresAuth: true
  },
  {
    name: '07_payslip',
    description: 'Payslip View',
    flow: 'payslip',
    requiresAuth: true
  },
  {
    name: '08_profile',
    description: 'Profile Screen',
    flow: 'profile',
    requiresAuth: true
  }
];

class ScreenshotAutomation {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.screenshotsDir = path.join(this.projectRoot, 'fastlane', 'metadata', 'android', 'en-US', 'images');
    this.tempDir = path.join(this.projectRoot, 'screenshots', 'temp');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = {
      info: '\x1b[36m[INFO]\x1b[0m',
      success: '\x1b[32m[SUCCESS]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m'
    };
    console.log(`${timestamp} ${prefix[type] || prefix.info} ${message}`);
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
    } catch (error) {
      if (!options.ignoreError) {
        this.log(`Command failed: ${command}`, 'error');
        throw error;
      }
      return null;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConnectedDevices() {
    const output = this.exec('adb devices', { silent: true });
    const lines = output.split('\n').filter(line => line.includes('\tdevice'));
    return lines.map(line => line.split('\t')[0]);
  }

  async captureScreenshot(deviceId, outputPath) {
    try {
      // Use exec-out for direct capture (works better on newer Android versions)
      execSync(`adb -s ${deviceId} exec-out screencap -p > "${outputPath}"`, {
        encoding: 'buffer',
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      this.log(`Screenshot saved: ${path.basename(outputPath)}`, 'success');
    } catch (error) {
      // Fallback to traditional method
      const tempPath = '/sdcard/screenshot.png';
      this.exec(`adb -s ${deviceId} shell screencap -p ${tempPath}`, { silent: true, ignoreError: true });
      this.exec(`adb -s ${deviceId} pull ${tempPath} "${outputPath}"`, { silent: true, ignoreError: true });
      this.exec(`adb -s ${deviceId} shell rm ${tempPath}`, { silent: true, ignoreError: true });
      this.log(`Screenshot saved (fallback): ${path.basename(outputPath)}`, 'success');
    }
  }

  async tapElement(deviceId, x, y) {
    this.exec(`adb -s ${deviceId} shell input tap ${x} ${y}`, { silent: true });
    await this.sleep(500);
  }

  async inputText(deviceId, text) {
    // Escape special characters for ADB
    const escapedText = text.replace(/ /g, '%s').replace(/'/g, "\\'");
    this.exec(`adb -s ${deviceId} shell input text "${escapedText}"`, { silent: true });
    await this.sleep(300);
  }

  async pressBack(deviceId) {
    this.exec(`adb -s ${deviceId} shell input keyevent KEYCODE_BACK`, { silent: true });
    await this.sleep(500);
  }

  async pressHome(deviceId) {
    this.exec(`adb -s ${deviceId} shell input keyevent KEYCODE_HOME`, { silent: true });
    await this.sleep(500);
  }

  async launchApp(deviceId, packageName = 'com.candycode.hrzio') {
    this.exec(`adb -s ${deviceId} shell am start -n ${packageName}/.MainActivity`, { silent: true, ignoreError: true });
    // Alternative launch method
    this.exec(`adb -s ${deviceId} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`, { silent: true, ignoreError: true });
    await this.sleep(3000);
  }

  async clearAppData(deviceId, packageName = 'com.candycode.hrzio') {
    this.exec(`adb -s ${deviceId} shell pm clear ${packageName}`, { silent: true, ignoreError: true });
    await this.sleep(1000);
  }

  async runMaestroFlow(flowName, deviceId) {
    const flowPath = path.join(this.projectRoot, '.maestro', `${flowName}.yaml`);
    if (fs.existsSync(flowPath)) {
      try {
        this.exec(`maestro --device ${deviceId} test "${flowPath}"`, { silent: true });
        return true;
      } catch (error) {
        this.log(`Maestro flow ${flowName} failed, using fallback`, 'warn');
        return false;
      }
    }
    return false;
  }

  async captureScreensForDevice(deviceType) {
    const config = DEVICE_CONFIGS[deviceType];
    if (!config) {
      this.log(`Unknown device type: ${deviceType}`, 'error');
      return;
    }

    const devices = this.getConnectedDevices();
    if (devices.length === 0) {
      this.log('No connected devices found. Please start an emulator or connect a device.', 'error');
      this.log(`Recommended AVD for ${deviceType}: ${config.avdName}`, 'info');
      return;
    }

    const deviceId = devices[0];
    this.log(`Using device: ${deviceId}`, 'info');

    const outputDir = path.join(this.screenshotsDir, config.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });

    // Clear app data for fresh screenshots
    this.log('Clearing app data for fresh state...', 'info');
    await this.clearAppData(deviceId);

    // Launch app
    this.log('Launching HRZio app...', 'info');
    await this.launchApp(deviceId);

    // Capture each screen
    for (const screen of SCREENS_TO_CAPTURE) {
      this.log(`Capturing: ${screen.description}`, 'info');

      // Try Maestro flow first, fallback to manual navigation
      const maestroSuccess = await this.runMaestroFlow(screen.flow, deviceId);

      if (!maestroSuccess) {
        // Wait for screen to load
        await this.sleep(2000);
      }

      const outputPath = path.join(outputDir, `${screen.name}.png`);
      await this.captureScreenshot(deviceId, outputPath);

      await this.sleep(1000);
    }

    this.log(`Screenshots for ${deviceType} completed!`, 'success');
  }

  async createAVD(deviceType) {
    const config = DEVICE_CONFIGS[deviceType];
    const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Android\\Sdk';
    const avdManager = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', 'avdmanager.bat');

    const deviceProfiles = {
      phone: 'pixel_6',
      'tablet-7': 'Nexus 7',
      'tablet-10': 'pixel_tablet'
    };

    this.log(`Creating AVD: ${config.avdName}`, 'info');

    try {
      this.exec(`"${avdManager}" create avd -n ${config.avdName} -k "system-images;android-33;google_apis;x86_64" -d "${deviceProfiles[deviceType]}" --force`, { silent: true });
      this.log(`AVD ${config.avdName} created successfully`, 'success');
    } catch (error) {
      this.log(`Failed to create AVD. Make sure Android SDK is properly installed.`, 'error');
    }
  }

  async run(deviceType = 'all') {
    this.log('='.repeat(60), 'info');
    this.log('HRZio Screenshot Automation for Google Play Store', 'info');
    this.log('='.repeat(60), 'info');

    if (deviceType === 'all') {
      for (const type of Object.keys(DEVICE_CONFIGS)) {
        await this.captureScreensForDevice(type);
      }
    } else {
      await this.captureScreensForDevice(deviceType);
    }

    this.log('='.repeat(60), 'info');
    this.log('Screenshot automation completed!', 'success');
    this.log(`Screenshots saved to: ${this.screenshotsDir}`, 'info');
  }
}

// CLI handling
const args = process.argv.slice(2);
const deviceType = args[0] || 'phone';

const automation = new ScreenshotAutomation();

if (args.includes('--create-avd')) {
  const type = args[args.indexOf('--create-avd') + 1] || 'phone';
  automation.createAVD(type);
} else if (args.includes('--help')) {
  console.log(`
HRZio Screenshot Automation

Usage:
  node scripts/screenshot-automation.js [device-type]

Device Types:
  phone      - Phone screenshots (1080x2400)
  tablet-7   - 7" Tablet screenshots (1200x1920)
  tablet-10  - 10" Tablet screenshots (1600x2560)
  all        - All device types

Options:
  --create-avd [type]  Create AVD for specified device type
  --help               Show this help message

Examples:
  node scripts/screenshot-automation.js phone
  node scripts/screenshot-automation.js all
  node scripts/screenshot-automation.js --create-avd tablet-7
`);
} else {
  automation.run(deviceType);
}
