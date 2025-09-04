/**
 * Base Event Schema Definition
 *
 * JSON Schema for validating base event structure according to design specifications.
 */

import { JsonSchema } from '../types/validation';

/**
 * Regular expression patterns used in schema validation
 */
export const VALIDATION_PATTERNS = {
  /**
   * Event type pattern: Context.EventName format (supports multiple dots)
   * Examples: User.Created, User.Account.Created, User-Account.Created
   */
  EVENT_TYPE: '^[a-zA-Z0-9][a-zA-Z0-9\\-]*(?:\\.[a-zA-Z0-9][a-zA-Z0-9\\-]*)+$',

  /**
   * Version pattern: major.minor format without leading zeros
   * Examples: 1.0, 2.15, 10.3
   */
  VERSION: '^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)$'
} as const;

/**
 * Metadata priority levels
 */
export const PRIORITY_LEVELS = ['low', 'normal', 'high', 'critical'] as const;

/**
 * Base event schema definition
 * This schema validates the core event structure as defined in the design document
 */
export const BASE_EVENT_SCHEMA: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['eventId', 'eventType', 'timestamp', 'source', 'version', 'data'],
  properties: {
    eventId: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for this event instance'
    },
    eventType: {
      type: 'string',
      pattern: VALIDATION_PATTERNS.EVENT_TYPE,
      description: 'Event type in Context.EventName format (supports multiple dots)'
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp when event was created'
    },
    source: {
      type: 'string',
      minLength: 1,
      description: 'Component or context that published the event'
    },
    version: {
      type: 'string',
      pattern: VALIDATION_PATTERNS.VERSION,
      description: 'Event schema version (major.minor without leading zeros)'
    },
    data: {
      type: 'object',
      description: 'Event-specific payload data'
    },
    correlationId: {
      type: 'string',
      description: 'Optional correlation ID for tracing related events - flexible string format'
    },
    metadata: {
      type: 'object',
      properties: {
        retryCount: {
          type: 'integer',
          minimum: 0
        },
        priority: {
          type: 'string',
          enum: PRIORITY_LEVELS
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      },
      additionalProperties: true
    }
  },
  additionalProperties: true
};
