# @codehola/eventbus

A robust, type-safe, in-memory event bus for Node.js and Web applications with pattern matching, automatic retries, and comprehensive error handling.

## Features

- 🚀 **High Performance**: In-memory event processing with minimal overhead
- 🎯 **Pattern Matching**: Flexible event subscription using wildcards (`user.*`, `*`)
- 🔄 **Automatic Retries**: Configurable retry logic for failed handlers
- ✅ **Type Safety**: Full TypeScript support with strong typing
- 🛡️ **Error Resilience**: Comprehensive error handling and recovery
- 📝 **Event Validation**: JSON schema validation support
- 📊 **Event Enrichment**: Automatic event metadata generation
- 🔍 **Observability**: Built-in logging and monitoring capabilities
- 🧪 **Testing Friendly**: Easy mocking and testing support

## Installation

```bash
npm install @codehola/eventbus
```

## Quick Start

```typescript
import { EventBus } from '@codehola/eventbus';

// Create an EventBus instance
const eventBus = new EventBus();

// Subscribe to events
await eventBus.subscribe('user.registered', async (event, context) => {
  console.log(`New user: ${event.data.email}`);
});

// Publish an event
await eventBus.publish({
  eventType: 'user.registered',
  source: 'UserService',
  data: { email: 'john@example.com', name: 'John Doe' }
});
```

## Core Concepts

### Events

All events follow a standard structure:

```typescript
interface BasicEvent<T = any> {
  eventId: string;        // Auto-generated UUID
  eventType: string;      // Event identifier (e.g., 'user.registered')
  timestamp: string;      // Auto-generated ISO timestamp
  source: string;         // Source service/component
  version: string;        // Event schema version
  data: T;               // Event payload
  correlationId?: string; // Optional correlation ID
  metadata?: EventMetadata; // Optional metadata (priority, tags, etc.)
}
```

### Pattern Matching

Subscribe to events using flexible patterns:

- **Exact match**: `'user.registered'`
- **Wildcard match**: `'user.*'` (matches all user events)
- **Global match**: `'*'` (matches all events)

### Event Handlers

Event handlers receive the event and execution context:

```typescript
type EventHandler<T = any> = (
  event: BasicEvent<T>,
  context: EventContext
) => Promise<void> | void;

interface EventContext {
  subscription: { id: string; pattern: string; };
  attempt: number;        // Current attempt number (for retries)
  timestamp: string;      // Handler execution timestamp
}
```

## Configuration

Create an EventBus with custom configuration:

```typescript
import { EventBus, ConsoleLogger } from '@codehola/eventbus';

const eventBus = new EventBus({
  maxRetries: 3,          // Max retry attempts (default: 0)
  retryDelay: 1000,       // Delay between retries in ms (default: 0)
  enableLogging: true,    // Enable internal logging (default: true)
  logger: new ConsoleLogger(), // Custom logger (default: ConsoleLogger)
  validator: customValidator   // Custom event validator (optional)
});
```

## Usage Examples

### Basic Usage

```typescript
import { EventBus } from '@codehola/eventbus';

const eventBus = new EventBus();

// Subscribe to specific events
const subscription = await eventBus.subscribe('order.created', async (event) => {
  console.log(`Processing order: ${event.data.orderId}`);
  // Handle order creation logic
});

// Subscribe using wildcards
await eventBus.subscribe('order.*', async (event) => {
  console.log(`Order event: ${event.eventType}`);
});

// Publish events
await eventBus.publish({
  eventType: 'order.created',
  source: 'OrderService',
  data: {
    orderId: 'order-123',
    customerId: 'customer-456',
    amount: 99.99
  }
});

// Unsubscribe when done
await eventBus.unsubscribe(subscription);
```

### Advanced Configuration

```typescript
import { EventBus, LoggerPlugin } from '@codehola/eventbus';

// Custom logger implementation
class CustomLogger implements LoggerPlugin {
  async info(message: string, data?: any): Promise<void> {
    // Custom logging logic
  }
  async warn(message: string, data?: any): Promise<void> { /* ... */ }
  async error(message: string, error?: Error, data?: any): Promise<void> { /* ... */ }
  async fatal(message: string, error?: Error, data?: any): Promise<void> { /* ... */ }
  async debug(message: string, data?: any): Promise<void> { /* ... */ }
}

// Create EventBus with advanced configuration
const eventBus = new EventBus({
  maxRetries: 5,
  retryDelay: 2000,
  enableLogging: true,
  logger: new CustomLogger()
});
```

### Error Handling and Retries

```typescript
// Handler that may fail and trigger retries
await eventBus.subscribe('payment.process', async (event, context) => {
  console.log(`Payment processing attempt: ${context.attempt}`);

  try {
    await processPayment(event.data);
  } catch (error) {
    if (context.attempt < 3) {
      throw error; // Will trigger retry
    }

    // Final attempt failed
    await eventBus.publish({
      eventType: 'payment.failed',
      source: 'PaymentService',
      data: { orderId: event.data.orderId, error: error.message }
    });
  }
});
```

### Business Domain Example

