/**
 * Azure Application Insights Integration
 * Provides monitoring, logging, and telemetry for all HRM microservices
 */

import * as appInsights from 'applicationinsights';
import { Request, Response, NextFunction } from 'express';

interface InsightsConfig {
  connectionString?: string;
  instrumentationKey?: string;
  serviceName: string;
  enableAutoCollectRequests?: boolean;
  enableAutoCollectPerformance?: boolean;
  enableAutoCollectExceptions?: boolean;
  enableAutoCollectDependencies?: boolean;
  enableAutoCollectConsole?: boolean;
  enableAutoCollectHeartbeat?: boolean;
  samplingPercentage?: number;
}

let telemetryClient: appInsights.TelemetryClient | null = null;

/**
 * Initialize Azure Application Insights
 */
export function initializeInsights(config: InsightsConfig): appInsights.TelemetryClient | null {
  const connectionString = config.connectionString || process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  const instrumentationKey = config.instrumentationKey || process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

  if (!connectionString && !instrumentationKey) {
    console.warn('Application Insights not configured - telemetry will be disabled');
    return null;
  }

  try {
    // Setup Application Insights
    if (connectionString) {
      appInsights.setup(connectionString);
    } else if (instrumentationKey) {
      appInsights.setup(instrumentationKey);
    }

    // Configure auto-collection
    appInsights
      .setAutoCollectRequests(config.enableAutoCollectRequests ?? true)
      .setAutoCollectPerformance(config.enableAutoCollectPerformance ?? true, true)
      .setAutoCollectExceptions(config.enableAutoCollectExceptions ?? true)
      .setAutoCollectDependencies(config.enableAutoCollectDependencies ?? true)
      .setAutoCollectConsole(config.enableAutoCollectConsole ?? true, true)
      .setAutoCollectHeartbeat(config.enableAutoCollectHeartbeat ?? true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true);

    // Set sampling percentage if specified
    if (config.samplingPercentage !== undefined) {
      appInsights.defaultClient.config.samplingPercentage = config.samplingPercentage;
    }

    // Set cloud role name
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = config.serviceName;

    // Start Application Insights
    appInsights.start();

    telemetryClient = appInsights.defaultClient;

    console.log(`Application Insights initialized for service: ${config.serviceName}`);

    return telemetryClient;
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
    return null;
  }
}

/**
 * Get the telemetry client
 */
export function getTelemetryClient(): appInsights.TelemetryClient | null {
  return telemetryClient;
}

/**
 * Track custom event
 */
export function trackEvent(name: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }): void {
  if (telemetryClient) {
    telemetryClient.trackEvent({
      name,
      properties,
      measurements,
    });
  }
}

/**
 * Track custom metric
 */
export function trackMetric(name: string, value: number, properties?: { [key: string]: string }): void {
  if (telemetryClient) {
    telemetryClient.trackMetric({
      name,
      value,
      properties,
    });
  }
}

/**
 * Track exception
 */
export function trackException(exception: Error, properties?: { [key: string]: string }): void {
  if (telemetryClient) {
    telemetryClient.trackException({
      exception,
      properties,
    });
  }
}

/**
 * Track dependency call
 */
export function trackDependency(
  name: string,
  data: string,
  duration: number,
  success: boolean,
  dependencyTypeName: string,
  properties?: { [key: string]: string }
): void {
  if (telemetryClient) {
    telemetryClient.trackDependency({
      name,
      data,
      duration,
      success,
      dependencyTypeName,
      properties,
    });
  }
}

/**
 * Track trace/log message
 */
export function trackTrace(message: string, severity: appInsights.Contracts.SeverityLevel, properties?: { [key: string]: string }): void {
  if (telemetryClient) {
    telemetryClient.trackTrace({
      message,
      severity,
      properties,
    });
  }
}

/**
 * Express middleware for request tracking with custom properties
 */
export function requestTrackingMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Add custom properties to request
    if (telemetryClient) {
      const correlationContext = appInsights.getCorrelationContext();
      if (correlationContext) {
        correlationContext.customProperties.setProperty('tenantId', req.headers['x-tenant-id'] as string || 'unknown');
        correlationContext.customProperties.setProperty('userId', (req as any).userId || 'anonymous');
        correlationContext.customProperties.setProperty('serviceName', serviceName);
      }
    }

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // Track custom metrics for response time
      trackMetric('request_duration_ms', duration, {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode.toString(),
      });

      // Track slow requests
      if (duration > 5000) {
        trackEvent('slow_request', {
          path: req.path,
          method: req.method,
          duration: duration.toString(),
          statusCode: res.statusCode.toString(),
        });
      }

      // Track errors
      if (res.statusCode >= 400) {
        trackEvent('request_error', {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode.toString(),
          duration: duration.toString(),
        });
      }
    });

    next();
  };
}

/**
 * Express error handling middleware
 */
export function errorTrackingMiddleware(serviceName: string) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    trackException(error, {
      path: req.path,
      method: req.method,
      serviceName,
      tenantId: req.headers['x-tenant-id'] as string || 'unknown',
    });

    next(error);
  };
}

/**
 * Flush telemetry (useful before shutdown)
 */
export function flushTelemetry(): Promise<void> {
  return new Promise((resolve) => {
    if (telemetryClient) {
      telemetryClient.flush({
        callback: () => {
          resolve();
        },
      });
    } else {
      resolve();
    }
  });
}

/**
 * Shutdown Application Insights
 */
export async function shutdownInsights(): Promise<void> {
  if (telemetryClient) {
    await flushTelemetry();
    appInsights.dispose();
    telemetryClient = null;
  }
}

// Export severity levels for convenience
export const SeverityLevel = appInsights.Contracts.SeverityLevel;
