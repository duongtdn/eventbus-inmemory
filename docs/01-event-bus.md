# Component Design: In-Memory Event Bus

## Document Information
- **Version**: v2.0
- **Status**: Draft
- **Date**: September 3, 2025
- **Author**: Design Team
- **Component**: In-Memory Event Bus
- **Usage**: Event-driven communication for monolith applications with future extensibility

## 1. Component Overview

![Event Bus Component Overview](diagrams/src/event-bus-comp-overview.puml)

The Event Bus is a lightweight, in-memory event communication component that provides async pub/sub messaging for monolith applications.
It's designed with a clean interface that can be extended to support distributed backends (Redis/RabbitMQ) when migrating to microservices.

### 1.1 Purpose & Responsibilities

**Primary Purpose:**
Enable asynchronous, decoupled communication between application components within a monolith using event-driven architecture.

**Core Responsibilities:**
- **Event Publishing**: Async event publishing with immediate in-memory delivery
- **Event Subscription**: Pattern-based subscriptions with wildcard support
- **Contract Validation**: JSON schema validation for type safety
- **Error Handling**: Handler error management with retry
- **Observability**: Basic structured logging

### 1.2 Key Features

**In-Memory Implementation:**
- **High Performance**: Direct function calls with minimal overhead
- **Simple Patterns**: String-based pattern matching with wildcard support
- **Immediate Delivery**: Events delivered synchronously to all matching subscribers

**Future-Ready Design:**
- **Clean Interface**: API designed to support future backend implementations
- **Async Operations**: All operations return Promises for consistency
- **Extensible Architecture**: Plugin-style backend support can be added later

## 2. Internal Structure

![Event Bus Class Diagram](diagrams/src/event-bus-class-internal.puml)

### 2.1 Core Components (Simplified Design)

**EventBus (Primary Component):**
- **Primary Responsibility**: Complete in-memory event bus functionality
- **Key Functions**:
  - Exposes public API for publishing and subscribing to events
  - Validates events against JSON schemas before publishing
  - Maintains subscription registry using Map-based storage
  - Routes events to matching subscribers using pattern matching
  - Executes event handlers with error handling and retry logic
  - Manages subscription lifecycle (create, remove)
- **Dependencies**: Uses EventValidator for validation, EventLogger for observability
- **Rationale**: Single component design for simplicity and performance

**EventValidator:**
- **Primary Responsibility**: Event contract validation
- **Key Functions**:
  - Validates event structure against JSON schemas
  - Maintains schema registry with Map-based storage
  - Reports validation errors with clear messages
- **Dependencies**: Ajv JSON schema validator
- **Rationale**: Dedicated validation ensures type safety and contract compliance

**EventLogger:**
- **Primary Responsibility**: Observability through pluggable interface
- **Key Functions**:
  - Logs all event operations (publish, subscribe, errors) via plugin
  - Provides debugging information
- **Dependencies**: LoggerPlugin interface implementation
- **Rationale**: Clean separation of observability concerns with environment-specific logging

### 2.2 Component Relationships & Data Flow

**Publishing Flow:**
```
External Publisher → EventBus.publish() → EventValidator → EventLogger → Subscribers
```

**Subscription Flow:**
```
External Subscriber → EventBus.subscribe() → Pattern Registry → EventLogger
```

**Key Relationships:**
- **EventBus** → **EventValidator**: Validates events before publishing
- **EventBus** → **EventLogger**: Logs all operations
- **EventBus** → **Internal Maps**: Stores subscriptions and patterns

**Dependency Structure:**
```
EventBus (Primary Component)
├── EventValidator (validation only)
├── EventLogger (observability only)
└── Subscription Registry (Map<pattern, handlers[]>)
```

**Data Flow Patterns:**
- **Immediate Delivery**: Events delivered to all matching subscribers
- **Pattern Matching**: Simple string patterns with wildcard support (* and prefix.*)
- **Error Isolation**: Handler errors don't affect other subscribers
- **Async Interface**: All operations return Promises for future extensibility

**Benefits of In-Memory Design:**
- **Simple & Fast**: Direct function calls with minimal overhead
- **Easy Testing**: No external dependencies to mock
- **Reliable**: No network failures or connection issues
- **Predictable**: Synchronous delivery with deterministic behavior

## 3. Event Contracts & JSON Schemas

### 3.1 Base Event Structure

