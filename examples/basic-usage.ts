/**
 * Basic EventBus Usage Example
 *
 * This example demonstrates the fundamental features of the EventBus:
 * - Creating an EventBus instance
 * - Subscribing to events with patterns
 * - Publishing events
 * - Pattern matching (exact match, wildcard patterns)
 */

import { EventBus } from '../src/core/event-bus'
import { BasicEvent, EventHandler } from '../src/types'

async function basicUsageExample(): Promise<void> {
  console.log('=== Basic EventBus Usage Example ===\n')

  // Create an EventBus instance with default configuration
  const eventBus = new EventBus()

  // Example 1: Simple subscription and publishing
  console.log('1. Simple Event Subscription and Publishing:')

  // Subscribe to user registration events
  const userRegistrationHandler: EventHandler = async (event, context) => {
    console.log(`  📧 User registered: ${event.data.email}`)
    console.log(`  🔍 Subscription ID: ${context.subscription.id}`)
  }

  const subscription1 = await eventBus.subscribe('user.registered', userRegistrationHandler)
  console.log(`  ✓ Subscribed to 'user.registered' with ID: ${subscription1.id}`)

  // Publish a user registration event
  const userEvent: Partial<BasicEvent> = {
    eventType: 'user.registered',
    source: 'UserService',
    data: {
      userId: 'user-123',
      email: 'john.doe@example.com',
      name: 'John Doe'
    }
  }

  const result1 = await eventBus.publish(userEvent)
  console.log(`  ✓ Event published, notified ${result1.subscribersNotified} subscribers\n`)

  // Example 2: Wildcard patterns
  console.log('2. Wildcard Pattern Matching:')

  // Subscribe to all user events using wildcard
  const allUserEventsHandler: EventHandler = async (event, context) => {
    console.log(`  🔔 User event received: ${event.eventType}`)
    console.log(`  📋 Data: ${JSON.stringify(event.data, null, 2)}`)
  }

  const subscription2 = await eventBus.subscribe('user.*', allUserEventsHandler)
  console.log(`  ✓ Subscribed to 'user.*' pattern with ID: ${subscription2.id}`)

  // Publish different user events
  const events = [
    { eventType: 'user.updated', source: 'UserService', data: { userId: 'user-123', field: 'email' }},
    { eventType: 'user.deleted', source: 'UserService', data: { userId: 'user-123' }},
    { eventType: 'user.login', source: 'AuthService', data: { userId: 'user-123', timestamp: new Date().toISOString() }}
  ]

  for (const event of events) {
    await eventBus.publish(event)
  }

  console.log(`  ✓ Published ${events.length} user events\n`)

  // Example 3: Global wildcard
  console.log('3. Global Wildcard Subscription:')

  const globalHandler: EventHandler = async (event, context) => {
    console.log(`  🌐 Global handler received: ${event.eventType} from ${event.source}`)
  }

  const subscription3 = await eventBus.subscribe('*', globalHandler)
  console.log(`  ✓ Subscribed to '*' (all events) with ID: ${subscription3.id}`)

  // Publish various events
  await eventBus.publish({
    eventType: 'order.created',
    source: 'OrderService',
    data: { orderId: 'order-456', amount: 99.99 }
  })

  await eventBus.publish({
    eventType: 'payment.processed',
    source: 'PaymentService',
    data: { paymentId: 'pay-789', status: 'completed' }
  })

  console.log('  ✓ Published various events that match the global wildcard\n')

  // Example 4: Managing subscriptions
  console.log('4. Subscription Management:')
  console.log(`  📊 Total active subscriptions: ${eventBus.getSubscriptionCount()}`)
  console.log(`  🔍 Has subscriptions: ${eventBus.hasSubscriptions()}`)

  // Unsubscribe from one subscription
  const unsubscribed = await eventBus.unsubscribe(subscription1)
  console.log(`  ✓ Unsubscribed from ${subscription1.id}: ${unsubscribed}`)
  console.log(`  📊 Remaining subscriptions: ${eventBus.getSubscriptionCount()}\n`)

  // Example 5: Event enrichment (automatic fields)
  console.log('5. Event Enrichment:')
  const minimalEvent = {
    eventType: 'test.enrichment',
    source: 'TestService',
    data: { message: 'This event will be enriched automatically' }
  }

  const enrichmentHandler: EventHandler = async (event, context) => {
    console.log(`  ✨ Enriched event received:`)
    console.log(`    - Event ID: ${event.eventId}`)
    console.log(`    - Timestamp: ${event.timestamp}`)
    console.log(`    - Version: ${event.version}`)
    console.log(`    - Data: ${JSON.stringify(event.data)}`)
  }

  await eventBus.subscribe('test.enrichment', enrichmentHandler)
  await eventBus.publish(minimalEvent)

  console.log('\n=== Basic Usage Example Complete ===')
}

// Run the example
export async function runExample() {
  try {
    await basicUsageExample()
  } catch (error) {
    console.error('Example failed:', error)
  }
}

export { basicUsageExample }

// Auto-run when file is executed directly
runExample()
