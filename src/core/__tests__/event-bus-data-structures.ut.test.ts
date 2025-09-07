import { EventBus } from '../event-bus'
import { EventBusConfig } from '../../types'

// Create minimal test doubles
const createMockLogger = () => ({
  info: jest.fn().mockResolvedValue(undefined),
  warn: jest.fn().mockResolvedValue(undefined),
  error: jest.fn().mockResolvedValue(undefined),
  fatal: jest.fn().mockResolvedValue(undefined),
  debug: jest.fn().mockResolvedValue(undefined)
})

describe('EventBus Core Data Structures & State Management Tests', () => {
  let mockLogger: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger = createMockLogger()
  })

  describe('Subscription Registry Management', () => {
    it('should initialize empty subscription registry with proper structure', () => {
      // Act
      const eventBus = new EventBus({ logger: mockLogger })

      // Assert - Test initial state setup logic
      const subscriptionCount = eventBus.getSubscriptionCount()
      expect(subscriptionCount).toBe(0)

      // Test registry data structure initialization
      const isEmpty = eventBus.hasSubscriptions()
      expect(isEmpty).toBe(false)
    })

    it('should maintain subscription registry consistency during concurrent access', async () => {
      // Arrange
      const eventBus = new EventBus({ logger: mockLogger })
      const pattern = 'test.*'
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      // Act - Simulate concurrent subscription operations
      const subscriptionPromises = [
        eventBus.subscribe(pattern, handler1),
        eventBus.subscribe(pattern, handler2)
      ]

      const subscriptions = await Promise.all(subscriptionPromises)

      // Assert - Test concurrency handling and state management logic
      expect(subscriptions).toHaveLength(2)
      expect(subscriptions[0].id).not.toBe(subscriptions[1].id)
      expect(subscriptions[0].pattern).toBe(pattern)
      expect(subscriptions[1].pattern).toBe(pattern)

      // Verify registry consistency
      const subscriptionCount = eventBus.getSubscriptionCount()
      expect(subscriptionCount).toBe(2)
    })

    it('should maintain proper references between components', () => {
      // Arrange
      const config: EventBusConfig = {
        logger: mockLogger,
        maxRetries: 3
      }

      // Act
      const eventBus = new EventBus(config)

      // Assert - Test component wiring logic
      const logger = eventBus.getLogger()
      const validator = eventBus.getValidator()
      const busConfig = eventBus.getConfig()

      expect(logger).toBe(mockLogger)
      expect(validator).toBeDefined()
      expect(busConfig).toBeDefined()

      // Test: circular references are avoided - none of these should reference eventBus
      expect(logger).not.toHaveProperty('eventBus')
      expect(validator).not.toHaveProperty('eventBus')
      expect(busConfig).not.toHaveProperty('eventBus')
    })

    it('should handle registry modifications safely', async () => {
      // Arrange
      const eventBus = new EventBus({ logger: mockLogger })
      const pattern = 'user.*'
      const handler = jest.fn()

      // Act - Add subscription then remove it
      const subscription = await eventBus.subscribe(pattern, handler)
      const beforeRemoval = eventBus.getSubscriptionCount()

      const removed = await eventBus.unsubscribe(subscription)
      const afterRemoval = eventBus.getSubscriptionCount()

      // Assert - Test state management during modifications
      expect(beforeRemoval).toBe(1)
      expect(removed).toBe(true)
      expect(afterRemoval).toBe(0)
    })

    it('should preserve registry state integrity after failed operations', async () => {
      // Arrange
      const eventBus = new EventBus({ logger: mockLogger })
      const validHandler = jest.fn()
      const invalidHandler = null as any

      // Act - Mix valid and invalid operations
      const validSubscription = await eventBus.subscribe('valid.*', validHandler)

      let failedSubscription: any
      try {
        failedSubscription = await eventBus.subscribe('invalid.*', invalidHandler)
      } catch (error) {
        // Expected to fail
      }

      // Assert - Test registry remains consistent after failures
      const subscriptionCount = eventBus.getSubscriptionCount()
      expect(subscriptionCount).toBe(1)
      expect(validSubscription).toBeDefined()
      expect(failedSubscription).toBeUndefined()
    })
  })
})
