/**
 * Input Validation Utilities
 *
 * Helper functions for validating input types and formats.
 */

/**
 * Checks if the input is a valid object for event validation
 * @param input - The input to validate
 * @returns true if input is a valid object, false otherwise
 */
export function isValidEventInput(input: unknown): input is object {
  return (
    input !== null &&
    input !== undefined &&
    typeof input === 'object' &&
    !Array.isArray(input)
  );
}
