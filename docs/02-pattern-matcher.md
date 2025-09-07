# Pattern Matcher Implementation

## Overview

The `PatternMatcher` class provides a robust pattern matching engine for event types in the EventBus system. It supports various pattern types including exact matches, wildcard patterns, and global matching, with comprehensive validation and normalization capabilities.

## Architecture

The pattern matcher follows a modular design with clear separation of concerns:

1. **Validation Layer**: Ensures patterns are syntactically correct
2. **Normalization Layer**: Cleans and standardizes patterns
3. **Matching Engine**: Performs the actual pattern matching logic
4. **Error Handling**: Graceful handling of invalid inputs

## Supported Pattern Types

### 1. Exact Match Patterns

Exact match patterns match event types character-for-character, including case sensitivity.

**Syntax**: `EventType.SubType`

**Examples**:
```typescript
// Exact matches
matcher.matches('User.AccountCreated', 'User.AccountCreated')    // ✅ true
matcher.matches('Order.Completed', 'Order.Completed')           // ✅ true
matcher.matches('System.Started', 'System.Started')             // ✅ true

// Case sensitive - these do NOT match
matcher.matches('User.AccountCreated', 'user.accountcreated')   // ❌ false
matcher.matches('Order.Completed', 'ORDER.COMPLETED')          // ❌ false
```

**Use Cases**:
- Subscribing to specific event types
- High-precision event filtering
- Debugging and testing specific events

### 2. Prefix Wildcard Patterns

Prefix wildcard patterns match all events that start with a specific prefix, followed by any single segment.

**Syntax**: `Prefix.*`

**Examples**:
```typescript
// Prefix wildcard matching
matcher.matches('User.AccountCreated', 'User.*')      // ✅ true
matcher.matches('User.ProfileUpdated', 'User.*')      // ✅ true
matcher.matches('User.PasswordChanged', 'User.*')     // ✅ true

// Must respect dot boundaries
matcher.matches('UserService.Started', 'User.*')      // ❌ false (no dot after User)
matcher.matches('Order.Created', 'User.*')            // ❌ false (different prefix)

// Multi-level prefix matching
matcher.matches('User.Profile.Updated', 'User.Profile.*')  // ✅ true
matcher.matches('User.Settings.Changed', 'User.Profile.*') // ❌ false
```

**Use Cases**:
- Subscribing to all events from a specific domain (e.g., all User events)
- Grouping related event handlers
- Domain-based event filtering

### 3. Suffix Wildcard Patterns

Suffix wildcard patterns match all events that end with a specific suffix, with wildcards representing any single segment.

**Syntax**: `*.Suffix` or `*.*.Suffix` (for multi-level)

**Examples**:
```typescript
// Single-level suffix matching
matcher.matches('Service.Ended', '*.Ended')          // ✅ true
matcher.matches('Render.Ended', '*.Ended')           // ✅ true
matcher.matches('Process.Started', '*.Started')      // ✅ true

// Multi-level suffix matching
matcher.matches('User.Profile.Updated', '*.*.Updated')     // ✅ true
matcher.matches('Order.Payment.Completed', '*.*.Completed') // ✅ true

// Exact part count matching - these do NOT match
matcher.matches('Service.Ended', '*.*.Ended')        // ❌ false (2 parts vs 3 expected)
matcher.matches('User.Profile.Updated', '*.Updated') // ❌ false (3 parts vs 2 expected)
```

**Use Cases**:
- Subscribing to lifecycle events across different domains (e.g., all "Started" events)
- Cross-cutting concerns like monitoring or logging
- Event pattern analysis and debugging

### 4. Multi-Level Wildcard Patterns

Complex patterns with wildcards at multiple positions to match specific structural patterns.

**Syntax**: `Prefix.*.*.Suffix` or any combination of exact parts and wildcards

**Examples**:
```typescript
// Complex wildcard patterns
matcher.matches('User.Profile.Service.Started', 'User.*.Service.*')  // ✅ true
matcher.matches('User.Account.Service.Stopped', 'User.*.Service.*')  // ✅ true
matcher.matches('Order.Payment.Gateway.Processed', 'Order.*.Gateway.*') // ✅ true

// Pattern structure must match exactly
matcher.matches('User.Profile.Updated', 'User.*.Service.*')  // ❌ false
matcher.matches('User.Service.Started', 'User.*.*.Started') // ❌ false (wrong structure)
```