All events in the system must conform to the base event schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["eventId", "eventType", "timestamp", "source", "version", "data"],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this event instance"
    },
    "eventType": {
      "type": "string",
      "description": "Event type for this event instance"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when event was created"
    },
    "source": {
      "type": "string",
      "description": "Component or context that published the event"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "Event schema version (major.minor)"
    },
    "data": {
      "type": "object",
      "description": "Event-specific payload data"
    },
		"correlationId": {
      "type": "string",
      "description": "Optional correlation ID for tracing related events"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "retryCount": {"type": "integer", "minimum": 0},
        "priority": {"type": "string", "enum": ["low", "normal", "high", "critical"]},
        "tags": {"type": "array", "items": {"type": "string"}}
      }
    }
  }
}
```

### 3.2 Generic Event Examples

**Simple Domain Event:**
```json
{
  "eventId": "123e4567-e89b-12d3-a456-426614174000",
  "eventType": "User.AccountCreated",
  "timestamp": "2025-09-03T10:15:30.000Z",
  "source": "UserService",
  "version": "1.0",
  "correlationId": "abc-123-def-456",
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "createdAt": "2025-09-03T10:15:30.000Z"
  },
  "metadata": {
    "priority": "normal",
    "tags": ["user", "registration"]
  }
}
```

**Business Process Event:**
```json
{
  "eventId": "456e7890-e89b-12d3-a456-426614174001",
  "eventType": "Order.Completed",
  "timestamp": "2025-09-03T11:30:45.000Z",
  "source": "OrderService",
  "version": "1.0",
  "data": {
    "orderId": "order-789",
    "customerId": "customer-456",
    "totalAmount": 99.99,
    "currency": "USD",
    "completedAt": "2025-09-03T11:30:45.000Z"
  },
  "metadata": {
    "priority": "high",
    "tags": ["order", "payment", "fulfillment"]
  }
}
```

## 4. API Specifications

### 4.1 Core EventBus API (In-Memory Implementation)

```typescript
interface EventBus {
  /**
   * Publish an event to all matching subscribers
   * @param event - The domain event to publish
   * @param config - Optional publish configuration including timeout
   * @returns Promise resolving to publish result after all subscribe handler has been done or resolved
   * @throws TimeoutError if handlers don't complete within specified timeout
   */
  publish<T extends BasicEvent>(event: T, config?: PublishConfig): Promise<PublishResult>

  /**
   * Subscribe to events using pattern matching
   * @param pattern - Event pattern (string with wildcard support)
   * @param handler - Event handler function
   * @returns Promise resolving to subscription handle
   */
  subscribe<T extends BasicEvent>(
    pattern: string,
    handler: EventHandler<T>
  ): Promise<Subscription>

  /**
   * Unsubscribe from events
   * @param subscription - Subscription to remove
   * @returns Promise resolving to success status
   */
  unsubscribe(subscription: Subscription): Promise<boolean>
}

// Simple string-based patterns with wildcard support
type EventPattern = string
// Examples:
// "User.AccountCreated"     - exact match
// "User.*"                  - prefix match (all User events)
// "*"                       - all events

interface PublishConfig {
  /** Timeout in milliseconds for all handlers to complete (default: no timeout) */
  timeout?: number
}

interface PublishResult {
  eventId: string
  success: boolean
  publishedAt: Date
  subscribersNotified: number
  /** Handlers that failed after all retries */
  failedHandlers?: string[]
  /** Total retry attempts across all handlers */
  totalRetries?: number
}

// Simple subscription handle
interface Subscription {
  id: string                    // Unique subscription identifier
  pattern: string              // Pattern used for subscription
}

type EventHandler<T extends BasicEvent> = (
  event: T,
  context: EventContext
) => Promise<void>

interface EventContext {
  subscription: Subscription
  attempt: number             // Retry attempt number (for error handling)
}}

```

### 4.2 Event Patterns

**Pattern Examples:**
```typescript
// Exact event type matching
await eventBus.subscribe("Initialization", handler)
await eventBus.subscribe("User.AccountCreated", handler)

// Prefix matching (wildcard)
await eventBus.subscribe("User.*", handler)       // All User events
await eventBus.subscribe("Order.*", handler)      // All Order events

// Global matching
await eventBus.subscribe("*", handler)            // All events

// Multiple specific events (subscribe multiple times)
await eventBus.subscribe("Order.Created", handler)
await eventBus.subscribe("Order.Updated", handler)
await eventBus.subscribe("Order.Completed", handler)
```

### 4.3 Configuration

```typescript
interface EventBusConfig {
  /** Maximum retry attempts for failed handlers (default: 0) */
  maxRetries?: number

  /** Retry delay in milliseconds (default: 0) */
  retryDelay?: number

  /** Enable detailed logging (default: true) */
  enableLogging?: boolean

  /** Logger plugin for environment-specific logging */
  logger?: LoggerPlugin
}
```

### 4.4 Logger Plugin Interface

```typescript
/**
 * Simple logger plugin interface for environment-specific logging
 * Allows console.log for development, cloud services for production
 */
