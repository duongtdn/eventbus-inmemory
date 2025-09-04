/**
 * Error Formatter Unit Tests
 */

import { formatValidationErrors } from '../error-formatter';

describe('Error Formatter', () => {
  describe('formatValidationErrors', () => {
    it('should format required field errors', () => {
      const ajvErrors = [{
        keyword: 'required',
        params: { missingProperty: 'eventId' }
      }];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toEqual(["Missing required property 'eventId'"]);
    });

    it('should format format errors with instancePath', () => {
      const ajvErrors = [{
        keyword: 'format',
        instancePath: '/eventId'
      }];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toEqual(["Field 'eventId' has invalid format"]);
    });

    it('should format pattern errors', () => {
      const ajvErrors = [{
        keyword: 'pattern',
        instancePath: '/eventType'
      }];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toEqual(["Field 'eventType' does not match required pattern"]);
    });

    it('should format type errors', () => {
      const ajvErrors = [{
        keyword: 'type',
        instancePath: '/data',
        params: { type: 'object' }
      }];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toEqual(["Field 'data' must be object"]);
    });

    it('should format enum errors', () => {
      const ajvErrors = [{
        keyword: 'enum',
        instancePath: '/metadata/priority',
        params: { allowedValues: ['low', 'normal', 'high', 'critical'] }
      }];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toEqual(["Field 'metadata/priority' must be one of: low, normal, high, critical"]);
    });

    it('should handle multiple errors', () => {
      const ajvErrors = [
        {
          keyword: 'required',
          params: { missingProperty: 'eventId' }
        },
        {
          keyword: 'required',
          params: { missingProperty: 'eventType' }
        }
      ];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toHaveLength(2);
      expect(result).toContain("Missing required property 'eventId'");
      expect(result).toContain("Missing required property 'eventType'");
    });

    it('should handle unknown error types', () => {
      const ajvErrors = [{
        keyword: 'unknown',
        instancePath: '/someField',
        message: 'custom error message'
      }];

      const result = formatValidationErrors(ajvErrors);

      expect(result).toEqual(["Field 'someField' is invalid: custom error message"]);
    });
  });
});