**Use Cases**:
- Complex architectural patterns with consistent structure
- Service-oriented event patterns
- Hierarchical event filtering

### 5. Global Wildcard Pattern

The global wildcard matches any and all event types.

**Syntax**: `*`

**Examples**:
```typescript
// Global wildcard matches everything
matcher.matches('User.AccountCreated', '*')           // ✅ true
matcher.matches('Order.Completed', '*')               // ✅ true
matcher.matches('System.Started', '*')                // ✅ true
matcher.matches('Payment.ProcessingCompleted', '*')   // ✅ true
matcher.matches('A', '*')                             // ✅ true
matcher.matches('Very.Long.Complex.Event.Type', '*') // ✅ true
```

**Use Cases**:
- Universal event logging
- Debugging and development
- System-wide event monitoring
- Fallback event handlers

## Pattern Validation Rules

The pattern matcher enforces strict validation rules to ensure pattern integrity:

### Valid Patterns

✅ **Accepted**:
```typescript
// Exact matches
'User.AccountCreated'
'Order.Payment.Completed'
'System.Service.Started'

// Simple wildcards
'User.*'
'Order.*'
'*.Started'
'*.Completed'

// Multi-level wildcards
'User.*.Service.*'
'*.*.Updated'
'Order.*.Payment.*'

// Global wildcard
'*'
```

### Invalid Patterns

❌ **Rejected**:
```typescript
// Empty or whitespace-only
''
'   '
'\t'
'\n'

// Invalid characters
'User/AccountCreated'    // Contains /
'User?AccountCreated'    // Contains ?
'User[AccountCreated]'   // Contains [ ]
'User{AccountCreated}'   // Contains { }
'User@AccountCreated'    // Contains @
'User#AccountCreated'    // Contains #

// Double asterisk patterns
'User.**'
'**'
'Order.**.*'

// Invalid asterisk patterns (without dot separation)
'*User'        // No dot after *
'*123'         // No dot after *
'*Something'   // No dot after *
```

## Pattern Normalization

The pattern matcher automatically normalizes patterns before matching:

### Whitespace Trimming
```typescript
matcher.normalizePattern('  User.*  ')           // → 'User.*'
matcher.normalizePattern('\tOrder.Completed\t')  // → 'Order.Completed'
matcher.normalizePattern('\n System.Started ')   // → 'System.Started'
```

### Consecutive Dot Cleanup
```typescript
matcher.normalizePattern('User..AccountCreated')     // → 'User.AccountCreated'
matcher.normalizePattern('User...Event')             // → 'User.Event'
matcher.normalizePattern('System....Started')        // → 'System.Started'
matcher.normalizePattern('User..Profile...Updated')  // → 'User.Profile.Updated'
```

### Case Preservation
```typescript
// Original case is always preserved
matcher.normalizePattern('User.AccountCreated')      // → 'User.AccountCreated'
matcher.normalizePattern('user.accountcreated')      // → 'user.accountcreated'
matcher.normalizePattern('USER.ACCOUNT_CREATED')     // → 'USER.ACCOUNT_CREATED'
```

## API Reference

### Core Methods

#### `isValidPattern(pattern: string): boolean`
Validates if a pattern is syntactically correct.

```typescript
const matcher = new PatternMatcher()

matcher.isValidPattern('User.*')           // true
matcher.isValidPattern('*.Started')        // true
matcher.isValidPattern('**')               // false
matcher.isValidPattern('')                 // false
```

#### `normalizePattern(pattern: string): string`
Normalizes a pattern by trimming whitespace and cleaning up formatting.

```typescript
matcher.normalizePattern('  User.*  ')     // 'User.*'
matcher.normalizePattern('User..Event')    // 'User.Event'
```

#### `matches(eventType: string, pattern: string): boolean`
Checks if an event type matches a given pattern. This is the main method that combines validation, normalization, and matching.

```typescript
matcher.matches('User.AccountCreated', 'User.*')       // true
matcher.matches('Service.Started', '*.Started')       // true
matcher.matches('User.Profile.Updated', 'User.*')     // true
matcher.matches('Order.Completed', 'User.*')          // false
```

## Algorithm Details

### Matching Algorithm

The pattern matching uses a recursive algorithm that splits both the event type and pattern into parts (separated by dots) and matches them part by part:

