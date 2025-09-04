/**
 * Subscription Type Definitions
 *
 * Types and interfaces for event subscriptions and their configuration.
 */

import type { Priority } from './events';
import type { EventHandler } from './handlers';

/**
 * Configuration options for subscriptions
 */
export interface SubscriptionConfig {
  maxRetries?: number;
  retryDelay?: number;
  priority?: Priority;
  [key: string]: any;
}

/**
 * Subscription configuration
 */
export interface Subscription {
  id: string;
  pattern: string;
  handler: EventHandler;
  config?: SubscriptionConfig;
}
