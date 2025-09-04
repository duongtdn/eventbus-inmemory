/**
 * Configuration Type Definitions
 *
 * Configuration interfaces for the event bus and related components.
 */

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  [key: string]: any;
}

/**
 * JSON Schema validation configuration
 */
export interface JsonSchemaConfig {
  enabled: boolean;
  schemas: Record<string, any>;
  strictMode?: boolean;
}