interface LoggerPlugin {
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

/**
 * Built-in console logger for development
 */
class ConsoleLogger implements LoggerPlugin {
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

```

### 4.5 Error Handling Strategy

**Error Types & Handling:**

```typescript
/**
 * Error context for failed event handlers
 */
interface EventError {
  eventId: string
  eventType: string
  subscriptionId: string
  error: Error
  attempt: number
  timestamp: Date
}

/**
 * Error thrown when publish operation times out
 */
class TimeoutError extends Error {
  constructor(
    public eventId: string,
    public timeoutMs: number,
    public completedHandlers: number,
    public totalHandlers: number
  ) {
    super(`Event ${eventId} timed out after ${timeoutMs}ms. ${completedHandlers}/${totalHandlers} handlers completed.`)
    this.name = 'TimeoutError'
  }
}
```

**Error Handling Rules:**

1. **Validation Errors** (Pre-publish):
   - Thrown synchronously before event reaches subscribers
   - No retries - fix the event structure
   - Logged as warnings with schema violation details

2. **Timeout Errors** (Publish timeout):
   - Thrown when handlers don't complete within specified timeout
   - TimeoutError contains details about completed vs total handlers
   - Partial results may be available for completed handlers
   - Logged as warnings with timeout details

3. **Handler Execution Errors** (Per-subscription):
   - Isolated between subscriptions (one handler failure doesn't affect others)
	 - Error is logged
   - Automatic retries with exponential backoff
   - After max retries handler is skipped for this event
   - Original event context preserved across retries

4. **System Errors** (Infrastructure):
   - Memory allocation, internal state corruption
   - Logged as critical errors
   - Event bus remains operational if possible

**Error Isolation Example:**
```typescript
// Handler A fails, Handler B still processes the event
await eventBus.subscribe("Order.*", handlerA)  // This might fail
await eventBus.subscribe("Order.*", handlerB)  // This will still run

await eventBus.publish(orderEvent)
// Result: handlerA fails after retries, handlerB succeeds
// Event is considered "partially successful"
```

### 4.6 Error Handling Patterns

**Resilient Event Handler:**
```typescript
class ResilientService {
  async initialize() {
    await eventBus.subscribe('Order.*', async (event, context) => {
      try {
        await this.processOrder(event.data)
      } catch (error) {
        // Error details are automatically logged by EventBus
        // Just re-throw to trigger retry mechanism
        throw error
      }
    })
  }

  private async processOrder(orderData: any) {
    // Order processing logic that might fail
    if (Math.random() < 0.1) {
      throw new Error('Simulated processing error')
    }

    console.log('Order processed successfully:', orderData.orderId)
  }
}
```

**Timeout Handling:**
```typescript
class OrderService {
  async processOrderWithTimeout(orderData: any) {
    try {
      // Publish with 3 second timeout for critical operations
      const result = await eventBus.publish({
        eventType: 'Order.PaymentRequired',
        source: 'OrderService',
        data: orderData
      }, { timeout: 3000 })

      console.log(`Order processed: ${result.subscribersNotified} handlers completed`)
    } catch (error) {
      if (error instanceof TimeoutError) {
        // Handle partial completion - some handlers may have succeeded
        console.warn(`Order processing timed out: ${error.completedHandlers}/${error.totalHandlers} completed`)
        // Decide whether to retry, rollback, or continue based on business logic
        await this.handlePartialCompletion(error)
      } else {
        // Handle other errors (validation, system errors)
        throw error
      }
    }
  }

  private async handlePartialCompletion(timeoutError: TimeoutError) {
    // Business logic for handling partial completion
    // E.g., retry with longer timeout, manual intervention, etc.
  }
}
```

### 5. Complete Usage Example

**Development Setup (Console Logging):**
```typescript
import { createEventBus, ConsoleLogger } from './event-bus'

// Development configuration
const eventBus = createEventBus({
  maxRetries: 2,
  retryDelay: 500,
  logger: new ConsoleLogger(),
  enableLogging: true
})

// Subscribe to events
await eventBus.subscribe('User.*', async (event, context) => {
  console.log(`Processing user event: ${event.eventType}`)
  // Handler logic here
})

// Publish event
const result = await eventBus.publish({
  eventType: 'User.AccountCreated',
  source: 'UserService',
  data: { userId: 'user-123', email: 'user@example.com' }
});	// publish will enrich event with event id and other data such as timestamp, version, metadata...

// Publish event with timeout
try {
  const result = await eventBus.publish({
    eventType: 'Order.ProcessPayment',
    source: 'OrderService',
    data: { orderId: 'order-456', amount: 99.99 }
  }, { timeout: 5000 }); // 5 second timeout

  console.log('Publish result:', result)
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error(`Event timed out: ${error.completedHandlers}/${error.totalHandlers} handlers completed`)
  } else {
    console.error('Publish failed:', error)
  }
}

console.log('Publish result:', result)
```

## 5. Implementation Details

### 5.1 Technology Stack & Dependencies

**Core Implementation:**
- **Language**: TypeScript/JavaScript (Node.js)
- **Event Storage**: In-memory Maps and Sets
- **Schema Validation**: Ajv JSON Schema validator
- **Logging**: Pluggable logger.
- **Testing**: Jest for unit and integration tests
