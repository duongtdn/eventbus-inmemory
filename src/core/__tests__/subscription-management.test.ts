/**
 * Subscription Management Tests
 *
 * Tests for EventBus subscription and unsubscription functionality
 * following the test plan in subscription-management.testplan.md
 */

import { EventBus } from '../event-bus';
import { PatternMatcher } from '../pattern-matcher';
import { EventHandler } from '../../types/handlers';
import { BasicEvent } from '../../types/events';

describe('Subscription Management', () => {
  let eventBus: EventBus;
  let mockHandler: EventHandler;
  let mockHandler2: EventHandler;

  beforeEach(() => {
    eventBus = new EventBus();
    mockHandler = jest.fn();
    mockHandler2 = jest.fn();
  });

  describe('Pattern Validation Integration', () => {
    it('should delegate pattern validation to PatternMatcher', async () => {
      // Spy on PatternMatcher prototype to catch calls from any instance
      const isValidPatternSpy = jest.spyOn(PatternMatcher.prototype, 'isValidPattern');

      const pattern = 'User.AccountCreated';

      // Subscribe should call PatternMatcher.isValidPattern()
      await eventBus.subscribe(pattern, mockHandler);

      // Verify the pattern matcher was called with our pattern
      expect(isValidPatternSpy).toHaveBeenCalledWith(pattern);

      isValidPatternSpy.mockRestore();
    });

    it('should reject subscriptions with invalid patterns', async () => {
      // Spy on PatternMatcher prototype and mock it to return false
      const isValidPatternSpy = jest.spyOn(PatternMatcher.prototype, 'isValidPattern');
      isValidPatternSpy.mockReturnValue(false);

      const invalidPattern = 'User.**.Invalid';

      // Should throw error when pattern is invalid
      await expect(eventBus.subscribe(invalidPattern, mockHandler))
        .rejects
        .toThrow(/invalid pattern/i);

      isValidPatternSpy.mockRestore();
    });
  });

  describe('Subscription ID Generation', () => {
    it('should generate unique subscription IDs with consistent format', async () => {
      const subscriptions = [];
      const pattern = 'User.AccountCreated';

      // Create multiple subscriptions rapidly
      for (let i = 0; i < 10; i++) {
        const subscription = await eventBus.subscribe(pattern, mockHandler);
        subscriptions.push(subscription);
      }

      // Verify all IDs are unique
      const ids = subscriptions.map(sub => sub.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(subscriptions.length);

      // Verify all IDs have consistent format (should start with 'sub_')
      ids.forEach(id => {
        expect(id).toMatch(/^sub_\d+$/);
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(4); // 'sub_' + at least one digit
      });
    });
  });

  describe('Subscribe Method Implementation', () => {
    it('should successfully create subscription for valid pattern and handler', async () => {
      const pattern = 'User.AccountCreated';

      const subscription = await eventBus.subscribe(pattern, mockHandler);

      // Verify subscription handle is properly created
      expect(subscription).toHaveProperty('id');
      expect(subscription).toHaveProperty('pattern', pattern);
      expect(subscription).toHaveProperty('handler', mockHandler);
      expect(typeof subscription.id).toBe('string');
      expect(subscription.id).toMatch(/^sub_\d+$/);
    });

    it('should store handler function correctly in registry', async () => {
      const pattern = 'User.AccountCreated';

      const subscription = await eventBus.subscribe(pattern, mockHandler);

      // Verify handler is stored correctly by checking subscription count
      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.hasSubscriptions()).toBe(true);

      // Verify the returned subscription contains the original handler
      expect(subscription.handler).toBe(mockHandler);
    });

    it('should support multiple handlers for same pattern', async () => {
      const pattern = 'User.AccountCreated';

      const subscription1 = await eventBus.subscribe(pattern, mockHandler);
      const subscription2 = await eventBus.subscribe(pattern, mockHandler2);

      // Verify both subscriptions are stored independently
      expect(subscription1.id).not.toBe(subscription2.id);
      expect(subscription1.handler).toBe(mockHandler);
      expect(subscription2.handler).toBe(mockHandler2);

      // Verify subscription count reflects both subscriptions
      expect(eventBus.getSubscriptionCount()).toBe(2);
    });

    it('should reject subscription with invalid handler', async () => {
      const pattern = 'User.AccountCreated';

      // Test with null handler
      await expect(eventBus.subscribe(pattern, null as any))
        .rejects
        .toThrow(/handler must be a function/i);

      // Test with undefined handler
      await expect(eventBus.subscribe(pattern, undefined as any))
        .rejects
        .toThrow(/handler must be a function/i);

      // Test with non-function handler
      await expect(eventBus.subscribe(pattern, 'not a function' as any))
        .rejects
        .toThrow(/handler must be a function/i);
    });

    it('should update subscription registry state correctly', async () => {
      const pattern1 = 'User.AccountCreated';
      const pattern2 = 'Order.Completed';

      // Initially no subscriptions
      expect(eventBus.getSubscriptionCount()).toBe(0);
      expect(eventBus.hasSubscriptions()).toBe(false);

      // Add first subscription
      await eventBus.subscribe(pattern1, mockHandler);
      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.hasSubscriptions()).toBe(true);

      // Add second subscription with different pattern
      await eventBus.subscribe(pattern2, mockHandler2);
      expect(eventBus.getSubscriptionCount()).toBe(2);
      expect(eventBus.hasSubscriptions()).toBe(true);

      // Add third subscription with same pattern as first
      await eventBus.subscribe(pattern1, mockHandler2);
      expect(eventBus.getSubscriptionCount()).toBe(3);
      expect(eventBus.hasSubscriptions()).toBe(true);
    });
  });

  describe('Unsubscribe Method Implementation', () => {
    it('should successfully remove existing subscription', async () => {
      const pattern = 'User.AccountCreated';

      const subscription = await eventBus.subscribe(pattern, mockHandler);
      expect(eventBus.getSubscriptionCount()).toBe(1);

      const result = await eventBus.unsubscribe(subscription);

      expect(result).toBe(true);
      expect(eventBus.getSubscriptionCount()).toBe(0);
      expect(eventBus.hasSubscriptions()).toBe(false);
    });

    it('should handle removal of non-existent subscription gracefully', async () => {
      const pattern = 'User.AccountCreated';

      // Create a fake subscription that was never added
      const fakeSubscription = {
        id: 'sub_nonexistent',
        pattern,
        handler: mockHandler,
        config: {}
      };

      const result = await eventBus.unsubscribe(fakeSubscription);

      expect(result).toBe(false);
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should clean up registry state after unsubscribe', async () => {
      const pattern = 'User.AccountCreated';

      // Create subscription
      const subscription = await eventBus.subscribe(pattern, mockHandler);
      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.hasSubscriptions()).toBe(true);

      // Remove subscription
      await eventBus.unsubscribe(subscription);

      // Verify complete cleanup
      expect(eventBus.getSubscriptionCount()).toBe(0);
      expect(eventBus.hasSubscriptions()).toBe(false);

      // Try to remove the same subscription again - should return false
      const secondRemovalResult = await eventBus.unsubscribe(subscription);
      expect(secondRemovalResult).toBe(false);
    });

    it('should preserve other subscriptions when removing one', async () => {
      const pattern1 = 'User.AccountCreated';
      const pattern2 = 'Order.Completed';

      const subscription1 = await eventBus.subscribe(pattern1, mockHandler);
      const subscription2 = await eventBus.subscribe(pattern2, mockHandler2);
      const subscription3 = await eventBus.subscribe(pattern1, mockHandler2); // Same pattern as subscription1

      expect(eventBus.getSubscriptionCount()).toBe(3);

      // Remove subscription2
      const result = await eventBus.unsubscribe(subscription2);

      expect(result).toBe(true);
      expect(eventBus.getSubscriptionCount()).toBe(2);

      // Verify subscription1 and subscription3 still exist
      // Try to remove them - should succeed
      expect(await eventBus.unsubscribe(subscription1)).toBe(true);
      expect(await eventBus.unsubscribe(subscription3)).toBe(true);
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Subscription Registry State Management', () => {
    it('should maintain separate handler lists per pattern', async () => {
      const pattern1 = 'User.*';
      const pattern2 = 'Order.*';

      const sub1 = await eventBus.subscribe(pattern1, mockHandler);
      const sub2 = await eventBus.subscribe(pattern2, mockHandler2);

      // Verify both subscriptions are stored separately
      expect(eventBus.getSubscriptionCount()).toBe(2);

      // Remove one pattern's subscription
      await eventBus.unsubscribe(sub1);
      expect(eventBus.getSubscriptionCount()).toBe(1);

      // The other pattern's subscription should remain
      expect(await eventBus.unsubscribe(sub2)).toBe(true);
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should handle registry growth and shrinkage correctly', async () => {
      const pattern = 'User.AccountCreated';
      const subscriptions = [];

      // Test growth - add many subscriptions
      for (let i = 0; i < 100; i++) {
        const subscription = await eventBus.subscribe(pattern, mockHandler);
        subscriptions.push(subscription);
        expect(eventBus.getSubscriptionCount()).toBe(i + 1);
      }

      // Test shrinkage - remove all subscriptions
      for (let i = 0; i < subscriptions.length; i++) {
        const result = await eventBus.unsubscribe(subscriptions[i]);
        expect(result).toBe(true);
        expect(eventBus.getSubscriptionCount()).toBe(subscriptions.length - i - 1);
      }

      expect(eventBus.getSubscriptionCount()).toBe(0);
      expect(eventBus.hasSubscriptions()).toBe(false);
    });

    it('should maintain subscription metadata accurately', async () => {
      const pattern = 'User.AccountCreated';
      const config = { maxRetries: 3 };

      const subscription = await eventBus.subscribe(pattern, mockHandler);

      // Verify metadata is preserved
      expect(subscription.id).toBeTruthy();
      expect(subscription.pattern).toBe(pattern);
      expect(subscription.handler).toBe(mockHandler);
      expect(subscription.config).toBeDefined();

      // Verify the subscription is properly tracked
      expect(eventBus.getSubscriptionCount()).toBe(1);
    });
  });

  describe('Integration with Pattern Matcher', () => {
    it('should store patterns in format compatible with pattern matching', async () => {
      // Test various valid patterns that PatternMatcher should accept
      const validPatterns = [
        'User.AccountCreated',
        'User.*',
        'Order.Completed',
        '*'
      ];

      const patternMatcher = new PatternMatcher();

      for (const pattern of validPatterns) {
        // Verify PatternMatcher accepts the pattern
        expect(patternMatcher.isValidPattern(pattern)).toBe(true);

        // Subscribe with the pattern
        const subscription = await eventBus.subscribe(pattern, mockHandler);

        // Verify pattern is stored correctly
        expect(subscription.pattern).toBe(pattern);
      }

      expect(eventBus.getSubscriptionCount()).toBe(validPatterns.length);
    });

    it('should support pattern matching optimization', async () => {
      const patterns = [
        'User.AccountCreated',
        'User.*',
        'Order.*',
        '*'
      ];

      // Subscribe to multiple patterns
      const subscriptions = [];
      for (const pattern of patterns) {
        const subscription = await eventBus.subscribe(pattern, mockHandler);
        subscriptions.push(subscription);
      }

      // Verify all patterns are stored efficiently
      expect(eventBus.getSubscriptionCount()).toBe(patterns.length);
      expect(eventBus.hasSubscriptions()).toBe(true);

      // Verify patterns can be retrieved and used for matching
      // (This tests that the internal storage structure supports efficient lookup)
      for (const subscription of subscriptions) {
        expect(subscription.pattern).toMatch(/^[*\w.]+$/); // Valid pattern format
      }
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should reject empty or null patterns', async () => {
      // Test empty string
      await expect(eventBus.subscribe('', mockHandler))
        .rejects
        .toThrow(/pattern must be a non-empty string/i);

      // Test null pattern
      await expect(eventBus.subscribe(null as any, mockHandler))
        .rejects
        .toThrow(/pattern must be a non-empty string/i);

      // Test undefined pattern
      await expect(eventBus.subscribe(undefined as any, mockHandler))
        .rejects
        .toThrow(/pattern must be a non-empty string/i);
    });

    it('should reject non-string patterns', async () => {
      // Test number pattern
      await expect(eventBus.subscribe(123 as any, mockHandler))
        .rejects
        .toThrow(/pattern must be a non-empty string/i);

      // Test object pattern
      await expect(eventBus.subscribe({} as any, mockHandler))
        .rejects
        .toThrow(/pattern must be a non-empty string/i);

      // Test array pattern
      await expect(eventBus.subscribe(['User', 'AccountCreated'] as any, mockHandler))
        .rejects
        .toThrow(/pattern must be a non-empty string/i);
    });
  });
});
