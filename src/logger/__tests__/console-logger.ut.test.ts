/**
 * Unit Tests for ConsoleLogger
 * Tests actual implementation logic following TDD principles
 */

import { ConsoleLogger } from '../console-logger'

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleDebugSpy: jest.SpyInstance

  beforeEach(() => {
    logger = new ConsoleLogger()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Core Logging Functionality', () => {
    describe('info() - Message Formatting', () => {
      it('should format info messages with [INFO] prefix', async () => {
        const message = 'Test info message'
        const context = { userId: '123', action: 'login' }

        await logger.info(message, context)

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] Test info message',
          { userId: '123', action: 'login' }
        )
      })

      it('should handle empty string message', async () => {
        await logger.info('', { test: 'context' })

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] ',
          { test: 'context' }
        )
      })
    })

    describe('warn() - Message Formatting', () => {
      it('should format warning messages with [WARN] prefix', async () => {
        const message = 'Test warning message'
        const context = { eventId: 'evt-456', retry: 2 }

        await logger.warn(message, context)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN] Test warning message',
          { eventId: 'evt-456', retry: 2 }
        )
      })

      it('should handle multiline warning messages', async () => {
        const message = 'Line 1\nLine 2\nLine 3'

        await logger.warn(message, { source: 'test' })

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN] Line 1\nLine 2\nLine 3',
          { source: 'test' }
        )
      })
    })

    describe('error() - Message Formatting', () => {
      it('should format error messages with [ERROR] prefix and error details', async () => {
        const message = 'Test error message'
        const error = new Error('Something went wrong')
        const context = { handler: 'OrderHandler', attempt: 3 }

        await logger.error(message, error, context)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Test error message',
          'Something went wrong',
          { handler: 'OrderHandler', attempt: 3 }
        )
      })

      it('should handle error without context', async () => {
        const message = 'Error without context'
        const error = new Error('Test error')

        await logger.error(message, error)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Error without context',
          'Test error',
          ''
        )
      })
    })

    describe('fatal() - Message Formatting', () => {
      it('should format fatal messages with [FATAL] prefix', async () => {
        const message = 'Critical system failure'
        const error = new Error('Memory corruption detected')
        const context = { systemState: 'corrupted', pid: 1234 }

        await logger.fatal(message, error, context)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[FATAL] Critical system failure',
          'Memory corruption detected',
          { systemState: 'corrupted', pid: 1234 }
        )
      })

      it('should handle fatal message without error object', async () => {
        const message = 'System shutting down'

        await logger.fatal(message, undefined, { reason: 'manual' })

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[FATAL] System shutting down',
          '',
          { reason: 'manual' }
        )
      })
    })

    describe('debug() - Message Formatting', () => {
      it('should format debug messages with [DEBUG] prefix', async () => {
        const message = 'Debug trace information'
        const context = { step: 'validation', input: 'event-123' }

        await logger.debug(message, context)

        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[DEBUG] Debug trace information',
          { step: 'validation', input: 'event-123' }
        )
      })
    })
  })

  describe('Context Handling Logic', () => {
    describe('Context Object Processing', () => {
      it('should display complex context objects correctly', async () => {
        const complexContext = {
          event: { id: '123', type: 'User.Created' },
          metadata: { timestamp: '2025-09-04', source: 'UserService' },
          nested: { level1: { level2: { value: 42 } } }
        }

        await logger.info('Complex context test', complexContext)

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] Complex context test',
          complexContext
        )
      })

      it('should handle context with circular references gracefully', async () => {
        const circularContext: any = { name: 'test' }
        circularContext.self = circularContext

        await logger.info('Circular reference test', circularContext)

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] Circular reference test',
          circularContext
        )
      })
    })

    describe('Empty Context Handling', () => {
      it('should handle undefined context gracefully', async () => {
        await logger.info('Test message')

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] Test message',
          ''
        )
      })

      it('should handle null context gracefully', async () => {
        await logger.warn('Test message', null as any)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN] Test message',
          ''
        )
      })

      it('should handle empty object context', async () => {
        await logger.error('Test message', new Error('test'), {})

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Test message',
          'test',
          {}
        )
      })
    })
  })

  describe('Error Object Processing', () => {
    describe('error() - Error Object Handling', () => {
      it('should extract error message correctly', async () => {
        const errorWithMessage = new Error('Detailed error description')

        await logger.error('Handler failed', errorWithMessage, { handler: 'test' })

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Handler failed',
          'Detailed error description',
          { handler: 'test' }
        )
      })

      it('should handle custom error types', async () => {
        class CustomError extends Error {
          constructor(message: string, public code: string) {
            super(message)
            this.name = 'CustomError'
          }
        }

        const customError = new CustomError('Custom error occurred', 'E001')

        await logger.error('Custom error test', customError)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Custom error test',
          'Custom error occurred',
          ''
        )
      })
    })

    describe('fatal() - Error Object Handling', () => {
      it('should extract error message from fatal errors', async () => {
        const fatalError = new Error('System integrity compromised')

        await logger.fatal('Critical failure', fatalError, { severity: 'high' })

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[FATAL] Critical failure',
          'System integrity compromised',
          { severity: 'high' }
        )
      })
    })

    describe('Error Object Without Message', () => {
      it('should handle error objects without message property', async () => {
        const errorWithoutMessage = { name: 'WeirdError' } as Error

        await logger.error('Strange error', errorWithoutMessage)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Strange error',
          '',
          ''
        )
      })

      it('should handle error objects with empty message', async () => {
        const errorWithEmptyMessage = new Error('')

        await logger.fatal('Empty error message', errorWithEmptyMessage)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[FATAL] Empty error message',
          '',
          ''
        )
      })

      it('should handle null error gracefully', async () => {
        await logger.error('Null error test', null as any, { test: 'context' })

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Null error test',
          '',
          { test: 'context' }
        )
      })
    })
  })

  describe('Async Operation Compliance', () => {
    describe('Methods Return Promises', () => {
      it('should return resolved promises for all logging methods', async () => {
        const infoPromise = logger.info('test')
        const warnPromise = logger.warn('test')
        const errorPromise = logger.error('test')
        const fatalPromise = logger.fatal('test')
        const debugPromise = logger.debug('test')

        expect(infoPromise).toBeInstanceOf(Promise)
        expect(warnPromise).toBeInstanceOf(Promise)
        expect(errorPromise).toBeInstanceOf(Promise)
        expect(fatalPromise).toBeInstanceOf(Promise)
        expect(debugPromise).toBeInstanceOf(Promise)

        await expect(infoPromise).resolves.toBeUndefined()
        await expect(warnPromise).resolves.toBeUndefined()
        await expect(errorPromise).resolves.toBeUndefined()
        await expect(fatalPromise).resolves.toBeUndefined()
        await expect(debugPromise).resolves.toBeUndefined()
      })
    })

    describe('Concurrent Logging', () => {
      it('should handle multiple concurrent log calls without interference', async () => {
        const promises = [
          logger.info('Info 1', { id: 1 }),
          logger.warn('Warn 1', { id: 2 }),
          logger.error('Error 1', new Error('Error 1'), { id: 3 }),
          logger.info('Info 2', { id: 4 }),
          logger.debug('Debug 1', { id: 5 })
        ]

        await Promise.all(promises)

        expect(consoleLogSpy).toHaveBeenCalledTimes(2)
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
        expect(consoleDebugSpy).toHaveBeenCalledTimes(1)

        // Verify correct arguments for each call
        expect(consoleLogSpy).toHaveBeenNthCalledWith(1, '[INFO] Info 1', { id: 1 })
        expect(consoleLogSpy).toHaveBeenNthCalledWith(2, '[INFO] Info 2', { id: 4 })
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warn 1', { id: 2 })
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error 1', 'Error 1', { id: 3 })
        expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Debug 1', { id: 5 })
      })
    })
  })

  describe('Edge Cases', () => {
    describe('Large Data Handling', () => {
      it('should handle large context objects without performance issues', async () => {
        const largeContext = {
          data: new Array(1000).fill(0).map((_, i) => ({
            id: i,
            value: `item-${i}`,
            metadata: { timestamp: Date.now() + i }
          }))
        }

        const startTime = process.hrtime.bigint()
        await logger.info('Large context test', largeContext)
        const endTime = process.hrtime.bigint()

        const durationMs = Number(endTime - startTime) / 1_000_000

        expect(durationMs).toBeLessThan(100) // Should complete in less than 100ms
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] Large context test',
          largeContext
        )
      })

      it('should handle large error messages properly', async () => {
        const largeMessage = 'Error: ' + 'x'.repeat(10000)
        const error = new Error(largeMessage)

        await logger.error('Large error test', error)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR] Large error test',
          largeMessage,
          ''
        )
      })
    })

    describe('Special Characters and Encoding', () => {
      it('should handle special characters in messages correctly', async () => {
        const messageWithSpecialChars = 'Test with special chars: áéíóú ñ ç 中文 🚀 💯'
        const context = { emoji: '🎉', unicode: 'café' }

        await logger.info(messageWithSpecialChars, context)

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] Test with special chars: áéíóú ñ ç 中文 🚀 💯',
          { emoji: '🎉', unicode: 'café' }
        )
      })

      it('should handle newlines and tabs in messages', async () => {
        const messageWithFormatting = 'Line 1\n\tTabbed line\n\r\nWindows newline'

        await logger.warn(messageWithFormatting)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN] Line 1\n\tTabbed line\n\r\nWindows newline',
          ''
        )
      })
    })

    describe('Null/Undefined Safety', () => {
      it('should handle null message gracefully', async () => {
        await logger.info(null as any, { test: 'context' })

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[INFO] null',
          { test: 'context' }
        )
      })

      it('should handle undefined message gracefully', async () => {
        await logger.warn(undefined as any)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN] undefined',
          ''
        )
      })

      it('should handle empty string message', async () => {
        await logger.debug('', { empty: true })

        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[DEBUG] ',
          { empty: true }
        )
      })
    })
  })

  describe('Performance and Resource Tests', () => {
    describe('Memory Leak Prevention', () => {
      it('should not accumulate memory with repeated logging', async () => {
        const initialMemory = process.memoryUsage().heapUsed

        // Perform many logging operations
        const promises = []
        for (let i = 0; i < 1000; i++) {
          promises.push(logger.info(`Log message ${i}`, { index: i, data: `data-${i}` }))
        }
        await Promise.all(promises)

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }

        const finalMemory = process.memoryUsage().heapUsed
        const memoryGrowth = finalMemory - initialMemory

        // Memory growth should be minimal (less than 2MB for 1000 log operations - accounting for test overhead)
        expect(memoryGrowth).toBeLessThan(2 * 1024 * 1024)
      })
    })

    describe('Non-blocking Behavior', () => {
      it('should complete logging operations quickly and return promises immediately', async () => {
        const startTime = process.hrtime.bigint()

        const promises = [
          logger.info('Fast test 1'),
          logger.warn('Fast test 2'),
          logger.error('Fast test 3', new Error('test')),
          logger.debug('Fast test 4')
        ]

        // Promises should be created immediately
        const promiseCreationTime = process.hrtime.bigint()
        const creationDurationMs = Number(promiseCreationTime - startTime) / 1_000_000

        expect(creationDurationMs).toBeLessThan(10) // Should create promises in less than 10ms

        // All promises should resolve quickly
        await Promise.all(promises)

        const completionTime = process.hrtime.bigint()
        const totalDurationMs = Number(completionTime - startTime) / 1_000_000

        expect(totalDurationMs).toBeLessThan(50) // Should complete in less than 50ms
      })
    })
  })
})
