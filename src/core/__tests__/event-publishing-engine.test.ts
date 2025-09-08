/**
 * Event Publishing Engine Tests
 * 
 * Tests for the core event publishing functionality including validation,
 * enrichment, pattern matching integration, and subscriber notification.
 */

import { EventBus } from '../event-bus'
import { EventBusConfig, BasicEvent, EventHandler, PublishConfig, PublishResult } from '../../types'
import { LoggerPlugin } from '../../logger'
import { TimeoutError } from '../../types/validation'

// Test utilities and mocks
const createMockValidator = () => ({
  validate: jest.fn()
})

const createMockLogger = (): jest.Mocked<LoggerPlugin> => ({
  info: jest.fn().mockResolvedValue(undefined),
  warn: jest.fn().mockResolvedValue(undefined),
  error: jest.fn().mockResolvedValue(undefined),
  fatal: jest.fn().mockResolvedValue(undefined),
  debug: jest.fn().mockResolvedValue(undefined)
})

const createValidEvent = (overrides: Partial<BasicEvent> = {}): Partial<BasicEvent> => ({
  eventType: 'User.AccountCreated',
  source: 'TestService',
  data: { userId: 'user-123', email: 'test@example.com' },
  ...overrides
})

const createInvalidEvent = (): any => ({
  eventType: 'User.AccountCreated',
  // Missing required fields: source, data
})

