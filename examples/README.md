# EventBus Examples

This folder contains working examples that demonstrate how to use the EventBus library in various scenarios.

## Overview

The EventBus is an in-memory event bus with JSON schema validation and pattern matching capabilities. It supports:

- **Pattern-based subscriptions** with wildcard support (`*`, `user.*`, etc.)
- **Event validation** using JSON schemas
- **Automatic event enrichment** (adds eventId, timestamp, version)
- **Error handling and retries** with configurable policies
- **Flexible logging** with pluggable logger implementations
- **Type-safe event handling** with TypeScript interfaces

## Examples

### 1. Basic Usage (`basic-usage.ts`)

Demonstrates the fundamental features:

```typescript
import { EventBus } from '../src/core/event-bus'
import { runExample } from './basic-usage'

// Run the basic example
await runExample()
```

**Features covered:**
- Creating an EventBus instance
- Subscribing to specific events
- Publishing events
- Wildcard pattern matching (`user.*`, `*`)
- Event enrichment (automatic fields)
- Subscription management

### 2. Advanced Features (`advanced-features.ts`)

Shows more complex usage patterns:

```typescript
import { runAdvancedExample } from './advanced-features'

// Run the advanced example
await runAdvancedExample()
```

**Features covered:**
- Custom EventBus configuration
- Custom logger implementation
- Business service integration
- Error handling with retries
- Complex event flows
- Multiple service coordination
- Performance considerations

### 3. Demo Runner (`demo-runner.ts`)

Utility to run examples programmatically:

```typescript
import { runDemo } from './demo-runner'

// Run all examples
await runDemo('all')

// Run specific example
await runDemo('basic')
await runDemo('advanced')
```

## Running the Examples

### Using TypeScript directly:

```bash
# From the eventbus root directory
npx ts-node examples/demo-runner.ts

# Or run individual examples
npx ts-node -e "import('./examples/basic-usage.js').then(m => m.runExample())"
```

### Using the built JavaScript:

```bash
# Build first
npm run build

# Then run
node dist/examples/demo-runner.js
```

### Programmatically in your code:

```typescript
import { EventBus } from '@codehola/eventbus'
import { runDemo } from '@codehola/eventbus/examples/demo-runner'

// Use EventBus in your application
const eventBus = new EventBus()

// Or run examples to see how it works
await runDemo('basic')
```

## Key Concepts Demonstrated

### 1. Event Structure

All events follow the `BasicEvent` interface:

```typescript
interface BasicEvent<T = any> {
  eventId: string        // Auto-generated UUID
  eventType: string      // Pattern-matchable type (e.g., "user.created")
  timestamp: string      // ISO 8601 timestamp
  source: string         // Source service/component
  version: string        // Event schema version
  data: T               // Event payload
  correlationId?: string // Optional correlation tracking
  metadata?: EventMetadata // Optional metadata (priority, tags, etc.)
}
```

### 2. Pattern Matching

The EventBus supports flexible pattern matching:

- **Exact match**: `"user.created"` matches only `user.created` events
- **Wildcard patterns**: `"user.*"` matches `user.created`, `user.updated`, etc.
- **Global wildcard**: `"*"` matches all events
- **Invalid patterns**: `"user.**"`, `"*something"` (without dot)

### 3. Error Handling

The EventBus includes robust error handling:

- **Automatic retries** with configurable count and delay
- **Error isolation** - one handler failure doesn't affect others
- **Detailed error reporting** with handler execution results
- **Timeout support** for async operations

### 4. Configuration Options

```typescript
const config: EventBusConfig = {
  maxRetries: 3,           // Max retry attempts per handler
  retryDelay: 100,         // Delay between retries (ms)
  enableLogging: true,     // Enable/disable logging
  logger: customLogger,    // Custom logger implementation
  validator: customValidator // Custom event validator
}

const eventBus = new EventBus(config)
```

## Real-World Usage Patterns

### Microservices Communication

```typescript
// Order service publishes events
await eventBus.publish({
  eventType: 'order.created',
  source: 'OrderService',
  data: { orderId: '123', customerId: '456', amount: 99.99 }
})

// Payment service subscribes and processes
await eventBus.subscribe('order.created', async (event) => {
  await processPayment(event.data)
})
```

### Event-Driven Workflows

```typescript
// Chain multiple services through events
await eventBus.subscribe('order.created', reserveInventory)
await eventBus.subscribe('inventory.reserved', processPayment)
await eventBus.subscribe('payment.completed', confirmOrder)
await eventBus.subscribe('order.confirmed', sendNotification)
```

### Cross-Cutting Concerns

```typescript
// Logging all events
await eventBus.subscribe('*', auditLogger)

// Metrics collection
await eventBus.subscribe('*.created', incrementCreationMetrics)
await eventBus.subscribe('*.failed', incrementErrorMetrics)
```

## Best Practices

1. **Use descriptive event types**: `user.profile.updated` vs `update`
2. **Include correlation IDs**: For tracking related events across services
3. **Handle errors gracefully**: Use try-catch in event handlers
4. **Validate event data**: Use schemas to ensure data integrity
5. **Monitor performance**: Track subscription counts and handler execution times
6. **Use appropriate retry policies**: Balance reliability vs performance

## Troubleshooting

### Common Issues

1. **Pattern not matching**: Check for typos, invalid characters
2. **Handler not called**: Verify subscription was awaited
3. **Events not validated**: Ensure validator is configured properly
4. **Memory leaks**: Remember to unsubscribe when no longer needed

### Debug Tips

```typescript
// Check active subscriptions
console.log('Active subscriptions:', eventBus.getSubscriptionCount())

// Use custom logger to debug
const debugLogger = new ConsoleLogger()
const eventBus = new EventBus({ logger: debugLogger, enableLogging: true })

// Validate patterns manually
const matcher = new PatternMatcher()
console.log('Pattern valid:', matcher.isValidPattern('user.*'))
console.log('Event matches:', matcher.matches('user.created', 'user.*'))
```

## Next Steps

After running these examples, you can:

1. Integrate EventBus into your application
2. Create custom event types for your domain
3. Implement domain-specific event handlers
4. Add monitoring and observability
5. Scale to multiple EventBus instances if needed

For more details, check the test files in `src/__tests__/` which contain comprehensive examples of all features.
