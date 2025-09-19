/**
 * Event Enrichment Service
 *
 * Responsible for enriching events with required metadata like eventId,
 * timestamp, version, and default metadata fields.
 */

import { BasicEvent, Priority } from '../types/events';

/**
 * Service for enriching events with required metadata
 */
export class EventEnrichmentService {
  /**
   * Enrich event with required metadata (eventId, timestamp, version, metadata)
   * @param event Partial event to enrich
   * @returns Fully enriched event
   */
  enrich<T extends BasicEvent>(event: Partial<T>): T {
    const enriched = { ...event } as T;

    this.enrichEventId(enriched);
    this.enrichTimestamp(enriched);
    this.enrichVersion(enriched);
    this.enrichMetadata(enriched);

    return enriched;
  }

  /**
   * Generate eventId if not provided
   */
  private enrichEventId<T extends BasicEvent>(event: T): void {
    if (!event.eventId) {
      event.eventId = this.generateEventId();
    }
  }

  /**
   * Generate UUID v4 for event identification
   * Works in both Node.js and browser environments
   */
  private generateEventId(): string {
    // Browser environment - use Web Crypto API
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    // Node.js environment - dynamically import crypto module
    if (typeof require !== 'undefined') {
      try {
        const { randomUUID } = require('crypto');
        return randomUUID();
      } catch (error) {
        // Fallback if crypto module is not available
      }
    }

    // Fallback implementation using Math.random (less secure but functional)
    return this.generateFallbackUUID();
  }

  /**
   * Fallback UUID v4 implementation using Math.random
   * Note: This is less cryptographically secure than crypto.randomUUID()
   */
  private generateFallbackUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate timestamp if not provided
   */
  private enrichTimestamp<T extends BasicEvent>(event: T): void {
    if (!event.timestamp) {
      event.timestamp = this.generateTimestamp();
    }
  }

  /**
   * Generate ISO 8601 timestamp for current time
   */
  private generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Set default version if not provided
   */
  private enrichVersion<T extends BasicEvent>(event: T): void {
    if (!event.version) {
      event.version = '1.0';
    }
  }

  /**
   * Initialize or merge metadata with defaults
   */
  private enrichMetadata<T extends BasicEvent>(event: T): void {
    if (!event.metadata) {
      event.metadata = {};
    }

    this.setDefaultPriority(event);
    this.initializeRetryCount(event);
  }

  /**
   * Set default priority if not specified
   */
  private setDefaultPriority<T extends BasicEvent>(event: T): void {
    if (!event.metadata!.priority) {
      event.metadata!.priority = Priority.NORMAL;
    }
  }

  /**
   * Initialize retryCount if not specified
   */
  private initializeRetryCount<T extends BasicEvent>(event: T): void {
    if (event.metadata!.retryCount === undefined) {
      event.metadata!.retryCount = 0;
    }
  }
}
