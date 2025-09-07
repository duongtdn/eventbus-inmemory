import { EventBus } from '../event-bus'
import { EventBusConfig } from '../../types'
import { EventValidator } from '../../validator'
import { LoggerPlugin } from '../../logger'

// Mock the validator class
const mockValidate = jest.fn()
jest.mock('../../validator/event-validator', () => ({
  EventValidator: jest.fn().mockImplementation(() => ({
    validate: mockValidate
  }))
}))

// Test doubles
const createMockValidator = (): jest.Mocked<Pick<EventValidator, 'validate'>> => ({
  validate: jest.fn()
})

const createMockLogger = (): jest.Mocked<LoggerPlugin> => ({
  info: jest.fn().mockResolvedValue(undefined),
  warn: jest.fn().mockResolvedValue(undefined),
  error: jest.fn().mockResolvedValue(undefined),
  fatal: jest.fn().mockResolvedValue(undefined),
  debug: jest.fn().mockResolvedValue(undefined)
})

const createInvalidLogger = () => ({
  info: jest.fn(),
  // Missing required methods - invalid logger
} as any)

describe('EventBus Constructor & Configuration Tests', () => {
  let mockValidator: jest.Mocked<Pick<EventValidator, 'validate'>>
  let mockLogger: jest.Mocked<LoggerPlugin>

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidator = createMockValidator()
    mockLogger = createMockLogger()
  })

  describe('Configuration Processing & Validation', () => {
    it('should apply default configuration when no config provided', () => {
      // Act
      const eventBus = new EventBus()

      // Assert - Test actual configuration merging logic
      const config = eventBus.getConfig()
      expect(config.maxRetries).toBe(0)
      expect(config.retryDelay).toBe(0)
      expect(config.enableLogging).toBe(true)
      expect(config.logger).toBeDefined()
    })

    it('should merge provided config with defaults correctly', () => {
      // Arrange
      const userConfig: EventBusConfig = {
        maxRetries: 3,
        enableLogging: false
        // Leave other fields undefined to test merging
      }

      // Act
      const eventBus = new EventBus(userConfig)

      // Assert - Test configuration merging logic
      const config = eventBus.getConfig()
      expect(config.maxRetries).toBe(3) // User override
      expect(config.enableLogging).toBe(false) // User override
      expect(config.retryDelay).toBe(0) // Default value
      expect(config.logger).toBeDefined() // Default logger created
    })

    it('should reject negative retry delays with meaningful error', () => {
      // Arrange
      const invalidConfig: EventBusConfig = {
        retryDelay: -100
      }

      // Act & Assert - Test validation logic
      expect(() => new EventBus(invalidConfig)).toThrow('Retry delay must be non-negative, got: -100')
    })

    it('should reject negative max retry counts with meaningful error', () => {
      // Arrange
      const invalidConfig: EventBusConfig = {
        maxRetries: -5
      }

      // Act & Assert - Test validation logic
      expect(() => new EventBus(invalidConfig)).toThrow('Max retries must be non-negative, got: -5')
    })

    it('should apply sensible limits to configuration values', () => {
      // Arrange
      const extremeConfig: EventBusConfig = {
        maxRetries: 1000000,
        retryDelay: Number.MAX_SAFE_INTEGER
      }

      // Act & Assert - Test bounds checking logic
      expect(() => new EventBus(extremeConfig)).toThrow(/exceeds maximum allowed value/)
    })

    it('should preserve configuration immutability after construction', () => {
      // Arrange
      const originalConfig: EventBusConfig = {
        maxRetries: 3,
        retryDelay: 1000
      }

      // Act
      const eventBus = new EventBus(originalConfig)
      const config = eventBus.getConfig()

      // Attempt to modify returned config
      ;(config as any).maxRetries = 999
			originalConfig.retryDelay = 5000

      // Assert - Test configuration protection logic
      const configAfterModification = eventBus.getConfig()
      expect(configAfterModification.maxRetries).toBe(3)
      expect(configAfterModification).not.toBe(config)
			expect(configAfterModification.retryDelay).toBe(1000)
			expect(configAfterModification).not.toBe(originalConfig)
    })
  })

  describe('Dependency Injection & Validation', () => {
    it('should initialize with provided validator instance', () => {
      // Arrange
      const config: EventBusConfig = {
        validator: mockValidator
      }

      // Act
      const eventBus = new EventBus(config)

      // Assert - Test dependency injection logic
      expect(eventBus.getValidator()).toBe(mockValidator)
    })

    it('should initialize with provided logger instance and create default when none provided', () => {
      // Test with provided logger
      const configWithLogger: EventBusConfig = {
        logger: mockLogger
      }

      const eventBusWithLogger = new EventBus(configWithLogger)
      expect(eventBusWithLogger.getLogger()).toBe(mockLogger)

      // Test default logger creation
      const eventBusWithoutLogger = new EventBus()
      const defaultLogger = eventBusWithoutLogger.getLogger()
      expect(defaultLogger).toBeDefined()
      expect(defaultLogger).not.toBe(mockLogger)
      expect(typeof defaultLogger.info).toBe('function')
    })

    it('should validate logger plugin interface compliance', () => {
      // Arrange
      const invalidLogger = createInvalidLogger()
      const configWithInvalidLogger: EventBusConfig = {
        logger: invalidLogger
      }

      // Act & Assert - Test logger interface validation logic
      expect(() => new EventBus(configWithInvalidLogger))
        .toThrow('Logger must implement all required methods: info, warn, error, fatal, debug')
    })
  })
})
