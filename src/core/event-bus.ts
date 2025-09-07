/**
 * Event Bus Core Implementation
 *
 * In-memory event bus with subscription management and validation
 */

import { EventBusConfig } from '../types/config';
import { Subscription, SubscriptionConfig } from '../types/subscriptions';
import { EventHandler, EventContext } from '../types/handlers';
import { BasicEvent } from '../types/events';
import { LoggerPlugin, ConsoleLogger } from '../logger';
import { EventValidator } from '../validator';

// Configuration constants
const DEFAULT_CONFIG = {
  MAX_RETRIES: 0,
  RETRY_DELAY: 0,
  ENABLE_LOGGING: true
} as const;

// Validation limits
const LIMITS = {
  MAX_RETRIES: 100,
  MAX_RETRY_DELAY: 300_000, // 5 minutes in milliseconds
} as const;

// Internal constants
const SUBSCRIPTION_ID_PREFIX = 'sub_';

/**
 * Validator interface for flexible testing
 */
interface ValidatorLike {
  validate?(event: unknown): Promise<any> | any;
  [key: string]: any;
}

/**
 * Internal configuration interface with required fields
 */
interface InternalEventBusConfig {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly enableLogging: boolean;
  readonly logger: LoggerPlugin;
  readonly validator: ValidatorLike;
}

/**
 * Main EventBus class implementing in-memory pub/sub pattern
 */
export class EventBus {
  private readonly config: InternalEventBusConfig;
  private readonly subscriptions: Map<string, Subscription[]> = new Map();
  private subscriptionCounter = 0;

  constructor(userConfig?: EventBusConfig) {
    try {
      this.config = this.buildConfiguration(userConfig);
    } catch (error) {
      throw this.wrapInitializationError(error);
    }
  }

  /**
   * Subscribe to events matching a pattern
   * @param pattern Event pattern to match
   * @param handler Event handler function
   * @returns Promise resolving to subscription handle
   */
  async subscribe(pattern: string, handler: EventHandler): Promise<Subscription> {
    this.validateSubscriptionInput(pattern, handler);

    const subscription = this.createSubscription(pattern, handler);
    this.storeSubscription(subscription);

    return subscription;
  }

  /**
   * Unsubscribe from events
   * @param subscription Subscription to remove
   * @returns Promise resolving to success status
   */
  async unsubscribe(subscription: Subscription): Promise<boolean> {
    const subscriptionsForPattern = this.subscriptions.get(subscription.pattern);
    if (!subscriptionsForPattern) {
      return false;
    }

    const removed = this.removeSubscriptionFromPattern(subscriptionsForPattern, subscription.id);
    if (removed && subscriptionsForPattern.length === 0) {
      this.subscriptions.delete(subscription.pattern);
    }

    return removed;
  }

  /**
   * Get total number of active subscriptions
   */
  getSubscriptionCount(): number {
    return Array.from(this.subscriptions.values())
      .reduce((total, subscriptions) => total + subscriptions.length, 0);
  }

  /**
   * Check if any subscriptions exist
   */
  hasSubscriptions(): boolean {
    return this.subscriptions.size > 0;
  }

  /**
   * Get the logger instance
   */
  getLogger(): LoggerPlugin {
    return this.config.logger;
  }

  /**
   * Get the validator instance
   */
  getValidator(): ValidatorLike {
    return this.config.validator;
  }

  /**
   * Get a copy of the configuration to prevent external modification
   */
  getConfig(): InternalEventBusConfig {
    return { ...this.config };
  }

  // Private helper methods

  /**
   * Build and validate the complete configuration
   */
  private buildConfiguration(userConfig?: EventBusConfig): InternalEventBusConfig {
    const mergedConfig = this.mergeWithDefaults(userConfig || {});
    this.validateConfiguration(mergedConfig);
    this.validateLogger(mergedConfig.logger);
    return mergedConfig;
  }

  /**
   * Merge user configuration with sensible defaults
   */
  private mergeWithDefaults(userConfig: EventBusConfig): InternalEventBusConfig {
    return {
      maxRetries: userConfig.maxRetries ?? DEFAULT_CONFIG.MAX_RETRIES,
      retryDelay: userConfig.retryDelay ?? DEFAULT_CONFIG.RETRY_DELAY,
      enableLogging: userConfig.enableLogging ?? DEFAULT_CONFIG.ENABLE_LOGGING,
      logger: userConfig.logger || new ConsoleLogger(),
      validator: userConfig.validator || new EventValidator()
    };
  }

  /**
   * Validate configuration values against business rules
   */
  private validateConfiguration(config: InternalEventBusConfig): void {
    this.validateNonNegative('Max retries', config.maxRetries);
    this.validateNonNegative('Retry delay', config.retryDelay);
    this.validateWithinLimits('Max retries', config.maxRetries, LIMITS.MAX_RETRIES);
    this.validateWithinLimits('Retry delay', config.retryDelay, LIMITS.MAX_RETRY_DELAY, 'ms');
  }

  /**
   * Validate that a numeric value is non-negative
   */
  private validateNonNegative(fieldName: string, value: number): void {
    if (value < 0) {
      throw new Error(`${fieldName} must be non-negative, got: ${value}`);
    }
  }

  /**
   * Validate that a value is within acceptable limits
   */
  private validateWithinLimits(fieldName: string, value: number, limit: number, unit = ''): void {
    if (value > limit) {
      const unitSuffix = unit ? unit : '';
      throw new Error(
        `${fieldName} exceeds maximum allowed value of ${limit}${unitSuffix}, got: ${value}${unitSuffix}`
      );
    }
  }

  /**
   * Validate logger implements required interface
   */
  private validateLogger(logger: LoggerPlugin): void {
    const requiredMethods = ['info', 'warn', 'error', 'fatal', 'debug'] as const;
    const missingMethods = requiredMethods.filter(method =>
      typeof logger[method] !== 'function'
    );

    if (missingMethods.length > 0) {
      throw new Error(`Logger must implement all required methods: ${requiredMethods.join(', ')}`);
    }
  }

  /**
   * Validate subscription input parameters
   */
  private validateSubscriptionInput(pattern: string, handler: EventHandler): void {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string');
    }

    if (!handler || typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
  }

  /**
   * Create a new subscription object
   */
  private createSubscription(pattern: string, handler: EventHandler): Subscription {
    return {
      id: this.generateSubscriptionId(),
      pattern,
      handler,
      config: {}
    };
  }

  /**
   * Generate a unique subscription identifier
   */
  private generateSubscriptionId(): string {
    return `${SUBSCRIPTION_ID_PREFIX}${++this.subscriptionCounter}`;
  }

  /**
   * Store subscription in the registry
   */
  private storeSubscription(subscription: Subscription): void {
    const pattern = subscription.pattern;
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, []);
    }
    this.subscriptions.get(pattern)!.push(subscription);
  }

  /**
   * Remove a subscription from a pattern's subscription list
   */
  private removeSubscriptionFromPattern(subscriptions: Subscription[], subscriptionId: string): boolean {
    const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
    if (index === -1) {
      return false;
    }
    subscriptions.splice(index, 1);
    return true;
  }

  /**
   * Wrap initialization errors with context
   */
  private wrapInitializationError(error: unknown): Error {
    if (error instanceof Error) {
      return new Error(`Failed to initialize EventBus: ${error.message}`);
    }
    return new Error('Failed to initialize EventBus: Unknown error occurred');
  }
}
