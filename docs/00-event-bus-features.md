# Event Bus Features

## Document Information
- **Version**: v1.0
- **Status**: Draft
- **Date**: September 4, 2025
- **Author**: Design Team
- **Component**: In-Memory Event Bus
- **Source**: Based on 01-event-bus.md v2.0

## Overview

The Event Bus is a lightweight, in-memory event communication component that provides async pub/sub messaging for monolith applications with future extensibility to distributed backends.

## Core Features

### 1. Event Publishing
- **Asynchronous Event Publishing**: All events are published asynchronously using Promise-based API
- **Immediate In-Memory Delivery**: Events are delivered synchronously to all matching subscribers within the same process
- **Event Enrichment**: Automatically enriches events with eventId, timestamp, version, and metadata
- **Publish Result Tracking**: Returns detailed publish results including success status, subscribers notified, and retry information
- **Batch Notification**: Notifies all matching subscribers in a single publish operation

### 2. Event Subscription
- **Pattern-Based Subscriptions**: Subscribe to events using flexible string patterns
- **Wildcard Support**:
  - Exact match: `"User.AccountCreated"`
  - Prefix match: `"User.*"` (all User events)
  - Global match: `"*"` (all events)
- **Multiple Subscriptions**: Support for multiple handlers per pattern and multiple patterns per handler
- **Subscription Management**: Clean subscription/unsubscription lifecycle with unique subscription handles
- **Event Context**: Provides subscription context and attempt information to handlers

### 3. Event Validation & Type Safety
- **JSON Schema Validation**: Validates all events against predefined JSON schemas before publishing
- **Base Event Structure**: Enforces standardized event structure with required fields
- **Contract Compliance**: Ensures all events conform to established contracts
- **Schema Registry**: Maintains schemas using Map-based storage
- **Validation Error Reporting**: Provides clear error messages for schema violations

### 4. Error Handling & Resilience
- **Handler Error Isolation**: Failures in one handler don't affect other subscribers
- **Automatic Retry Mechanism**: Configurable retry attempts with exponential backoff
- **Error Context Preservation**: Maintains original event context across retry attempts
- **Partial Success Handling**: Events can be partially successful if some handlers fail
- **Error Classification**: Distinguishes between validation errors, handler errors, and system errors
- **Graceful Degradation**: Event bus remains operational even with individual handler failures

### 5. Observability & Monitoring
- **Structured Logging**: Comprehensive logging of all event operations through pluggable interface
- **Event Tracing**: Correlation ID support for tracing related events
- **Debug Information**: Detailed debugging information for development
- **Failed Handler Tracking**: Identifies and reports handlers that fail after all retries

### 6. Configuration & Flexibility
- **Configurable Retry Policy**: Customizable maximum retry attempts and retry delays
- **Pluggable Logging**: Environment-specific logging through LoggerPlugin interface
- **Optional Features**: Enable/disable logging
- **Development Support**: Built-in ConsoleLogger for development environments
- **Runtime Configuration**: Configure behavior without code changes

### 7. Performance & Scalability
- **High Performance**: Direct function calls with minimal overhead
- **In-Memory Storage**: Fast Map-based subscription registry
- **Immediate Delivery**: No network latency or external dependencies
- **Predictable Behavior**: Synchronous delivery with deterministic behavior
- **Memory Efficient**: Lightweight implementation suitable for monolith applications

### 8. Developer Experience
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Promise-Based API**: Consistent async/await patterns throughout
- **Simple Patterns**: Intuitive string-based pattern matching
- **Clear Error Messages**: Descriptive error reporting for debugging
- **Easy Testing**: No external dependencies to mock in tests
- **Comprehensive Examples**: Well-documented usage patterns and examples

### 9. Event Contract Features
- **Base Event Schema**: Standardized event structure with required fields
- **Event Metadata**: Support for priority, tags, and custom metadata
- **Correlation Support**: Built-in correlation ID for event tracing
- **Versioning**: Event schema versioning with major.minor format
- **Extensible Data**: Flexible event-specific payload data structure
- **ISO 8601 Timestamps**: Standardized timestamp format

### 10. Future Extensibility
- **Backend Agnostic Design**: Clean interface that can support distributed backends
- **Migration Ready**: API designed for future Redis/RabbitMQ implementations
- **Plugin Architecture**: Extensible design for additional capabilities
- **Async Interface**: All operations return Promises for consistency with future distributed implementations
- **Clean Abstractions**: Well-defined interfaces that can be extended

### 11. Event Types Support
- **Domain Events**: Support for business domain events (User.AccountCreated, Order.Completed)
- **System Events**: Infrastructure and system-level event handling
- **Business Process Events**: Multi-step business process coordination
- **Integration Events**: External system integration events
- **Custom Event Types**: Flexible event type naming with Context.EventName pattern

### 12. Subscription Features
- **Dynamic Subscriptions**: Add and remove subscriptions at runtime
- **Handler Management**: Clean handler registration and deregistration
- **Subscription Tracking**: Unique subscription identifiers for management
- **Pattern Flexibility**: Multiple subscription patterns per component
- **Event Context**: Rich context information passed to handlers

### 13. Logging Capabilities
- **Multi-Level Logging**: Info, warn, error, fatal, and debug log levels
- **Contextual Logging**: Rich context objects with log messages
- **Environment Adaptation**: Different logging strategies for development vs production
- **Async Logging**: Non-blocking logging operations
- **Error Detail Logging**: Comprehensive error information capture

### 14. Production Features
- **Error Recovery**: Automatic recovery from transient failures
- **Production Logging**: Support for cloud-based logging services
- **Resource Management**: Efficient memory and CPU usage
- **Reliability**: Consistent behavior under load and error conditions

## Implementation Characteristics

### Technology Features
- **Language**: TypeScript/JavaScript (Node.js)
- **Dependencies**: Minimal external dependencies (Ajv for validation)
- **Storage**: In-memory Maps and Sets for high performance
- **Testing**: Jest-based testing framework support
- **Standards**: JSON Schema for validation, ISO 8601 for timestamps

### Architecture Features
- **Single Component Design**: Simplified architecture for monolith applications
- **Clean Separation**: Distinct components for validation, logging, and event routing
- **Dependency Injection**: Pluggable logger interface for flexibility
- **Event-Driven**: Pure event-driven architecture implementation
- **Memory Safe**: Proper resource management and cleanup

This comprehensive feature set makes the Event Bus suitable for monolith applications requiring event-driven architecture while maintaining the flexibility to evolve toward distributed systems in the future.
