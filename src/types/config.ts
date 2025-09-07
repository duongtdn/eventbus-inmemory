/**
 * Configuration Type Definitions
 *
 * Configuration interfaces for the event bus and related components.
 */

import { LoggerPlugin } from '../logger';

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  logger?: LoggerPlugin;
  validator?: any; // Allow any validator implementation for testing flexibility
}

/**
 * JSON Schema validation configuration
 */
export interface JsonSchemaConfig {
  enabled: boolean;
  schemas: Record<string, any>;
  strictMode?: boolean;
}
