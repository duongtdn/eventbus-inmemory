/**
 * Input Validation Unit Tests
 */

import { isValidEventInput } from '../input-validation';

describe('Input Validation', () => {
  describe('isValidEventInput', () => {
    it('should accept valid objects', () => {
      expect(isValidEventInput({})).toBe(true);
      expect(isValidEventInput({ key: 'value' })).toBe(true);
      expect(isValidEventInput({ nested: { object: true } })).toBe(true);
    });

    it('should reject null and undefined', () => {
      expect(isValidEventInput(null)).toBe(false);
      expect(isValidEventInput(undefined)).toBe(false);
    });

    it('should reject arrays', () => {
      expect(isValidEventInput([])).toBe(false);
      expect(isValidEventInput([1, 2, 3])).toBe(false);
      expect(isValidEventInput([{}])).toBe(false);
    });

    it('should reject primitive types', () => {
      expect(isValidEventInput('string')).toBe(false);
      expect(isValidEventInput(123)).toBe(false);
      expect(isValidEventInput(true)).toBe(false);
      expect(isValidEventInput(false)).toBe(false);
    });
  });
});
