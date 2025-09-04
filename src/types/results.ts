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
 * Result of publishing an event
 */
export interface PublishResult {
  eventId: string;
  success: boolean;
  handlerResults: HandlerResult[];
  errors?: Error[];
}
