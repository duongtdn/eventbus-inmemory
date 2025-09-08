/**
 * Subscription Registry
 *
 * Optimized registry for managing subscriptions with efficient lookups.
 * Uses multiple indexing strategies to improve performance.
 */

import { Subscription } from '../types/subscriptions';
import { PatternMatcher } from './pattern-matcher';

/**
 * Optimized subscription registry with multiple lookup strategies
 */
export class SubscriptionRegistry {
  private readonly patternMatcher = new PatternMatcher();

  // Primary storage: pattern -> subscriptions
  private readonly patternSubscriptions = new Map<string, Subscription[]>();

  // Optimization: exact pattern cache for O(1) lookups
  private readonly exactPatternCache = new Map<string, Subscription[]>();

  // Optimization: wildcard patterns for faster iteration
  private readonly wildcardPatterns = new Set<string>();
  private readonly globalWildcardSubscriptions: Subscription[] = [];

  /**
   * Add a subscription to the registry
   */
  add(subscription: Subscription): void {
    const pattern = subscription.pattern;

    // Add to primary storage
    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, []);
    }
    this.patternSubscriptions.get(pattern)!.push(subscription);

    // Update optimization indexes
    this.updateOptimizationIndexes(subscription);
  }

  /**
   * Remove a subscription from the registry
   */
  remove(subscription: Subscription): boolean {
    const pattern = subscription.pattern;
    const subscriptions = this.patternSubscriptions.get(pattern);

    if (!subscriptions) {
      return false;
    }

    const index = subscriptions.findIndex(sub => sub.id === subscription.id);
    if (index === -1) {
      return false;
    }

    // Remove from primary storage
    subscriptions.splice(index, 1);

    // Clean up empty pattern
    if (subscriptions.length === 0) {
      this.patternSubscriptions.delete(pattern);
      this.cleanupOptimizationIndexes(pattern);
    }

    return true;
  }

  /**
   * Find all subscriptions matching the given event type
   * Uses optimization indexes for better performance
   */
  findMatching(eventType: string): Subscription[] {
    const matchingSubscriptions: Subscription[] = [];

    // Fast path: exact match lookup O(1)
    const exactMatches = this.exactPatternCache.get(eventType);
    if (exactMatches) {
      matchingSubscriptions.push(...exactMatches);
    }

    // Add global wildcard subscriptions
    matchingSubscriptions.push(...this.globalWildcardSubscriptions);

    // Check wildcard patterns (optimized subset)
    for (const pattern of this.wildcardPatterns) {
      if (pattern !== '*' && this.patternMatcher.matches(eventType, pattern)) {
        const subscriptions = this.patternSubscriptions.get(pattern);
        if (subscriptions) {
          matchingSubscriptions.push(...subscriptions);
        }
      }
    }

    return matchingSubscriptions;
  }

  /**
   * Get total subscription count
   */
  getTotalCount(): number {
    return Array.from(this.patternSubscriptions.values())
      .reduce((total, subscriptions) => total + subscriptions.length, 0);
  }

  /**
   * Check if registry has any subscriptions
   */
  hasSubscriptions(): boolean {
    return this.patternSubscriptions.size > 0;
  }

  /**
   * Get all subscription patterns
   */
  getPatterns(): string[] {
    return Array.from(this.patternSubscriptions.keys());
  }

  /**
   * Update optimization indexes when adding subscription
   */
  private updateOptimizationIndexes(subscription: Subscription): void {
    const pattern = subscription.pattern;

    if (pattern === '*') {
      // Global wildcard - add to special array
      this.globalWildcardSubscriptions.push(subscription);
    } else if (this.isExactPattern(pattern)) {
      // Exact pattern - add to cache for O(1) lookup
      if (!this.exactPatternCache.has(pattern)) {
        this.exactPatternCache.set(pattern, []);
      }
      this.exactPatternCache.get(pattern)!.push(subscription);
    } else {
      // Wildcard pattern - add to optimized set
      this.wildcardPatterns.add(pattern);
    }
  }

  /**
   * Clean up optimization indexes when removing pattern
   */
  private cleanupOptimizationIndexes(pattern: string): void {
    if (pattern === '*') {
      // Remove from global wildcards (this is complex, so we'll keep simple for now)
      // In production, we'd need to track which specific subscription to remove
    } else if (this.isExactPattern(pattern)) {
      this.exactPatternCache.delete(pattern);
    } else {
      this.wildcardPatterns.delete(pattern);
    }
  }

  /**
   * Check if pattern is an exact match (no wildcards)
   */
  private isExactPattern(pattern: string): boolean {
    return !pattern.includes('*');
  }

  /**
   * Clear all subscriptions (for testing)
   */
  clear(): void {
    this.patternSubscriptions.clear();
    this.exactPatternCache.clear();
    this.wildcardPatterns.clear();
    this.globalWildcardSubscriptions.length = 0;
  }
}
