/**
 * Unit Tests for EventValidator Component
 *
 */

import { EventValidator } from '../event-validator';
import { BasicEvent } from '../../types/events';
import { ValidationResult } from '../../types/validation';

describe('EventValidator', () => {
  let validator: EventValidator;

  beforeEach(() => {
    validator = new EventValidator();
  });

  describe('validate()', () => {
    describe('Valid Event Validation', () => {
      it('should validate well-formed events without errors', async () => {
        // Arrange
        const validEvent: BasicEvent = {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          eventType: 'User.AccountCreated',
          timestamp: '2025-09-04T10:15:30.000Z',
          source: 'UserService',
          version: '1.0',
          data: {
            userId: 'user-123',
            email: 'user@example.com'
          }
        };

        // Act
        const result = await validator.validate(validEvent);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate events with optional fields', async () => {
        // Arrange
        const validEventWithOptionals: BasicEvent = {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          eventType: 'Order.Created',
          timestamp: '2025-09-04T10:15:30.000Z',
          source: 'OrderService',
          version: '1.0',
          data: { orderId: 'order-123' },
          correlationId: 'correlation-456',
          metadata: {
            priority: 'high',
            tags: ['order', 'creation'],
            retryCount: 0
          }
        };

        // Act
        const result = await validator.validate(validEventWithOptionals);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Missing Required Fields', () => {
      const requiredFields = ['eventId', 'eventType', 'timestamp', 'source', 'version', 'data'];

      requiredFields.forEach(field => {
        it(`should reject events missing required field: ${field}`, async () => {
          // Arrange
          const invalidEvent = {
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            eventType: 'User.AccountCreated',
            timestamp: '2025-09-04T10:15:30.000Z',
            source: 'UserService',
            version: '1.0',
            data: { userId: 'user-123' }
          };
          delete (invalidEvent as any)[field];

          // Act
          const result = await validator.validate(invalidEvent as BasicEvent);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0]).toContain(`required property '${field}'`);
        });
      });

      it('should report all missing required fields in a single validation', async () => {
        // Arrange
        const invalidEvent = {
          data: { someData: 'value' }
        };

        // Act
        const result = await validator.validate(invalidEvent as unknown as BasicEvent);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        // Should contain errors for multiple missing fields
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('eventId');
        expect(errorText).toContain('eventType');
        expect(errorText).toContain('timestamp');
      });
    });

    describe('Invalidate EventType Format Validation', () => {
      const invalidEventTypes = [
        'User.',            // Missing event name
        '.Created',         // Missing context
        '',                 // Empty string
        'User Created',     // Space instead of dot
      ];

      invalidEventTypes.forEach(eventType => {
        it(`should reject invalid eventType format: "${eventType}"`, async () => {
          // Arrange
          const invalidEvent: BasicEvent = {
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            eventType,
            timestamp: '2025-09-04T10:15:30.000Z',
            source: 'UserService',
            version: '1.0',
            data: { userId: 'user-123' }
          };

          // Act
          const result = await validator.validate(invalidEvent);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0]).toContain('eventType');
        });
      });
    });

		describe('Validate EventType Format', () => {
      const validEventTypes = [
				'user.created',      // Lowercase context
				'User.created',      // Lowercase event name
				'User.Account.Created', // Too many dots
				'User-Account.Created', // Invalid character in context
				'User.Account-Created', // Invalid character in event name
				'123User.Created',   // Starting with number
				'User.123Created',   // Event starting with number
			];

      validEventTypes.forEach(eventType => {
        it(`should accept valid eventType format: "${eventType}"`, async () => {
          // Arrange
          const validEvent: BasicEvent = {
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            eventType,
            timestamp: '2025-09-04T10:15:30.000Z',
            source: 'UserService',
            version: '1.0',
            data: { userId: 'user-123' }
          };

          // Act
          const result = await validator.validate(validEvent);

          // Assert
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });
    });

    describe('Invalid Timestamp Format Validation', () => {
      const invalidTimestamps = [
        '2025-09-04',           // Date only
        '10:15:30',             // Time only
        '2025/09/04 10:15:30',  // Wrong format
        '2025-13-04T10:15:30Z', // Invalid month
        '2025-09-32T10:15:30Z', // Invalid day
        '2025-09-04T25:15:30Z', // Invalid hour
        'invalid-date',         // Not a date
        '1234567890',           // Unix timestamp
        '',                     // Empty string
      ];

      invalidTimestamps.forEach(timestamp => {
        it(`should reject invalid timestamp format: "${timestamp}"`, async () => {
          // Arrange
          const invalidEvent: BasicEvent = {
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            eventType: 'User.AccountCreated',
            timestamp,
            source: 'UserService',
            version: '1.0',
            data: { userId: 'user-123' }
          };

          // Act
          const result = await validator.validate(invalidEvent);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.some((error: string) => error.includes('timestamp'))).toBe(true);
        });
      });
    });

		describe('Valid Timestamp Format Validation', () => {
			const validTimestamps = [
				'2025-09-04T10:15:30.000Z',
				'2025-09-04T10:15:30Z',
				'2025-09-04T10:15:30.123Z'
			];


			validTimestamps.forEach(timestamp => {
				it(`should accept valid timestamp format: "${timestamp}"`, async () => {
					// Arrange
					const validEvent: BasicEvent = {
						eventId: '123e4567-e89b-12d3-a456-426614174000',
						eventType: 'User.AccountCreated',
						timestamp,
						source: 'UserService',
						version: '1.0',
						data: { userId: 'user-123' }
					};

					// Act
					const result = await validator.validate(validEvent);

					// Assert
					expect(result.isValid).toBe(true);
					expect(result.errors).toHaveLength(0);
				});
			});
		});

    describe('Invalid EventId Format Validation', () => {
      const invalidEventIds = [
        'invalid-uuid',
        '123',
        '',
        'not-a-uuid-at-all',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123g4567-e89b-12d3-a456-426614174000', // Invalid character
        '123e4567_e89b_12d3_a456_426614174000' // Wrong separators
      ];

      invalidEventIds.forEach(eventId => {
        it(`should reject invalid eventId format: "${eventId}"`, async () => {
          // Arrange
          const invalidEvent: BasicEvent = {
            eventId,
            eventType: 'User.AccountCreated',
            timestamp: '2025-09-04T10:15:30.000Z',
            source: 'UserService',
            version: '1.0',
            data: { userId: 'user-123' }
          };

          // Act
          const result = await validator.validate(invalidEvent);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.some((error: string) => error.includes('eventId'))).toBe(true);
        });
      });
    });

    describe('Invalid Version Format Validation', () => {
      const invalidVersions = [
        'v1.0',      // Has prefix
        '1',         // Missing minor
        '1.0.0',     // Patch version not allowed
        'latest',    // Not numeric
        '01.0',      // Leading zero
        '1.01',      // Leading zero in minor
        '1.-1',      // Negative minor
        '-1.0',      // Negative major
        '1.0.1',     // Too many parts
        '',          // Empty
        'abc.def'    // Non-numeric
      ];

      invalidVersions.forEach(version => {
        it(`should reject invalid version format: "${version}"`, async () => {
          // Arrange
          const invalidEvent: BasicEvent = {
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            eventType: 'User.AccountCreated',
            timestamp: '2025-09-04T10:15:30.000Z',
            source: 'UserService',
            version,
            data: { userId: 'user-123' }
          };

          // Act
          const result = await validator.validate(invalidEvent);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.some((error: string) => error.includes('version'))).toBe(true);
        });
      });
    });
  });

  describe('Invalid Optional Field Validation', () => {
    describe('Invalid metadata validation', () => {
      it('should reject invalid priority value', async () => {
        // Arrange
        const invalidEvent: BasicEvent = {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          eventType: 'User.AccountCreated',
          timestamp: '2025-09-04T10:15:30.000Z',
          source: 'UserService',
          version: '1.0',
          data: { userId: 'user-123' },
          metadata: {
            priority: 'invalid-priority' as any
          }
        };

        // Act
        const result = await validator.validate(invalidEvent);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error: string) => error.includes('priority'))).toBe(true);
      });

      it('should reject negative retryCount', async () => {
        // Arrange
        const invalidEvent: BasicEvent = {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          eventType: 'User.AccountCreated',
          timestamp: '2025-09-04T10:15:30.000Z',
          source: 'UserService',
          version: '1.0',
          data: { userId: 'user-123' },
          metadata: {
            retryCount: -1
          }
        };

        // Act
        const result = await validator.validate(invalidEvent);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error: string) => error.includes('retryCount'))).toBe(true);
      });

      it('should reject invalid tags format', async () => {
        // Arrange
        const invalidEvent: BasicEvent = {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          eventType: 'User.AccountCreated',
          timestamp: '2025-09-04T10:15:30.000Z',
          source: 'UserService',
          version: '1.0',
          data: { userId: 'user-123' },
          metadata: {
            tags: ['valid-tag', 123 as any] // Invalid: number in string array
          }
        };

        // Act
        const result = await validator.validate(invalidEvent);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error: string) => error.includes('tags'))).toBe(true);
      });
    });
  });

  describe('Source Field Validation', () => {
    it('should reject empty source field', async () => {
      // Arrange
      const invalidEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: '',
        version: '1.0',
        data: { userId: 'user-123' }
      };

      // Act
      const result = await validator.validate(invalidEvent);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error: string) => error.includes('source'))).toBe(true);
    });

    it('should accept non-empty source field', async () => {
      // Arrange
      const validEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: { userId: 'user-123' }
      };

      // Act
      const result = await validator.validate(validEvent);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('Data Field Validation', () => {
    it('should accept empty object for data field', async () => {
      // Arrange
      const validEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: {}
      };

      // Act
      const result = await validator.validate(validEvent);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject non-object data field', async () => {
      // Arrange
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: 'string-instead-of-object'
      };

      // Act
      const result = await validator.validate(invalidEvent as any);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error: string) => error.includes('data'))).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very long eventType within limits', async () => {
      // Arrange
      const longButValidEventType = 'A'.repeat(50) + '.' + 'B'.repeat(50);
      const validEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: longButValidEventType,
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: { test: 'data' }
      };

      // Act
      const result = await validator.validate(validEvent);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should handle maximum valid version numbers', async () => {
      // Arrange
      const validEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '999.999',
        data: { test: 'data' }
      };

      // Act
      const result = await validator.validate(validEvent);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should handle deeply nested data objects', async () => {
      // Arrange
      const deeplyNestedData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep-value'
                }
              }
            }
          }
        }
      };

      const validEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: deeplyNestedData
      };

      // Act
      const result = await validator.validate(validEvent);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle multiple validations efficiently', async () => {
      // Arrange
      const validEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: { userId: 'user-123' }
      };

      const validationPromises = Array(100).fill(null).map(() =>
        validator.validate(validEvent)
      );

      // Act
      const results = await Promise.all(validationPromises);

      // Assert
      expect(results).toHaveLength(100);
      expect(results.every((result: ValidationResult) => result.isValid)).toBe(true);
    });
  });

  describe('Error Resilience', () => {
    it('should handle malformed input gracefully', async () => {
      // Arrange
      const malformedInputs = [
        null,
        undefined,
        'string-instead-of-object',
        123,
        []
      ];

      // Act & Assert
      for (const input of malformedInputs) {
        const result = await validator.validate(input as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('must be object');
      }
    });

    it('should handle very large events without crashing', async () => {
      // Arrange
      const largeData = {
        hugeArray: Array(10000).fill('x').map((_, i) => ({ id: i, data: 'x'.repeat(100) }))
      };

      const largeEvent: BasicEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'User.AccountCreated',
        timestamp: '2025-09-04T10:15:30.000Z',
        source: 'UserService',
        version: '1.0',
        data: largeData
      };

      // Act
      const result = await validator.validate(largeEvent);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });
  });
});