1. **Global Wildcard**: If pattern is `*`, match any event type
2. **Exact Match**: If no wildcards in pattern, perform exact string comparison
3. **Wildcard Matching**: Use recursive part-by-part matching

### Wildcard Matching Logic

- Each `*` matches exactly one part of the event type
- Pattern structure must align with event type structure
- Suffix patterns like `*.Ended` require exact part count matching
- Multi-level patterns validate structural consistency

### Performance Characteristics

- **Time Complexity**: O(n + m) where n = event type length, m = pattern length
- **Space Complexity**: O(n + m) for pattern and event type part arrays
- **Recursive Depth**: Limited by the number of parts in the pattern

## Error Handling

The pattern matcher gracefully handles invalid inputs:

### Invalid Event Types
```typescript
matcher.matches(null, 'User.*')        // false (no exception)
matcher.matches(undefined, 'User.*')   // false (no exception)
matcher.matches('', 'User.*')          // false
```

### Invalid Patterns
```typescript
matcher.matches('User.AccountCreated', null)        // false (no exception)
matcher.matches('User.AccountCreated', undefined)   // false (no exception)
matcher.matches('User.AccountCreated', '')          // false
matcher.matches('User.AccountCreated', '**')        // false (invalid pattern)
```

## Usage Examples

### Basic Event Subscription
```typescript
const matcher = new PatternMatcher()

// Subscribe to all user events
if (matcher.matches(eventType, 'User.*')) {
    handleUserEvent(event)
}

// Subscribe to all completion events
if (matcher.matches(eventType, '*.Completed')) {
    handleCompletionEvent(event)
}

// Subscribe to specific event
if (matcher.matches(eventType, 'Order.PaymentProcessed')) {
    handlePaymentProcessed(event)
}
```

### Event Routing
```typescript
const routeEvent = (eventType: string, event: any) => {
    if (matcher.matches(eventType, 'User.*')) {
        userService.handleEvent(event)
    } else if (matcher.matches(eventType, 'Order.*')) {
        orderService.handleEvent(event)
    } else if (matcher.matches(eventType, '*.Started')) {
        monitoringService.logStartEvent(event)
    } else if (matcher.matches(eventType, '*')) {
        defaultHandler.handleEvent(event)
    }
}
```

### Complex Pattern Filtering
```typescript
const filterEvents = (events: Event[], patterns: string[]) => {
    return events.filter(event =>
        patterns.some(pattern =>
            matcher.matches(event.type, pattern)
        )
    )
}

const userServiceEvents = filterEvents(allEvents, [
    'User.*',
    '*.UserService.*',
    'Service.User.*'
])
```

## Best Practices

### Pattern Design
1. **Use specific patterns** when possible for better performance
2. **Prefer prefix wildcards** over suffix wildcards for common use cases
3. **Avoid overly complex patterns** that are hard to understand and maintain
4. **Use global wildcard sparingly** to avoid unintended matches

### Performance Optimization
1. **Order patterns** from most specific to least specific
2. **Cache pattern validation results** for frequently used patterns
3. **Use exact matches** when the event type is known at compile time
4. **Batch event processing** when using the same patterns repeatedly

### Error Prevention
1. **Validate patterns** at configuration time, not runtime
2. **Use constants** for frequently used patterns to avoid typos
3. **Test pattern matching logic** thoroughly with edge cases
4. **Document pattern semantics** for team understanding

## Testing

The pattern matcher includes comprehensive test coverage:

- **49 test cases** covering all pattern types and edge cases
- **Validation tests** for both valid and invalid patterns
- **Normalization tests** for whitespace and formatting cleanup
- **Matching algorithm tests** for all pattern types
- **Error handling tests** for graceful failure modes
- **Integration tests** for workflow validation

Run tests with:
```bash
npm test -- pattern-matcher.ut.test.ts
```

## Integration with EventBus

The pattern matcher is designed to integrate seamlessly with the EventBus subscription system:

- **Event Subscription**: Use patterns to define which events a handler should receive
- **Event Routing**: Route events to appropriate handlers based on pattern matching
- **Event Filtering**: Filter event streams using pattern-based criteria
- **Debugging**: Use patterns to isolate and debug specific event flows

---

*This documentation covers the complete pattern matcher implementation. For questions or contributions, please refer to the test suite for additional examples and edge cases.*