```typescript
// E-commerce domain events
interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
}

interface PaymentProcessedEvent {
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'completed' | 'failed';
}

// Order service
class OrderService {
  constructor(private eventBus: EventBus) {
    this.setupHandlers();
  }

  private async setupHandlers() {
    await this.eventBus.subscribe('payment.completed', this.handlePaymentCompleted.bind(this));
  }

  async createOrder(orderData: OrderCreatedEvent): Promise<void> {
    // Business logic
    await this.saveOrder(orderData);

    // Publish domain event
    await this.eventBus.publish({
      eventType: 'order.created',
      source: 'OrderService',
      data: orderData,
      metadata: {
        priority: 'high',
        tags: ['order', 'creation']
      }
    });
  }

  private async handlePaymentCompleted(event: BasicEvent<PaymentProcessedEvent>): Promise<void> {
    const { orderId, paymentId } = event.data;
    await this.confirmOrder(orderId, paymentId);

    await this.eventBus.publish({
      eventType: 'order.confirmed',
      source: 'OrderService',
      data: { orderId, paymentId }
    });
  }

  private async saveOrder(data: OrderCreatedEvent): Promise<void> { /* ... */ }
  private async confirmOrder(orderId: string, paymentId: string): Promise<void> { /* ... */ }
}
```

### Testing

```typescript
import { EventBus } from '@codehola/eventbus';

describe('EventBus Integration', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should handle order workflow', async () => {
    const events: string[] = [];

    // Setup test handlers
    await eventBus.subscribe('*', async (event) => {
      events.push(event.eventType);
    });

    // Publish test events
    await eventBus.publish({
      eventType: 'order.created',
      source: 'TestService',
      data: { orderId: 'test-123' }
    });

    // Assertions
    expect(events).toContain('order.created');
  });
});
```

## API Reference

### EventBus Class

#### Constructor

```typescript
constructor(config?: EventBusConfig)
```

#### Methods

**subscribe(pattern: string, handler: EventHandler): Promise<Subscription>**
- Subscribe to events matching the pattern
- Returns a subscription handle for later unsubscription

**publish<T>(event: Partial<BasicEvent<T>>, config?: PublishConfig): Promise<PublishResult>**
- Publish an event to all matching subscribers
- Automatically enriches events with missing fields
- Returns result with subscriber notification count

**unsubscribe(subscription: Subscription): Promise<boolean>**
- Remove a subscription
- Returns true if successfully unsubscribed

**getSubscriptionCount(): number**
- Get total number of active subscriptions

**hasSubscriptions(): boolean**
- Check if any subscriptions exist

**getLogger(): LoggerPlugin**
- Get the configured logger instance

**getValidator(): any**
- Get the configured validator instance

**getConfig(): EventBusConfig**
- Get a copy of the current configuration

### Types

#### EventBusConfig

```typescript
interface EventBusConfig {
  maxRetries?: number;      // Maximum retry attempts (default: 0)
  retryDelay?: number;      // Delay between retries in ms (default: 0)
  enableLogging?: boolean;  // Enable internal logging (default: true)
  logger?: LoggerPlugin;    // Custom logger instance
  validator?: any;          // Custom validator instance
}
```

#### PublishConfig

```typescript
interface PublishConfig {
  timeout?: number;         // Timeout for all handlers in ms
}
```

#### PublishResult

```typescript
interface PublishResult {
  subscribersNotified: number;  // Number of subscribers that received the event
  errors: Array<{              // Any errors that occurred
    subscriptionId: string;
    error: Error;
    attempts: number;
  }>;
}
```

#### Priority

```typescript
enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Pattern Matching Rules

- **Exact match**: Pattern matches event type exactly
- **Single wildcard**: `user.*` matches `user.created`, `user.updated`, etc.
- **Global wildcard**: `*` matches all events
- **Invalid patterns**: `**`, `*abc` (wildcard not at segment boundary)

### Error Handling

The EventBus provides comprehensive error handling:

1. **Subscription errors**: Invalid patterns or handlers throw immediately
2. **Handler errors**: Failed handlers trigger retry logic if configured
3. **Validation errors**: Invalid events are rejected before publishing
4. **Timeout errors**: Handlers exceeding timeout limits are terminated

## Best Practices

### Event Design

1. **Use clear event types**: `user.registered` instead of `userReg`
2. **Include version information**: For schema evolution
3. **Add correlation IDs**: For request tracing
4. **Use appropriate priorities**: For processing order

### Error Handling

1. **Configure retries appropriately**: Based on your use case
2. **Handle final failures**: Don't let errors disappear
3. **Use dead letter queues**: For unprocessable events
4. **Monitor error rates**: Set up alerting

### Performance

1. **Avoid long-running handlers**: Use async processing for heavy work
2. **Implement timeouts**: Prevent hanging handlers
3. **Monitor subscription count**: Too many can impact performance
4. **Use specific patterns**: Avoid global wildcard when possible

### Testing

1. **Mock the EventBus**: For unit testing individual components
2. **Test error scenarios**: Including retries and failures
3. **Verify event contracts**: Ensure data integrity
4. **Test pattern matching**: Verify subscription logic

## Migration Guide

### From v0.0.x to v0.1.x

- Event structure is now enforced with automatic enrichment
- Handlers now receive context as a second parameter
- Configuration options have been simplified
- Logger interface has been standardized

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

## License

This project is licensed under UNLICENSED - see the LICENSE file for details.

## Changelog

### v0.1.0
- Initial release with core functionality
- Pattern matching with wildcards
- Automatic retry logic
- Event validation and enrichment
- Comprehensive error handling
- TypeScript support
