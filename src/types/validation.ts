/**
 * Validation Type Definitions
 *
 * Types for event validation results and error handling.
 */

/**
 * Result of event validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * JSON Schema definition
 */
export interface JsonSchema {
  $schema?: string;
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  definitions?: Record<string, JsonSchema>;
  [key: string]: any;
}

/**
 * Schema registry entry
 */
export interface SchemaRegistryEntry {
  eventType: string;
  schema: JsonSchema;
  version: string;
  registeredAt: Date;
}
