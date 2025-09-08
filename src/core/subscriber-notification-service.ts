/**
 * Subscriber Notification Service
 *
 * Responsible for notifying subscribers about published events,
 * handling timeouts, retries, and error isolation.
 */

import { BasicEvent } from '../types/events';
import { Subscription } from '../types/subscriptions';
import { PublishConfig, PublishResult } from '../types/results';
import { EventHandler, EventContext } from '../types/handlers';
import { LoggerPlugin } from '../logger';
import { TimeoutError } from '../types/validation';

/**
 * Configuration for the notification service
 */
export interface NotificationServiceConfig {
  maxRetries: number;
  retryDelay: number;
  logger: LoggerPlugin;
  enableLogging: boolean;
}

/**
 * Service for managing subscriber notifications
 */
export class SubscriberNotificationService {
  constructor(private readonly config: NotificationServiceConfig) {}

  /**
   * Notify all subscribers about an event
   * @param event The event to notify about
   * @param subscriptions List of matching subscriptions
   * @param publishConfig Optional publish configuration
   * @returns Publish result with statistics
   */
  async notify(
    event: BasicEvent,
    subscriptions: Subscription[],
    publishConfig?: PublishConfig
  ): Promise<PublishResult> {
    const publishedAt = new Date();

    if (this.config.enableLogging) {
      await this.config.logger.info(`Publishing event: ${event.eventType}`, {
        eventId: event.eventId,
        subscriberCount: subscriptions.length
      });
    }

    if (subscriptions.length === 0) {
      return this.createResult(event, publishedAt, [], [], 0);
    }

    const executionPromises = this.createExecutionPromises(event, subscriptions);
    const results = await this.executeWithOptionalTimeout(executionPromises, publishConfig, event, subscriptions.length);

    return this.createResultFromExecutions(event, publishedAt, results);
  }

  /**
   * Create execution promises for all subscriptions
   */
  private createExecutionPromises(
    event: BasicEvent,
    subscriptions: Subscription[]
  ): Promise<HandlerExecutionResult>[] {
    return subscriptions.map(subscription =>
      this.executeHandlerWithRetry(event, subscription)
        .then(() => ({ subscriptionId: subscription.id, success: true, retryCount: 0 }))
        .catch((error) => ({
          subscriptionId: subscription.id,
          success: false,
          error,
          retryCount: this.config.maxRetries
        }))
    );
  }

  /**
   * Execute promises with optional timeout
   */
  private async executeWithOptionalTimeout(
    promises: Promise<HandlerExecutionResult>[],
    publishConfig: PublishConfig | undefined,
    event: BasicEvent,
    totalSubscribers: number
  ): Promise<HandlerExecutionResult[]> {
    if (publishConfig?.timeout) {
      return this.executeWithTimeout(promises, publishConfig.timeout, event, totalSubscribers);
    } else {
      return Promise.all(promises);
    }
  }

  /**
   * Execute promises with timeout enforcement
   */
  private async executeWithTimeout(
    promises: Promise<HandlerExecutionResult>[],
    timeoutMs: number,
    event: BasicEvent,
    totalSubscribers: number
  ): Promise<HandlerExecutionResult[]> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(
          event.eventId,
          timeoutMs,
          0, // In this simple implementation, we don't track partial completion
          totalSubscribers
        ));
      }, timeoutMs);
    });

    try {
      return await Promise.race([Promise.all(promises), timeoutPromise]);
    } catch (error) {
      if (error instanceof TimeoutError) {
        if (this.config.enableLogging) {
          await this.config.logger.warn(`Event publish timed out: ${event.eventType}`, {
            eventId: event.eventId,
            timeoutMs,
            totalSubscribers
          });
        }
        throw error;
      }
      throw error;
    }
  }

  /**
   * Execute a handler with retry logic
   */
  private async executeHandlerWithRetry(event: BasicEvent, subscription: Subscription): Promise<void> {
    const context: EventContext = {
      subscription: {
        id: subscription.id,
        pattern: subscription.pattern
      },
      attempt: 1,
      timestamp: new Date().toISOString()
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        context.attempt = attempt + 1;
        await subscription.handler(event, context);

        if (this.config.enableLogging && attempt > 0) {
          await this.config.logger.info(`Handler succeeded after ${attempt} retries`, {
            eventId: event.eventId,
            subscriptionId: subscription.id,
            attempt: context.attempt
          });
        }

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Handler execution failed');

        if (this.config.enableLogging) {
          await this.config.logger.warn(`Handler failed attempt ${attempt + 1}`, {
            eventId: event.eventId,
            subscriptionId: subscription.id,
            error: lastError.message,
            attempt: context.attempt
          });
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.config.maxRetries && this.config.retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    // Log final failure
    if (this.config.enableLogging) {
      await this.config.logger.error(`Handler failed after all retries`, lastError!, {
        eventId: event.eventId,
        subscriptionId: subscription.id,
        maxRetries: this.config.maxRetries
      });
    }

    throw lastError;
  }

  /**
   * Create result from execution outcomes
   */
  private createResultFromExecutions(
    event: BasicEvent,
    publishedAt: Date,
    results: HandlerExecutionResult[]
  ): PublishResult {
    const failedHandlers = results
      .filter(result => !result.success)
      .map(result => result.subscriptionId);

    const totalRetries = results
      .reduce((sum, result) => sum + (result.retryCount || 0), 0);

    return this.createResult(event, publishedAt, results, failedHandlers, totalRetries);
  }

  /**
   * Create standardized PublishResult
   */
  private createResult(
    event: BasicEvent,
    publishedAt: Date,
    results: HandlerExecutionResult[],
    failedHandlers: string[],
    totalRetries: number
  ): PublishResult {
    return {
      eventId: event.eventId,
      success: failedHandlers.length === 0,
      publishedAt,
      subscribersNotified: results.length,
      failedHandlers: failedHandlers.length > 0 ? failedHandlers : [],
      totalRetries: totalRetries > 0 ? totalRetries : undefined
    };
  }
}

/**
 * Result of executing a single handler
 */
interface HandlerExecutionResult {
  subscriptionId: string;
  success: boolean;
  error?: Error;
  retryCount?: number;
}
