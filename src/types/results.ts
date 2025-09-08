/**
 * Result Type Definitions
 *
 * Types for operation results and response handling.
 */

/**
 * Result of a single handler execution
 */
export interface HandlerResult {
  subscriptionId: string;
  success: boolean;
  error?: Error;
  executionTime: number;
}

/**
 * Configuration for publish operations
 */
export interface PublishConfig {
  /** Timeout in milliseconds for all handlers to complete (default: no timeout) */
  timeout?: number;
}

/**
 * Result of publishing an event
 */
export interface PublishResult {
  eventId: string;
  success: boolean;
  publishedAt: Date;
  subscribersNotified: number;
  /** Handlers that failed after all retries */
  failedHandlers?: string[];
  /** Total retry attempts across all handlers */
  totalRetries?: number;
  handlerResults?: HandlerResult[];
  errors?: Error[];
}
