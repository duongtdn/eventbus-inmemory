/**
 * Event Handler Type Definitions
 *
 * Types and interfaces for event handlers and execution context.
 */

import type { BasicEvent } from './events';

/**
 * Context provided to event handlers
 */
export interface EventContext {
  subscription: {
    id: string;
    pattern: string;
  };
  attempt: number;
  timestamp: string;
  [key: string]: any;
}

/**
 * Event handler function signature
 */
export type EventHandler<T = any> = (event: BasicEvent<T>, context: EventContext) => Promise<void> | void;
