import { LoggerPlugin } from './logger-plugin'

/**
 * Built-in console logger for development
 * Minimal implementation following YAGNI principles
 */
export class ConsoleLogger implements LoggerPlugin {
  async info(message: string, context?: Record<string, any>): Promise<void> {
    console.log(`[INFO] ${message}`, context || '')
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    console.warn(`[WARN] ${message}`, context || '')
  }

  async error(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    console.error(`[ERROR] ${message}`, error?.message || '', context || '')
  }

  async fatal(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    console.error(`[FATAL] ${message}`, error?.message || '', context || '')
  }

  async debug(message: string, context?: Record<string, any>): Promise<void> {
    console.debug(`[DEBUG] ${message}`, context || '')
  }
}
