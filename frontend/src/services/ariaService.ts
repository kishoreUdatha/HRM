/**
 * ARIA Voice AI Feature Entitlement Service
 *
 * This service manages ARIA feature access based on subscription plans.
 * ARIA features are segregated into tiers:
 *
 * - Basic Tier (Professional Plan): Voice queries for attendance, leaves, basic reports
 * - Full Tier (Enterprise Plan): All basic features plus payroll, analytics, bulk operations, custom reports
 */

// ARIA feature codes organized by tier
export const ARIA_FEATURES = {
  // Basic Tier features (available in Professional plan)
  BASIC: {
    VOICE_BASIC: 'aria_voice_basic',
    ATTENDANCE_QUERIES: 'aria_attendance_queries',
    LEAVE_QUERIES: 'aria_leave_queries',
    BASIC_REPORTS: 'aria_basic_reports',
  },

  // Full Tier features (available in Enterprise plan)
  FULL: {
    VOICE_FULL: 'aria_voice_full',
    PAYROLL_QUERIES: 'aria_payroll_queries',
    ADVANCED_ANALYTICS: 'aria_advanced_analytics',
    BULK_OPERATIONS: 'aria_bulk_operations',
    CUSTOM_REPORTS: 'aria_custom_reports',
    EMAIL_REPORTS: 'aria_email_reports',
    ONBOARDING_ASSIST: 'aria_onboarding_assist',
    ASSET_TRACKING: 'aria_asset_tracking',
    SURVEY_ANALYSIS: 'aria_survey_analysis',
    WORKFORCE_INSIGHTS: 'aria_workforce_insights',
    PHONE_SUPPORT: 'aria_phone_support',
  },
} as const;

// All ARIA features flattened
export const ALL_ARIA_FEATURES = [
  ...Object.values(ARIA_FEATURES.BASIC),
  ...Object.values(ARIA_FEATURES.FULL),
];

// Feature descriptions for UI display
export const ARIA_FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  [ARIA_FEATURES.BASIC.VOICE_BASIC]: {
    title: 'ARIA Voice Assistant',
    description: 'Voice-activated HR assistant for quick queries and navigation',
  },
  [ARIA_FEATURES.BASIC.ATTENDANCE_QUERIES]: {
    title: 'Attendance Queries',
    description: 'Ask about attendance records, check-ins, and time tracking',
  },
  [ARIA_FEATURES.BASIC.LEAVE_QUERIES]: {
    title: 'Leave Balance Queries',
    description: 'Check leave balances, pending requests, and leave history',
  },
  [ARIA_FEATURES.BASIC.BASIC_REPORTS]: {
    title: 'Basic Report Generation',
    description: 'Generate standard HR reports using voice commands',
  },
  [ARIA_FEATURES.FULL.VOICE_FULL]: {
    title: 'ARIA Full Suite',
    description: 'Complete voice-activated HR management with advanced features',
  },
  [ARIA_FEATURES.FULL.PAYROLL_QUERIES]: {
    title: 'Payroll Queries',
    description: 'Voice queries for salary, deductions, and payslip information',
  },
  [ARIA_FEATURES.FULL.ADVANCED_ANALYTICS]: {
    title: 'Voice Analytics',
    description: 'Request workforce analytics and insights through voice',
  },
  [ARIA_FEATURES.FULL.BULK_OPERATIONS]: {
    title: 'Bulk Operations',
    description: 'Execute bulk HR operations through voice commands',
  },
  [ARIA_FEATURES.FULL.CUSTOM_REPORTS]: {
    title: 'Custom Report Builder',
    description: 'Create custom reports using natural language',
  },
  [ARIA_FEATURES.FULL.EMAIL_REPORTS]: {
    title: 'Email Report Delivery',
    description: 'Generate and email reports through voice requests',
  },
  [ARIA_FEATURES.FULL.ONBOARDING_ASSIST]: {
    title: 'Onboarding Assistant',
    description: 'Voice-guided employee onboarding process',
  },
  [ARIA_FEATURES.FULL.ASSET_TRACKING]: {
    title: 'Asset Tracking',
    description: 'Track company assets through voice queries',
  },
  [ARIA_FEATURES.FULL.SURVEY_ANALYSIS]: {
    title: 'Survey Analysis',
    description: 'Analyze employee surveys and sentiment through voice',
  },
  [ARIA_FEATURES.FULL.WORKFORCE_INSIGHTS]: {
    title: 'Workforce Intelligence',
    description: 'Get AI-powered workforce insights and recommendations',
  },
  [ARIA_FEATURES.FULL.PHONE_SUPPORT]: {
    title: 'Phone Call Support',
    description: 'Access ARIA through phone calls for hands-free HR management',
  },
};

/**
 * Check if a specific ARIA feature is available based on subscription features
 */
export function hasAriaFeature(subscriptionFeatures: string[], featureCode: string): boolean {
  return subscriptionFeatures.includes(featureCode);
}

/**
 * Check if the tenant has access to basic ARIA features
 */
export function hasBasicAria(subscriptionFeatures: string[]): boolean {
  return subscriptionFeatures.includes(ARIA_FEATURES.BASIC.VOICE_BASIC);
}

/**
 * Check if the tenant has access to full ARIA features
 */
export function hasFullAria(subscriptionFeatures: string[]): boolean {
  return subscriptionFeatures.includes(ARIA_FEATURES.FULL.VOICE_FULL);
}

/**
 * Get all available ARIA features for a subscription
 */
export function getAvailableAriaFeatures(subscriptionFeatures: string[]): string[] {
  return ALL_ARIA_FEATURES.filter((feature) => subscriptionFeatures.includes(feature));
}

/**
 * Get locked ARIA features (not available in current subscription)
 */
export function getLockedAriaFeatures(subscriptionFeatures: string[]): string[] {
  return ALL_ARIA_FEATURES.filter((feature) => !subscriptionFeatures.includes(feature));
}

/**
 * Get ARIA tier based on subscription features
 */
export function getAriaTier(subscriptionFeatures: string[]): 'none' | 'basic' | 'full' {
  if (hasFullAria(subscriptionFeatures)) return 'full';
  if (hasBasicAria(subscriptionFeatures)) return 'basic';
  return 'none';
}

/**
 * Get upgrade message based on current tier
 */
export function getAriaUpgradeMessage(currentTier: 'none' | 'basic' | 'full'): string {
  switch (currentTier) {
    case 'none':
      return 'Upgrade to Professional plan to unlock ARIA Voice Assistant with attendance and leave queries.';
    case 'basic':
      return 'Upgrade to Enterprise plan to unlock full ARIA capabilities including payroll, analytics, and bulk operations.';
    case 'full':
      return 'You have access to all ARIA features.';
  }
}

/**
 * Sample ARIA voice commands for each tier
 */
export const ARIA_SAMPLE_COMMANDS = {
  basic: [
    'Hey ARIA, what is my leave balance?',
    'ARIA, show attendance for today',
    'ARIA, who is on leave this week?',
    'Generate attendance report for this month',
  ],
  full: [
    'ARIA, what is my payslip for December?',
    'Show workforce analytics dashboard',
    'Email the monthly HR report to the management team',
    'ARIA, start onboarding for the new hires',
    'What is the sentiment score from the last survey?',
    'Track all laptops assigned to engineering team',
    'Generate a custom report of employees joining in Q4',
  ],
};
