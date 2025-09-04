/**
 * Event Type Definitions
 *
 * Core event structures and metadata types for the event bus system.
 */

/**
 * Priority levels for events
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Metadata associated with an event
 */
export interface EventMetadata {
  retryCount?: number;
  priority?: Priority | string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Basic event structure that all events must conform to
 */
export interface BasicEvent<T = Record<string, any>> {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  version: string;
  data: T;
  correlationId?: string;
  metadata?: EventMetadata;
}
