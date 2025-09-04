/**
 * Validation Error Formatter
 *
 * Utility for formatting Ajv validation errors into user-friendly messages.
 */

/**
 * Formats Ajv validation errors into readable error messages
 * @param ajvErrors - Array of Ajv error objects
 * @returns Array of formatted error messages
 */
export function formatValidationErrors(ajvErrors: any[]): string[] {
  return ajvErrors.map(error => {
    const field = extractFieldName(error);
    return formatErrorMessage(error, field);
  });
}

/**
 * Extracts the field name from an Ajv error object
 * @param error - Ajv error object
 * @returns The field name or 'root' for root-level errors
 */
function extractFieldName(error: any): string {
  if (error.instancePath) {
    return error.instancePath.substring(1);
  }

  if (error.params?.missingProperty) {
    return error.params.missingProperty;
  }

  return 'root';
}

/**
 * Formats a single error message based on the error type
 * @param error - Ajv error object
 * @param field - The field name
 * @returns Formatted error message
 */
function formatErrorMessage(error: any, field: string): string {
  switch (error.keyword) {
    case 'required':
      return `Missing required property '${error.params.missingProperty}'`;

    case 'format':
      return `Field '${field}' has invalid format`;

    case 'pattern':
      return `Field '${field}' does not match required pattern`;

    case 'type':
      return `Field '${field}' must be ${error.params.type}`;

    case 'minimum':
      return `Field '${field}' must be >= ${error.params.limit}`;

    case 'minLength':
      return `Field '${field}' must not be empty`;

    case 'enum':
      return `Field '${field}' must be one of: ${error.params.allowedValues.join(', ')}`;

    case 'items':
      return `Field '${field}' contains invalid items`;

    default:
      return `Field '${field}' is invalid: ${error.message}`;
  }
}