describe('Event Publishing Engine', () => {
  let eventBus: EventBus
  let mockValidator: any
  let mockLogger: jest.Mocked<LoggerPlugin>

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidator = createMockValidator()
    mockLogger = createMockLogger()
    
    const config: EventBusConfig = {
      validator: mockValidator,
      logger: mockLogger,
      maxRetries: 2,
      retryDelay: 100
    }
    
    eventBus = new EventBus(config)
  })

  describe('Core Event Publishing Logic', () => {
    describe('Event Validation Before Processing', () => {
      it('should validate event against schema before any processing', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - validation should be called before any other processing
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          eventType: event.eventType,
          source: event.source,
          data: event.data
        }))
      })

      it('should reject invalid events before processing or enrichment', async () => {
        // Arrange
        const invalidEvent = createInvalidEvent()
        const validationError = new Error('Missing required field: source')
        mockValidator.validate.mockRejectedValue(validationError)

        // Act & Assert
        await expect(eventBus.publish(invalidEvent)).rejects.toThrow('Missing required field: source')
        expect(mockValidator.validate).toHaveBeenCalled()
      })
    })

    describe('Event Enrichment Logic', () => {
      it('should enrich valid events with required metadata', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        const result = await eventBus.publish(event)

        // Assert - event should be enriched with required fields
        expect(result.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) // UUID v4
        expect(result.publishedAt).toBeInstanceOf(Date)
        expect(result.success).toBe(true)
        
        // The enriched event should have been validated with complete fields
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          eventId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), // ISO 8601
          version: '1.0',
          metadata: expect.objectContaining({
            retryCount: 0,
            priority: 'normal'
          })
        }))
      })

      it('should preserve existing event fields during enrichment', async () => {
        // Arrange
        const existingEventId = '123e4567-e89b-12d3-a456-426614174000'
        const existingCorrelationId = 'abc-123-def-456'
        const existingVersion = '2.1'
        const existingMetadata = { priority: 'high', tags: ['important'] }
        
        const event = createValidEvent({
          eventId: existingEventId,
          correlationId: existingCorrelationId,
          version: existingVersion,
          metadata: existingMetadata
        })
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        const result = await eventBus.publish(event)

        // Assert - existing fields should be preserved
        expect(result.eventId).toBe(existingEventId) // Should not be overwritten
        
        // Validate was called with preserved fields
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          eventId: existingEventId,
          correlationId: existingCorrelationId,
          version: existingVersion,
          metadata: expect.objectContaining({
            priority: 'high',
            tags: ['important'],
            retryCount: 0 // Should be added
          })
        }))
      })
    })

    describe('Subscriber Finding and Notification', () => {
      it('should find and notify all matching subscribers', async () => {
        // Arrange
        const event = createValidEvent({ eventType: 'User.AccountCreated' })
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const handler1 = jest.fn().mockResolvedValue(undefined)
        const handler2 = jest.fn().mockResolvedValue(undefined)
        const handler3 = jest.fn().mockResolvedValue(undefined)
        
        // Subscribe with different patterns that should all match
        await eventBus.subscribe('User.AccountCreated', handler1) // exact match
        await eventBus.subscribe('User.*', handler2) // prefix wildcard
        await eventBus.subscribe('*', handler3) // global wildcard

        // Act
        const result = await eventBus.publish(event)

        // Assert - all matching handlers should be called
        expect(handler1).toHaveBeenCalledWith(
          expect.objectContaining({ eventType: 'User.AccountCreated' }),
          expect.objectContaining({ subscription: expect.objectContaining({ pattern: 'User.AccountCreated' }) })
        )
        expect(handler2).toHaveBeenCalledWith(
          expect.objectContaining({ eventType: 'User.AccountCreated' }),
          expect.objectContaining({ subscription: expect.objectContaining({ pattern: 'User.*' }) })
        )
        expect(handler3).toHaveBeenCalledWith(
          expect.objectContaining({ eventType: 'User.AccountCreated' }),
          expect.objectContaining({ subscription: expect.objectContaining({ pattern: '*' }) })
        )
        
        expect(result.subscribersNotified).toBe(3)
        expect(result.success).toBe(true)
      })

      it('should handle subscriber notification failures gracefully', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const successHandler = jest.fn().mockResolvedValue(undefined)
        const failingHandler = jest.fn().mockRejectedValue(new Error('Handler processing error'))
        const anotherSuccessHandler = jest.fn().mockResolvedValue(undefined)
        
        await eventBus.subscribe('User.*', successHandler)
        await eventBus.subscribe('User.*', failingHandler)
        await eventBus.subscribe('*', anotherSuccessHandler)

        // Act
        const result = await eventBus.publish(event)

        // Assert - successful handlers should still execute despite one failure
        expect(successHandler).toHaveBeenCalled()
        expect(anotherSuccessHandler).toHaveBeenCalled()
        expect(failingHandler).toHaveBeenCalled()
        
        // Result should indicate partial success
        expect(result.subscribersNotified).toBe(3)
        expect(result.failedHandlers).toHaveLength(1)
        expect(result.success).toBe(false) // Should be false due to handler failure
      })

      it('should respect timeout configuration when specified', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const slowHandler1 = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 200))
        )
        const slowHandler2 = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 300))
        )
        
        await eventBus.subscribe('User.*', slowHandler1)
        await eventBus.subscribe('*', slowHandler2)

        const publishConfig: PublishConfig = { timeout: 150 }

        // Act & Assert
        await expect(eventBus.publish(event, publishConfig)).rejects.toThrow(TimeoutError)
        
        // Should still call handlers even though they timeout
        expect(slowHandler1).toHaveBeenCalled()
        expect(slowHandler2).toHaveBeenCalled()
      })

      it('should return accurate PublishResult with execution statistics', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const handler1 = jest.fn().mockResolvedValue(undefined)
        const handler2 = jest.fn().mockRejectedValue(new Error('Test error'))
        
        await eventBus.subscribe('User.*', handler1)
        await eventBus.subscribe('*', handler2)

        // Act
        const result = await eventBus.publish(event)

        // Assert - result should have accurate statistics
        expect(result.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        expect(result.success).toBe(false) // Due to handler2 failure
        expect(result.publishedAt).toBeInstanceOf(Date)
        expect(result.subscribersNotified).toBe(2)
        expect(result.failedHandlers).toHaveLength(1)
        expect(result.totalRetries).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Event Enrichment Service Logic', () => {
    describe('EventId Generation', () => {
      it('should generate valid UUID v4 format when eventId not provided', async () => {
        // Arrange
        const event = createValidEvent()
        delete (event as any).eventId
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        const result = await eventBus.publish(event)

        // Assert - should generate valid UUID v4
        expect(result.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          eventId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        }))
      })

      it('should preserve existing valid eventId', async () => {
        // Arrange
        const existingEventId = '123e4567-e89b-12d3-a456-426614174000'
        const event = createValidEvent({ eventId: existingEventId })
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        const result = await eventBus.publish(event)

        // Assert - should not overwrite existing eventId
        expect(result.eventId).toBe(existingEventId)
      })
    })

    describe('Timestamp Generation', () => {
      it('should generate valid ISO 8601 format when timestamp not provided', async () => {
        // Arrange
        const event = createValidEvent()
        delete (event as any).timestamp
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - should generate valid ISO 8601 timestamp
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        }))
      })

      it('should use current time when timestamp not provided', async () => {
        // Arrange
        const beforePublish = new Date()
        const event = createValidEvent()
        delete (event as any).timestamp
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)
        const afterPublish = new Date()

        // Assert - generated timestamp should be between before and after
        const validatedEvent = mockValidator.validate.mock.calls[0][0]
        const generatedTimestamp = new Date(validatedEvent.timestamp)
        expect(generatedTimestamp.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime())
        expect(generatedTimestamp.getTime()).toBeLessThanOrEqual(afterPublish.getTime())
      })
    })

    describe('Version Assignment', () => {
      it('should default to "1.0" when version not specified', async () => {
        // Arrange
        const event = createValidEvent()
        delete (event as any).version
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - should assign default version
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          version: '1.0'
        }))
      })

      it('should validate version format when provided', async () => {
        // Arrange
        const invalidVersion = 'not.a.valid.version'
        const event = createValidEvent({ version: invalidVersion })
        mockValidator.validate.mockRejectedValue(new Error('Invalid version format'))

        // Act & Assert
        await expect(eventBus.publish(event)).rejects.toThrow('Invalid version format')
      })
    })

    describe('Metadata Population', () => {
      it('should create default metadata structure when missing', async () => {
        // Arrange
        const event = createValidEvent()
        delete (event as any).metadata
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - should create default metadata
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          metadata: expect.objectContaining({
            retryCount: 0,
            priority: 'normal'
          })
        }))
      })

      it('should preserve existing metadata fields during enrichment', async () => {
        // Arrange
        const existingMetadata = { 
          priority: 'high', 
          tags: ['important', 'user'],
          customField: 'value'
        }
        const event = createValidEvent({ metadata: existingMetadata })
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - should preserve existing fields and add missing ones
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          metadata: expect.objectContaining({
            priority: 'high', // preserved
            tags: ['important', 'user'], // preserved
            customField: 'value', // preserved
            retryCount: 0 // added
          })
        }))
      })

      it('should initialize retryCount to zero for new events', async () => {
        // Arrange
        const event = createValidEvent({ metadata: {} })
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - should initialize retryCount to 0
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          metadata: expect.objectContaining({
            retryCount: 0
          })
        }))
      })

      it('should default priority to "normal" when not specified', async () => {
        // Arrange
        const event = createValidEvent({ metadata: {} })
        mockValidator.validate.mockResolvedValue({ valid: true })

        // Act
        await eventBus.publish(event)

        // Assert - should default priority to normal
        expect(mockValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
          metadata: expect.objectContaining({
            priority: 'normal'
          })
        }))
      })
    })
  })

  describe('Pattern Matching and Subscriber Notification', () => {
    describe('Subscriber Lookup Integration', () => {
      it('should find all subscribers matching event type', async () => {
        // Arrange
        const event = createValidEvent({ eventType: 'User.ProfileUpdated' })
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const handler1 = jest.fn().mockResolvedValue(undefined)
        const handler2 = jest.fn().mockResolvedValue(undefined)
        const handler3 = jest.fn().mockResolvedValue(undefined)
        const nonMatchingHandler = jest.fn().mockResolvedValue(undefined)
        
        // Subscribe with various patterns
        await eventBus.subscribe('User.ProfileUpdated', handler1) // exact match
        await eventBus.subscribe('User.*', handler2) // prefix match
        await eventBus.subscribe('*', handler3) // global match
        await eventBus.subscribe('Order.*', nonMatchingHandler) // should not match

        // Act
        const result = await eventBus.publish(event)

        // Assert - only matching subscribers should be found and notified
        expect(handler1).toHaveBeenCalled()
        expect(handler2).toHaveBeenCalled()
        expect(handler3).toHaveBeenCalled()
        expect(nonMatchingHandler).not.toHaveBeenCalled()
        expect(result.subscribersNotified).toBe(3)
      })

      it('should deliver events to multiple matching subscribers', async () => {
        // Arrange
        const event = createValidEvent({ eventType: 'Order.PaymentCompleted' })
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const orderHandler = jest.fn().mockResolvedValue(undefined)
        const paymentHandler = jest.fn().mockResolvedValue(undefined)
        const auditHandler = jest.fn().mockResolvedValue(undefined)
        
        await eventBus.subscribe('Order.*', orderHandler)
        await eventBus.subscribe('*.PaymentCompleted', paymentHandler) 
        await eventBus.subscribe('*', auditHandler)

        // Act
        const result = await eventBus.publish(event)

        // Assert - all handlers should receive the same enriched event
        const expectedEvent = expect.objectContaining({
          eventType: 'Order.PaymentCompleted',
          eventId: expect.any(String),
          timestamp: expect.any(String),
          version: expect.any(String)
        })
        
        expect(orderHandler).toHaveBeenCalledWith(expectedEvent, expect.any(Object))
        expect(paymentHandler).toHaveBeenCalledWith(expectedEvent, expect.any(Object))
        expect(auditHandler).toHaveBeenCalledWith(expectedEvent, expect.any(Object))
        expect(result.subscribersNotified).toBe(3)
      })

      it('should handle case with no matching subscribers', async () => {
        // Arrange
        const event = createValidEvent({ eventType: 'System.UnknownEvent' })
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const handler = jest.fn().mockResolvedValue(undefined)
        await eventBus.subscribe('User.*', handler) // Won't match

        // Act
        const result = await eventBus.publish(event)

        // Assert - should complete successfully with no notifications
        expect(handler).not.toHaveBeenCalled()
        expect(result.subscribersNotified).toBe(0)
        expect(result.success).toBe(true) // Should still be successful
        expect(result.failedHandlers).toEqual([])
      })
    })

    describe('Handler Execution Isolation', () => {
      it('should execute handlers in isolation', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const successHandler1 = jest.fn().mockResolvedValue(undefined)
        const failingHandler = jest.fn().mockRejectedValue(new Error('Handler error'))
        const successHandler2 = jest.fn().mockResolvedValue(undefined)
        
        await eventBus.subscribe('*', successHandler1)
        await eventBus.subscribe('*', failingHandler)
        await eventBus.subscribe('*', successHandler2)

        // Act
        const result = await eventBus.publish(event)

        // Assert - all handlers should be called despite one failure
        expect(successHandler1).toHaveBeenCalled()
        expect(failingHandler).toHaveBeenCalled()
        expect(successHandler2).toHaveBeenCalled()
        
        // Statistics should reflect the failure
        expect(result.subscribersNotified).toBe(3)
        expect(result.failedHandlers).toHaveLength(1)
      })

      it('should track execution statistics accurately', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const handler1 = jest.fn().mockResolvedValue(undefined)
        const handler2 = jest.fn().mockRejectedValue(new Error('Error 1'))
        const handler3 = jest.fn().mockRejectedValue(new Error('Error 2'))
        
        await eventBus.subscribe('*', handler1)
        await eventBus.subscribe('*', handler2)
        await eventBus.subscribe('*', handler3)

        // Act
        const result = await eventBus.publish(event)

        // Assert - statistics should be accurate
        expect(result.subscribersNotified).toBe(3)
        expect(result.failedHandlers).toHaveLength(2)
        expect(result.success).toBe(false) // Overall failure due to handler failures
        expect(result.totalRetries).toBeGreaterThanOrEqual(4) // 2 failed handlers * 2 retries each
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    describe('Validation Error Handling', () => {
      it('should throw ValidationError with details for invalid schema', async () => {
        // Arrange
        const invalidEvent = createInvalidEvent()
        const validationError = new Error('Event validation failed: missing required field "source"')
        mockValidator.validate.mockRejectedValue(validationError)

        // Act & Assert
        await expect(eventBus.publish(invalidEvent)).rejects.toThrow('Event validation failed: missing required field "source"')
      })
    })

    describe('Timeout Error Handling', () => {
      it('should throw TimeoutError when handlers exceed time limit', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const slowHandler = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 200))
        )
        
        await eventBus.subscribe('*', slowHandler)
        const publishConfig: PublishConfig = { timeout: 100 }

        // Act & Assert
        await expect(eventBus.publish(event, publishConfig)).rejects.toThrow(TimeoutError)
      })
    })

    describe('Handler Retry Mechanism', () => {
      it('should respect maxRetries configuration for failed handlers', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const retryHandler = jest.fn().mockRejectedValue(new Error('Persistent error'))
        await eventBus.subscribe('*', retryHandler)

        // Act
        const result = await eventBus.publish(event)

        // Assert - handler should be called maxRetries + 1 times (initial + retries)
        expect(retryHandler).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
        expect(result.totalRetries).toBe(2)
        expect(result.failedHandlers).toHaveLength(1)
      })

      it('should implement retry delay between attempts', async () => {
        // Arrange
        const event = createValidEvent()
        mockValidator.validate.mockResolvedValue({ valid: true })
        
        const timestamps: number[] = []
        const retryHandler = jest.fn().mockImplementation(() => {
          timestamps.push(Date.now())
          return Promise.reject(new Error('Retry test error'))
        })
        
        await eventBus.subscribe('*', retryHandler)

        // Act
        const startTime = Date.now()
        await eventBus.publish(event)
        const endTime = Date.now()

        // Assert - should have appropriate delays between retries
        expect(timestamps).toHaveLength(3) // 1 initial + 2 retries
        expect(endTime - startTime).toBeGreaterThanOrEqual(200) // 2 retries * 100ms delay
        
        // Check delays between attempts (allowing some tolerance for execution time)
        if (timestamps.length >= 2) {
          expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(90) // ~100ms delay
        }
        if (timestamps.length >= 3) {
          expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(90) // ~100ms delay
        }
      })
    })
  })
})
