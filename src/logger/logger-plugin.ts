/**
 * Logger Plugin Interface
 * Provides a contract for pluggable logging implementations
 */
export interface LoggerPlugin {
  /**
   * Log informational messages
   * @param message - Log message
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, any>): Promise<void>

  /**
   * Log warning messages
   * @param message - Log message
   * @param context - Optional context object
   */
  warn(message: string, context?: Record<string, any>): Promise<void>

  /**
   * Log error messages
   * @param message - Log message
   * @param error - Error object
   * @param context - Optional context object
   */
  error(message: string, error?: Error, context?: Record<string, any>): Promise<void>

  /**
   * Log critical system error
   * @param message - Log message
   * @param error - Error object
   * @param context - Optional context object
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): Promise<void>

  /**
   * Log debug messages (only in development)
   * @param message - Log message
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, any>): Promise<void>
}
