/**
 * Event Enrichment Service
 *
 * Responsible for enriching events with required metadata like eventId,
 * timestamp, version, and default metadata fields.
 */

import { randomUUID } from 'crypto';
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
   */
  private generateEventId(): string {
    return randomUUID();
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
