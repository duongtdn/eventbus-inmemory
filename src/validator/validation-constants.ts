/**
 * Validation Constants
 *
 * Constants used throughout the validation system.
 */

/**
 * Error messages for common validation scenarios
 */
export const VALIDATION_ERRORS = {
  INVALID_INPUT: 'Event must be object',
  UNEXPECTED_ERROR: 'Validation failed due to unexpected error'
} as const;

/**
 * Ajv configuration options
 */
export const AJV_CONFIG = {
  allErrors: true,
  verbose: true,
  strict: false
} as const;
