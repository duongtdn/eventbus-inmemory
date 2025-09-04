/**
 * Event Validator Component
 *
 * Validates events against JSON schemas and business rules.
 * Uses Ajv for JSON schema validation with custom formats.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationResult, JsonSchema } from '../types/validation';
import { BASE_EVENT_SCHEMA } from '../schemas/base-event-schema';
import { formatValidationErrors } from './error-formatter';
import { isValidEventInput } from './input-validation';
import { VALIDATION_ERRORS, AJV_CONFIG } from './validation-constants';

/**
 * EventValidator handles validation of events against JSON schemas
 */
export class EventValidator {
  private readonly ajv: Ajv;
  private readonly schema: JsonSchema;

  constructor(customSchema?: JsonSchema) {
    this.ajv = this.initializeAjv();
    this.schema = customSchema || BASE_EVENT_SCHEMA;
  }

  /**
   * Initialize Ajv instance with proper configuration
   * @returns Configured Ajv instance
   */
  private initializeAjv(): Ajv {
    const ajv = new Ajv(AJV_CONFIG);
    addFormats(ajv);
    return ajv;
  }

  /**
   * Validate an event against the base event schema
   * @param event - The event to validate
   * @returns Promise resolving to validation result
   */
  async validate(event: unknown): Promise<ValidationResult> {
    try {
      // Handle malformed inputs gracefully
      if (!isValidEventInput(event)) {
        return {
          isValid: false,
          errors: [VALIDATION_ERRORS.INVALID_INPUT]
        };
      }

      return this.performSchemaValidation(event);
    } catch (error) {
      // Handle unexpected errors
      return {
        isValid: false,
        errors: [VALIDATION_ERRORS.UNEXPECTED_ERROR]
      };
    }
  }

  /**
   * Perform JSON schema validation using Ajv
   * @param event - The event to validate
   * @returns Validation result
   */
  private performSchemaValidation(event: object): ValidationResult {
    const validate = this.ajv.compile(this.schema);
    const isValid = validate(event);

    if (isValid) {
      return {
        isValid: true,
        errors: []
      };
    }

    const errors = formatValidationErrors(validate.errors || []);
    return {
      isValid: false,
      errors
    };
  }
}
